import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

// On-demand revalidation triggered by submit/profile-update flows.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.REVALIDATE_SECRET && secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ revalidated: true });
}
