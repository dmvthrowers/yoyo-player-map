import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const geocodeCacheTable = pgTable("geocode_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  query_hash: text("query_hash").notNull().unique(),
  query_kind: text("query_kind").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export type GeocodeCache = typeof geocodeCacheTable.$inferSelect;
