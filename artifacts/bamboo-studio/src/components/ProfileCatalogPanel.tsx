import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Download, Loader2, Pencil, RefreshCw, X } from 'lucide-react';
import { useImportOfficialProfileCatalog, useUpdateProfileCatalog } from '@workspace/api-client-react';
import {
  PROFILE_CATALOG_UPDATED_EVENT,
  PROFILE_COLORS,
  PROFILE_COLOR_LABELS,
  PROFILE_KIND_DETAILS,
  PROFILE_KIND_ORDER,
  type ProfileCatalogRecord,
  type ProfileColor,
  type ProfileKind,
} from '../lib/profileCatalog';
import { useProfileCatalog } from '../hooks/useProfileCatalog';

type PriceItem = { id: string; label: string; price: number };
type ProfilePricing = Partial<Record<ProfileKind, PriceItem[]>>;

const fmtPrice = (n: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n)} ₽`;

function EditProfileModal({ kind, record, items, canEditMeta, canEditPrices, onSavePrices, onSaveMeta, onClose }: {
  kind: ProfileKind;
  record: ProfileCatalogRecord | undefined;
  items: PriceItem[];
  canEditMeta: boolean;
  canEditPrices: boolean;
  onSavePrices: (changed: Array<{ id: string; price: number }>) => Promise<void>;
  onSaveMeta: (data: ProfileDraft) => Promise<void>;
  onClose: () => void;
}) {
  const details = PROFILE_KIND_DETAILS[kind];
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    article: record?.article ?? '',
    name: record?.name ?? '',
    colors: record ? [...record.colors] : [],
  }));
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [metaNotice, setMetaNotice] = useState<string | null>(null);
  const savingRef = useRef(false);
  const priceEditsRef = useRef<Record<string, string>>({});
  priceEditsRef.current = priceEdits;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const formRef = useRef<HTMLFormElement>(null);

  const tryClose = () => { if (!savingRef.current) closeRef.current(); };

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const enabledControls = () => Array.from(formRef.current?.querySelectorAll<HTMLElement>(
      'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    ) ?? []);
    enabledControls()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); tryClose(); }
      if (e.key !== 'Tab') return;
      const controls = enabledControls();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { e.preventDefault(); return; }
      const inside = formRef.current?.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const submitMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || !canEditMeta) return;
    const colors = draft.colors.filter(c => details.colors.includes(c));
    if (!draft.article.trim() || !draft.name.trim() || colors.length === 0) {
      setMetaError('Укажите артикул, название и хотя бы один доступный цвет.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMetaError(null);
    setMetaNotice(null);
    try {
      await onSaveMeta({ article: draft.article.trim(), name: draft.name.trim(), colors });
      const dirtyPrices = itemsRef.current.some(i => {
        const raw = priceEditsRef.current[i.id];
        return raw !== undefined && Number(raw.replace(',', '.')) !== i.price;
      });
      if (dirtyPrices) {
        setMetaNotice('Данные профиля сохранены. Цены ещё не сохранены — нажмите «Сохранить цены» или «Отмена», чтобы отказаться от них.');
      } else {
        savingRef.current = false;
        closeRef.current();
      }
    } catch (cause) {
      setMetaError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const changedPrices = () => {
    const changed: Array<{ id: string; price: number }> = [];
    for (const item of items) {
      const raw = priceEdits[item.id];
      if (raw === undefined) continue;
      const value = Number(raw.replace(',', '.'));
      if (raw.trim() === '' || !Number.isFinite(value) || value <= 0) return { error: `Цена «${item.label}» должна быть положительным числом.`, changed: [] };
      if (value !== item.price) changed.push({ id: item.id, price: value });
    }
    return { error: null, changed };
  };

  const submitPrices = async () => {
    if (savingRef.current || !canEditPrices) return;
    const { error, changed } = changedPrices();
    setPriceSuccess(false);
    if (error) { setPriceError(error); return; }
    if (changed.length === 0) { setPriceError('Нет изменённых цен.'); return; }
    savingRef.current = true;
    setPriceSaving(true);
    setPriceError(null);
    try {
      await onSavePrices(changed);
      setPriceEdits({});
      setPriceSuccess(true);
    } catch (cause) {
      setPriceError(cause instanceof Error ? cause.message : 'Не удалось сохранить цены. Повторите попытку.');
    } finally {
      savingRef.current = false;
      setPriceSaving(false);
    }
  };

  const busy = saving || priceSaving;
  const metaDisabled = !canEditMeta || busy;
  const inputCls = 'mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm" onClick={tryClose} />
      <div className="fixed inset-0 z-[1101] flex items-center justify-center p-4 pointer-events-none">
        <form ref={formRef} role="dialog" aria-modal="true" aria-labelledby={`title-profile-editor-${kind}`}
          noValidate onSubmit={e => void submitMeta(e)} data-testid={`modal-edit-official-profile-${kind}`}
          className="pointer-events-auto w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain bg-white rounded-2xl shadow-2xl p-6 space-y-5 animate-[slideInUp_0.2s_ease]"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div id={`title-profile-editor-${kind}`} className="text-base font-black text-gray-900">Редактирование профиля</div>
              <div className="text-xs text-gray-400 mt-0.5">{details.label}</div>
            </div>
            <button type="button" onClick={tryClose} disabled={busy} aria-label="Закрыть" data-testid={`button-close-official-profile-${kind}`}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors disabled:opacity-50">
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Артикул
              <input value={draft.article} disabled={metaDisabled}
                onChange={e => setDraft(d => ({ ...d, article: e.target.value }))}
                data-testid={`input-profile-article-${kind}`} className={inputCls} />
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Название в КП
              <input value={draft.name} disabled={metaDisabled}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                data-testid={`input-profile-name-${kind}`} className={inputCls} />
            </label>
            <fieldset>
              <legend className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Доступные цвета</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PROFILE_COLORS.filter(c => details.colors.includes(c)).map((color: ProfileColor) => {
                  const checked = draft.colors.includes(color);
                  return (
                    <label key={color} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${checked ? 'border-black bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-500'}`}>
                      <input type="checkbox" checked={checked} disabled={metaDisabled}
                        onChange={() => setDraft(d => ({ ...d, colors: checked ? d.colors.filter(i => i !== color) : [...d.colors, color] }))}
                        data-testid={`checkbox-profile-color-${kind}-${color}`} className="accent-black" />
                      {PROFILE_COLOR_LABELS[color]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Длина: 3 м · Толщина панелей: 5 / 8 мм (не редактируется)
            </div>
          </div>

          {metaError && <div role="alert" data-testid={`status-profile-meta-error-${kind}`} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{metaError}</div>}
          {metaNotice && <div role="status" data-testid={`status-profile-meta-notice-${kind}`} className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{metaNotice}</div>}
          {canEditMeta && (
            <div className="flex gap-2">
              <button type="submit" disabled={busy} data-testid={`button-save-official-profile-${kind}`}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {saving ? 'Сохранение…' : 'Сохранить данные профиля'}
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3 border-t border-gray-100 pt-4" data-testid={`section-profile-prices-${kind}`}>
              <div>
                <div className="text-sm font-black text-gray-900">Цены вариантов</div>
                <p className="text-[11px] text-gray-400 mt-0.5">{canEditPrices ? 'Сохраняются отдельно от данных профиля, кнопкой ниже.' : 'Только просмотр: нужны права на цены.'}</p>
              </div>
              <div className="grid gap-2">
                {items.map(item => (
                  <label key={item.id} className="flex items-center justify-between gap-3 text-xs font-semibold text-gray-700">
                    <span className="min-w-0 truncate">{item.label}</span>
                    <input type="number" inputMode="decimal" min="0" step="any" disabled={!canEditPrices || busy}
                      value={priceEdits[item.id] ?? String(item.price)}
                      onChange={e => { setPriceEdits(p => ({ ...p, [item.id]: e.target.value })); setPriceError(null); setPriceSuccess(false); }}
                      data-testid={`input-profile-price-${item.id}`}
                      className="w-28 shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-right text-sm outline-none focus:border-black" />
                  </label>
                ))}
              </div>
              {priceError && <div role="alert" data-testid="status-profile-price-validation" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{priceError}</div>}
              {priceSaving && <div role="status" className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={12} className="animate-spin" /> Сохранение цен…</div>}
              {priceSuccess && <div role="status" data-testid="status-profile-price-saved" className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">Цены сохранены.</div>}
              {canEditPrices && (
                <button type="button" onClick={() => void submitPrices()} disabled={busy} data-testid={`button-save-profile-prices-${kind}`}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 text-sm font-bold text-gray-800 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {priceSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Сохранить цены
                </button>
              )}
            </div>
          )}

          <button type="button" onClick={tryClose} disabled={busy} data-testid={`button-cancel-official-profile-${kind}`}
            className="w-full px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            {canEditMeta || canEditPrices ? 'Отмена' : 'Закрыть'}
          </button>
        </form>
      </div>
    </>,
    document.body,
  );
}

type ProfileDraft = { article: string; name: string; colors: ProfileColor[] };

export function ProfileCatalogPanel({ canEdit, pricing, onSavePrices, canEditPrices = false }: {
  canEdit: boolean;
  pricing?: ProfilePricing;
  onSavePrices?: (edits: Array<{ id: string; price: number }>) => Promise<void>;
  canEditPrices?: boolean;
}) {
  const { records, loading, error, reload } = useProfileCatalog();
  const updateCatalog = useUpdateProfileCatalog({ request: { credentials: 'include' } });
  const importCatalog = useImportOfficialProfileCatalog({ request: { credentials: 'include' } });
  const [editingKind, setEditingKind] = useState<ProfileKind | null>(null);
  const [savingKind, setSavingKind] = useState<ProfileKind | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const pricesAllowed = canEditPrices && Boolean(onSavePrices);
  const catalogReady = Boolean(records) && !error;

  const saveMeta = async (kind: ProfileKind, data: ProfileDraft) => {
    setSavingKind(kind);
    setSaveSuccess(null);
    try {
      await updateCatalog.mutateAsync({ kind, data });
      setSaveSuccess(`Сохранён тип «${PROFILE_KIND_DETAILS[kind].typeLabel}».`);
      window.dispatchEvent(new Event(PROFILE_CATALOG_UPDATED_EVENT));
    } finally {
      setSavingKind(null);
    }
  };

  const importOfficial = async () => {
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const result = await importCatalog.mutateAsync();
      const inserted = result.imported;
      setImportSuccess(
        typeof inserted === 'number'
          ? `Добавлено отсутствующих записей: ${inserted}.`
          : 'Импорт завершён. Существующие данные не заменялись.',
      );
      window.dispatchEvent(new Event(PROFILE_CATALOG_UPDATED_EVENT));
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setImporting(false);
    }
  };

  const recordsByKind = new Map((records ?? []).map(record => [record.kind, record]));
  const canOpen = canEdit || pricesAllowed || PROFILE_KIND_ORDER.some(k => (pricing?.[k] ?? []).length > 0);

  return (
    <section className="mb-6 w-full min-w-0 max-w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-gray-900">Артикулы соединительных профилей для КП</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
            Артикулы и названия, которые попадают в коммерческое предложение. Длина — 3 м; толщина панелей — 5 и 8 мм.
            Изменение артикулов не меняет цены.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void importOfficial()}
            disabled={importing}
            data-testid="button-import-official-profiles"
            className="inline-flex max-w-full items-center gap-2 whitespace-normal rounded-xl border border-gray-200 px-3 py-2 text-left text-xs font-bold text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {importing ? 'Импорт…' : 'Добавить недостающие артикулы (существующие не меняются)'}
          </button>
        )}
      </div>

      {loading && (
        <div role="status" data-testid="status-profile-catalog-loading" className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" /> Загрузка артикулов…
        </div>
      )}
      {error && (
        <div role="alert" data-testid="status-profile-catalog-error" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>Ошибка каталога: {error}</span>
          <button type="button" onClick={() => void reload()} data-testid="button-reload-profile-catalog" className="inline-flex items-center gap-1 font-bold underline">
            <RefreshCw size={12} /> Повторить
          </button>
        </div>
      )}
      {saveSuccess && <div role="status" data-testid="status-profile-catalog-saved" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saveSuccess}</div>}
      {importError && <div role="alert" data-testid="status-profile-catalog-import-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{importError}</div>}
      {importSuccess && <div role="status" data-testid="status-profile-catalog-imported" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{importSuccess}</div>}

      <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-3">
        {PROFILE_KIND_ORDER.map(kind => {
          const details = PROFILE_KIND_DETAILS[kind];
          const record = recordsByKind.get(kind);
          const busy = savingKind === kind;
          return (
            <div key={kind} data-testid={`card-official-profile-${kind}`} className="w-full min-w-0 max-w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 truncate">{record?.name ?? details.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {record ? `Артикул ${record.article}` : records ? 'Запись отсутствует' : 'Каталог ещё не загружен'}
                  {' · '}3 м · 5 / 8 мм
                </div>
                {record && (
                  <div className="text-[11px] text-gray-400 mt-0.5">{record.colors.map(c => PROFILE_COLOR_LABELS[c]).join(', ')}</div>
                )}
                {(pricing?.[kind] ?? []).length > 0 && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {(pricing?.[kind] ?? []).map(p => `${p.label}: ${fmtPrice(p.price)}`).join(' · ')}
                  </div>
                )}
              </div>
              {canOpen && (
                <button type="button" onClick={() => setEditingKind(kind)} disabled={!catalogReady || busy || savingKind !== null}
                  data-testid={`button-edit-official-profile-${kind}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-black hover:text-black hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />} {busy ? 'Сохранение…' : 'Изменить'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!canEdit && <p className="mt-3 text-[10px] text-gray-400">Для редактирования артикулов требуется право «Товары → Редактирование».</p>}

      {editingKind && (
        <EditProfileModal
          key={editingKind}
          kind={editingKind}
          record={recordsByKind.get(editingKind)}
          items={pricing?.[editingKind] ?? []}
          canEditMeta={canEdit}
          canEditPrices={pricesAllowed}
          onSavePrices={changed => onSavePrices ? onSavePrices(changed) : Promise.reject(new Error('Сохранение цен недоступно.'))}
          onSaveMeta={data => saveMeta(editingKind, data)}
          onClose={() => setEditingKind(null)}
        />
      )}
    </section>
  );
}
