import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, LogOut, Lock, ChevronRight, Package, ShoppingBag, Tag,
  Plus, Pencil, Trash2, RotateCcw, Image, Check, Loader2,
} from 'lucide-react';
import {
  DEFAULT_SERIES_PRICES,
  DEFAULT_MOLDING_PRICES,
  getEffectiveSeriesName,
  getEffectiveMoldingName,
  type PriceMap,
  type SeriesNames,
  type SeriesDefinition,
} from '../hooks/useManagerPrices';
import { managerLogin, managerLogout, checkManagerSession, managerFetch } from '../lib/managerApi';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  article: string;
  collection: string | null;
  series: string | null;
  cost: number;
  photoUrl: string | null;
  scaleDown: boolean;
  noMetallicProfile: boolean;
  kpName: string | null;
  panelWidthMm: number | null;
  panelHeightMm: number | null;
  createdAt: string;
}

interface Order {
  id: number;
  orderNumber: string;
  prefix: string;
  zoneLabel: string;
  kpData: Record<string, unknown>;
  pdfPath: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json() as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    const ok = await managerLogin(pw);
    setLoading(false);
    if (ok) {
      onSuccess();
    } else {
      setError(true); setShake(true);
      setTimeout(() => setShake(false), 500);
      setPw('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#f8f8f6]">
      <div className={`w-full max-w-xs mx-auto ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        <div className="flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-6 mx-auto shadow-xl">
          <Lock size={28} className="text-white" />
        </div>
        <h2 className="text-center text-2xl font-black text-gray-900 mb-1">Кабинет менеджера</h2>
        <p className="text-center text-sm text-gray-400 mb-8">ALL WALL · Введите пароль</p>
        <form onSubmit={submit} className="space-y-3 px-4">
          <input
            type="password" value={pw} autoFocus
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Пароль"
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all
              ${error ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 focus:border-black bg-gray-50 focus:bg-white'}`}
          />
          {error && <p className="text-xs text-red-500 text-center">Неверный пароль</p>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold text-sm py-3 rounded-xl hover:bg-gray-800 active:scale-95 transition-all shadow-md disabled:opacity-60">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Проверка…</> : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Цены — price + editable series name per row
// ─────────────────────────────────────────────────────────────────────────────

/** Single row: editable name on the left, editable price on the right */
function SeriesRow({ seriesId, defaultName, defaultPrice, nameOverride, priceOverride, onNameChange, onPriceChange }: {
  seriesId: string;
  defaultName: string;
  defaultPrice: number;
  nameOverride?: string;
  priceOverride?: number;
  onNameChange: (v: string) => void;
  onPriceChange: (v: number) => void;
}) {
  const effectiveName  = nameOverride  ?? defaultName;
  const effectivePrice = priceOverride ?? defaultPrice;
  const nameModified  = nameOverride  !== undefined && nameOverride  !== defaultName;
  const priceModified = priceOverride !== undefined && priceOverride !== defaultPrice;

  const [nameText,  setNameText]  = useState(effectiveName);
  const [priceText, setPriceText] = useState(String(effectivePrice));

  useEffect(() => { setNameText(nameOverride ?? defaultName); },   [nameOverride,  defaultName]);
  useEffect(() => { setPriceText(String(priceOverride ?? defaultPrice)); }, [priceOverride, defaultPrice]);

  const commitName  = () => {
    const v = nameText.trim();
    onNameChange(v); // empty string → revert to default (handled in hook)
    if (!v) setNameText(defaultName);
  };
  const commitPrice = () => {
    const v = parseInt(priceText.replace(/\s/g, ''), 10);
    if (!isNaN(v) && v > 0) { onPriceChange(v); setPriceText(String(v)); }
    else setPriceText(String(effectivePrice));
  };

  const anyModified = nameModified || priceModified;

  return (
    <div className={`flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0 ${anyModified ? 'bg-green-50/50 -mx-4 px-4 rounded-lg' : ''}`}>
      {/* Editable name */}
      <input
        value={nameText}
        onChange={e => setNameText(e.target.value)}
        onBlur={commitName}
        onKeyDown={e => e.key === 'Enter' && commitName()}
        title="Нажмите для редактирования названия"
        className={`flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none transition-colors min-w-0
          ${nameModified
            ? 'border-[#7ec662] bg-green-50 text-green-800 font-semibold'
            : 'border-transparent bg-transparent hover:border-gray-200 focus:border-black focus:bg-white text-gray-700'
          }`}
      />
      {/* Default name hint when modified */}
      {nameModified && (
        <span className="text-xs text-gray-400 line-through shrink-0 hidden sm:block">{defaultName}</span>
      )}
      {/* Default price hint when modified */}
      {priceModified && (
        <span className="text-xs text-gray-400 line-through shrink-0">{defaultPrice.toLocaleString('ru-RU')}</span>
      )}
      {/* Editable price */}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text" inputMode="numeric" value={priceText}
          onChange={e => setPriceText(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={e => e.key === 'Enter' && commitPrice()}
          className={`w-24 text-right text-sm px-2 py-1.5 rounded-lg border outline-none transition-colors
            ${priceModified
              ? 'border-[#7ec662] bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-gray-50 focus:border-black focus:bg-white text-gray-700'
            }`}
        />
        <span className="text-xs text-gray-400">₽</span>
      </div>
    </div>
  );
}

/** Reusable editable-name + editable-price row (used for both series and moldings) */
function EditableRow({ defaultName, defaultPrice, nameOverride, priceOverride, onNameChange, onPriceChange, unitLabel = '₽' }: {
  defaultName: string;
  defaultPrice: number;
  nameOverride?: string;
  priceOverride?: number;
  onNameChange: (v: string) => void;
  onPriceChange: (v: number) => void;
  unitLabel?: string;
}) {
  const effectiveName  = nameOverride  ?? defaultName;
  const effectivePrice = priceOverride ?? defaultPrice;
  const nameModified  = nameOverride  !== undefined && nameOverride  !== defaultName;
  const priceModified = priceOverride !== undefined && priceOverride !== defaultPrice;

  const [nameText,  setNameText]  = useState(effectiveName);
  const [priceText, setPriceText] = useState(String(effectivePrice));

  useEffect(() => { setNameText(nameOverride ?? defaultName); },              [nameOverride,  defaultName]);
  useEffect(() => { setPriceText(String(priceOverride ?? defaultPrice)); },   [priceOverride, defaultPrice]);

  const commitName = () => {
    const v = nameText.trim();
    onNameChange(v);
    if (!v) setNameText(defaultName);
  };
  const commitPrice = () => {
    const v = parseInt(priceText.replace(/\s/g, ''), 10);
    if (!isNaN(v) && v > 0) { onPriceChange(v); setPriceText(String(v)); }
    else setPriceText(String(effectivePrice));
  };

  const anyModified = nameModified || priceModified;

  return (
    <div className={`flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0 ${anyModified ? 'bg-green-50/50 -mx-4 px-4 rounded-lg' : ''}`}>
      {/* Editable name */}
      <input
        value={nameText}
        onChange={e => setNameText(e.target.value)}
        onBlur={commitName}
        onKeyDown={e => e.key === 'Enter' && commitName()}
        title="Нажмите для редактирования названия"
        className={`flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none transition-colors min-w-0
          ${nameModified
            ? 'border-[#7ec662] bg-green-50 text-green-800 font-semibold'
            : 'border-transparent bg-transparent hover:border-gray-200 focus:border-black focus:bg-white text-gray-700'
          }`}
      />
      {nameModified && (
        <span className="text-xs text-gray-400 line-through shrink-0 hidden sm:block">{defaultName}</span>
      )}
      {priceModified && (
        <span className="text-xs text-gray-400 line-through shrink-0">{defaultPrice.toLocaleString('ru-RU')}</span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text" inputMode="numeric" value={priceText}
          onChange={e => setPriceText(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={e => e.key === 'Enter' && commitPrice()}
          className={`w-24 text-right text-sm px-2 py-1.5 rounded-lg border outline-none transition-colors
            ${priceModified
              ? 'border-[#7ec662] bg-green-50 text-green-800 font-bold'
              : 'border-gray-200 bg-gray-50 focus:border-black focus:bg-white text-gray-700'
            }`}
        />
        <span className="text-xs text-gray-400">{unitLabel}</span>
      </div>
    </div>
  );
}

function AddSeriesForm({ onAdd }: {
  onAdd: (name: string, price: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      onAdd(name, Number(price));
      setName('');
      setPrice('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить серию');
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-black text-gray-500 hover:text-black text-sm font-bold py-3 rounded-xl transition-colors">
        <Plus size={15} /> Добавить серию
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-gray-900">Новая серия</span>
        <button type="button" onClick={() => { setOpen(false); setError(null); }}
          className="text-gray-400 hover:text-black"><X size={15} /></button>
      </div>
      <div className="grid grid-cols-[1fr_130px] gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Название</label>
          <input value={name} onChange={e => setName(e.target.value)} autoFocus
            placeholder="Название серии"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Цена, ₽/панель</label>
          <input value={price} onChange={e => setPrice(e.target.value)}
            type="number" min="1" placeholder="5000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black" />
        </div>
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-lg hover:bg-gray-800">
        <Check size={14} /> Добавить
      </button>
    </form>
  );
}

function TabPrices({ panelOverrides, moldingOverrides, seriesNameOverrides, moldingNameOverrides, customSeries, onUpdatePanel, onUpdateMolding, onUpdateSeriesName, onUpdateMoldingName, onAddSeries, onReset }: {
  panelOverrides: PriceMap;
  moldingOverrides: PriceMap;
  seriesNameOverrides: SeriesNames;
  moldingNameOverrides: SeriesNames;
  customSeries: SeriesDefinition[];
  onUpdatePanel: (id: string, p: number) => void;
  onUpdateMolding: (id: string, p: number) => void;
  onUpdateSeriesName: (id: string, name: string) => void;
  onUpdateMoldingName: (id: string, name: string) => void;
  onAddSeries: (name: string, price: number) => void;
  onReset: () => void;
}) {
  const modifiedPrices =
    Object.keys(panelOverrides).filter(k => panelOverrides[k] !== DEFAULT_SERIES_PRICES.find(s => s.id === k)?.defaultPrice).length +
    Object.keys(moldingOverrides).filter(k => moldingOverrides[k] !== DEFAULT_MOLDING_PRICES.find(m => m.id === k)?.defaultPrice).length;
  const modifiedNames = Object.keys(seriesNameOverrides).length + Object.keys(moldingNameOverrides).length;
  const totalModified = modifiedPrices + modifiedNames;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6 px-4">
      {totalModified > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-green-700 font-medium">Изменено: {totalModified} — сохранено</span>
          <button onClick={() => { if (confirm('Сбросить все цены и названия?')) onReset(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-900 border border-green-300 rounded-lg px-3 py-1.5 transition-colors bg-white">
            <RotateCcw size={11} /> Сбросить всё
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChevronRight size={13} className="text-gray-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Серии панелей</h3>
          </div>
          <span className="text-[10px] text-gray-400">Название · Цена (₽/панель)</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
          {DEFAULT_SERIES_PRICES.map(s => (
            <EditableRow
              key={s.id}
              defaultName={s.name}
              defaultPrice={s.defaultPrice}
              nameOverride={seriesNameOverrides[s.id]}
              priceOverride={panelOverrides[s.id]}
              onNameChange={name => onUpdateSeriesName(s.id, name)}
              onPriceChange={price => onUpdatePanel(s.id, price)}
            />
          ))}
          {customSeries.map(s => (
            <div key={s.id} className="flex items-center gap-2 py-2.5 border-t border-gray-100">
              <span className="flex-1 text-sm px-2 py-1.5 text-gray-700 font-semibold min-w-0 truncate">{s.name}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#5a9d43] bg-green-50 rounded-md px-2 py-1">Добавлена</span>
              <span className="text-sm font-bold text-gray-700">{s.price.toLocaleString('ru-RU')} ₽</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <AddSeriesForm onAdd={onAddSeries} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ChevronRight size={13} className="text-gray-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Профили</h3>
          </div>
          <span className="text-[10px] text-gray-400">Название · Цена (₽/3 м)</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
          {DEFAULT_MOLDING_PRICES.map(m => (
            <EditableRow
              key={m.id}
              defaultName={m.name}
              defaultPrice={m.defaultPrice}
              nameOverride={moldingNameOverrides[m.id]}
              priceOverride={moldingOverrides[m.id]}
              onNameChange={name => onUpdateMoldingName(m.id, name)}
              onPriceChange={price => onUpdateMolding(m.id, price)}
            />
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center pb-4">
        Клик по любому названию — редактировать. Очистите поле чтобы вернуть оригинал.
        Изменения сохраняются и доступны менеджерам после обновления страницы.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Товары (Products)
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = { name: '', article: '', collection: '', series: '', cost: 0, photoUrl: null as string | null, scaleDown: false, noMetallicProfile: true, kpName: '', panelWidthMm: null as number | null, panelHeightMm: null as number | null };

// ── Shared product form fields (used inside modal and inline create) ──────────
const COLLECTION_OPTIONS = ['All Wall', 'Legend'] as const;

function ProductFormFields({ form, setForm, seriesOptions, fileRef }: {
  form: typeof EMPTY_PRODUCT;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_PRODUCT>>;
  seriesOptions: Array<{ name: string; price: number }>;
  fileRef: React.RefObject<HTMLInputElement | null>;
})
 {
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSeriesChange = (name: string) => {
    const matched = seriesOptions.find(s => s.name === name);
    setForm(f => ({
      ...f,
      series: name,
      // Auto-fill cost from series price only when cost is still zero or
      // the current cost exactly matches some other series price (i.e. was
      // previously auto-filled and hasn't been manually overridden).
      cost: matched
        ? matched.price
        : f.cost,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Photo row */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-black transition-colors overflow-hidden bg-gray-50">
            {form.photoUrl
              ? <img src={form.photoUrl} className="w-full h-full object-cover" alt="" />
              : <div className="flex flex-col items-center gap-1 text-gray-300">
                  <Image size={22} />
                  <span className="text-[10px]">Фото</span>
                </div>}
          </button>
          {form.photoUrl && (
            <button type="button"
              onClick={() => setForm(f => ({ ...f, photoUrl: null }))}
              title="Удалить фото"
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors">
              <X size={10} />
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <div className="flex-1 text-xs text-gray-400 leading-relaxed">
          Нажмите на квадрат чтобы выбрать фото.<br />
          {form.photoUrl ? 'Крестик удаляет фото.' : 'JPG, PNG или WebP.'}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Наименование *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Дуб натуральный" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Артикул *</label>
            <input value={form.article} onChange={e => setForm(f => ({ ...f, article: e.target.value }))}
              placeholder="W-331" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-black transition-colors" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Серия</label>
            <select value={form.series} onChange={e => handleSeriesChange(e.target.value)}
              className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors bg-white
                ${form.series ? 'text-gray-900' : 'text-gray-400'}`}>
              <option value="">— не выбрана —</option>
              {seriesOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Коллекция</label>
            <select value={form.collection} onChange={e => setForm(f => ({ ...f, collection: e.target.value }))}
              className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors bg-white
                ${form.collection ? 'text-gray-900' : 'text-gray-400'}`}>
              <option value="">— не выбрана —</option>
              {COLLECTION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Стоимость, ₽
            {form.series && (
              <span className="ml-1 normal-case font-normal text-gray-400">(из серии — можно изменить)</span>
            )}
          </label>
          <input value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: parseInt(e.target.value) || 0 }))}
            placeholder="5 200" type="number" min="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
        </div>

        {/* Scale down checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.scaleDown}
            onChange={e => setForm(f => ({ ...f, scaleDown: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
          />
          <span className="text-sm text-gray-700">
            Уменьшить масштаб текстуры в визуализаторе
          </span>
        </label>

        {/* Metallic profile checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.noMetallicProfile}
            onChange={e => setForm(f => ({ ...f, noMetallicProfile: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
          />
          <span className="text-sm text-gray-700">
            Использовать металлический профиль на стыках
          </span>
        </label>

        {/* Дополнительно — необязательные поля для КП */}
        <ExtraFields form={form} setForm={setForm} />
      </div>
    </div>
  );
}

function ExtraFields({ form, setForm }: {
  form: typeof EMPTY_PRODUCT;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_PRODUCT>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100 pt-3">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors w-full text-left">
        <ChevronRight size={12} className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
        <span className="font-semibold uppercase tracking-wide">Дополнительно для КП</span>
        {(form.kpName || form.panelWidthMm || form.panelHeightMm) && (
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Название в КП
            </label>
            <input
              value={form.kpName}
              onChange={e => setForm(f => ({ ...f, kpName: e.target.value }))}
              placeholder="Как отображать в коммерческом предложении"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors"
            />
            <p className="text-[10px] text-gray-400 mt-1">Оставьте пустым — будет использоваться «Наименование»</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Ширина панели, мм
              </label>
              <input
                type="number"
                min="1"
                value={form.panelWidthMm ?? ''}
                onChange={e => setForm(f => ({ ...f, panelWidthMm: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="1220"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Высота панели, мм
              </label>
              <input
                type="number"
                min="1"
                value={form.panelHeightMm ?? ''}
                onChange={e => setForm(f => ({ ...f, panelHeightMm: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="2800"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Размеры влияют на количество панелей в расчёте КП.<br />
            По умолчанию: 1220 × 2800 мм.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Inline create form (shown above list) ─────────────────────────────────────
function ProductCreateForm({ seriesOptions, onSave, onCancel }: {
  seriesOptions: Array<{ name: string; price: number }>;
  onSave: (data: typeof EMPTY_PRODUCT) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.article.trim()) return;
    setSaving(true); setSaveError(null);
    try { await onSave(form); }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-black text-gray-900">Новый товар</span>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={16} /></button>
      </div>
      <ProductFormFields form={form} setForm={setForm} seriesOptions={seriesOptions} fileRef={fileRef} />
      {saveError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Сохранить
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
          Отмена
        </button>
      </div>
    </form>
  );
}

// ── Edit modal (renders as fixed overlay) ─────────────────────────────────────
function EditProductModal({ product, seriesOptions, onSave, onClose }: {
  product: Product;
  seriesOptions: Array<{ name: string; price: number }>;
  onSave: (data: typeof EMPTY_PRODUCT) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_PRODUCT>({
    name: product.name,
    article: product.article,
    collection: product.collection ?? '',
    series: product.series ?? '',
    cost: product.cost,
    photoUrl: product.photoUrl,
    scaleDown: product.scaleDown ?? false,
    noMetallicProfile: product.noMetallicProfile ?? true,
    kpName: product.kpName ?? '',
    panelWidthMm: product.panelWidthMm ?? null,
    panelHeightMm: product.panelHeightMm ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.article.trim()) return;
    setSaving(true); setSaveError(null);
    try { await onSave(form); onClose(); }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-[1101] flex items-center justify-center p-4 pointer-events-none">
        <form onSubmit={submit}
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-5 animate-[slideInUp_0.2s_ease]"
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-gray-900">Редактирование товара</div>
              <div className="text-xs text-gray-400 mt-0.5 font-mono">{product.article}</div>
            </div>
            <button type="button" onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <X size={15} />
            </button>
          </div>

          <ProductFormFields form={form} setForm={setForm} seriesOptions={seriesOptions} fileRef={fileRef} />

          {saveError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Сохранить изменения
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ProductCard({ product, onEdit, onDelete }: {
  product: Product; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow transition-shadow group">
      {product.photoUrl
        ? <img src={product.photoUrl} alt={product.name}
            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100" />
        : <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
            <Package size={18} className="text-gray-300" />
          </div>}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-gray-900 truncate">{product.name}</div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className="text-xs font-mono text-gray-400">{product.article}</span>
          {product.collection && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{product.collection}</span>
          )}
          {product.series && (
            <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-md">{product.series}</span>
          )}
          {(product.panelWidthMm || product.panelHeightMm) && (
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-mono">
              {product.panelWidthMm ?? 1220}×{product.panelHeightMm ?? 2800} мм
            </span>
          )}
          {product.kpName && (
            <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-md max-w-[100px] truncate" title={product.kpName}>
              КП: {product.kpName}
            </span>
          )}
        </div>
        <div className="text-xs font-bold text-[#7ec662] mt-0.5">{fmt(product.cost)}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-black hover:text-black hover:bg-gray-50 transition-colors">
          <Pencil size={12} /> Изменить
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

const CATALOG_SIZE = 115;

function TabProducts({ seriesOptions, onPhotoChange }: {
  seriesOptions: Array<{ name: string; price: number }>;
  onPhotoChange?: () => void;
}) {
  const { data, loading, error, reload } = useFetch<Product[]>('/api/products');
  const [creating, setCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  const apiErrorText = async (r: Response) => {
    try { return ((await r.json()) as { error?: string }).error ?? `HTTP ${r.status}`; }
    catch { return `HTTP ${r.status}`; }
  };

  const create = async (form: typeof EMPTY_PRODUCT) => {
    const r = await managerFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error(await apiErrorText(r));
    setCreating(false);
    await reload();
    onPhotoChange?.();
  };

  const update = async (id: number, form: typeof EMPTY_PRODUCT) => {
    const r = await managerFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) throw new Error(await apiErrorText(r));
    setEditingProduct(null);
    await reload();
    onPhotoChange?.();
  };

  const del = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    const r = await managerFetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!r.ok) { alert(`Ошибка удаления: ${await apiErrorText(r)}`); return; }
    await reload();
    onPhotoChange?.();
  };

  const seedCatalog = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const r = await managerFetch('/api/products/seed-catalog', { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json() as { inserted: number; skipped: number };
      setSeedResult(result);
      await reload();
      if (result.inserted > 0) onPhotoChange?.();
    } catch {
      setSeedResult({ inserted: 0, skipped: -1 });
    } finally {
      setSeeding(false);
    }
  };

  const currentCount = data?.length ?? 0;
  const alreadyFull = currentCount >= CATALOG_SIZE;

  // Уникальные серии из загруженных товаров (сохраняем порядок появления)
  const availableSeries = data
    ? Array.from(new Set(data.map(p => p.series).filter((s): s is string => !!s)))
    : [];

  // Товары после фильтрации
  const visibleProducts = data
    ? (seriesFilter ? data.filter(p => p.series === seriesFilter) : data)
    : [];

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">

      {/* ── Edit modal ── */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          seriesOptions={seriesOptions}
          onSave={(f) => update(editingProduct.id, f)}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* ── Seed banner ── */}
      <div className={`rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 transition-colors
        ${alreadyFull ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-800">Каталог ALL WALL</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Загрузка…'
              : alreadyFull
                ? `${currentCount} из ${CATALOG_SIZE} позиций загружено`
                : `${currentCount} из ${CATALOG_SIZE} — заполните одним нажатием`}
          </div>
          {seedResult && seedResult.skipped !== -1 && (
            <div className="text-xs text-green-600 font-medium mt-1">
              {seedResult.inserted > 0
                ? `✓ Добавлено ${seedResult.inserted} новых, пропущено ${seedResult.skipped}`
                : `Все ${seedResult.skipped} позиций уже есть`}
            </div>
          )}
          {seedResult && seedResult.skipped === -1 && (
            <div className="text-xs text-red-500 mt-1">Ошибка при загрузке</div>
          )}
        </div>
        <button onClick={seedCatalog} disabled={seeding}
          className={`shrink-0 flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60
            ${alreadyFull
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
              : 'bg-black text-white hover:bg-gray-800 shadow-sm'}`}>
          {seeding
            ? <><Loader2 size={13} className="animate-spin" /> Загрузка…</>
            : alreadyFull
              ? <><RotateCcw size={13} /> Обновить</>
              : <><Package size={13} /> Загрузить каталог</>}
        </button>
      </div>

      {/* ── Add manually ── */}
      {!creating ? (
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-black text-gray-500 hover:text-black text-sm font-bold py-3.5 rounded-2xl transition-colors">
          <Plus size={16} /> Добавить товар вручную
        </button>
      ) : (
        <ProductCreateForm
          seriesOptions={seriesOptions}
          onSave={create}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Загрузка…
        </div>
      )}
      {error && <div className="text-sm text-red-500 text-center py-8">Ошибка: {error}</div>}

      {!loading && data && data.length === 0 && !creating && (
        <div className="text-center py-8 text-gray-400">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нажмите «Загрузить каталог» или добавьте товар вручную</p>
        </div>
      )}

      {/* ── Фильтр по сериям ── */}
      {!loading && availableSeries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeriesFilter(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              seriesFilter === null
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-800'
            }`}>
            Все
          </button>
          {availableSeries.map(s => (
            <button
              key={s}
              onClick={() => setSeriesFilter(seriesFilter === s ? null : s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                seriesFilter === s
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-800'
              }`}>
              {s}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                seriesFilter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {data!.filter(p => p.series === s).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Список товаров ── */}
      {visibleProducts.length === 0 && !loading && seriesFilter && (
        <div className="text-center py-8 text-gray-400 text-sm">
          В серии «{seriesFilter}» нет товаров
        </div>
      )}

      {visibleProducts.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onEdit={() => { setEditingProduct(p); setCreating(false); }}
          onDelete={() => del(p.id)}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Заказы клиентов
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_COLORS: Record<string, string> = {
  'С':  'bg-blue-100 text-blue-700',
  'СВ': 'bg-indigo-100 text-indigo-700',
  'ОП': 'bg-cyan-100 text-cyan-700',
  'ДП': 'bg-orange-100 text-orange-700',
  'ТВ': 'bg-purple-100 text-purple-700',
  'К':  'bg-emerald-100 text-emerald-700',
};

interface KPItem { article: string; name: string; qty: number; price: number; }

function OrderCard({ order, expanded, onToggle }: {
  order: Order; expanded: boolean; onToggle: () => void;
}) {
  const items = (order.kpData.items as KPItem[] | undefined) ?? [];
  const total = (order.kpData.total as number | undefined) ?? 0;
  const date = new Date(order.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const pdfUrl = order.pdfPath ? `/api/orders/${order.id}/pdf` : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
        <span className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg ${ZONE_COLORS[order.prefix] ?? 'bg-gray-100 text-gray-700'}`}>
          {order.orderNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">{order.zoneLabel}</div>
          <div className="text-xs text-gray-400 mt-0.5">{date}</div>
        </div>
        <div className="shrink-0 text-sm font-bold text-[#7ec662]">{fmt(total)}</div>
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            title="Открыть PDF"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </a>
        )}
        <ChevronRight size={14} className={`shrink-0 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && items.length > 0 && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="pb-2 font-medium">Наименование</th>
                <th className="pb-2 font-medium text-center w-12">Кол.</th>
                <th className="pb-2 font-medium text-right w-24">Цена</th>
                <th className="pb-2 font-medium text-right w-24">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 text-gray-700">{it.name}</td>
                  <td className="py-1.5 text-center text-gray-500">{it.qty}</td>
                  <td className="py-1.5 text-right text-gray-500">{it.price.toLocaleString('ru-RU')}</td>
                  <td className="py-1.5 text-right font-medium text-gray-700">{(it.qty * it.price).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Итого</td>
                <td className="pt-3 text-right text-sm font-black text-gray-900">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

type SortKey = 'date_desc' | 'date_asc' | 'sum_desc' | 'sum_asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc',  label: 'Сначала старые' },
  { value: 'sum_desc',  label: 'По сумме ↓' },
  { value: 'sum_asc',   label: 'По сумме ↑' },
];

function TabOrders() {
  const { data, loading, error } = useFetch<Order[]>('/api/orders');
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [search, setSearch]             = useState('');
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [sort, setSort]                 = useState<SortKey>('date_desc');

  // Collect all distinct prefixes present in loaded data
  const prefixes: string[] = data
    ? [...new Set(data.map(o => o.prefix))].sort()
    : [];

  // Filter + sort
  const visible = (data ?? [])
    .filter(o => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q);
      const matchPrefix = !activePrefix || o.prefix === activePrefix;
      return matchSearch && matchPrefix;
    })
    .sort((a, b) => {
      if (sort === 'date_asc')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const sumA = (a.kpData.total as number | undefined) ?? 0;
      const sumB = (b.kpData.total as number | undefined) ?? 0;
      if (sort === 'sum_asc')  return sumA - sumB;
      return sumB - sumA;
    });

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-3">

      {/* ── Controls ── */}
      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="space-y-2.5 pb-1">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Поиск по номеру КП…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-black transition-colors bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Prefix filter chips + sort */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* "All" chip */}
            <button
              onClick={() => setActivePrefix(null)}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors border
                ${activePrefix === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              Все
            </button>
            {prefixes.map(p => (
              <button key={p}
                onClick={() => setActivePrefix(prev => prev === p ? null : p)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors border
                  ${activePrefix === p
                    ? ZONE_COLORS[p] ?? 'bg-gray-800 text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {p}
              </button>
            ))}

            {/* Sort — pushed to right */}
            <div className="ml-auto">
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="text-xs text-gray-600 border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white outline-none focus:border-black transition-colors cursor-pointer">
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Загрузка…
        </div>
      )}
      {error && <div className="text-sm text-red-500 text-center py-8">Ошибка: {error}</div>}
      {!loading && data && data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">КП пока не создавались</p>
          <p className="text-xs mt-1 opacity-60">Заказы появятся здесь после нажатия «Рассчитать КП»</p>
        </div>
      )}
      {!loading && data && data.length > 0 && visible.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Ничего не найдено</p>
          <button onClick={() => { setSearch(''); setActivePrefix(null); }}
            className="mt-2 text-xs underline hover:text-gray-600 transition-colors">
            Сбросить фильтры
          </button>
        </div>
      )}
      {visible.map(o => (
        <OrderCard key={o.id} order={o}
          expanded={expandedId === o.id}
          onToggle={() => setExpandedId(prev => prev === o.id ? null : o.id)} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'prices',   label: 'Цены',             icon: Tag },
  { id: 'products', label: 'Товары',            icon: Package },
  { id: 'orders',   label: 'Заказы клиентов',   icon: ShoppingBag },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  panelOverrides: PriceMap;
  moldingOverrides: PriceMap;
  seriesNameOverrides: SeriesNames;
  moldingNameOverrides: SeriesNames;
  customSeries: SeriesDefinition[];
  seriesDefinitions: SeriesDefinition[];
  onUpdatePanel: (id: string, p: number) => void;
  onUpdateMolding: (id: string, p: number) => void;
  onUpdateSeriesName: (id: string, name: string) => void;
  onUpdateMoldingName: (id: string, name: string) => void;
  onAddSeries: (name: string, price: number) => void;
  onReset: () => void;
  onClose: () => void;
  onPhotoChange?: () => void;
}

export function ManagerPanel({
  panelOverrides, moldingOverrides, seriesNameOverrides, moldingNameOverrides,
  customSeries, seriesDefinitions,
  onUpdatePanel, onUpdateMolding, onUpdateSeriesName, onUpdateMoldingName,
  onAddSeries, onReset, onClose, onPhotoChange,
}: Props) {
  const [isAuth, setIsAuth] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [tab, setTab] = useState<TabId>('prices');

  // On mount, check whether the browser already has a valid server session
  useEffect(() => {
    void checkManagerSession().then(ok => {
      setIsAuth(ok);
      setSessionChecked(true);
    });
  }, []);

  // Computed list of effective series names + prices for dropdown
  const seriesOptions: Array<{ name: string; price: number }> = seriesDefinitions.map(s => ({
    name: s.name,
    price: s.price,
  }));

  const logout = async () => {
    await managerLogout();
    setIsAuth(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[999] flex flex-col bg-[#f8f8f6] animate-[slideInUp_0.25s_ease]">
        {!sessionChecked ? (
          /* Waiting for session check — show minimal spinner */
          <div className="flex items-center justify-center h-full gap-2 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !isAuth ? (
          <>
            <button onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow text-gray-500 hover:text-black transition-colors">
              <X size={15} />
            </button>
            <LoginScreen onSuccess={() => setIsAuth(true)} />
          </>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 bg-black text-white">
              <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-black text-base tracking-wide">ALL WALL</div>
                  <div className="h-4 w-px bg-white/20" />
                  <div className="text-sm text-gray-400">Кабинет менеджера</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={logout}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
                    <LogOut size={13} /> Выйти
                  </button>
                  <button onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
                {TABS.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                        tab === t.id
                          ? 'border-[#7ec662] text-white'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}>
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'prices' && (
                <TabPrices
                  panelOverrides={panelOverrides}
                  moldingOverrides={moldingOverrides}
                  seriesNameOverrides={seriesNameOverrides}
                  moldingNameOverrides={moldingNameOverrides}
                  customSeries={customSeries}
                  onUpdatePanel={onUpdatePanel}
                  onUpdateMolding={onUpdateMolding}
                  onUpdateSeriesName={onUpdateSeriesName}
                  onUpdateMoldingName={onUpdateMoldingName}
                  onAddSeries={onAddSeries}
                  onReset={onReset}
                />
              )}
              {tab === 'products' && (
                <TabProducts
                  seriesOptions={seriesOptions}
                  onPhotoChange={onPhotoChange}
                />
              )}
              {tab === 'orders' && <TabOrders />}
            </div>
          </>
        )}
      </div>
    </>
  );
}
