import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderSequencesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireManagerSession } from "../middleware/managerAuth";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

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

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// GET /api/orders/:id
router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
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

// POST /api/orders/:id/pdf-upload-url — returns a presigned PUT URL for PDF upload.
// No manager session required here: the client already owns the order it just created.
router.post("/orders/:id/pdf-upload-url", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });

    const uploadURL = await storage.getObjectEntityUploadURL();
    // Derive the object path from the presigned URL
    const url = new URL(uploadURL);
    // Signed URL has form: https://storage.googleapis.com/<bucket>/<object>?...
    const pathParts = url.pathname.split("/"); // ['', bucketName, ...objectParts]
    const objectName = pathParts.slice(2).join("/");
    const objectPath = storage.normalizeObjectEntityPath(
      `https://storage.googleapis.com/${pathParts[1]}/${objectName}`,
    );

    res.json({ uploadURL, objectPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to generate upload URL", detail: msg });
  }
});

// PATCH /api/orders/:id/pdf — save the object path after a successful upload.
// No manager session required: same client that created the order.
router.patch("/orders/:id/pdf", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const { objectPath } = req.body as { objectPath?: unknown };
    if (typeof objectPath !== "string" || !objectPath.startsWith("/objects/")) {
      return void res.status(400).json({ error: "Invalid objectPath" });
    }

    await db
      .update(ordersTable)
      .set({ pdfPath: objectPath } as Record<string, unknown>)
      .where(eq(ordersTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to save pdf path", detail: msg });
  }
});

// GET /api/orders/:id/pdf — stream the stored PDF. Manager session required.
router.get("/orders/:id/pdf", requireManagerSession, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const [order] = await db
      .select({ pdfPath: sql<string | null>`pdf_path` })
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!order) return void res.status(404).json({ error: "Order not found" });
    if (!order.pdfPath) return void res.status(404).json({ error: "No PDF saved for this order" });

    const file = await storage.getObjectEntityFile(order.pdfPath);
    const response = await storage.downloadObject(file, 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="kp-${id}.pdf"`);
    if (response.headers.get("Content-Length")) {
      res.setHeader("Content-Length", response.headers.get("Content-Length")!);
    }

    const reader = response.body!.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
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
