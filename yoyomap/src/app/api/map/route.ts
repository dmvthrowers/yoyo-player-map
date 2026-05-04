import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic so Next.js does not attempt to prerender this route at build
// time (which would require a live Supabase connection). CDN-level caching is
// handled by the Cache-Control header returned below.
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase
    .from('map_entries')
    .select('id, display_name, city, region, country, lat, lng, entity_type, verified_owner');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
