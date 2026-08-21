import { useState, useEffect } from 'react';
import { X, LogOut, RotateCcw, Save, Lock, ChevronRight } from 'lucide-react';
import {
  DEFAULT_SERIES_PRICES,
  DEFAULT_MOLDING_PRICES,
  type PriceMap,
} from '../hooks/useManagerPrices';

const MANAGER_PASSWORD = import.meta.env.VITE_MANAGER_PASSWORD ?? 'allwall2024';
const SESSION_KEY = 'aw_manager_auth';

interface Props {
  panelOverrides: PriceMap;
  moldingOverrides: PriceMap;
  onUpdatePanel: (seriesId: string, price: number) => void;
  onUpdateMolding: (styleId: string, price: number) => void;
  onReset: () => void;
  onClose: () => void;
}

// ── Login screen ──────────────────────────────────────────────────────────────
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
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPw('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      <div className={`w-full max-w-xs transition-all ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        <div className="flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-6 mx-auto shadow-lg">
          <Lock size={24} className="text-white" />
        </div>
        <h2 className="text-center text-xl font-black text-gray-900 mb-1">Кабинет менеджера</h2>
        <p className="text-center text-xs text-gray-400 mb-8">Введите пароль для входа</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Пароль"
            autoFocus
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

// ── Price row ─────────────────────────────────────────────────────────────────
function PriceRow({
  label, defaultPrice, overridePrice, onChange,
}: {
  label: string;
  defaultPrice: number;
  overridePrice?: number;
  onChange: (price: number) => void;
}) {
  const effective = overridePrice ?? defaultPrice;
  const isModified = overridePrice !== undefined && overridePrice !== defaultPrice;
  const [text, setText] = useState(String(effective));

  // Sync if override changes externally (reset)
  useEffect(() => {
    setText(String(overridePrice ?? defaultPrice));
  }, [overridePrice, defaultPrice]);

  const commit = () => {
    const v = parseInt(text.replace(/\s/g, ''), 10);
    if (!isNaN(v) && v > 0) {
      onChange(v);
      setText(String(v));
    } else {
      setText(String(effective));
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className={`flex-1 text-xs min-w-0 truncate ${isModified ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      {isModified && (
        <span className="text-[10px] text-gray-400 line-through shrink-0">{defaultPrice.toLocaleString('ru-RU')}</span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          className={`w-20 text-right text-xs px-2 py-1.5 rounded-lg border outline-none transition-colors
            ${isModified ? 'border-[#7ec662] bg-green-50 text-green-800 font-bold' : 'border-gray-200 bg-gray-50 focus:border-black focus:bg-white text-gray-700'}`}
        />
        <span className="text-[10px] text-gray-400">₽</span>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
function PanelContent({ panelOverrides, moldingOverrides, onUpdatePanel, onUpdateMolding, onReset, onLogout }: {
  panelOverrides: PriceMap;
  moldingOverrides: PriceMap;
  onUpdatePanel: (id: string, price: number) => void;
  onUpdateMolding: (id: string, price: number) => void;
  onReset: () => void;
  onLogout: () => void;
}) {
  const modifiedCount =
    Object.keys(panelOverrides).filter(k => panelOverrides[k] !== DEFAULT_SERIES_PRICES.find(s => s.id === k)?.defaultPrice).length +
    Object.keys(moldingOverrides).filter(k => moldingOverrides[k] !== DEFAULT_MOLDING_PRICES.find(s => s.id === k)?.defaultPrice).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-black text-white shrink-0">
        <div>
          <div className="font-black text-sm tracking-wide">Кабинет менеджера</div>
          <div className="text-[10px] text-gray-400 mt-0.5">ALL WALL · Управление ценами</div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
          <LogOut size={13} /> Выйти
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* Status banner */}
        {modifiedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Save size={14} className="text-green-600 shrink-0" />
            <span className="text-xs text-green-700 font-medium">
              Изменено позиций: {modifiedCount} — цены сохранены в браузере
            </span>
          </div>
        )}

        {/* Panel series prices */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight size={12} className="text-gray-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Цены панелей (₽/панель)</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
            {DEFAULT_SERIES_PRICES.map(s => (
              <PriceRow
                key={s.id}
                label={s.name}
                defaultPrice={s.defaultPrice}
                overridePrice={panelOverrides[s.id]}
                onChange={price => onUpdatePanel(s.id, price)}
              />
            ))}
          </div>
        </section>

        {/* Molding prices */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight size={12} className="text-gray-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Цены профилей (₽/3 м)</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
            {DEFAULT_MOLDING_PRICES.map(m => (
              <PriceRow
                key={m.id}
                label={m.name}
                defaultPrice={m.defaultPrice}
                overridePrice={moldingOverrides[m.id]}
                onChange={price => onUpdateMolding(m.id, price)}
              />
            ))}
          </div>
        </section>

        <p className="text-[10px] text-gray-400 text-center pb-2">
          Цены сохраняются в этом браузере и применяются при расчёте КП.
        </p>
      </div>

      {/* Footer */}
      {modifiedCount > 0 && (
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => { if (confirm('Сбросить все цены к значениям по умолчанию?')) onReset(); }}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 text-xs font-bold py-2.5 rounded-xl hover:bg-white transition-all active:scale-95">
            <RotateCcw size={12} /> Сбросить к умолчаниям
          </button>
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export function ManagerPanel({ panelOverrides, moldingOverrides, onUpdatePanel, onUpdateMolding, onReset, onClose }: Props) {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuth(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[999] w-full max-w-sm bg-[#f8f8f6] shadow-2xl flex flex-col animate-[slideInRight_0.25s_ease]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-black shadow transition-all"
        >
          <X size={14} />
        </button>

        {isAuth
          ? <PanelContent
              panelOverrides={panelOverrides}
              moldingOverrides={moldingOverrides}
              onUpdatePanel={onUpdatePanel}
              onUpdateMolding={onUpdateMolding}
              onReset={onReset}
              onLogout={logout}
            />
          : <LoginScreen onSuccess={() => setIsAuth(true)} />
        }
      </div>
    </>
  );
}
