import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderSequencesTable } from "@workspace/db/schema";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { requireManagerSession } from "../middleware/managerAuth";
import { ObjectStorageService, ObjectNotFoundError, InvalidOrderPdfError } from "../lib/objectStorage";
import { issueOrderPdfGrant, verifyOrderPdfGrant } from "../lib/orderPdfGrant";
import {
  CreateOrderBody, CreateOrderResponse,
  RequestOrderPdfUploadBody, RequestOrderPdfUploadResponse,
  AttachOrderPdfBody, AttachOrderPdfResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const storage = new ObjectStorageService();

function formatOrderNumber(prefix: string, n: number): string {
  const width = prefix === "С" ? 4 : 3;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

// GET /api/orders
router.get("/orders", requireManagerSession, async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    res.json(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch orders", detail: msg });
  }
});

function parseId(raw: string | string[]): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(id) ? id : NaN;
}

// GET /api/orders/:id
router.get("/orders/:id", requireManagerSession, async (req, res) => {
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
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid order data" });
    const { prefix, zoneLabel, kpData } = parsed.data;
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

    res.setHeader("Cache-Control", "no-store");
    res.status(201).json(CreateOrderResponse.passthrough().parse({
      ...order, pdfToken: issueOrderPdfGrant(order.id),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to create order", detail: msg });
  }
});

// POST /api/orders/:id/pdf-upload-url — returns a presigned PUT URL for PDF upload.
// Creation capability is required; knowing a sequential order ID is not ownership.
router.post("/orders/:id/pdf-upload-url", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });
    const parsed = RequestOrderPdfUploadBody.safeParse(req.body);
    if (!parsed.success || !verifyOrderPdfGrant(parsed.data.pdfToken, id)) {
      return void res.status(403).json({ error: "Invalid or expired order PDF permission" });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });
    if (order.pdfPath) return void res.status(409).json({ error: "PDF already saved" });

    const uploadURL = await storage.getObjectEntityUploadURL();
    // Derive the object path from the presigned URL
    const url = new URL(uploadURL);
    // Signed URL has form: https://storage.googleapis.com/<bucket>/<object>?...
    const pathParts = url.pathname.split("/"); // ['', bucketName, ...objectParts]
    const objectName = pathParts.slice(2).join("/");
    const objectPath = storage.normalizeObjectEntityPath(
      `https://storage.googleapis.com/${pathParts[1]}/${objectName}`,
    );

    res.setHeader("Cache-Control", "no-store");
    res.json(RequestOrderPdfUploadResponse.parse({
      uploadURL, objectPath, uploadToken: issueOrderPdfGrant(id, objectPath),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to generate upload URL", detail: msg });
  }
});

// PATCH /api/orders/:id/after-photo — save a base64 after-photo into kpData.
router.patch("/orders/:id/after-photo", requireManagerSession, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const { afterPhotoUrl } = req.body as { afterPhotoUrl?: unknown };
    if (typeof afterPhotoUrl !== "string" || !afterPhotoUrl.startsWith("data:image/")) {
      return void res.status(400).json({ error: "afterPhotoUrl must be a data:image/ URL" });
    }
    // Limit to ~3.75 MB decoded (≈5 MB as base64 string)
    if (afterPhotoUrl.length > 5_000_000) {
      return void res.status(413).json({ error: "Image too large (max ~3.7 MB)" });
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });

    const existingKpData =
      order.kpData && typeof order.kpData === "object" ? (order.kpData as Record<string, unknown>) : {};
    const updatedKpData = { ...existingKpData, afterPhotoUrl };

    await db.update(ordersTable).set({ kpData: updatedKpData } as Record<string, unknown>).where(eq(ordersTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to save after photo", detail: msg });
  }
});

// PATCH /api/orders/:id/pdf — save the object path after a successful upload.
router.patch("/orders/:id/pdf", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (isNaN(id)) return void res.status(400).json({ error: "Invalid id" });

    const { objectPath, uploadToken } = req.body ?? {};
    if (!AttachOrderPdfBody.shape.objectPath.safeParse(objectPath).success) {
      return void res.status(400).json({ error: "Invalid objectPath" });
    }
    const parsed = AttachOrderPdfBody.safeParse(req.body);
    if (!parsed.success || !verifyOrderPdfGrant(uploadToken, id, objectPath)) {
      return void res.status(403).json({ error: "Invalid or expired upload permission" });
    }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return void res.status(404).json({ error: "Order not found" });
    if (order.pdfPath) return void res.status(409).json({ error: "PDF already saved" });
    const savedPath = await storage.finalizeOrderPdf(objectPath);

    const [updated] = await db
      .update(ordersTable)
      .set({ pdfPath: savedPath })
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.pdfPath)))
      .returning({ id: ordersTable.id });

    if (!updated) {
      const unusedFile = await storage.getObjectEntityFile(savedPath);
      await unusedFile.delete();
      return void res.status(409).json({ error: "PDF already saved or order removed" });
    }
    res.json(AttachOrderPdfResponse.parse({ ok: true }));
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return void res.status(422).json({ error: "Uploaded PDF not found" });
    }
    if (err instanceof InvalidOrderPdfError) {
      return void res.status(422).json({ error: err.message });
    }
    req.log.error({ err }, "Failed to save order PDF");
    res.status(500).json({ error: "Failed to save PDF" });
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
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
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
