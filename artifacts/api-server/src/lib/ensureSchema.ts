import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Idempotently ensure all required tables and constraints exist.
 * Safe to run on every startup; uses IF NOT EXISTS guards.
 */
export async function ensureSchema(): Promise<void> {
  logger.info("Running schema check…");

  // 1. manager_settings key-value store
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS manager_settings (
      key        TEXT        PRIMARY KEY,
      value      JSONB       NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 2. Unique index on products.article (required by seed ON CONFLICT).
  //    IF NOT EXISTS is idempotent — safe whether drizzle-kit push ran or not.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS products_article_unique ON products (article)
  `);

  logger.info("Schema check complete.");
}
