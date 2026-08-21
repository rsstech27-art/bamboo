import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderSequencesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function formatOrderNumber(prefix: string, n: number): string {
  const width = prefix === "С" ? 4 : 3;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

// GET /api/orders
router.get("/orders", async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch orders", detail: msg });
  }
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch order", detail: msg });
  }
});

// POST /api/orders — auto-assigns sequential order number
router.post("/orders", async (req, res) => {
  try {
    const { prefix, zoneLabel, kpData } = req.body as {
      prefix?: unknown;
      zoneLabel?: unknown;
      kpData?: unknown;
    };
    if (typeof prefix !== "string" || prefix.trim() === "") {
      return void res.status(400).json({ error: "prefix is required" });
    }
    if (typeof zoneLabel !== "string" || zoneLabel.trim() === "") {
      return void res.status(400).json({ error: "zoneLabel is required" });
    }
    if (!kpData || typeof kpData !== "object") {
      return void res.status(400).json({ error: "kpData must be an object" });
    }

    const order = await db.transaction(async (tx) => {
      // Ensure row exists
      await tx
        .insert(orderSequencesTable)
        .values({ prefix, lastNumber: 0 })
        .onConflictDoNothing();

      const [seq] = await tx
        .select()
        .from(orderSequencesTable)
        .where(eq(orderSequencesTable.prefix, prefix));

      const nextNum = (seq?.lastNumber ?? 0) + 1;

      await tx
        .update(orderSequencesTable)
        .set({ lastNumber: nextNum })
        .where(eq(orderSequencesTable.prefix, prefix));

      const orderNumber = formatOrderNumber(prefix, nextNum);

      const [inserted] = await tx
        .insert(ordersTable)
        .values({
          orderNumber,
          prefix,
          zoneLabel,
          kpData: kpData as Record<string, unknown>,
        })
        .returning();

      return inserted;
    });

    res.status(201).json(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to create order", detail: msg });
  }
});

export default router;
