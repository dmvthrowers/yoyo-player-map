import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('public-entries');
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ revalidated: true });
}
