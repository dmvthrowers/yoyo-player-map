import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiUrl } from "../lib/api";
import type { MapEntry } from "../pages/MapPage";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const COLORS: Record<string, string> = {
  person: "#3b82f6",
  shop: "#D42B2B",
  club: "#22c55e",
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

interface Props {
  entries: MapEntry[];
}

export default function MapClient({ entries }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const lMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || lMap.current) return;
    lMap.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(lMap.current);
    markersRef.current = L.layerGroup().addTo(lMap.current);

    return () => {
      lMap.current?.remove();
      lMap.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    entries.forEach((entry) => {
      const color = COLORS[entry.entity_type ?? "person"] ?? COLORS.person;
      const icon = makeIcon(color);
      const typeLabel = entry.entity_type === "shop" ? "Shop" : entry.entity_type === "club" ? "Club" : "Player";

      const marker = L.marker([entry.lat, entry.lng], { icon });
      marker.bindPopup(
        `<div style="min-width:160px;font-family:system-ui,sans-serif;">
          <p style="font-weight:700;margin:0 0 2px 0;">${entry.display_name}</p>
          <p style="font-size:11px;color:#666;margin:0 0 6px 0;">${typeLabel} · ${[entry.city, entry.region, entry.country].filter(Boolean).join(", ")}</p>
          <button
            onclick="window._loadEntryDetail('${entry.id}')"
            style="font-size:11px;color:#D42B2B;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;"
          >View details…</button>
          <div id="entry-detail-${entry.id}"></div>
        </div>`,
        { maxWidth: 280 },
      );
      markersRef.current?.addLayer(marker);
    });

    (window as unknown as Record<string, unknown>)._loadEntryDetail = async (id: string) => {
      const el = document.getElementById(`entry-detail-${id}`);
      if (!el || el.dataset.loaded) return;
      el.dataset.loaded = "1";
      el.innerHTML = `<p style="font-size:11px;color:#999;margin-top:6px;">Loading…</p>`;
      try {
        const res = await fetch(apiUrl(`/api/entry/${id}`));
        const data = await res.json();
        const socials = Object.entries(data.socials ?? {})
          .filter(([, v]) => v)
          .map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener noreferrer" style="color:#D42B2B;margin-right:8px;">${k}</a>`)
          .join("");
        el.innerHTML = `
          ${data.bio ? `<p style="font-size:12px;margin:6px 0;">${data.bio}</p>` : ""}
          ${data.hours ? `<p style="font-size:11px;color:#555;margin:4px 0;"><strong>Hours:</strong> ${data.hours}</p>` : ""}
          ${data.club_meeting_info ? `<p style="font-size:11px;color:#555;margin:4px 0;"><strong>Meets:</strong> ${data.club_meeting_info}</p>` : ""}
          ${socials ? `<div style="margin-top:6px;">${socials}</div>` : ""}
        `;
      } catch {
        el.innerHTML = `<p style="font-size:11px;color:#D42B2B;margin-top:6px;">Failed to load details.</p>`;
      }
    };
  }, [entries]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}
