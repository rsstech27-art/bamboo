// Panel cut-optimization calculations for the commercial proposal (КП).
// Pure functions — kept free of React/DOM so they can be unit-tested with plain Node.

// Physical panel dimensions: 2800 mm (H) x 1220 mm (W)
export const PANEL_H_MM = 2800;
export const PANEL_W_MM = 1220;
export const PANEL_AREA_M2 = (PANEL_H_MM / 1000) * (PANEL_W_MM / 1000); // 3.416 m²

export type OptimizedPanelResult = {
  needed: number;
  fullRows: number;
  remMm: number;
  donorPanels: number;
  stripsPerPanel: number;
};

// Optimized panel count for a grid of `columns` × height:
// full rows use whole panels; the remaining strip height is CUT from as few
// donor panels as possible (one 2800 mm panel yields floor(2800/rem) strips).
// Invariants:
//  - columns ≤ 0 → zero panels needed;
//  - height ≤ 0 / not set → treated as exactly one panel height;
//  - remMm > 0 ⇒ donorPanels ≥ 1 and stripsPerPanel ≥ 1 (never «0 панелей на 0 полос»);
//  - remMm === 0 ⇒ donorPanels === 0 and stripsPerPanel === 0 (no докрой line shown).
export const optimizedPanelCalc = (columns: number, heightMm: number): OptimizedPanelResult => {
  if (columns <= 0) return { needed: 0, fullRows: 1, remMm: 0, donorPanels: 0, stripsPerPanel: 0 };
  const h = heightMm > 0 ? heightMm : PANEL_H_MM;
  // Every column always needs at least one base panel; donor-strip
  // optimization applies only to the remainder ABOVE full panel rows.
  const fullRows = Math.max(1, Math.floor(h / PANEL_H_MM));
  let remMm = h - fullRows * PANEL_H_MM;
  if (remMm < 1) remMm = 0; // exact multiple (or height ≤ one panel)
  let donorPanels = 0, stripsPerPanel = 0;
  if (remMm > 0) {
    stripsPerPanel = Math.max(1, Math.floor(PANEL_H_MM / remMm));
    donorPanels = Math.ceil(columns / stripsPerPanel);
  }
  return { needed: columns * fullRows + donorPanels, fullRows, remMm, donorPanels, stripsPerPanel };
};

// Width-offcut reuse: narrow full-height strips (width < 1220 mm) from different
// walls/rows are cut from SHARED donor panels instead of one panel per strip.
// First-fit decreasing bin packing; returns how many 1220-wide panels are needed.
export const packWidthRemainders = (piecesMm: number[]): number => {
  const sorted = piecesMm.filter(p => p > 0).sort((a, b) => b - a);
  const bins: number[] = []; // remaining usable width of each opened panel
  for (const p of sorted) {
    const i = bins.findIndex(b => b >= p);
    if (i >= 0) bins[i] -= p; else bins.push(PANEL_W_MM - p);
  }
  return bins.length;
};

// Profile pieces are 3 m long. Given required run lengths (mm), count how many
// 3 m pieces are needed — long runs are spliced from full pieces, and all
// remainders/short runs are packed FFD so offcuts are reused (project-wide optimization).
export const PROFILE_LEN_MM = 3000;
export const packProfileRuns = (runsMm: number[]): number => {
  let fullPieces = 0;
  const shorts: number[] = [];
  for (const L of runsMm) {
    if (L <= 0) continue;
    fullPieces += Math.floor(L / PROFILE_LEN_MM);
    const rem = L % PROFILE_LEN_MM;
    if (rem > 0) shorts.push(rem);
  }
  const bins: number[] = [];
  for (const p of shorts.sort((a, b) => b - a)) {
    const i = bins.findIndex(b => b >= p);
    if (i >= 0) bins[i] -= p; else bins.push(PROFILE_LEN_MM - p);
  }
  return fullPieces + bins.length;
};

// Joints on a CLOSED column contour: panels wrap the full perimeter, so a
// contour of N panels has N vertical joints; each загиб (wrapped corner)
// removes one joint. `visibleJoints` — joints already counted on the visible
// faces (incl. corner profiles); the rest belong to the hidden part.
export const columnHiddenJoints = (perRow: number, visibleJoints: number, wrappedCorners: number): number => {
  if (perRow <= 1) return 0; // a single panel wraps onto itself — no joints beyond the visible ones
  const totalJoints = Math.max(0, perRow - Math.max(0, wrappedCorners));
  return Math.max(0, totalJoints - Math.max(0, visibleJoints));
};

// Russian plural form: 1 панель / 2–4 панели / 5+ панелей (handles 11–14, 21, 22…)
export const pluralRu = (n: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(Math.trunc(n));
  const d10 = abs % 10, d100 = abs % 100;
  if (d100 >= 11 && d100 <= 14) return many;
  if (d10 === 1) return one;
  if (d10 >= 2 && d10 <= 4) return few;
  return many;
};

export const panelsWord = (n: number) => pluralRu(n, 'панель', 'панели', 'панелей');
export const rowsWord = (n: number) => pluralRu(n, 'ряд', 'ряда', 'рядов');
