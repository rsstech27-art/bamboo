import { useState, useEffect, useRef } from 'react';

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

const LS_PANEL_KEY        = 'aw_manager_panel_prices';
const LS_MOLDING_KEY      = 'aw_manager_molding_prices';
const LS_SERIES_NAMES_KEY = 'aw_manager_series_names';

export type PriceMap     = Record<string, number>;
export type SeriesNames  = Record<string, string>; // id → overridden display name

function loadFromLS(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch { /* ignore */ }
  return {};
}

function saveToLS(key: string, data: Record<string, unknown>) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

/** Returns the display name for a series, applying any manager overrides. */
export function getEffectiveSeriesName(id: string, nameOverrides: SeriesNames): string {
  if (nameOverrides[id]) return nameOverrides[id];
  return DEFAULT_SERIES_PRICES.find(s => s.id === id)?.name ?? id;
}

export function useManagerPrices() {
  const [panelOverrides,   setPanelOverrides]   = useState<PriceMap>(() => loadFromLS(LS_PANEL_KEY) as PriceMap);
  const [moldingOverrides, setMoldingOverrides] = useState<PriceMap>(() => loadFromLS(LS_MOLDING_KEY) as PriceMap);
  const [seriesNameOverrides, setSeriesNameOverrides] = useState<SeriesNames>(
    () => loadFromLS(LS_SERIES_NAMES_KEY) as SeriesNames
  );

  // Refs for use inside callbacks (handleGenerateKP etc.) without stale closures
  const panelOverridesRef   = useRef(panelOverrides);
  const moldingOverridesRef = useRef(moldingOverrides);
  useEffect(() => { panelOverridesRef.current  = panelOverrides;  }, [panelOverrides]);
  useEffect(() => { moldingOverridesRef.current = moldingOverrides; }, [moldingOverrides]);

  const setPanelPrice = (seriesId: string, price: number) => {
    setPanelOverrides(prev => {
      const next = { ...prev, [seriesId]: price };
      saveToLS(LS_PANEL_KEY, next as Record<string, unknown>);
      return next;
    });
  };

  const setMoldingPrice = (styleId: string, price: number) => {
    setMoldingOverrides(prev => {
      const next = { ...prev, [styleId]: price };
      saveToLS(LS_MOLDING_KEY, next as Record<string, unknown>);
      return next;
    });
  };

  const setSeriesName = (seriesId: string, name: string) => {
    setSeriesNameOverrides(prev => {
      const trimmed = name.trim();
      const next: SeriesNames = { ...prev };
      if (trimmed) {
        next[seriesId] = trimmed;
      } else {
        delete next[seriesId]; // revert to default when cleared
      }
      saveToLS(LS_SERIES_NAMES_KEY, next as Record<string, unknown>);
      return next;
    });
  };

  const resetPrices = () => {
    setPanelOverrides({});
    setMoldingOverrides({});
    setSeriesNameOverrides({});
    localStorage.removeItem(LS_PANEL_KEY);
    localStorage.removeItem(LS_MOLDING_KEY);
    localStorage.removeItem(LS_SERIES_NAMES_KEY);
  };

  // Effective price lookup helpers
  const effectivePanelPrice = (seriesId: string, fallback: number): number =>
    panelOverridesRef.current[seriesId] ?? fallback;

  const effectiveMoldingPrice = (styleId: string, fallback: number): number =>
    moldingOverridesRef.current[styleId] ?? fallback;

  return {
    panelOverrides,
    moldingOverrides,
    seriesNameOverrides,
    panelOverridesRef,
    moldingOverridesRef,
    setPanelPrice,
    setMoldingPrice,
    setSeriesName,
    resetPrices,
    effectivePanelPrice,
    effectiveMoldingPrice,
  };
}
