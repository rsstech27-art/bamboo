/**
 * Backup/Restore API for the product catalog.
 *
 * GET  /api/backup/export  — download a versioned ZIP archive (manager only)
 * POST /api/backup/import  — merge archive products into the live catalog (manager only)
 *
 * Import semantics (merge, not snapshot):
 *   - Products present in the archive are ADDED or UPDATED (matched by article).
 *   - Products absent from the archive are LEFT UNTOUCHED.
 *   - Settings keys present in the archive OVERWRITE the live values.
 *   - Settings keys absent from the archive are LEFT UNTOUCHED.
 *   This is intentionally "import/merge" to prevent accidental bulk deletion.
 *
 * Archive format (version 1):
 *   manifest.json            — version, timestamp, products[], settings{}
 *   photos/<article>.<ext>   — binary image files (only for data-URL photos)
 *
 * Static texture URLs (e.g. /bamboo-studio/textures/…) stay in manifest.json
 * as plain strings; no binary extraction is performed during export.
 *
 * Limits — export and import are aligned:
 *   - Compressed ZIP body:      200 MB   (express.raw limit ≈ worst-case JPEG total)
 *   - Per-photo uncompressed:    12 MB   (checked via bounded stream before buffering)
 *   - Total photos uncompressed: 200 MB  (actual bytes during decompression, not headers)
 *   - Max photos in archive:    500 entries
 *   Export enforces the same per-photo and total limits before streaming begins,
 *   so any archive it produces can be imported through the same API.
 *
 * Security guarantees:
 *   - readEntryBounded() decompresses through a streaming byte counter and
 *     aborts before buffers exceed the per-entry limit, protecting against
 *     ZIP-bomb memory exhaustion BEFORE materializing the full buffer.
 *   - Import only streams entries whose paths appear in the validated manifest.
 *   - Aggregate limit is enforced on actual decompressed bytes, not on untrusted
 *     central-directory declared sizes.
 *   - Any referenced photo absent from the archive is rejected outright.
 *   - Duplicate archive entries for the same photo path are rejected.
 *   - Path-traversal in photoFile is rejected by the manifest validator.
 *   - Photo file extensions must match /^\.[a-z0-9]{2,8}$/.
 */
import express, { Router, type IRouter } from "express";
import { ZipArchive } from "archiver";
import unzipper from "unzipper";
import { db } from "@workspace/db";
import { productsTable, managerSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireManagerSession } from "../middleware/managerAuth";

const router: IRouter = Router();

const MANIFEST_VERSION = 1;

