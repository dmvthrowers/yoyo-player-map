import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

function checkAdmin(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!token || !expected) return false;
  const ta = Buffer.from(token);
  const tb = Buffer.from(expected);
  const len = Math.max(ta.length, tb.length);
  const a = Buffer.alloc(len);
  const b = Buffer.alloc(len);
  ta.copy(a);
  tb.copy(b);
  return crypto.timingSafeEqual(a, b) && ta.length === tb.length;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    revalidateTag('public-entries');
    revalidatePath('/[locale]/map', 'page');
    revalidatePath('/[locale]/players', 'page');
    return NextResponse.json({ success: true, message: 'Map refresh triggered.' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
