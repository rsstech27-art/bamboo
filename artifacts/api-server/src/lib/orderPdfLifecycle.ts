// Shared by attachment writes and cleanup across all API instances.
export const ORDER_PDF_LOCK_ID = 7412052;
export const ORDER_PDF_UPLOAD_TTL_SEC = 15 * 60;
export const ORDER_PDF_GRANT_TTL_MS = 30 * 60 * 1000;
// Includes a large margin for clock skew, slow PUTs and in-flight requests.
export const ORDER_PDF_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ORDER_PDF_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export function isExpiredOrderPdf(
  metadata: { timeCreated?: string; updated?: string; generation?: string | number },
  now: number,
): boolean {
  const created = Date.parse(metadata.timeCreated ?? "");
  const updated = Date.parse(metadata.updated ?? "");
  return Boolean(metadata.generation) && Number.isFinite(created) && Number.isFinite(updated)
    && Math.max(created, updated) + ORDER_PDF_RETENTION_MS < now;
}