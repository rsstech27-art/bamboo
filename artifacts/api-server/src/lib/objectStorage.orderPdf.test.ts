import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";

const mocks = vi.hoisted(() => {
  const destinationFile = {};
  const targetBucket = { file: vi.fn(() => destinationFile), getFiles: vi.fn() };
  const generationFile = {
    createReadStream: vi.fn(),
    copy: vi.fn().mockResolvedValue([]),
  };
  const sourceBucket = { file: vi.fn(() => generationFile) };
  const sourceFile = {
    name: "private/uploads/12345678-1234-1234-1234-123456789abc",
    bucket: sourceBucket,
    getMetadata: vi.fn(),
  };
  return {
    destinationFile,
    targetBucket,
    generationFile,
    sourceBucket,
    sourceFile,
    getTargetBucket: vi.fn(() => targetBucket),
  };
});

describe("order PDF cleanup namespaces", () => {
  const uuid = "12345678-1234-1234-1234-123456789abc";
  beforeEach(() => {
    vi.stubEnv("PRIVATE_OBJECT_DIR", "/private-bucket/private");
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lists only dedicated order PDF namespaces, follows pagination, and skips unknown names", async () => {
    const upload = { name: `private/uploads/order-pdfs/${uuid}` };
    const copy = { name: `private/order-pdfs/${uuid}` };
    mocks.targetBucket.getFiles
      .mockResolvedValueOnce([[upload, { name: "private/uploads/order-pdfs/other-function/file" }], { pageToken: "next" }])
      .mockResolvedValueOnce([[], null])
      .mockResolvedValueOnce([[copy], null]);
    const files = [];
    for await (const file of new ObjectStorageService().listOrderPdfCandidates()) files.push(file);
    expect(files).toEqual([upload, copy]);
    expect(mocks.targetBucket.getFiles.mock.calls.map(([query]) => query.prefix)).toEqual([
      "private/uploads/order-pdfs/", "private/uploads/order-pdfs/", "private/order-pdfs/",
    ]);
    expect(mocks.targetBucket.getFiles.mock.calls[1][0].pageToken).toBe("next");
  });

  it("rejects shared uploads (including unrelated PDFs), public assets and other buckets", () => {
    const service = new ObjectStorageService();
    for (const name of [`private/uploads/${uuid}`, `public/order-pdfs/${uuid}`,
      `private/order-pdfs/subdir/${uuid}`, `private/photos/${uuid}`]) {
      expect(() => service.orderPdfObjectPath({ name, bucket: { name: "private-bucket" } } as any))
        .toThrow();
    }
    expect(() => service.orderPdfObjectPath({
      name: `private/order-pdfs/${uuid}`, bucket: { name: "other-bucket" },
    } as any)).toThrow();
    expect(service.orderPdfObjectPath({
      name: `private/uploads/order-pdfs/${uuid}`, bucket: { name: "private-bucket" },
    } as any)).toBe(`/objects/uploads/order-pdfs/${uuid}`);
  });
});

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket = mocks.getTargetBucket;
  },
}));
vi.mock("./objectAcl", () => ({
  canAccessObject: vi.fn(),
  getObjectAclPolicy: vi.fn(),
  setObjectAclPolicy: vi.fn(),
  ObjectPermission: { READ: "read", WRITE: "write" },
}));

import {
  InvalidOrderPdfError,
  ObjectNotFoundError,
  ObjectStorageService,
} from "./objectStorage";

describe("ObjectStorageService.finalizeOrderPdf", () => {
  let service: ObjectStorageService;

  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "vitest-only-order-pdf-secret-not-a-real-credential");
    vi.stubEnv("PRIVATE_OBJECT_DIR", "/private-bucket/private");
    service = new ObjectStorageService();
    vi.spyOn(service, "getObjectEntityFile").mockResolvedValue(mocks.sourceFile as any);
    mocks.sourceFile.getMetadata.mockResolvedValue([{
      contentType: "application/pdf",
      size: "128",
      generation: "generation-17",
    }]);
    mocks.generationFile.createReadStream.mockReturnValue(Readable.from([Buffer.from("%PDF-")]));
    mocks.generationFile.copy.mockResolvedValue([]);
    mocks.sourceBucket.file.mockReturnValue(mocks.generationFile);
    mocks.getTargetBucket.mockReturnValue(mocks.targetBucket);
    mocks.targetBucket.file.mockReturnValue(mocks.destinationFile);
    vi.clearAllMocks();
    // vi.clearAllMocks clears call history, not the valid defaults above.
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects a missing upload", async () => {
    vi.spyOn(service, "getObjectEntityFile").mockRejectedValue(new ObjectNotFoundError());
    await expect(service.finalizeOrderPdf("/objects/uploads/missing"))
      .rejects.toBeInstanceOf(ObjectNotFoundError);
    expect(mocks.sourceFile.getMetadata).not.toHaveBeenCalled();
  });

  it("requires application/pdf MIME metadata", async () => {
    mocks.sourceFile.getMetadata.mockResolvedValueOnce([{
      contentType: "application/octet-stream",
      size: "128",
      generation: "generation-17",
    }]);
    await expect(service.finalizeOrderPdf("/objects/uploads/id"))
      .rejects.toBeInstanceOf(InvalidOrderPdfError);
    expect(mocks.sourceBucket.file).not.toHaveBeenCalled();
  });

  it.each(["4", String(15 * 1024 * 1024 + 1), "not-a-size"])(
    "rejects invalid PDF size %s",
    async (size) => {
      mocks.sourceFile.getMetadata.mockResolvedValueOnce([{
        contentType: "application/pdf",
        size,
        generation: "generation-17",
      }]);
      await expect(service.finalizeOrderPdf("/objects/uploads/id"))
        .rejects.toBeInstanceOf(InvalidOrderPdfError);
      expect(mocks.sourceBucket.file).not.toHaveBeenCalled();
    },
  );

  it("rejects a file whose first five bytes do not contain the PDF signature", async () => {
    mocks.generationFile.createReadStream.mockReturnValueOnce(
      Readable.from([Buffer.from("NOT-P")]),
    );
    await expect(service.finalizeOrderPdf("/objects/uploads/id"))
      .rejects.toBeInstanceOf(InvalidOrderPdfError);
    expect(mocks.generationFile.copy).not.toHaveBeenCalled();
  });

  it("pins validation and copy to the inspected generation", async () => {
    const finalPath = await service.finalizeOrderPdf("/objects/uploads/id");

    expect(finalPath).toMatch(/^\/objects\/order-pdfs\/[a-f0-9-]{36}$/);
    expect(mocks.sourceBucket.file).toHaveBeenCalledWith(mocks.sourceFile.name, {
      generation: "generation-17",
    });
    expect(mocks.generationFile.createReadStream).toHaveBeenCalledWith({ start: 0, end: 4 });
    expect(mocks.getTargetBucket).toHaveBeenCalledWith("private-bucket");
    expect(mocks.generationFile.copy).toHaveBeenCalledWith(mocks.destinationFile);
  });

  it("rejects metadata without a generation identifier", async () => {
    mocks.sourceFile.getMetadata.mockResolvedValueOnce([{
      contentType: "application/pdf",
      size: "128",
    }]);
    await expect(service.finalizeOrderPdf("/objects/uploads/id"))
      .rejects.toBeInstanceOf(InvalidOrderPdfError);
    expect(mocks.sourceBucket.file).not.toHaveBeenCalled();
  });
});