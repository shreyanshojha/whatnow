/* ============================================================
   WhatNow — reasonable daily caps on the BYOK API calls.

   AI planning and live events are bring-your-own-key: each
   person's usage is billed to their own account, not WhatNow's.
   So this isn't about WhatNow's costs — it's a safety net for
   the person whose key it is, so a bug, an accidental loop, or
   overeager reshuffling can't quietly run up someone's bill.
   Caps are generous for normal use and reset at local midnight.

   Everything here is a plain on-device counter — no server,
   no account, consistent with the rest of WhatNow's local-only
   design.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_AI_PLANS_PER_DAY = 20;
export const MAX_EVENTS_LOOKUPS_PER_DAY = 30;
// Lower than the other two — each call can run several web searches at
// $10/1,000 searches plus tokens, so it costs more per use than a plan
// composition or a Ticketmaster lookup.
export const MAX_NEARBY_SEARCHES_PER_DAY = 10;

const AI_USAGE_KEY = 'whatnow.usage.aiPlans.v1';
const EVENTS_USAGE_KEY = 'whatnow.usage.events.v1';
const NEARBY_SEARCH_USAGE_KEY = 'whatnow.usage.nearbySearch.v1';

interface DailyCount {
  date: string; // local YYYY-MM-DD
  count: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

async function readCount(storageKey: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return 0;
    const parsed: DailyCount = JSON.parse(raw);
    if (parsed.date !== todayKey()) return 0; // new day, count resets
    return parsed.count ?? 0;
  } catch {
    return 0; // fail open on read errors — never block the feature over a storage hiccup
  }
}

async function bumpCount(storageKey: string): Promise<void> {
  try {
    const current = await readCount(storageKey);
    const next: DailyCount = { date: todayKey(), count: current + 1 };
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // ignore — worst case the cap is slightly soft, never a hard failure
  }
}

export async function aiPlansUsedToday(): Promise<number> {
  return readCount(AI_USAGE_KEY);
}

export async function canUseAiPlanToday(): Promise<boolean> {
  return (await aiPlansUsedToday()) < MAX_AI_PLANS_PER_DAY;
}

export async function recordAiPlanUse(): Promise<void> {
  await bumpCount(AI_USAGE_KEY);
}

export async function eventsLookupsUsedToday(): Promise<number> {
  return readCount(EVENTS_USAGE_KEY);
}

export async function canUseEventsLookupToday(): Promise<boolean> {
  return (await eventsLookupsUsedToday()) < MAX_EVENTS_LOOKUPS_PER_DAY;
}

export async function recordEventsLookupUse(): Promise<void> {
  await bumpCount(EVENTS_USAGE_KEY);
}

export async function nearbySearchesUsedToday(): Promise<number> {
  return readCount(NEARBY_SEARCH_USAGE_KEY);
}

export async function canUseNearbySearchToday(): Promise<boolean> {
  return (await nearbySearchesUsedToday()) < MAX_NEARBY_SEARCHES_PER_DAY;
}

export async function recordNearbySearchUse(): Promise<void> {
  await bumpCount(NEARBY_SEARCH_USAGE_KEY);
}
