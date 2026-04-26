-- =============================================================================
-- Backfill legacy entry locations into the normalized location tables
-- =============================================================================
-- Why this exists:
--   - Early production entries were created before location normalization
--     fully stabilized.
--   - Some rows still have raw country / region / city strings that don't
--     match the newer country / region / city foreign keys.
--   - The original v12 migration only handled simple 2-letter countries and
--     exact string matches, so aliases like "usa" or "United States" were
--     left behind.
--
-- What this script does:
--   1. Canonicalize country / region / city strings inside public.entries.
--   2. Seed any missing countries / regions / cities.
--   3. Backfill entries.country_id / region_id / city_id.
--   4. Emit a final diagnostic result set for rows that still need hand-fixing.
--
-- Safe to re-run: yes.
-- =============================================================================

begin;

with country_seed(code, name) as (
  values
    ('US', 'United States'),
    ('CA', 'Canada'),
    ('GB', 'United Kingdom'),
    ('MX', 'Mexico'),
    ('BR', 'Brazil'),
    ('AR', 'Argentina'),
    ('CL', 'Chile'),
    ('CO', 'Colombia'),
    ('DE', 'Germany'),
    ('FR', 'France'),
    ('ES', 'Spain'),
    ('IT', 'Italy'),
    ('BE', 'Belgium'),
    ('NL', 'Netherlands'),
    ('CZ', 'Czech Republic'),
    ('HU', 'Hungary'),
    ('PL', 'Poland'),
    ('UA', 'Ukraine'),
    ('JP', 'Japan'),
    ('KR', 'South Korea'),
    ('CN', 'China'),
    ('TW', 'Taiwan'),
    ('SG', 'Singapore'),
    ('PH', 'Philippines'),
    ('IN', 'India'),
    ('AU', 'Australia'),
    ('NZ', 'New Zealand'),
    ('HN', 'Honduras')
),
country_aliases(alias_slug, code, name) as (
  values
    ('us', 'US', 'United States'),
    ('usa', 'US', 'United States'),
    ('united-states', 'US', 'United States'),
    ('ca', 'CA', 'Canada'),
    ('canada', 'CA', 'Canada'),
    ('uk', 'GB', 'United Kingdom'),
    ('gb', 'GB', 'United Kingdom'),
    ('united-kingdom', 'GB', 'United Kingdom'),
    ('mx', 'MX', 'Mexico'),
    ('mexico', 'MX', 'Mexico'),
    ('br', 'BR', 'Brazil'),
    ('brazil', 'BR', 'Brazil'),
    ('ar', 'AR', 'Argentina'),
    ('argentina', 'AR', 'Argentina'),
    ('cl', 'CL', 'Chile'),
    ('chile', 'CL', 'Chile'),
    ('co', 'CO', 'Colombia'),
    ('colombia', 'CO', 'Colombia'),
    ('de', 'DE', 'Germany'),
    ('germany', 'DE', 'Germany'),
    ('fr', 'FR', 'France'),
    ('france', 'FR', 'France'),
    ('es', 'ES', 'Spain'),
    ('spain', 'ES', 'Spain'),
    ('it', 'IT', 'Italy'),
    ('italy', 'IT', 'Italy'),
    ('be', 'BE', 'Belgium'),
    ('belgium', 'BE', 'Belgium'),
    ('nl', 'NL', 'Netherlands'),
    ('netherlands', 'NL', 'Netherlands'),
    ('cz', 'CZ', 'Czech Republic'),
    ('czech-republic', 'CZ', 'Czech Republic'),
    ('hu', 'HU', 'Hungary'),
    ('hungary', 'HU', 'Hungary'),
    ('pl', 'PL', 'Poland'),
    ('poland', 'PL', 'Poland'),
    ('ua', 'UA', 'Ukraine'),
    ('ukraine', 'UA', 'Ukraine'),
    ('jp', 'JP', 'Japan'),
    ('japan', 'JP', 'Japan'),
    ('kr', 'KR', 'South Korea'),
    ('south-korea', 'KR', 'South Korea'),
    ('cn', 'CN', 'China'),
    ('china', 'CN', 'China'),
    ('tw', 'TW', 'Taiwan'),
    ('taiwan', 'TW', 'Taiwan'),
    ('sg', 'SG', 'Singapore'),
    ('singapore', 'SG', 'Singapore'),
    ('ph', 'PH', 'Philippines'),
    ('philippines', 'PH', 'Philippines'),
    ('in', 'IN', 'India'),
    ('india', 'IN', 'India'),
    ('au', 'AU', 'Australia'),
    ('australia', 'AU', 'Australia'),
    ('nz', 'NZ', 'New Zealand'),
    ('new-zealand', 'NZ', 'New Zealand'),
    ('hn', 'HN', 'Honduras'),
    ('honduras', 'HN', 'Honduras')
)
insert into public.countries (code, name)
select code, name from country_seed
on conflict (code) do nothing;

