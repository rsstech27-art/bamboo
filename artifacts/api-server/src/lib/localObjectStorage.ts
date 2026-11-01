import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Disk-backed replacement for Replit App Storage, used when the API runs on an
 * ordinary server (STORAGE_DRIVER=local). Objects keep the same logical paths
 * as in Replit ("uploads/order-pdfs/<uuid>", "order-pdfs/<uuid>") under
 * LOCAL_STORAGE_DIR. Each object is `<path>` (bytes) plus `<path>.json`
 * (content type, size, timestamps, ACL metadata).
 *
 * The browser still uploads through a one-time signed PUT URL, so the
 * frontend flow is unchanged. A signed URL can write only once ("wx"), so an
 * attached PDF can never be overwritten through a still-valid URL.
 */

const UUID = /^[a-f0-9-]{36}$/;
const NAMESPACES = ["uploads/order-pdfs", "order-pdfs", "uploads"] as const;
export const LOCAL_UPLOAD_ROUTE = "/storage/local-upload";
export const LOCAL_UPLOAD_MAX_BYTES = 16 * 1024 * 1024;

export function isLocalStorageEnabled(): boolean {
  return process.env.STORAGE_DRIVER?.trim().toLowerCase() === "local";
}

function storageRoot(): string {
  const dir = process.env.LOCAL_STORAGE_DIR?.trim();
  if (!dir) throw new Error("LOCAL_STORAGE_DIR is not configured");
  return path.resolve(dir);
}

function signingSecret(): string {
  const secret = process.env.UPLOAD_SIGNING_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("UPLOAD_SIGNING_SECRET must be at least 32 characters");
  }
  return secret;
}

/** Validate a relative object name such as "uploads/order-pdfs/<uuid>". */
export function parseLocalObjectName(name: string): { namespace: string; id: string } | null {
  const slash = name.lastIndexOf("/");
  if (slash < 0) return null;
  const namespace = name.slice(0, slash);
  const id = name.slice(slash + 1);
  if (!(NAMESPACES as readonly string[]).includes(namespace) || !UUID.test(id)) return null;
  return { namespace, id };
}

function sign(objectName: string, expires: number): string {
  return createHmac("sha256", signingSecret()).update(`${objectName}|${expires}`).digest("hex");
}

/** Relative URL, so uploads work from any domain the app is served on. */
export function createLocalUploadUrl(objectName: string, ttlSec: number): string {
  if (!parseLocalObjectName(objectName)) throw new Error("Invalid object name");
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const params = new URLSearchParams({
    name: objectName, expires: String(expires), signature: sign(objectName, expires),
  });
  const base = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
  return `${base}/api${LOCAL_UPLOAD_ROUTE}?${params.toString()}`;
}

export function verifyLocalUpload(name: unknown, expires: unknown, signature: unknown): string | null {
  if (typeof name !== "string" || typeof expires !== "string" || typeof signature !== "string") return null;
  if (!parseLocalObjectName(name)) return null;
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const expected = Buffer.from(sign(name, expiresAt), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? name : null;
}

type LocalMeta = {
  contentType?: string;
  size: number;
  timeCreated: string;
  updated: string;
  metadata?: Record<string, string>;
};

export class LocalStoredFile {
  readonly kind = "local" as const;
  readonly name: string;

  constructor(objectName: string) {
    if (!parseLocalObjectName(objectName)) throw new Error("Invalid object name");
    this.name = objectName;
  }

  get dataPath(): string {
    return path.join(storageRoot(), ...this.name.split("/"));
  }

  private get metaPath(): string {
    return `${this.dataPath}.json`;
  }

  async exists(): Promise<boolean> {
    try {
      await stat(this.dataPath);
      await stat(this.metaPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMeta(): Promise<LocalMeta> {
    return JSON.parse(await readFile(this.metaPath, "utf8")) as LocalMeta;
  }

  async setCustomMetadata(values: Record<string, string>): Promise<void> {
    const meta = await this.getMeta();
    meta.metadata = { ...(meta.metadata ?? {}), ...values };
    meta.updated = new Date().toISOString();
    await writeMeta(this.metaPath, meta);
  }

  async readPrefix(length: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of createReadStream(this.dataPath, { start: 0, end: length - 1 })) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  createReadStream(): Readable {
    return createReadStream(this.dataPath);
  }

  /** Copy bytes and metadata to a new object that no upload URL can reach. */
  async copyTo(objectName: string): Promise<LocalStoredFile> {
    const target = new LocalStoredFile(objectName);
    await mkdir(path.dirname(target.dataPath), { recursive: true, mode: 0o750 });
    await copyFile(this.dataPath, target.dataPath);
    const meta = await this.getMeta();
    const now = new Date().toISOString();
    await writeMeta(`${target.dataPath}.json`, { ...meta, timeCreated: now, updated: now });
    return target;
  }

  async delete(): Promise<void> {
    await unlink(this.metaPath).catch(() => undefined);
    await unlink(this.dataPath);
  }
}

/** Store an uploaded body exactly once for a signed object name. */
export async function saveLocalUpload(
  objectName: string,
  body: Buffer,
  contentType: string | undefined,
): Promise<"saved" | "exists"> {
  const file = new LocalStoredFile(objectName);
  await mkdir(path.dirname(file.dataPath), { recursive: true, mode: 0o750 });
  try {
    await writeFile(file.dataPath, body, { flag: "wx", mode: 0o640 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return "exists";
    throw error;
  }
  const now = new Date().toISOString();
  // The object only counts as present once its metadata exists (see exists()).
  await writeMeta(`${file.dataPath}.json`, {
    contentType: contentType?.split(";")[0]?.trim().toLowerCase(),
    size: body.length,
    timeCreated: now,
    updated: now,
  });
  return "saved";
}

/** List objects (with metadata) directly inside one namespace. */
export async function* listLocalObjects(namespace: string): AsyncGenerator<LocalStoredFile> {
  const dir = path.join(storageRoot(), ...namespace.split("/"));
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!UUID.test(entry)) continue;
    const file = new LocalStoredFile(`${namespace}/${entry}`);
    if (await file.exists()) yield file;
  }
}

async function writeMeta(metaPath: string, meta: LocalMeta): Promise<void> {
  const tmp = `${metaPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(meta), { mode: 0o640 });
  await rename(tmp, metaPath);
}
