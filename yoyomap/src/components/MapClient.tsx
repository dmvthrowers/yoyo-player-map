import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiUrl } from "../lib/api";
import type { MapEntry } from "../spa-pages/MapPage";

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

function safeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function addText(parent: HTMLElement, tag: string, text: string, css: string) {
  const el = document.createElement(tag);
  el.style.cssText = css;
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

async function loadEntryDetail(id: string, el: HTMLElement) {
  if (el.dataset.loaded) return;
  el.dataset.loaded = "1";
  addText(el, "p", "Loading…", "font-size:11px;color:#999;margin-top:6px;");
  try {
    const res = await fetch(apiUrl(`/api/entry/${id}`));
    const data = await res.json();
    el.textContent = "";
    if (data.bio) addText(el, "p", data.bio, "font-size:12px;margin:6px 0;");
    if (data.hours) {
      const p = document.createElement("p");
      p.style.cssText = "font-size:11px;color:#555;margin:4px 0;";
      const b = document.createElement("strong");
      b.textContent = "Hours: ";
      p.appendChild(b);
      p.appendChild(document.createTextNode(data.hours));
      el.appendChild(p);
    }
    if (data.club_meeting_info) {
      const p = document.createElement("p");
      p.style.cssText = "font-size:11px;color:#555;margin:4px 0;";
      const b = document.createElement("strong");
      b.textContent = "Meets: ";
      p.appendChild(b);
      p.appendChild(document.createTextNode(data.club_meeting_info));
      el.appendChild(p);
    }
    const socialEntries = Object.entries(data.socials ?? {}).filter(([, v]) => safeUrl(v));
    if (socialEntries.length) {
      const div = document.createElement("div");
      div.style.cssText = "margin-top:6px;";
      socialEntries.forEach(([k, v]) => {
        const href = safeUrl(v)!;
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.cssText = "color:#D42B2B;margin-right:8px;font-size:11px;";
        a.textContent = k;
        div.appendChild(a);
      });
      el.appendChild(div);
    }
  } catch {
    el.textContent = "";
    addText(el, "p", "Failed to load details.", "font-size:11px;color:#D42B2B;margin-top:6px;");
  }
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

      // Build popup DOM safely — no innerHTML for any user-supplied values
      const container = document.createElement("div");
      container.style.cssText = "min-width:160px;font-family:system-ui,sans-serif;";

      const nameEl = document.createElement("p");
      nameEl.style.cssText = "font-weight:700;margin:0 0 2px 0;";
      nameEl.textContent = entry.display_name;
      container.appendChild(nameEl);

      const subEl = document.createElement("p");
      subEl.style.cssText = "font-size:11px;color:#666;margin:0 0 6px 0;";
      subEl.textContent = `${typeLabel} · ${[entry.city, entry.region, entry.country].filter(Boolean).join(", ")}`;
      container.appendChild(subEl);

      const btn = document.createElement("button");
      btn.style.cssText = "font-size:11px;color:#D42B2B;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;";
      btn.textContent = "View details…";
      btn.addEventListener("click", () => loadEntryDetail(entry.id, detailEl));
      container.appendChild(btn);

      const detailEl = document.createElement("div");
      container.appendChild(detailEl);

      const marker = L.marker([entry.lat, entry.lng], { icon });
      marker.bindPopup(container, { maxWidth: 280 });
      markersRef.current?.addLayer(marker);
    });
  }, [entries]);

  return <div ref={mapRef} className="h-full w-full" />;
}
