import { Router } from "express";
import { db } from "@workspace/db";
import {
  entriesTable,
  verificationTokensTable,
  parentConsentsTable,
  countriesTable,
  regionsTable,
  citiesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { submitSchema, type SubmitInput, type PersonInput, type ShopInput, type ClubInput } from "../lib/validation";
import { geocodeCity, geocodeAddress } from "../lib/geocode";
import { generateToken } from "../lib/tokens";
import { sendEntryVerificationEmail, sendParentConsentEmail } from "../lib/email";
import { checkRateLimit, getClientIp } from "../lib/rateLimit";
import { logAudit } from "../lib/auditLog";

const router = Router();

function normalizeEmptyStrings(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      v === "" ? undefined : v,
    ]),
  );
}

function checkVerifiedOwner(
  email: string,
  socials?: { website?: string },
): boolean {
  if (!socials?.website) return false;
  try {
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (!emailDomain) return false;
    const websiteUrl = new URL(socials.website);
    const websiteDomain = websiteUrl.hostname.replace(/^www\./, "").toLowerCase();
    return (
      emailDomain === websiteDomain ||
      websiteDomain.endsWith("." + emailDomain)
    );
  } catch {
    return false;
  }
}

async function resolveLocationNames(
  cityId: number,
  regionId: number | null | undefined,
  countryId: number,
): Promise<{
  cityName: string;
  regionName: string | null;
  countryCode: string;
} | null> {
  const [cityRows, countryRows, regionRows] = await Promise.all([
    db.select({ name: citiesTable.name }).from(citiesTable).where(eq(citiesTable.id, cityId)).limit(1),
    db.select({ code: countriesTable.code }).from(countriesTable).where(eq(countriesTable.id, countryId)).limit(1),
    regionId
      ? db.select({ name: regionsTable.name }).from(regionsTable).where(eq(regionsTable.id, regionId)).limit(1)
      : Promise.resolve([]),
  ]);
  if (!cityRows[0] || !countryRows[0]) return null;
  return {
    cityName: cityRows[0].name,
    regionName: (regionRows as Array<{ name: string }>)[0]?.name ?? null,
    countryCode: countryRows[0].code,
  };
}

