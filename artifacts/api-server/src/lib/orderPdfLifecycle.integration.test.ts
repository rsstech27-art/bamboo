import { randomUUID } from "node:crypto";
import express, { type Request } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { ordersTable } from "@workspace/db/schema";

const isolation = vi.hoisted(() => ({
  schema: `pdf_lifecycle_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  namespace: "",
  leases: [] as Array<{ pid: number; schemas: string[] }>,
}));

// Keep genuine PostgreSQL connections and Drizzle, setting only this pool's session search path.
vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  const PoolConstructor = actual.pool.constructor as unknown as new (config: {
    connectionString?: string;
    options?: string;
    query_timeout?: number;
  }) => typeof actual.pool;
  await actual.pool.end();
  const { drizzle: makeDrizzle } = await import("drizzle-orm/node-postgres");
  const { sql: drizzleSql } = await import("drizzle-orm");
  const dbSchema = await import("@workspace/db/schema");
  const isolatedPool = new PoolConstructor({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${isolation.schema} -c statement_timeout=20000 -c lock_timeout=15000`,
    query_timeout: 25_000,
  });
  const isolatedDb = makeDrizzle(isolatedPool, { schema: dbSchema });
  const adapter = isolatedDb as unknown as {
    transaction: (callback: (tx: any) => unknown) => Promise<unknown>;
  };
  const transaction = adapter.transaction.bind(isolatedDb);
  adapter.transaction = (callback) =>
    transaction(async (tx) => {
      const result = await tx.execute(drizzleSql`SELECT pg_backend_pid() AS pid, current_schemas(false)::text[] AS schemas`);
      const row = result.rows[0] as { pid: number; schemas: string[] };
      isolation.leases.push({ pid: Number(row.pid), schemas: row.schemas });
      return callback(tx);
    });
  return { db: isolatedDb, pool: isolatedPool };
});

vi.mock("./objectStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./objectStorage")>();
  return {
    ...actual,
    ObjectStorageService: class IsolatedObjectStorageService extends actual.ObjectStorageService {
      override getPrivateObjectDir(): string {
        return `${super.getPrivateObjectDir().replace(/\/$/, "")}/integration-tests/pdf-lifecycle/${isolation.namespace}`;
      }
    },
  };
});

vi.mock("./logger", () => ({ logger: { error: () => undefined, info: () => undefined } }));

import { db, pool } from "@workspace/db";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";
import { ORDER_PDF_GRANT_TTL_MS } from "./orderPdfLifecycle";
import {
  createBarrier,
  createSchema,
  FutureCleanupClockStorage,
  putSignedPdf,
  readObjectBytes,
  runCleanup,
  TestObjectManifest,
  waitForAdvisoryLockWaiter,
  within,
} from "../test-support/orderPdfLifecycle.integration-support";
import router from "../routes/orders";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.session = { isManager: true } as Request["session"];
  req.log = logger;
  next();
});
app.use("/api", router);

const pdf = Buffer.from("%PDF-1.7\nintegration lifecycle bytes\n%%EOF\n");
let schemaCreated = false;
let manifest: TestObjectManifest;
const releaseBarriers: Array<() => void> = [];

function barrier() {
  const value = createBarrier();
  releaseBarriers.push(value.release);
  return value;
}

async function makeUpload(label: string) {
  const created = await request(app).post("/api/orders").send({
    prefix: "IT", zoneLabel: label, kpData: { integration: true },
  });
  if (created.status !== 201) throw new Error("Could not create isolated integration order");
  const { id, pdfToken } = created.body as { id: number; pdfToken: string };
  const grant = await request(app).post(`/api/orders/${id}/pdf-upload-url`).send({ pdfToken });
  if (grant.status !== 200) throw new Error("Could not obtain an isolated order PDF upload grant");
  const { objectPath, uploadToken, uploadURL } = grant.body as {
    objectPath: string; uploadToken: string; uploadURL: string;
  };
  manifest.add(objectPath);
  return { id, objectPath, uploadToken, uploadURL };
}

async function expectStoredBytes(objectPath: string, expected: Buffer): Promise<void> {
  expect(await readObjectBytes(new ObjectStorageService(), objectPath)).toEqual(expected);
}

