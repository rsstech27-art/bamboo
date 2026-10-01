---
name: Workspace package callback limitation
description: Replit's package callback cannot express a pnpm workspace reinstall in this environment.
---

The package installation callback requires at least one package name and runs plain `pnpm add`, without a workspace-root flag.

**Why:** An empty package list failed callback validation; requesting an already-declared root tool then failed with `ERR_PNPM_ADDING_TO_ROOT`. This is a tooling limitation, not a registry block or an application problem.

**How to apply:** Read the package-management and pnpm-workspace guidance first. For workspace-wide dependency refreshes, synchronize the existing manifests and lockfile with workspace-aware pnpm commands rather than adding a dummy dependency, disabling root checks, or weakening the release-age protection. Retain firewall protection and existing release-age exclusions.