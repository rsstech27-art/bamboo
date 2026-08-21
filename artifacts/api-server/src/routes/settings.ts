import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { managerSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/** Known setting keys */
const VALID_KEYS = new Set(["panel_prices", "molding_prices", "series_names", "molding_names"]);

// GET /api/settings  — returns all four settings as one object
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(managerSettingsTable);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch settings", detail: msg });
  }
});

// PUT /api/settings/:key  — upsert a single setting
router.put("/settings/:key", async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.has(key)) {
    return void res.status(400).json({ error: `Unknown setting key: ${key}` });
  }

  const value = req.body as unknown;
  if (value === undefined || value === null) {
    return void res.status(400).json({ error: "Body must be a JSON value" });
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
    res.status(500).json({ error: "Failed to save setting", detail: msg });
  }
});

// DELETE /api/settings/:key  — reset a setting to default (remove the row)
router.delete("/settings/:key", async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.has(key)) {
    return void res.status(400).json({ error: `Unknown setting key: ${key}` });
  }
  try {
    await db.delete(managerSettingsTable).where(eq(managerSettingsTable.key, key));
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to delete setting", detail: msg });
  }
});

export default router;