router.post("/submit", async (req, res) => {
  const ip = getClientIp(req as unknown as { headers: Record<string, string | string[] | undefined> });
  if (!checkRateLimit(ip, "submit.attempt", 5, 60)) {
    return res.status(429).json({ error: "Too many submissions. Please try again later." });
  }

  const normalized = normalizeEmptyStrings(req.body);
  const parsed = submitSchema.safeParse(normalized);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0]?.message || "Invalid submission.",
    });
  }
  const data = parsed.data;

  if (data.honeypot && data.honeypot.length > 0) {
    await logAudit("submit.honeypot", { meta: { ip } });
    return res.json({
      message: "If that email is valid, you'll receive a verification link shortly.",
    });
  }

  try {
    let columns: typeof entriesTable.$inferInsert;

    if (data.entityType === "person") {
      const d = data as PersonInput;
      const loc = await resolveLocationNames(d.city_id, d.region_id, d.country_id);
      if (!loc) return res.status(422).json({ error: "Couldn't resolve location." });
      const geo = await geocodeCity({ city: loc.cityName, region: loc.regionName || undefined, country: loc.countryCode });
      if (!geo) return res.status(422).json({ error: "Couldn't locate that city." });
      columns = {
        entity_type: "person",
        display_name: d.displayName,
        email: d.email,
        city_id: d.city_id,
        region_id: d.region_id ?? null,
        country_id: d.country_id,
        city: loc.cityName,
        region: loc.regionName,
        country: loc.countryCode,
        bio: d.bio || null,
        socials: d.socials || {},
        lat: geo.lat,
        lng: geo.lng,
        age_band: d.ageBand,
        verified_owner: false,
      };
    } else if (data.entityType === "shop") {
      const d = data as ShopInput;
      const loc = await resolveLocationNames(d.city_id, d.region_id, d.country_id);
      if (!loc) return res.status(422).json({ error: "Couldn't resolve location." });
      const exactGeo = await geocodeAddress({ addressLine: d.addressLine, city: loc.cityName, region: loc.regionName || undefined, postalCode: d.postalCode || undefined, country: loc.countryCode });
      if (!exactGeo) return res.status(422).json({ error: "Couldn't locate that address." });
      const cityGeo = await geocodeCity({ city: loc.cityName, region: loc.regionName || undefined, country: loc.countryCode });
      columns = {
        entity_type: "shop",
        display_name: d.displayName,
        email: d.email,
        city_id: d.city_id,
        region_id: d.region_id ?? null,
        country_id: d.country_id,
        city: loc.cityName,
        region: loc.regionName,
        country: loc.countryCode,
        bio: d.bio || null,
        socials: d.socials || {},
        lat: cityGeo ? cityGeo.lat : exactGeo.lat,
        lng: cityGeo ? cityGeo.lng : exactGeo.lng,
        exact_lat: exactGeo.lat,
        exact_lng: exactGeo.lng,
        address_line: d.addressLine,
        postal_code: d.postalCode || null,
        hours: d.hours || null,
        contact_name: d.contactName,
        verified_owner: checkVerifiedOwner(d.email, d.socials),
      };
    } else {
      const d = data as ClubInput;
      const loc = await resolveLocationNames(d.city_id, d.region_id, d.country_id);
      if (!loc) return res.status(422).json({ error: "Couldn't resolve location." });
      const cityGeo = await geocodeCity({ city: loc.cityName, region: loc.regionName || undefined, country: loc.countryCode });
      if (!cityGeo) return res.status(422).json({ error: "Couldn't locate that city." });
      let exactLat: number | null = null;
      let exactLng: number | null = null;
      if (d.clubVenuePublic && d.venueAddressLine) {
        const venueGeo = await geocodeAddress({ addressLine: d.venueAddressLine, city: loc.cityName, region: loc.regionName || undefined, postalCode: d.venuePostalCode || undefined, country: loc.countryCode });
        if (!venueGeo) return res.status(422).json({ error: "Couldn't locate venue address." });
        exactLat = venueGeo.lat;
        exactLng = venueGeo.lng;
      }
      columns = {
        entity_type: "club",
        display_name: d.displayName,
        email: d.email,
        city_id: d.city_id,
        region_id: d.region_id ?? null,
        country_id: d.country_id,
        city: loc.cityName,
        region: loc.regionName,
        country: loc.countryCode,
        bio: d.bio || null,
        socials: d.socials || {},
        lat: cityGeo.lat,
        lng: cityGeo.lng,
        exact_lat: exactLat,
        exact_lng: exactLng,
        club_meeting_info: d.clubMeetingInfo,
        club_venue_public: d.clubVenuePublic,
        contact_name: d.contactName,
        address_line: d.clubVenuePublic ? (d.venueAddressLine || null) : null,
        postal_code: d.clubVenuePublic ? (d.venuePostalCode || null) : null,
        verified_owner: false,
      };
    }

    let parentConsentId: string | null = null;
    const isMinor = data.entityType === "person" && (data as PersonInput).ageBand === "13-17";
    let parentConsentToken: string | null = null;

    if (isMinor) {
      const d = data as PersonInput;
      parentConsentToken = generateToken();
      const [consent] = await db
        .insert(parentConsentsTable)
        .values({
          minor_display_name: d.displayName,
          minor_email: d.email,
          parent_name: d.parentName!,
          parent_email: d.parentEmail!,
          relationship: d.relationship!,
          consent_token: parentConsentToken,
        })
        .returning({ id: parentConsentsTable.id });
      if (!consent) return res.status(500).json({ error: "Could not save consent record." });
      parentConsentId = consent.id;
    }

    const [entry] = await db
      .insert(entriesTable)
      .values({ ...columns, parent_consent_id: parentConsentId, is_visible: false })
      .returning({ id: entriesTable.id });

    if (!entry) return res.status(500).json({ error: "Could not save your entry." });

    const emailToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(verificationTokensTable).values({
      entry_id: entry.id,
      token: emailToken,
      purpose: "email_verify",
      expires_at: expiresAt,
    });

    const verifyOutcome = await sendEntryVerificationEmail(data.email, (data as PersonInput).displayName, emailToken);

    if (isMinor && parentConsentToken) {
      const d = data as PersonInput;
      await sendParentConsentEmail(d.parentEmail!, d.parentName!, d.displayName, parentConsentToken);
    }

    await logAudit("entry.submitted", {
      actor: data.email,
      targetId: entry.id,
      meta: { ip, entityType: data.entityType, verifyStatus: verifyOutcome.status },
    });

    return res.json({
      message: "Thanks! Check your email to verify your address.",
      emailStatus: verifyOutcome.status,
    });
  } catch (e) {
    console.error("POST /submit error:", e);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
