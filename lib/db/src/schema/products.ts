import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  article: text("article").notNull(),
  collection: text("collection"),
  series: text("series"),
  cost: integer("cost").notNull().default(0),
  photoUrl: text("photo_url"),
  /** Уменьшить масштаб текстуры в визуализаторе (textureScale = 8) */
  scaleDown: boolean("scale_down").notNull().default(false),
  /** Использовать металлический профиль на стыках с этой панелью */
  noMetallicProfile: boolean("no_metallic_profile").notNull().default(true),
  /** Название панели в КП (если отличается от name) */
  kpName: text("kp_name"),
  /** Ширина панели в мм для расчёта КП (по умолчанию 1220) */
  panelWidthMm: integer("panel_width_mm"),
  /** Высота панели в мм для расчёта КП (по умолчанию 2800) */
  panelHeightMm: integer("panel_height_mm"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("products_article_unique").on(t.article),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectProductSchema = createSelectSchema(productsTable);

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
