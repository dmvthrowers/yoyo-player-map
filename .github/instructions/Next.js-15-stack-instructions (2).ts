import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()