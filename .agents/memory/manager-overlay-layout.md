---
name: Manager overlay layout
description: Preventing clipped manager editors and oversized mobile profile cards.
---

Render nested manager editors through a body portal. The full-screen manager, rather than each child dialog, should own the background scroll lock and restore it on dismissal.

**Why:** The profile editor was clipped inside the manager's scrolling layout on mobile. Independent nested scroll-lock cleanup can conflict with the lifetime of the parent overlay.

**How to apply:** Keep the editor's own scrolling bounded to the viewport, and test both editor dismissal and full manager dismissal.

Use zero-minimum grid tracks for narrow manager card lists, not implicit auto tracks. A flex parent's zero minimum width alone does not ensure its nested grid cards fit.

**Why:** Background clipping removed the page scrollbar but still left the profile cards wider than the phone viewport. Explicit zero-minimum grid tracks fixed the card bounds.

**How to apply:** Check card bounding boxes as well as document scroll width; hidden overflow can mask oversized content rather than fix it.