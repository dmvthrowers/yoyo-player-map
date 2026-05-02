import { NextRequest, NextResponse } from 'next/server';

// This route triggers on-demand revalidation for the map page
export async function POST(req: NextRequest) {
  // Only allow admin or trusted sources (add your own auth if needed)
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.REVALIDATE_SECRET && secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Revalidate the map page
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/map' }),
    });
    return NextResponse.json({ revalidated: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
