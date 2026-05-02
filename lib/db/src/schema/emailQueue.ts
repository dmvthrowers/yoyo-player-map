import { pgTable, uuid, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const emailQueueTable = pgTable("email_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  template: text("template").notNull(),
  to_email: text("to_email").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  not_before: timestamp("not_before").notNull(),
  sent_at: timestamp("sent_at"),
  attempts: integer("attempts").notNull().default(0),
  last_error: text("last_error"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type EmailQueue = typeof emailQueueTable.$inferSelect;
