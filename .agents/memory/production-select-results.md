---
name: Production SELECT result validation
description: Avoid treating a successful production SQL wrapper as proof of a returned dataset.
---

Require the expected result header and parseable dataset when consuming production read-only queries, especially for safety reports.

**Why:** A query with an ambiguous column returned a proper error in development, but the production callback reported success with only `START TRANSACTION` / `ROLLBACK` output. There was no SELECT dataset. Treating that as zero references would falsely imply files were unreferenced.

**How to apply:** Fail closed on missing or malformed query results. Distinguish an explicit empty array in a successfully parsed result from an absent dataset; never authorize cleanup or declare a clean inventory from the callback's success flag alone.

TypeScript query annotations are not runtime decoders. For safety-critical catalog results, project standard transport types and check the actual returned shape.

**Why:** The PostgreSQL driver returned a catalog `name[]` value as a string despite a `string[]` annotation. Schema-isolation checks must not assume a declared TypeScript type proves the connection is isolated.

**How to apply:** Prefer explicit standard SQL types or JSON for catalog projections, then validate the decoded data before using it as a deletion or isolation gate.