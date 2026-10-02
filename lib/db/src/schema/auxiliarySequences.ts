import { pgSequence } from "drizzle-orm/pg-core";

// These SERIAL sequences belong to legacy authentication tables created by
// ensureSchema. Keep their existing definitions in the Drizzle snapshot:
// tablesFilter excludes tables, but does not exclude their sequences.
const serialOptions = {
  startWith: 1,
  minValue: 1,
  maxValue: 2147483647,
  increment: 1,
  cache: 1,
  cycle: false,
};

export const managerUsersIdSequence = pgSequence("manager_users_id_seq", serialOptions);
export const managerPermissionsIdSequence = pgSequence("manager_permissions_id_seq", serialOptions);