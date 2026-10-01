---
name: Catalog-aware code generation
description: Orval Zod-major inference and browser iterable types when regenerating this workspace's API clients.
---

For catalog-managed Zod dependencies, explicitly configure Orval output for the actual installed Zod major.

**Why:** Auto inference generated Zod 4-only integer helpers while the installed root import was Zod 3, so generation succeeded but the chained TypeScript build failed. A catalog dependency string was insufficient for reliable inference.

**How to apply:** Check the installed major when updating the toolchain, keep the output override in sync, and run codegen including its library typecheck. Generated browser clients may need DOM iterable typings for Headers.entries.