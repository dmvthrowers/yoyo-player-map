
'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, ZoomControl, AttributionControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useState, memo, useMemo, useEffect, useRef } from 'react';
import type { MapEntry, MapEntryDetail } from './page';
import type { MapFilters } from './MapClient';
import { haversineMiles, UNDERSERVED_THRESHOLD_MI } from '@/lib/geo';

// Fix Leaflet's default icon URLs for Next.js (no static assets from node_modules)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type DetailOnlyFields = Pick<
  MapEntryDetail,
  'bio' | 'socials' | 'address_line' | 'postal_code' | 'hours' | 'club_meeting_info' | 'club_venue_public'
>;

// LRU cache — prevents unbounded memory growth in serverless
const MAX_DETAIL_CACHE = 200;
const detailCache: globalThis.Map<string, DetailOnlyFields> = new globalThis.Map();

function setDetailCache(id: string, data: DetailOnlyFields) {
  if (detailCache.size >= MAX_DETAIL_CACHE) {
    const firstKey = detailCache.keys().next().value;
    if (firstKey) detailCache.delete(firstKey);
  }
  detailCache.set(id, data);
}

function useEntryDetail(id: string) {
  const cached = detailCache.get(id)?? null;
  const [detail, setDetail] = useState<DetailOnlyFields | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (detail) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);

    setLoading(true);
    setError(false);

    fetch(`/api/entry/${id}`, { signal: controller.signal })
     .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return (await r.json()) as DetailOnlyFields;
      })
     .then((data) => {
        setDetailCache(id, data);
        setDetail(data);
      })
     .catch((e) => {
        if (e.name!== 'AbortError') setError(true);
      })
     .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, attempt]);

  return { detail, loading, error, retry: () => setAttempt((n) => n + 1) };
}

function PopupError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mb-2 text-xs text-navy/70">
      <p className="mb-1">Couldn&apos;t load details.</p>
      <button type="button" onClick={onRetry} className="text-brand-red underline hover:no-underline">
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
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41z"/>
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

