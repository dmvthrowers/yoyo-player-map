import { Router } from "express";
import { db } from "@workspace/db";
import {
  entriesTable,
  verificationTokensTable,
  parentConsentsTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router = Router();

router.get("/verify", async (req, res) => {
  const type = req.query["type"] as string | undefined;
  const token = req.query["token"] as string | undefined;

  if (!token) return res.status(400).json({ error: "Missing token." });

  try {
    if (type === "entry" || !type) {
      const rows = await db
        .select()
        .from(verificationTokensTable)
        .where(eq(verificationTokensTable.token, token))
        .limit(1);
      const tok = rows[0];
      if (!tok || tok.purpose !== "email_verify") {
        return res.status(401).json({ error: "Token invalid." });
      }
      if (tok.used_at) return res.status(400).json({ error: "Token already used." });
      if (new Date(tok.expires_at) < new Date()) {
        return res.status(400).json({ error: "Token expired." });
      }

      // Fetch entry to check whether parental consent is required
      const entryRows = await db
        .select({ id: entriesTable.id, parent_consent_id: entriesTable.parent_consent_id })
        .from(entriesTable)
        .where(and(eq(entriesTable.id, tok.entry_id), isNull(entriesTable.deleted_at)))
        .limit(1);
      const entry = entryRows[0];
      if (!entry) return res.status(404).json({ error: "Entry not found." });

      // If the entry requires parental consent, ensure it has been granted before publishing
      if (entry.parent_consent_id) {
        const consentRows = await db
          .select({ consented_at: parentConsentsTable.consented_at })
          .from(parentConsentsTable)
          .where(eq(parentConsentsTable.id, entry.parent_consent_id))
          .limit(1);
        const consent = consentRows[0];
        if (!consent || !consent.consented_at) {
          // Mark token as used so the link cannot be replayed; entry stays hidden pending consent
          await db
            .update(verificationTokensTable)
            .set({ used_at: new Date() })
            .where(eq(verificationTokensTable.token, token));
          return res.json({
            ok: false,
            pendingConsent: true,
            message: "Email verified. Your entry will appear on the map once your parent or guardian completes the consent form they received by email.",
          });
        }
      }

      await db
        .update(entriesTable)
        .set({ is_visible: true })
        .where(eq(entriesTable.id, tok.entry_id));

      await db
        .update(verificationTokensTable)
        .set({ used_at: new Date() })
        .where(eq(verificationTokensTable.token, token));

      return res.json({ ok: true, message: "Entry verified and now visible on the map!" });
    }

    if (type === "consent") {
      const rows = await db
        .select()
        .from(parentConsentsTable)
        .where(eq(parentConsentsTable.consent_token, token))
        .limit(1);
      const consent = rows[0];
      if (!consent) return res.status(401).json({ error: "Consent token invalid." });
      if (consent.consented_at) {
        return res.json({ ok: true, message: "Consent already recorded." });
      }

      await db
        .update(parentConsentsTable)
        .set({ consented_at: new Date() })
        .where(eq(parentConsentsTable.consent_token, token));

      // If the minor's email was already verified (token consumed) we can now publish the entry
      const entryRows = await db
        .select({ id: entriesTable.id })
        .from(entriesTable)
        .where(and(eq(entriesTable.parent_consent_id, consent.id), isNull(entriesTable.deleted_at)))
        .limit(1);
      const entry = entryRows[0];

      if (entry) {
        const emailTokenRows = await db
          .select({ used_at: verificationTokensTable.used_at })
          .from(verificationTokensTable)
          .where(and(
            eq(verificationTokensTable.entry_id, entry.id),
            eq(verificationTokensTable.purpose, "email_verify"),
          ))
          .limit(1);
        const emailToken = emailTokenRows[0];
        // email_verify token exists and was already consumed → email was verified first; publish now
        if (emailToken?.used_at) {
          await db
            .update(entriesTable)
            .set({ is_visible: true })
            .where(eq(entriesTable.id, entry.id));
          return res.json({ ok: true, message: "Consent recorded and entry is now visible on the map!" });
        }
      }

      return res.json({ ok: true, message: "Consent recorded. The entry will appear on the map once the email is also verified." });
    }

    return res.status(400).json({ error: "Unknown verification type." });
  } catch (e) {
    console.error("GET /verify error:", e);
    return res.status(500).json({ error: "Verification failed." });
  }
});

export default router;
