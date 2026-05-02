import { Router } from "express";
import { db } from "@workspace/db";
import {
  countriesTable,
  regionsTable,
  citiesTable,
} from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { slugify } from "../lib/locationSlug";
import { z } from "zod";

const router = Router();

const COUNTRY_SEED = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "BE", name: "Belgium" },
  { code: "NL", name: "Netherlands" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "PL", name: "Poland" },
  { code: "UA", name: "Ukraine" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "SG", name: "Singapore" },
  { code: "PH", name: "Philippines" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "HN", name: "Honduras" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "RU", name: "Russia" },
  { code: "TR", name: "Turkey" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "EG", name: "Egypt" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "IL", name: "Israel" },
  { code: "GR", name: "Greece" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "IE", name: "Ireland" },
  { code: "PE", name: "Peru" },
  { code: "VE", name: "Venezuela" },
  { code: "EC", name: "Ecuador" },
  { code: "GT", name: "Guatemala" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panama" },
  { code: "DO", name: "Dominican Republic" },
  { code: "CU", name: "Cuba" },
  { code: "JM", name: "Jamaica" },
  { code: "PR", name: "Puerto Rico" },
  { code: "NP", name: "Nepal" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "TZ", name: "Tanzania" },
  { code: "ET", name: "Ethiopia" },
  { code: "MA", name: "Morocco" },
  { code: "DZ", name: "Algeria" },
  { code: "TN", name: "Tunisia" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "BO", name: "Bolivia" },
  { code: "SK", name: "Slovakia" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "RS", name: "Serbia" },
  { code: "SI", name: "Slovenia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
];

async function ensureCountriesSeeded(): Promise<void> {
  const existing = await db.select({ code: countriesTable.code }).from(countriesTable);
  const existingCodes = new Set(existing.map((c) => c.code));
  const toInsert = COUNTRY_SEED.filter((c) => !existingCodes.has(c.code)).map(
    (c) => ({ code: c.code, name: c.name, slug: slugify(c.name) }),
  );
  if (toInsert.length > 0) {
    await db.insert(countriesTable).values(toInsert).onConflictDoNothing();
  }
}

router.get("/locations", async (req, res) => {
  try {
    await ensureCountriesSeeded();
    const type = req.query["type"] as string | undefined;

    if (type === "countries") {
      const countries = await db
        .select({ id: countriesTable.id, code: countriesTable.code, name: countriesTable.name, slug: countriesTable.slug })
        .from(countriesTable)
        .orderBy(countriesTable.name);
      return res.json({ countries });
    }

    if (type === "regions") {
      const countryId = Number(req.query["country_id"]);
      if (!countryId) return res.status(400).json({ error: "country_id required" });
      const regions = await db
        .select({ id: regionsTable.id, name: regionsTable.name, slug: regionsTable.slug })
        .from(regionsTable)
        .where(eq(regionsTable.country_id, countryId))
        .orderBy(regionsTable.name);
      return res.json({ regions });
    }

    if (type === "cities") {
      const countryId = Number(req.query["country_id"]);
      if (!countryId) return res.status(400).json({ error: "country_id required" });
      const regionId = req.query["region_id"] ? Number(req.query["region_id"]) : undefined;
      const cities = regionId
        ? await db
            .select({ id: citiesTable.id, name: citiesTable.name, slug: citiesTable.slug, region_id: citiesTable.region_id })
            .from(citiesTable)
            .where(eq(citiesTable.country_id, countryId))
            .orderBy(citiesTable.name)
        : await db
            .select({ id: citiesTable.id, name: citiesTable.name, slug: citiesTable.slug, region_id: citiesTable.region_id })
            .from(citiesTable)
            .where(eq(citiesTable.country_id, countryId))
            .orderBy(citiesTable.name);
      return res.json({ cities });
    }

    const countries = await db
      .select({ id: countriesTable.id, code: countriesTable.code, name: countriesTable.name, slug: countriesTable.slug })
      .from(countriesTable)
      .orderBy(countriesTable.name);
    return res.json({ countries });
  } catch (e) {
    console.error("GET /locations error:", e);
    return res.status(500).json({ error: "Failed to load locations." });
  }
});

const createCitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  country_id: z.number().int().positive(),
  region_id: z.number().int().positive().optional().nullable(),
});

router.post("/locations", async (req, res) => {
  const parsed = createCitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input." });
  }
  const { name, country_id, region_id } = parsed.data;

  try {
    const slug = slugify(name);
    const existing = await db
      .select({ id: citiesTable.id, name: citiesTable.name, slug: citiesTable.slug })
      .from(citiesTable)
      .where(eq(citiesTable.country_id, country_id))
      .limit(200);

    const match = existing.find(
      (c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) {
      return res.json({ city: match });
    }

    const [city] = await db
      .insert(citiesTable)
      .values({ name, country_id, region_id: region_id ?? null, slug })
      .returning({ id: citiesTable.id, name: citiesTable.name, slug: citiesTable.slug });

    return res.status(201).json({ city });
  } catch (e) {
    console.error("POST /locations error:", e);
    return res.status(500).json({ error: "Failed to create city." });
  }
});

export default router;
