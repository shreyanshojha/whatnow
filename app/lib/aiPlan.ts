/* ============================================================
   WhatNow — optional AI planning layer.

   Composes a fresh, situational plan with an LLM instead of
   picking from the static ACTIVITIES dataset. Fully optional and
   additive: if it's off, if no key is set, if the network call
   fails, times out, or the model returns something that doesn't
   match the app's schema, this returns `null` and the caller
   (PlanContext) falls straight back to the deterministic engine
   in lib/plan.ts. The user should never see a broken plan.

   Bring-your-own-key: the API key lives only on the user's
   device (see lib/secureSettings.ts) and is sent directly from
   the device to the provider. Nothing passes through any server
   WhatNow controls, and nothing is bundled into the app build.

   During the beta (see lib/betaConfig.ts), signed-in people without
   their own key instead go through the ai-proxy Supabase Edge
   Function, which holds a shared key server-side and enforces real
   caps a client can't bypass. Both paths share every line of prompt
   building and response validation below — only the transport (who
   we send the finished request to) differs.
   ============================================================ */

import { SUPABASE_URL } from './supabase';
import {
  Activity,
  CatId,
  CATS,
  COST,
  Cost,
  E,
  Energy,
  MoodId,
  Place,
  Social,
  TimeVal,
} from '../data/activities';
import { PlanInput, planCount } from './plan';

export type AiProvider = 'anthropic';

