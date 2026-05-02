import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { entriesTable } from "./entries";

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entry_id: uuid("entry_id").notNull().references(() => entriesTable.id),
  reason: text("reason").notNull(),
  details: text("details"),
  reporter_email: text("reporter_email"),
  reporter_ip: text("reporter_ip"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
