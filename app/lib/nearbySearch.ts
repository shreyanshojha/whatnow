/* ============================================================
   WhatNow — "Look online nearby" web-search layer.

   Structured APIs (Ticketmaster, OpenStreetMap) only cover what they
   cover — a lot of real local life is unlisted there: a neighborhood
   meetup on Eventbrite, a pop-up market, a movie that just opened at
   the theater across town. This module asks Claude to actually search
   the live web for that and hand back a short, structured list.

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
  category: 'event' | 'movie';
  url: string | null;
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
const DEFAULT_TIMEOUT = 25000;
// Each search is billed to the person's own key (~$10/1,000 searches +
// tokens) — keep a single request's blast radius small and predictable.
const MAX_SEARCHES = 4;

function buildPrompt(placeName: string | null): string {
  const where = placeName
    ? `near "${placeName}"`
    : 'nearby (no specific place name is available, so search broadly for ' +
      'well-known local event listings and mainstream new movie releases instead ' +
      'of anything hyper-local)';

  return [
    `Search the live web for real, currently happening things ${where}.`,
    `Find 5 to 8 results total, split across two kinds:`,
    `1) Local events, meetups, or pop-ups happening in the next week or so — ` +
      `check sources like Eventbrite, Meetup, local venue sites, and local news, ` +
      `not just well-known ticketing platforms. Unlisted, small, or niche is fine ` +
      `and encouraged — the goal is things a person wouldn't easily find any other way.`,
    `2) Movies that are newly released and currently playing in theaters ` +
      `${placeName ? `near "${placeName}"` : 'right now'}.`,
    `For each result give exactly: "name" (short), "blurb" (one plain sentence, ` +
      `no hype), "category" (the literal string "event" or "movie"), and "url" ` +
      `(a real URL from your search results, or null if you don't have a genuine one — ` +
      `never invent or guess a URL).`,
    `Respond with ONLY a JSON array of objects with those four fields — no prose, ` +
      `no markdown code fences, nothing before or after the array.`,
  ].join('\n');
}

function extractJsonArray(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    // Fall through to a looser extraction below.
  }
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validateResult(raw: unknown): NearbyResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name.trim()) return null;
  if (typeof r.blurb !== 'string' || !r.blurb.trim()) return null;
  if (r.category !== 'event' && r.category !== 'movie') return null;
  let url: string | null = null;
  if (typeof r.url === 'string' && /^https?:\/\/\S+$/.test(r.url.trim())) {
    url = r.url.trim();
  }
  return {
    name: r.name.trim().slice(0, 90),
    blurb: r.blurb.trim().slice(0, 200),
    category: r.category,
    url,
  };
}

/**
 * Ask Claude to search the web for real nearby events + new movies. Returns
 * null on any failure — no key, network error, timeout, or a response that
 * doesn't parse into at least one valid result. Never throws.
 */
export async function searchNearby(
  config: NearbySearchConfig,
  placeName: string | null = null
): Promise<NearbyResult[] | null> {
  const hasByok = !!config.apiKey && !!config.apiKey.trim();
  const hasShared = !!config.sharedAccessToken && !!config.sharedAccessToken.trim();
  if (!hasByok && !hasShared) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT);

  const system =
    'You search the live web and return only clean, valid JSON — no prose, ' +
    'no markdown, and never a fabricated URL.';
  const messages = [{ role: 'user', content: buildPrompt(placeName) }];
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
          max_tokens: 1500,
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
        body: JSON.stringify({ kind: 'nearby_search', max_tokens: 1500, system, messages, tools }),
      });
    }

    if (!res.ok) return null;
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

    const rawArr = extractJsonArray(text);
    if (!rawArr) return null;

    const valid = rawArr.map(validateResult).filter((r): r is NearbyResult => r !== null);
    if (valid.length === 0) return null;
    return valid.slice(0, 8);
  } catch {
    return null; // network error, timeout (AbortError), or unexpected shape
  } finally {
    clearTimeout(timer);
  }
}
