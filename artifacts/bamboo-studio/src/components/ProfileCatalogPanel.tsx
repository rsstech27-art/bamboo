import { useEffect, useRef, useState } from 'react';
import { Check, Download, Loader2, RefreshCw } from 'lucide-react';
import { useImportOfficialProfileCatalog, useUpdateProfileCatalog } from '@workspace/api-client-react';
import {
  PROFILE_CATALOG_UPDATED_EVENT,
  PROFILE_COLORS,
  PROFILE_COLOR_LABELS,
  PROFILE_KIND_DETAILS,
  PROFILE_KIND_ORDER,
  type ProfileColor,
  type ProfileKind,
} from '../lib/profileCatalog';
import { useProfileCatalog } from '../hooks/useProfileCatalog';

type ProfileDraft = { article: string; name: string; colors: ProfileColor[] };

export function ProfileCatalogPanel({ canEdit }: { canEdit: boolean }) {
  const { records, loading, error, reload } = useProfileCatalog();
  const updateCatalog = useUpdateProfileCatalog({ request: { credentials: 'include' } });
  const importCatalog = useImportOfficialProfileCatalog({ request: { credentials: 'include' } });
  const [drafts, setDrafts] = useState<Partial<Record<ProfileKind, ProfileDraft>>>({});
  const dirtyKindsRef = useRef(new Set<ProfileKind>());
  const [savingKind, setSavingKind] = useState<ProfileKind | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!records) return;
    setDrafts(current => {
      const next = { ...current };
      for (const kind of PROFILE_KIND_ORDER) {
        const record = records.find(item => item.kind === kind);
        if (dirtyKindsRef.current.has(kind)) continue;
        if (record) {
          next[kind] = { article: record.article, name: record.name, colors: [...record.colors] };
        } else if (!next[kind]) {
          next[kind] = { article: '', name: '', colors: [] };
        }
      }
      return next;
    });
  }, [records]);

  const updateDraft = (kind: ProfileKind, update: Partial<ProfileDraft>) => {
    dirtyKindsRef.current.add(kind);
    setDrafts(current => ({
      ...current,
      [kind]: { article: '', name: '', colors: [], ...current[kind], ...update },
    }));
    setSaveSuccess(null);
  };

  const save = async (kind: ProfileKind) => {
    const draft = drafts[kind];
    if (!draft?.article.trim() || !draft.name.trim() || draft.colors.length === 0) {
      setSaveError('Укажите артикул, название и хотя бы один доступный цвет.');
      setSaveSuccess(null);
      return;
    }
    setSavingKind(kind);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await updateCatalog.mutateAsync({
        kind,
        data: {
          article: draft.article.trim(),
          name: draft.name.trim(),
          colors: draft.colors,
        },
      });
      dirtyKindsRef.current.delete(kind);
      setSaveSuccess(`Сохранён тип «${PROFILE_KIND_DETAILS[kind].typeLabel}».`);
      window.dispatchEvent(new Event(PROFILE_CATALOG_UPDATED_EVENT));
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
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
          : 'Импорт официальных записей завершён. Существующие данные не заменялись.',
      );
      window.dispatchEvent(new Event(PROFILE_CATALOG_UPDATED_EVENT));
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setImporting(false);
    }
  };

  const recordsByKind = new Map((records ?? []).map(record => [record.kind, record]));

  return (
    <section className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-gray-900">Официальный каталог профилей КП</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
            Метаданные официальных артикулов хранятся отдельно от старых товаров-профилей и настроек цен.
            Длина — 3 м; толщина панелей — 5 и 8 мм. Изменения каталога не меняют цены и названия в редакторе цен.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void importOfficial()}
            disabled={importing}
            data-testid="button-import-official-profiles"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {importing ? 'Импорт…' : 'Добавить отсутствующие официальные записи'}
          </button>
        )}
      </div>

      {loading && (
        <div role="status" data-testid="status-profile-catalog-loading" className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" /> Загрузка официального каталога…
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
      {saveError && <div role="alert" data-testid="status-profile-catalog-save-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</div>}
      {saveSuccess && <div role="status" data-testid="status-profile-catalog-saved" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saveSuccess}</div>}
      {importError && <div role="alert" data-testid="status-profile-catalog-import-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{importError}</div>}
      {importSuccess && <div role="status" data-testid="status-profile-catalog-imported" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{importSuccess}</div>}

      <div className="mt-4 grid gap-3">
        {PROFILE_KIND_ORDER.map(kind => {
          const details = PROFILE_KIND_DETAILS[kind];
          const record = recordsByKind.get(kind);
          const draft = drafts[kind] ?? { article: '', name: '', colors: [] };
          const allowedColors = details.colors;
          const busy = savingKind === kind;
          return (
            <div key={kind} data-testid={`card-official-profile-${kind}`} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-gray-800">{details.typeLabel}</div>
                  <div className="mt-0.5 text-[10px] text-gray-400">
                    {record ? `Артикул ${record.article}` : records ? 'Запись отсутствует' : 'Каталог ещё не загружен'}
                    {' · '}3 м · 5 / 8 мм
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void save(kind)}
                    disabled={savingKind !== null || loading || !records || Boolean(error)}
                    data-testid={`button-save-official-profile-${kind}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {busy ? 'Сохранение…' : 'Сохранить'}
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Артикул
                  <input
                    value={draft.article}
                    disabled={!canEdit || busy || loading || !records || Boolean(error)}
                    onChange={event => updateDraft(kind, { article: event.target.value })}
                    data-testid={`input-profile-article-${kind}`}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-gray-700 outline-none focus:border-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Название в КП
                  <input
                    value={draft.name}
                    disabled={!canEdit || busy || loading || !records || Boolean(error)}
                    onChange={event => updateDraft(kind, { name: event.target.value })}
                    data-testid={`input-profile-name-${kind}`}
                    className="mt-1 block w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-gray-700 outline-none focus:border-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </label>
              </div>
              <fieldset className="mt-2">
                <legend className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Доступные цвета</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {PROFILE_COLORS.filter(color => allowedColors.includes(color)).map(color => {
                    const checked = draft.colors.includes(color);
                    return (
                      <label key={color} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold ${checked ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-gray-200 text-gray-500'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit || busy || loading || !records || Boolean(error)}
                          onChange={() => updateDraft(kind, {
                            colors: checked
                              ? draft.colors.filter(item => item !== color)
                              : [...draft.colors, color],
                          })}
                          data-testid={`checkbox-profile-color-${kind}-${color}`}
                          className="accent-violet-700"
                        />
                        {PROFILE_COLOR_LABELS[color]}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          );
        })}
      </div>
      {!canEdit && <p className="mt-3 text-[10px] text-gray-400">Для редактирования каталога требуется право «Товары → Редактирование».</p>}
    </section>
  );
}