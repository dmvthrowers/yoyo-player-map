import { Router } from "express";
import { db } from "@workspace/db";
import { entriesTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router = Router();

router.get("/map/entries", async (_req, res) => {
  try {
    const entries = await db
      .select({
        id: entriesTable.id,
        display_name: entriesTable.display_name,
        city: entriesTable.city,
        region: entriesTable.region,
        country: entriesTable.country,
        lat: entriesTable.lat,
        lng: entriesTable.lng,
        entity_type: entriesTable.entity_type,
        verified_owner: entriesTable.verified_owner,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.is_visible, true),
          eq(entriesTable.is_flagged, false),
          eq(entriesTable.auto_hidden_by_reports, false),
          isNull(entriesTable.deleted_at),
        ),
      );

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
        address_line: entriesTable.address_line,
        postal_code: entriesTable.postal_code,
        hours: entriesTable.hours,
        club_meeting_info: entriesTable.club_meeting_info,
        club_venue_public: entriesTable.club_venue_public,
        verified_owner: entriesTable.verified_owner,
      })
      .from(entriesTable)
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

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return res.json(rows[0]);
  } catch (e) {
    console.error("GET /entry/:id error:", e);
    return res.status(500).json({ error: "Failed to load entry." });
  }
});

export default router;
