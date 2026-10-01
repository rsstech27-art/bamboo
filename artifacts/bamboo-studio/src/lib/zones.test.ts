import { strict as assert } from 'node:assert';
import { getAvailableZones, isReleaseZone, resolveAvailableZone, ZONES } from './zones.ts';

assert.deepEqual(getAvailableZones(false).map(zone => zone.id), [
  'wall', 'wall-niche', 'tv', 'column',
]);
assert.equal(getAvailableZones(true).length, 6);
assert.equal(new Set(ZONES.map(zone => zone.id)).size, ZONES.length);
for (const zone of ZONES) {
  assert.equal(resolveAvailableZone(zone.id, true), zone.id);
  assert.equal(resolveAvailableZone(zone.id, false), isReleaseZone(zone.id) ? zone.id : null);
}
for (const development of [true, false]) {
  assert.equal(resolveAvailableZone(null, development), null);
  assert.equal(resolveAvailableZone('unknown', development), null);
  assert.equal(resolveAvailableZone('window?dev=true', development), null);
}
assert.equal(isReleaseZone('window'), false);
assert.equal(isReleaseZone('door'), false);
console.log('Zone policy checks passed: release, development, unavailable and unknown selections.');