import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const emailSendLogTable = pgTable("email_send_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  to_email: text("to_email").notNull(),
  template: text("template").notNull(),
  last_sent_at: timestamp("last_sent_at").notNull().defaultNow(),
});

export type EmailSendLog = typeof emailSendLogTable.$inferSelect;
