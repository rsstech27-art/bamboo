export interface ProfileStyleOverrideRun {
  style: string;
  /** Whether this explicit run replaces one occurrence already counted as the base style. */
  replacesBase: boolean;
}

/**
 * Distribute an existing profile count over its base style and any explicit
 * per-run styles, subtracting only the base runs that an override replaces.
 */
export function distributeProfileStyleRuns(
  baseStyle: string,
  baseCount: number,
  overrides: readonly ProfileStyleOverrideRun[],
): Record<string, number> {
  const safeBaseCount = Number.isFinite(baseCount) ? Math.max(0, Math.floor(baseCount)) : 0;
  const replacedBaseCount = overrides.filter(override => override.replacesBase).length;
  const remainingBaseCount = Math.max(0, safeBaseCount - replacedBaseCount);
  const counts: Record<string, number> = {};

  if (baseStyle !== 'none' && remainingBaseCount > 0) {
    counts[baseStyle] = remainingBaseCount;
  }
  for (const override of overrides) {
    if (override.style === 'none') continue;
    counts[override.style] = (counts[override.style] ?? 0) + 1;
  }
  return counts;
}

export interface NicheProfileSurface {
  vProfileStyle?: string;
  wallHeightMm?: number;
}

export interface NicheVerticalProfileRun {
  style: string;
  lengthMm: number;
  surfaceIndex: number;
  cornerIndex: number;
}

/**
 * Mirrors the wall-niche renderer: a decorative run is drawn at each junction
 * for a configured side surface (indices 1..nQuads-1), unless its style is
 * "none". Missing/unvisited surface configs do not draw a decorative edge.
 */
export function collectNicheVerticalProfileRuns(
  nQuads: number,
  surfaces: readonly (NicheProfileSurface | null | undefined)[],
  defaultLengthMm: number,
): NicheVerticalProfileRun[] {
  const runs: NicheVerticalProfileRun[] = [];
  for (let surfaceIndex = 1; surfaceIndex < nQuads; surfaceIndex++) {
    const surface = surfaces[surfaceIndex];
    if (!surface) continue;
    const style = surface.vProfileStyle ?? 'black';
    if (style === 'none') continue;
    const configuredHeight = surface.wallHeightMm ?? 0;
    const lengthMm = configuredHeight > 0 ? configuredHeight : defaultLengthMm;
    if (lengthMm <= 0) continue;
    runs.push({ style, lengthMm, surfaceIndex, cornerIndex: surfaceIndex - 1 });
  }
  return runs;
}

/** Determines whether the ordinary metallic corner fallback adds a distinct run. */
export function needsFallbackCornerProfile(
  external: boolean,
  wrapped: boolean,
  leftStyle: string,
  rightStyle: string,
  nicheProfileAlreadyCoversCorner: boolean,
): boolean {
  return external &&
    !wrapped &&
    leftStyle === 'none' &&
    rightStyle === 'none' &&
    !nicheProfileAlreadyCoversCorner;
}