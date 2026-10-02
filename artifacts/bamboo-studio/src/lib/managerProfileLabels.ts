// Display labels only. Do not rename pricing definitions or stored series:
// legacy product-price matching uses their original exact names.
export const MANAGER_PROFILE_GROUPS = [
  { id: 'connector', label: 'Соединительные профили' },
  { id: 'gap', label: 'Соединительные профили с разрывом' },
  { id: 'light', label: 'Соединительные профили с подсветкой' },
  { id: 'edge', label: 'Торцевые профили' },
  { id: 'other', label: 'Другие профили' },
] as const;

export function getManagerProfileGroup(id: string): typeof MANAGER_PROFILE_GROUPS[number]['id'] {
  if (id === 'edge' || id.startsWith('edge_')) return 'edge';
  if (id === 'gap' || id.endsWith('_gap')) return 'gap';
  if (id === 'light' || id.endsWith('_light')) return 'light';
  if (['black', 'gold', 'bronze', 'metallic'].includes(id)) return 'connector';
  return 'other';
}

export function getManagerProfileNameOverride(id: string, originalName: string, override?: string): string | undefined {
  if (!override || override === originalName) return undefined;
  const group = getManagerProfileGroup(id);
  const namedGroup = /торцев/i.test(override) ? 'edge'
    : /подсветк/i.test(override) ? 'light'
    : /разрыв/i.test(override) ? 'gap'
    : /соединительн/i.test(override) ? 'connector' : null;
  if (namedGroup && group !== 'other' && namedGroup !== group) return undefined;
  return override;
}

export function getManagerProfileName(id: string, originalName: string, override?: string): string {
  const validOverride = getManagerProfileNameOverride(id, originalName, override);
  const genericNames = [
    'профиль соединительный', 'соединительный профиль',
    'профиль с разрывом', 'соединительный профиль с разрывом',
    'профиль с подсветкой', 'соединительный профиль с подсветкой',
    'профиль торцевой', 'торцевой профиль',
  ];
  if (validOverride && !genericNames.includes(validOverride.trim().toLowerCase())) return validOverride;
  const group = getManagerProfileGroup(id);
  if (group === 'other') return originalName;
  const color = id === 'gap' || id === 'light' ? 'black'
    : id.startsWith('edge_') ? id.slice(5)
    : id.endsWith('_gap') ? id.slice(0, -4)
    : id.endsWith('_light') ? id.slice(0, -6) : id;
  const colors: Record<string, string> = {
    black: 'чёрный', gold: 'золотой', bronze: 'бронзовый', metallic: 'металлик',
  };
  const type = group === 'edge' ? 'Торцевой профиль'
    : group === 'gap' ? 'Соединительный профиль с разрывом'
    : group === 'light' ? 'Соединительный профиль с подсветкой'
    : 'Соединительный профиль';
  return id === 'edge' ? type : colors[color] ? `${type} ${colors[color]}` : originalName;
}