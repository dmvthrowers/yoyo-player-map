import { pgTable, text, uuid, boolean, doublePrecision, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { parentConsentsTable } from "./parentConsents";
import { countriesTable } from "./countries";
import { regionsTable } from "./regions";
import { citiesTable } from "./cities";

export const entriesTable = pgTable("entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  display_name: text("display_name").notNull(),
  email: text("email").notNull(),
  entity_type: text("entity_type").$type<"person" | "shop" | "club">().notNull().default("person"),
  city_id: integer("city_id").notNull().references(() => citiesTable.id),
  region_id: integer("region_id").references(() => regionsTable.id),
  country_id: integer("country_id").notNull().references(() => countriesTable.id),
  city: text("city").notNull(),
  region: text("region"),
  country: text("country").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  exact_lat: doublePrecision("exact_lat"),
  exact_lng: doublePrecision("exact_lng"),
  bio: text("bio"),
  socials: jsonb("socials").$type<Record<string, string>>().default(sql`'{}'::jsonb`),
  age_band: text("age_band"),
  address_line: text("address_line"),
  postal_code: text("postal_code"),
  hours: text("hours"),
  club_meeting_info: text("club_meeting_info"),
  club_venue_public: boolean("club_venue_public").default(false),
  contact_name: text("contact_name"),
  parent_consent_id: uuid("parent_consent_id").references(() => parentConsentsTable.id),
  is_visible: boolean("is_visible").notNull().default(false),
  is_flagged: boolean("is_flagged").notNull().default(false),
  flagged_reason: text("flagged_reason"),
  auto_hidden_by_reports: boolean("auto_hidden_by_reports").notNull().default(false),
  verified_owner: boolean("verified_owner").notNull().default(false),
  deleted_at: timestamp("deleted_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type Entry = typeof entriesTable.$inferSelect;
