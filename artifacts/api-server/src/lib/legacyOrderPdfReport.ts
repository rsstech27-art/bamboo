import { isExpiredOrderPdf } from "./orderPdfLifecycle";

export const LEGACY_UPLOAD_PATH = /^\/objects\/uploads\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export const REFERENCE_TABLES = ["orders", "products", "manager_settings"] as const;

export interface LegacyUploadInventory {
  objectPath: string;
  generation?: string;
  sizeBytes?: number;
  timeCreated?: string;
  updated?: string;
  contentType?: string;
  hasCustomMetadata: boolean;
}

export interface ReferenceSnapshot {
  environment: "development" | "production";
  capturedAt: string;
  complete: true;
  scannedTables: string[];
  objectPaths: string[];
}

// Only accept the small, sanitized projection from the documented read-only
// query. Do not import order/customer details, raw metadata or signed URLs.
export function parseReferenceSnapshots(value: unknown): ReferenceSnapshot[] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error("Both development and production reference snapshots are required");
  }
  const environments = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object"
      || !["development", "production"].includes(item.environment)
      || environments.has(item.environment) || item.complete !== true
      || typeof item.capturedAt !== "string" || !Number.isFinite(Date.parse(item.capturedAt))
      || !Array.isArray(item.scannedTables)
      || !REFERENCE_TABLES.every((table) => item.scannedTables.includes(table))
      || !Array.isArray(item.objectPaths)
      || !item.objectPaths.every((path: unknown) => typeof path === "string" && LEGACY_UPLOAD_PATH.test(path))) {
      throw new Error("Invalid or incomplete reference snapshot");
    }
    environments.add(item.environment);
  }
  return value.map((item) => ({
    environment: item.environment,
    capturedAt: item.capturedAt,
    complete: true,
    scannedTables: [...REFERENCE_TABLES],
    objectPaths: [...item.objectPaths],
  }));
}

export function buildLegacyOrderPdfReport(
  inventory: LegacyUploadInventory[],
  snapshots: ReferenceSnapshot[],
  now = Date.now(),
) {
  snapshots = parseReferenceSnapshots(snapshots);
  if (!Number.isFinite(now)) throw new Error("Invalid report time");
  // This is a point-in-time report, not a deletion authorization. Reject stale
  // or future snapshots instead of presenting incomplete coverage as safe.
  for (const snapshot of snapshots) {
    const age = now - Date.parse(snapshot.capturedAt);
    if (age < 0 || age > 60 * 60 * 1000) throw new Error("Reference snapshots must be less than one hour old");
  }
  const paths = new Set<string>();
  const objects = inventory.map((file) => {
    if (!LEGACY_UPLOAD_PATH.test(file.objectPath) || paths.has(file.objectPath)) {
      throw new Error("Inventory must contain unique legacy UUID upload paths only");
    }
    paths.add(file.objectPath);
    const referencedIn = snapshots.filter((s) => s.objectPaths.includes(file.objectPath))
      .map((s) => s.environment);
    const metadataComplete = Boolean(file.generation)
      && Number.isFinite(Date.parse(file.timeCreated ?? ""))
      && Number.isFinite(Date.parse(file.updated ?? ""));
    return {
      ...file,
      referencedIn,
      status: referencedIn.length ? "retain-referenced" : "retain-provenance-unverified",
      // Age and MIME are displayed only as inventory hints. Neither establishes
      // who issued an upload nor when its last write/attachment grant expired.
      metadataComplete,
      olderThanRetentionWindow: isExpiredOrderPdf(file, now),
      ownership: "unverified",
      permissionExpiry: "unverified",
      deletionEligible: false,
    };
  });
  const protectedPaths = new Set(snapshots.flatMap((s) => s.objectPaths));
  return {
    formatVersion: 1,
    mode: "read-only",
    generatedAt: new Date(now).toISOString(),
    referenceSnapshots: snapshots.map(({ objectPaths, ...snapshot }) => ({
      ...snapshot, referencedPathCount: new Set(objectPaths).size,
    })),
    evidenceSources: [
      { source: "live database references", finding: "Protection only; old attachment paths were client-supplied" },
      { source: "application request logs", finding: "No issued-path, source-generation or copy mapping was recorded" },
      { source: "catalog backup archives", finding: "Products/settings only; no orders or PDF provenance" },
      { source: "storage system metadata", finding: "Generation, timestamps and size; not feature ownership" },
      { source: "custom metadata, MIME, UUID, content hash", finding: "Not accepted as independent ownership evidence" },
    ],
    summary: {
      inventoried: objects.length,
      referenced: objects.filter((o) => o.referencedIn.length).length,
      unreferencedButUnverified: objects.filter((o) => !o.referencedIn.length).length,
      unverifiedBytesRetained: objects.filter((o) => !o.referencedIn.length)
        .reduce((sum, o) => sum + (o.sizeBytes ?? 0), 0),
      bytesInventoried: objects.reduce((sum, o) => sum + (o.sizeBytes ?? 0), 0),
      confirmedTemporaryPdfs: 0,
      deletionEligible: 0,
      deleted: 0,
    },
    missingReferencedPaths: [...protectedPaths].filter((path) => !paths.has(path)).sort(),
    confirmedCandidatePaths: [],
    deletionPerformed: false,
    warning: "No independent historical provenance or permission-expiry record was found. All shared uploads are retained. This report cannot authorize deletion.",
    objects,
  };
}

