import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { managerFetch } from '../lib/managerApi';

// ── Default prices (mirrors module-level constants in App.tsx) ───────────────
export const DEFAULT_SERIES_PRICES: Array<{ id: string; name: string; defaultPrice: number }> = [
  { id: 'metall-25',    name: 'Металлическая серия',   defaultPrice: 6900 },
  { id: 'liqmetall-25', name: 'Жидкий металл -25',     defaultPrice: 6900 },
  { id: 'pet-25',       name: 'ПЭТ матовая',            defaultPrice: 5900 },
  { id: 'galv-15',      name: 'Гальваническая',         defaultPrice: 5400 },
  { id: 'liqmetall-10', name: 'Жидкий металл -10',     defaultPrice: 4900 },
  { id: 'particles-10', name: 'Частицы',                defaultPrice: 4900 },
  { id: 'stone-gravel', name: 'Щебень / Камень',        defaultPrice: 4500 },
  { id: 'patina-copper',name: 'Патина / Медь',          defaultPrice: 4500 },
  { id: 'linen-cement', name: 'Льняное / Цемент',       defaultPrice: 3900 },
  { id: 'rainbow',      name: 'Радуга / Хамелеон',      defaultPrice: 5900 },
  { id: 'mirror-gloss', name: 'Зеркальная глянцевая',  defaultPrice: 6400 },
  { id: 'wood',         name: 'Натуральное дерево',     defaultPrice: 5200 },
  { id: 'reiki',        name: 'Рейки (деревянные)',     defaultPrice: 7900 },
  { id: 'soft-touch',   name: 'Soft-touch / Кожа',     defaultPrice: 4700 },
];

export const DEFAULT_MOLDING_PRICES: Array<{ id: string; name: string; article: string; defaultPrice: number }> = [
  { id: 'black',    article: 'PR-BLACK',  name: 'Профиль чёрный',         defaultPrice: 890  },
  { id: 'metallic', article: 'PR-METAL',  name: 'Профиль металлик',       defaultPrice: 940  },
  { id: 'bronze',   article: 'PR-BRONZE', name: 'Профиль бронза',         defaultPrice: 990  },
  // Соединительные: с разрывом и с подсветкой
  { id: 'gap',      article: 'PR-GAP',    name: 'Профиль с разрывом',     defaultPrice: 1090 },
  { id: 'light',    article: 'PR-LIGHT',  name: 'Профиль с подсветкой',   defaultPrice: 1490 },
  // Торцевой профиль — по цветам
  { id: 'edge_black',    article: 'PR-EDGE-BLK', name: 'Профиль торцевой чёрный',    defaultPrice: 790  },
  { id: 'edge_metallic', article: 'PR-EDGE-MTL', name: 'Профиль торцевой металлик',  defaultPrice: 790  },
  { id: 'edge_bronze',   article: 'PR-EDGE-BRZ', name: 'Профиль торцевой бронза',    defaultPrice: 790  },
  // legacy — единый торец без цвета (обратная совместимость)
  { id: 'edge',     article: 'PR-EDGE',   name: 'Профиль торцевой',       defaultPrice: 790  },
];

/** Дополнительные товары — не являются панелями или профилями */
export const DEFAULT_EXTRAS: Array<{ id: string; article: string; name: string; defaultPrice: number; unit: string }> = [
  { id: 'glue', article: 'AW-GLUE', name: 'Клей AllWall', defaultPrice: 590, unit: '₽/уп.' },
];

export type PriceMap    = Record<string, number>;
export type SeriesNames = Record<string, string>;
export type SeriesDefinition = {
  id: string;
  name: string;
  price: number;
  custom?: boolean;
};

export type DbSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── localStorage keys (used only as optimistic cache) ────────────────────────
const LS_PANEL_KEY            = 'aw_manager_panel_prices';
const LS_MOLDING_KEY          = 'aw_manager_molding_prices';
const LS_SERIES_NAMES_KEY     = 'aw_manager_series_names';
const LS_MOLDING_NAMES_KEY    = 'aw_manager_molding_names';
const LS_CUSTOM_SERIES_KEY    = 'aw_manager_custom_series';
const LS_CUSTOM_MOLDINGS_KEY  = 'aw_manager_custom_moldings';
const LS_EXTRAS_KEY           = 'aw_manager_extras_prices';
const LS_CUSTOM_EXTRAS_KEY    = 'aw_manager_custom_extras';
const LS_HIDDEN_SERIES_KEY    = 'aw_manager_hidden_series';
const LS_HIDDEN_MOLDINGS_KEY  = 'aw_manager_hidden_moldings';
const LS_HIDDEN_EXTRAS_KEY    = 'aw_manager_hidden_extras';

