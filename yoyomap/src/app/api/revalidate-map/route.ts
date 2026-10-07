import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEq } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { apiError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  // Rate-limit before checking the secret so the secret comparison isn't a
  // timing oracle reachable at unbounded throughput.
  const ip = getClientIp(req.headers);
  const allowed = await checkRateLimit(ip, 'revalidate_map', 20, 5);
  if (!allowed) {
    return apiError('rate_limited', 'Too many requests.', requestId);
  }

  const expected = process.env.REVALIDATE_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!expected || !bearer || !timingSafeEq(bearer, expected)) {
    return apiError('unauthorized', 'Unauthorized', requestId);
  }

  revalidateTag('public-entries', { expire: 0 });
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ revalidated: true });
});
