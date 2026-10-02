import { strict as assert } from 'node:assert';
import { DEFAULT_MOLDING_PRICES } from '../hooks/useManagerPrices.ts';
import {
  buildLegacyMoldingPriceMap,
  isLegacyMoldingPriceSource,
  mergeMoldingPriceEdits,
  makeOfficialProfileLabel,
  resolveMoldingPrice,
  resolveMoldingPriceAlias,
  resolveMoldingProductPriceAlias,
  resolveOfficialProfile,
  type ProfileCatalogRecord,
} from './profileCatalog.ts';
import {
  collectNicheVerticalProfileRuns,
  distributeProfileStyleRuns,
  needsFallbackCornerProfile,
} from './profileRuns.ts';

const historicalProfiles = [
  {category:'molding',series:'Профиль торцевой',cost:1100},
  {category:'molding',series:'Профиль соединительный с разрывом',cost:3000},
  {category:'molding',series:'Профиль соединительный с подсветкой',cost:1100},
];
for(const product of historicalProfiles.slice(1)) {
  assert.equal(isLegacyMoldingPriceSource(product,DEFAULT_MOLDING_PRICES),false);
}
assert.equal(isLegacyMoldingPriceSource(historicalProfiles[0]!,DEFAULT_MOLDING_PRICES),true);
assert.deepEqual(buildLegacyMoldingPriceMap(historicalProfiles,DEFAULT_MOLDING_PRICES),{edge:1100});
const usedSource={category:'molding',series:DEFAULT_MOLDING_PRICES[0]!.name,cost:1234};
assert.equal(isLegacyMoldingPriceSource(usedSource,DEFAULT_MOLDING_PRICES),true);
assert.equal(isLegacyMoldingPriceSource({...usedSource,cost:0},DEFAULT_MOLDING_PRICES),false);
assert.equal(isLegacyMoldingPriceSource({...usedSource,category:'panel'},DEFAULT_MOLDING_PRICES),false);
console.log('✓ hiding unused profile cards uses the same exact-series rules as quote prices');

const oldPrices={black:890,gold:990,edge_black:790,legacy_saved_id:777};
const mergedPrices=mergeMoldingPriceEdits(oldPrices,{black:1234,gold:2345},DEFAULT_MOLDING_PRICES);
assert.deepEqual(mergedPrices,{black:1234,gold:2345,edge_black:790,legacy_saved_id:777});
assert.deepEqual(oldPrices,{black:890,gold:990,edge_black:790,legacy_saved_id:777});
console.log('✓ group price edits preserve other colors, edges and historical keys without mutation');
assert.deepEqual(mergeMoldingPriceEdits(
  {gap:1090,black_gap:2090,light:1490,black_light:2490,metallic_gap:1190},
  {gap:3090},DEFAULT_MOLDING_PRICES),
  {gap:3090,black_gap:3090,light:1490,black_light:2490,metallic_gap:1190});
console.log('✓ an explicit color price edit updates its existing same-color alias only');
for(const edits of [{black:0},{black:-1},{black:NaN},{black:Infinity},{unknown:1234}]) {
  assert.throws(()=>mergeMoldingPriceEdits(oldPrices,edits,DEFAULT_MOLDING_PRICES));
}
console.log('✓ invalid or unknown prices cannot enter a group save');

