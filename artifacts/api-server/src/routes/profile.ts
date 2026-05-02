import { Router } from "express";
import { db } from "@workspace/db";
import {
  entriesTable,
  verificationTokensTable,
  parentConsentsTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { geocodeCity, geocodeAddress } from "../lib/geocode";
import { getClientIp } from "../lib/rateLimit";
import { logAudit } from "../lib/auditLog";

const router = Router();

const updateSchema = z.object({
  token: z.string().min(1),
  display_name: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().length(2).default("US"),
  bio: z.string().trim().max(280).nullable().optional(),
  socials: z
    .object({
      instagram: z.string().trim().max(50).optional().or(z.literal("")),
      youtube: z.string().trim().max(100).optional().or(z.literal("")),
      discord: z.string().trim().max(50).optional().or(z.literal("")),
      website: z.string().trim().max(200).optional().or(z.literal("")),
    })
    .optional(),
  club_meeting_info: z.string().trim().max(500).nullable().optional(),
  club_venue_public: z.boolean().optional(),
  address_line: z.string().trim().max(200).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  hours: z.string().trim().max(500).nullable().optional(),
  contact_name: z.string().trim().max(100).nullable().optional(),
});

const deleteSchema = z.object({ token: z.string().min(1) });

async function resolveToken(token: string) {
  const rows = await db
    .select({
      entry_id: verificationTokensTable.entry_id,
      expires_at: verificationTokensTable.expires_at,
      purpose: verificationTokensTable.purpose,
      used_at: verificationTokensTable.used_at,
    })
    .from(verificationTokensTable)
    .where(eq(verificationTokensTable.token, token))
    .limit(1);
  const tok = rows[0];
  if (!tok || tok.purpose !== "edit_link" || tok.used_at || new Date(tok.expires_at) < new Date()) {
    return null;
  }
  return tok;
}

router.post("/profile/update", async (req, res) => {
  const ip = getClientIp(req as unknown as { headers: Record<string, string | string[] | undefined> });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input." });
  }

  const tok = await resolveToken(parsed.data.token);
  if (!tok) return res.status(401).json({ error: "Link invalid or expired." });

  try {
    const entryRows = await db
      .select({
        city: entriesTable.city,
        region: entriesTable.region,
        country: entriesTable.country,
        lat: entriesTable.lat,
        lng: entriesTable.lng,
        entity_type: entriesTable.entity_type,
        address_line: entriesTable.address_line,
        postal_code: entriesTable.postal_code,
        club_venue_public: entriesTable.club_venue_public,
        exact_lat: entriesTable.exact_lat,
        exact_lng: entriesTable.exact_lng,
      })
      .from(entriesTable)
      .where(eq(entriesTable.id, tok.entry_id))
      .limit(1);

    const existing = entryRows[0];
    if (!existing) return res.status(404).json({ error: "Entry not found." });

    const d = parsed.data;
    let lat = existing.lat;
    let lng = existing.lng;
    let exactLat = existing.exact_lat;
    let exactLng = existing.exact_lng;

    const locationChanged =
      d.city !== existing.city ||
      (d.region ?? null) !== existing.region ||
      d.country !== existing.country;

    if (locationChanged) {
      const geo = await geocodeCity({
        city: d.city,
        region: d.region || undefined,
        country: d.country,
      });
      if (!geo) return res.status(422).json({ error: "Couldn't locate that city." });
      lat = geo.lat;
      lng = geo.lng;
    }

    const isShop = existing.entity_type === "shop";
    const isClubVenuePublic =
      existing.entity_type === "club" &&
      (d.club_venue_public ?? existing.club_venue_public) === true;
    const newAddress = d.address_line ?? existing.address_line;
    const newPostal = d.postal_code ?? existing.postal_code;
    const addressChanged =
      d.address_line !== undefined &&
      (d.address_line || null) !== existing.address_line;

    const shouldGeocodeAddress =
      !!newAddress &&
      (isShop || isClubVenuePublic) &&
      (addressChanged || locationChanged);

    if (shouldGeocodeAddress) {
      const addrGeo = await geocodeAddress({
        addressLine: newAddress!,
        city: d.city,
        region: d.region || undefined,
        postalCode: newPostal || undefined,
        country: d.country,
      });
      if (!addrGeo) return res.status(422).json({ error: "Couldn't locate that address." });
      exactLat = addrGeo.lat;
      exactLng = addrGeo.lng;
    } else if (existing.entity_type === "club" && d.club_venue_public === false) {
      exactLat = null;
      exactLng = null;
    }

    await db
      .update(entriesTable)
      .set({
        display_name: d.display_name,
        city: d.city,
        region: d.region || null,
        country: d.country,
        bio: d.bio || null,
        socials: (d.socials || {}) as Record<string, string>,
        lat,
        lng,
        exact_lat: exactLat,
        exact_lng: exactLng,
        updated_at: new Date(),
        ...(d.club_meeting_info !== undefined && { club_meeting_info: d.club_meeting_info || null }),
        ...(d.club_venue_public !== undefined && { club_venue_public: d.club_venue_public }),
        ...(d.address_line !== undefined && { address_line: d.address_line || null }),
        ...(d.postal_code !== undefined && { postal_code: d.postal_code || null }),
        ...(d.hours !== undefined && { hours: d.hours || null }),
        ...(d.contact_name !== undefined && { contact_name: d.contact_name || null }),
      })
      .where(eq(entriesTable.id, tok.entry_id));

    await logAudit("entry.updated", { targetId: tok.entry_id, meta: { ip, locationChanged } });
    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /profile/update error:", e);
    return res.status(500).json({ error: "Update failed." });
  }
});

router.post("/profile/delete", async (req, res) => {
  const ip = getClientIp(req as unknown as { headers: Record<string, string | string[] | undefined> });
  const parsed = deleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const tok = await resolveToken(parsed.data.token);
  if (!tok) return res.status(401).json({ error: "Link invalid or expired." });

  try {
    const entryRows = await db
      .select({
        id: entriesTable.id,
        parent_consent_id: entriesTable.parent_consent_id,
        email: entriesTable.email,
      })
      .from(entriesTable)
      .where(eq(entriesTable.id, tok.entry_id))
      .limit(1);

    const entry = entryRows[0];
    if (!entry) return res.status(404).json({ error: "Entry not found." });

    await db.delete(entriesTable).where(eq(entriesTable.id, entry.id));

    if (entry.parent_consent_id) {
      await db.delete(parentConsentsTable).where(eq(parentConsentsTable.id, entry.parent_consent_id));
    }

    await logAudit("entry.deleted", {
      actor: entry.email ?? undefined,
      targetId: entry.id,
      meta: { ip, type: "self" },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /profile/delete error:", e);
    return res.status(500).json({ error: "Delete failed." });
  }
});

export default router;