describe("order PDF lifecycle across PostgreSQL connections and App Storage", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PDF lifecycle integration tests are forbidden in production");
    }
    if (!process.env.DATABASE_URL || !process.env.PRIVATE_OBJECT_DIR) {
      throw new Error("PDF lifecycle integration tests require DATABASE_URL and PRIVATE_OBJECT_DIR");
    }
    vi.stubEnv("SESSION_SECRET", "integration-only-order-pdf-session-secret");
    isolation.namespace = randomUUID();
    await createSchema(pool, isolation.schema);
    schemaCreated = true;
    manifest = new TestObjectManifest(new ObjectStorageService(), isolation.namespace);
  });

  afterAll(async () => {
    for (const release of releaseBarriers) release();
    vi.restoreAllMocks();
    try {
      await manifest?.removeCreatedObjects();
      if (manifest) {
        for await (const _file of new ObjectStorageService().listOrderPdfCandidates()) {
          throw new Error("A test-owned PDF remains after manifest cleanup");
        }
      }
    } finally {
      try {
        if (schemaCreated) {
          if (!/^pdf_lifecycle_[a-z0-9_]+$/.test(isolation.schema)) throw new Error("Unsafe schema teardown");
          try {
            await pool.query(`DROP SCHEMA IF EXISTS "${isolation.schema}" CASCADE`);
          } catch {
            throw new Error("Failed to drop the isolated PDF integration schema");
          }
        }
      } finally {
        try {
          await pool.end();
        } finally {
          vi.unstubAllEnvs();
        }
      }
    }
  });

  it("waits for attachment commit, preserves its reference, and serves the real PDF to a manager", async () => {
    const upload = await makeUpload("cleanup waits for attachment");
    await putSignedPdf(upload.uploadURL, pdf);
    await expectStoredBytes(upload.objectPath, pdf);
    const pauseFinalize = barrier();
    const finalize = ObjectStorageService.prototype.finalizeOrderPdf;
    let finalizedPath: string | undefined;
    vi.spyOn(ObjectStorageService.prototype, "finalizeOrderPdf").mockImplementation(async function (
      this: ObjectStorageService,
      path: string,
    ) {
      const copiedPath = await finalize.call(this, path);
      manifest.add(copiedPath);
      finalizedPath = copiedPath;
      await pauseFinalize.wait();
      return copiedPath;
    });

    const leaseOffset = isolation.leases.length;
    const attaching = request(app).patch(`/api/orders/${upload.id}/pdf`)
      .send({ objectPath: upload.objectPath, uploadToken: upload.uploadToken }).then((result) => result);
    let cleanupPending: Promise<number> | undefined;
    try {
      await within(pauseFinalize.reached, "attachment to reach finalization barrier");
      cleanupPending = runCleanup(new FutureCleanupClockStorage());
      const { holderPid, waiterPid } = await waitForAdvisoryLockWaiter(pool);
      expect(holderPid).not.toBe(waiterPid);
      const leases = isolation.leases.slice(leaseOffset, leaseOffset + 2);
      expect(leases).toHaveLength(2);
      expect(leases[0].schemas).toEqual([isolation.schema]);
      expect(leases[1].schemas).toEqual([isolation.schema]);
      expect(new Set(leases.map((entry) => entry.pid)).size).toBe(2);
      expect(new Set(leases.map((entry) => entry.pid))).toEqual(new Set([holderPid, waiterPid]));
      pauseFinalize.release();

      const attached = await within(attaching, "attachment transaction to commit");
      if (attached.status !== 200) throw new Error("Order PDF attachment did not complete");
      expect(await within(cleanupPending, "cleanup to finish after attachment commit")).toBe(1);

      const [saved] = await db.select().from(ordersTable).where(eq(ordersTable.id, upload.id));
      expect(saved.pdfPath).toMatch(/^\/objects\/order-pdfs\/[a-f0-9-]{36}$/);
      expect(saved.pdfPath).toBe(finalizedPath);
      const downloaded = await request(app).get(`/api/orders/${upload.id}/pdf`).buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });
      expect(downloaded.status).toBe(200);
      expect(downloaded.headers["content-type"]).toMatch(/^application\/pdf/);
      expect(downloaded.headers["cache-control"]).toBe("private, no-store");
      expect(downloaded.body).toEqual(pdf);
    } finally {
      pauseFinalize.release();
      await within(
        Promise.allSettled([attaching, cleanupPending].filter(Boolean) as Promise<unknown>[]),
        "attachment and cleanup barriers to drain",
      );
      vi.restoreAllMocks();
    }
  });

  it("rejects an attachment whose grant expires while waiting on cleanup's real lock", async () => {
    const upload = await makeUpload("grant expiry while waiting");
    await putSignedPdf(upload.uploadURL, pdf);
    await expectStoredBytes(upload.objectPath, pdf);
    const decoy = await makeUpload("cleanup lock holder decoy");
    await putSignedPdf(decoy.uploadURL, pdf);
    await expectStoredBytes(decoy.objectPath, pdf);
    const storage = new FutureCleanupClockStorage();
    const decoyFile = await storage.getObjectEntityFile(decoy.objectPath);
    const listCandidates = storage.listOrderPdfCandidates.bind(storage);
    vi.spyOn(storage, "listOrderPdfCandidates").mockImplementation(async function* () {
      for await (const file of listCandidates()) {
        if (file.name === decoyFile.name) yield file;
      }
    });
    const pauseCleanup = barrier();
    const deleteExpired = storage.deleteExpiredOrderPdf.bind(storage);
    vi.spyOn(storage, "deleteExpiredOrderPdf").mockImplementation(async function (
      this: ObjectStorageService,
      file: Parameters<ObjectStorageService["deleteExpiredOrderPdf"]>[0],
      now: number,
    ) {
      if (file.name === decoyFile.name) await pauseCleanup.wait();
      return deleteExpired(file, now);
    });
    const finalizeSpy = vi.spyOn(ObjectStorageService.prototype, "finalizeOrderPdf");
    const leaseOffset = isolation.leases.length;
    const cleanupPending = runCleanup(storage);
    let attaching: Promise<{ status: number; body: any }> | undefined;
    let restoreClock: (() => void) | undefined;
    try {
      await within(pauseCleanup.reached, "real cleanup to hold the advisory lock");
      attaching = request(app).patch(`/api/orders/${upload.id}/pdf`)
        .send({ objectPath: upload.objectPath, uploadToken: upload.uploadToken }).then((result) => result);
      const { holderPid, waiterPid } = await waitForAdvisoryLockWaiter(pool);
      expect(holderPid).not.toBe(waiterPid);
      const leases = isolation.leases.slice(leaseOffset, leaseOffset + 2);
      expect(leases).toHaveLength(2);
      expect(leases.map((entry) => entry.schemas)).toEqual([[isolation.schema], [isolation.schema]]);
      expect(new Set(leases.map((entry) => entry.pid))).toEqual(new Set([holderPid, waiterPid]));
      const expiredTime = Date.now() + ORDER_PDF_GRANT_TTL_MS + 1;
      const clock = vi.spyOn(Date, "now").mockReturnValue(expiredTime);
      restoreClock = () => clock.mockRestore();
      pauseCleanup.release();
      expect(await within(cleanupPending, "decoy cleanup to finish")).toBe(1);
      const response = await within(attaching, "expired attachment response");
      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/expired/);
      expect(finalizeSpy).not.toHaveBeenCalled();
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, upload.id));
      expect(order.pdfPath).toBeNull();
      await expectStoredBytes(upload.objectPath, pdf);
    } finally {
      pauseCleanup.release();
      restoreClock?.();
      await within(
        Promise.allSettled([cleanupPending, attaching].filter(Boolean) as Promise<unknown>[]),
        "cleanup and blocked attachment to drain",
      );
      vi.restoreAllMocks();
    }
  });

  it("honors the real generation precondition when a signed PUT overwrites after metadata read", async () => {
    const upload = await makeUpload("conditional delete versus signed PUT");
    await putSignedPdf(upload.uploadURL, pdf);
    await expectStoredBytes(upload.objectPath, pdf);
    const storage = new FutureCleanupClockStorage();
    const candidate = await storage.getObjectEntityFile(upload.objectPath);
    const candidateName = candidate.name;
    let observedDeleteError: unknown;
    const pauseDelete = barrier();
    const listCandidates = storage.listOrderPdfCandidates.bind(storage);
    vi.spyOn(storage, "listOrderPdfCandidates").mockImplementation(async function* () {
      for await (const file of listCandidates()) {
        if (file.name !== candidateName) continue;
        yield new Proxy(file, {
          get(target, property) {
            if (property === "getMetadata") {
              return async () => {
                const metadata = await target.getMetadata();
                await pauseDelete.wait();
                return metadata;
              };
            }
            if (property === "delete") {
              return async (options: Parameters<typeof target.delete>[0]) => {
                try { return await target.delete(options); } catch (error) {
                  observedDeleteError = error;
                  throw error;
                }
              };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      }
    });

    let cleanupPending: Promise<number> | undefined;
    const leaseOffset = isolation.leases.length;
    try {
      cleanupPending = runCleanup(storage);
      await within(pauseDelete.reached, "cleanup metadata read");
      const cleanupLease = isolation.leases[leaseOffset];
      expect(cleanupLease.schemas).toEqual([isolation.schema]);
      const before = (await candidate.getMetadata())[0];
      await putSignedPdf(upload.uploadURL, Buffer.from("%PDF-1.7\noverwritten generation bytes\n%%EOF\n"));
      await expectStoredBytes(upload.objectPath, Buffer.from("%PDF-1.7\noverwritten generation bytes\n%%EOF\n"));
      const after = (await candidate.getMetadata())[0];
      expect(String(after.generation)).not.toBe(String(before.generation));
      const [overwritten] = await candidate.download();
      expect(overwritten.toString()).toContain("overwritten generation bytes");
      pauseDelete.release();
      expect(await within(cleanupPending, "conditional cleanup result")).toBe(0);
      expect((observedDeleteError as { code?: number } | undefined)?.code).toBe(412);
      const [remaining] = await candidate.download();
      expect(remaining.toString()).toContain("overwritten generation bytes");
    } finally {
      pauseDelete.release();
      await within(
        Promise.allSettled([cleanupPending].filter(Boolean) as Promise<unknown>[]),
        "conditional cleanup barrier to drain",
      );
      vi.restoreAllMocks();
    }
  });
});