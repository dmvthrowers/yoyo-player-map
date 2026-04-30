import 'server-only';
import { admin } from './supabase/admin';
import fetch from 'node-fetch';

const USER_AGENT = 'yoyomap/1.0 (contact@dmvthrowers.club)';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
let lastRequest = 0;

export async function geocodeCity(query: string) {
  const key = query.trim().toLowerCase();
  // Check cache
  const { data: cached } = await admin
    .from('geocode_cache')
    .select('*')
    .eq('query', key)
    .maybeSingle();
  if (cached) return jitterCoords({ lat: cached.lat, lon: cached.lon });

  // Rate limit
  const now = Date.now();
  if (now - lastRequest < 1100) await new Promise(r => setTimeout(r, 1100 - (now - lastRequest)));
  lastRequest = Date.now();

  // Fetch from Nominatim
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const arr = await res.json();
  if (!arr[0]) throw new Error('Not found');
  const lat = parseFloat(arr[0].lat), lon = parseFloat(arr[0].lon);
  const jittered = jitterCoords({ lat, lon });
  // Upsert cache
  await admin.from('geocode_cache').upsert({ query: key, lat: jittered.lat, lon: jittered.lon, result: arr[0] });
  return jittered;
}

export function jitterCoords({ lat, lon }: { lat: number, lon: number }) {
  // ~10 mile jitter
  const r = 0.15 + Math.random() * 0.15; // ~10-20km
  const theta = Math.random() * 2 * Math.PI;
  const dx = r * Math.cos(theta);
  const dy = r * Math.sin(theta);
  return {
    lat: lat + (dy / 111),
    lon: lon + (dx / (111 * Math.cos(lat * Math.PI / 180)))
  };
}
