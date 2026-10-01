export const PROFILE_CATALOG_UPDATED_EVENT = 'profile-catalog-updated';

export const PROFILE_COLORS = ['black', 'gold', 'bronze', 'metallic'] as const;
export type ProfileColor = typeof PROFILE_COLORS[number];
export type ProfileKind = 'connector' | 'gap' | 'light';

export const PROFILE_KIND_DETAILS: Record<ProfileKind, { label: string; typeLabel: string; colors: readonly ProfileColor[] }> = {
  connector: { label: 'Соединительный профиль', typeLabel: 'Соединительный', colors: PROFILE_COLORS },
  gap: { label: 'Соединительный профиль с разрывом', typeLabel: 'С разрывом', colors: PROFILE_COLORS },
  light: { label: 'Соединительный профиль с подсветкой', typeLabel: 'С подсветкой', colors: ['black'] },
};

export const PROFILE_KIND_ORDER: ProfileKind[] = ['connector', 'gap', 'light'];

export const PROFILE_COLOR_LABELS: Record<ProfileColor, string> = {
  black: 'чёрный',
  gold: 'золотой',
  bronze: 'бронзовый',
  metallic: 'металлик',
};

export interface ProfileCatalogRecord {
  kind: ProfileKind;
  article: string;
  name: string;
  colors: ProfileColor[];
  lengthMm: 3000;
  panelThicknessesMm: number[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficialProfileResolution {
  record: ProfileCatalogRecord;
  kind: ProfileKind;
  color: ProfileColor;
}

export interface MoldingPriceDefinition {
  id: string;
  defaultPrice: number;
}

const COLOR_SET = new Set<string>(PROFILE_COLORS);

export function isProfileCatalogRecord(value: unknown): value is ProfileCatalogRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (record.kind === 'connector' || record.kind === 'gap' || record.kind === 'light') &&
    typeof record.article === 'string' && record.article.trim().length > 0 &&
    typeof record.name === 'string' && record.name.trim().length > 0 &&
    Array.isArray(record.colors) && record.colors.length > 0 &&
    record.colors.every(color => typeof color === 'string' && COLOR_SET.has(color)) &&
    (record.kind !== 'light' || record.colors.every(color => color === 'black')) &&
    record.lengthMm === 3000 &&
    Array.isArray(record.panelThicknessesMm) && record.panelThicknessesMm.length === 2 &&
    record.panelThicknessesMm[0] === 5 && record.panelThicknessesMm[1] === 8 &&
    typeof record.createdAt === 'string' && record.createdAt.length > 0 &&
    typeof record.updatedAt === 'string' && record.updatedAt.length > 0;
}

/**
 * Resolve a configured visual style to the one official profile article.
 * A null return is reserved for legacy edge profiles, which are deliberately
 * outside the official connector/gap/light catalog.
 */
export function resolveOfficialProfile(
  style: string,
  catalog: readonly ProfileCatalogRecord[] | null | undefined,
): OfficialProfileResolution | null {
  if (style === 'none') return null;
  if (style === 'edge' || style.startsWith('edge_')) return null;

  let kind: ProfileKind;
  let color: string;
  if (style === 'gap') {
    kind = 'gap';
    color = 'black';
  } else if (style === 'light') {
    kind = 'light';
    color = 'black';
  } else if (style.endsWith('_gap')) {
    kind = 'gap';
    color = style.slice(0, -4);
  } else if (style.endsWith('_light')) {
    kind = 'light';
    color = style.slice(0, -6);
  } else {
    kind = 'connector';
    color = style;
  }

  if (!COLOR_SET.has(color)) {
    throw new Error(`Неизвестный цвет официального профиля «${style}». Проверьте настройки соединения и повторите формирование КП.`);
  }
  const profileColor = color as ProfileColor;

  if (kind === 'light' && profileColor !== 'black') {
    throw new Error(`Для профиля с подсветкой доступен только чёрный цвет (DL-01). Выбран вариант «${PROFILE_COLOR_LABELS[profileColor]} с подсветкой». Измените цвет профиля перед формированием КП.`);
  }
  if (!catalog) {
    throw new Error('Официальный каталог профилей недоступен или ещё загружается. Обновите каталог и повторите формирование КП.');
  }

  const record = catalog.find(item => item.kind === kind);
  if (!record) {
    throw new Error(`В официальном каталоге отсутствует тип профиля «${PROFILE_KIND_DETAILS[kind].typeLabel}». КП не сформировано; обратитесь к менеджеру каталога.`);
  }
  if (!record.colors.includes(profileColor)) {
    throw new Error(`Артикул ${record.article} («${record.name}») не поддерживает цвет «${PROFILE_COLOR_LABELS[profileColor]}». Измените цвет в проекте или проверьте официальный каталог.`);
  }
  return { record, kind, color: profileColor };
}

export function makeOfficialProfileLabel(
  profile: OfficialProfileResolution,
  direction?: string,
  nameOverride?: string,
): string {
  const name = nameOverride?.trim() || profile.record.name;
  const sizeAndDirection = direction ? `3 м, ${direction}` : '3 м';
  return `${name} ${PROFILE_COLOR_LABELS[profile.color]} (${sizeAndDirection})`;
}

/** Preserve historical saved-price IDs for black modifier aliases. */
export function resolveMoldingPriceAlias(style: string): string {
  if (style === 'black_gap') return 'gap';
  if (style === 'black_light') return 'light';
  return style;
}

/** Only aliases for the same physical color may share a product price. */
export function resolveMoldingProductPriceAlias(style: string): string {
  return resolveMoldingPriceAlias(style);
}

/** Preserve the pre-import exact-series lookup; metadata is not a price migration. */
export function buildLegacyMoldingPriceMap(
  products: readonly { category?: string | null; series?: string | null; cost?: number | null }[],
  definitions: readonly (MoldingPriceDefinition & { name: string })[],
): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const product of products) {
    if (product.category !== 'molding' || !product.series ||
        typeof product.cost !== 'number' || !Number.isFinite(product.cost) || product.cost <= 0) continue;
    const match = definitions.find(definition => definition.name === product.series);
    if (match && (prices[match.id] === undefined || product.cost < prices[match.id])) {
      prices[match.id] = product.cost;
    }
  }
  return prices;
}

/**
 * Price lookup remains independent from official catalog metadata. The
 * current manager override wins, followed by an existing DB product fallback
 * and then the established defaults.
 */
export function resolveMoldingPrice(
  style: string,
  overrides: Readonly<Record<string, number>>,
  productPrices: Readonly<Record<string, number>>,
  defaults: readonly MoldingPriceDefinition[],
  fallback = 940,
): number {
  const alias = resolveMoldingPriceAlias(style);
  const exactOverride = overrides[style];
  if (typeof exactOverride === 'number') return exactOverride;
  const aliasOverride = overrides[alias];
  if (typeof aliasOverride === 'number') return aliasOverride;

  const exactProductPrice = productPrices[style];
  if (typeof exactProductPrice === 'number') return exactProductPrice;
  const aliasProductPrice = productPrices[resolveMoldingProductPriceAlias(style)];
  if (typeof aliasProductPrice === 'number') return aliasProductPrice;

  const exactDefault = defaults.find(item => item.id === style)?.defaultPrice;
  if (typeof exactDefault === 'number') return exactDefault;
  const aliasDefault = defaults.find(item => item.id === alias)?.defaultPrice;
  return typeof aliasDefault === 'number' ? aliasDefault : fallback;
}