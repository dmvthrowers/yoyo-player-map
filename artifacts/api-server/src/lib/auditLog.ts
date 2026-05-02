import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db";

export async function logAudit(
  event: string,
  opts: {
    actor?: string;
    targetId?: string;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      event,
      actor: opts.actor,
      target_id: opts.targetId ? opts.targetId as unknown as undefined : undefined,
      meta: opts.meta,
    });
  } catch (e) {
    console.error("audit_log insert failed:", e);
  }
}
