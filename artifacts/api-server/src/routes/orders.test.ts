import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Request } from "express";
import request from "supertest";

const mocks = vi.hoisted(() => {
  type Row = Record<string, any>;
  const rows = new Map<number, Row>();
  const sequences = new Map<string, number>();
  let nextId = 1;
  let forceAtomicConflict = false;

  const deleteUnusedFile = vi.fn().mockResolvedValue(undefined);
  const storage = {
    getObjectEntityUploadURL: vi.fn(async () =>
      "https://storage.googleapis.com/private-bucket/uploads/12345678-1234-1234-1234-123456789abc?signature=put",
    ),
    normalizeObjectEntityPath: vi.fn((raw: string) => {
      const url = new URL(raw);
      return `/objects${url.pathname.slice(url.pathname.indexOf("/uploads/"))}`;
    }),
    finalizeOrderPdf: vi.fn(async () => "/objects/order-pdfs/final-123"),
    deleteUnusedFile,
    getObjectEntityFile: vi.fn(async () => ({ delete: deleteUnusedFile })),
    downloadObject: vi.fn(async () => new Response(Buffer.from("%PDF-manager-bytes"), {
      headers: { "Content-Length": "18" },
    })),
  };

  const columnName = (column: unknown) => String(column).split(".").pop();
  const conditionId = (condition: any): number | undefined => {
    if (!condition) return undefined;
    if (condition.kind === "eq" && columnName(condition.column) === "id") return condition.value;
    if (condition.kind === "and") {
      return condition.conditions.map(conditionId).find((id: number | undefined) => id !== undefined);
    }
    return undefined;
  };
  const conditionRequiresNullPdf = (condition: any): boolean =>
    condition?.kind === "and" && condition.conditions.some((entry: any) => entry.kind === "isNull");
  const selectedRows = (condition: any, projected: boolean, table?: unknown) => {
    if (String(table).includes("orderSequences")) {
      const prefixCondition = condition?.kind === "eq"
        ? condition
        : condition?.conditions?.find((entry: any) => entry.kind === "eq");
      const sequence = prefixCondition ? sequences.get(prefixCondition.value) : undefined;
      return sequence === undefined ? [] : [{
        prefix: prefixCondition.value,
        lastNumber: sequence,
      }];
    }
    const id = conditionId(condition);
    const found = id === undefined
      ? [...rows.values()]
      : [rows.get(id)].filter(Boolean) as Row[];
    return found.map((row) => projected ? { pdfPath: row.pdfPath ?? null } : { ...row });
  };
  const query = (projected = false, table?: unknown) => ({
    from: (nextTable: unknown) => query(projected, nextTable),
    where: (condition: any) => Promise.resolve(selectedRows(condition, projected, table)),
    orderBy: () => Promise.resolve([...rows.values()].map((row) => ({ ...row }))),
  });
  const select = (projection?: unknown) => query(Boolean(projection));

  const update = () => {
    let values: Row = {};
    return {
      set: (newValues: Row) => {
        values = newValues;
        return {
          where: (condition: any) => {
            const prefixCondition = condition?.kind === "eq"
              ? condition
              : condition?.conditions?.find((entry: any) => entry.kind === "eq");
            if (prefixCondition && columnName(prefixCondition.column) === "prefix") {
              const lastNumber = values.lastNumber?.kind === "increment"
                ? (sequences.get(prefixCondition.value) ?? 0) + 1
                : values.lastNumber;
              sequences.set(prefixCondition.value, lastNumber);
              return {
                returning: async () => [{ lastNumber }],
                then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
                  Promise.resolve([{ lastNumber }]).then(resolve, reject),
              };
            }
            const id = conditionId(condition);
            const row = id === undefined ? undefined : rows.get(id);
            const canUpdate = row && (!conditionRequiresNullPdf(condition) || row.pdfPath == null);
            const applied = Boolean(canUpdate && !forceAtomicConflict);
            forceAtomicConflict = false;
            if (applied) Object.assign(row!, values);
            const returning = async () => applied ? [{ id }] : [];
            return {
              returning,
              then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
                Promise.resolve(applied ? [row] : []).then(resolve, reject),
            };
          },
        };
      },
    };
  };
  const insert = (table: any) => {
    let values: Row = {};
    const builder = {
      values: (newValues: Row) => {
        values = newValues;
        if (String(table).includes("orderSequences")) {
          if (!sequences.has(values.prefix)) sequences.set(values.prefix, values.lastNumber);
        }
        return builder;
      },
      onConflictDoNothing: () => builder,
      returning: async () => {
        const row = { id: nextId++, createdAt: new Date(), pdfPath: null, ...values };
        rows.set(row.id, row);
        return [row];
      },
    };
    // Sequence insertions need not persist a row; order insertions use returning().
    return builder;
  };

  const makeDb = () => {
    const tx = {
      insert,
      select,
      update,
    };
    return {
      select,
      update,
      transaction: async (callback: (tx: any) => Promise<unknown>) => callback(tx),
    };
  };

  return {
    rows,
    sequences,
    storage,
    makeDb,
    reset: () => {
      rows.clear();
      sequences.clear();
      nextId = 1;
      forceAtomicConflict = false;
    },
    forceAtomicConflict: () => { forceAtomicConflict = true; },
    conditionId,
    columnName,
  };
});

