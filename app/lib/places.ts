/* ============================================================
   WhatNow — OpenStreetMap helpers (free, no key).
   - Nominatim reverse-geocode for a friendly place name.
   - Nominatim forward-geocode (searchPlace) for someone who'd rather
     type a city/area than share GPS location — see PlanContext's
     setManualLocation and the "Search a place instead" flow on the
     context screen.
   - Overpass API for real nearby venues: one gets folded into a
     tip on a matching activity card, the fuller list powers the
     "Nearby right now" section on the Plan screen.
   All calls are wrapped, timed out, and cached to keep volume
   low and respect OSM usage policy. Failures degrade silently.
   ============================================================ */

// A descriptive User-Agent is required by OSM usage policy.
const UA = 'WhatNow/1.0 (app.shreyanshojha.whatnow; contact: hello@shreyanshojha.app)';

export interface NearbyVenue {
  name: string;
  kind: string;
  /** Straight-line distance in meters — a rough "how close," not walking distance. */
  distanceM: number;
}

export interface NearbyPlace {
  placeName: string | null; // e.g. "Shoreditch, London"
  amenity: { name: string; kind: string } | null; // e.g. { name: "Victoria Park", kind: "park" }
  venues: NearbyVenue[]; // fuller list, nearest first, for the "Nearby right now" section
}

const cache = new Map<string, { at: number; value: NearbyPlace }>();
const TTL = 30 * 60 * 1000; // 30 minutes — places barely change

async function timedFetch(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=14&addressdetails=1`;
    const res = await timedFetch(url, 9000);
    if (!res.ok) throw new Error('nominatim http ' + res.status);
    const data = await res.json();
    const a = data && data.address;
    if (!a) return null;
    const local =
      a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district;
    const city = a.city || a.town || a.municipality || a.state;
    if (local && city && local !== city) return `${local}, ${city}`;
    return local || city || (data.name as string) || null;
  } catch {
    return null;
  }
}

export interface PlaceCandidate {
  name: string;
  lat: number;
  lon: number;
}

/** Forward geocode: turn a typed place name (a city, neighborhood, landmark)
 * into coordinates, for someone who'd rather search than share GPS location.
 * Returns up to 5 candidates since a name like "Springfield" is ambiguous —
 * the UI shows these as a pick list rather than guessing the first result. */
export async function searchPlace(query: string): Promise<PlaceCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=` + encodeURIComponent(q);
    const res = await timedFetch(url, 9000);
    if (!res.ok) throw new Error('nominatim http ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: PlaceCandidate[] = [];
    for (const d of data as any[]) {
      const lat = parseFloat(d?.lat);
      const lon = parseFloat(d?.lon);
      const name = typeof d?.display_name === 'string' ? d.display_name : null;
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, lat, lon });
    }
    return out;
  } catch {
    return [];
  }
}

export type SearchRadius = 'close' | 'medium' | 'far';
/** How far the "nearby real venues" lookup casts its net. Tied to a manual
 * place search rather than a persistent global setting — someone picking a
 * city off a map is the moment "close by vs. willing to travel" is actually
 * on their mind. GPS location keeps the original fixed 1,500m default. */
export const RADIUS_METERS: Record<SearchRadius, number> = {
  close: 800,
  medium: 1500,
  far: 4000,
};

const AMENITY_KINDS = ['park', 'cafe', 'library', 'gym', 'restaurant', 'bar', 'museum', 'bookstore', 'cinema'] as const;

/** Haversine distance in meters — good enough for a rough "how close" sort. */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kindOf(tags: Record<string, string>): string | null {
  if (tags.leisure === 'park') return 'park';
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'library') return 'library';
  if (tags.leisure === 'fitness_centre') return 'gym';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.shop === 'books') return 'bookstore';
  if (tags.amenity === 'cinema') return 'cinema';
  return null;
}

/** One Overpass query covering every venue kind WhatNow cares about, nearest-first. */
async function nearbyVenues(lat: number, lon: number, radius: number = 1500): Promise<NearbyVenue[]> {
  try {
    const q =
      `[out:json][timeout:10];(` +
      `node["leisure"="park"](around:${radius},${lat},${lon});` +
      `node["amenity"="cafe"](around:${radius},${lat},${lon});` +
      `node["amenity"="library"](around:${radius},${lat},${lon});` +
      `node["leisure"="fitness_centre"](around:${radius},${lat},${lon});` +
      `node["amenity"="restaurant"](around:${radius},${lat},${lon});` +
      `node["amenity"~"^(bar|pub)$"](around:${radius},${lat},${lon});` +
      `node["tourism"="museum"](around:${radius},${lat},${lon});` +
      `node["shop"="books"](around:${radius},${lat},${lon});` +
      `node["amenity"="cinema"](around:${radius},${lat},${lon});` +
      `);out center 60;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
    const res = await timedFetch(url, 10000);
    if (!res.ok) throw new Error('overpass http ' + res.status);
    const data = await res.json();
    const els: any[] = (data && data.elements) || [];

    const seen = new Set<string>();
    const venues: NearbyVenue[] = [];
    for (const el of els) {
      if (!el.tags || !el.tags.name) continue;
      const kind = kindOf(el.tags);
      if (!kind) continue;
      const name = el.tags.name as string;
      if (seen.has(name)) continue; // OSM often has duplicate nodes for the same spot
      seen.add(name);
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const distanceM =
        typeof elLat === 'number' && typeof elLon === 'number'
          ? Math.round(distanceMeters(lat, lon, elLat, elLon))
          : radius;
      venues.push({ name, kind, distanceM });
    }
    venues.sort((a, b) => a.distanceM - b.distanceM);
    return venues.slice(0, 8);
  } catch {
    return [];
  }
}

export async function fetchNearby(lat: number, lon: number, radius: number = 1500): Promise<NearbyPlace> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  // Run both, but never let one failure sink the other.
  const [placeName, venues] = await Promise.all([
    reverseGeocode(lat, lon),
    nearbyVenues(lat, lon, radius),
  ]);
  const pick =
    venues.length > 0 ? venues[Math.floor(Math.random() * Math.min(venues.length, 3))] : null;
  const amenity = pick ? { name: pick.name, kind: pick.kind } : null;
  const value: NearbyPlace = { placeName, amenity, venues };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export { AMENITY_KINDS };
