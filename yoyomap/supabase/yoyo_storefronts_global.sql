-- Yo-yo Storefronts Global: Bulk insert for map entries
-- NOTE: Replace placeholder emails and age_band as needed. Lat/lng are approximate city centers.

insert into public.entries (
  display_name, city, region, country, lat, lng, exact_lat, exact_lng, address_line, postal_code, entity_type, is_visible, email, age_band, bio, socials, hours
) values
-- Entries will be appended here
;
