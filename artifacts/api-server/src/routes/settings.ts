import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { managerSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireManagerSession } from "../middleware/managerAuth";
import { requireAdminOrPerm } from "../middleware/managerAuth";
import { validateCatalog, validatePanelThicknesses } from "@workspace/profile-system";

const router: IRouter = Router();
const isDev = process.env.NODE_ENV !== "production";

/** Known setting keys */
const VALID_KEYS = new Set([
  "profile_variants",
  "panel_thicknesses",
  "panel_prices",
  "molding_prices",
  "series_names",
  "molding_names",
  "custom_series",
  "custom_moldings",
  "extras_prices",
  "hidden_series_ids",
  "hidden_molding_ids",
  "hidden_extras_ids",
  "custom_extras",
  "api_key",
]);

// GET /api/settings  — public; returns all settings EXCEPT api_key
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(managerSettingsTable);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.key === "api_key") continue; // never expose to public callers
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch settings", ...(isDev && { detail: msg }) });
  }
});

// GET /api/settings/api_key  — protected; returns the api_key value for the manager UI
router.get("/settings/api_key", requireManagerSession, async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(managerSettingsTable)
      .where(eq(managerSettingsTable.key, "api_key"));
    res.json(row?.value ?? null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch api_key", ...(isDev && { detail: msg }) });
  }
});

// PUT /api/settings/:key  — upsert a single setting
// Existing price editors may change prices, but cannot create/activate or reclassify a variant.
router.patch("/settings/profile_variants/prices", requireManagerSession,
  requireAdminOrPerm(["prices","canEdit"]), async (req,res) => {
    const prices = req.body as unknown;
    if(!prices || typeof prices!=="object" || Array.isArray(prices) ||
      !Object.values(prices).every(p=>typeof p==="number" && Number.isFinite(p) && p>0))
      return void res.status(400).json({error:"Укажите положительные цены подтверждённых вариантов."});
    try {
      const changed = await db.transaction(async tx=>{
        const [row] = await tx.select().from(managerSettingsTable)
          .where(eq(managerSettingsTable.key,"profile_variants")).for("update");
        const catalog = row?.value;
        if(!validateCatalog(catalog)) return false;
        const edits = prices as Record<string,number>;
        if(Object.keys(edits).some(id=>!catalog.find(v=>v.id===id&&v.confirmed))) return false;
        const value = catalog.map(v=>Object.hasOwn(edits,v.id)?{...v,price:edits[v.id]}:v);
        await tx.update(managerSettingsTable).set({value,updatedAt:new Date()})
          .where(eq(managerSettingsTable.key,"profile_variants"));
        return true;
      });
      if(!changed) return void res.status(409).json({error:"Вариант ещё не подтверждён или каталог изменился. Обновите страницу; артикулы подтверждаются во вкладке «Товары»."});
      res.json({ok:true});
    } catch {
      res.status(500).json({error:"Цены профилей не сохранены."});
    }
});

router.put("/settings/:key", requireManagerSession, (req, res, next) => {
  if (req.params["key"] === "profile_variants" || req.params["key"] === "panel_thicknesses") {
    return requireAdminOrPerm(["products", "canEdit"])(req, res, next);
  }
  next();
}, async (req, res) => {
  const key = req.params["key"] as string;
  if (!VALID_KEYS.has(key)) {
    return void res.status(400).json({ error: `Unknown setting key: ${key}` });
  }

  const value = req.body as unknown;
  if (key === "profile_variants" && !validateCatalog(value)) {
    res.status(400).json({ error: "Некорректный каталог: 20 фиксированных вариантов; подтверждённый вариант требует артикул и положительную цену." });
    return;
  }
  if (key === "panel_thicknesses" && !validatePanelThicknesses(value)) {
    res.status(400).json({ error: "Толщина панели по артикулу должна быть 5 или 8 мм." });
    return;
  }
  if (value === undefined || value === null) {
    return void res.status(400).json({ error: "Body must be a JSON value" });
  }

  // Validate custom_series
  if (
    key === "custom_series" &&
    (!Array.isArray(value) || value.some(item => {
      if (!item || typeof item !== "object") return true;
      const series = item as Record<string, unknown>;
      return (
        typeof series.id !== "string" ||
        typeof series.name !== "string" ||
        !series.name.trim() ||
        typeof series.price !== "number" ||
        !Number.isFinite(series.price) ||
        series.price <= 0
      );
    }))
  ) {
    return void res.status(400).json({ error: "Invalid custom series list" });
  }

  // Validate custom_moldings
  if (
    key === "custom_moldings" &&
    (!Array.isArray(value) || value.some(item => {
      if (!item || typeof item !== "object") return true;
      const m = item as Record<string, unknown>;
      return (
        typeof m.id !== "string" ||
        typeof m.name !== "string" ||
        !m.name.trim() ||
        typeof m.price !== "number" ||
        !Number.isFinite(m.price) ||
        m.price <= 0
      );
    }))
  ) {
    return void res.status(400).json({ error: "Invalid custom moldings list" });
  }

  // Validate custom_extras
  if (
    key === "custom_extras" &&
    (!Array.isArray(value) || value.some(item => {
      if (!item || typeof item !== "object") return true;
      const e = item as Record<string, unknown>;
      return (
        typeof e.id !== "string" ||
        typeof e.name !== "string" ||
        !e.name.trim() ||
        typeof e.price !== "number" ||
        !Number.isFinite(e.price) ||
        e.price <= 0
      );
    }))
  ) {
    return void res.status(400).json({ error: "Invalid custom extras list" });
  }

  // Validate price maps (panel_prices, molding_prices, extras_prices)
  if (["panel_prices", "molding_prices", "extras_prices"].includes(key)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return void res.status(400).json({ error: `${key} must be an object` });
    }
    const map = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(map)) {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return void res.status(400).json({ error: `Invalid price for key "${k}"` });
      }
    }
  }

  try {
    await db
      .insert(managerSettingsTable)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: managerSettingsTable.key,
        set: { value, updatedAt: new Date() },
      });
    res.json({ ok: true, key });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to save setting", ...(isDev && { detail: msg }) });
  }
});

// DELETE /api/settings/:key  — reset a setting to default (remove the row)
router.delete("/settings/:key", requireManagerSession, (req,res,next) => {
  if(req.params["key"]==="profile_variants" || req.params["key"]==="panel_thicknesses")
    return requireAdminOrPerm(["products","canEdit"])(req,res,next);
  next();
}, async (req, res) => {
  const key = req.params["key"] as string;
  if (!VALID_KEYS.has(key)) {
    return void res.status(400).json({ error: `Unknown setting key: ${key}` });
  }
  try {
    await db.delete(managerSettingsTable).where(eq(managerSettingsTable.key, key));
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to delete setting", ...(isDev && { detail: msg }) });
  }
});

export default router;
