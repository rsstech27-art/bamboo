import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profileCatalogTable, type ProfileCatalogEntry } from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminOrPerm } from "../middleware/managerAuth";
import { OFFICIAL_PROFILE_CATALOG } from "../data/profile-catalog";
import {
  ImportOfficialProfileCatalogResponse,
  ListProfileCatalogResponse,
  UpdateProfileCatalogBody,
  UpdateProfileCatalogParams,
  UpdateProfileCatalogResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const ALLOWED_COLORS = new Set(["black", "gold", "bronze", "metallic"]);
const KIND_ORDER = new Map([["connector", 0], ["gap", 1], ["light", 2]]);

type ProfileUpdate = Pick<ProfileCatalogEntry, "article" | "name" | "colors">;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEditableMetadata(
  kind: string,
  value: unknown,
): { ok: true; data: ProfileUpdate } | { ok: false; error: string } {
  if (!isObject(value)) return { ok: false, error: "Request body must be an object." };

  if ("lengthMm" in value || "panelThicknessesMm" in value) {
    return { ok: false, error: "Profile length and panel thicknesses are read-only." };
  }
  const unexpectedKeys = Object.keys(value).filter((key) => !["article", "name", "colors"].includes(key));
  if (unexpectedKeys.length > 0) {
    return { ok: false, error: `Unsupported field: ${unexpectedKeys[0]}` };
  }

  if (typeof value.article !== "string" || !value.article.trim() || value.article.trim().length > 100) {
    return { ok: false, error: "Article must contain 1 to 100 characters." };
  }
  if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 200) {
    return { ok: false, error: "Name must contain 1 to 200 characters." };
  }
  if (
    !Array.isArray(value.colors) ||
    value.colors.length === 0 ||
    value.colors.some((color) => typeof color !== "string" || !ALLOWED_COLORS.has(color)) ||
    new Set(value.colors).size !== value.colors.length
  ) {
    return { ok: false, error: "Colors must be a non-empty list of unique supported colors." };
  }
  if (kind === "light" && value.colors.some((color) => color !== "black")) {
    return { ok: false, error: "Light profiles only support the black color." };
  }

  const parsed = UpdateProfileCatalogBody.safeParse({
    article: value.article.trim(),
    name: value.name.trim(),
    colors: value.colors,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid profile metadata." };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

function isUniqueArticleViolation(error: unknown): boolean {
  const seen = new Set<object>();
  let current: unknown = error;
  for (let depth = 0; depth < 5 && isObject(current); depth++) {
    if (seen.has(current)) return false;
    seen.add(current);
    if (
      current.code === "23505" &&
      current.constraint === "profile_catalog_article_unique"
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

function sortCatalog(rows: ProfileCatalogEntry[]): ProfileCatalogEntry[] {
  return rows.sort((a, b) =>
    (KIND_ORDER.get(a.kind) ?? Number.MAX_SAFE_INTEGER) -
    (KIND_ORDER.get(b.kind) ?? Number.MAX_SAFE_INTEGER),
  );
}

// GET /api/profile-catalog — public official profile metadata.
router.get("/profile-catalog", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(profileCatalogTable)
      .orderBy(asc(profileCatalogTable.kind));
    res.json(ListProfileCatalogResponse.parse(sortCatalog(rows)));
  } catch {
    res.status(500).json({ error: "Failed to fetch profile catalog." });
  }
});

// PUT /api/profile-catalog/:kind — update manager-editable metadata.
router.put(
  "/profile-catalog/:kind",
  requireAdminOrPerm(["products", "canEdit"]),
  async (req, res): Promise<void> => {
    const params = UpdateProfileCatalogParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Unknown profile kind." });
      return;
    }
    const { kind } = params.data;

    const validation = validateEditableMetadata(kind, req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const [updated] = await db
        .update(profileCatalogTable)
        .set({ ...validation.data, updatedAt: new Date() })
        .where(eq(profileCatalogTable.kind, kind))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Profile kind not found." });
        return;
      }
      res.json(UpdateProfileCatalogResponse.parse(updated));
    } catch (error) {
      if (isUniqueArticleViolation(error)) {
        res.status(409).json({ error: "Article is already assigned to another profile kind." });
        return;
      }
      res.status(500).json({ error: "Failed to update profile catalog." });
    }
  },
);

// POST /api/profile-catalog/import-official — add missing official rows only.
router.post(
  "/profile-catalog/import-official",
  requireAdminOrPerm(["products", "canEdit"]),
  async (_req, res): Promise<void> => {
    try {
      const imported = await db.transaction(async (tx) => {
        let insertedCount = 0;
        for (const officialProfile of OFFICIAL_PROFILE_CATALOG) {
          const inserted = await tx
            .insert(profileCatalogTable)
            .values(officialProfile)
            .onConflictDoNothing({ target: profileCatalogTable.kind })
            .returning({ kind: profileCatalogTable.kind });
          insertedCount += inserted.length;
        }
        return insertedCount;
      });

      const rows = await db
        .select()
        .from(profileCatalogTable)
        .orderBy(asc(profileCatalogTable.kind));
      res.json(ImportOfficialProfileCatalogResponse.parse({ imported, profiles: sortCatalog(rows) }));
    } catch (error) {
      if (isUniqueArticleViolation(error)) {
        res.status(409).json({ error: "An official article is already assigned to another profile kind." });
        return;
      }
      res.status(500).json({ error: "Failed to import official profile catalog." });
    }
  },
);

export default router;