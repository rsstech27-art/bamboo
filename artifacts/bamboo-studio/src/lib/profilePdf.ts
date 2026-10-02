import type { jsPDF } from 'jspdf';
import { KIND_NAMES, COLOR_NAMES, PURPOSE_NAMES, type QuoteGroup } from '@workspace/profile-system';

/** Raster text keeps Cyrillic readable without modifying the main proposal's font handling. */
export function appendProfileCutPages(pdf: jsPDF, groups: QuoteGroup[], orderNumber: string) {
  if (!groups.length) return;
  const canvas = document.createElement('canvas');
  canvas.width=1240;canvas.height=1754;
  const c = canvas.getContext('2d');
  if(!c) throw new Error('Не удалось создать страницы раскроя.');
  let y=0, page=0;
  const begin = () => {
    c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);
    c.fillStyle='#111';c.font='bold 36px sans-serif';
    c.fillText('Раскрой профилей',60,78);
    c.font='22px sans-serif';c.fillText(`КП ${orderNumber} · заготовки 3000 мм · лист ${++page}`,60,120);
    y=175;
  };
  const finish = () => {
    pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.92),'JPEG',0,0,210,297);
  };
  const line = (text: string, bold=false) => {
    c.font=`${bold?'bold ':''}24px sans-serif`;
    let row='';
    for(const word of text.split(' ')) {
      if(row && c.measureText(`${row} ${word}`).width>1100) {
        if(y>1650) {finish();begin();c.font=`${bold?'bold ':''}24px sans-serif`;}
        c.fillText(row,60,y);y+=34;row=word;
      } else row=row?`${row} ${word}`:word;
    }
    if(y>1650) {finish();begin();c.font=`${bold?'bold ':''}24px sans-serif`;}
    c.fillText(row,60,y);y+=34;
  };
  begin();
  for(const g of groups) {
    line(`${g.variant.article} · ${KIND_NAMES[g.variant.kind]} · ${COLOR_NAMES[g.variant.color]} · панели ${g.variant.thicknessMm} мм`,true);
    line(`${g.variant.name} · ${(g.totalLengthMm/1000).toFixed(2)} м · ${g.quantity} заготовок · ${g.variant.price} ₽/шт.`);
    const labels = new Map(g.runs.map((r,i)=>[r.id,`${i+1}`]));
    for(const r of g.runs) line(`Участок ${labels.get(r.id)}: ${(r.purposes??[r.purpose]).map(p=>PURPOSE_NAMES[p]).join(', ')}, ${r.hidden?'скрытая конструкция':`поверхность ${r.surface+1}`}, ${Math.round(r.lengthMm)} мм.`);
    g.bars.forEach((bar,i)=>line(`Заготовка ${i+1}: ${bar.pieces.map(p=>`${Math.round(p.lengthMm)} мм (участок ${labels.get(p.runId)}${p.startMm>0?', продолжение':''})`).join(' + ')}. Остаток ${Math.round(bar.remainingMm)} мм.`));
    y+=24;
  }
  line('Цельные участки имеют приоритет. Остатки используются только для совместимого варианта; произвольные дополнительные стыки не создаются.');
  finish();
}