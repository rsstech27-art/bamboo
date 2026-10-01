---
name: Signed-upload immutability
description: Why attaching a client-uploaded PDF requires more than path validation and an expiring ownership token.
---

An attachment must refer to the validated immutable bytes. Scope client permissions to one order and one server-issued upload path, expire them, and prevent replacement atomically.

**Why:** A signed PUT URL remains writable until it expires, even after attachment permission is consumed. Saving the upload path directly allows later changes to bypass PDF validation.

**How to apply:** Validate a specific storage generation and copy that same generation to a new private destination not covered by the PUT URL before attaching it. Do not add manager replacement controls: the requested order-card PDF interface is download-only.