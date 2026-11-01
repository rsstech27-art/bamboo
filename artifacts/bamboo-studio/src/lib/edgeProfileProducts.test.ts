import assert from 'node:assert/strict';
import { isEdgeProfileProduct } from './edgeProfileProducts.ts';

const definitions = [
  { id: 'black', name: 'Профиль чёрный' },
  { id: 'edge', name: 'Профиль торцевой' },
  { id: 'edge_black', name: 'Профиль торцевой чёрный' },
];
const products = [
  { id: 1, category: 'molding', series: 'Профиль торцевой', article: 'PR-BLACK', color: 'Черный', cost: 1100 },
  { id: 2, category: 'molding', series: 'Профиль торцевой', article: 'PR-Metall', color: 'Металлик', cost: 1200 },
  { id: 3, category: 'molding', series: 'Профиль торцевой чёрный', article: 'OLD-BLACK', color: 'Черный', cost: 900 },
  { id: 4, category: 'molding', series: 'Профиль чёрный', article: 'CONNECTOR', color: 'Черный', cost: 890 },
  { id: 5, category: 'panel', series: 'Профиль торцевой', article: 'PANEL', color: null, cost: 100 },
];
const before = JSON.stringify(products);
assert.deepEqual(products.filter(p => isEdgeProfileProduct(p, definitions)).map(p => p.id), [1, 2, 3]);
assert.deepEqual(products.filter(p => !isEdgeProfileProduct(p, definitions)).map(p => p.id), [4, 5]);
assert.equal(isEdgeProfileProduct({ category: 'molding', series: null }, definitions), false);
assert.equal(isEdgeProfileProduct({ category: 'molding', series: 'Соединительный торцевой' }, definitions), false);
assert.equal(isEdgeProfileProduct(products[0], []), false);
assert.equal(JSON.stringify(products), before, 'Grouping must not mutate product identity or prices');
console.log('Edge profiles: grouped colors, legacy variants, separate connectors, empty catalog, and immutable prices passed.');
