/* ============================================================
   WhatNow — "Look online nearby" web-search layer.

   Structured APIs (Ticketmaster, OpenStreetMap) only cover what they
   cover — a lot of real local life is unlisted there: a neighborhood
   meetup on Eventbrite, a pop-up market, a movie that just opened at
   the theater across town, a genuinely great restaurant nobody's put
   on a "best of" list yet. This module asks Claude to actually search
   the live web for that and hand back a short, structured list.

   The point isn't just "list nearby things" — it's discovery: surface
   something a person didn't already know was there, weighted toward
   specific/interesting/lesser-known picks over the first obvious chain
   result, genuinely mixed across categories (not just events + movies),
   and honest about what's actually open or happening right now rather
   than just whatever's physically closest.

   A first search is intentionally broad (see buildPrompt). Once results
   are in, the Plan screen can offer one lightweight, category-relevant
   follow-up ("craving a cuisine?" / "in the mood for a genre?") and
   re-run this with `refineHint` set — see PlanContext's lookOnlineNearby
   and plan.tsx's LookOnlineNearby component.

   Same bring-your-own-key posture as lib/aiPlan.ts: this calls the
   Anthropic API directly from the device with the person's own key
   (the same one used for AI planning — see About screen copy), using
   Claude's native web_search tool. Nothing passes through a WhatNow
   server. Fully optional and additive — any failure just means the
   "Look online nearby" section quietly doesn't appear.

   During the beta (see lib/betaConfig.ts), signed-in people without
   their own key go through the same ai-proxy Edge Function used by
   lib/aiPlan.ts instead — see the dual-transport branch below.
   ============================================================ */

import { SUPABASE_URL } from './supabase';

export interface NearbyResult {
  name: string;
  blurb: string;
  category: 'event' | 'movie' | 'restaurant' | 'discover';
  url: string | null;
}

/** What searchNearby actually hands back on a successful call — always
 * includes `note`, the model's own short, plain-language comment on the
 * results (e.g. "It's 2am, so most kitchens are closed — these are what's
 * still open" or "Not much is open this late, but here's what is"). Live
 * testing showed the previous "just a bare array, or null" contract left
 * the UI with nothing to say beyond a generic "couldn't find anything" any
 * time real-world results were thin — which reads as broken rather than
 * honest about why. `results` can legitimately be empty while `note` still
 * explains what's going on (e.g. genuinely nothing is open right now). */
export interface NearbySearchOutcome {
  results: NearbyResult[];
  note: string | null;
}

