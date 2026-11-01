import assert from 'node:assert/strict';
import { activeProductSeries } from './productSeries.ts';

const definitions = [
  { id: 'standard', name: 'Актуальное название', price: 6000 },
  { id: 'removed', name: 'Удалённая серия', price: 5000 },
  { id: 'custom', name: 'Новая серия', price: 7000 },
];
assert.deepEqual(activeProductSeries(definitions, ['removed']), [
  { name: 'Актуальное название', price: 6000 },
  { name: 'Новая серия', price: 7000 },
]);
assert.deepEqual(activeProductSeries(definitions, definitions.map(s => s.id)), []);
assert.deepEqual(activeProductSeries([], ['removed']), []);
assert.deepEqual(activeProductSeries(definitions.slice(0, 1), []), [
  { name: 'Актуальное название', price: 6000 },
]);
assert.deepEqual(activeProductSeries([
  { ...definitions[0], name: 'Переименованная серия', price: 6500 },
], []), [{ name: 'Переименованная серия', price: 6500 }]);
assert.equal(activeProductSeries(definitions, ['standard', 'removed']).length, 1);
console.log('Product series: deleted exclusion, empty catalog, custom series, current names/prices passed.');