export type LegacyOrderPdfReport = ReturnType<typeof buildLegacyOrderPdfReport>;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function renderLegacyOrderPdfReport(report: LegacyOrderPdfReport): string {
  const s = report.summary;
  const rows = report.objects.map((o) => `<tr><td><code>${escapeHtml(o.objectPath)}</code></td>
    <td>${o.sizeBytes ?? "—"}</td><td>${escapeHtml(o.updated)}</td>
    <td>${escapeHtml(o.generation)}</td><td>${escapeHtml(o.contentType)}</td>
    <td>${escapeHtml(o.referencedIn.join(", ") || "Не найдены в снимках")}</td>
    <td>${o.referencedIn.length ? "Сохранить: есть ссылка" : "Сохранить: происхождение не подтверждено"}</td></tr>`).join("");
  return `<!doctype html><html lang="ru"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Предварительный отчёт о старых PDF</title><style>
    body{font:15px/1.5 system-ui,sans-serif;max-width:1450px;margin:32px auto;padding:0 24px;color:#20302a}
    h1{font-size:28px}h2{font-size:20px}.warning{padding:18px;border:1px solid #b3832f;background:#fff7e8}
    .stats{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}.stat{padding:12px;border:1px solid #ccd7d0}
    table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #ddd;text-align:left;padding:8px}
    code{overflow-wrap:anywhere}section{overflow:auto}li{margin:6px 0}@media print{body{margin:0;padding:8px}}
    </style><body><h1>Старые загрузки: предварительный отчёт</h1>
    <p>Снимок от ${escapeHtml(report.generatedAt)}. Режим: только чтение.</p>
    <div class="warning"><strong>Ничего не удалено. Подтверждённых кандидатов на удаление: 0.</strong>
    <p>Отсутствие ссылки не подтверждает принадлежность к заказам. MIME, имя, содержимое, совпадение хеша и возраст файла не считаются доказательством. Срок последнего разрешения также не подтверждён.</p></div>
    <div class="stats"><div class="stat">Объектов: <strong>${s.inventoried}</strong></div>
    <div class="stat">Есть ссылки: <strong>${s.referenced}</strong></div>
    <div class="stat">Без ссылок, но неизвестного происхождения: <strong>${s.unreferencedButUnverified}</strong></div>
    <div class="stat">Объём: <strong>${(s.bytesInventoried / 1024 / 1024).toFixed(2)} МБ</strong></div></div>
    <h2>Проверенные источники</h2><ul>
    <li>Все поля заказов, товаров и настроек менеджера проверены в development и production. Проверка включает вложенные JSON-строки и ссылки на uploads в URL.</li>
    <li>Старый PATCH сохранял переданный клиентом путь. Ссылка защищает объект, но не подтверждает его происхождение.</li>
    <li>Журналы не сохраняли путь выданной загрузки, её поколение и связь с итоговым PDF. Резервные копии каталога не содержат заказов и истории PDF.</li>
    <li>Системные метаданные хранилища показывают размер, поколение и даты. Пользовательские метаданные не подтверждают принадлежность.</li>
    </ul><p>Снимки: ${report.referenceSnapshots.map((r) => `${escapeHtml(r.environment)} — ${escapeHtml(r.capturedAt)}`).join("; ")}.</p>
    <p>Ссылок на файлы, отсутствующие в инвентаризации: ${report.missingReferencedPaths.length}.</p>
    <h2>Условия возможного удаления</h2><p>Нужны независимая серверная запись о выданном временном PDF с точным путём и поколением, подтверждённые сроки всех разрешений и явно согласованный список. Перед удалением обязательны свежая проверка всех ссылок в обоих окружениях, синхронизация с сохранением заказов и условное удаление того же поколения. Нельзя расширять автоматическую очистку общей папки uploads.</p>
    <h2>Инвентаризация</h2><section><table><thead><tr><th>Путь</th><th>Байт</th><th>Изменён</th>
    <th>Поколение</th><th>MIME (только справочно)</th><th>Ссылки</th><th>Решение</th></tr></thead><tbody>${rows}</tbody></table></section></body></html>`;
}