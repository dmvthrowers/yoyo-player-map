-- =============================================================================
-- Bulk import yo-yo / kendama clubs from yoyo_clubs.csv
-- =============================================================================
-- Idempotent: skips any club whose display_name (case-insensitive) already
-- exists as a non-deleted entity_type='club' row. Safe to re-run.
--
-- Excludes the two "TIME TO START A CLUB!" placeholder rows and the
-- "Imagine hitting a whirlwind in Kansas" placeholder.
--
-- venue_public column rules:
--   true  → club meets at a single, named, public venue (library, brewery,
--           shop, park, etc.). Sets exact_lat/exact_lng = csv lat/lng so the
--           map shows the actual meet pin.
--   false → rotating, unspecified, private (FB-only), or otherwise
--           ambiguous venue. Stores only jittered-area lat/lng.
-- =============================================================================

WITH new_clubs(display_name, city, region, lat, lng, venue_public, info) AS (
  VALUES
    ('Shrimp Gang PDX', 'Portland', 'OR', 45.5325665, -122.6530258, false, $$Portland's own "Skill Toy Club." Open to yo-yo, kendama, and any other skill toys. Meets monthly at rotating parks during the summer, and at Lloyd Center during the wet months.

Follow on instagram at @shrimpgangpdx for monthly meet updates.

https://www.instagram.com/shrimpgangpdx/?hl=en$$),
    ('Throwers of the Puget Sound', 'Tacoma', 'WA', 47.1112006, -122.7515907, false, $$T.O.P.S. is the Seattle area yo-yo club. They meet monthly in various locations around the region. Make sure you visit them for the annual Beachcrest meet. It is one of the best events of the year.

Find them on Instagram at @pugetsoundthrowers for meet updates. They also have a VERY active discord server, and a FB group.

Discord: https://discord.gg/SZ8ThRbQ
Facebook: https://www.facebook.com/share/g/16qxTfpdim/?mibextid=wwXIfr$$),
    ('Cincinnati Yo-Yo Club', 'Cincinnati', 'OH', 39.1171938, -84.5201006, true, $$Run by the illustrious Joe Scharf and friends, this club meets monthly at Rhinegeist Brewery and Urban Artifact. Find them on instagram at @cinciyoyoclub for meet updates.$$),
    ('Minnesota State Yo-Yo Club', 'Minneapolis', 'MN', 44.9576064, -93.1909449, false, $$This club meets regularly and hosts the MN State Yo-Yo Contest! Find them on instagram at @mnyoyoclub for meet and contest updates.$$),
    ('New York Yo-Yo Club', 'New York', 'NY', 40.7308513, -73.9974315, true, $$This club meets every Sunday from 1-4 at Washington Square Park! Weekly! That's nuts! Say hi to Melford and learn those Mel Hops!

Find them on Instagram at @nyyyc for updates.$$),
    ('CenCal Yo-Yo Club', 'Fresno', 'CA', 36.781462, -119.7883718, true, $$Regional club for Central California / Fresno area throwers! Founded by @nandosyoyo this club meets Monthly at the Manchester Mall.

Follow them on Instagram @cencalyoyoclub for updates and meet details.$$),
    ('Mile High Yo-Yo Club', 'Littleton', 'CO', 39.6137532, -105.0161818, false, $$This legendary club meets every 2nd Saturday from 12-3 in downtown Littleton, and 4th Saturday 12-3 at Broomfield Library.

Find them on Instagram at @milehighyoyo for details.$$),
    ('DXL CREW', 'Artesia', 'CA', 33.8574883, -118.0848575, true, $$This club is hosted by everyone's favorite Yo-Yo Mom, Michelle Dauer! They meet monthly at 11688 South Street in Artesia CA.

Follow them at @dxlcrew on Instagram for meet updates.$$),
    ('DMV Throwers', 'Arlington', 'VA', 38.8838327, -77.107447, true, $$This club meets every third Sunday from 1-4 at the Central Library Barbara M Donnellan Auditorium.

Follow them at @dmv_throwers in Instagram for updates.$$),
    ('Houston Area Yo-Yo Club', 'Houston', 'TX', 29.7672119, -95.3598334, false, $$This club meets monthly at rotating locations around Houston. Follow them on instagram at @houstonareayoyo for meet updates.$$),
    ('Spin Doctors', 'San Mateo', 'CA', 37.5615523, -122.323401, true, $$SF Bay Area Yo-Yo club established in 1998! Meets monthly at San Mateo Central Park from 2-5pm.

Follow them at @spindoxyoyo on Instagram for meet updates!$$),
    ('Chico Yo-Yo Club', 'Chico', 'CA', 39.7286696, -121.8405021, false, $$Every Saturday from 12-2! A true classic! One of the most well known clubs in the US!

Follow at @chicoyoyoclub on Instagram for sick clips and updates.$$),
    ('Downtown Plymouth Yo-Yo Club', 'Plymouth', 'MI', 42.3700409, -83.4688502, false, $$This club meets once a month on Tuesdays at 6pm. Follow on instagram at @downtownplymouthyoyoclub for meet dates and locations!$$),
    ('7 Cities Throwers', 'Norfolk', 'VA', 36.8730958, -76.295023, true, $$The yo-yo club for all of Hampton Roads and surrounding areas! This club meets monthly at Slow and Steady Bikes and Goods in Norfolk. Follow on Instagram at @7citiesthrowers for meets and updates!$$),
    ('STL YO-YO', 'St. Louis', 'MO', 38.6333814, -90.2403194, true, $$This club meets monthly every first Saturday at St. Louis City Foundry Food Hall from 11-1.

Follow on Instagram at @stlyoyo for updates!$$),
    ('A2Z YO-YO', 'Northampton', 'MA', 42.3210885, -72.6307082, true, $$This club meets every Friday and Saturday (Wow! That's dedication!) from 4:30-5:30 at A2Z Science in Northampton Massachusetts.

Follow on Instagram at @a2zyoyoteam for updates!$$),
    ('Chicago Yo-Yo Club', 'Chicago', 'IL', 41.9122539, -87.6802878, false, $$Chicago's own yo-yo club! Meets regularly in various locations. Follow on Instagram at @chicagoyoyoclub_ for updates and info!$$),
    ('Pikes Peak Yo-Yo Club', 'Manitou Springs', 'CO', 38.857097, -104.9114091, true, $$LOOK AT THAT LOGO! This club meets monthly in the beautiful Manitou Springs CO at the Manitou Art Center.

Details can be found on Facebook. Search for "Colorado Springs Yo-Yo Club"$$),
    ('Chandler Yo-Yo Club', 'Chandler', 'AZ', 33.3104539, -111.8458908, false, $$This club meets regularly and can be found on Instagram at @chandleryoyoclub for details.$$),
    ('Louisiana Yo-Yo Club', 'Shreveport', 'LA', 32.3576179, -93.7243962, false, $$A fresh and new club in Louisiana! Let's go! They meet monthly in Shreveport. Follow on Instagram at @louisianan_yoyo_club for meets and details.$$),
    ('B''more Yo-Yo Club', 'Baltimore', 'MD', 39.286768, -76.5718032, true, $$This club meets monthly on the first Saturday from 1:30-4:30 at the Creative Alliance in Baltimore.

Follow on Instagram at @bmoreyoyoclub for details.$$),
    ('Blono Yo-Yo Club', 'Bloomington', 'IL', 40.476553, -88.9913858, false, $$The Bloomington Normal club meets monthly on the second Sunday from 1:15-3:15. Follow on Instagram at @blono_il_yoyo_club_ for details.$$),
    ('The (Metro) Atlanta Yo-Yo Club', 'Sandy Springs', 'GA', 33.9917594, -84.3446938, true, $$This club meets every second Saturday at Pontoon Brewing in Sandy Springs. They have a Facebook group. Search for "The (Metro) Atlanta Yo-Yo Club" for details.$$),
    ('THROW DFW', 'Grapevine', 'TX', 32.929591, -97.0759774, true, $$This Dallas Fort Worth area club meets every 3rd Saturday at the Grapevine Public Library from 2-4.

Follow on Instagram at @throw_dfw for details.$$),
    ('Central Florida Yo-Yo Club', 'Orlando', 'FL', 28.5683326, -81.3437676, true, $$This club meets monthly at East End Market in Orlando. Follow on instagram at @centralfloridayoyoclub for meet details and updates.$$),
    ('Rhode Island Yo-Yo Club', 'Providence', 'RI', 41.8300329, -71.4150738, true, $$A brand new club that meets at the State House Lawn in Providence RI! Follow on instagram at @riyoyoclub for meet details!$$),
    ('Tiki Tiki Yo-Yo Club', 'Woodbury', 'NJ', 39.8352998, -75.1548492, true, $$This club meets every other Saturday from 2-4:30 at the Nerd Mall in Woodbury New Jersey.

Follow on Instagram at @tikitikiyoyoclub for details and updates!$$),
    ('Rocket City Yo-Yo Club', 'Huntsville', 'AL', 34.7224712, -86.5895777, false, $$This club is hosted by Thomas Rajan in Huntsville Alabama. A new club for this area! Find them on Facebook by searching "Rocket City Yoyo Club"$$),
    ('Wisconsin Yo-Yo and Skill Toy Club', 'Madison', 'WI', 43.0755187, -89.3990233, false, $$This club meets monthly in Madison. They have a discord server here: https://discord.com/invite/urD7vWSPpw$$),
    ('Lake County Yo-Yo Club (LCYYC)', 'Leesburg', 'FL', 28.8112403, -81.8763898, true, $$This club meets on the second Saturday of every month at Not Just Cardboard in Leesburg from 1-4pm. They have their own website for updates at: www.lcyoyo.club$$),
    ('Portage Lakes Yo-Yo Club', 'Akron', 'OH', 40.9872719, -81.5586692, true, $$This club meets monthly at the Portage Lakes Library. They have a facebook group. Search for "Portage Lakes YoYo Club" for details.$$),
    ('Westchester Yo-Yo Club', 'White Plains', 'NY', 41.1219872, -73.7946184, false, $$This is a new club that aspires to meet monthly. They have a Facebook group, but it is private so I don't know much else.

Find them by searching "Westchester Yo-Yo Club" on fb.$$),
    ('Charleston SC Yo-Yo Club', 'Charleston', 'SC', 32.9659885, -80.1679329, false, $$This club is an enigma. They have a thread on the YYE forums:
https://forums.yoyoexpert.com/t/charleston-sc-clubs/400989/96

I will add more details as they arrive.$$),
    ('Nashville Yo-Yo Club', 'Nashville', 'TN', 36.1543748, -86.7731053, false, $$New club alert! Hosted by Bolivian national yo-yo champion @yoyomemes !

Follow on Instagram at @yoyomemes for meet details!$$),
    ('Triad Area Throwers', 'Greensboro', 'NC', 36.0520608, -79.8208294, true, $$A new club for NC! They host a monthly meet at the Glenwood Library at 1901 W Florida St, Greensboro NC.

Find them on instagram at @triad_area_throwers or contact @hyde_elijahrieves$$),
    ('Skill Toy GR Group', 'Grand Rapids', 'MI', 42.9407365, -85.6863519, true, $$A new skill toy club in Grand Rapids! They meet the second Saturday of every month at DO NOT START (1265 Godfrey Ave SW, Grand Rapids, MI 49503)$$),
    ('SWVA Throwers', 'Roanoke', 'VA', 37.2707421, -79.9453116, false, $$New club in VA! No details on meet locations yet, but find them on Instagram at @swvathrowers$$),
    ('Wasatch Kendama', 'Salt Lake City', 'UT', 40.5522203, -111.9142073, false, $$Fresh dama club in Utah! Looks like a good time! Find them on Instagram at @wasatch.kendama for meet dates!$$),
    ('MN KEN CLUB', 'Minneapolis', 'MN', 45.0022616, -93.2519453, false, $$A dama club and a yo-yo club so close together!? I smell a mashup! Follow on Instagram at @mn.ken.club for meet updates.$$),
    ('Buckeye Kendama Club', 'Peninsula', 'OH', 41.2240546, -81.5105017, true, $$This club meets every other Sunday at noon at the Ledges Shelter in Peninsula Ohio. Follow on Instagram at @buckeye_kendama for updates.$$)
)
INSERT INTO public.entries (
  entity_type, display_name, email, city, region, country,
  bio, socials, lat, lng,
  exact_lat, exact_lng, address_line, postal_code, hours,
  club_meeting_info, club_venue_public, contact_name, age_band,
  verified_owner, is_visible, verified_at
)
SELECT
  'club',
  trim(n.display_name),
  'dmvthrowers+club-' || regexp_replace(lower(trim(n.display_name)), '[^a-z0-9]+', '-', 'g') || '@gmail.com',
  n.city,
  n.region,
  'US',
  NULL,
  '{}'::jsonb,
  n.lat,
  n.lng,
  CASE WHEN n.venue_public THEN n.lat ELSE NULL END,   -- exact_lat only when public
  CASE WHEN n.venue_public THEN n.lng ELSE NULL END,   -- exact_lng only when public
  NULL, NULL, NULL,
  n.info,
  n.venue_public,
  NULL,              -- contact_name
  NULL,              -- age_band
  false,             -- verified_owner
  true,              -- is_visible: publish immediately
  now()              -- verified_at
FROM new_clubs n
WHERE NOT EXISTS (
  SELECT 1 FROM public.entries e
  WHERE e.entity_type = 'club'
    AND lower(e.display_name) = lower(trim(n.display_name))
    AND e.deleted_at IS NULL
);

-- Audit
INSERT INTO public.audit_log (actor, action, meta)
VALUES ('system', 'clubs.bulk_import', jsonb_build_object('source', 'yoyo_clubs.csv'));