vi.mock("@workspace/db", () => ({ db: mocks.makeDb() }));
vi.mock("@workspace/db/schema", () => ({
  ordersTable: { id: "orders.id", pdfPath: "orders.pdfPath", createdAt: "orders.createdAt" },
  orderSequencesTable: { prefix: "orderSequences.prefix", lastNumber: "orderSequences.lastNumber" },
}));
vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ kind: "eq", column, value }),
  desc: (column: unknown) => ({ kind: "desc", column }),
  sql: (_strings: TemplateStringsArray, ...values: unknown[]) =>
    values[0] === "orderSequences.lastNumber" ? { kind: "increment" } : "pdf_path",
  and: (...conditions: unknown[]) => ({ kind: "and", conditions }),
  isNull: (column: unknown) => ({ kind: "isNull", column }),
}));
vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: class {
    getObjectEntityUploadURL = mocks.storage.getObjectEntityUploadURL;
    normalizeObjectEntityPath = mocks.storage.normalizeObjectEntityPath;
    finalizeOrderPdf = mocks.storage.finalizeOrderPdf;
    getObjectEntityFile = mocks.storage.getObjectEntityFile;
    downloadObject = mocks.storage.downloadObject;
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
  InvalidOrderPdfError: class InvalidOrderPdfError extends Error {
    constructor() { super("Uploaded object must be a PDF of at most 15 MB"); }
  },
}));

import router from "./orders";
import { issueOrderPdfGrant } from "../lib/orderPdfGrant";
import { InvalidOrderPdfError, ObjectNotFoundError } from "../lib/objectStorage";

const UPLOAD_PATH = "/objects/uploads/12345678-1234-1234-1234-123456789abc";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const testReq = req;
    testReq.session = (req.get("x-manager") ? { isManager: true } : {}) as Request["session"];
    testReq.log = { error: vi.fn() } as unknown as Request["log"];
    next();
  });
  app.use(router);
  return app;
}

const app = makeApp();

async function createOrder() {
  return request(app).post("/orders").send({
    prefix: "С",
    zoneLabel: "Кухня",
    kpData: { title: "Regression fixture" },
  });
}

async function authorizeUpload(orderId: number, pdfToken: string) {
  return request(app).post(`/orders/${orderId}/pdf-upload-url`).send({ pdfToken });
}