function loadLS(key: string): Record<string, unknown> {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as Record<string, unknown> : {}; }
  catch { return {}; }
}
function loadArr(key: string): string[] {
  try { const r = localStorage.getItem(key); return Array.isArray(JSON.parse(r ?? 'null')) ? JSON.parse(r!) as string[] : []; }
  catch { return []; }
}
function saveLS(key: string, v: Record<string, unknown>) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}
function saveArrLS(key: string, v: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}
function clearLS(...keys: string[]) {
  keys.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchSettings(): Promise<{
  panel_prices?: PriceMap;
  molding_prices?: PriceMap;
  series_names?: SeriesNames;
  molding_names?: SeriesNames;
  custom_series?: SeriesDefinition[];
  custom_moldings?: SeriesDefinition[];
  custom_extras?: SeriesDefinition[];
  extras_prices?: PriceMap;
  hidden_series_ids?: string[];
  hidden_molding_ids?: string[];
  hidden_extras_ids?: string[];
}> {
  try {
    const r = await fetch('/api/settings');
    if (!r.ok) return {};
    return await r.json() as Record<string, Record<string, unknown>>;
  } catch { return {}; }
}

/**
 * Persist a setting to the DB via the authenticated manager API.
 * Returns true on success, false on failure.
 * Throws nothing — always resolves.
 */
async function putSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const r = await managerFetch(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!r.ok) {
      console.error(`[manager/prices] DB save failed for "${key}": HTTP ${r.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[manager/prices] Network error saving "${key}":`, e);
    return false;
  }
}

async function deleteSetting(key: string) {
  try { await managerFetch(`/api/settings/${key}`, { method: 'DELETE' }); }
  catch { /* best-effort */ }
}