export interface NearbySearchConfig {
  /** Bring-your-own-key path: set this to call Anthropic directly. Takes
   * precedence over `sharedAccessToken` if both are set. */
  apiKey?: string;
  /** Beta shared-key path — see lib/betaConfig.ts and lib/aiPlan.ts. */
  sharedAccessToken?: string;
  /** Defaults to the same fast, inexpensive model used for AI planning.
   * Ignored on the shared-key path, which the server decides instead. */
  model?: string;
  /** Ms before the request is aborted. Web search can take longer than
   * plain generation since it may run several searches — default 25s. */
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
// Live-verified (production, 2026-07): the shared beta path always uses a
// server-decided model (currently Sonnet, not the Haiku default above —
// see beta_ai_config), and a web-search tool-use loop through it routinely
// runs several searches before composing a final answer. 25s was cutting
// that off mid-search on a majority of real attempts — the "only worked
// once out of four tries" the search feature was reported to do. 45s gives
// a multi-search Sonnet call real room to finish instead of racing it.
const DEFAULT_TIMEOUT = 45000;
// Each search is billed to the person's own key (~$10/1,000 searches +
// tokens) — keep a single request's blast radius small and predictable.
const MAX_SEARCHES = 4;

function buildPrompt(placeName: string | null, nowLabel: string, refineHint?: string): string {
  const where = placeName
    ? `near "${placeName}"`
    : 'nearby (no specific place name is available, so search broadly for ' +
      'well-known local listings instead of anything hyper-local)';

  const lines: string[] = [];
  lines.push(`It's currently ${nowLabel}. Search the live web for real things ${where} worth doing right now.`);
  lines.push(
    `The whole point of this feature is discovery — help someone find something genuinely ` +
      `interesting nearby that they probably don't already know about, not the first obvious ` +
      `chain restaurant or the one big event everyone already sees on a quick search. Favor ` +
      `specific, real, slightly off-the-beaten-path picks — a well-reviewed independent ` +
      `restaurant, a neighborhood night market, a pop-up, a small gallery or exhibit, a food ` +
      `hall, a scenic spot a local would actually recommend — over generic or corporate ones. ` +
      `Never invent one to fill this out; if you're not confident it's real, keep searching or ` +
      `leave it out.`
  );
  lines.push(
    `Keep everything within a comfortable range of ${placeName ?? 'that area'} — think a short ` +
      `walk or a quick drive, not a destination trip across town. Among things that are all ` +
      `reasonably close, pick the most interesting one, not just whichever happens to be nearest ` +
      `on a map.`
  );
  lines.push(
    `Time matters as much as distance: only include things realistically open or actually ` +
      `happening at ${nowLabel} — check real hours/dates with search rather than assuming. Skip ` +
      `anything already closed, already over, or not opening for hours yet. Late at night, lean ` +
      `toward what's genuinely open then (late-night food, a bar, a 24-hour spot) instead of ` +
      `daytime-only places; early morning, lean toward what actually opens early.`
  );
  lines.push(
    `Find 6 to 9 results spread across a real MIX of these four kinds — don't let it collapse ` +
      `into mostly one kind (restaurants are the easiest to find, so it's tempting to lean on ` +
      `them; actively resist that). As a target: no more than 3 of the total should be ` +
      `restaurants, and genuinely try to include at least one each of event, movie, and ` +
      `discover if anything real and current qualifies. It's fine to end up with zero of a kind ` +
      `if nothing legitimately fits right now — never invent one just to fill a quota.`
  );
  lines.push(
    `- "restaurant": a specific, real restaurant, food stall, or food hall worth trying right ` +
      `now — prioritize distinctive or lesser-known spots with genuinely good reputations over chains.`
  );
  lines.push(
    `- "event": a real event, meetup, pop-up, night market, art walk, class, tasting, or fair ` +
      `happening now or in the next week. Hard exclude anything membership-only, invite-only, or ` +
      `restricted to a specific organization's members (HOAs, private clubs, alumni groups, work ` +
      `meetups). Skip routine civic notices (street sweeping, utility work) — not an activity.`
  );
  lines.push(
    `- "movie": a specific movie newly released and currently playing in theaters nearby — ` +
      `"name" must be the movie's actual title, never a theater's name.`
  );
  lines.push(
    `- "discover": anything else genuinely worth knowing about nearby that doesn't fit the ` +
      `above — a scenic viewpoint, a small museum or gallery, an unusual shop, a landmark, a ` +
      `walk or trail, a market. This is the "things you didn't know were here" bucket.`
  );
  if (refineHint && refineHint.trim()) {
    lines.push(
      `The person just asked for something more specific: "${refineHint.trim()}." Bias your ` +
        `picks — especially any restaurant or movie results — toward that, while keeping the ` +
        `same mix and honesty rules above. If you can't find a good real match for it, return ` +
        `fewer results rather than forcing a bad fit.`
    );
  }
  lines.push(
    `For each result give exactly: "name" (short, the actual place/event/movie name — never a ` +
      `theater name for a movie), "blurb" (one plain, specific sentence about what makes it worth ` +
      `going, not hype), "category" (the literal string "event", "movie", "restaurant", or ` +
      `"discover"), and "url" (a real URL from your search results, or null if you don't have a ` +
      `genuine one — never invent or guess a URL).`
  );
  lines.push(
    `Also include a short "note" — one plain sentence of real context about these results, or ` +
      `null if there's nothing worth flagging. Use it especially when time of day is limiting ` +
      `what's actually available (e.g. "It's the middle of the night, so most kitchens are ` +
      `closed — these are what's still open" or "Not much is happening this early, but here's ` +
      `what's open"), or when you genuinely couldn't find much nearby at all (say so plainly ` +
      `rather than letting a thin list speak for itself). Never use it to apologize or pad — ` +
      `only when it actually explains something about why the list looks the way it does.`
  );
  lines.push(
    `Respond with ONLY a JSON object, no prose, no markdown code fences: ` +
      `{"note": "one sentence or null", "results": [ ...the result objects above... ]}. ` +
      `"results" can be an empty array if truly nothing real qualifies right now — that's a ` +
      `valid, honest answer, not a failure; explain why in "note" when that happens.`
  );
  return lines.join('\n');
}

/** Extracts `{ note, results }` from the model's text — tolerant of stray
 * prose/markdown fences around the object (extractJsonArray in lib/aiPlan.ts
 * takes the same defensive approach). Falls back to treating the whole
 * thing as a bare array (the pre-`note` response shape) so a model that
 * ignores the object-wrapping instruction still degrades gracefully
 * instead of losing the results entirely. */
function extractResponse(text: string): { note: string | null; results: unknown[] } | null {
  const tryParse = (s: string): { note: string | null; results: unknown[] } | null => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s);
    } catch {
      return null;
    }
    if (Array.isArray(parsed)) return { note: null, results: parsed };
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      const results = Array.isArray(o.results) ? o.results : null;
      if (!results) return null;
      const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim().slice(0, 200) : null;
      return { note, results };
    }
    return null;
  };

  const direct = tryParse(text);
  if (direct) return direct;

  // Loosest fallback: grab the outermost {...} or [...] in the text.
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    const viaObj = tryParse(text.slice(objStart, objEnd + 1));
    if (viaObj) return viaObj;
  }
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    const viaArr = tryParse(text.slice(arrStart, arrEnd + 1));
    if (viaArr) return viaArr;
  }
  return null;
}

