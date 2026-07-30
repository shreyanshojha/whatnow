/* ============================================================
   WhatNow — optional live nearby events (Ticketmaster Discovery API).

   OpenStreetMap has no concept of "happening today" — only static
   places. Real live events (concerts, shows, sports) need a real
   events provider. Bring-your-own-key still works exactly as before
   (the key lives only on the device — lib/secureSettings.ts — and is
   sent directly from the phone to Ticketmaster), but during the beta
   (see lib/betaConfig.ts) a signed-in person without their own key
   instead goes through the events-proxy Supabase Edge Function, which
   holds a shared Ticketmaster key server-side and enforces its own
   caps — same dual-transport shape as lib/aiPlan.ts and
   lib/nearbySearch.ts. Off, missing, failed, or capped — this returns
   an empty list and the rest of the "Nearby right now" section (real
   venues) still works fine.

   Ticketmaster's `latlong` filter is deprecated in favor of
   `geoPoint` (a geohash), but still functional today and far
   simpler than encoding a geohash client-side for what's meant to
   be a lightweight, optional feature — revisit if Ticketmaster
   ever removes it. Docs: developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
   ============================================================ */

import { SUPABASE_URL } from './supabase';

export interface EventsConfig {
  /** Bring-your-own-key path: set this to call Ticketmaster directly from
   * the device. Takes precedence over `sharedAccessToken` if both are set. */
  apiKey?: string;
  /** Beta shared-key path: a signed-in user's Supabase access token, used
   * to call the events-proxy Edge Function instead (see lib/betaConfig.ts). */
  sharedAccessToken?: string;
}

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
  config: EventsConfig,
  radiusKm = 15,
  /** Called (shared-key path only) when the request fails specifically
   * because today's shared beta events cap was hit — same shape as the
   * matching param on generateAiPlan/searchNearby. Events fails silently
   * everywhere else by design (see file header), so this is opt-in for a
   * caller that actually wants to distinguish "capped" from any other
   * quiet failure. */
  onCapped?: () => void
): Promise<LiveEvent[]> {
  const hasByok = !!config.apiKey && !!config.apiKey.trim();
  const hasShared = !!config.sharedAccessToken && !!config.sharedAccessToken.trim();
  if (!hasByok && !hasShared) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    let res: Response;
    if (hasByok) {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events.json` +
        `?apikey=${encodeURIComponent(config.apiKey!.trim())}` +
        `&latlong=${lat.toFixed(3)},${lon.toFixed(3)}` +
        `&radius=${radiusKm}&unit=km&size=10&sort=date,asc`;
      res = await fetch(url, { signal: controller.signal });
    } else {
      res = await fetch(`${SUPABASE_URL}/functions/v1/events-proxy`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${config.sharedAccessToken!.trim()}`,
        },
        body: JSON.stringify({ lat, lon, radiusKm }),
      });
    }
    if (!res.ok) {
      // events-proxy returns 429 specifically when today's shared cap
      // (per-user or global) has been hit — see ai-proxy/nearbySearch for
      // the same convention. Every other failure (bad/expired BYOK key,
      // expired session, provider error) degrades quietly either way.
      if (hasShared && res.status === 429) onCapped?.();
      return [];
    }
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