const PersonMarker = memo(({ entry, isUnderserved }: { entry: MapEntry; isUnderserved: boolean }) => {
  // Guard against bad data
  if (!Number.isFinite(entry.lat) ||!Number.isFinite(entry.lng)) return null;

  return (
    <>
      {isUnderserved && (
        <CircleMarker
          center={[entry.lat, entry.lng]}
          pathOptions={{
            color: '#B80000',
            fillColor: 'transparent',
            weight: 2,
            opacity: 0.6,
            dashArray: '4, 4',
          }}
          radius={16}
          interactive={false}
        />
      )}
      <CircleMarker
        center={[entry.lat, entry.lng]}
        pathOptions={{
          color: '#B80000',
          fillColor: '#B80000',
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
  );
});
PersonMarker.displayName = 'PersonMarker';

const ShopMarker = memo(({ entry }: { entry: MapEntry }) => {
  if (!Number.isFinite(entry.lat) ||!Number.isFinite(entry.lng)) return null;
  return (
    <Marker position={[entry.lat, entry.lng]} icon={entry.verified_owner? shopVerifiedIcon : shopIcon}>
      <Popup><ShopPopup entry={entry} /></Popup>
    </Marker>
  );
});
ShopMarker.displayName = 'ShopMarker';

const ClubMarker = memo(({ entry }: { entry: MapEntry }) => {
  if (!Number.isFinite(entry.lat) ||!Number.isFinite(entry.lng)) return null;
  return (
    <Marker position={[entry.lat, entry.lng]} icon={clubIcon}>
      <Popup><ClubPopup entry={entry} /></Popup>
    </Marker>
  );
});
ClubMarker.displayName = 'ClubMarker';

interface MapProps {
  entries: MapEntry[];
  allEntries: MapEntry[];
  filters: MapFilters;
}

export default function Map({ entries, allEntries, filters }: MapProps) {
  const [center] = useState<[number, number]>([39.5, -98.35]);
  const [zoom] = useState(4);

  const underservedIds = useMemo(() => {
    if (!filters.showUnderserved) return new Set<string>();

    const shops = allEntries.filter((e) => e.entity_type === 'shop');
    const clubs = allEntries.filter((e) => e.entity_type === 'club');
    const persons = allEntries.filter((e) => e.entity_type === 'person');

    const underserved = new Set<string>();
    const threshold = UNDERSERVED_THRESHOLD_MI;

    for (const person of persons) {
      let nearestShopDist = Infinity;
      for (const shop of shops) {
        const dist = haversineMiles(person.lat, person.lng, shop.lat, shop.lng);
        if (dist < nearestShopDist) {
          nearestShopDist = dist;
          if (nearestShopDist <= threshold) break; // early exit
        }
      }
      if (nearestShopDist <= threshold) continue;

      let nearestClubDist = Infinity;
      for (const club of clubs) {
        const dist = haversineMiles(person.lat, person.lng, club.lat, club.lng);
        if (dist < nearestClubDist) {
          nearestClubDist = dist;
          if (nearestClubDist <= threshold) break;
        }
      }
      if (nearestClubDist > threshold) underserved.add(person.id);
    }
    return underserved;
  }, [allEntries, filters.showUnderserved]);

  // Cluster only shop and club markers, not persons (for best UX)
  const personMarkers = useMemo(() => {
    return entries.filter(e => e.entity_type !== 'shop' && e.entity_type !== 'club').flatMap((entry) => {
      const markers = [];
      const threshold = 170;
      const isNearEast = entry.lng > threshold;
      const isNearWest = entry.lng < -threshold;
      const baseProps = { entry, key: entry.id, isUnderserved: underservedIds.has(entry.id) };
      const eastProps = {...baseProps, key: `${entry.id}-e`, entry: {...entry, lng: entry.lng - 360 } };
      const westProps = {...baseProps, key: `${entry.id}-w`, entry: {...entry, lng: entry.lng + 360 } };
      markers.push(<PersonMarker {...baseProps} />);
      if (isNearEast) markers.push(<PersonMarker {...eastProps} />);
      if (isNearWest) markers.push(<PersonMarker {...westProps} />);
      return markers;
    });
  }, [entries, underservedIds]);

  const clusterMarkers = useMemo(() => {
    return entries.filter(e => e.entity_type === 'shop' || e.entity_type === 'club').flatMap((entry) => {
      const markers = [];
      const threshold = 170;
      const isNearEast = entry.lng > threshold;
      const isNearWest = entry.lng < -threshold;
      const baseProps = { entry, key: entry.id };
      const eastProps = {...baseProps, key: `${entry.id}-e`, entry: {...entry, lng: entry.lng - 360 } };
      const westProps = {...baseProps, key: `${entry.id}-w`, entry: {...entry, lng: entry.lng + 360 } };
      if (entry.entity_type === 'shop') {
        markers.push(<ShopMarker {...baseProps} />);
        if (isNearEast) markers.push(<ShopMarker {...eastProps} />);
        if (isNearWest) markers.push(<ShopMarker {...westProps} />);
      } else if (entry.entity_type === 'club') {
        markers.push(<ClubMarker {...baseProps} />);
        if (isNearEast) markers.push(<ClubMarker {...eastProps} />);
        if (isNearWest) markers.push(<ClubMarker {...westProps} />);
      }
      return markers;
    });
  }, [entries]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={3}
      maxZoom={17}
      className="h-full w-full"
      scrollWheelZoom
      worldCopyJump
      preferCanvas
      maxBoundsViscosity={1.0}
      zoomControl={false}
      attributionControl={false}
    >
      <ZoomControl position="bottomleft" />
      <AttributionControl position="bottomleft" prefix={false} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
        {clusterMarkers}
      </MarkerClusterGroup>
      {personMarkers}
    </MapContainer>
  );
}

// Popups unchanged except SocialsLinks
function PersonPopup({ entry }: { entry: MapEntry }) {
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  const location = [entry.city, entry.region, entry.country].filter(Boolean).join(', ');
  return (
    <div className="min-w-55">
      <p className="font-bold text-base text-navy font-playfair">{entry.display_name}</p>
      <p className="text-xs text-navy/70 mb-2">{location} (approximate)</p>
      {loading? <PopupSkeleton /> : error? <PopupError onRetry={retry} /> : (
        <>
          {detail?.bio && <p className="text-sm text-navy mb-2">{detail.bio}</p>}
          <SocialsLinks socials={detail?.socials || {}} />
        </>
      )}
      <ReportLink entryId={entry.id} />
    </div>
  );
}

function ShopPopup({ entry }: { entry: MapEntry }) { /* unchanged */
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  return (
    <div className="min-w-55">
      <p className="text-[10px] uppercase tracking-wider text-[#2E8B57] font-bold mb-1">Yo-Yo Shop</p>
      <p className="font-bold text-base text-navy flex items-center gap-1 font-playfair">
        {entry.display_name}
        {entry.verified_owner && (
          <svg className="w-4 h-4 text-[#2E8B57]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        )}
      </p>
      <p className="text-xs text-navy/70 mb-2">{[entry.city, entry.region, entry.country].filter(Boolean).join(', ')}</p>
      {loading? <PopupSkeleton /> : error? <PopupError onRetry={retry} /> : (
        <>
          {detail?.address_line && <p className="text-xs text-navy/80 mb-1">{detail.address_line}{detail.postal_code && `, ${detail.postal_code}`}</p>}
          {detail?.hours && <div className="text-xs text-navy/80 mb-2 bg-cream p-2 -mx-1"><span className="font-semibold">Hours:</span> {detail.hours}</div>}
          {detail?.bio && <p className="text-sm text-navy mb-2">{detail.bio}</p>}
          <SocialsLinks socials={detail?.socials || {}} />
        </>
      )}
      <ReportLink entryId={entry.id} />
    </div>
  );
}

function ClubPopup({ entry }: { entry: MapEntry }) { /* unchanged */
  const { detail, loading, error, retry } = useEntryDetail(entry.id);
  const location = [entry.city, entry.region, entry.country].filter(Boolean).join(', ');
  return (
    <div className="min-w-55">
      <p className="text-[10px] uppercase tracking-wider text-[#1B2A49] font-bold mb-1">Yo-Yo Club</p>
      <p className="font-bold text-base text-navy font-playfair">{entry.display_name}</p>
      <p className="text-xs text-navy/70 mb-2">{location}{!loading &&!detail?.club_venue_public && ' (approximate)'}</p>
      {loading? <PopupSkeleton /> : error? <PopupError onRetry={retry} /> : (
        <>
          {detail?.club_meeting_info && <div className="text-xs text-navy/80 mb-2 bg-cream p-2 -mx-1"><span className="font-semibold">Meetings:</span> {detail.club_meeting_info}</div>}
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

  const safeUrl = (url: string) => {
    try {
      const u = new URL(url.startsWith('http')? url : `https://${url}`);
      return ['http:', 'https:'].includes(u.protocol)? u.toString() : null;
    } catch { return null; }
  };

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {socials.instagram && (
        <a href={`https://instagram.com/${socials.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="text-brand-red underline">IG</a>
      )}
      {socials.youtube && (() => {
        const url = socials.youtube.startsWith('http')? socials.youtube : `https://youtube.com/@${socials.youtube}`;
        const safe = safeUrl(url);
        return safe? <a href={safe} target="_blank" rel="noopener noreferrer" className="text-brand-red underline">YT</a> : null;
      })()}
      {socials.website && (() => {
        const safe = safeUrl(socials.website);
        return safe? <a href={safe} target="_blank" rel="noopener noreferrer" className="text-brand-red underline">Website</a> : null;
      })()}
      {socials.discord && <span className="text-navy/70">Discord: {socials.discord}</span>}
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