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
  venues: NearbyVenue[]; // nearest first — powers both "Nearby right now" and each
  // activity card's category-matched location tip (see ActivityCard.tsx)
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
    // `neighbourhood`/`quarter` are OSM's finest-grained, most locally
    // recognizable labels (e.g. "Nob Hill", "Russian Hill"). `suburb` is
    // often a much coarser or even mistagged administrative area in dense
    // cities — verified against Russian Hill, SF coordinates returning
    // quarter: "Nob Hill" (correct-ish, adjacent) vs. suburb: "South of
    // Market" (a genuinely different, non-adjacent-feeling neighborhood).
    // Prefer the precise fields first.
    const local =
      a.neighbourhood || a.quarter || a.suburb || a.village || a.town || a.city_district;
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

// Public Overpass instances all serve the same underlying OSM data — falling
// back to a second one when the first is overloaded meaningfully improves
// real-world success instead of silently showing "nothing nearby." Confirmed
// live in production: overpass-api.de returned a flat 503 on every single
// request during a real test (Nob Hill, SF — a dense area that should have
// returned plenty), which is that free shared instance being over capacity,
// not an empty result. kumi.systems is a well-established community-run
// mirror commonly used for exactly this kind of fallback.
const OVERPASS_HOSTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Two groups (not one-per-kind) rather than one big union query, since a
// single query covering all 9 amenity kinds reliably hit Overpass's own
// server-side timeout (504, ~8-9s) in dense urban areas — confirmed against
// Russian Hill, SF, which has enough of each amenity kind within 1500m that
// the combined scan never finished. But four parallel groups (the previous
// split) turned out to be one too many: the public instances only allow
// ~2 concurrent queries per IP, and four at once reliably tripped that
// limit — every group came back 503 together in production, not because
// the server was down, but because all four requests landed in the same
// instant. Two groups keeps each query fast enough on its own while
// staying inside that concurrency limit.
const AMENITY_QUERY_GROUPS: string[][] = [
  [
    `node["leisure"="park"]`,
    `node["amenity"="cafe"]`,
    `node["amenity"="restaurant"]`,
    `node["amenity"~"^(bar|pub)$"]`,
  ],
  [
    `node["amenity"="library"]`,
    `node["leisure"="fitness_centre"]`,
    `node["tourism"="museum"]`,
    `node["shop"="books"]`,
    `node["amenity"="cinema"]`,
  ],
];

async function fetchVenueGroup(
  nodeFilters: string[],
  lat: number,
  lon: number,
  radius: number
): Promise<any[]> {
  const clauses = nodeFilters.map((f) => `${f}(around:${radius},${lat},${lon});`).join('');
  const q = `[out:json][timeout:12];(${clauses});out center 60;`;
  const query = encodeURIComponent(q);
  // Try each mirror in order — a 503/504 from one (the public instance
  // being over capacity, which is common) moves on to the next rather than
  // giving up immediately and reporting "nothing nearby."
  for (const host of OVERPASS_HOSTS) {
    try {
      const res = await timedFetch(`${host}?data=${query}`, 12000);
      if (!res.ok) continue;
      const data = await res.json();
      return (data && data.elements) || [];
    } catch {
      // network error or timeout on this host — fall through to the next mirror
    }
  }
  return [];
}

/** Real nearby venues across every kind WhatNow cares about, nearest-first.
 * Runs two Overpass queries in parallel (each with its own mirror fallback)
 * instead of one big one — see AMENITY_QUERY_GROUPS above for why. */
async function nearbyVenues(lat: number, lon: number, radius: number = 1500): Promise<NearbyVenue[]> {
  const groups = await Promise.all(
    AMENITY_QUERY_GROUPS.map((g) => fetchVenueGroup(g, lat, lon, radius))
  );
  const els = groups.flat();

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
}

/* ============================================================
   Google Places (optional, bring-your-own-key) — a paid upgrade
   over the free OpenStreetMap venues above. Same NearbyVenue shape,
   same "kind" vocabulary (see GOOGLE_TYPE_TO_KIND), so every existing
   consumer (the "Nearby right now" list, each activity card's
   category-matched tip in ActivityCard.tsx) works unchanged whether
   a venue came from OSM or Google. Used only when a key is present;
   never required, never blocks fetchNearby if it fails.
   ============================================================ */
const GOOGLE_TYPE_TO_KIND: Record<string, string> = {
  park: 'park',
  cafe: 'cafe',
  library: 'library',
  gym: 'gym',
  restaurant: 'restaurant',
  bar: 'bar',
  museum: 'museum',
  book_store: 'bookstore',
  movie_theater: 'cinema',
};

async function fetchGoogleType(
  type: string,
  lat: number,
  lon: number,
  radius: number,
  apiKey: string
): Promise<any[]> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lon}&radius=${radius}&type=${type}&key=${encodeURIComponent(apiKey)}`;
    const res = await timedFetch(url, 9000);
    if (!res.ok) throw new Error('places http ' + res.status);
    const data = await res.json();
    // Google's own status field, not just the HTTP code, carries most real
    // failures here (bad key, billing not enabled, over quota) — treat
    // anything but a clean OK/ZERO_RESULTS as "no results," same graceful
    // degrade as every other optional source in this file.
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

async function googlePlacesVenues(
  lat: number,
  lon: number,
  radius: number,
  apiKey: string
): Promise<NearbyVenue[]> {
  const types = Object.keys(GOOGLE_TYPE_TO_KIND);
  const groups = await Promise.all(types.map((t) => fetchGoogleType(t, lat, lon, radius, apiKey)));

  const seen = new Set<string>();
  const venues: NearbyVenue[] = [];
  groups.forEach((results, i) => {
    const kind = GOOGLE_TYPE_TO_KIND[types[i]];
    for (const r of results) {
      const name = r?.name as string | undefined;
      const rLat = r?.geometry?.location?.lat;
      const rLon = r?.geometry?.location?.lng;
      if (!name || typeof rLat !== 'number' || typeof rLon !== 'number') continue;
      if (seen.has(name)) continue; // a place can match more than one type search
      seen.add(name);
      venues.push({ name, kind, distanceM: Math.round(distanceMeters(lat, lon, rLat, rLon)) });
    }
  });
  venues.sort((a, b) => a.distanceM - b.distanceM);
  return venues.slice(0, 8);
}

export async function fetchNearby(
  lat: number,
  lon: number,
  radius: number = 1500,
  googlePlacesApiKey?: string
): Promise<NearbyPlace> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)},${radius},${googlePlacesApiKey ? 'g' : 'o'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  // Run everything in parallel, but never let one source's failure sink
  // another. Google (when a key is set) leads the merged list — it's what
  // the person paid to get better data from — with OSM filling any gaps
  // and acting as the sole source when no key is set at all.
  const [placeName, osmVenues, googleVenues] = await Promise.all([
    reverseGeocode(lat, lon),
    nearbyVenues(lat, lon, radius),
    googlePlacesApiKey ? googlePlacesVenues(lat, lon, radius, googlePlacesApiKey) : Promise.resolve<NearbyVenue[]>([]),
  ]);

  const seen = new Set<string>();
  const venues: NearbyVenue[] = [];
  for (const v of [...googleVenues, ...osmVenues]) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    venues.push(v);
  }
  venues.sort((a, b) => a.distanceM - b.distanceM);

  const value: NearbyPlace = { placeName, venues: venues.slice(0, 8) };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export { AMENITY_KINDS };
