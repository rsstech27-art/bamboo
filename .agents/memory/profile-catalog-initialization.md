---
name: Official catalog initialization in each environment
description: Publishing the catalog schema does not initialize its official reference records.
---

Treat deployment of the profile catalog schema and initialization of official profile records as separate steps.

**Why:** The development catalog can be populated while the published database has the same table but no records. Quote generation correctly refuses to invent an official article when its metadata is missing.

**How to apply:** Check actual records in the environment reporting the failure. Initialize missing official records through the authorized manager import, which preserves existing records and pricing. Do not bypass quote validation, overwrite manager edits, or add startup/deployment DDL to address missing data.