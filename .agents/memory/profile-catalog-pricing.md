---
name: Official profile catalog pricing boundary
description: Why importing official profile articles must not replace configurable profile rates.
---

Importing official profile metadata is not authorization to replace existing profile prices or infer a price from an unrelated legacy product.

**Why:** A base article can cover several colors with different configured rates. A metadata-only source has no tariff to authorize zero prices, a shared rate, or a rate borrowed from an unrelated legacy product.

**How to apply:** Keep quote color identity and editable pricing distinct from base-article metadata. Metadata imports and corrections must preserve configured rates; adding a new color must not silently reuse a different color's configured rate. Compare effective quote prices, not just stored-setting fingerprints: adding a series-name alias can activate an unrelated legacy product rate without changing any stored settings.

Saving several color prices must use one complete settings write and report success only after that write is acknowledged. Metadata and prices have separate save outcomes.

**Why:** The legacy individual-price callbacks each replace the whole price map. Calling them in parallel for one form can lose earlier colors through out-of-order requests, and a shared last-save status can hide a partial failure.

**How to apply:** Merge explicitly edited colors into the existing map, preserving other colors and historical settings. A deliberate price change should update any existing alias for the same physical color, without altering aliases for other colors. Keep drafts on failure; do not activate local prices before server confirmation.