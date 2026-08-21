import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, insertProductSchema } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { PANEL_CATALOG } from "../data/panel-catalog";
import { requireManagerSession } from "../middleware/managerAuth";

const router: IRouter = Router();

// GET /api/products
router.get("/products", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .orderBy(productsTable.createdAt);
    res.json(products);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch products", detail: msg });
  }
});

// POST /api/products/seed-catalog  — must come before /products/:id
router.post("/products/seed-catalog", requireManagerSession, async (_req, res) => {
  try {
    // Count existing
    const [{ count: existingCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable);

    const rows = PANEL_CATALOG.map(e => ({
      name: e.name,
      article: e.article,
      series: e.series,
      cost: e.cost,
      photoUrl: e.photoUrl,
      collection: null as string | null,
    }));

    // Batch insert, skip conflicts on article
    await db
      .insert(productsTable)
      .values(rows)
      .onConflictDoNothing({ target: productsTable.article });

    const [{ count: newCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable);

    const inserted = newCount - existingCount;
    const skipped = rows.length - inserted;

    res.json({ inserted, skipped, total: newCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to seed catalog", detail: msg });
  }
});

// POST /api/products
router.post("/products", requireManagerSession, async (req, res) => {
  try {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }
    const [product] = await db.insert(productsTable).values(parsed.data).returning();
    res.status(201).json(product);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to create product", detail: msg });
  }
});

// PUT /api/products/:id
router.put("/products/:id", requireManagerSession, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const parsed = insertProductSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    }
    const [updated] = await db
      .update(productsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated) return void res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update product", detail: msg });
  }
});

// DELETE /api/products/:id
router.delete("/products/:id", requireManagerSession, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });
    const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!deleted) return void res.status(404).json({ error: "Product not found" });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to delete product", detail: msg });
  }
});

export default router;
