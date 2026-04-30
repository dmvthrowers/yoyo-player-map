import { createClient } from './client';
import { createAdminClient } from './admin';

export const supabase = createClient();
export function getAdminClient() {
  return createAdminClient();
}
