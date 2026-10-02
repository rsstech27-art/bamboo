import { KIND_NAMES, COLOR_NAMES, PURPOSE_NAMES, variantStyle, packInstalledRuns,
  type Thickness, type Variant, type Decoration, type InstalledRun } from '@workspace/profile-system';

interface Props {
  thickness: Thickness | null; onThickness: (v: Thickness) => void;
  catalog: Variant[]; error: string | null; runs: InstalledRun[];
  decorations: Decoration[]; surface: number;
  decorMode: boolean; decorStarted: boolean; decorStyle: string;
  onDecorMode: (v: boolean) => void; onDecorStyle: (v: string) => void;
  onDelete: (id: string) => void;
  widthMm: number; heightMm: number; onWidth: (n:number)=>void; onHeight: (n:number)=>void;
}
export default function ProjectProfilesPanel(p: Props) {
  const available = p.catalog.filter(v=>v.thicknessMm === p.thickness);
  const ids = [...new Set(p.runs.map(r=>r.variantId))];
  return <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
    <h3 className="text-xs font-black uppercase tracking-wide">Единая система профилей</h3>
    <fieldset><legend className="text-xs mb-1">Толщина панелей всего проекта</legend>
      <div className="flex gap-2">{([5,8] as Thickness[]).map(v=>
        <button key={v} type="button" aria-pressed={p.thickness === v} onClick={()=>p.onThickness(v)}
          className={`flex-1 rounded-lg p-2 text-xs font-bold ${p.thickness===v?'bg-black text-white':'bg-gray-100'}`}>{v} мм</button>)}</div>
    </fieldset>
    <p className="text-[11px] text-gray-500">Одна толщина на проект. Торцы — чёрные. Стыки, торцы и подсветка учитываются по реальным размерам всех поверхностей.</p>
    <fieldset className="grid grid-cols-2 gap-2"><legend className="text-xs mb-1">Поверхность {p.surface+1} · реальные размеры, мм</legend>
      <label className="text-xs">Ширина<input type="number" min="1" step="1" value={p.widthMm || ''} onChange={e=>p.onWidth(Math.max(0,Number(e.target.value)))}
        className="w-full border rounded-lg p-2 mt-1" /></label>
      <label className="text-xs">Высота<input type="number" min="1" step="1" value={p.heightMm || ''} onChange={e=>p.onHeight(Math.max(0,Number(e.target.value)))}
        className="w-full border rounded-lg p-2 mt-1" /></label>
    </fieldset>
    {p.error && <p role="alert" className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">{p.error}</p>}
    <details>
      <summary className="cursor-pointer text-xs font-bold">Декоративные участки</summary>
      <div className="space-y-2 pt-2">
        <label className="block text-xs">Вид профиля
          <select value={p.decorStyle} onChange={e=>p.onDecorStyle(e.target.value)}
            className="block w-full border rounded-lg p-2 mt-1" disabled={!p.thickness}>
            {available.map(v=><option key={v.id} value={variantStyle(v.id)}>{KIND_NAMES[v.kind]} · {COLOR_NAMES[v.color]}{!v.confirmed?' · цена не подтверждена':''}</option>)}
          </select>
        </label>
        <button type="button" disabled={!p.thickness}
          className="rounded-lg bg-gray-100 p-2 text-xs font-bold w-full"
          onClick={()=>p.onDecorMode(!p.decorMode)}>{p.decorMode?'Отменить добавление':'Добавить двумя точками'}</button>
        {p.decorMode && <p role="status" className="text-xs text-blue-700">{p.decorStarted?'Выберите конечную точку':'Выберите начальную точку'} на активной поверхности фотографии.</p>}
        {p.decorations.filter(d=>d.surface===p.surface).map((d,i)=><div key={d.id} className="flex justify-between text-xs gap-2">
          <span>Участок {i+1} · {d.style}</span><button type="button" onClick={()=>p.onDelete(d.id)} className="text-red-700">Удалить</button>
        </div>)}
      </div>
    </details>
    <details><summary className="cursor-pointer text-xs font-bold">Участки и раскрой · весь проект</summary>
      <div className="space-y-2 mt-2">
        {ids.length===0 && <p className="text-xs text-gray-500">Нет участков. Задайте толщину, размеры и нужные стороны.</p>}
        {ids.map(id=>{
          const v = p.catalog.find(v=>v.id===id);
          const runs = p.runs.filter(r=>r.variantId===id), bars = packInstalledRuns(runs);
          return <div key={id} className="border rounded-lg p-2 text-xs space-y-1">
            <p className="font-bold">{v?.name ?? id}</p>
            <p>{[...new Set(runs.map(r=>PURPOSE_NAMES[r.purpose]))].join(', ')} · {(runs.reduce((n,r)=>n+r.lengthMm,0)/1000).toFixed(2)} м · {bars.length} заготовок × 3 м</p>
            {!v?.confirmed && <p className="text-amber-800">КП заблокировано: подтвердите артикул и цену.</p>}
            {runs.map(r=><p key={r.id} className="text-gray-500">{r.hidden?'Скрытый участок':`Поверхность ${r.surface+1}`} · {PURPOSE_NAMES[r.purpose]} · {Math.round(r.lengthMm)} мм</p>)}
            {bars.map((b,i)=><p key={i}>Заготовка {i+1}: {b.pieces.map(p=>Math.round(p.lengthMm)).join(' + ')} мм; остаток {Math.round(b.remainingMm)} мм</p>)}
          </div>;
        })}
      </div>
    </details>
  </section>;
}