import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { entriesTable } from "./entries";

export const verificationTokensTable = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entry_id: uuid("entry_id").notNull().references(() => entriesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  purpose: text("purpose").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type VerificationToken = typeof verificationTokensTable.$inferSelect;
