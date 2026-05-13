import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!expected || !bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timing-safe comparison to prevent oracle attacks on the secret.
  const ta = Buffer.from(bearer);
  const tb = Buffer.from(expected);
  const len = Math.max(ta.length, tb.length);
  const a = Buffer.alloc(len); ta.copy(a);
  const b = Buffer.alloc(len); tb.copy(b);
  if (!crypto.timingSafeEqual(a, b) || ta.length !== tb.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('public-entries');
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ revalidated: true });
}
