import 'server-only';
import { createClient } from '@supabase/supabase-js';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
