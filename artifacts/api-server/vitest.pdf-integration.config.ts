import { defineConfig } from "vitest/config";

// Explicit opt-in: the ordinary API suite must never write real storage.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/orderPdfLifecycle.integration.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 90_000,
  },
});