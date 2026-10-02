---
name: Safe post-merge schema synchronization
description: Table filters do not protect auxiliary sequences; Drizzle SQL errors can return exit zero.
---

Post-merge schema synchronization must preserve objects owned outside Drizzle and require explicit confirmation of schema success.

**Why:** Drizzle's table filter excludes legacy authentication tables but can still plan drops for their SERIAL sequences. Its CLI has also printed a PostgreSQL dependency error while returning exit code zero, causing setup to report a false success.

**How to apply:** Keep the ownership boundary explicit and retain declarations for auxiliary sequences without migrating their parent tables. Never use force or cascade to bypass dependency errors. Validate a positive completion result in addition to process status; reassess that check when upgrading the migration CLI. Allow enough setup time for dependency installation and database introspection.