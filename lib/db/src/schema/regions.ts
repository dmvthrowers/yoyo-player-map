import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { countriesTable } from "./countries";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regionsTable = pgTable("regions", {
  id: serial("id").primaryKey(),
  country_id: integer("country_id").notNull().references(() => countriesTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const insertRegionSchema = createInsertSchema(regionsTable).omit({ id: true });
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regionsTable.$inferSelect;
