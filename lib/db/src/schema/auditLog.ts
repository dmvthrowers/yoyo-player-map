import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const auditLogTable = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event").notNull(),
  actor: text("actor"),
  target_id: uuid("target_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;
