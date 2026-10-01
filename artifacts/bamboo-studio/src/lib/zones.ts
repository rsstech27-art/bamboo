/** Stable identifiers are also used by the editor and order calculations. */
export const ZONES = [
  { id: 'wall', label: 'Стена', image: 'zones/wall.jpg' },
  { id: 'wall-niche', label: 'Стена с выступом', image: 'zones/wall-niche.jpg' },
  { id: 'window', label: 'Оконный проём', image: 'zones/window.jpg' },
  { id: 'door', label: 'Дверной проём', image: 'zones/door.jpg' },
  { id: 'tv', label: 'ТВ-зона', image: 'zones/tv.jpg' },
  { id: 'column', label: 'Колонна', image: 'zones/column.jpg' },
] as const;

export type ZoneId = (typeof ZONES)[number]['id'];

/** Add a finished zone here, then rebuild the release. */
export const RELEASE_ZONE_IDS: readonly ZoneId[] = [
  'wall', 'wall-niche', 'tv', 'column',
];

export function isReleaseZone(id: string): boolean {
  return RELEASE_ZONE_IDS.some(zoneId => zoneId === id);
}

export function getAvailableZones(isDevelopment: boolean) {
  return ZONES.filter(zone => isDevelopment || isReleaseZone(zone.id));
}

/** Unknown or unavailable states return to selection, never to another zone. */
export function resolveAvailableZone(id: string | null, isDevelopment: boolean): ZoneId | null {
  return getAvailableZones(isDevelopment).find(zone => zone.id === id)?.id ?? null;
}