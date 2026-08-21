import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Prefix → sequential number tracker
export const orderSequencesTable = pgTable("order_sequences", {
  prefix: text("prefix").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

// КП orders saved by clients
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // e.g. С-0001, ДП-0003
  prefix: text("prefix").notNull(),                    // С | СВ | ОП | ДП | ТВ | К
  zoneLabel: text("zone_label").notNull(),             // human-readable zone name
  kpData: jsonb("kp_data").notNull(),                  // full КП snapshot (items, totals, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  orderNumber: true, // assigned server-side
  createdAt: true,
});

export const selectOrderSchema = createSelectSchema(ordersTable);

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
