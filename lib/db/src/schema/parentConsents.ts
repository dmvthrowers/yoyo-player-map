import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const parentConsentsTable = pgTable("parent_consents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  minor_display_name: text("minor_display_name").notNull(),
  minor_email: text("minor_email").notNull(),
  parent_name: text("parent_name").notNull(),
  parent_email: text("parent_email").notNull(),
  relationship: text("relationship").notNull(),
  consent_token: text("consent_token").notNull().unique(),
  consented_at: timestamp("consented_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type ParentConsent = typeof parentConsentsTable.$inferSelect;
