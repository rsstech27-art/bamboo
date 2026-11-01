import express, { Router, type IRouter } from "express";
import {
  LOCAL_UPLOAD_MAX_BYTES,
  LOCAL_UPLOAD_ROUTE,
  isLocalStorageEnabled,
  saveLocalUpload,
  verifyLocalUpload,
} from "../lib/localObjectStorage";

// Receives file bytes when running on our own server (STORAGE_DRIVER=local).
// The one-time signed URL is issued by the order PDF upload grant routes.
const router: IRouter = Router();

router.put(
  LOCAL_UPLOAD_ROUTE,
  express.raw({ type: () => true, limit: LOCAL_UPLOAD_MAX_BYTES }),
  async (req, res) => {
    if (!isLocalStorageEnabled()) return void res.status(404).json({ error: "Not found" });
    const name = verifyLocalUpload(req.query.name, req.query.expires, req.query.signature);
    if (!name) return void res.status(403).json({ error: "Upload link is invalid or expired" });
    if (!Buffer.isBuffer(req.body) || req.body.length < 1) {
      return void res.status(400).json({ error: "Upload body is empty" });
    }
    try {
      const result = await saveLocalUpload(name, req.body, req.get("content-type"));
      if (result === "exists") return void res.status(409).json({ error: "This upload link was already used" });
      res.status(200).end();
    } catch (err) {
      req.log?.error({ err }, "Local upload failed");
      res.status(503).json({ error: "Upload could not be stored" });
    }
  },
);

export default router;
