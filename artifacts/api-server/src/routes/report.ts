import { Router } from "express";
import { db } from "@workspace/db";
import { entriesTable, reportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { reportSchema, AUTO_HIDE_REASONS } from "../lib/validation";
import { checkRateLimit, getClientIp } from "../lib/rateLimit";
import { logAudit } from "../lib/auditLog";
import { sendReportNotificationEmail } from "../lib/email";

const router = Router();

router.post("/report", async (req, res) => {
  const ip = getClientIp(req as unknown as { headers: Record<string, string | string[] | undefined> });
  if (!checkRateLimit(ip, "report.submit", 10, 60)) {
    return res.status(429).json({ error: "Too many reports. Try again later." });
  }

  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid report." });
  }
  const { entryId, reason, details, reporterEmail } = parsed.data;

  try {
    const entryRows = await db
      .select({ id: entriesTable.id, display_name: entriesTable.display_name, entity_type: entriesTable.entity_type })
      .from(entriesTable)
      .where(eq(entriesTable.id, entryId))
      .limit(1);

    const entry = entryRows[0];
    if (!entry) return res.status(404).json({ error: "Entry not found." });

    await db.insert(reportsTable).values({
      entry_id: entryId,
      reason,
      details: details || null,
      reporter_email: reporterEmail || null,
      reporter_ip: ip !== "unknown" ? ip : null,
    });

    if (reason === "minor_unsafe" || reason === "harassment") {
      await db
        .update(entriesTable)
        .set({ is_flagged: true, is_visible: false, flagged_reason: reason })
        .where(eq(entriesTable.id, entryId));
      await logAudit("entry.flagged", { targetId: entryId, meta: { ip, reason } });
    } else if (AUTO_HIDE_REASONS.includes(reason as typeof AUTO_HIDE_REASONS[number])) {
      await db
        .update(entriesTable)
        .set({ auto_hidden_by_reports: true })
        .where(eq(entriesTable.id, entryId));
      await logAudit("entry.auto_hidden", { targetId: entryId, meta: { ip, reason } });
    }

    await logAudit("report.submitted", {
      actor: reporterEmail || "anon",
      targetId: entryId,
      meta: { ip, reason },
    });

    await sendReportNotificationEmail(
      entryId,
      reason,
      details || null,
      reporterEmail || null,
      entry.display_name,
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /report error:", e);
    return res.status(500).json({ error: "Could not submit report." });
  }
});

export default router;
