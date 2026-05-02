export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export const UNDERSERVED_THRESHOLD_MI = 50;

export function jitterCoords(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  const miles = 10;
  const r = (miles * Math.sqrt(Math.random())) / 69;
  const theta = 2 * Math.PI * Math.random();
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + r * Math.cos(theta),
    lng: lng + (r * Math.sin(theta)) / cosLat,
  };
}
