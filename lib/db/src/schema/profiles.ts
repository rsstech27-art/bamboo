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

export const profileCatalogMetadataSchema = z.object({
  kind: z.enum(["connector", "gap", "light"]),
  article: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  colors: z.array(z.enum(["black", "gold", "bronze", "metallic"])).min(1),
  lengthMm: z.literal(3000),
  panelThicknessesMm: z.tuple([z.literal(5), z.literal(8)]),
}).strict().superRefine((profile, ctx) => {
  if (new Set(profile.colors).size !== profile.colors.length) {
    ctx.addIssue({ code: "custom", path: ["colors"], message: "Duplicate colors" });
  }
  if (profile.kind === "light" && profile.colors.some((color) => color !== "black")) {
    ctx.addIssue({ code: "custom", path: ["colors"], message: "Light profiles only support black" });
  }
});

export type InsertProfileCatalog = z.infer<typeof insertProfileCatalogSchema>;
export type ProfileCatalogEntry = typeof profileCatalogTable.$inferSelect;

export type ProfileCatalogMetadata = z.infer<typeof profileCatalogMetadataSchema>;
