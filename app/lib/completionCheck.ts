/* ============================================================
   WhatNow — lightweight completion check-in.

   A first, deliberately small step toward tracking whether a
   suggestion actually helped, not just whether it was shown or
   saved. No push notifications, no server round-trip: the next
   time the app is opened after a save that's had a plausible
   chance to happen, a small dismissible card asks "did this
   happen, did it help?" The answer is logged as an explicit
   thumbs-up/down (see lib/feedback.ts) — it's the same underlying
   signal, just captured later and with real-world context instead
   of an in-the-moment reaction.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedEntry } from '../context/PlanContext';

const ASKED_KEY = 'whatnow.completionAsked.v1';

// A save needs to be at least this old before we ask — otherwise "did this
// happen?" would be asked before there's been any real chance to do it.
const MIN_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours
// And not so old the question feels random and disconnected from anything.
const MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

async function readAsked(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(ASKED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function writeAsked(ids: Set<string>): Promise<void> {
  try {
    // Keep this bounded — only the most recent 200 ids matter for
    // "have we already asked," so this never grows without limit.
    await AsyncStorage.setItem(ASKED_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // ignore — worst case the same check-in could resurface once more
  }
}

/** Finds the single most recently saved activity that's old enough to
 * plausibly have happened, not so old it's stale, and hasn't already been
 * asked about — or null if nothing qualifies right now. */
export async function getPendingCompletionCheck(saved: SavedEntry[]): Promise<SavedEntry | null> {
  const asked = await readAsked();
  const now = Date.now();
  const eligible = saved
    .filter((s) => typeof s.savedAt === 'number')
    .filter((s) => !asked.has(s.activity.id))
    .filter((s) => {
      const age = now - (s.savedAt as number);
      return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
    })
    .sort((a, b) => (b.savedAt as number) - (a.savedAt as number));
  return eligible[0] ?? null;
}

/** Marks an activity as asked-about so the same check-in never resurfaces —
 * call this on any response, including "skip," since the point is to ask
 * once per saved activity, not to nag. */
export async function dismissCompletionCheck(activityId: string): Promise<void> {
  const asked = await readAsked();
  asked.add(activityId);
  await writeAsked(asked);
}