const VALID_RESULT_CATS = new Set(['event', 'movie', 'restaurant', 'discover']);

function validateResult(raw: unknown): NearbyResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim()) return null;
  if (typeof r.blurb !== 'string' || !r.blurb.trim()) return null;
  if (typeof r.category !== 'string' || !VALID_RESULT_CATS.has(r.category)) return null;
  let url: string | null = null;
  if (typeof r.url === 'string' && /^https?:\/\/\S+$/.test(r.url.trim())) {
    url = r.url.trim();
  }
  return {
    name: r.name.trim().slice(0, 90),
    blurb: r.blurb.trim().slice(0, 200),
    category: r.category as NearbyResult['category'],
    url,
  };
}

/**
 * Ask Claude to search the web for real, currently-open/happening nearby
 * things — restaurants, events, movies, and general "didn't know this was
 * here" discoveries (see buildPrompt). Returns null only on a genuine
 * technical failure — no key, network error, timeout, or a response that
 * doesn't parse at all. A real answer from the model — even "nothing
 * qualifies right now, here's why" — comes back as an outcome with an
 * empty `results` array and a `note` explaining it, not null; see
 * NearbySearchOutcome. Never throws.
 */
export async function searchNearby(
  config: NearbySearchConfig,
  placeName: string | null = null,
  /** Called (shared-key path only) when the request fails specifically
   * because today's shared beta AI cap was hit — see the matching param
   * on generateAiPlan in lib/aiPlan.ts. */
  onCapped?: () => void,
  /** A follow-up preference from a second-round question the Plan screen
   * asked after the first search came back — e.g. "Italian food" if a
   * restaurant result showed up, or "something funny" for a movie result.
   * See plan.tsx's LookOnlineNearby. Undefined for the first search. */
  refineHint?: string,
  /** Called on a genuine technical failure (never on a valid "zero real
   * results" answer from the model — that goes through the normal return
   * value with a `note` instead) so the UI can tell "the search itself
   * broke" apart from "the model looked and found nothing," which used to
   * both read as the same unhelpful "couldn't find anything" message. */
  onError?: (reason: 'timeout' | 'network' | 'unreadable') => void
): Promise<NearbySearchOutcome | null> {
  const hasByok = !!config.apiKey && !!config.apiKey.trim();
  const hasShared = !!config.sharedAccessToken && !!config.sharedAccessToken.trim();
  if (!hasByok && !hasShared) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT);

  // Local clock time, in the person's own words ("Wednesday, 2:45 PM") —
  // the whole point of passing this is so the model actually reasons about
  // what's plausibly open/happening right now instead of just listing
  // whatever's closest on a map (see buildPrompt).
  const nowLabel = new Date().toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });

  const system =
    'You search the live web and return only clean, valid JSON — no prose, ' +
    'no markdown, and never a fabricated URL or a fabricated place.';
  const messages = [{ role: 'user', content: buildPrompt(placeName, nowLabel, refineHint) }];
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }];

  try {
    let res: Response;
    if (hasByok) {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey!.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model ?? DEFAULT_MODEL,
          max_tokens: 1800,
          system,
          messages,
          tools,
        }),
      });
    } else {
      res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${config.sharedAccessToken!.trim()}`,
        },
        body: JSON.stringify({ kind: 'nearby_search', max_tokens: 1800, system, messages, tools }),
      });
    }

    if (!res.ok) {
      if (hasShared && res.status === 429) onCapped?.();
      else onError?.('network');
      return null;
    }
    const data = await res.json();
    const blocks: unknown[] = Array.isArray(data?.content) ? data.content : [];

    // The response interleaves text with server_tool_use/web_search_tool_result
    // blocks as Claude searches — join every text block in order to get its
    // final answer, wherever the model happened to put the JSON.
    const text = blocks
      .filter((b): b is { type: string; text: string } => {
        return !!b && typeof b === 'object' && (b as any).type === 'text';
      })
      .map((b) => b.text)
      .join('\n');

    const parsed = extractResponse(text);
    if (!parsed) {
      onError?.('unreadable');
      return null;
    }

    const valid = parsed.results.map(validateResult).filter((r): r is NearbyResult => r !== null);
    return { results: valid.slice(0, 8), note: parsed.note };
  } catch (e) {
    onError?.(e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network');
    return null; // network error, timeout (AbortError), or unexpected shape
  } finally {
    clearTimeout(timer);
  }
}