export interface AiPlanConfig {
  /** Bring-your-own-key path: set this to call Anthropic directly from the
   * device. Takes precedence over `sharedAccessToken` if both are set. */
  apiKey?: string;
  /** Beta shared-key path: a signed-in user's Supabase access token, used
   * to call the ai-proxy Edge Function instead (see lib/betaConfig.ts). */
  sharedAccessToken?: string;
  provider?: AiProvider;
  /** Defaults to a fast, inexpensive model — plenty for short structured JSON. */
  model?: string;
  /** Ms before the request is aborted and we fall back. Default 15s. */
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_TIMEOUT = 15000;

const ENERGY_LABEL: Record<Energy, string> = { low: 'low', medium: 'medium', high: 'high' };
const SOCIAL_LABEL: Record<Social, string> = {
  solo: 'alone',
  someone: 'with one other person',
  group: 'with a group',
};
const PLACE_LABEL: Record<Place, string> = {
  indoor: 'indoors',
  outdoor: 'outdoors',
  either: 'indoors or outdoors, either is fine',
};
const TIME_LABEL: Record<TimeVal, string> = {
  15: 'about 15 minutes',
  60: 'about an hour',
  240: 'a half-day, up to a few hours',
};
const BUDGET_LABEL: Record<'free' | 'cheap' | 'treat', string> = {
  free: 'free only',
  cheap: 'free or cheap',
  treat: 'free, cheap, or willing to spend a bit on a treat',
};

const VALID_CATS = new Set(Object.keys(CATS) as CatId[]);
const VALID_ENERGY = new Set<Energy>(['low', 'medium', 'high']);
const VALID_PLACE = new Set<Place>(['indoor', 'outdoor', 'either']);
const VALID_COST = new Set<Cost>(['free', 'cheap', 'treat']);
const VALID_SOCIAL = new Set<Social>(['solo', 'someone', 'group']);
const VALID_TIME = new Set<TimeVal>([15, 60, 240]);

export interface NearbyVenueName {
  name: string;
  kind: string;
}

function buildPrompt(
  input: PlanInput,
  count: number,
  nearbyName: string | null,
  patternHint: string | null,
  avoidTitles: string[] = [],
  nearbyVenues: NearbyVenueName[] = []
): string {
  const lines: string[] = [];
  if (input.freeform && input.freeform.trim()) {
    lines.push(
      `Someone described how they feel right now, in their own words: "${input.freeform.trim()}". ` +
        `Treat this as the real signal — it matters far more than any single mood label. ` +
        `("${input.mood}" is only a rough automatic bucket a keyword match landed on; if it ` +
        `doesn't quite fit what they actually wrote, trust what they wrote instead.) Build them ` +
        `exactly ${count} small activity suggestions tailored specifically to what they said — not generic advice.`
    );
  } else {
    lines.push(
      `Someone feels "${input.mood}" right now. Build them exactly ${count} small activity ` +
        `suggestions tailored to this specific moment — not generic advice.`
    );
  }
  lines.push(
    `Constraints: energy is ${ENERGY_LABEL[input.energy]}, they have ${TIME_LABEL[input.time]}, ` +
      `they want to do this ${SOCIAL_LABEL[input.social]}, ${PLACE_LABEL[input.setting]}, ` +
      `and budget is ${BUDGET_LABEL[input.budget]}.`
  );
  if (input.weather) {
    lines.push(
      `Weather right now: ${input.weather.temp}°C and ${input.weather.desc}. ` +
        `${input.weather.bad ? 'Lean indoor.' : input.weather.good ? 'Nice out — outdoor is welcome.' : ''}`
    );
  }
  if (input.hour !== undefined && (input.hour >= 22 || input.hour < 6)) {
    lines.push(
      `It's late (around ${input.hour}:00 local time) — keep suggestions low-key and things ` +
        `they can actually do right now. Skip anything that assumes a park, trail, or other ` +
        `outdoor spot is open and lively at this hour.`
    );
  }
  if (nearbyName) {
    lines.push(`They're roughly in ${nearbyName}.`);
  }
  if (nearbyVenues.length > 0) {
    const list = nearbyVenues.slice(0, 8).map((v) => `${v.name} (${v.kind})`).join(', ');
    lines.push(
      `Real, actually-nearby places you can name specifically: ${list}. For any outdoor, ` +
        `errand-like, or "go somewhere" suggestion, name one of these real places by name ` +
        `instead of being vague ("take a walk" is weak — "walk to ${nearbyVenues[0].name}" is ` +
        `concrete and genuinely useful). Never invent a place name that isn't in this list. ` +
        `Suggestions that are inherently about someone's own home (tidying, resting, a small ` +
        `private task) don't need a place name — don't force one in.`
    );
  }
  if (patternHint) {
    lines.push(
      `Pattern from this person's own past visits (use it only as a soft nudge, never state ` +
        `it outright to them): ${patternHint}`
    );
  }
  if (input.withKids) {
    lines.push(
      `A child will be along for this — every suggestion must be genuinely safe and ` +
        `appropriate to do with a young child present, not just "not harmful."`
    );
  }
  if (avoidTitles.length > 0) {
    lines.push(
      `They just reshuffled away these suggestions — don't repeat them, offer something ` +
        `genuinely different this time: ${avoidTitles.map((t) => `"${t}"`).join(', ')}.`
    );
  }
  lines.push(
    `Each suggestion needs a genuine, specific "why this helps right now" line that speaks ` +
      `directly to feeling ${input.mood} — never generic self-help language.`
  );
  lines.push(
    `Be concrete everywhere, not just about place: "reorganize one drawer you pass every day" ` +
      `beats "clean a drawer" (which one?); "text the friend you last texted" beats "reach out ` +
      `to someone." Vague suggestions that hand the hard decision back to the person defeat ` +
      `the point of this app.`
  );
  lines.push(
    `Vary the category across suggestions where you can. Valid categories: ` +
      `${Array.from(VALID_CATS).join(', ')}.`
  );
  lines.push(
    `Respond with ONLY a JSON array, no prose, no markdown fences. Each element:\n` +
      `{"t": "short title", "d": "one-sentence description", "cat": "<category>", ` +
      `"e": "low|medium|high", "time": ${Array.from(VALID_TIME).join('|')}, ` +
      `"soc": ["solo"|"someone"|"group", ...], "place": "indoor|outdoor|either", ` +
      `"cost": "free|cheap|treat", "why": {"${input.mood}": "the why line"}}`
  );
  lines.push(
    `"time" must be less than or equal to ${input.time}. "cost" must not exceed the stated ` +
      `budget. "soc" must include "${input.social}".`
  );
  return lines.join('\n');
}

/**
 * Stable-ish id for an AI-composed activity, derived from its title so the
 * feedback loop (lib/feedback.ts) can recognize the *same* AI suggestion if
 * it recurs across sessions, without colliding with static dataset ids
 * (which never carry the "ai:" prefix).
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
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

/** Same well-formedness bar as the dataset self-check in index.html / lib/plan.ts. */
function validateActivity(raw: unknown, input: PlanInput): Activity | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;

