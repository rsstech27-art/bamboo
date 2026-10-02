import type { OrderPdfUpload } from '@workspace/api-client-react';

const API = `${(import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')}/api`;

async function check(response: Response, message: string) {
  if (!response.ok) throw new Error(`${message} (HTTP ${response.status}).`);
  return response;
}

/** Upload and attach only; never creates an order or opens the mobile PDF viewer. */
export async function uploadOrderPdf(id: number, blob: Blob, pdfToken?: string): Promise<void> {
  const grantResponse = await fetch(`${API}/orders/${id}/${pdfToken ? 'pdf-upload-url' : 'pdf-recovery-url'}`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pdfToken ? { pdfToken } : {}),
  });
  // The previous attachment may have committed even if its response was lost.
  if (grantResponse.status === 409) {
    const result = await grantResponse.json();
    if (result.error === 'PDF already saved') return;
  }
  await check(grantResponse, 'Не удалось получить разрешение на сохранение PDF');
  const grant = await grantResponse.json() as OrderPdfUpload;
  if (!grant.uploadURL || !grant.objectPath || !grant.uploadToken) throw new Error('Сервер не вернул разрешение на загрузку PDF.');
  await check(await fetch(grant.uploadURL, {
    method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: blob,
  }), 'Не удалось загрузить PDF в хранилище');
  const attached = await fetch(`${API}/orders/${id}/pdf`, {
    method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectPath: grant.objectPath, uploadToken: grant.uploadToken }),
  });
  if (attached.status === 409) {
    // Verify using the same capability, not merely a generic conflict response.
    const verified = await fetch(`${API}/orders/${id}/${pdfToken ? 'pdf-upload-url' : 'pdf-recovery-url'}`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfToken ? { pdfToken } : {}),
    });
    if (verified.status === 409 && (await verified.json()).error === 'PDF already saved') return;
  }
  await check(attached, 'Не удалось прикрепить PDF к заказу');
  if ((await attached.json()).ok !== true) throw new Error('Сервер не подтвердил сохранение PDF.');
}