// ── Exported helpers ──────────────────────────────────────────────────────────
export function getEffectiveSeriesName(id: string, nameOverrides: SeriesNames): string {
  return nameOverrides[id] || DEFAULT_SERIES_PRICES.find(s => s.id === id)?.name || id;
}
export function getEffectiveMoldingName(id: string, nameOverrides: SeriesNames): string {
  return nameOverrides[id] || DEFAULT_MOLDING_PRICES.find(m => m.id === id)?.name || id;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useManagerPrices() {
  // Initialise from localStorage so the UI is instant on first render
  const [panelOverrides,       setPanelOverrides]       = useState<PriceMap>(() => loadLS(LS_PANEL_KEY) as PriceMap);
  const [moldingOverrides,     setMoldingOverrides]     = useState<PriceMap>(() => loadLS(LS_MOLDING_KEY) as PriceMap);
  const [seriesNameOverrides,  setSeriesNameOverrides]  = useState<SeriesNames>(() => loadLS(LS_SERIES_NAMES_KEY) as SeriesNames);
  const [moldingNameOverrides, setMoldingNameOverrides] = useState<SeriesNames>(() => loadLS(LS_MOLDING_NAMES_KEY) as SeriesNames);
  const [extrasOverrides,      setExtrasOverrides]      = useState<PriceMap>(() => loadLS(LS_EXTRAS_KEY) as PriceMap);
  const [customSeries, setCustomSeries] = useState<SeriesDefinition[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_SERIES_KEY);
      return raw ? JSON.parse(raw) as SeriesDefinition[] : [];
    } catch { return []; }
  });
  const [customMoldings, setCustomMoldings] = useState<SeriesDefinition[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_MOLDINGS_KEY);
      return raw ? JSON.parse(raw) as SeriesDefinition[] : [];
    } catch { return []; }
  });
  const [customExtras, setCustomExtras] = useState<SeriesDefinition[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_EXTRAS_KEY);
      return raw ? JSON.parse(raw) as SeriesDefinition[] : [];
    } catch { return []; }
  });
  const [hiddenSeriesIds,  setHiddenSeriesIds]  = useState<string[]>(() => loadArr(LS_HIDDEN_SERIES_KEY));
  const [hiddenMoldingIds, setHiddenMoldingIds] = useState<string[]>(() => loadArr(LS_HIDDEN_MOLDINGS_KEY));
  const [hiddenExtrasIds,  setHiddenExtrasIds]  = useState<string[]>(() => loadArr(LS_HIDDEN_EXTRAS_KEY));

  // ── Save status for UI feedback ─────────────────────────────────────────────
  const [dbSaveStatus, setDbSaveStatus] = useState<DbSaveStatus>('idle');
  const saveResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaves   = useRef(0);

  const markSaving = useCallback(() => {
    pendingSaves.current++;
    setDbSaveStatus('saving');
    if (saveResetTimer.current) { clearTimeout(saveResetTimer.current); saveResetTimer.current = null; }
  }, []);

  const markDone = useCallback((ok: boolean) => {
    pendingSaves.current = Math.max(0, pendingSaves.current - 1);
    if (pendingSaves.current > 0) return; // more saves in-flight
    setDbSaveStatus(ok ? 'saved' : 'error');
    if (saveResetTimer.current) clearTimeout(saveResetTimer.current);
    saveResetTimer.current = setTimeout(() => setDbSaveStatus('idle'), 3000);
  }, []);

  /** Persist a key to DB with visual status tracking. Call OUTSIDE setState updaters. */
  const persist = useCallback(async (key: string, value: unknown) => {
    markSaving();
    const ok = await putSetting(key, value);
    markDone(ok);
  }, [markSaving, markDone]);

  // ── Refs: always-current copies of state for use in callbacks ───────────────
  // (avoids stale closures and allows calling side-effects OUTSIDE setState updaters)
  const panelOverridesRef       = useRef(panelOverrides);
  const moldingOverridesRef     = useRef(moldingOverrides);
  const seriesNameOverridesRef  = useRef(seriesNameOverrides);
  const moldingNameOverridesRef = useRef(moldingNameOverrides);
  const extrasOverridesRef      = useRef(extrasOverrides);
  const customSeriesRef         = useRef(customSeries);
  const customMoldingsRef       = useRef(customMoldings);
  const customExtrasRef         = useRef(customExtras);
  const hiddenSeriesRef         = useRef(hiddenSeriesIds);
  const hiddenMoldingsRef       = useRef(hiddenMoldingIds);
  const hiddenExtrasRef         = useRef(hiddenExtrasIds);

  useEffect(() => { panelOverridesRef.current       = panelOverrides;       }, [panelOverrides]);
  useEffect(() => { moldingOverridesRef.current     = moldingOverrides;     }, [moldingOverrides]);
  useEffect(() => { seriesNameOverridesRef.current  = seriesNameOverrides;  }, [seriesNameOverrides]);
  useEffect(() => { moldingNameOverridesRef.current = moldingNameOverrides; }, [moldingNameOverrides]);
  useEffect(() => { extrasOverridesRef.current      = extrasOverrides;      }, [extrasOverrides]);
  useEffect(() => { customSeriesRef.current         = customSeries;         }, [customSeries]);
  useEffect(() => { customMoldingsRef.current       = customMoldings;       }, [customMoldings]);
  useEffect(() => { customExtrasRef.current         = customExtras;         }, [customExtras]);
  useEffect(() => { hiddenSeriesRef.current         = hiddenSeriesIds;      }, [hiddenSeriesIds]);
  useEffect(() => { hiddenMoldingsRef.current       = hiddenMoldingIds;     }, [hiddenMoldingIds]);
  useEffect(() => { hiddenExtrasRef.current         = hiddenExtrasIds;      }, [hiddenExtrasIds]);

  // On mount: load authoritative values from DB, then overwrite local state + cache
  useEffect(() => {
    void fetchSettings().then(remote => {
      if (remote.panel_prices)   { setPanelOverrides(remote.panel_prices);   saveLS(LS_PANEL_KEY,         remote.panel_prices as Record<string, unknown>); }
      if (remote.molding_prices) { setMoldingOverrides(remote.molding_prices); saveLS(LS_MOLDING_KEY,      remote.molding_prices as Record<string, unknown>); }
      if (remote.series_names)   { setSeriesNameOverrides(remote.series_names); saveLS(LS_SERIES_NAMES_KEY, remote.series_names as Record<string, unknown>); }
      if (remote.molding_names)  { setMoldingNameOverrides(remote.molding_names); saveLS(LS_MOLDING_NAMES_KEY, remote.molding_names as Record<string, unknown>); }
      if (remote.extras_prices)  { setExtrasOverrides(remote.extras_prices);      saveLS(LS_EXTRAS_KEY,        remote.extras_prices as Record<string, unknown>); }
      if (Array.isArray(remote.custom_series)) {
        const valid = remote.custom_series.filter(s =>
          s && typeof s.id === 'string' && typeof s.name === 'string' &&
          typeof s.price === 'number' && s.price > 0
        );
        setCustomSeries(valid);
        try { localStorage.setItem(LS_CUSTOM_SERIES_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
      }
      if (Array.isArray(remote.custom_moldings)) {
        const valid = remote.custom_moldings.filter(s =>
          s && typeof s.id === 'string' && typeof s.name === 'string' &&
          typeof s.price === 'number' && s.price > 0
        );
        setCustomMoldings(valid);
        try { localStorage.setItem(LS_CUSTOM_MOLDINGS_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
      }
      if (Array.isArray(remote.custom_extras)) {
        const valid = remote.custom_extras.filter(s =>
          s && typeof s.id === 'string' && typeof s.name === 'string' &&
          typeof s.price === 'number' && s.price > 0
        );
        setCustomExtras(valid);
        try { localStorage.setItem(LS_CUSTOM_EXTRAS_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
      }
      if (Array.isArray(remote.hidden_series_ids))  { setHiddenSeriesIds(remote.hidden_series_ids);   saveArrLS(LS_HIDDEN_SERIES_KEY,   remote.hidden_series_ids); }
      if (Array.isArray(remote.hidden_molding_ids)) { setHiddenMoldingIds(remote.hidden_molding_ids); saveArrLS(LS_HIDDEN_MOLDINGS_KEY, remote.hidden_molding_ids); }
      if (Array.isArray(remote.hidden_extras_ids))  { setHiddenExtrasIds(remote.hidden_extras_ids);   saveArrLS(LS_HIDDEN_EXTRAS_KEY,   remote.hidden_extras_ids); }
    });
  }, []);

  // ── Setters — side-effects OUTSIDE setState updater to avoid React 18 anti-pattern ──

  const setPanelPrice = useCallback((seriesId: string, price: number) => {
    const next = { ...panelOverridesRef.current, [seriesId]: price };
    panelOverridesRef.current = next;
    saveLS(LS_PANEL_KEY, next as Record<string, unknown>);
    setPanelOverrides(next);
    void persist('panel_prices', next);

    // Sync product costs for all panels in this series
    const seriesName =
      seriesNameOverridesRef.current[seriesId] ||
      DEFAULT_SERIES_PRICES.find(s => s.id === seriesId)?.name;
    if (seriesName) {
      void managerFetch('/api/products/sync-series-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: seriesName, cost: price }),
      });
    }
  }, [persist]);

  const setMoldingPrice = useCallback((styleId: string, price: number) => {
    const next = { ...moldingOverridesRef.current, [styleId]: price };
    moldingOverridesRef.current = next;
    saveLS(LS_MOLDING_KEY, next as Record<string, unknown>);
    setMoldingOverrides(next);
    void persist('molding_prices', next);
  }, [persist]);

  const setSeriesName = useCallback((seriesId: string, name: string) => {
    const next: SeriesNames = { ...seriesNameOverridesRef.current };
    if (name.trim()) { next[seriesId] = name; } else { delete next[seriesId]; }
    seriesNameOverridesRef.current = next;
    saveLS(LS_SERIES_NAMES_KEY, next as Record<string, unknown>);
    setSeriesNameOverrides(next);
    void persist('series_names', next);
  }, [persist]);

  const setMoldingName = useCallback((moldingId: string, name: string) => {
    const next: SeriesNames = { ...moldingNameOverridesRef.current };
    if (name.trim()) { next[moldingId] = name; } else { delete next[moldingId]; }
    moldingNameOverridesRef.current = next;
    saveLS(LS_MOLDING_NAMES_KEY, next as Record<string, unknown>);
    setMoldingNameOverrides(next);
    void persist('molding_names', next);
  }, [persist]);

  const setExtrasPrice = useCallback((id: string, price: number) => {
    const next = { ...extrasOverridesRef.current, [id]: price };
    extrasOverridesRef.current = next;
    saveLS(LS_EXTRAS_KEY, next as Record<string, unknown>);
    setExtrasOverrides(next);
    void persist('extras_prices', next);
  }, [persist]);

  const deleteCustomSeries = useCallback((id: string) => {
    const next = customSeriesRef.current.filter(s => s.id !== id);
    customSeriesRef.current = next;
    saveArrLS(LS_CUSTOM_SERIES_KEY, next);
    setCustomSeries(next);
    void persist('custom_series', next);
  }, [persist]);

  const updateCustomSeries = useCallback((id: string, name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed || !Number.isFinite(price) || price <= 0) return;
    const prev = customSeriesRef.current.find(s => s.id === id);
    const next = customSeriesRef.current.map(s => s.id === id ? { ...s, name: trimmed, price: Math.round(price) } : s);
    customSeriesRef.current = next;
    saveArrLS(LS_CUSTOM_SERIES_KEY, next);
    setCustomSeries(next);
    void persist('custom_series', next);

    // Sync product costs. If the series name changed, update by old name first,
    // then by new name (covers both cases in one pass — API matches by name).
    const oldName = prev?.name;
    const newName = trimmed;
    if (oldName && oldName !== newName) {
      // Name changed: sync old name to new price (products still carry old name)
      void managerFetch('/api/products/sync-series-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: oldName, cost: Math.round(price) }),
      });
    }
    // Always sync new name (covers price-only change and post-rename)
    void managerFetch('/api/products/sync-series-price', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ series: newName, cost: Math.round(price) }),
    });
  }, [persist]);

  const addCustomSeries = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название серии');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Укажите стоимость больше нуля');

    const allNames = [
      ...DEFAULT_SERIES_PRICES.map(s => seriesNameOverridesRef.current[s.id] || s.name),
      ...customSeriesRef.current.map(s => s.name),
    ];
    if (allNames.some(n => n.localeCompare(trimmed, 'ru', { sensitivity: 'accent' }) === 0)) {
      throw new Error('Серия с таким названием уже существует');
    }

    const slug = trimmed
      .toLocaleLowerCase('ru')
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'series';
    const usedIds = new Set([
      ...DEFAULT_SERIES_PRICES.map(s => s.id),
      ...customSeriesRef.current.map(s => s.id),
    ]);
    let id = `custom-${slug}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `custom-${slug}-${suffix++}`;

    const created: SeriesDefinition = { id, name: trimmed, price: Math.round(price), custom: true };
    const next = [...customSeriesRef.current, created];
    customSeriesRef.current = next;
    saveArrLS(LS_CUSTOM_SERIES_KEY, next);
    setCustomSeries(next);
    void persist('custom_series', next);
    return created;
  }, [persist]);

  const addCustomMolding = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название профиля');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Укажите стоимость больше нуля');
    const allNames = [
      ...DEFAULT_MOLDING_PRICES.map(m => moldingNameOverridesRef.current[m.id] || m.name),
      ...customMoldingsRef.current.map(m => m.name),
    ];
    if (allNames.some(n => n.localeCompare(trimmed, 'ru', { sensitivity: 'accent' }) === 0)) {
      throw new Error('Профиль с таким названием уже существует');
    }
    const slug = trimmed.toLocaleLowerCase('ru').replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'profile';
    const usedIds = new Set([...DEFAULT_MOLDING_PRICES.map(m => m.id), ...customMoldingsRef.current.map(m => m.id)]);
    let id = `custom-molding-${slug}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `custom-molding-${slug}-${suffix++}`;
    const created: SeriesDefinition = { id, name: trimmed, price: Math.round(price), custom: true };
    const next = [...customMoldingsRef.current, created];
    customMoldingsRef.current = next;
    saveArrLS(LS_CUSTOM_MOLDINGS_KEY, next);
    setCustomMoldings(next);
    void persist('custom_moldings', next);
    return created;
  }, [persist]);

  const deleteCustomMolding = useCallback((id: string) => {
    const next = customMoldingsRef.current.filter(m => m.id !== id);
    customMoldingsRef.current = next;
    saveArrLS(LS_CUSTOM_MOLDINGS_KEY, next);
    setCustomMoldings(next);
    void persist('custom_moldings', next);
  }, [persist]);

  const updateCustomMolding = useCallback((id: string, name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed || !Number.isFinite(price) || price <= 0) return;
    const next = customMoldingsRef.current.map(m => m.id === id ? { ...m, name: trimmed, price: Math.round(price) } : m);
    customMoldingsRef.current = next;
    saveArrLS(LS_CUSTOM_MOLDINGS_KEY, next);
    setCustomMoldings(next);
    void persist('custom_moldings', next);
  }, [persist]);

  const addCustomExtra = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Укажите стоимость больше нуля');
    const allNames = [
      ...DEFAULT_EXTRAS.map(e => e.name),
      ...customExtrasRef.current.map(e => e.name),
    ];
    if (allNames.some(n => n.localeCompare(trimmed, 'ru', { sensitivity: 'accent' }) === 0)) {
      throw new Error('Позиция с таким названием уже существует');
    }
    const slug = trimmed.toLocaleLowerCase('ru').replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'extra';
    const usedIds = new Set([...DEFAULT_EXTRAS.map(e => e.id), ...customExtrasRef.current.map(e => e.id)]);
    let id = `custom-extra-${slug}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `custom-extra-${slug}-${suffix++}`;
    const created: SeriesDefinition = { id, name: trimmed, price: Math.round(price), custom: true };
    const next = [...customExtrasRef.current, created];
    customExtrasRef.current = next;
    saveArrLS(LS_CUSTOM_EXTRAS_KEY, next);
    setCustomExtras(next);
    void persist('custom_extras', next);
    return created;
  }, [persist]);

  const deleteCustomExtra = useCallback((id: string) => {
    const next = customExtrasRef.current.filter(e => e.id !== id);
    customExtrasRef.current = next;
    saveArrLS(LS_CUSTOM_EXTRAS_KEY, next);
    setCustomExtras(next);
    void persist('custom_extras', next);
  }, [persist]);

  const updateCustomExtra = useCallback((id: string, name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed || !Number.isFinite(price) || price <= 0) return;
    const next = customExtrasRef.current.map(e => e.id === id ? { ...e, name: trimmed, price: Math.round(price) } : e);
    customExtrasRef.current = next;
    saveArrLS(LS_CUSTOM_EXTRAS_KEY, next);
    setCustomExtras(next);
    void persist('custom_extras', next);
  }, [persist]);

  const hideDefaultSeries = useCallback((id: string) => {
    if (hiddenSeriesRef.current.includes(id)) return;
    const next = [...hiddenSeriesRef.current, id];
    hiddenSeriesRef.current = next;
    saveArrLS(LS_HIDDEN_SERIES_KEY, next);
    setHiddenSeriesIds(next);
    void persist('hidden_series_ids', next);
  }, [persist]);

  const hideDefaultMolding = useCallback((id: string) => {
    if (hiddenMoldingsRef.current.includes(id)) return;
    const next = [...hiddenMoldingsRef.current, id];
    hiddenMoldingsRef.current = next;
    saveArrLS(LS_HIDDEN_MOLDINGS_KEY, next);
    setHiddenMoldingIds(next);
    void persist('hidden_molding_ids', next);
  }, [persist]);

  const hideDefaultExtra = useCallback((id: string) => {
    if (hiddenExtrasRef.current.includes(id)) return;
    const next = [...hiddenExtrasRef.current, id];
    hiddenExtrasRef.current = next;
    saveArrLS(LS_HIDDEN_EXTRAS_KEY, next);
    setHiddenExtrasIds(next);
    void persist('hidden_extras_ids', next);
  }, [persist]);

  const resetPrices = useCallback(() => {
    setPanelOverrides({});
    setMoldingOverrides({});
    setSeriesNameOverrides({});
    setMoldingNameOverrides({});
    panelOverridesRef.current = {};
    moldingOverridesRef.current = {};
    seriesNameOverridesRef.current = {};
    moldingNameOverridesRef.current = {};
    clearLS(LS_PANEL_KEY, LS_MOLDING_KEY, LS_SERIES_NAMES_KEY, LS_MOLDING_NAMES_KEY);
    void deleteSetting('panel_prices');
    void deleteSetting('molding_prices');
    void deleteSetting('series_names');
    void deleteSetting('molding_names');
  }, []);

  // Reload all settings from the API and apply them to local state + LS.
  const reloadSettings = useCallback(async () => {
    const remote = await fetchSettings();
    if (remote.panel_prices)   { setPanelOverrides(remote.panel_prices);     saveLS(LS_PANEL_KEY,         remote.panel_prices   as Record<string, unknown>); }
    if (remote.molding_prices) { setMoldingOverrides(remote.molding_prices);  saveLS(LS_MOLDING_KEY,       remote.molding_prices  as Record<string, unknown>); }
    if (remote.series_names)   { setSeriesNameOverrides(remote.series_names); saveLS(LS_SERIES_NAMES_KEY, remote.series_names   as Record<string, unknown>); }
    if (remote.molding_names)  { setMoldingNameOverrides(remote.molding_names); saveLS(LS_MOLDING_NAMES_KEY, remote.molding_names as Record<string, unknown>); }
    if (remote.extras_prices)  { setExtrasOverrides(remote.extras_prices);      saveLS(LS_EXTRAS_KEY,        remote.extras_prices as Record<string, unknown>); }
    if (Array.isArray(remote.custom_series)) {
      const valid = remote.custom_series.filter(s =>
        s && typeof s.id === 'string' && typeof s.name === 'string' &&
        typeof s.price === 'number' && s.price > 0
      );
      setCustomSeries(valid);
      try { localStorage.setItem(LS_CUSTOM_SERIES_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
    }
    if (Array.isArray(remote.custom_moldings)) {
      const valid = remote.custom_moldings.filter(s =>
        s && typeof s.id === 'string' && typeof s.name === 'string' &&
        typeof s.price === 'number' && s.price > 0
      );
      setCustomMoldings(valid);
      try { localStorage.setItem(LS_CUSTOM_MOLDINGS_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
    }
    if (Array.isArray(remote.custom_extras)) {
      const valid = remote.custom_extras.filter(s =>
        s && typeof s.id === 'string' && typeof s.name === 'string' &&
        typeof s.price === 'number' && s.price > 0
      );
      setCustomExtras(valid);
      try { localStorage.setItem(LS_CUSTOM_EXTRAS_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
    }
    if (Array.isArray(remote.hidden_series_ids))  { setHiddenSeriesIds(remote.hidden_series_ids);   saveArrLS(LS_HIDDEN_SERIES_KEY,   remote.hidden_series_ids); }
    if (Array.isArray(remote.hidden_molding_ids)) { setHiddenMoldingIds(remote.hidden_molding_ids); saveArrLS(LS_HIDDEN_MOLDINGS_KEY, remote.hidden_molding_ids); }
    if (Array.isArray(remote.hidden_extras_ids))  { setHiddenExtrasIds(remote.hidden_extras_ids);   saveArrLS(LS_HIDDEN_EXTRAS_KEY,   remote.hidden_extras_ids); }
  }, []);

  const seriesDefinitions = useMemo<SeriesDefinition[]>(() => [
    ...DEFAULT_SERIES_PRICES.map(s => ({
      id: s.id,
      name: getEffectiveSeriesName(s.id, seriesNameOverrides),
      price: panelOverrides[s.id] ?? s.defaultPrice,
    })),
    ...customSeries,
  ], [panelOverrides, seriesNameOverrides, customSeries]);

  // Effective price lookup helpers (use refs so callbacks don't go stale)
  const effectivePanelPrice   = (seriesId: string, fallback: number) => panelOverridesRef.current[seriesId]   ?? fallback;
  const effectiveMoldingPrice = (styleId:  string, fallback: number) => moldingOverridesRef.current[styleId]  ?? fallback;

  return {
    panelOverrides,
    moldingOverrides,
    seriesNameOverrides,
    moldingNameOverrides,
    customSeries,
    customMoldings,
    customExtras,
    hiddenSeriesIds,
    hiddenMoldingIds,
    hiddenExtrasIds,
    seriesDefinitions,
    extrasOverrides,
    panelOverridesRef,
    moldingOverridesRef,
    dbSaveStatus,
    setPanelPrice,
    setMoldingPrice,
    setSeriesName,
    setMoldingName,
    addCustomSeries,
    deleteCustomSeries,
    updateCustomSeries,
    addCustomMolding,
    deleteCustomMolding,
    updateCustomMolding,
    addCustomExtra,
    deleteCustomExtra,
    updateCustomExtra,
    hideDefaultSeries,
    hideDefaultMolding,
    hideDefaultExtra,
    setExtrasPrice,
    resetPrices,
    reloadSettings,
    effectivePanelPrice,
    effectiveMoldingPrice,
  };
}
