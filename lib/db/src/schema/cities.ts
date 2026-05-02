import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { countriesTable } from "./countries";
import { regionsTable } from "./regions";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  country_id: integer("country_id").notNull().references(() => countriesTable.id),
  region_id: integer("region_id").references(() => regionsTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const insertCitySchema = createInsertSchema(citiesTable).omit({ id: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof citiesTable.$inferSelect;
