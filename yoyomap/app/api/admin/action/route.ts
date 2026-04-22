import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['flag_entry', 'unflag_entry', 'delete_entry', 'resolve_report']),
  id: z.string().uuid(),
});

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected) return false;
  const a = crypto.createHash('sha256').update(token).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const supabase = createAdminClient();
  const { action, id } = parsed.data;
  const ip = getClientIp(req.headers);

  switch (action) {
    case 'flag_entry':
      await supabase.from('entries').update({ is_flagged: true, is_visible: false }).eq('id', id);
      await logAudit('admin.flag_entry', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    case 'unflag_entry':
      await supabase.from('entries').update({ is_flagged: false, is_visible: true }).eq('id', id);
      await logAudit('admin.unflag_entry', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    case 'delete_entry': {
      const { data: entry } = await supabase.from('entries').select('parent_consent_id').eq('id', id).maybeSingle();
      await supabase.from('entries').delete().eq('id', id);
      if (entry?.parent_consent_id) {
        await supabase.from('parent_consents').delete().eq('id', entry.parent_consent_id);
      }
      await logAudit('admin.delete_entry', { actor: 'admin', targetId: id, meta: { ip } });
      break;
    }
    case 'resolve_report':
      await supabase.from('reports').update({
        resolved_at: new Date().toISOString(),
        resolution: 'resolved_by_admin',
      }).eq('id', id);
      await logAudit('admin.resolve_report', { actor: 'admin', targetId: id, meta: { ip } });
      break;
  }

  return NextResponse.json({ ok: true });
}
