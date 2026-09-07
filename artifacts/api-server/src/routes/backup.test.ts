import { describe, it, expect } from "vitest";
import { PassThrough } from "stream";
import request from "supertest";
import app from "../app";
import { isAllowedOrigin } from "../app";
import {
  validateManifest,
  dataUrlExt,
  isSafePhotoExt,
  processBackupBuffer,
  type ResolvedProduct,
} from "./backup";
import { ZipArchive } from "archiver";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — create real in-memory ZIP buffers for integration tests
// ─────────────────────────────────────────────────────────────────────────────

async function buildZip(
  files: { name: string; content: Buffer | string }[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on("data", (c: Buffer) => chunks.push(c));
    sink.on("end", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);

    const arch = new ZipArchive({ zlib: { level: 1 } });
    arch.on("error", reject);
    arch.pipe(sink as unknown as NodeJS.WritableStream);
    for (const f of files) arch.append(f.content, { name: f.name });
    arch.finalize().catch(reject);
  });
}

const VALID_PRODUCT = {
  name: "Дуб натуральный",
  article: "W-001",
  collection: "All Wall",
  series: "Натуральные",
  cost: 5200,
  photoFile: null as string | null,
  photoUrl: null as string | null,
  scaleDown: false,
  noMetallicProfile: true,
  kpName: null,
  panelWidthMm: null,
  panelHeightMm: null,
};

