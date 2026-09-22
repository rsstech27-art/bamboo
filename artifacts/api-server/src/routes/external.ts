import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual, createHash } from "crypto";

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function hashStr(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

import { db } from "@workspace/db";
import { ordersTable, managerSettingsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

// ── API key helpers ───────────────────────────────────────────────────────────
async function getStoredApiKey(): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(managerSettingsTable)
      .where(eq(managerSettingsTable.key, "api_key"));
    if (!row) return null;
    const val = row.value as Record<string, unknown> | null;
    return val && typeof val.key === "string" ? val.key : null;
  } catch {
    return null;
  }
}

async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = Array.isArray(req.headers["x-api-key"])
    ? req.headers["x-api-key"][0]
    : req.headers["x-api-key"];

  if (!provided) {
    return void res.status(401).json({ error: "Missing X-Api-Key header" });
  }
  const stored = await getStoredApiKey();
  if (!stored) {
    return void res
      .status(503)
      .json({ error: "API key not configured — generate one in manager settings." });
  }
  if (!timingSafeEqual(hashStr(provided), hashStr(stored))) {
    return void res.status(403).json({ error: "Invalid API key" });
  }
  next();
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/external/orders
 * Returns a list of all orders with id, orderNumber, zoneLabel, createdAt,
 * whether a PDF is available, and the before-photo URL.
 */
router.get("/external/orders", requireApiKey, async (_req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt));

    res.json(
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        zoneLabel: o.zoneLabel,
        createdAt: o.createdAt,
        hasPdf: !!o.pdfPath,
        beforePhotoUrl:
          (o.kpData as Record<string, unknown>)?.beforePhotoUrl ?? null,
        total: (o.kpData as Record<string, unknown>)?.total ?? null,
      })),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch orders", detail: msg });
  }
});

/**
 * GET /api/external/orders/:id
 * Returns a single order with full kpData, items, PDF URL, and before-photo URL.
 */
router.get("/external/orders/:id", requireApiKey, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!order) return void res.status(404).json({ error: "Order not found" });

    const kp = order.kpData as Record<string, unknown>;
    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      zoneLabel: order.zoneLabel,
      createdAt: order.createdAt,
      total: kp?.total ?? null,
      items: kp?.items ?? [],
      beforePhotoUrl: kp?.beforePhotoUrl ?? null,
      pdfUrl: order.pdfPath
        ? `/api/external/orders/${order.id}/pdf`
        : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch order", detail: msg });
  }
});

/**
 * GET /api/external/orders/:id/pdf
 * Streams the КП PDF for the given order.
 */
router.get("/external/orders/:id/pdf", requireApiKey, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!order) return void res.status(404).json({ error: "Order not found" });
    if (!order.pdfPath)
      return void res
        .status(404)
        .json({ error: "No PDF saved for this order" });

    const file = await storage.getObjectEntityFile(order.pdfPath);
    const response = await storage.downloadObject(file, 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="kp-${order.orderNumber ?? id}.pdf"`,
    );
    if (response.headers.get("Content-Length")) {
      res.setHeader(
        "Content-Length",
        response.headers.get("Content-Length")!,
      );
    }

    const reader = response.body!.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to serve PDF", detail: msg });
  }
});

export default router;
