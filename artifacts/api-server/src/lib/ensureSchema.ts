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

  // 2. Unique constraint on products.article (required by seed ON CONFLICT)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
          AND table_name      = 'products'
          AND constraint_name = 'products_article_unique'
      ) THEN
        ALTER TABLE products
          ADD CONSTRAINT products_article_unique UNIQUE (article);
      END IF;
    END
    $$
  `);

  logger.info("Schema check complete.");
}