const catalog: ProfileCatalogRecord[] = [
  {
    kind: 'connector', article: 'MC-06', name: 'Соединительный профиль',
    colors: ['black', 'gold', 'bronze', 'metallic'], lengthMm: 3000,
    panelThicknessesMm: [5, 8], createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    kind: 'gap', article: 'MC-07', name: 'Соединительный профиль с разрывом',
    colors: ['black', 'gold', 'bronze', 'metallic'], lengthMm: 3000,
    panelThicknessesMm: [5, 8], createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    kind: 'light', article: 'DL-01', name: 'Соединительный профиль с подсветкой',
    colors: ['black'], lengthMm: 3000, panelThicknessesMm: [5, 8],
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
];

const check = (name: string, fn: () => void) => {
  fn();
  console.log(`✓ ${name}`);
};

check('all official normal-color styles resolve to MC-06 with the requested color', () => {
  for (const color of ['black', 'gold', 'bronze', 'metallic'] as const) {
    const resolved = resolveOfficialProfile(color, catalog);
    assert.equal(resolved?.record.article, 'MC-06');
    assert.equal(resolved?.color, color);
    assert.equal(resolved?.kind, 'connector');
  }
});

check('gap aliases and all colored gap styles resolve to MC-07 without dropping color', () => {
  for (const [style, color] of [
    ['gap', 'black'], ['black_gap', 'black'], ['gold_gap', 'gold'],
    ['bronze_gap', 'bronze'], ['metallic_gap', 'metallic'],
  ] as const) {
    const resolved = resolveOfficialProfile(style, catalog);
    assert.equal(resolved?.record.article, 'MC-07');
    assert.equal(resolved?.color, color);
  }
});

check('light aliases resolve to the exact black-only article DL-01', () => {
  for (const style of ['light', 'black_light']) {
    const resolved = resolveOfficialProfile(style, catalog);
    assert.equal(resolved?.record.article, 'DL-01');
    assert.equal(resolved?.color, 'black');
  }
});

check('same official article keeps separate color and direction labels', () => {
  const black = resolveOfficialProfile('black', catalog)!;
  const gold = resolveOfficialProfile('gold', catalog)!;
  assert.equal(makeOfficialProfileLabel(black, 'верт., раскрой оптимизирован'), 'Соединительный профиль чёрный (3 м, верт., раскрой оптимизирован)');
  assert.equal(makeOfficialProfileLabel(gold, 'гориз., раскрой оптимизирован', 'Профиль с индивидуальным именем'), 'Профиль с индивидуальным именем золотой (3 м, гориз., раскрой оптимизирован)');
  assert.notEqual(makeOfficialProfileLabel(black), makeOfficialProfileLabel(gold));
  assert.equal(black.record.article, 'MC-06');
  assert.equal(gold.record.article, 'MC-06');
});

check('missing catalog, missing kind and unavailable colors fail explicitly', () => {
  assert.throws(() => resolveOfficialProfile('black', null), /каталог профилей недоступен/i);
  assert.throws(() => resolveOfficialProfile('black', []), /отсутствует тип профиля/i);
  const noGold: ProfileCatalogRecord[] = catalog.map(record => record.kind === 'connector' ? { ...record, colors: ['black'] } : record);
  assert.throws(() => resolveOfficialProfile('gold', noGold), /не поддерживает цвет/i);
});

check('legacy gold light is rejected instead of being recolored to black', () => {
  assert.throws(() => resolveOfficialProfile('gold_light', catalog), /доступен только чёрный цвет/i);
  assert.throws(() => resolveOfficialProfile('metallic_light', catalog), /доступен только чёрный цвет/i);
});

check('per-divider and horizontal style overrides replace their base runs', () => {
  assert.deepEqual(
    distributeProfileStyleRuns('black', 3, [
      { style: 'gold_gap', replacesBase: true },
      { style: 'none', replacesBase: true },
      { style: 'bronze', replacesBase: false },
    ]),
    { black: 1, gold_gap: 1, bronze: 1 },
  );
  assert.deepEqual(
    distributeProfileStyleRuns('none', 0, [{ style: 'black_light', replacesBase: false }]),
    { black_light: 1 },
  );
});

check('wall-niche decorative edges use configured side styles and count each drawn corner once', () => {
  const runs = collectNicheVerticalProfileRuns(4, [
    { vProfileStyle: 'none' },
    { vProfileStyle: 'gold_gap', wallHeightMm: 2450 },
    { vProfileStyle: 'none', wallHeightMm: 1900 },
    { vProfileStyle: 'black' },
  ], 2800);
  assert.deepEqual(runs, [
    { style: 'gold_gap', lengthMm: 2450, surfaceIndex: 1, cornerIndex: 0 },
    { style: 'black', lengthMm: 2800, surfaceIndex: 3, cornerIndex: 2 },
  ]);
  assert.equal(needsFallbackCornerProfile(true, false, 'none', 'none', true), false);
  assert.equal(needsFallbackCornerProfile(true, false, 'none', 'none', false), true);
  assert.equal(needsFallbackCornerProfile(false, false, 'none', 'none', false), false);
  assert.equal(needsFallbackCornerProfile(true, true, 'none', 'none', false), false);
});

check('an individual unsupported gold_light divider run fails quote resolution', () => {
  const perRunStyles = distributeProfileStyleRuns('black', 1, [
    { style: 'gold_light', replacesBase: true },
  ]);
  assert.deepEqual(perRunStyles, { gold_light: 1 });
  assert.throws(
    () => Object.keys(perRunStyles).forEach(style => resolveOfficialProfile(style, catalog)),
    /доступен только чёрный цвет/i,
  );
});

check('edge profiles are left to their legacy quote path', () => {
  assert.equal(resolveOfficialProfile('edge_gold', catalog), null);
});

check('saved price identifiers and established default numbers are unchanged', () => {
  const before = DEFAULT_MOLDING_PRICES.map(({ id, defaultPrice }) => [id, defaultPrice]);
  const originalEstablished = [
    ['black', 890], ['metallic', 940], ['bronze', 990], ['gap', 1090], ['light', 1490],
    ['edge_black', 790], ['edge_metallic', 790], ['edge_bronze', 790], ['edge', 790],
  ];
  for (const [id, price] of originalEstablished) {
    assert.equal(DEFAULT_MOLDING_PRICES.find(item => item.id === id)?.defaultPrice, price);
  }
  assert.deepEqual(before.filter(([id]) => ['black', 'metallic', 'bronze', 'gap', 'light', 'edge_black', 'edge_metallic', 'edge_bronze', 'edge'].includes(String(id))), originalEstablished);
  assert.equal(DEFAULT_MOLDING_PRICES.find(item => item.id === 'gold')?.defaultPrice, 990);
  for (const id of ['gold_gap', 'bronze_gap', 'metallic_gap']) {
    assert.equal(DEFAULT_MOLDING_PRICES.find(item => item.id === id)?.defaultPrice, 1090);
  }
  assert.equal(resolveMoldingPriceAlias('black_gap'), 'gap');
  assert.equal(resolveMoldingPriceAlias('gold_gap'), 'gold_gap');
  assert.equal(resolveMoldingPriceAlias('black_light'), 'light');
  assert.equal(resolveMoldingProductPriceAlias('gold_gap'), 'gold_gap');
  assert.equal(resolveMoldingProductPriceAlias('metallic_gap'), 'metallic_gap');
});

check('manager and DB fallback price precedence is unchanged and metadata is irrelevant', () => {
  assert.equal(resolveMoldingPrice('black_gap', { gap: 1300 }, {}, DEFAULT_MOLDING_PRICES), 1300);
  assert.equal(resolveMoldingPrice('gold_gap', { gap: 1325 }, {}, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('gold_gap', { gap: 1325, gold_gap: 1425 }, {}, DEFAULT_MOLDING_PRICES), 1425);
  assert.equal(resolveMoldingPrice('black_light', { light: 1600 }, {}, DEFAULT_MOLDING_PRICES), 1600);
  assert.equal(resolveMoldingPrice('bronze_gap', {}, { gap: 1200 }, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('gold_gap', {}, {}, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('black', {}, {}, DEFAULT_MOLDING_PRICES), 890);
});

check('official import never activates unrelated legacy product rates', () => {
  const prices = buildLegacyMoldingPriceMap([
    { category: 'molding', series: 'Профиль соединительный с разрывом', cost: 3000 },
    { category: 'molding', series: 'Профиль соединительный с подсветкой', cost: 1100 },
    { category: 'molding', series: 'Профиль торцевой', cost: 1200 },
    { category: 'molding', series: 'Профиль торцевой', cost: 1100 },
    { category: 'panel', series: 'Профиль чёрный', cost: 1 },
  ], DEFAULT_MOLDING_PRICES);
  assert.deepEqual(prices, { edge: 1100 });
  assert.equal(resolveMoldingPrice('gold_gap', {}, prices, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('black_gap', {}, prices, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('black_light', {}, prices, DEFAULT_MOLDING_PRICES), 1490);
  assert.equal(resolveMoldingPrice('black', { black: 1100 }, prices, DEFAULT_MOLDING_PRICES), 1100);
  assert.equal(resolveMoldingPrice('edge', {}, prices, DEFAULT_MOLDING_PRICES), 1100);
});

check('colored gap prices stay independent and honor their exact legacy product rates', () => {
  const prices = buildLegacyMoldingPriceMap([
    { category: 'molding', series: 'Профиль золото с разрывом', cost: 1750 },
    { category: 'molding', series: 'Профиль с разрывом', cost: 2200 },
  ], DEFAULT_MOLDING_PRICES);
  assert.equal(resolveMoldingPrice('gold_gap', { gap: 2500 }, prices, DEFAULT_MOLDING_PRICES), 1750);
  assert.equal(resolveMoldingPrice('gold_gap', { gold_gap: 1850, gap: 2500 }, prices, DEFAULT_MOLDING_PRICES), 1850);
  assert.equal(resolveMoldingPrice('bronze_gap', { gap: 2500 }, prices, DEFAULT_MOLDING_PRICES), 1090);
  assert.equal(resolveMoldingPrice('black_gap', { gap: 2500 }, prices, DEFAULT_MOLDING_PRICES), 2500);
});