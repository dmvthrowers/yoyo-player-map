'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap: free vector tiles from OpenStreetMap data, no key, no account.
// Positron is the light gray style, closest to the Esri canvas it replaces.
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// MapLibre would look for its worker next to its own module, which the bundle doesn't have.
// `pnpm build` / `pnpm dev` copy it here (scripts/copy-maplibre-worker.mjs).
setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');

/** Draws OpenFreeMap vector tiles under the Leaflet pins (used when NEXT_PUBLIC_MAP_TILES=openfreemap). */
export default function VectorTiles() {
  const map = useMap();
  useEffect(() => {
    // Credits (OpenFreeMap, OpenMapTiles, OpenStreetMap) come from the style's sources; the
    // plugin moves them into Leaflet's attribution control once the style loads.
    const layer = maplibreGL({ style: OPENFREEMAP_STYLE }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);
  return null;
}
