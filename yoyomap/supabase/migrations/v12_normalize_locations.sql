-- Migration script: Normalize location data in entries
-- 1. Insert unique countries
insert into public.countries (code, name)
select distinct upper(trim(country)) as code, upper(trim(country)) as name
from public.entries
where country is not null and char_length(country) = 2
on conflict (code) do nothing;

-- 2. Insert unique regions
insert into public.regions (country_id, code, name)
select c.id, upper(trim(e.region)), upper(trim(e.region))
from (select distinct country, region from public.entries where region is not null and region <> '') e
join public.countries c on upper(trim(e.country)) = c.code
on conflict (country_id, code) do nothing;

-- 3. Insert unique cities
insert into public.cities (country_id, region_id, name)
select c.id, r.id, initcap(trim(e.city))
from (select distinct country, region, city from public.entries) e
join public.countries c on upper(trim(e.country)) = c.code
left join public.regions r on r.country_id = c.id and upper(trim(e.region)) = r.code
on conflict (country_id, region_id, name) do nothing;

-- 4. Update entries with new FKs
update public.entries e set
  country_id = c.id,
  region_id = r.id,
  city_id = ci.id
from public.countries c
left join public.regions r on r.country_id = c.id and upper(trim(e.region)) = r.code
left join public.cities ci on ci.country_id = c.id and ci.region_id = r.id and initcap(trim(e.city)) = ci.name
where upper(trim(e.country)) = c.code;

-- 5. (Optional) Set NOT NULL on new FKs after verifying all rows are mapped
-- alter table public.entries alter column country_id set not null;
-- alter table public.entries alter column city_id set not null;
