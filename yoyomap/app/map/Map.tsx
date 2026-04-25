'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, ZoomControl } from 'react-leaflet';
import { useState, memo, useMemo, useEffect } from 'react';
import L from 'leaflet';
import type { MapEntry, MapEntryDetail } from './page';
import type { MapFilters } from './MapClient';
import { haversineMiles, UNDERSERVED_THRESHOLD_MI } from '@/lib/geo';

// Popup-only fields fetched lazily from /api/entry/[id]. Null until loaded.
type DetailOnlyFields = Pick<
  MapEntryDetail,
  'bio' | 'socials' | 'address_line' | 'postal_code' | 'hours' | 'club_meeting_info' | 'club_venue_public'
>;

// Process-wide detail cache, keyed by entry id. A single user opening the
// same popup twice shouldn't double-fetch, and Vercel's edge cache takes
// care of cross-user dedup.
// Use globalThis.Map to avoid shadowing by this module's default export (also named Map).
const detailCache: globalThis.Map<string, DetailOnlyFields> = new globalThis.Map();

function useEntryDetail(id: string): {
  detail: DetailOnlyFields | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
} {
  const cached = detailCache.get(id) ?? null;
  const [detail, setDetail] = useState<DetailOnlyFields | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  // Bump to force re-fetch from the retry button.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (detail) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/entry/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as DetailOnlyFields;
      })
      .then((data) => {
        if (cancelled) return;
        detailCache.set(id, data);
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, detail, attempt]);

  return { detail, loading, error, retry: () => setAttempt((n) => n + 1) };
}

function PopupError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mb-2 text-xs text-navy/70">
      <p className="mb-1">Couldn&apos;t load details.</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-brand-red underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  );
}

function PopupSkeleton() {
  return (
    <div className="mb-2 space-y-1.5 animate-pulse" aria-hidden="true">
      <div className="h-3 bg-navy/10 w-full" />
      <div className="h-3 bg-navy/10 w-4/5" />
      <div className="h-3 bg-navy/10 w-2/3" />
    </div>
  );
}

