import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const countriesTable = pgTable("countries", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const insertCountrySchema = createInsertSchema(countriesTable).omit({ id: true });
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countriesTable.$inferSelect;