with normalized_entries as (
  select
    e.id,
    nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') as city_name,
    nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') as region_name,
    case
      when nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') is null then null
      else left(upper(regexp_replace(btrim(e.region), '\s+', ' ', 'g')), 32)
    end as region_code,
    regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g') as country_slug,
    case
      when ca.code is not null then ca.code
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_code,
    case
      when ca.name is not null then ca.name
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_name
  from public.entries e
  left join country_aliases ca
    on ca.alias_slug = regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g')
  where e.deleted_at is null
),
missing_countries as (
  select distinct country_code as code, country_name as name
  from normalized_entries
  where country_code is not null
)
insert into public.countries (code, name)
select code, name
from missing_countries
on conflict (code) do nothing;

with normalized_entries as (
  select
    e.id,
    nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') as city_name,
    nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') as region_name,
    case
      when nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') is null then null
      else left(upper(regexp_replace(btrim(e.region), '\s+', ' ', 'g')), 32)
    end as region_code,
    case
      when ca.code is not null then ca.code
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_code
  from public.entries e
  left join country_aliases ca
    on ca.alias_slug = regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g')
  where e.deleted_at is null
),
region_source as (
  select distinct
    c.id as country_id,
    ne.region_code as code,
    ne.region_name as name
  from normalized_entries ne
  join public.countries c
    on c.code = ne.country_code
  where ne.region_code is not null
    and ne.region_name is not null
)
insert into public.regions (country_id, code, name)
select rs.country_id, rs.code, rs.name
from region_source rs
where not exists (
  select 1
  from public.regions r
  where r.country_id = rs.country_id
    and (
      r.code = rs.code
      or lower(r.name) = lower(rs.name)
    )
)
on conflict (country_id, code) do nothing;

with normalized_entries as (
  select
    e.id,
    nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') as city_name,
    nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') as region_name,
    case
      when nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') is null then null
      else left(upper(regexp_replace(btrim(e.region), '\s+', ' ', 'g')), 32)
    end as region_code,
    case
      when ca.code is not null then ca.code
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_code
  from public.entries e
  left join country_aliases ca
    on ca.alias_slug = regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g')
  where e.deleted_at is null
),
city_source as (
  select
    c.id as country_id,
    r.id as region_id,
    lower(ne.city_name) as city_key,
    min(ne.city_name) as city_name
  from normalized_entries ne
  join public.countries c
    on c.code = ne.country_code
  left join lateral (
    select r1.id
    from public.regions r1
    where r1.country_id = c.id
      and (
        r1.code = ne.region_code
        or (
          ne.region_name is not null
          and lower(r1.name) = lower(ne.region_name)
        )
      )
    order by
      case when r1.code = ne.region_code then 0 else 1 end,
      r1.id
    limit 1
  ) r on true
  where ne.city_name is not null
  group by c.id, r.id, lower(ne.city_name)
)
insert into public.cities (country_id, region_id, name)
select cs.country_id, cs.region_id, cs.city_name
from city_source cs
where not exists (
  select 1
  from public.cities ci
  where ci.country_id = cs.country_id
    and ci.region_id is not distinct from cs.region_id
    and lower(ci.name) = cs.city_key
)
on conflict (country_id, region_id, name) do nothing;

with normalized_entries as (
  select
    e.id,
    nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') as city_name,
    nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') as region_name,
    case
      when nullif(regexp_replace(btrim(e.region), '\s+', ' ', 'g'), '') is null then null
      else left(upper(regexp_replace(btrim(e.region), '\s+', ' ', 'g')), 32)
    end as region_code,
    case
      when ca.code is not null then ca.code
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_code,
    case
      when ca.name is not null then ca.name
      when btrim(coalesce(e.country, '')) ~* '^[a-z]{2}$' then upper(btrim(e.country))
      else null
    end as country_name
  from public.entries e
  left join country_aliases ca
    on ca.alias_slug = regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g')
  where e.deleted_at is null
),
resolved_entries as (
  select
    ne.id,
    ne.country_code,
    ne.country_name,
    ne.region_code,
    ne.region_name,
    ne.city_name,
    c.id as country_id,
    r.id as region_id,
    ci.id as city_id,
    coalesce(r.name, ne.region_name) as resolved_region_name,
    coalesce(ci.name, ne.city_name) as resolved_city_name
  from normalized_entries ne
  left join public.countries c
    on c.code = ne.country_code
  left join lateral (
    select r1.id, r1.name
    from public.regions r1
    where r1.country_id = c.id
      and (
        r1.code = ne.region_code
        or (
          ne.region_name is not null
          and lower(r1.name) = lower(ne.region_name)
        )
      )
    order by
      case when r1.code = ne.region_code then 0 else 1 end,
      r1.id
    limit 1
  ) r on true
  left join public.cities ci
    on ci.country_id = c.id
   and ci.region_id is not distinct from r.id
   and lower(ci.name) = lower(ne.city_name)
)
update public.entries e
set
  country = coalesce(re.country_code, e.country),
  region = case
    when re.region_name is null then null
    else re.resolved_region_name
  end,
  city = coalesce(re.resolved_city_name, e.city),
  country_id = re.country_id,
  region_id = re.region_id,
  city_id = re.city_id
