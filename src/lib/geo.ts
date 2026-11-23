/**
 * Haversine distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface WardCoordinateCheck {
  id: string;
  name: string;
  code: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}

/**
 * Determine the closest ward within service radius for a given point
 */
export function findMatchingWard(
  lat: number,
  lng: number,
  wards: WardCoordinateCheck[]
): WardCoordinateCheck | null {
  let closestWard: WardCoordinateCheck | null = null;
  let minDistance = Infinity;

  for (const ward of wards) {
    const dist = calculateDistanceMeters(lat, lng, ward.centerLat, ward.centerLng);
    if (dist <= ward.radiusMeters && dist < minDistance) {
      minDistance = dist;
      closestWard = ward;
    }
  }

  // If outside exact radius, assign to nearest ward as fallback
  if (!closestWard && wards.length > 0) {
    let fallbackWard = wards[0];
    let fallbackDist = calculateDistanceMeters(lat, lng, fallbackWard.centerLat, fallbackWard.centerLng);
    for (let i = 1; i < wards.length; i++) {
      const d = calculateDistanceMeters(lat, lng, wards[i].centerLat, wards[i].centerLng);
      if (d < fallbackDist) {
        fallbackDist = d;
        fallbackWard = wards[i];
      }
    }
    return fallbackWard;
  }

  return closestWard;
}
