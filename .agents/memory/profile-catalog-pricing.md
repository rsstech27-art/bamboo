---
name: Official profile catalog pricing boundary
description: Why importing official profile articles must not replace configurable profile rates.
---

Importing official profile metadata is not authorization to replace existing profile prices or infer a price from an unrelated legacy product.

In «Цены → Профили», edge profiles are «Торцевой» with article MC-04, not connector profiles.

**Why:** The user explicitly identified MC-04 as the edge-profile article and corrected the classification.

**How to apply:** Use MC-04 and «Торцевой» for edge-profile price labels; do not apply connector metadata or change prices as part of this label correction.

The manager chooses available illuminated-profile colors from all four supported colors; black is not a permanent product restriction. Newly enabled colors need their own approved prices.

**Why:** The user explicitly requested manager-controlled color availability, rather than a hardcoded black-only option. Availability is not authorization to copy the black price into another color.

**How to apply:** Keep editing, server validation, visual selectors and quote validation consistent with the saved available colors. Keep existing selections and prices unchanged until the manager saves changes, and reject quotes with missing new-color prices.

Unifying the appearance of edge and connector cards is not authorization to merge their stored records or rewrite color variants.

**Why:** Edge variants already have separately managed articles, names and prices. The user's request was to make the cards look alike, not to replace the underlying catalog.

**How to apply:** Group existing edge variants for presentation while retaining their identities, individual editing/deletion and existing quote-price resolution. Do not invent thickness metadata that the edge records do not contain.

**Why:** A base article can cover several colors with different configured rates. A metadata-only source has no tariff to authorize zero prices, a shared rate, or a rate borrowed from an unrelated legacy product.

**How to apply:** Keep quote color identity and editable pricing distinct from base-article metadata. Metadata imports and corrections must preserve configured rates; adding a new color must not silently reuse a different color's configured rate. Compare effective quote prices, not just stored-setting fingerprints: adding a series-name alias can activate an unrelated legacy product rate without changing any stored settings.

Saving several color prices must use one complete settings write and report success only after that write is acknowledged. Metadata and prices have separate save outcomes.

**Why:** The legacy individual-price callbacks each replace the whole price map. Calling them in parallel for one form can lose earlier colors through out-of-order requests, and a shared last-save status can hide a partial failure.

**How to apply:** Merge explicitly edited colors into the existing map, preserving other colors and historical settings. A deliberate price change should update any existing alias for the same physical color, without altering aliases for other colors. Keep drafts on failure; do not activate local prices before server confirmation.