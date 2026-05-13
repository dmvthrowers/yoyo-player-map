import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEq } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export async function POST(req: NextRequest) {
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
