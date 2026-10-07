import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

// A thrown error becomes the standard envelope (500) via withErrorHandling,
// so the exception text stays in the logs instead of going to the client.
export const POST = withErrorHandling(async (requestId: string, req: NextRequest) => {
  const authError = await requireAdmin(req, requestId);
  if (authError) return authError;

  revalidateTag('public-entries', { expire: 0 });
  revalidatePath('/[locale]/map', 'page');
  revalidatePath('/[locale]/players', 'page');
  return NextResponse.json({ success: true, message: 'Map refresh triggered.' });
});