describe("anonymous order PDF capability flow", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "vitest-only-order-pdf-secret-not-a-real-credential");
    mocks.reset();
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns a creation token and only issues an upload grant with the matching creation capability", async () => {
    const created = await createOrder();
    expect(created.status).toBe(201);
    expect(created.body.pdfToken).toEqual(expect.any(String));
    expect(created.headers["cache-control"]).toBe("no-store");

    const missing = await request(app).post(`/orders/${created.body.id}/pdf-upload-url`).send({});
    expect(missing.status).toBe(403);
    const wrong = await authorizeUpload(created.body.id, issueOrderPdfGrant(created.body.id + 1));
    expect(wrong.status).toBe(403);

    const issued = await authorizeUpload(created.body.id, created.body.pdfToken);
    expect(issued.status).toBe(200);
    expect(issued.body).toMatchObject({
      uploadURL: expect.stringContaining("storage.googleapis.com"),
      objectPath: UPLOAD_PATH,
      uploadToken: expect.any(String),
    });
    expect(issued.headers["cache-control"]).toBe("no-store");
  });

  it("rejects absent, wrong-order, expired, and tampered creation tokens", async () => {
    const first = await createOrder();
    const second = await createOrder();
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const noToken = await request(app).post(`/orders/${first.body.id}/pdf-upload-url`).send({});
    expect(noToken.status).toBe(403);
    const crossOrder = await authorizeUpload(second.body.id, first.body.pdfToken);
    expect(crossOrder.status).toBe(403);
    const [payload, signature] = first.body.pdfToken.split(".");
    const tamperedToken = `${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    expect((await authorizeUpload(first.body.id, tamperedToken)).status).toBe(403);

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() - 30 * 60 * 1000 - 1);
    const expired = issueOrderPdfGrant(first.body.id);
    vi.useRealTimers();
    expect((await authorizeUpload(first.body.id, expired)).status).toBe(403);
  });

  it("binds upload permission to both its order and the exact path that was issued", async () => {
    const created = await createOrder();
    const issued = await authorizeUpload(created.body.id, created.body.pdfToken);

    const otherPath = "/objects/uploads/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const pathMismatch = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: otherPath, uploadToken: issued.body.uploadToken });
    expect(pathMismatch.status).toBe(403);

    const otherOrder = await request(app).patch(`/orders/${created.body.id + 1}/pdf`)
      .send({ objectPath: UPLOAD_PATH, uploadToken: issued.body.uploadToken });
    expect(otherOrder.status).toBe(403);
    expect(mocks.storage.finalizeOrderPdf).not.toHaveBeenCalled();
  });

  it("persists the finalized immutable path, serves its bytes after refetch, and rejects replacement", async () => {
    const created = await createOrder();
    const issued = await authorizeUpload(created.body.id, created.body.pdfToken);
    const finalized = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: issued.body.objectPath, uploadToken: issued.body.uploadToken });
    expect(finalized.status).toBe(200);
    expect(mocks.rows.get(created.body.id)?.pdfPath).toBe("/objects/order-pdfs/final-123");
    expect(mocks.storage.finalizeOrderPdf).toHaveBeenCalledWith(UPLOAD_PATH);

    const replacementGrant = issueOrderPdfGrant(created.body.id, UPLOAD_PATH);
    const replacement = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: UPLOAD_PATH, uploadToken: replacementGrant });
    expect(replacement.status).toBe(409);
    expect(mocks.storage.finalizeOrderPdf).toHaveBeenCalledTimes(1);

    const pdf = await request(app).get(`/orders/${created.body.id}/pdf`).set("x-manager", "yes");
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
    expect(pdf.body).toEqual(Buffer.from("%PDF-manager-bytes"));
    expect(mocks.storage.getObjectEntityFile).toHaveBeenCalledWith("/objects/order-pdfs/final-123");
    expect(mocks.storage.downloadObject).toHaveBeenCalled();
  });

  it("rejects an atomic first-writer conflict and deletes the unreferenced finalized copy", async () => {
    const created = await createOrder();
    const issued = await authorizeUpload(created.body.id, created.body.pdfToken);
    mocks.forceAtomicConflict();

    const response = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: issued.body.objectPath, uploadToken: issued.body.uploadToken });
    expect(response.status).toBe(409);
    expect(mocks.storage.getObjectEntityFile).toHaveBeenCalledWith("/objects/order-pdfs/final-123");
    expect(mocks.storage.deleteUnusedFile).toHaveBeenCalledOnce();
    expect(mocks.rows.get(created.body.id)?.pdfPath).toBeNull();
  });

  it.each([
    "",
    "/objects/public/12345678-1234-1234-1234-123456789abc",
    "/objects/uploads/../../private/file",
    "/objects/uploads/not-a-uuid",
  ])("rejects invalid upload object path %s", async (path) => {
    const created = await createOrder();
    const response = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: path, uploadToken: issueOrderPdfGrant(created.body.id, path) });
    expect(response.status).toBe(400);
    expect(mocks.storage.finalizeOrderPdf).not.toHaveBeenCalled();
  });

  it.each([
    ["missing uploaded object", new ObjectNotFoundError(), "Uploaded PDF not found"],
    ["invalid PDF content", new InvalidOrderPdfError(), "Uploaded object must be a PDF"],
  ])("returns 422 for %s", async (_case, error, message) => {
    const created = await createOrder();
    const issued = await authorizeUpload(created.body.id, created.body.pdfToken);
    mocks.storage.finalizeOrderPdf.mockRejectedValueOnce(error);
    const response = await request(app).patch(`/orders/${created.body.id}/pdf`)
      .send({ objectPath: issued.body.objectPath, uploadToken: issued.body.uploadToken });
    expect(response.status).toBe(422);
    expect(response.body.error).toContain(message);
  });

  it("keeps order reads, list, after-photo updates, and PDF reads manager guarded", async () => {
    const created = await createOrder();
    expect((await request(app).get("/orders")).status).toBe(401);
    expect((await request(app).get(`/orders/${created.body.id}`)).status).toBe(401);
    expect((await request(app).get(`/orders/${created.body.id}/pdf`)).status).toBe(401);
    expect((await request(app).patch(`/orders/${created.body.id}/after-photo`)
      .send({ afterPhotoUrl: "data:image/png;base64,AA==" })).status).toBe(401);

    const managerAfterPhoto = await request(app).patch(`/orders/${created.body.id}/after-photo`)
      .set("x-manager", "yes")
      .send({ afterPhotoUrl: "data:image/png;base64,AA==" });
    expect(managerAfterPhoto.status).toBe(200);
    expect((await request(app).get("/orders").set("x-manager", "yes")).status).toBe(200);
    expect((await request(app).get(`/orders/${created.body.id}`).set("x-manager", "yes")).status).toBe(200);
  });
});