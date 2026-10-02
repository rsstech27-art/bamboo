import assert from 'node:assert/strict';
import { uploadOrderPdf } from './orderPdf.ts';

const originalFetch = globalThis.fetch;
const grant = { uploadURL: 'https://upload.example.test/pdf', objectPath: '/objects/uploads/order-pdfs/test', uploadToken: 'test-grant' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const calls: Array<{ url: string; method: string }> = [];
let responses: Response[] = [];
globalThis.fetch = (async (url, init) => {
  calls.push({ url: String(url), method: init?.method ?? 'GET' });
  const result = responses.shift();
  assert.ok(result, 'Unexpected extra request');
  return result;
}) as typeof fetch;
try {
  responses = [json(grant), new Response('', { status: 200 }), json({ ok: true })];
  await uploadOrderPdf(41, new Blob(['%PDF-test']), 'creation-grant');
  assert.deepEqual(calls.map(c => c.method), ['POST', 'PUT', 'PATCH']);
  assert.equal(calls[0].url, '/api/orders/41/pdf-upload-url');
  assert.equal(calls[2].url, '/api/orders/41/pdf');

  calls.length = 0;
  responses = [json(grant), new Response('', { status: 503 })];
  await assert.rejects(uploadOrderPdf(41, new Blob(['%PDF-test']), 'creation-grant'), /503/);
  responses = [json(grant), new Response('', { status: 200 }), json({ ok: true })];
  await uploadOrderPdf(41, new Blob(['%PDF-test']), 'creation-grant');
  assert.ok(calls.every(c => c.url !== '/api/orders'), 'PDF retry must never create another order');

  calls.length = 0;
  responses = [json({ error: 'PDF already saved' }, 409)];
  await uploadOrderPdf(41, new Blob(['%PDF-test']), 'creation-grant');
  assert.equal(calls.length, 1, 'An already attached PDF must not be replaced');

  calls.length = 0;
  responses = [json(grant), new Response('', { status: 200 }), json({ ok: true })];
  await uploadOrderPdf(41, new Blob(['%PDF-test']));
  assert.equal(calls[0].url, '/api/orders/41/pdf-recovery-url');

  responses = [json(grant), new Response('', { status: 200 }), json({ ok: false })];
  await assert.rejects(uploadOrderPdf(41, new Blob(['%PDF-test'])), /не подтвердил/);
  console.log('PDF upload ordering, retry, recovery, and confirmation tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}