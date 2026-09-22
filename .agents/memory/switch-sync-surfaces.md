---
name: Switch-sync per-surface state
description: Pitfalls of the "globals represent the active item, array stores the rest" pattern in the bamboo-studio canvas editor
---

The wall-panel editor stores per-surface configs in a ref array while global state vars mirror only the ACTIVE surface (a persist-effect writes globals into the array; switching snapshots refs into the old slot and loads the new slot into setters).

**Why:** avoids threading a config object through dozens of existing setters/handlers in a large single-file component.

**How to apply / pitfalls found by review:**
- Every reset path (new image upload, "back" navigation) must reset BOTH the active index (state + ref) and the stored config array, or stale configs render.
- The draw loop must clamp the active index to the number of existing quads (`Math.min(idx, nQuads - 1)`).
- Undo history must be tagged with the surface index it was captured on; applying a snapshot from surface A to surface B silently corrupts state.
- Interactive hit-testing helpers (dividers, molding handles, ratio projections) must operate on the active quad only.
