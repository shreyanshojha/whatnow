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
   - No explicit "kept it and did nothing" signal. We can't reliably
     tell "did this and loved it" apart from "forgot the phone was
     open" — so v1 only counts the two events a person clearly
     chose: reshuffling something away, or saving it. That's a
     deliberately conservative choice over inventing a noisy signal.
   - Cheap to read. Plan generation reads the whole log once per
     mood (getFeedbackWeights), not once per activity per candidate.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodId } from '../data/activities';

export type FeedbackEvent = 'shown' | 'accepted' | 'rejected';

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
}

/** Call when an activity is saved (a clear, deliberate positive signal). */
export async function recordAccepted(id: string, mood: MoodId): Promise<void> {
  await appendRecords([{ id, mood, event: 'accepted', at: Date.now() }]);
}

export async function clearFeedback(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FEEDBACK_KEY);
  } catch {
    // ignore
  }
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
      const delta = r.event === 'accepted' ? 1 : r.event === 'rejected' ? -1 : 0;
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