const MINIMAL_MANIFEST = {
  version: 1,
  exportedAt: new Date().toISOString(),
  products: [] as unknown[],
  settings: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth checks — no manager session
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/backup/export — auth", () => {
  it("returns 401 without a session cookie", async () => {
    const res = await request(app).get("/api/backup/export");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/backup/import — auth", () => {
  it("returns 401 without a session cookie", async () => {
    const zip = await buildZip([{ name: "manifest.json", content: "bad" }]);
    const res = await request(app)
      .post("/api/backup/import")
      .set("Content-Type", "application/zip")
      .send(zip);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CORS origin allowlist
// ─────────────────────────────────────────────────────────────────────────────
describe("isAllowedOrigin — CORS allowlist", () => {
  it("rejects a sibling *.replit.dev origin", () => {
    expect(isAllowedOrigin("https://evil.replit.dev")).toBe(false);
  });
  it("rejects a sibling *.replit.app origin", () => {
    expect(isAllowedOrigin("https://other-app.replit.app")).toBe(false);
  });
  it("accepts localhost for local development", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
  });
  it("accepts localhost without an explicit port", () => {
    expect(isAllowedOrigin("http://localhost")).toBe(true);
  });
  it("rejects undefined origin", () => {
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
  it("does not send ACAO header for a sibling *.replit.dev preflight", async () => {
    const res = await request(app)
      .options("/api/backup/import")
      .set("Origin", "https://evil.replit.dev")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    const acao = res.headers["access-control-allow-origin"] as string | undefined;
    expect(acao).not.toBe("https://evil.replit.dev");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dataUrlExt
// ─────────────────────────────────────────────────────────────────────────────
describe("dataUrlExt", () => {
  it("maps image/jpeg → .jpg", () =>
    expect(dataUrlExt("data:image/jpeg;base64,abc")).toBe(".jpg"));
  it("maps image/jpg → .jpg", () =>
    expect(dataUrlExt("data:image/jpg;base64,abc")).toBe(".jpg"));
  it("maps image/png → .png", () =>
    expect(dataUrlExt("data:image/png;base64,abc")).toBe(".png"));
  it("maps image/webp → .webp", () =>
    expect(dataUrlExt("data:image/webp;base64,abc")).toBe(".webp"));
  it("maps image/gif → .gif", () =>
    expect(dataUrlExt("data:image/gif;base64,abc")).toBe(".gif"));
  it("maps image/svg+xml → .svg (not silently dropped)", () =>
    expect(dataUrlExt("data:image/svg+xml;base64,abc")).toBe(".svg"));
  it("maps image/bmp → .bmp", () =>
    expect(dataUrlExt("data:image/bmp;base64,abc")).toBe(".bmp"));
  it("maps image/avif → .avif", () =>
    expect(dataUrlExt("data:image/avif;base64,abc")).toBe(".avif"));
  it("maps image/tiff → .tiff", () =>
    expect(dataUrlExt("data:image/tiff;base64,abc")).toBe(".tiff"));
  it("returns null for non-image data URLs", () =>
    expect(dataUrlExt("data:application/pdf;base64,abc")).toBeNull());
  it("returns null for plain URLs", () =>
    expect(dataUrlExt("/bamboo-studio/textures/tex.jpg")).toBeNull());
  it("sanitises exotic subtypes to alphanumeric (xcustom → .xcustom)", () =>
    expect(dataUrlExt("data:image/x-custom;base64,abc")).toBe(".xcustom"));
  it("returns null for pathologically long subtypes (> 8 chars after sanitise)", () =>
    expect(dataUrlExt("data:image/averylongsub;base64,abc")).toBeNull());
});

// ─────────────────────────────────────────────────────────────────────────────
// isSafePhotoExt
// ─────────────────────────────────────────────────────────────────────────────
describe("isSafePhotoExt", () => {
  it("accepts .jpg", () => expect(isSafePhotoExt(".jpg")).toBe(true));
  it("accepts .svg", () => expect(isSafePhotoExt(".svg")).toBe(true));
  it("accepts .avif", () => expect(isSafePhotoExt(".avif")).toBe(true));
  it("rejects path-traversal", () => expect(isSafePhotoExt("../passwd")).toBe(false));
  it("rejects empty string", () => expect(isSafePhotoExt("")).toBe(false));
  it("rejects dot only", () => expect(isSafePhotoExt(".")).toBe(false));
  it("rejects over 8 char extension", () => expect(isSafePhotoExt(".verylongext")).toBe(false));
  it("rejects extension with spaces", () => expect(isSafePhotoExt(".sv g")).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// validateManifest — unit tests
// ─────────────────────────────────────────────────────────────────────────────
describe("validateManifest", () => {
  it("accepts a minimal valid manifest", () => {
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [VALID_PRODUCT] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].article).toBe("W-001");
  });

  it("accepts empty products and settings", () => {
    const r = validateManifest(MINIMAL_MANIFEST);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products).toHaveLength(0);
  });

  it("rejects wrong version", () => {
    const r = validateManifest({ ...MINIMAL_MANIFEST, version: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/версия/i);
  });

  it("rejects missing products array", () => {
    const r = validateManifest({ version: 1, settings: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/products/);
  });

  it("rejects null/string/array manifest", () => {
    const msg = "manifest.json должен быть объектом";
    expect(validateManifest(null)).toEqual({ ok: false, error: msg });
    expect(validateManifest("string")).toEqual({ ok: false, error: msg });
    expect(validateManifest([1, 2])).toEqual({ ok: false, error: msg });
  });

  it("rejects product with empty name", () => {
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [{ ...VALID_PRODUCT, name: "" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/);
  });

  it("rejects product with empty article", () => {
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [{ ...VALID_PRODUCT, article: "" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/article/);
  });

  it("rejects product with negative cost", () => {
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [{ ...VALID_PRODUCT, cost: -1 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/cost/);
  });

  it("rejects duplicate articles in same archive", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [VALID_PRODUCT, { ...VALID_PRODUCT, name: "Дубль" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/дубликат|артикул/i);
  });

  it("rejects path-traversal in photoFile", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [{ ...VALID_PRODUCT, photoFile: "photos/../etc/passwd.jpg" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/путь|photoFile/i);
  });

  it("rejects unsafe photo extension (too long)", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [{ ...VALID_PRODUCT, photoFile: "photos/W-001.verylongext" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/расширение/i);
  });

  it("accepts .svg photoFile (SVG round-trip)", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [{ ...VALID_PRODUCT, photoFile: "photos/W-001.svg" }],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts data-URL in photoUrl when photoFile is null (unextractable MIME fallback)", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [{ ...VALID_PRODUCT, photoUrl: "data:image/x-exotic;base64,abc==" }],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts static texture URL in photoUrl", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      products: [{ ...VALID_PRODUCT, photoUrl: "/bamboo-studio/textures/tex-001.jpg" }],
    });
    expect(r.ok).toBe(true);
  });

  it("strips unknown setting keys", () => {
    const r = validateManifest({
      ...MINIMAL_MANIFEST,
      settings: { panel_prices: { s1: 5000 }, unknown_key: "bad" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.settings["panel_prices"]).toBeDefined();
      expect(r.settings["unknown_key"]).toBeUndefined();
    }
  });

  it("defaults noMetallicProfile to true when absent", () => {
    const { noMetallicProfile: _omit, ...p } = VALID_PRODUCT;
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [p] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].noMetallicProfile).toBe(true);
  });

  it("defaults scaleDown to false when absent", () => {
    const { scaleDown: _omit, ...p } = VALID_PRODUCT;
    const r = validateManifest({ ...MINIMAL_MANIFEST, products: [p] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].scaleDown).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processBackupBuffer — integration tests (real ZIP buffers, no DB)
// ─────────────────────────────────────────────────────────────────────────────
describe("processBackupBuffer", () => {
  it("rejects a non-ZIP buffer", async () => {
    const r = await processBackupBuffer(Buffer.from("not a zip"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ZIP/i);
  });

  it("rejects a ZIP missing manifest.json", async () => {
    const zip = await buildZip([{ name: "photos/W-001.jpg", content: Buffer.alloc(10) }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/manifest/i);
  });

  it("rejects a ZIP with invalid JSON in manifest", async () => {
    const zip = await buildZip([{ name: "manifest.json", content: "{not json" }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON/i);
  });

  it("accepts a valid ZIP with no photos", async () => {
    const manifest = { ...MINIMAL_MANIFEST, products: [VALID_PRODUCT] };
    const zip = await buildZip([{ name: "manifest.json", content: JSON.stringify(manifest) }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.products).toHaveLength(1);
      expect(r.products[0].article).toBe("W-001");
      expect(r.products[0].photoUrl).toBeNull();
    }
  });

  it("round-trip: extracts a JPEG photo from ZIP and returns a data-URL", async () => {
    // 1×1 white JPEG (smallest valid JPEG)
    const jpegBytes = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC" +
      "AABAAEDASIA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=",
      "base64",
    );

    const product = { ...VALID_PRODUCT, photoFile: "photos/W-001.jpg", photoUrl: null };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    const zip = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/W-001.jpg", content: jpegBytes },
    ]);

    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const resolved = r.products[0] as ResolvedProduct;
      expect(resolved.photoUrl).toBeTruthy();
      expect(resolved.photoUrl!.startsWith("data:image/jpeg;base64,")).toBe(true);
    }
  });

  it("rejects a manifest that references a photo absent from the ZIP", async () => {
    const product = { ...VALID_PRODUCT, photoFile: "photos/W-001.jpg" };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    // ZIP intentionally omits photos/W-001.jpg
    const zip = await buildZip([{ name: "manifest.json", content: JSON.stringify(manifest) }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/отсутствует/i);
  });

  it("rejects a ZIP with duplicate entries for the same photo path", async () => {
    // archiver does NOT deduplicate: calling append() twice with the same name
    // produces two central-directory entries, which unzipper lists in directory.files.
    // Our seenPaths guard then triggers on the second occurrence.
    const product = { ...VALID_PRODUCT, photoFile: "photos/W-001.jpg" };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    const photoBytes = Buffer.alloc(10, 0xff);
    const zipWithDuplicate = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/W-001.jpg", content: photoBytes },
      { name: "photos/W-001.jpg", content: photoBytes }, // real duplicate
    ]);
    const r = await processBackupBuffer(zipWithDuplicate);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/дублирующийся/i);
  });

  it("rejects a photo entry exceeding MAX_PER_PHOTO_BYTES (12 MB) via bounded stream", async () => {
    // 13 MB of zeros compresses to ~10 KB in the ZIP but decompresses to 13 MB.
    // readEntryBounded aborts the stream at 12 MB before the full buffer is built.
    const oversized = Buffer.alloc(13 * 1024 * 1024, 0); // 13 MB zeros
    const product = { ...VALID_PRODUCT, photoFile: "photos/W-001.bin" };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    const zip = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/W-001.bin", content: oversized },
    ]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/слишком большое/i);
  }, 30_000); // allow time for 13 MB ZIP build + stream abort

  it("preserves static texture URL (no binary extraction)", async () => {
    const product = {
      ...VALID_PRODUCT,
      photoUrl: "/bamboo-studio/textures/oak.jpg",
    };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    const zip = await buildZip([{ name: "manifest.json", content: JSON.stringify(manifest) }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].photoUrl).toBe("/bamboo-studio/textures/oak.jpg");
  });

  it("handles SVG photo round-trip (.svg extension)", async () => {
    const svgContent = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><rect width='10' height='10'/></svg>");
    const product = { ...VALID_PRODUCT, photoFile: "photos/W-001.svg" };
    const manifest = { ...MINIMAL_MANIFEST, products: [product] };
    const zip = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/W-001.svg", content: svgContent },
    ]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].photoUrl!.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("handles multiple products with and without photos", async () => {
    const photoBytes = Buffer.alloc(50, 0xaa);
    const products = [
      { ...VALID_PRODUCT, article: "A-001", photoFile: "photos/A-001.png", photoUrl: null },
      { ...VALID_PRODUCT, article: "A-002", photoFile: null, photoUrl: "/bamboo-studio/textures/t.jpg" },
      { ...VALID_PRODUCT, article: "A-003", photoFile: null, photoUrl: null },
    ];
    const manifest = { ...MINIMAL_MANIFEST, products };
    const zip = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/A-001.png", content: photoBytes },
    ]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.products).toHaveLength(3);
      expect(r.products[0].photoUrl!.startsWith("data:image/png;base64,")).toBe(true);
      expect(r.products[1].photoUrl).toBe("/bamboo-studio/textures/t.jpg");
      expect(r.products[2].photoUrl).toBeNull();
    }
  });

  it("ignores ZIP entries not referenced in manifest (no untracked decompression)", async () => {
    const manifest = { ...MINIMAL_MANIFEST, products: [VALID_PRODUCT] };
    // Include a photo entry not referenced by any product
    const zip = await buildZip([
      { name: "manifest.json", content: JSON.stringify(manifest) },
      { name: "photos/unreferenced.jpg", content: Buffer.alloc(100, 0xff) },
    ]);
    const r = await processBackupBuffer(zip);
    // Should succeed; untracked entry is ignored
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.products[0].photoUrl).toBeNull();
  });

  it("restores settings alongside products", async () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      products: [],
      settings: { panel_prices: { series1: 4500 }, molding_prices: { m1: 800 } },
    };
    const zip = await buildZip([{ name: "manifest.json", content: JSON.stringify(manifest) }]);
    const r = await processBackupBuffer(zip);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.settings["panel_prices"]).toEqual({ series1: 4500 });
      expect(r.settings["molding_prices"]).toEqual({ m1: 800 });
    }
  });
});
