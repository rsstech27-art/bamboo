import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, LogOut, Lock, ChevronRight, Package, ShoppingBag, Tag,
  Plus, Pencil, Trash2, RotateCcw, Image, Check, Loader2,
} from 'lucide-react';
import {
  DEFAULT_SERIES_PRICES,
  DEFAULT_MOLDING_PRICES,
  type PriceMap,
} from '../hooks/useManagerPrices';

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
const MANAGER_PASSWORD = import.meta.env.VITE_MANAGER_PASSWORD ?? 'allwall2024';
const SESSION_KEY = 'aw_manager_auth';

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
  createdAt: string;
}

interface Order {
  id: number;
  orderNumber: string;
  prefix: string;
  zoneLabel: string;
  kpData: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

function useFetch<T>(url: string, deps: unknown[] = []) {
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

  useEffect(() => { void load(); }, [load, ...deps]); // eslint-disable-line
  return { data, loading, error, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === MANAGER_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
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
          <button type="submit"
            className="w-full bg-black text-white font-bold text-sm py-3 rounded-xl hover:bg-gray-800 active:scale-95 transition-all shadow-md">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Цены
// ─────────────────────────────────────────────────────────────────────────────
function PriceRow({ label, defaultPrice, overridePrice, onChange }: {
  label: string; defaultPrice: number; overridePrice?: number; onChange: (v: number) => void;
}) {
  const effective = overridePrice ?? defaultPrice;
  const isModified = overridePrice !== undefined && overridePrice !== defaultPrice;
  const [text, setText] = useState(String(effective));

  useEffect(() => { setText(String(overridePrice ?? defaultPrice)); }, [overridePrice, defaultPrice]);

  const commit = () => {
    const v = parseInt(text.replace(/\s/g, ''), 10);
    if (!isNaN(v) && v > 0) { onChange(v); setText(String(v)); }
    else setText(String(effective));
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className={`flex-1 text-sm min-w-0 truncate ${isModified ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{label}</span>
      {isModified && <span className="text-xs text-gray-400 line-through shrink-0">{defaultPrice.toLocaleString('ru-RU')}</span>}
      <div className="flex items-center gap-1 shrink-0">
        <input type="text" inputMode="numeric" value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}
          className={`w-24 text-right text-sm px-2 py-1.5 rounded-lg border outline-none transition-colors
            ${isModified ? 'border-[#7ec662] bg-green-50 text-green-800 font-bold' : 'border-gray-200 bg-gray-50 focus:border-black focus:bg-white text-gray-700'}`}
        />
        <span className="text-xs text-gray-400">₽</span>
      </div>
    </div>
  );
}

function TabPrices({ panelOverrides, moldingOverrides, onUpdatePanel, onUpdateMolding, onReset }: {
  panelOverrides: PriceMap; moldingOverrides: PriceMap;
  onUpdatePanel: (id: string, p: number) => void;
  onUpdateMolding: (id: string, p: number) => void;
  onReset: () => void;
}) {
  const modified =
    Object.keys(panelOverrides).filter(k => panelOverrides[k] !== DEFAULT_SERIES_PRICES.find(s => s.id === k)?.defaultPrice).length +
    Object.keys(moldingOverrides).filter(k => moldingOverrides[k] !== DEFAULT_MOLDING_PRICES.find(s => s.id === k)?.defaultPrice).length;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6 px-4">
      {modified > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-green-700 font-medium">Изменено позиций: {modified} — сохранено в браузере</span>
          <button onClick={() => { if (confirm('Сбросить все цены?')) onReset(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-900 border border-green-300 rounded-lg px-3 py-1.5 transition-colors bg-white">
            <RotateCcw size={11} /> Сбросить
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ChevronRight size={13} className="text-gray-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Цены панелей (₽/панель)</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
          {DEFAULT_SERIES_PRICES.map(s => (
            <PriceRow key={s.id} label={s.name} defaultPrice={s.defaultPrice}
              overridePrice={panelOverrides[s.id]} onChange={p => onUpdatePanel(s.id, p)} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ChevronRight size={13} className="text-gray-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Цены профилей (₽/3 м)</h3>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
          {DEFAULT_MOLDING_PRICES.map(m => (
            <PriceRow key={m.id} label={m.name} defaultPrice={m.defaultPrice}
              overridePrice={moldingOverrides[m.id]} onChange={p => onUpdateMolding(m.id, p)} />
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center pb-4">
        Цены применяются при расчёте КП. Хранятся локально в браузере.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: База данных (Products)
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_PRODUCT = { name: '', article: '', collection: '', series: '', cost: 0, photoUrl: null as string | null };

function ProductForm({ initial, onSave, onCancel }: {
  initial: typeof EMPTY_PRODUCT;
  onSave: (data: typeof EMPTY_PRODUCT) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.article.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
      {/* Photo */}
      <div className="flex items-start gap-4">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-black transition-colors overflow-hidden bg-gray-50">
          {form.photoUrl
            ? <img src={form.photoUrl} className="w-full h-full object-cover" alt="" />
            : <Image size={20} className="text-gray-300" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <div className="flex-1 space-y-2.5">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Наименование *" required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
          <input value={form.article} onChange={e => setForm(f => ({ ...f, article: e.target.value }))}
            placeholder="Артикул *" required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
          <div className="flex gap-2">
            <input value={form.collection} onChange={e => setForm(f => ({ ...f, collection: e.target.value }))}
              placeholder="Коллекция"
              className="w-1/2 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
            <input value={form.series} onChange={e => setForm(f => ({ ...f, series: e.target.value }))}
              placeholder="Серия"
              className="w-1/2 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
          </div>
          <input value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: parseInt(e.target.value) || 0 }))}
            placeholder="Стоимость, ₽" type="number" min="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black transition-colors" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Сохранить
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
          Отмена
        </button>
      </div>
    </form>
  );
}

function ProductCard({ product, onEdit, onDelete }: {
  product: Product; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm hover:shadow transition-shadow">
      {product.photoUrl
        ? <img src={product.photoUrl} alt={product.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-100" />
        : <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
            <Package size={20} className="text-gray-300" />
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
        </div>
        <div className="text-sm font-bold text-[#7ec662] mt-1">{fmt(product.cost)}</div>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function TabProducts({ onPhotoChange }: { onPhotoChange?: () => void }) {
  const { data, loading, error, reload } = useFetch<Product[]>('/api/products');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const create = async (form: typeof EMPTY_PRODUCT) => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setCreating(false);
    await reload();
    if (form.photoUrl) onPhotoChange?.();
  };

  const update = async (id: number, form: typeof EMPTY_PRODUCT) => {
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditingId(null);
    await reload();
    if (form.photoUrl) onPhotoChange?.();
  };

  const del = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    await reload();
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
      {/* Add button */}
      {!creating && (
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-black text-gray-500 hover:text-black text-sm font-bold py-3.5 rounded-2xl transition-colors">
          <Plus size={16} /> Добавить товар
        </button>
      )}

      {/* Create form */}
      {creating && (
        <ProductForm
          initial={EMPTY_PRODUCT}
          onSave={create}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Загрузка…
        </div>
      )}
      {error && <div className="text-sm text-red-500 text-center py-8">Ошибка: {error}</div>}

      {/* List */}
      {!loading && data && data.length === 0 && !creating && (
        <div className="text-center py-16 text-gray-400">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Пока нет товаров — нажмите «Добавить товар»</p>
        </div>
      )}

      {data && data.map(p => (
        editingId === p.id ? (
          <ProductForm
            key={p.id}
            initial={{ name: p.name, article: p.article, collection: p.collection ?? '', series: p.series ?? '', cost: p.cost, photoUrl: p.photoUrl }}
            onSave={(f) => update(p.id, f)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ProductCard
            key={p.id}
            product={p}
            onEdit={() => { setEditingId(p.id); setCreating(false); }}
            onDelete={() => del(p.id)}
          />
        )
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

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg ${ZONE_COLORS[order.prefix] ?? 'bg-gray-100 text-gray-700'}`}>
          {order.orderNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">{order.zoneLabel}</div>
          <div className="text-xs text-gray-400 mt-0.5">{date}</div>
        </div>
        <div className="shrink-0 text-sm font-bold text-[#7ec662]">{fmt(total)}</div>
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

function TabOrders() {
  const { data, loading, error } = useFetch<Order[]>('/api/orders');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-3">
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
      {data && data.map(o => (
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
  { id: 'prices', label: 'Цены', icon: Tag },
  { id: 'products', label: 'Товары', icon: Package },
  { id: 'orders', label: 'Заказы клиентов', icon: ShoppingBag },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  panelOverrides: PriceMap;
  moldingOverrides: PriceMap;
  onUpdatePanel: (id: string, p: number) => void;
  onUpdateMolding: (id: string, p: number) => void;
  onReset: () => void;
  onClose: () => void;
  /** Called after any product photo save so the visualizer can reload textures */
  onPhotoChange?: () => void;
}

export function ManagerPanel({ panelOverrides, moldingOverrides, onUpdatePanel, onUpdateMolding, onReset, onClose, onPhotoChange }: Props) {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [tab, setTab] = useState<TabId>('prices');

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuth(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Full-screen panel */}
      <div className="fixed inset-0 z-[999] flex flex-col bg-[#f8f8f6] animate-[slideInUp_0.25s_ease]">
        {!isAuth ? (
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

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'prices' && (
                <TabPrices
                  panelOverrides={panelOverrides}
                  moldingOverrides={moldingOverrides}
                  onUpdatePanel={onUpdatePanel}
                  onUpdateMolding={onUpdateMolding}
                  onReset={onReset}
                />
              )}
              {tab === 'products' && <TabProducts onPhotoChange={onPhotoChange} />}
              {tab === 'orders'   && <TabOrders />}
            </div>
          </>
        )}
      </div>
    </>
  );
}
