import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 86400; // 24 hours

export async function GET() {
  const { data, error } = await supabase
    .from('map_entries_cached')
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
