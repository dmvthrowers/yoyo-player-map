import { createClient } from './client';
import { createAdminClient } from './admin';
import type { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

// Lazy-initialised browser/anon client. Avoids constructing at module-load
// time so build-time page-data collection doesn't fail when NEXT_PUBLIC_*
// env vars aren't present in the environment doing the build.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_supabase) _supabase = createClient();
    return Reflect.get(_supabase as object, prop, receiver);
  },
});

export function getAdminClient() {
  return createAdminClient();
}
