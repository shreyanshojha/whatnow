/* ============================================================
   WhatNow — optional live nearby events (Ticketmaster Discovery API).

   OpenStreetMap has no concept of "happening today" — only static
   places. Real live events (concerts, shows, sports) need a real
   events provider, so this is bring-your-own-key like AI planning:
   the key lives only on the device (lib/secureSettings.ts) and is
   sent directly from the phone to Ticketmaster. Off, missing, or
   failed — this returns an empty list and the rest of the
   "Nearby right now" section (real venues) still works fine.

   Ticketmaster's `latlong` filter is deprecated in favor of
   `geoPoint` (a geohash), but still functional today and far
   simpler than encoding a geohash client-side for what's meant to
   be a lightweight, optional feature — revisit if Ticketmaster
   ever removes it. Docs: developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
   ============================================================ */

export interface LiveEvent {
  name: string;
  url: string | null;
  /** e.g. "Music", "Sports", "Arts & Theatre" */
  segment: string | null;
  venueName: string | null;
  city: string | null;
  /** YYYY-MM-DD, as Ticketmaster gives it — no time zone math attempted here. */
  localDate: string | null;
  localTime: string | null;
}

function parseEvent(raw: any): LiveEvent | null {
  if (!raw || typeof raw.name !== 'string') return null;
  const venue = raw._embedded?.venues?.[0];
  return {
    name: raw.name,
    url: typeof raw.url === 'string' ? raw.url : null,
    segment: raw.classifications?.[0]?.segment?.name ?? null,
    venueName: venue?.name ?? null,
    city: venue?.city?.name ?? null,
    localDate: raw.dates?.start?.localDate ?? null,
    localTime: raw.dates?.start?.localTime ?? null,
  };
}

export async function fetchNearbyEvents(
  lat: number,
  lon: number,
  apiKey: string,
  radiusKm = 15
): Promise<LiveEvent[]> {
  if (!apiKey || !apiKey.trim()) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${encodeURIComponent(apiKey.trim())}` +
      `&latlong=${lat.toFixed(3)},${lon.toFixed(3)}` +
      `&radius=${radiusKm}&unit=km&size=10&sort=date,asc`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return []; // includes bad/expired keys — degrade quietly
    const data = await res.json();
    const raw: any[] = data?._embedded?.events ?? [];
    return raw.map(parseEvent).filter((e): e is LiveEvent => e !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* Yelp Events was evaluated as a second events source and briefly wired up
   here, but dropped: Yelp's API pricing doesn't fit a lightweight optional
   feature like this one. Google Places (see lib/places.ts) was added
   instead as the BYOK upgrade path, though it covers venues, not scheduled
   events — Google has no public events-search API, so Ticketmaster above
   remains the only events source for now.

   (Eventbrite was evaluated too — its public event-search API was shut
   down in December 2019 and has stayed shut down since; the only endpoints
   left require already knowing an organizer's ID, which can't power a
   generic "what's near me" search.) */
