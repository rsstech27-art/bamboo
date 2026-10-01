import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { ObjectStorageService } from "./objectStorage";
import { logger } from "./logger";
import { ORDER_PDF_CLEANUP_INTERVAL_MS, ORDER_PDF_LOCK_ID } from "./orderPdfLifecycle";

export async function cleanupOrderPdfs(storage = new ObjectStorageService()): Promise<number> {
  let deleted = 0;
  for await (const file of storage.listOrderPdfCandidates()) {
    const path = storage.orderPdfObjectPath(file);
    try {
      const removed = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${ORDER_PDF_LOCK_ID})`);
        const [order] = await tx.select({ id: ordersTable.id }).from(ordersTable)
          .where(eq(ordersTable.pdfPath, path)).limit(1);
        // A DB error aborts this transaction before any deletion (fail closed).
        if (order) return false;
        return storage.deleteExpiredOrderPdf(file, Date.now());
      });
      if (removed) deleted++;
    } catch (err) {
      const code = (err as { code?: number }).code;
      // Another worker removed it or an active PUT changed its generation.
      if (code !== 404 && code !== 412) {
        logger.error({ err, objectPath: path }, "Order PDF cleanup failed");
        // Avoid hammering a failed DB/storage service on every listed object.
        throw err;
      }
    }
  }
  return deleted;
}

export function startOrderPdfCleanup(): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const deleted = await cleanupOrderPdfs();
      logger.info({ deleted }, "Order PDF cleanup finished");
    } catch (err) {
      logger.error({ err }, "Order PDF cleanup deferred until next run");
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), ORDER_PDF_CLEANUP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}