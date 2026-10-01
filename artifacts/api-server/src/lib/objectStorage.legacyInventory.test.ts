import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const bucket = { getFiles: vi.fn() };
  return {
    bucket,
    getBucket: vi.fn(() => bucket),
  };
});

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket = mocks.getBucket;
  },
}));
vi.mock("./objectAcl", () => ({
  canAccessObject: vi.fn(),
  getObjectAclPolicy: vi.fn(),
  setObjectAclPolicy: vi.fn(),
  ObjectPermission: { READ: "read", WRITE: "write" },
}));

import { ObjectStorageService } from "./objectStorage";

const UUID_A = "12345678-1234-1234-1234-123456789abc";
const UUID_B = "87654321-4321-4321-4321-cba987654321";

function storageFile(name: string, metadata: Record<string, unknown> = {}) {
  return {
    name,
    getMetadata: vi.fn().mockResolvedValue([{
      generation: "generation-7",
      size: "512",
      timeCreated: "2024-01-01T00:00:00.000Z",
      updated: "2024-01-02T00:00:00.000Z",
      contentType: "application/pdf",
      ...metadata,
    }]),
    delete: vi.fn(),
  };
}

async function collectInventory(service = new ObjectStorageService()) {
  const files = [];
  for await (const file of service.listLegacyUploadInventory()) files.push(file);
  return files;
}

describe("ObjectStorageService.listLegacyUploadInventory", () => {
  beforeEach(() => {
    vi.stubEnv("PRIVATE_OBJECT_DIR", "/private-bucket/private");
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("lists only exact shared UUID uploads, excluding owned namespaces and unrelated names", async () => {
    const accepted = storageFile(`private/uploads/${UUID_A}`);
    const invalidFiles = [
      storageFile(`private/uploads/${UUID_B}/nested`),
      storageFile(`private/uploads/${UUID_B}/extra`),
      storageFile(`private/uploads/order-pdfs/${UUID_B}`),
      storageFile(`private/order-pdfs/${UUID_B}`),
      storageFile("private/uploads/not-a-uuid.pdf"),
      storageFile("private/uploads/12345678-1234-1234-1234-123456789ABC"),
      storageFile("private/photos/12345678-1234-1234-1234-123456789abc"),
    ];
    mocks.bucket.getFiles.mockResolvedValueOnce([[accepted, ...invalidFiles], null]);

    const inventory = await collectInventory();

    expect(inventory).toHaveLength(1);
    expect(inventory[0].objectPath).toBe(`/objects/uploads/${UUID_A}`);
    expect(mocks.bucket.getFiles).toHaveBeenCalledWith({
      prefix: "private/uploads/",
      autoPaginate: false,
      maxResults: 100,
      pageToken: undefined,
    });
    for (const file of [accepted, ...invalidFiles]) {
      expect(file.delete).not.toHaveBeenCalled();
    }
  });

  it("requests pages of at most 100 and follows the next page token", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      storageFile(`private/uploads/${index.toString(16).padStart(8, "0")}-1234-1234-1234-123456789abc`));
    const secondPageFile = storageFile(`private/uploads/${UUID_A}`);
    mocks.bucket.getFiles
      .mockResolvedValueOnce([firstPage, { pageToken: "next-page-token" }])
      .mockResolvedValueOnce([[secondPageFile], null]);

    const inventory = await collectInventory();

    expect(inventory).toHaveLength(101);
    expect(mocks.bucket.getFiles).toHaveBeenCalledTimes(2);
    expect(mocks.bucket.getFiles.mock.calls.map(([query]) => query)).toEqual([
      {
        prefix: "private/uploads/",
        autoPaginate: false,
        maxResults: 100,
        pageToken: undefined,
      },
      {
        prefix: "private/uploads/",
        autoPaginate: false,
        maxResults: 100,
        pageToken: "next-page-token",
      },
    ]);
  });

  it("returns only sanitized metadata and never deletes objects", async () => {
    const file = storageFile(`private/uploads/${UUID_A}`, {
      metadata: {
        apiKey: "custom-secret-marker",
        signedUrl: "https://storage.example/file?X-Goog-Signature=private-token",
      },
      bucket: "private-bucket",
      selfLink: "https://storage.example/b/private-bucket/private/uploads/file",
      mediaLink: "https://storage.example/download?token=private-token",
    });
    mocks.bucket.getFiles.mockResolvedValueOnce([[file], null]);

    const result = await collectInventory();

    expect(result).toEqual([{
      objectPath: `/objects/uploads/${UUID_A}`,
      generation: "generation-7",
      sizeBytes: 512,
      timeCreated: "2024-01-01T00:00:00.000Z",
      updated: "2024-01-02T00:00:00.000Z",
      contentType: "application/pdf",
      hasCustomMetadata: true,
    }]);
    const serialized = JSON.stringify(result);
    for (const privateValue of [
      "private-bucket",
      "private/uploads",
      "custom-secret-marker",
      "X-Goog-Signature",
      "private-token",
      "selfLink",
      "mediaLink",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(file.delete).not.toHaveBeenCalled();
  });

  it("propagates storage listing failures instead of returning an empty inventory", async () => {
    mocks.bucket.getFiles.mockRejectedValueOnce(new Error("listing failed"));

    await expect(collectInventory()).rejects.toThrow("listing failed");
  });

  it("propagates metadata failures instead of returning an incomplete inventory", async () => {
    const file = storageFile(`private/uploads/${UUID_A}`);
    file.getMetadata.mockRejectedValueOnce(new Error("metadata failed"));
    mocks.bucket.getFiles.mockResolvedValueOnce([[file], null]);

    await expect(collectInventory()).rejects.toThrow("metadata failed");
    expect(file.delete).not.toHaveBeenCalled();
  });
});