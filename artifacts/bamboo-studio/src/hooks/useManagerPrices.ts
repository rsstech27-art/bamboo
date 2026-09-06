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
  { id: 'gold',     article: 'PR-GOLD',  name: 'Профиль золото',    defaultPrice: 990 },
  { id: 'black',    article: 'PR-BLACK', name: 'Профиль чёрный',   defaultPrice: 890 },
  { id: 'metallic', article: 'PR-METAL', name: 'Профиль металлик', defaultPrice: 940 },
  { id: 'brass',    article: 'PR-BRASS', name: 'Профиль латунь',   defaultPrice: 990 },
];

export type PriceMap    = Record<string, number>;
export type SeriesNames = Record<string, string>;
export type SeriesDefinition = {
  id: string;
  name: string;
  price: number;
  custom?: boolean;
};

// ── localStorage keys (used only as optimistic cache) ────────────────────────
const LS_PANEL_KEY         = 'aw_manager_panel_prices';
const LS_MOLDING_KEY       = 'aw_manager_molding_prices';
const LS_SERIES_NAMES_KEY  = 'aw_manager_series_names';
const LS_MOLDING_NAMES_KEY = 'aw_manager_molding_names';
const LS_CUSTOM_SERIES_KEY  = 'aw_manager_custom_series';

function loadLS(key: string): Record<string, unknown> {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as Record<string, unknown> : {}; }
  catch { return {}; }
}
function saveLS(key: string, v: Record<string, unknown>) {
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
}> {
  try {
    const r = await fetch('/api/settings');
    if (!r.ok) return {};
    return await r.json() as Record<string, Record<string, unknown>>;
  } catch { return {}; }
}

async function putSetting(key: string, value: Record<string, unknown>) {
  try {
    await managerFetch(`/api/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  } catch { /* best-effort */ }
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
  const [customSeries, setCustomSeries] = useState<SeriesDefinition[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CUSTOM_SERIES_KEY);
      return raw ? JSON.parse(raw) as SeriesDefinition[] : [];
    } catch {
      return [];
    }
  });

  // Refs for use in callbacks without stale closures
  const panelOverridesRef   = useRef(panelOverrides);
  const moldingOverridesRef = useRef(moldingOverrides);
  useEffect(() => { panelOverridesRef.current  = panelOverrides;  }, [panelOverrides]);
  useEffect(() => { moldingOverridesRef.current = moldingOverrides; }, [moldingOverrides]);

  // On mount: load authoritative values from DB, then overwrite local state + cache
  useEffect(() => {
    void fetchSettings().then(remote => {
      if (remote.panel_prices)   { setPanelOverrides(remote.panel_prices);   saveLS(LS_PANEL_KEY,         remote.panel_prices as Record<string, unknown>); }
      if (remote.molding_prices) { setMoldingOverrides(remote.molding_prices); saveLS(LS_MOLDING_KEY,      remote.molding_prices as Record<string, unknown>); }
      if (remote.series_names)   { setSeriesNameOverrides(remote.series_names); saveLS(LS_SERIES_NAMES_KEY, remote.series_names as Record<string, unknown>); }
      if (remote.molding_names)  { setMoldingNameOverrides(remote.molding_names); saveLS(LS_MOLDING_NAMES_KEY, remote.molding_names as Record<string, unknown>); }
      if (Array.isArray(remote.custom_series)) {
        const valid = remote.custom_series.filter(s =>
          s && typeof s.id === 'string' && typeof s.name === 'string' &&
          typeof s.price === 'number' && s.price > 0
        );
        setCustomSeries(valid);
        try { localStorage.setItem(LS_CUSTOM_SERIES_KEY, JSON.stringify(valid)); } catch { /* ignore */ }
      }
    });
  }, []);

  // ── Setters ─────────────────────────────────────────────────────────────────

  const setPanelPrice = useCallback((seriesId: string, price: number) => {
    setPanelOverrides(prev => {
      const next = { ...prev, [seriesId]: price };
      saveLS(LS_PANEL_KEY, next as Record<string, unknown>);
      void putSetting('panel_prices', next as Record<string, unknown>);
      return next;
    });
  }, []);

  const setMoldingPrice = useCallback((styleId: string, price: number) => {
    setMoldingOverrides(prev => {
      const next = { ...prev, [styleId]: price };
      saveLS(LS_MOLDING_KEY, next as Record<string, unknown>);
      void putSetting('molding_prices', next as Record<string, unknown>);
      return next;
    });
  }, []);

  const setSeriesName = useCallback((seriesId: string, name: string) => {
    setSeriesNameOverrides(prev => {
      const trimmed = name.trim();
      const next: SeriesNames = { ...prev };
      if (trimmed) { next[seriesId] = trimmed; } else { delete next[seriesId]; }
      saveLS(LS_SERIES_NAMES_KEY, next as Record<string, unknown>);
      void putSetting('series_names', next as Record<string, unknown>);
      return next;
    });
  }, []);

  const setMoldingName = useCallback((moldingId: string, name: string) => {
    setMoldingNameOverrides(prev => {
      const trimmed = name.trim();
      const next: SeriesNames = { ...prev };
      if (trimmed) { next[moldingId] = trimmed; } else { delete next[moldingId]; }
      saveLS(LS_MOLDING_NAMES_KEY, next as Record<string, unknown>);
      void putSetting('molding_names', next as Record<string, unknown>);
      return next;
    });
  }, []);

  const addCustomSeries = useCallback((name: string, price: number) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название серии');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Укажите стоимость больше нуля');

    const allNames = [
      ...DEFAULT_SERIES_PRICES.map(s => seriesNameOverrides[s.id] || s.name),
      ...customSeries.map(s => s.name),
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
      ...customSeries.map(s => s.id),
    ]);
    let id = `custom-${slug}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `custom-${slug}-${suffix++}`;

    const created: SeriesDefinition = { id, name: trimmed, price: Math.round(price), custom: true };
    const next = [...customSeries, created];
    setCustomSeries(next);
    try { localStorage.setItem(LS_CUSTOM_SERIES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    void putSetting('custom_series', next as unknown as Record<string, unknown>);
    return created;
  }, [customSeries, seriesNameOverrides]);

  const resetPrices = useCallback(() => {
    setPanelOverrides({});
    setMoldingOverrides({});
    setSeriesNameOverrides({});
    setMoldingNameOverrides({});
    clearLS(LS_PANEL_KEY, LS_MOLDING_KEY, LS_SERIES_NAMES_KEY, LS_MOLDING_NAMES_KEY);
    // Remove all four settings from DB
    void deleteSetting('panel_prices');
    void deleteSetting('molding_prices');
    void deleteSetting('series_names');
    void deleteSetting('molding_names');
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
    seriesDefinitions,
    panelOverridesRef,
    moldingOverridesRef,
    setPanelPrice,
    setMoldingPrice,
    setSeriesName,
    setMoldingName,
    addCustomSeries,
    resetPrices,
    effectivePanelPrice,
    effectiveMoldingPrice,
  };
}
