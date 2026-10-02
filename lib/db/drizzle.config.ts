import { defineConfig } from "drizzle-kit";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import path from "path";
import * as schema from "./src/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Auth/session/sequence tables are managed separately by the application.
// An unrestricted push would offer to delete them as "missing" from Drizzle.
const managedTables = Object.values(schema).flatMap(value =>
  is(value, PgTable) ? [getTableName(value)] : [],
);
if (managedTables.length === 0) {
  throw new Error("No application-owned Drizzle tables found; refusing schema push");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  tablesFilter: managedTables,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
