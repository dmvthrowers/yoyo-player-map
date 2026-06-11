import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEq } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export async function POST(req: NextRequest) {
  // Rate-limit before checking the secret so the secret comparison isn't a
  // timing oracle reachable at unbounded throughput.
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'revalidate_map', 20, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const expected = process.env.REVALIDATE_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!expected || !bearer || !timingSafeEq(bearer, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('public-entries');
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ revalidated: true });
}
