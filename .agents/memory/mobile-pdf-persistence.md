---
name: Mobile PDF persistence and recovery
description: Why downloads must follow attachment, and why recovered PDFs use historical snapshots.
---

Treat a device PDF download as potentially leaving the page. Finish server upload and attachment before automatically opening or downloading a file. An explicit local download can remain available after a failed attachment, alongside a clear warning.

**Why:** A mobile order was saved without any subsequent PDF upload request while the old flow initiated device download first. Mobile PDF viewers/navigation can interrupt pending browser work.

**How to apply:** Keep PDF persistence separate from device download. Retry an attachment against its known existing order, not by creating another order. This does not solve an ambiguous lost order-creation response; server-side deduplication is still required for that case.

Reconstruct missing PDFs only from the saved historical quote, preserve its final total, and label the document as reconstructed. Offer attachment of the original device file when the exact original is needed.

**Why:** The original document itself may never have reached storage, and the quote snapshot does not preserve every original document setting. Repricing against today's catalog would change the historical offer.

**How to apply:** Never use current manager prices to restore an old order, and never replace an already attached PDF through the recovery action.