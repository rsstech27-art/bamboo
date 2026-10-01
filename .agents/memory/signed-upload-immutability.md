---
name: Signed-upload immutability
description: Why attaching a client-uploaded PDF requires more than path validation and an expiring ownership token.
---

An attachment must refer to the validated immutable bytes. Scope client permissions to one order and one server-issued upload path, expire them, and prevent replacement atomically.

**Why:** A signed PUT URL remains writable until it expires, even after attachment permission is consumed. Saving the upload path directly allows later changes to bypass PDF validation.

**How to apply:** Validate a specific storage generation and copy that same generation to a new private destination not covered by the PUT URL before attaching it. Do not add manager replacement controls: the requested order-card PDF interface is download-only.

Reclamation must rely on server-owned provenance, not PDF MIME alone. Keep historical objects in the shared uploads namespace unless their purpose can be independently established.

**Why:** Historical uploads have no durable record identifying the feature that issued them. A MIME-based sweep could delete another feature's PDF. New order uploads use an exclusive namespace; accepting old upload permissions remains safe, but does not make unidentified historical files safe to reclaim.

**How to apply:** Restrict automatic cleanup to exclusively owned namespaces or independently verified records. Do not infer ownership from filename or content type during a migration.

Synchronize attachment commits with reclamation across API instances; age alone cannot rule out a stalled database write. Do not immediately delete a copied object after an ambiguous database failure.

**Why:** A request can stall beyond a retention window, and a failed commit response does not prove that the database rejected the commit. Deleting in either case can leave an order referencing a missing PDF.

**How to apply:** Hold the same transaction-scoped database lock during copy/attachment and reference-check/deletion. Revalidate permissions after waiting for the lock; defer orphan deletion until the retention period and a successful fresh reference check.