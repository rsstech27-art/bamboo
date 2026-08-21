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

  // 3. connect-pg-simple session table.
  //    Created here instead of using createTableIfMissing because that option
  //    reads table.sql from disk, which breaks after esbuild bundling.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid"    varchar      NOT NULL COLLATE "default",
      "sess"   json         NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
      ) THEN
        ALTER TABLE "session" ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
      END IF;
    END $$
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire)
  `);

  // 4. pdf_path column on orders (added after initial schema creation)
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pdf_path TEXT
  `);

  logger.info("Schema check complete.");
}
