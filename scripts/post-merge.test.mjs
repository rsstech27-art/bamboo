import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtures = mkdtempSync(join(tmpdir(), "post-merge-test-"));
try {
  writeFileSync(join(fixtures, "pnpm"), `#!/bin/bash
if [ "$1" = install ]; then exit 0; fi
if [ "$1" = run ] && [ "$2" = typecheck:libs ]; then
  if [ "$MOCK_SCHEMA_RESULT" = libs_failed ]; then exit 9; fi
  exit 0
fi
case "$MOCK_SCHEMA_RESULT" in
  unchanged) echo "[i] No changes detected";;
  applied) echo "[✓] Changes applied";;
  masked_error) echo "error: cannot drop a dependent sequence" >&2; exit 0;;
  failed) echo "database unavailable" >&2; exit 7;;
esac
`, { mode: 0o700 });

  for (const [mode, shouldSucceed] of [
    ["unchanged", true],
    ["applied", true],
    ["masked_error", false],
    ["failed", false],
    ["libs_failed", false],
  ]) {
    const result = spawnSync("bash", [
      fileURLToPath(new URL("./post-merge.sh", import.meta.url)),
    ], {
      cwd: tmpdir(),
      encoding: "utf8",
      env: { ...process.env, PATH: `${fixtures}:${process.env.PATH}`, MOCK_SCHEMA_RESULT: mode },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status === 0, shouldSucceed, `${mode}: ${result.stdout}\n${result.stderr}`);
    console.log(`✓ post-merge ${mode}`);
  }
} finally {
  rmSync(fixtures, { recursive: true, force: true });
}