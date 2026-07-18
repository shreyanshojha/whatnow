/* ============================================================
   WhatNow — OpenStreetMap helpers (free, no key).
   - Nominatim reverse-geocode for a friendly place name.
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
async function nearbyVenues(lat: number, lon: number): Promise<NearbyVenue[]> {
  try {
    const radius = 1500;
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

export async function fetchNearby(lat: number, lon: number): Promise<NearbyPlace> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  // Run both, but never let one failure sink the other.
  const [placeName, venues] = await Promise.all([reverseGeocode(lat, lon), nearbyVenues(lat, lon)]);
  const pick =
    venues.length > 0 ? venues[Math.floor(Math.random() * Math.min(venues.length, 3))] : null;
  const amenity = pick ? { name: pick.name, kind: pick.kind } : null;
  const value: NearbyPlace = { placeName, amenity, venues };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export { AMENITY_KINDS };
