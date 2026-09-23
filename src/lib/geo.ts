/** Haversine distance in miles. */
export function distanceMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Small built-in geocode table for demo mode (major metros) so
// "near me" / city search works without an external geocoder.
export const CITY_GEO: Record<string, { lat: number; lng: number; region: string }> = {
  dallas: { lat: 32.7767, lng: -96.797, region: 'TX' },
  'fort worth': { lat: 32.7555, lng: -97.3308, region: 'TX' },
  atlanta: { lat: 33.749, lng: -84.388, region: 'GA' },
  nashville: { lat: 36.1627, lng: -86.7816, region: 'TN' },
  phoenix: { lat: 33.4484, lng: -112.074, region: 'AZ' },
  'colorado springs': { lat: 38.8339, lng: -104.8214, region: 'CO' },
};

export function geocodeCity(input: string | undefined): { lat: number; lng: number } | null {
  if (!input) return null;
  const key = input.toLowerCase().trim();
  const hit = CITY_GEO[key];
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}
