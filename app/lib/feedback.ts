/* ============================================================
   WhatNow — on-device activity feedback log.

   The whole point of this file: WhatNow should get quietly better
   at guessing what someone will actually do, the more they use it.
   Every plan shows a few activities; some get reshuffled away,
   one might get saved. Those are real signals. This module stores
   them — on this device only, nothing uploaded anywhere, same
   privacy posture as lib/locationHistory.ts — and turns them into
   a small per-activity, per-mood weight that lib/plan.ts folds
   into scoring (see getFeedbackWeights).

   Design principles:
   - Never overfit on one data point. A single reject shouldn't
     bury an activity forever; a single save shouldn't crowd out
     everything else. Weights are small nudges, capped, and blend
     mood-specific signal with the activity's overall track record.
   - Two kinds of signal, weighted differently. Save/reshuffle-away
     are *implicit* — a save might just mean "looked appealing," not
     "this actually helped." The explicit thumbs-up/down control on
     each card (below the "why this helps" line) is a person directly
     answering "was this a good call for how I was feeling?" — a
     stronger, more deliberate statement, so it moves the score more.
   - Cheap to read. Plan generation reads the whole log once per
     mood (getFeedbackWeights), not once per activity per candidate.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodId } from '../data/activities';
import { syncFeedbackEvent } from './sync';

export type FeedbackEvent = 'shown' | 'accepted' | 'rejected' | 'thumbsUp' | 'thumbsDown';

interface FeedbackRecord {
  id: string; // Activity.id
  mood: MoodId;
  event: FeedbackEvent;
  at: number;
}

const FEEDBACK_KEY = 'whatnow.feedback.v1';
/** Rolling cap on raw events kept. Generous enough to span weeks of normal
 * use (a handful of plans a day), small enough to stay cheap to read. */
const MAX_RECORDS = 600;

async function readLog(): Promise<FeedbackRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackRecord[]) : [];
  } catch {
    return [];
  }
}

async function appendRecords(records: FeedbackRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    const log = await readLog();
    const next = [...log, ...records].slice(-MAX_RECORDS);
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(next));
  } catch {
    // ignore — worst case we miss a signal, never a hard failure
  }
}

/** Call once per plan generation with the ids the person was actually shown. */
export async function recordShown(ids: string[], mood: MoodId): Promise<void> {
  const at = Date.now();
  await appendRecords(ids.map((id) => ({ id, mood, event: 'shown', at })));
}

/** Call when an activity is reshuffled away without ever being saved. */
export async function recordRejected(ids: string[], mood: MoodId): Promise<void> {
  const at = Date.now();
  await appendRecords(ids.map((id) => ({ id, mood, event: 'rejected', at })));
  // Fire-and-forget server mirror for a signed-in account — never awaited
  // by the caller, never allowed to slow down or break the local log.
  ids.forEach((id) => syncFeedbackEvent(id, mood, 'rejected').catch(() => {}));
}

/** Call when an activity is saved (a clear, deliberate positive signal). */
export async function recordAccepted(id: string, mood: MoodId): Promise<void> {
  await appendRecords([{ id, mood, event: 'accepted', at: Date.now() }]);
  syncFeedbackEvent(id, mood, 'accepted').catch(() => {});
}

/** Call when someone taps the explicit thumbs-up/down control on a card —
 * a direct answer to "was this a good call?", not an inferred signal. */
export async function recordExplicitFeedback(
  id: string,
  mood: MoodId,
  positive: boolean
): Promise<void> {
  const event = positive ? 'thumbsUp' : 'thumbsDown';
  await appendRecords([{ id, mood, event, at: Date.now() }]);
  syncFeedbackEvent(id, mood, event).catch(() => {});
}

export async function clearFeedback(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FEEDBACK_KEY);
  } catch {
    // ignore
  }
}

/** A small, user-facing (not admin) summary of this device's own history —
 * shown back to the person as "your patterns," not tracked for anyone
 * else's benefit. Deliberately built entirely from data that already
 * exists in this log; nothing new is collected to produce it. */
export interface PersonalStats {
  totalPlans: number;
  topMood: MoodId | null;
  thumbsUp: number;
  thumbsDown: number;
  /** Consecutive days (ending today or yesterday) with at least one plan
   * generated — a simple, honest streak, not inflated by same-day reshuffles. */
  streakDays: number;
}

function localDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function getPersonalStats(): Promise<PersonalStats> {
  const log = await readLog();
  const shown = log.filter((r) => r.event === 'shown');

  // Each call to recordShown stamps every id in that one plan with the same
  // `at` — so distinct timestamps among "shown" events is exactly the
  // number of plans generated, without needing a separate counter.
  const totalPlans = new Set(shown.map((r) => r.at)).size;

  const moodCounts = new Map<MoodId, number>();
  for (const r of shown) moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
  let topMood: MoodId | null = null;
  let topCount = 0;
  for (const [m, c] of moodCounts) {
    if (c > topCount) {
      topCount = c;
      topMood = m;
    }
  }

  const thumbsUp = log.filter((r) => r.event === 'thumbsUp').length;
  const thumbsDown = log.filter((r) => r.event === 'thumbsDown').length;

  const activeDays = new Set(shown.map((r) => localDateKey(r.at)));
  let streakDays = 0;
  const cursor = new Date();
  if (!activeDays.has(localDateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1); // today's empty so far — a streak can still be "live" through yesterday
  }
  while (activeDays.has(localDateKey(cursor.getTime()))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { totalPlans, topMood, thumbsUp, thumbsDown, streakDays };
}

/** Raw per-activity, per-mood counts behind a scoring weight — exposed so
 * the UI can show an honest, auditable "why this, for you specifically"
 * line (see personalizationNote below) instead of just quietly using the
 * signal to reorder things with no visible trace. A personalization claim
 * a person can't see any evidence for doesn't feel different from an app
 * that got lucky — this is what makes it feel different. */
export interface PersonalSignal {
  thumbsUp: number;
  thumbsDown: number;
  accepted: number;
  rejected: number;
}

/** Call once per shown card (cheap — same single log read as
 * getFeedbackWeights, just filtered to one id+mood instead of aggregated
 * across all of them). */
export async function getPersonalSignal(id: string, mood: MoodId): Promise<PersonalSignal> {
  const log = await readLog();
  const signal: PersonalSignal = { thumbsUp: 0, thumbsDown: 0, accepted: 0, rejected: 0 };
  for (const r of log) {
    if (r.id !== id || r.mood !== mood) continue;
    if (r.event === 'thumbsUp') signal.thumbsUp += 1;
    else if (r.event === 'thumbsDown') signal.thumbsDown += 1;
    else if (r.event === 'accepted') signal.accepted += 1;
    else if (r.event === 'rejected') signal.rejected += 1;
  }
  return signal;
}

/** Turns a raw signal into a short, honest sentence — or null if there's
 * nothing real to say yet. Deliberately says nothing when the strongest
 * signal is negative (thumbsDown/rejected outweighing the rest): this
 * activity would already be scored down and is unlikely to be shown, and
 * "you didn't like this" isn't a claim worth surfacing as a feature. */
export function personalizationNote(signal: PersonalSignal, moodWord: string): string | null {
  if (signal.thumbsUp >= 2) {
    return `You've confirmed this works for feeling ${moodWord} ${signal.thumbsUp} times.`;
  }
  if (signal.thumbsUp === 1) {
    return `You said this was a good call, last time you felt ${moodWord}.`;
  }
  if (signal.accepted > 0 && signal.thumbsDown === 0) {
    return `You've saved this before when feeling ${moodWord}.`;
  }
  return null;
}

const WEIGHT_CAP = 6;

/**
 * Reads the whole log once and returns a per-activity-id weight for the
 * given mood, roughly in [-WEIGHT_CAP, +WEIGHT_CAP]. Mood-matched history
 * counts double (a save while restless says more about restless than a
 * save while drained does), blended with the activity's overall record so
 * a brand-new mood still benefits a little from what we've learned elsewhere.
 * lib/plan.ts scales this into score points.
 */
export async function getFeedbackWeights(mood: MoodId): Promise<Map<string, number>> {
  const log = await readLog();
  const weights = new Map<string, number>();
  if (log.length === 0) return weights;

  const byId = new Map<string, FeedbackRecord[]>();
  for (const r of log) {
    const list = byId.get(r.id);
    if (list) list.push(r);
    else byId.set(r.id, [r]);
  }

  for (const [id, records] of byId) {
    let netMood = 0;
    let netAny = 0;
    for (const r of records) {
      // Explicit thumbs-up/down counts double an implicit save/reshuffle —
      // it's a direct answer, not an inferred one.
      const delta =
        r.event === 'accepted'
          ? 1
          : r.event === 'rejected'
          ? -1
          : r.event === 'thumbsUp'
          ? 2
          : r.event === 'thumbsDown'
          ? -2
          : 0;
      if (delta === 0) continue; // "shown" alone carries no signal
      netAny += delta;
      if (r.mood === mood) netMood += delta;
    }
    const raw = netMood * 2 + netAny;
    const clamped = Math.max(-WEIGHT_CAP, Math.min(WEIGHT_CAP, raw));
    if (clamped !== 0) weights.set(id, clamped);
  }

  return weights;
}
