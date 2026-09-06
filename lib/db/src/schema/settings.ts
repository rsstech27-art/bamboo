import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Generic key-value store for manager settings.
 * Each row is one named setting identified by `key`; `value` is any JSON.
 */
export const managerSettingsTable = pgTable("manager_settings", {
  key:       text("key").primaryKey(),
  value:     jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ManagerSetting = typeof managerSettingsTable.$inferSelect;
