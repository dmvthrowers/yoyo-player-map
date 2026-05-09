
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// This route triggers a revalidation of the map page (ISR/SSG cache bust)
export async function POST() {
  try {
    // Revalidate all locale variants of the map and players pages
    revalidatePath('/[locale]/map', 'page');
    revalidatePath('/[locale]/players', 'page');
    return NextResponse.json({ success: true, message: 'Map refresh triggered.' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
