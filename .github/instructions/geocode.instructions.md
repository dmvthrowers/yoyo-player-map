---
applyTo: "lib/geocode.ts,app/api/submit/**,app/api/profile/update/**"
---
Server-only. Enforce User-Agent header, 1 req/sec, check cache, apply jitterCoords before returning. Never expose raw lat/lon.
