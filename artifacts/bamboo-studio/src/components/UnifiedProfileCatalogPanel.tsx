import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Lock } from 'lucide-react';
import { COLOR_NAMES, KIND_NAMES, type Thickness, type Variant } from '@workspace/profile-system';

type Props = {
  catalog: Variant[];
  panelThicknesses: Record<string, Thickness>;
  panels: Array<{ article: string; name: string }>;
  legacyRates: Array<{ name: string; price: number }>;
  canEdit: boolean;
  pricesOnly?: boolean;
  onSaveCatalog: (rows: Variant[]) => Promise<void>;
  onSavePanelThicknesses: (map: Record<string, Thickness>) => Promise<void>;
};

type Draft = { name: string; article: string; price: string; confirmed: boolean };
type Choice = '' | '5' | '8';

const toDraft = (v: Variant): Draft => ({
  name: v.name,
  article: v.article,
  price: v.price === null ? '' : String(v.price),
  confirmed: v.confirmed,
});
const parsePrice = (s: string) => {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
};
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const inputCls =
  'mt-1 block w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-violet-500 disabled:bg-gray-50 disabled:text-gray-500';

export default function UnifiedProfileCatalogPanel({
  catalog, panelThicknesses, panels, legacyRates, canEdit, pricesOnly=false, onSaveCatalog, onSavePanelThicknesses,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [busyCat, setBusyCat] = useState(false);
  const [busyPan, setBusyPan] = useState(false);
  const [catMsg, setCatMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [panMsg, setPanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [catDirty, setCatDirty] = useState(false);
  const [panDirty, setPanDirty] = useState(false);

  useEffect(() => {
    if (catDirty) return;
    setDrafts(Object.fromEntries(catalog.map(v => [v.id, toDraft(v)])));
  }, [catalog, catDirty]);
  useEffect(() => {
    if (panDirty) return;
    setChoices(Object.fromEntries(panels.map(p => [p.article, (panelThicknesses[p.article] ? String(panelThicknesses[p.article]) : '') as Choice])));
  }, [panels, panelThicknesses, panDirty]);

  const rows = useMemo(
    () => [...catalog].sort((a, b) => a.thicknessMm - b.thicknessMm),
    [catalog],
  );
  const rowError = (v: Variant): string | null => {
    const d = drafts[v.id];
    if (!d) return null;
    if (!d.name.trim()) return 'Укажите название.';
    if (d.price.trim() !== '' && parsePrice(d.price) === null) return 'Цена должна быть больше 0.';
    if (d.confirmed && !d.article.trim()) return 'Для подтверждения нужен артикул.';
    if (d.confirmed && parsePrice(d.price) === null) return 'Для подтверждения нужна цена больше 0.';
    return null;
  };
  const invalidCount = rows.filter(v => rowError(v)).length;

  const update = (id: string, patch: Partial<Draft>) => {
    setCatDirty(true);
    setCatMsg(null);
    setDrafts(c => {
      const next = { ...c[id], ...patch };
      // Editing article or price drops confirmation: manager must re-confirm explicitly.
      if (!pricesOnly && ('article' in patch || 'price' in patch) && !('confirmed' in patch)) next.confirmed = false;
      return { ...c, [id]: next };
    });
  };

  const saveCatalog = async () => {
    if (invalidCount > 0) {
      setCatMsg({ ok: false, text: 'Исправьте ошибки в строках каталога.' });
      return;
    }
    setBusyCat(true);
    setCatMsg(null);
    try {
      await onSaveCatalog(catalog.map(v => {
        const d = drafts[v.id] ?? toDraft(v);
        return { ...v, name: d.name.trim(), article: d.article.trim(), price: parsePrice(d.price), confirmed: d.confirmed };
      }));
      setCatDirty(false);
      setCatMsg({ ok: true, text: 'Каталог профилей сохранён.' });
    } catch (e) {
      setCatMsg({ ok: false, text: errText(e) });
    } finally {
      setBusyCat(false);
    }
  };

  const savePanels = async () => {
    setBusyPan(true);
    setPanMsg(null);
    try {
      const map: Record<string, Thickness> = {};
      for (const [a, c] of Object.entries(choices)) if (c === '5' || c === '8') map[a] = Number(c) as Thickness;
      await onSavePanelThicknesses(map);
      setPanDirty(false);
      setPanMsg({ ok: true, text: 'Толщины панелей сохранены.' });
    } catch (e) {
      setPanMsg({ ok: false, text: errText(e) });
    } finally {
      setBusyPan(false);
    }
  };

  const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
    m ? (
      <div
        role={m.ok ? 'status' : 'alert'}
        className={`mt-3 rounded-xl border px-3 py-2 text-xs ${m.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}
      >
        {m.text}
      </div>
    ) : null;

  const unknownCount = panels.filter(p => !choices[p.article]).length;

  return (
    <section className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm" data-testid="panel-unified-profile-catalog">
      <h3 className="text-sm font-black text-gray-900">Единый каталог профилей</h3>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
        20 вариантов: 10 для панелей 5 мм и 10 для 8 мм, длина 3000 мм. Вид, цвет и толщина не меняются.
        Подсветка и торцевой профиль бывают только чёрными. Новые варианты не подтверждены, пока менеджер
        не подтвердит их вручную: цены и артикулы из старых данных автоматически не копируются.
      </p>
      {!canEdit && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-500">
          <Lock size={12} /> Просмотр. Для редактирования нужно право «{pricesOnly?'Цены':'Товары'} → Редактирование».
        </p>
      )}

      {legacyRates.length > 0 && (
        <details className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-bold text-gray-700">
            Старые расценки (только справка, {legacyRates.length})
          </summary>
          <p className="mt-1 text-[11px] text-gray-400">
            Это не соответствие вариантам. Переносите цену вручную, если уверены.
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {legacyRates.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex justify-between gap-2 text-[11px] text-gray-600">
                <span>{r.name}</span>
                <span className="font-semibold">{r.price.toLocaleString('ru-RU')} ₽</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 grid gap-2">
        {rows.map((v, i) => {
          const d = drafts[v.id] ?? toDraft(v);
          const err = rowError(v);
          const showHeader = i === 0 || rows[i - 1].thicknessMm !== v.thicknessMm;
          return (
            <div key={v.id}>
              {showHeader && (
                <div className="mb-1 mt-2 text-[11px] font-black uppercase tracking-wide text-violet-800">
                  Панели {v.thicknessMm} мм
                </div>
              )}
              <div
                data-testid={`row-variant-${v.id}`}
                className={`rounded-xl border bg-white p-3 ${err ? 'border-red-200' : 'border-gray-200'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black text-gray-800">
                    {KIND_NAMES[v.kind]}, {COLOR_NAMES[v.color]}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {v.thicknessMm} мм · {v.lengthMm} мм ·{' '}
                    <span className={d.confirmed ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                      {d.confirmed ? 'подтверждён' : 'не подтверждён'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Название
                    <input value={d.name} disabled={pricesOnly || !canEdit || busyCat} onChange={e => update(v.id, { name: e.target.value })} className={inputCls} />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Артикул
                    <input value={d.article} disabled={pricesOnly || !canEdit || busyCat} onChange={e => update(v.id, { article: e.target.value })} className={inputCls} />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Цена, ₽
                    <input inputMode="decimal" value={d.price} disabled={!canEdit || busyCat || (pricesOnly && !v.confirmed)} onChange={e => update(v.id, { price: e.target.value })} className={inputCls} />
                  </label>
                  <label className="inline-flex items-center gap-2 pb-2 text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={d.confirmed}
                      disabled={pricesOnly || !canEdit || busyCat}
                      onChange={e => update(v.id, { confirmed: e.target.checked })}
                      className="accent-violet-700"
                    />
                    Подтверждён
                  </label>
                </div>
                {err && <p role="alert" className="mt-1 text-[11px] text-red-600">{err}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Msg m={catMsg} />
      {canEdit && (
        <button
          type="button"
          onClick={() => void saveCatalog()}
          disabled={busyCat || !catDirty || invalidCount > 0}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyCat ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {busyCat ? 'Сохранение…' : pricesOnly ? 'Сохранить цены профилей' : 'Сохранить каталог'}
        </button>
      )}

      <div hidden={pricesOnly} className="mt-6 rounded-xl border border-gray-200 bg-white p-3">
        <h4 className="text-xs font-black text-gray-800">Толщина панелей по артикулу</h4>
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Уже выпущенные КП не изменяются. Панель с неизвестной толщиной блокирует создание новых КП.
            Прежние ручные цены сохраняются. Толщина не определяется по суффиксу артикула и не заменяет стоимость.
            {unknownCount > 0 && ` Не указана толщина: ${unknownCount}.`}
          </span>
        </div>
        {panels.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400">Панелей нет.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {panels.map(p => (
              <li key={p.article} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-gray-800">{p.name}</div>
                  <div className="text-[10px] text-gray-400">Артикул {p.article}</div>
                </div>
                <select
                  aria-label={`Толщина панели ${p.article}`}
                  value={choices[p.article] ?? ''}
                  disabled={!canEdit || busyPan}
                  onChange={e => { setPanDirty(true); setPanMsg(null); setChoices(c => ({ ...c, [p.article]: e.target.value as Choice })); }}
                  className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-violet-500 disabled:bg-gray-50"
                >
                  <option value="">Неизвестно</option>
                  <option value="5">5 мм</option>
                  <option value="8">8 мм</option>
                </select>
              </li>
            ))}
          </ul>
        )}
        <Msg m={panMsg} />
        {canEdit && (
          <button
            type="button"
            onClick={() => void savePanels()}
            disabled={busyPan || !panDirty}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyPan ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {busyPan ? 'Сохранение…' : 'Сохранить толщины'}
          </button>
        )}
      </div>
    </section>
  );
}
