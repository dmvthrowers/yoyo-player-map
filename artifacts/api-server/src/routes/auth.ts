import { Router } from "express";
import { db } from "@workspace/db";
import {
  entriesTable,
  verificationTokensTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { generateToken } from "../lib/tokens";
import { checkRateLimit, getClientIp } from "../lib/rateLimit";
import { sendManageEntryEmail, sendManageEntriesEmail } from "../lib/email";
import { logAudit } from "../lib/auditLog";

const router = Router();

const magicLinkSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

router.post("/auth/magic-link", async (req, res) => {
  const ip = getClientIp(req as unknown as { headers: Record<string, string | string[] | undefined> });
  if (!checkRateLimit(ip, "magic_link.request", 5, 60)) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  const parsed = magicLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email." });
  }
  const { email } = parsed.data;

  try {
    const entries = await db
      .select({
        id: entriesTable.id,
        display_name: entriesTable.display_name,
        entity_type: entriesTable.entity_type,
      })
      .from(entriesTable)
      .where(and(eq(entriesTable.email, email), isNull(entriesTable.deleted_at)));

    if (!entries.length) {
      await logAudit("magic_link.unknown_email", { meta: { ip } });
      return res.json({ ok: true });
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const tokenValues = entries.map((entry) => ({
      entry_id: entry.id,
      token: generateToken(),
      purpose: "edit_link",
      expires_at: expiresAt,
    }));

    await db.insert(verificationTokensTable).values(tokenValues);

    if (entries.length === 1) {
      await sendManageEntryEmail(email, entries[0].display_name, tokenValues[0].token);
    } else {
      await sendManageEntriesEmail(
        email,
        entries.map((e, i) => ({
          displayName: e.display_name,
          token: tokenValues[i].token,
          entityType: e.entity_type as "person" | "shop" | "club",
        })),
      );
    }

    await logAudit("magic_link.sent", {
      actor: email,
      meta: { ip, count: entries.length },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /auth/magic-link error:", e);
    return res.status(500).json({ error: "Could not send link. Try again." });
  }
});

router.get("/auth/verify-link", async (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) return res.status(400).json({ error: "Missing token" });

  try {
    const rows = await db
      .select()
      .from(verificationTokensTable)
      .where(eq(verificationTokensTable.token, token))
      .limit(1);

    const tok = rows[0];
    if (!tok || tok.purpose !== "edit_link") {
      return res.status(401).json({ error: "Link invalid." });
    }
    if (tok.used_at) return res.status(401).json({ error: "Link already used." });
    if (new Date(tok.expires_at) < new Date()) {
      return res.status(401).json({ error: "Link expired. Request a new one." });
    }

    const entryRows = await db
      .select({
        id: entriesTable.id,
        display_name: entriesTable.display_name,
        city: entriesTable.city,
        region: entriesTable.region,
        country: entriesTable.country,
        bio: entriesTable.bio,
        socials: entriesTable.socials,
        is_visible: entriesTable.is_visible,
        deleted_at: entriesTable.deleted_at,
        entity_type: entriesTable.entity_type,
        club_meeting_info: entriesTable.club_meeting_info,
        club_venue_public: entriesTable.club_venue_public,
        contact_name: entriesTable.contact_name,
        address_line: entriesTable.address_line,
        postal_code: entriesTable.postal_code,
        hours: entriesTable.hours,
      })
      .from(entriesTable)
      .where(eq(entriesTable.id, tok.entry_id))
      .limit(1);

    const entry = entryRows[0];
    if (!entry || entry.deleted_at) {
      return res.status(404).json({ error: "Entry not found." });
    }

    return res.json({ entry });
  } catch (e) {
    console.error("GET /auth/verify-link error:", e);
    return res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
