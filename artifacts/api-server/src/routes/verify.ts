import { Router } from "express";
import { db } from "@workspace/db";
import {
  entriesTable,
  verificationTokensTable,
  parentConsentsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

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

      return res.json({ ok: true, message: "Consent recorded. The entry will appear on the map once the email is also verified." });
    }

    return res.status(400).json({ error: "Unknown verification type." });
  } catch (e) {
    console.error("GET /verify error:", e);
    return res.status(500).json({ error: "Verification failed." });
  }
});

export default router;