from resolved_entries re
where e.id = re.id
  and (
    e.country is distinct from coalesce(re.country_code, e.country)
    or e.region is distinct from case when re.region_name is null then null else re.resolved_region_name end
    or e.city is distinct from coalesce(re.resolved_city_name, e.city)
    or e.country_id is distinct from re.country_id
    or e.region_id is distinct from re.region_id
    or e.city_id is distinct from re.city_id
  );

commit;

-- =============================================================================
-- Diagnostics
-- =============================================================================
-- Any rows returned here still need manual attention. Common causes:
--   - unsupported country aliases
--   - missing / malformed city values
--   - legacy region strings that should be split or corrected by hand
-- =============================================================================
with country_aliases(alias_slug, code, name) as (
  values
    ('us', 'US', 'United States'),
    ('usa', 'US', 'United States'),
    ('united-states', 'US', 'United States'),
    ('ca', 'CA', 'Canada'),
    ('canada', 'CA', 'Canada'),
    ('uk', 'GB', 'United Kingdom'),
    ('gb', 'GB', 'United Kingdom'),
    ('united-kingdom', 'GB', 'United Kingdom'),
    ('mx', 'MX', 'Mexico'),
    ('mexico', 'MX', 'Mexico'),
    ('br', 'BR', 'Brazil'),
    ('brazil', 'BR', 'Brazil'),
    ('ar', 'AR', 'Argentina'),
    ('argentina', 'AR', 'Argentina'),
    ('cl', 'CL', 'Chile'),
    ('chile', 'CL', 'Chile'),
    ('co', 'CO', 'Colombia'),
    ('colombia', 'CO', 'Colombia'),
    ('de', 'DE', 'Germany'),
    ('germany', 'DE', 'Germany'),
    ('fr', 'FR', 'France'),
    ('france', 'FR', 'France'),
    ('es', 'ES', 'Spain'),
    ('spain', 'ES', 'Spain'),
    ('it', 'IT', 'Italy'),
    ('italy', 'IT', 'Italy'),
    ('be', 'BE', 'Belgium'),
    ('belgium', 'BE', 'Belgium'),
    ('nl', 'NL', 'Netherlands'),
    ('netherlands', 'NL', 'Netherlands'),
    ('cz', 'CZ', 'Czech Republic'),
    ('czech-republic', 'CZ', 'Czech Republic'),
    ('hu', 'HU', 'Hungary'),
    ('hungary', 'HU', 'Hungary'),
    ('pl', 'PL', 'Poland'),
    ('poland', 'PL', 'Poland'),
    ('ua', 'UA', 'Ukraine'),
    ('ukraine', 'UA', 'Ukraine'),
    ('jp', 'JP', 'Japan'),
    ('japan', 'JP', 'Japan'),
    ('kr', 'KR', 'South Korea'),
    ('south-korea', 'KR', 'South Korea'),
    ('cn', 'CN', 'China'),
    ('china', 'CN', 'China'),
    ('tw', 'TW', 'Taiwan'),
    ('taiwan', 'TW', 'Taiwan'),
    ('sg', 'SG', 'Singapore'),
    ('singapore', 'SG', 'Singapore'),
    ('ph', 'PH', 'Philippines'),
    ('philippines', 'PH', 'Philippines'),
    ('in', 'IN', 'India'),
    ('india', 'IN', 'India'),
    ('au', 'AU', 'Australia'),
    ('australia', 'AU', 'Australia'),
    ('nz', 'NZ', 'New Zealand'),
    ('new-zealand', 'NZ', 'New Zealand'),
    ('hn', 'HN', 'Honduras'),
    ('honduras', 'HN', 'Honduras')
)
select
  e.id,
  e.display_name,
  e.country,
  e.region,
  e.city,
  e.country_id,
  e.region_id,
  e.city_id,
  case
    when e.country_id is null then 'unmapped_country'
    when nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') is null then 'missing_city'
    when e.city_id is null then 'unmapped_city'
    else 'check_row'
  end as issue
from public.entries e
left join country_aliases ca
  on ca.alias_slug = regexp_replace(lower(btrim(coalesce(e.country, ''))), '[^a-z0-9]+', '-', 'g')
where e.deleted_at is null
  and (
    e.country_id is null
    or nullif(regexp_replace(btrim(e.city), '\s+', ' ', 'g'), '') is null
    or e.city_id is null
    or (
      e.country !~* '^[a-z]{2}$'
      and ca.code is null
    )
  )
order by e.created_at asc;
