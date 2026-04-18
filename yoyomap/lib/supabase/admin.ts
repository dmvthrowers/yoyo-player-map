import { createClient } from '@supabase/supabase-js';

/**
 * Server-only admin client using the service role key.
 * NEVER expose this to the browser. Only import in API routes and server actions.
 * This bypasses Row Level Security.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials not configured');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
