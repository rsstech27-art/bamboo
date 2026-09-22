---
name: Wall-niche vProfile axis
description: How the vertical decorative profile is drawn in wall-niche zones and why the axis matters.
---

## Rule
Draw the vProfile at the **right edge of the previous quad** (`pts[(qi-1)*4+1]` → `pts[(qi-1)*4+2]`), not at the side wall's own left/right corner points.

## Why
The original code used `qpts[0]→qpts[3]` (left edge of the side wall) or `qpts[1]→qpts[2]` (right edge). For typical wall-niche markings where the side wall is a shallow depth surface, those edges can appear nearly horizontal in the photo perspective. The previous-quad's right edge is the **junction line between the main wall and the niche side wall** — it always runs vertically along the main wall surface.

## How to apply
In `drawFullScene`, inside the `wallZoneRef.current === 'wall-niche'` block (around line 1979):
```js
const vp1 = pts[(qi - 1) * 4 + 1]; // top-right of previous quad
const vp2 = pts[(qi - 1) * 4 + 2]; // bottom-right of previous quad
```
Use `surfacesRef.current[qi].vProfileStyle` (from the side wall) for the style.
