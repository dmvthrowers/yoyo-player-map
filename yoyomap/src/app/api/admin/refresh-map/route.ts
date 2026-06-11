import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    revalidateTag('public-entries', 'max');
    revalidatePath('/[locale]/map', 'page');
    revalidatePath('/[locale]/players', 'page');
    return NextResponse.json({ success: true, message: 'Map refresh triggered.' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
