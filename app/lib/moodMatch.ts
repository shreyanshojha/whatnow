/* ============================================================
   WhatNow — freeform mood text → closest mood bucket.

   The mood grid covers 12 named feelings, but "type what you want"
   (see the "Other" tile on the mood screen) lets someone describe
   how they actually feel in their own words instead of forcing a
   pick. Those words still need to land somewhere in the existing
   engine — scoring, feedback logging, and Supabase's mood columns
   are all keyed on the closed MoodId set — so this does a cheap,
   local, keyword-based match to the nearest bucket.

   This is deliberately NOT the whole story: the raw freeform text
   is kept alongside the matched mood (see PlanInput.freeform) and,
   when AI planning is on, is given far more weight than the bucket
   label in the actual prompt (see lib/aiPlan.ts) — the bucket is
   just what the deterministic engine and feedback log need under
   the hood, not a claim that the words were thrown away.
   ============================================================ */

import { MoodId } from '../data/activities';

const KEYWORDS: Record<MoodId, string[]> = {
  restless: ['restless', 'antsy', 'fidgety', 'pent up', 'pent-up', 'can\'t sit still', 'jittery', 'wired up'],
  drained: ['drained', 'exhausted', 'tired', 'burnt out', 'burned out', 'depleted', 'wiped out', 'no energy'],
  anxious: ['anxious', 'nervous', 'worried', 'on edge', 'stressed', 'panicky', 'uneasy', 'dread'],
  bored: ['bored', 'nothing to do', 'dull', 'stuck', 'meh', 'uninterested'],
  low: ['low', 'sad', 'down', 'blue', 'flat', 'gloomy', 'heavy'],
  frustrated: ['frustrated', 'angry', 'annoyed', 'irritated', 'pissed', 'mad', 'fed up'],
  content: ['content', 'good', 'fine', 'calm', 'satisfied', 'at ease', 'peaceful'],
  inspired: ['inspired', 'motivated', 'excited to create', 'creative', 'fired up', 'ambitious'],
  lonely: ['lonely', 'alone', 'isolated', 'missing people', 'disconnected'],
  overwhelmed: ['overwhelmed', 'too much', 'swamped', 'buried', 'can\'t keep up', 'drowning'],
  playful: ['playful', 'silly', 'goofy', 'fun', 'giddy', 'lighthearted'],
  curious: ['curious', 'wondering', 'interested', 'want to learn', 'want to explore'],
};

/** Returns the mood whose keyword list has the most (substring, case-
 * insensitive) hits in the given text. Falls back to 'curious' when
 * nothing matches at all — an open, exploratory default rather than
 * quietly assuming something specific about how the person feels. */
export function matchMoodFromText(text: string): MoodId {
  const lower = text.toLowerCase();
  let best: MoodId = 'curious';
  let bestScore = 0;
  for (const mood of Object.keys(KEYWORDS) as MoodId[]) {
    const score = KEYWORDS[mood].reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = mood;
    }
  }
  return best;
}
