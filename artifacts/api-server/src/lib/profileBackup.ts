import { db } from "@workspace/db";
import {
  profileCatalogMetadataSchema,
  profileCatalogTable,
  type ProfileCatalogMetadata,
} from "@workspace/db/schema";
import { inArray, sql } from "drizzle-orm";

export const PROFILE_BACKUP_VERSION = 1;

export function validateProfileBackup(raw: unknown):
  | { ok: true; profiles: ProfileCatalogMetadata[] }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "profileCatalog: ожидается объект" };
  }
  const section = raw as Record<string, unknown>;
  if (section.version !== PROFILE_BACKUP_VERSION) {
    return { ok: false, error: "profileCatalog: неподдерживаемая версия раздела" };
  }
  if (!Array.isArray(section.profiles) || section.profiles.length > 3) {
    return { ok: false, error: "profileCatalog.profiles: ожидается массив (макс. 3 вида)" };
  }
  const profiles: ProfileCatalogMetadata[] = [];
  const kinds = new Set<string>();
  const articles = new Set<string>();
  for (const [index, row] of section.profiles.entries()) {
    const parsed = profileCatalogMetadataSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ok: false,
        error: `profileCatalog.profiles[${index}]: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      };
    }
    if (kinds.has(parsed.data.kind) || articles.has(parsed.data.article)) {
      return { ok: false, error: "profileCatalog: дублирующийся вид или артикул" };
    }
    kinds.add(parsed.data.kind);
    articles.add(parsed.data.article);
    profiles.push(parsed.data);
  }
  return { ok: true, profiles };
}

export class ProfileBackupConflict extends Error {}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Check conflicts before ANY catalog writes, and serialize against profile edits.
 * Reinsert just the supplied kinds to allow valid article swaps without transient
 * unique-index violations; omitted kinds and original creation dates are retained.
 */
export async function prepareProfileRestore(tx: Transaction, profiles: ProfileCatalogMetadata[]) {
  if (profiles.length === 0) return [];
  await tx.execute(sql`LOCK TABLE ${profileCatalogTable} IN SHARE ROW EXCLUSIVE MODE`);
  const current = await tx.select().from(profileCatalogTable);
  const kinds = new Set(profiles.map((profile) => profile.kind));
  const articles = new Set(profiles.map((profile) => profile.article));
  for (const row of current) {
    if (!kinds.has(row.kind as ProfileCatalogMetadata["kind"]) && articles.has(row.article)) {
      throw new ProfileBackupConflict(`Артикул «${row.article}» уже назначен другому виду профиля`);
    }
  }
  return profiles.map((profile) => ({
    ...profile,
    createdAt: current.find((row) => row.kind === profile.kind)?.createdAt,
    updatedAt: new Date(),
  }));
}

export async function restoreProfiles(
  tx: Transaction,
  profiles: Awaited<ReturnType<typeof prepareProfileRestore>>,
) {
  if (profiles.length === 0) return;
  await tx.delete(profileCatalogTable).where(inArray(profileCatalogTable.kind, profiles.map((p) => p.kind)));
  await tx.insert(profileCatalogTable).values(profiles);
}