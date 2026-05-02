import { Router } from "express";
import { db } from "@workspace/db";
import { entriesTable, countriesTable, regionsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { normalizeRegionDisplay } from "../lib/regionNormalize";

const router = Router();

router.get("/map/entries", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: entriesTable.id,
        display_name: entriesTable.display_name,
        city: entriesTable.city,
        region: entriesTable.region,
        country: entriesTable.country,
        country_name: countriesTable.name,
        region_name: regionsTable.name,
        lat: entriesTable.lat,
        lng: entriesTable.lng,
        entity_type: entriesTable.entity_type,
        verified_owner: entriesTable.verified_owner,
      })
      .from(entriesTable)
      .leftJoin(countriesTable, eq(entriesTable.country_id, countriesTable.id))
      .leftJoin(regionsTable, eq(entriesTable.region_id, regionsTable.id))
      .where(
        and(
          eq(entriesTable.is_visible, true),
          eq(entriesTable.is_flagged, false),
          eq(entriesTable.auto_hidden_by_reports, false),
          isNull(entriesTable.deleted_at),
        ),
      );

    const entries = rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      city: row.city,
      region: normalizeRegionDisplay(row.region_name ?? row.region),
      country: row.country,
      country_name: row.country_name ?? null,
      lat: row.lat,
      lng: row.lng,
      entity_type: row.entity_type,
      verified_owner: row.verified_owner,
    }));

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.json({ entries });
  } catch (e) {
    console.error("GET /map/entries error:", e);
    return res.status(500).json({ error: "Failed to load map entries." });
  }
});

router.get("/entry/:id", async (req, res) => {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const { id } = req.params;
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: "Invalid entry id." });
  }

  try {
    const rows = await db
      .select({
        id: entriesTable.id,
        display_name: entriesTable.display_name,
        bio: entriesTable.bio,
        socials: entriesTable.socials,
        entity_type: entriesTable.entity_type,
        city: entriesTable.city,
        region: entriesTable.region,
        country: entriesTable.country,
        country_name: countriesTable.name,
        region_name: regionsTable.name,
        address_line: entriesTable.address_line,
        postal_code: entriesTable.postal_code,
        hours: entriesTable.hours,
        club_meeting_info: entriesTable.club_meeting_info,
        club_venue_public: entriesTable.club_venue_public,
        verified_owner: entriesTable.verified_owner,
      })
      .from(entriesTable)
      .leftJoin(countriesTable, eq(entriesTable.country_id, countriesTable.id))
      .leftJoin(regionsTable, eq(entriesTable.region_id, regionsTable.id))
      .where(
        and(
          eq(entriesTable.id, id),
          eq(entriesTable.is_visible, true),
          isNull(entriesTable.deleted_at),
        ),
      )
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ error: "Entry not found." });
    }

    const row = rows[0]!;
    const entry = {
      id: row.id,
      display_name: row.display_name,
      bio: row.bio,
      socials: row.socials,
      entity_type: row.entity_type,
      city: row.city,
      region: normalizeRegionDisplay(row.region_name ?? row.region),
      country: row.country,
      country_name: row.country_name ?? null,
      address_line: row.address_line,
      postal_code: row.postal_code,
      hours: row.hours,
      club_meeting_info: row.club_meeting_info,
      club_venue_public: row.club_venue_public,
      verified_owner: row.verified_owner,
    };

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return res.json(entry);
  } catch (e) {
    console.error("GET /entry/:id error:", e);
    return res.status(500).json({ error: "Failed to load entry." });
  }
});

export default router;
