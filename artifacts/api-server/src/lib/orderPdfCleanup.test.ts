import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  referenced: new Set<string>(),
  execute: vi.fn(),
  select: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
vi.mock("@workspace/db", () => ({
  db: {
    transaction: async (callback: (tx: unknown) => unknown) => callback({
      execute: mocks.execute,
      select: () => ({ from: () => ({
        where: (condition: { value: string }) => ({
          limit: async () => {
            mocks.select(condition.value);
            return mocks.referenced.has(condition.value) ? [{ id: 1 }] : [];
          },
        }),
      }) }),
    }),
  },
}));
vi.mock("@workspace/db/schema", () => ({ ordersTable: { id: "id", pdfPath: "pdf_path" } }));
vi.mock("drizzle-orm", () => ({
  eq: (_column: unknown, value: string) => ({ value }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));
vi.mock("./logger", () => ({ logger: { error: mocks.error, info: mocks.info } }));

import { cleanupOrderPdfs, startOrderPdfCleanup } from "./orderPdfCleanup";
import { ObjectStorageService } from "./objectStorage";
import { ORDER_PDF_GRANT_TTL_MS, ORDER_PDF_UPLOAD_TTL_SEC, ORDER_PDF_RETENTION_MS, isExpiredOrderPdf } from "./orderPdfLifecycle";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const path = "/objects/order-pdfs/12345678-1234-1234-1234-123456789abc";
function candidate(age: number) {
  const metadata = {
    generation: "17",
    timeCreated: new Date(NOW - age).toISOString(),
    updated: new Date(NOW - age).toISOString(),
  };
  return {
    name: path.slice("/objects/".length),
    getMetadata: vi.fn(async () => [metadata]),
    delete: vi.fn(async (_options?: unknown) => undefined),
    metadata,
  };
}

describe("delayed order PDF cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mocks.referenced.clear();
    mocks.execute.mockResolvedValue([]);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  function service(files: ReturnType<typeof candidate>[]) {
    const storage = new ObjectStorageService();
    vi.spyOn(storage, "listOrderPdfCandidates").mockImplementation(async function* () {
      for (const file of files) yield file as any;
    });
    vi.spyOn(storage, "orderPdfObjectPath").mockReturnValue(path);
    return storage;
  }

  it("keeps active PUTs and unexpired attachment permissions; reclaims abandoned uploads after the margin", async () => {
    expect(ORDER_PDF_RETENTION_MS).toBeGreaterThan(ORDER_PDF_GRANT_TTL_MS);
    expect(ORDER_PDF_RETENTION_MS).toBeGreaterThan(ORDER_PDF_UPLOAD_TTL_SEC * 1000);
    const active = candidate(5 * 60 * 1000);
    const grantActive = candidate(20 * 60 * 1000);
    const abandoned = candidate(ORDER_PDF_RETENTION_MS + 1);
    expect(await cleanupOrderPdfs(service([active, grantActive, abandoned]))).toBe(1);
    expect(active.delete).not.toHaveBeenCalled();
    expect(grantActive.delete).not.toHaveBeenCalled();
    expect(abandoned.delete).toHaveBeenCalledWith({ ifGenerationMatch: "17" });
  });

  it("reclaims a finalized copy left by a DB failure, but not a saved order's PDF", async () => {
    const orphan = candidate(ORDER_PDF_RETENTION_MS + 1);
    expect(await cleanupOrderPdfs(service([orphan]))).toBe(1);
    mocks.referenced.add(path);
    const saved = candidate(7 * ORDER_PDF_RETENTION_MS);
    expect(await cleanupOrderPdfs(service([saved]))).toBe(0);
    expect(saved.getMetadata).not.toHaveBeenCalled();
    expect(saved.delete).not.toHaveBeenCalled();
    expect(mocks.execute).toHaveBeenCalled();
  });

  it("fails closed when the DB cannot confirm whether the file is attached", async () => {
    const file = candidate(7 * ORDER_PDF_RETENTION_MS);
    mocks.select.mockImplementationOnce(() => { throw new Error("DB unavailable"); });
    await expect(cleanupOrderPdfs(service([file]))).rejects.toThrow("DB unavailable");
    expect(file.delete).not.toHaveBeenCalled();
  });

  it("rechecks references after the shared lock is acquired", async () => {
    const file = candidate(7 * ORDER_PDF_RETENTION_MS);
    mocks.execute.mockImplementationOnce(async () => { mocks.referenced.add(path); });
    expect(await cleanupOrderPdfs(service([file]))).toBe(0);
    expect(file.delete).not.toHaveBeenCalled();
  });

  it("uses updated time to protect a recently overwritten upload", async () => {
    const file = candidate(7 * ORDER_PDF_RETENTION_MS);
    file.metadata.updated = new Date(NOW - 1000).toISOString();
    expect(await cleanupOrderPdfs(service([file]))).toBe(0);
    expect(file.delete).not.toHaveBeenCalled();
  });

  it.each([404, 412])("tolerates missing objects and changed generations (%s)", async (code) => {
    const file = candidate(7 * ORDER_PDF_RETENTION_MS);
    file.delete.mockRejectedValueOnce(Object.assign(new Error("race"), { code }));
    expect(await cleanupOrderPdfs(service([file]))).toBe(0);
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("does not delete objects with missing or invalid age/generation metadata", () => {
    for (const metadata of [{}, { timeCreated: "invalid", updated: "invalid", generation: "1" },
      { timeCreated: new Date(NOW).toISOString(), generation: "1" }]) {
      expect(isExpiredOrderPdf(metadata, NOW)).toBe(false);
    }
    expect(isExpiredOrderPdf(candidate(ORDER_PDF_RETENTION_MS).metadata, NOW)).toBe(false);
  });

  it("runs at startup and retries on the hourly timer after a failed sweep", async () => {
    const cleanup = vi.spyOn(ObjectStorageService.prototype, "listOrderPdfCandidates")
      .mockImplementation(async function* () { throw new Error("unavailable"); });
    const stop = startOrderPdfCleanup();
    await vi.advanceTimersByTimeAsync(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(cleanup).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});