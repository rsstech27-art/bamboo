import { createHmac, timingSafeEqual } from "node:crypto";
import { ORDER_PDF_GRANT_TTL_MS } from "./orderPdfLifecycle";

type Grant = { orderId: number; expiresAt: number; objectPath?: string };

function signature(payload: string): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return createHmac("sha256", secret).update(`order-pdf:${payload}`).digest();
}

export function issueOrderPdfGrant(orderId: number, objectPath?: string): string {
  const payload = Buffer.from(JSON.stringify({
    orderId, expiresAt: Date.now() + ORDER_PDF_GRANT_TTL_MS, ...(objectPath && { objectPath }),
  })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyOrderPdfGrant(token: unknown, orderId: number, objectPath?: string): boolean {
  if (typeof token !== "string" || token.length > 2048) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const expected = signature(parts[0]);
    const received = Buffer.from(parts[1], "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const grant = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as Grant;
    return grant.orderId === orderId && Number.isFinite(grant.expiresAt)
      && grant.expiresAt > Date.now() && grant.objectPath === objectPath;
  } catch {
    return false;
  }
}