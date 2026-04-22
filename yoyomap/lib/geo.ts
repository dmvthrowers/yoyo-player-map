/**
 * Geographic utilities for the yo-yo map.
 */

/**
 * Calculate the distance between two points in miles using the Haversine formula.
 * Used for the "underserved players" overlay to find distance to nearest shop/club.
 */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  
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

/**
 * Threshold in miles for determining if a player is "underserved".
 * A player is underserved if they are more than this distance from
 * BOTH the nearest shop AND the nearest club.
 */
export const UNDERSERVED_THRESHOLD_MI = 50;