// Custom icons for shops and clubs
const shopIcon = L.divIcon({
  className: 'shop-marker',
  html: `<div style="width:14px;height:14px;background:#2E8B57;border:2px solid #1a5a36;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const shopVerifiedIcon = L.divIcon({
  className: 'shop-marker-verified',
  html: `<div style="width:14px;height:14px;background:#2E8B57;border:2px solid #1a5a36;position:relative;">
    <svg style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#fff;border-radius:50%;" viewBox="0 0 24 24" fill="#2E8B57">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  </div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const clubIcon = L.divIcon({
  className: 'club-marker',
  html: `<div style="width:16px;height:16px;border:3px solid #1B2A49;border-radius:50%;background:transparent;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Person marker component (uses CircleMarker for performance)
const PersonMarker = memo(({ entry, isUnderserved }: { entry: MapEntry; isUnderserved: boolean }) => (
  <>
    {isUnderserved && (
      <CircleMarker
        center={[entry.lat, entry.lng]}
        pathOptions={{
          color: '#D42B2B',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 2,
          opacity: 0.6,
          dashArray: '4, 4',
        }}
        radius={16}
        className="animate-pulse"
      />
    )}
    <CircleMarker
      center={[entry.lat, entry.lng]}
      pathOptions={{
        color: '#D42B2B',
        fillColor: '#D42B2B',
        fillOpacity: 0.6,
        weight: 2,
      }}
      radius={6}
    >
      <Popup>
        <PersonPopup entry={entry} />
      </Popup>
    </CircleMarker>
  </>
));
PersonMarker.displayName = 'PersonMarker';

// Shop marker component
const ShopMarker = memo(({ entry }: { entry: MapEntry }) => (
  <Marker
    position={[entry.lat, entry.lng]}
    icon={entry.verified_owner ? shopVerifiedIcon : shopIcon}
  >
    <Popup>
      <ShopPopup entry={entry} />
    </Popup>
  </Marker>
));
ShopMarker.displayName = 'ShopMarker';

// Club marker component
const ClubMarker = memo(({ entry }: { entry: MapEntry }) => (
  <Marker position={[entry.lat, entry.lng]} icon={clubIcon}>
    <Popup>
      <ClubPopup entry={entry} />
    </Popup>
  </Marker>
));
ClubMarker.displayName = 'ClubMarker';

interface MapProps {
  entries: MapEntry[];
  allEntries: MapEntry[];
  filters: MapFilters;
}

export default function Map({ entries, allEntries, filters }: MapProps) {
  const [center] = useState<[number, number]>([39.5, -98.35]);
  const [zoom] = useState(4);

  // Compute underserved status for all person entries
  const underservedIds = useMemo(() => {
    if (!filters.showUnderserved) return new Set<string>();

    const shops = allEntries.filter((e) => e.entity_type === 'shop');
    const clubs = allEntries.filter((e) => e.entity_type === 'club');
    const persons = allEntries.filter((e) => e.entity_type === 'person');

    const underserved = new Set<string>();

    for (const person of persons) {
      // Find distance to nearest shop
      let nearestShopDist = Infinity;
      for (const shop of shops) {
        const dist = haversineMiles(person.lat, person.lng, shop.lat, shop.lng);
        if (dist < nearestShopDist) nearestShopDist = dist;
      }

      // Find distance to nearest club
      let nearestClubDist = Infinity;
      for (const club of clubs) {
        const dist = haversineMiles(person.lat, person.lng, club.lat, club.lng);
        if (dist < nearestClubDist) nearestClubDist = dist;
      }

      // Underserved if far from BOTH shops AND clubs
      if (nearestShopDist > UNDERSERVED_THRESHOLD_MI && nearestClubDist > UNDERSERVED_THRESHOLD_MI) {
        underserved.add(person.id);
      }
    }

    return underserved;
  }, [allEntries, filters.showUnderserved]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={3}
      maxZoom={17}
      className="h-full w-full"
      scrollWheelZoom={true}
      worldCopyJump={true}
      preferCanvas={true}
      maxBoundsViscosity={1.0}
      zoomControl={false}
    >
      <ZoomControl position="bottomleft" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        noWrap={false}
      />
      {entries.flatMap((entry) => {
        // Render duplicate markers for entries near the ±180° longitude
        const markers = [];
        const threshold = 170; // degrees, adjust if needed
        const isNearEast = entry.lng > threshold;
        const isNearWest = entry.lng < -threshold;

        const markerProps = { entry, key: entry.id };
        const markerPropsDupEast = { ...markerProps, key: entry.id + '-dup-east', entry: { ...entry, lng: entry.lng - 360 } };
        const markerPropsDupWest = { ...markerProps, key: entry.id + '-dup-west', entry: { ...entry, lng: entry.lng + 360 } };

        switch (entry.entity_type) {
          case 'shop':
            markers.push(<ShopMarker {...markerProps} />);
            if (isNearEast) markers.push(<ShopMarker {...markerPropsDupEast} />);
            if (isNearWest) markers.push(<ShopMarker {...markerPropsDupWest} />);
            break;
          case 'club':
            markers.push(<ClubMarker {...markerProps} />);
            if (isNearEast) markers.push(<ClubMarker {...markerPropsDupEast} />);
            if (isNearWest) markers.push(<ClubMarker {...markerPropsDupWest} />);
            break;
          case 'person':
          default:
            markers.push(
              <PersonMarker
                {...markerProps}
                isUnderserved={underservedIds.has(entry.id)}
              />
            );
            if (isNearEast)
              markers.push(
                <PersonMarker
                  {...markerPropsDupEast}
                  isUnderserved={underservedIds.has(entry.id)}
                />
              );
            if (isNearWest)
              markers.push(
                <PersonMarker
                  {...markerPropsDupWest}
                  isUnderserved={underservedIds.has(entry.id)}
                />
              );
            break;
        }
        return markers;
      })}
    </MapContainer>
  );
}

// =============================================================================
// Popup components
// =============================================================================

function PersonPopup({ entry }: { entry: MapEntry }) {
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  const location = [entry.city, entry.region, entry.country].filter(Boolean).join(', ');
  return (
    <div className="min-w-[220px]">
      <p className="font-bold text-base text-navy font-playfair">
        {entry.display_name}
      </p>
      <p className="text-xs text-navy/70 mb-2">{location} (approximate)</p>
      {loading ? (
        <PopupSkeleton />
      ) : error ? (
        <PopupError onRetry={retry} />
      ) : (
        <>
          {detail?.bio && <p className="text-sm text-navy mb-2">{detail.bio}</p>}
          <SocialsLinks socials={detail?.socials || {}} />
        </>
      )}
      <ReportLink entryId={entry.id} />
    </div>
  );
}

function ShopPopup({ entry }: { entry: MapEntry }) {
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  return (
    <div className="min-w-[220px]">
      <p className="text-[10px] uppercase tracking-wider text-[#2E8B57] font-bold mb-1">Yo-Yo Shop</p>
      <p className="font-bold text-base text-navy flex items-center gap-1 font-playfair">
        {entry.display_name}
        {entry.verified_owner && (
          <svg className="w-4 h-4 text-[#2E8B57]" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Verified owner">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        )}
      </p>
      <p className="text-xs text-navy/70 mb-2">
        {[entry.city, entry.region, entry.country].filter(Boolean).join(', ')}
      </p>
      {loading ? (
        <PopupSkeleton />
      ) : error ? (
        <PopupError onRetry={retry} />
      ) : (
        <>
          {detail?.address_line && (
            <p className="text-xs text-navy/80 mb-1">
              {detail.address_line}
              {detail.postal_code && `, ${detail.postal_code}`}
            </p>
          )}
          {detail?.hours && (
            <div className="text-xs text-navy/80 mb-2 bg-cream p-2 -mx-1">
              <span className="font-semibold">Hours:</span> {detail.hours}
            </div>
          )}
          {detail?.bio && <p className="text-sm text-navy mb-2">{detail.bio}</p>}
          <SocialsLinks socials={detail?.socials || {}} />
        </>
      )}
      <ReportLink entryId={entry.id} />
    </div>
  );
}

function ClubPopup({ entry }: { entry: MapEntry }) {
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  const location = [entry.city, entry.region, entry.country].filter(Boolean).join(', ');

  return (
    <div className="min-w-[220px]">
      <p className="text-[10px] uppercase tracking-wider text-[#1B2A49] font-bold mb-1">Yo-Yo Club</p>
      <p className="font-bold text-base text-navy font-playfair">
        {entry.display_name}
      </p>
      <p className="text-xs text-navy/70 mb-2">
        {location}
        {/* Only annotate once we actually know the venue's visibility. */}
        {!loading && !detail?.club_venue_public && ' (approximate)'}
      </p>
      {loading ? (
        <PopupSkeleton />
      ) : error ? (
        <PopupError onRetry={retry} />
      ) : (
        <>
          {detail?.club_meeting_info && (
            <div className="text-xs text-navy/80 mb-2 bg-cream p-2 -mx-1">
              <span className="font-semibold">Meetings:</span> {detail.club_meeting_info}
            </div>
          )}
          {detail?.bio && <p className="text-sm text-navy mb-2">{detail.bio}</p>}
          <SocialsLinks socials={detail?.socials || {}} />
        </>
      )}
      <ReportLink entryId={entry.id} />
    </div>
  );
}

function SocialsLinks({ socials }: { socials: Record<string, string> }) {
  if (!socials || Object.keys(socials).length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {socials.instagram && (
        <a
          href={`https://instagram.com/${socials.instagram.replace(/^@/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-red underline"
        >IG</a>
      )}
      {socials.youtube && (
        <a
          href={socials.youtube.startsWith('http') ? socials.youtube : `https://youtube.com/@${socials.youtube}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-red underline"
        >YT</a>
      )}
      {socials.discord && <span className="text-navy/70">Discord: {socials.discord}</span>}
      {socials.website && (
        <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-brand-red underline">
          Website
        </a>
      )}
    </div>
  );
}

function ReportLink({ entryId }: { entryId: string }) {
  return (
    <div className="mt-2 pt-2 border-t border-navy/10">
      <a href={`/report?id=${entryId}`} className="text-xs text-navy/50 underline">Report this pin</a>
    </div>
  );
}
