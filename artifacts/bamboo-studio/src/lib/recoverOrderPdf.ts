type SnapshotItem = { article: string; name: string; qty: number; price: number };
type SnapshotOrder = { orderNumber: string; createdAt: string; zoneLabel: string; kpData: Record<string, unknown> };

/** Recover the document from the stored quote, never from today's catalog or prices. */
export async function recoverOrderPdf(order: SnapshotOrder): Promise<Blob> {
  const { items, total } = order.kpData;
  if (!Array.isArray(items) || !items.length || typeof total !== 'number' || !Number.isFinite(total) ||
      !items.every(i => i && typeof i.name === 'string' && typeof i.qty === 'number' &&
        Number.isFinite(i.qty) && typeof i.price === 'number' && Number.isFinite(i.price))) {
    throw new Error('В заказе нет полного сохранённого расчёта. Прикрепите исходный PDF с устройства.');
  }
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const cv = document.createElement('canvas');
  cv.width = 1240;
  cv.height = 1754;
  const c = cv.getContext('2d');
  if (!c) throw new Error('Браузер не поддерживает формирование PDF.');
  const rub = (n: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n)} ₽`;
  let y = 0;
  let page = 0;
  const startPage = () => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#222222'; c.font = 'bold 40px Arial';
    c.fillText('ALL WALL', 60, 85);
    c.font = '24px Arial';
    c.fillText(`Коммерческое предложение № ${order.orderNumber}`, 60, 135);
    c.font = '20px Arial';
    c.fillText(`${order.zoneLabel} · ${new Date(order.createdAt).toLocaleDateString('ru-RU')}`, 60, 175);
    y = 220;
  };
  const finishPage = () => {
    c.fillStyle = '#666666'; c.font = '17px Arial';
    c.fillText('PDF восстановлен из сохранённого расчёта. Цены не пересчитывались.', 60, 1688);
    c.fillText(`Страница ${page + 1}`, 60, 1718);
    if (page++) pdf.addPage();
    pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
  };
  const lines = (text: string, width: number) => {
    const result: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      if (line && c.measureText(`${line} ${word}`).width > width) { result.push(line); line = ''; }
      // Also wrap long articles/names with no spaces.
      for (const char of `${line ? ' ' : ''}${word}`) {
        if (c.measureText(line + char).width > width && line) { result.push(line); line = ''; }
        line += char;
      }
    }
    if (line) result.push(line);
    return result;
  };
  startPage();
  for (const [key, label] of [['beforePhotoUrl', 'Исходное фото'], ['kpPhotoUrl', 'Визуализация']] as const) {
    const url = order.kpData[key];
    if (typeof url !== 'string' || !url) continue;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Не удалось загрузить сохранённое изображение «${label}». Можно прикрепить исходный PDF с устройства.`));
      img.src = url;
    });
    if (y + 280 > 1600) { finishPage(); startPage(); }
    c.fillStyle = '#555555'; c.font = '19px Arial'; c.fillText(label, 60, y);
    const scale = Math.min(1120 / image.width, 220 / image.height);
    c.drawImage(image, 60, y + 15, image.width * scale, image.height * scale);
    y += 270;
  }
  const heading = () => {
    c.fillStyle = '#222222'; c.font = 'bold 21px Arial';
    c.fillText('Артикул / Наименование', 60, y);
    c.fillText('Кол-во', 735, y); c.fillText('Цена', 855, y); c.fillText('Сумма', 1030, y);
    y += 38;
  };
  heading();
  for (const item of items as SnapshotItem[]) {
    c.font = '21px Arial';
    const wrapped = lines(`${item.article ?? ''}  ${item.name}`, 650);
    const height = Math.max(42, wrapped.length * 27 + 15);
    if (y + height > 1550) { finishPage(); startPage(); heading(); c.font = '21px Arial'; }
    c.fillStyle = '#222222';
    wrapped.forEach((line, i) => c.fillText(line, 60, y + i * 27));
    c.fillText(String(item.qty), 735, y, 105);
    c.fillText(rub(item.price), 855, y, 155);
    c.fillText(rub(item.qty * item.price), 1030, y, 150);
    y += height;
  }
  if (y + 100 > 1600) { finishPage(); startPage(); }
  c.font = 'bold 30px Arial'; c.fillStyle = '#222222';
  c.fillText(`Итого по сохранённому расчёту: ${rub(total)}`, 60, y + 45, 1120);
  finishPage();
  return pdf.output('blob');
}