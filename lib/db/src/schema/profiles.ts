import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profileCatalogTable = pgTable(
  "profile_catalog",
  {
    kind: text("kind").primaryKey(),
    article: text("article").notNull(),
    name: text("name").notNull(),
    colors: text("colors").array().notNull(),
    lengthMm: integer("length_mm").notNull().default(3000),
    panelThicknessesMm: integer("panel_thicknesses_mm").array().notNull().default([5, 8]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("profile_catalog_article_unique").on(table.article),
    check("profile_catalog_kind_check", sql`${table.kind} IN ('connector', 'gap', 'light')`),
    check("profile_catalog_length_check", sql`${table.lengthMm} = 3000`),
    check(
      "profile_catalog_panel_thicknesses_check",
      sql`${table.panelThicknessesMm} = ARRAY[5, 8]::integer[]`,
    ),
  ],
);

export const insertProfileCatalogSchema = createInsertSchema(profileCatalogTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const selectProfileCatalogSchema = createSelectSchema(profileCatalogTable);

export type InsertProfileCatalog = z.infer<typeof insertProfileCatalogSchema>;
export type ProfileCatalogEntry = typeof profileCatalogTable.$inferSelect;