
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// This route triggers a revalidation of the map page (ISR/SSG cache bust)
export async function POST() {
  try {
    // Actually revalidate the map page
    await revalidatePath('/map');
    return NextResponse.json({ success: true, message: 'Map refresh triggered.' });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