const VALID_SETTING_KEYS = new Set([
  "panel_prices",
  "molding_prices",
  "series_names",
  "molding_names",
  "custom_series",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Aligned limits — export enforces the same thresholds before streaming begins.
// JPEG/PNG/WebP is already compressed so ZIP compression ratio ≈ 1.0, meaning
// compressed ZIP body size ≈ total uncompressed photo bytes.
// ─────────────────────────────────────────────────────────────────────────────
const IMPORT_BODY_LIMIT = "200mb";           // express.raw limit for ZIP upload
const MAX_MANIFEST_BYTES = 10 * 1024 * 1024;    // 10 MB
const MAX_PHOTO_COUNT = 500;                     // entries per archive
const MAX_PER_PHOTO_BYTES = 12 * 1024 * 1024;   // 12 MB per photo
const MAX_TOTAL_PHOTO_BYTES = 200 * 1024 * 1024; // 200 MB total photos (actual bytes)

// ─────────────────────────────────────────────────────────────────────────────
// readEntryBounded — bounded streaming decompression
//
// Reads a ZIP entry through its decompression stream, counting bytes as they
// arrive.  Returns null when the entry exceeds maxBytes WITHOUT having fully
// buffered the content first (prevents ZIP-bomb memory exhaustion).
// ─────────────────────────────────────────────────────────────────────────────
export async function readEntryBounded(
  entry: unzipper.File,
  maxBytes: number,
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const settle = (result: Buffer | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const stream = entry.stream();
    // Cast to access standard Readable methods; unzipper's stream() extends PassThrough
    const readable = stream as unknown as {
      on(event: string, listener: (...args: unknown[]) => void): unknown;
      destroy(): void;
    };

    readable.on("data", (chunk: unknown) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      total += buf.length;
      if (total > maxBytes) {
        readable.destroy();
        settle(null); // null = oversized
        return;
      }
      chunks.push(buf);
    });

    readable.on("end", () => {
      if (!settled) settle(Buffer.concat(chunks));
    });

    readable.on("error", (err: unknown) => {
      // destroy() may emit 'error' with ERR_STREAM_DESTROYED; if we already
      // settled (oversized path), ignore it.
      if (!settled) reject(err as Error);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/backup/export
// ─────────────────────────────────────────────────────────────────────────────
router.get("/backup/export", requireManagerSession, async (req, res) => {
  try {
    const [products, settingRows] = await Promise.all([
      db.select().from(productsTable).orderBy(productsTable.createdAt),
      db.select().from(managerSettingsTable),
    ]);

    const settings: Record<string, unknown> = {};
    for (const row of settingRows) settings[row.key] = row.value;

    // ── Preflight: enforce the same limits as import ──────────────────────
    let totalPhotoBytes = 0;
    let photoCount = 0;

    for (const p of products) {
      if (typeof p.photoUrl === "string" && p.photoUrl.startsWith("data:")) {
        const ext = dataUrlExt(p.photoUrl);
        if (ext === null) continue; // unextractable MIME — stays in photoUrl field
        const base64 = p.photoUrl.split(",")[1] ?? "";
        const approxBytes = Math.floor(base64.length * 3 / 4);
        if (approxBytes > MAX_PER_PHOTO_BYTES) {
          return void res.status(400).json({
            error: `Фото товара «${p.article}» превышает лимит (${MAX_PER_PHOTO_BYTES / 1024 / 1024} МБ)`,
          });
        }
        totalPhotoBytes += approxBytes;
        photoCount++;
      }
    }

    if (photoCount > MAX_PHOTO_COUNT) {
      return void res.status(400).json({
        error: `Слишком много фотографий в каталоге (${photoCount}, макс. ${MAX_PHOTO_COUNT})`,
      });
    }
    if (totalPhotoBytes > MAX_TOTAL_PHOTO_BYTES) {
      return void res.status(400).json({
        error: `Суммарный размер фотографий (${Math.round(totalPhotoBytes / 1024 / 1024)} МБ) превышает лимит (${MAX_TOTAL_PHOTO_BYTES / 1024 / 1024} МБ).`,
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `allwall-catalog-backup-${dateStr}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err: Error) => {
      req.log.error({ err }, "archive error during export");
      if (!res.headersSent) res.status(500).end();
    });
    archive.pipe(res);

    // Build manifest: extract data-URL photos into separate binary entries.
    const manifestProducts = products.map((p) => {
      const isDataUrl =
        typeof p.photoUrl === "string" && p.photoUrl.startsWith("data:");
      const ext = isDataUrl ? dataUrlExt(p.photoUrl!) : null;
      const photoFile = isDataUrl && ext ? `photos/${p.article}${ext}` : null;

      if (photoFile) {
        const base64 = p.photoUrl!.split(",")[1];
        archive.append(Buffer.from(base64, "base64"), { name: photoFile });
      }

      return {
        name: p.name,
        article: p.article,
        collection: p.collection ?? null,
        series: p.series ?? null,
        cost: p.cost,
        photoFile,
        // When a data-URL MIME type cannot be mapped to a safe extension,
        // preserve the original data-URL so no photo data is silently lost.
        photoUrl: isDataUrl
          ? photoFile === null
            ? (p.photoUrl ?? null)  // unextractable MIME — preserve verbatim
            : null                  // extracted to archive file
          : (p.photoUrl ?? null),   // static texture URL — keep as-is
        scaleDown: p.scaleDown,
        noMetallicProfile: p.noMetallicProfile,
        kpName: p.kpName ?? null,
        panelWidthMm: p.panelWidthMm ?? null,
        panelHeightMm: p.panelHeightMm ?? null,
      };
    });

    const manifest = {
      version: MANIFEST_VERSION,
      exportedAt: now.toISOString(),
      products: manifestProducts,
      settings,
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    await archive.finalize();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed", detail: msg });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/backup/import
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/backup/import",
  requireManagerSession,
  express.raw({
    type: ["application/zip", "application/octet-stream", "application/x-zip-compressed"],
    limit: IMPORT_BODY_LIMIT,
  }),
  async (req, res) => {
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return void res.status(400).json({ error: "Ожидается ZIP-файл в теле запроса" });
    }

    const result = await processBackupBuffer(body);
    if (!result.ok) {
      return void res.status(result.status).json({ error: result.error });
    }
    const { products: resolvedProducts, settings: mSettings } = result;

    let added = 0;
    let updated = 0;
    let settingsRestored = 0;

    try {
      await db.transaction(async (tx) => {
        for (const p of resolvedProducts) {
          const [existing] = await tx
            .select({ id: productsTable.id })
            .from(productsTable)
            .where(eq(productsTable.article, p.article));

          if (existing) {
            await tx
              .update(productsTable)
              .set({
                name: p.name,
                collection: p.collection,
                series: p.series,
                cost: p.cost,
                photoUrl: p.photoUrl,
                scaleDown: p.scaleDown,
                noMetallicProfile: p.noMetallicProfile,
                kpName: p.kpName,
                panelWidthMm: p.panelWidthMm,
                panelHeightMm: p.panelHeightMm,
                updatedAt: new Date(),
              })
              .where(eq(productsTable.article, p.article));
            updated++;
          } else {
            await tx.insert(productsTable).values({
              name: p.name,
              article: p.article,
              collection: p.collection,
              series: p.series,
              cost: p.cost,
              photoUrl: p.photoUrl,
              scaleDown: p.scaleDown,
              noMetallicProfile: p.noMetallicProfile,
              kpName: p.kpName,
              panelWidthMm: p.panelWidthMm,
              panelHeightMm: p.panelHeightMm,
            });
            added++;
          }
        }

        for (const [key, value] of Object.entries(mSettings)) {
          if (!VALID_SETTING_KEYS.has(key)) continue;
          await tx
            .insert(managerSettingsTable)
            .values({ key, value: value as Record<string, unknown>, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: managerSettingsTable.key,
              set: { value: value as Record<string, unknown>, updatedAt: new Date() },
            });
          settingsRestored++;
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return void res.status(500).json({ error: "Ошибка при импорте", detail: msg });
    }

    res.json({ ok: true, added, updated, settingsRestored });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// processBackupBuffer — exported for testing
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedProduct {
  name: string;
  article: string;
  collection: string | null;
  series: string | null;
  cost: number;
  photoUrl: string | null;
  scaleDown: boolean;
  noMetallicProfile: boolean;
  kpName: string | null;
  panelWidthMm: number | null;
  panelHeightMm: number | null;
}

type ProcessResult =
  | { ok: true; products: ResolvedProduct[]; settings: Record<string, unknown> }
  | { ok: false; status: 400; error: string };

export async function processBackupBuffer(body: Buffer): Promise<ProcessResult> {
  const err400 = (msg: string): ProcessResult => ({ ok: false, status: 400, error: msg });

  // ── Open ZIP ──────────────────────────────────────────────────────────────
  let directory: unzipper.CentralDirectory;
  try {
    directory = await unzipper.Open.buffer(body);
  } catch {
    return err400("Не удалось открыть ZIP-архив. Файл повреждён или не является ZIP.");
  }

  // ── Read manifest.json via bounded stream ─────────────────────────────────
  const manifestEntry = directory.files.find(
    (f) => f.path === "manifest.json" && !f.path.endsWith("/"),
  );
  if (!manifestEntry) return err400("В архиве отсутствует manifest.json");

  const manifestBuf = await readEntryBounded(manifestEntry, MAX_MANIFEST_BYTES);
  if (manifestBuf === null) return err400("manifest.json слишком большой (макс. 10 МБ)");

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestBuf.toString("utf8"));
  } catch {
    return err400("manifest.json повреждён или содержит некорректный JSON");
  }

  // ── Validate manifest ─────────────────────────────────────────────────────
  const validation = validateManifest(manifest);
  if (!validation.ok) return err400(validation.error);
  const { products: mProducts, settings: mSettings } = validation;

  // ── Collect ONLY manifest-referenced photos via bounded stream ────────────
  const referencedPhotoPaths = new Set<string>();
  for (const p of mProducts) {
    if (p.photoFile) referencedPhotoPaths.add(p.photoFile);
  }

  if (referencedPhotoPaths.size > MAX_PHOTO_COUNT) {
    return err400(
      `Слишком много фотографий (${referencedPhotoPaths.size}, макс. ${MAX_PHOTO_COUNT})`,
    );
  }

  const photoMap = new Map<string, string>(); // zipPath → data URL
  const seenPaths = new Set<string>();         // detect duplicate ZIP entries
  let totalActualBytes = 0;                    // actual decompressed bytes

  for (const entry of directory.files) {
    if (!referencedPhotoPaths.has(entry.path)) continue; // only manifest-referenced
    if (entry.path.endsWith("/")) continue;

    // Reject duplicate entries for the same photo path.
    if (seenPaths.has(entry.path)) {
      return err400(`Дублирующийся файл в архиве: ${entry.path}`);
    }
    seenPaths.add(entry.path);

    // Decompress via bounded stream — aborts BEFORE materialising the full buffer.
    const buf = await readEntryBounded(entry, MAX_PER_PHOTO_BYTES);
    if (buf === null) {
      return err400(
        `Фото ${entry.path} слишком большое (макс. ${MAX_PER_PHOTO_BYTES / 1024 / 1024} МБ)`,
      );
    }

    // Enforce aggregate cap on actual decompressed bytes.
    totalActualBytes += buf.length;
    if (totalActualBytes > MAX_TOTAL_PHOTO_BYTES) {
      return err400("Суммарный размер фотографий превышает допустимый предел (200 МБ)");
    }

    const mime = extToMime(fileExt(entry.path));
    photoMap.set(entry.path, `data:${mime};base64,${buf.toString("base64")}`);
  }

  // ── Reject archive if any referenced photo is missing ────────────────────
  for (const p of mProducts) {
    if (p.photoFile && !photoMap.has(p.photoFile)) {
      return err400(`Фото для товара «${p.article}» отсутствует в архиве: ${p.photoFile}`);
    }
  }

  // ── Resolve products ──────────────────────────────────────────────────────
  const products: ResolvedProduct[] = mProducts.map((p) => ({
    name: p.name,
    article: p.article,
    collection: p.collection,
    series: p.series,
    cost: p.cost,
    photoUrl: p.photoFile ? (photoMap.get(p.photoFile) ?? null) : p.photoUrl,
    scaleDown: p.scaleDown,
    noMetallicProfile: p.noMetallicProfile,
    kpName: p.kpName,
    panelWidthMm: p.panelWidthMm,
    panelHeightMm: p.panelHeightMm,
  }));

  return { ok: true, products, settings: mSettings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a data URL's MIME type to a safe file extension.
 * Returns null when the sanitised subtype falls outside 2-8 alphanumeric chars.
 */
export function dataUrlExt(dataUrl: string): string | null {
  const m = dataUrl.match(/^data:image\/([^;,]+);base64,/);
  if (!m) return null;
  const sub = m[1].toLowerCase();
  if (sub === "jpeg") return ".jpg";
  if (sub === "svg+xml") return ".svg";
  const sanitized = sub.replace(/[^a-z0-9]/g, "");
  if (sanitized.length < 2 || sanitized.length > 8) return null;
  return "." + sanitized;
}

/**
 * Validates that a photo file extension is safe for archive entry names.
 * Accepts dot + 2-8 lowercase alphanumeric characters.
 */
export function isSafePhotoExt(ext: string): boolean {
  return /^\.[a-z0-9]{2,8}$/.test(ext);
}

function fileExt(p: string): string {
  const i = p.lastIndexOf(".");
  return i < 0 ? "" : p.slice(i).toLowerCase();
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".avif": "image/avif",
  };
  return map[ext] ?? "image/octet-stream";
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest validation
// ─────────────────────────────────────────────────────────────────────────────

interface ManifestProduct {
  name: string;
  article: string;
  collection: string | null;
  series: string | null;
  cost: number;
  photoFile: string | null;
  photoUrl: string | null;
  scaleDown: boolean;
  noMetallicProfile: boolean;
  kpName: string | null;
  panelWidthMm: number | null;
  panelHeightMm: number | null;
}

type ValidationResult =
  | { ok: true; products: ManifestProduct[]; settings: Record<string, unknown> }
  | { ok: false; error: string };

export function validateManifest(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "manifest.json должен быть объектом" };
  }
  const m = raw as Record<string, unknown>;

  if (m["version"] !== MANIFEST_VERSION) {
    return {
      ok: false,
      error: `Неподдерживаемая версия архива: ${m["version"]}. Ожидается: ${MANIFEST_VERSION}`,
    };
  }
  if (!Array.isArray(m["products"])) {
    return { ok: false, error: "manifest.json: поле 'products' должно быть массивом" };
  }

  const products: ManifestProduct[] = [];
  const seenArticles = new Set<string>();

  for (let i = 0; i < (m["products"] as unknown[]).length; i++) {
    const raw = (m["products"] as unknown[])[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: `products[${i}]: ожидается объект` };
    }
    const p = raw as Record<string, unknown>;

    if (typeof p["name"] !== "string" || !p["name"].trim()) {
      return { ok: false, error: `products[${i}]: поле 'name' обязательно` };
    }
    if (typeof p["article"] !== "string" || !p["article"].trim()) {
      return { ok: false, error: `products[${i}]: поле 'article' обязательно` };
    }
    if (typeof p["cost"] !== "number" || p["cost"] < 0 || !Number.isFinite(p["cost"])) {
      return { ok: false, error: `products[${i}]: 'cost' должен быть неотрицательным числом` };
    }

    const article = p["article"] as string;
    if (seenArticles.has(article)) {
      return { ok: false, error: `Дублирующийся артикул в архиве: ${article}` };
    }
    seenArticles.add(article);

    const photoFile = typeof p["photoFile"] === "string" ? p["photoFile"] : null;
    if (photoFile !== null) {
      if (
        !photoFile.startsWith("photos/") ||
        photoFile.includes("..") ||
        photoFile.includes("\\")
      ) {
        return { ok: false, error: `products[${i}]: недопустимый путь к фото: ${photoFile}` };
      }
      if (!isSafePhotoExt(fileExt(photoFile))) {
        return { ok: false, error: `products[${i}]: недопустимое расширение фото` };
      }
    }

    const photoUrl = typeof p["photoUrl"] === "string" ? p["photoUrl"] : null;

    products.push({
      name: p["name"] as string,
      article,
      collection: typeof p["collection"] === "string" && p["collection"] ? p["collection"] : null,
      series: typeof p["series"] === "string" && p["series"] ? p["series"] : null,
      cost: p["cost"] as number,
      photoFile,
      photoUrl,
      scaleDown: p["scaleDown"] === true,
      noMetallicProfile: p["noMetallicProfile"] !== false,
      kpName: typeof p["kpName"] === "string" && p["kpName"] ? p["kpName"] : null,
      panelWidthMm:
        typeof p["panelWidthMm"] === "number" && Number.isFinite(p["panelWidthMm"])
          ? (p["panelWidthMm"] as number)
          : null,
      panelHeightMm:
        typeof p["panelHeightMm"] === "number" && Number.isFinite(p["panelHeightMm"])
          ? (p["panelHeightMm"] as number)
          : null,
    });
  }

  const settings: Record<string, unknown> = {};
  if (m["settings"] && typeof m["settings"] === "object" && !Array.isArray(m["settings"])) {
    for (const [key, val] of Object.entries(m["settings"] as Record<string, unknown>)) {
      if (VALID_SETTING_KEYS.has(key)) settings[key] = val;
    }
  }

  return { ok: true, products, settings };
}

export default router;