  if (typeof a.t !== 'string' || !a.t.trim()) return null;
  if (typeof a.d !== 'string' || !a.d.trim()) return null;
  if (typeof a.cat !== 'string' || !VALID_CATS.has(a.cat as CatId)) return null;
  if (typeof a.e !== 'string' || !VALID_ENERGY.has(a.e as Energy)) return null;
  if (typeof a.time !== 'number' || !VALID_TIME.has(a.time as TimeVal)) return null;
  if ((a.time as number) > input.time) return null; // must fit the window, like the engine
  if (!Array.isArray(a.soc) || a.soc.length === 0) return null;
  if (!a.soc.every((s) => typeof s === 'string' && VALID_SOCIAL.has(s as Social))) return null;
  if (!(a.soc as string[]).includes(input.social)) return null;
  if (typeof a.place !== 'string' || !VALID_PLACE.has(a.place as Place)) return null;
  if (input.setting !== 'either' && a.place !== 'either' && a.place !== input.setting) return null;
  if (typeof a.cost !== 'string' || !VALID_COST.has(a.cost as Cost)) return null;
  if (COST[a.cost as Cost] > COST[input.budget]) return null;
  if (E[a.e as Energy] - E[input.energy] >= 2) return null; // never wildly above stated energy

  let why: Partial<Record<MoodId, string>> = {};
  if (a.why && typeof a.why === 'object') {
    const w = a.why as Record<string, unknown>;
    const line = w[input.mood];
    if (typeof line === 'string' && line.trim()) {
      why = { [input.mood]: line.trim() };
    }
  }
  if (!why[input.mood]) return null; // the whole point is a genuine, mood-specific why

  return {
    id: `ai:${slugify(a.t as string)}`,
    // Always true: when withKids was requested, buildPrompt already told the
    // model every suggestion must be kid-appropriate; when it wasn't
    // requested, this field is never consulted for filtering anyway.
    kidFriendly: true,
    t: (a.t as string).trim(),
    d: (a.d as string).trim(),
    cat: a.cat as CatId,
    moods: [input.mood],
    e: a.e as Energy,
    time: a.time as TimeVal,
    soc: a.soc as Social[],
    place: a.place as Place,
    cost: a.cost as Cost,
    why,
  };
}

/**
 * Ask the configured LLM to compose a plan. Returns null on any failure —
 * network, timeout, malformed JSON, or activities that don't pass the same
 * validation the static dataset does. Never throws.
 */
export async function generateAiPlan(
  input: PlanInput,
  config: AiPlanConfig,
  nearbyName: string | null = null,
  patternHint: string | null = null,
  avoidTitles: string[] = [],
  nearbyVenues: NearbyVenueName[] = [],
  /** Called (shared-key path only) when the request fails specifically
   * because today's shared beta AI cap was hit — lets the caller show a
   * "you're capped, here's the built-in match instead" notice rather than
   * silently looking identical to any other fallback reason. */
  onCapped?: () => void
): Promise<Activity[] | null> {
  const hasByok = !!config.apiKey && !!config.apiKey.trim();
  const hasShared = !!config.sharedAccessToken && !!config.sharedAccessToken.trim();
  if (!hasByok && !hasShared) return null;
  const provider = config.provider ?? 'anthropic';
  if (provider !== 'anthropic') return null; // only provider implemented today
  const count = planCount(input.time);
  const prompt = buildPrompt(input, count, nearbyName, patternHint, avoidTitles, nearbyVenues);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT);

  const system =
    'You are the planning engine inside a mood-based activity app called WhatNow. ' +
    'You output only valid JSON, nothing else — no prose, no markdown code fences.';

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
          // Harmless for native fetch; required if this is ever called from a browser context.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model ?? DEFAULT_MODEL,
          max_tokens: 1200,
          temperature: 1,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } else {
      // Beta shared-key path — see lib/betaConfig.ts. The server decides the
      // actual model and enforces its own caps; this is just the request shape.
      res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${config.sharedAccessToken!.trim()}`,
        },
        body: JSON.stringify({
          kind: 'plan',
          max_tokens: 1200,
          temperature: 1,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    }

    if (!res.ok) {
      // ai-proxy returns 429 specifically (and only) when today's shared
      // cap — per-user or global — has been hit; every other failure mode
      // (expired session, missing config, provider error) uses a different
      // status, so this check doesn't false-positive on those.
      if (hasShared && res.status === 429) onCapped?.();
      return null;
    }
    const data = await res.json();
    const text: unknown = data?.content?.[0]?.text;
    if (typeof text !== 'string') return null;

    const rawArr = extractJsonArray(text);
    if (!rawArr) return null;

    const valid = rawArr
      .map((item) => validateActivity(item, input))
      .filter((a): a is Activity => a !== null);

    if (valid.length < 2) return null; // too thin to call it a plan — fall back
    return valid.slice(0, count);
  } catch {
    return null; // network error, timeout (AbortError), or unexpected shape
  } finally {
    clearTimeout(timer);
  }
}
