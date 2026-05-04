---
applyTo: "lib/supabase/**,app/api/**"
---
Browser uses lib/supabase/client.ts. Server uses lib/supabase/admin.ts only. Public reads must query map_entries view. Never import admin.ts in client components.
