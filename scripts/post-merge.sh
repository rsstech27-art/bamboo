#!/bin/bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Installing locked workspace dependencies..."
pnpm install --frozen-lockfile

echo "Building shared-library declarations for merged exports..."
pnpm run typecheck:libs

echo "Synchronizing application-owned development tables..."
# Do not use --force: destructive schema changes must not be auto-approved.
schema_log="$(mktemp)"
trap 'rm -f "$schema_log"' EXIT
pnpm --filter @workspace/db run push 2>&1 | tee "$schema_log"

# drizzle-kit can log a PostgreSQL error and still exit zero. Require its
# explicit completion marker, not just the process status, before continuing.
if ! grep -Eq 'No changes detected|Changes applied' "$schema_log"; then
  echo "Schema synchronization did not confirm success; post-merge setup aborted." >&2
  exit 1
fi
