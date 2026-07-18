/* ============================================================
   WhatNow — matching engine (ported from web v1).
   Pure, deterministic selection with a little jitter so
   Reshuffle feels alive. No external state, no side effects.
   ============================================================ */

import {
  ACTIVITIES,
  Activity,
  CATS,
  COST,
  E,
  Energy,
  MOOD_WORD,
  MoodId,
  Place,
  Social,
  TimeVal,
} from '../data/activities';

export interface WeatherState {
  temp: number;
  code: number;
  desc: string;
  emo: string;
  bad: boolean;
  good: boolean;
}

export interface PlanInput {
  mood: MoodId;
  energy: Energy;
  time: TimeVal;
  social: Social;
  setting: Place;
  budget: 'free' | 'cheap' | 'treat';
  weather: WeatherState | null;
}

function passesConstraints(a: Activity, input: PlanInput): boolean {
  // Time: activity's needed time must fit inside available window
  if (a.time > input.time) return false;
  // Social
  if (!a.soc.includes(input.social)) return false;
  // Setting
  if (input.setting !== 'either' && a.place !== 'either' && a.place !== input.setting)
    return false;
  // Budget: activity cost must be <= chosen budget
  if (COST[a.cost] > COST[input.budget]) return false;
  // Energy: never suggest something two steps above the user's energy
  if (E[a.e] - E[input.energy] >= 2) return false;
  return true;
}

function baseScore(a: Activity, input: PlanInput): number {
  let s = 10;
  // Mood fit is the heart of it
  if (a.moods.includes(input.mood)) s += 45;
  // Energy closeness
  const ediff = Math.abs(E[a.e] - E[input.energy]);
  s += ediff === 0 ? 16 : ediff === 1 ? 5 : -10;
  // Time snugness — prefer filling more of the window on longer plans
  if (input.time === 240 && a.time >= 60) s += 6;
  if (input.time === 15 && a.time === 15) s += 4;
  // Weather bias
  if (input.weather) {
    if (input.weather.bad && a.place === 'outdoor') s -= 30;
    if (input.weather.bad && a.place === 'indoor') s += 6;
    if (input.weather.good && a.place === 'outdoor') s += 10;
  }
  return s;
}

export function planCount(time: TimeVal): number {
  if (time === 15) return 3;
  if (time === 60) return 4;
  return 5;
}

/** How much a per-activity feedback weight (see lib/feedback.ts, range
 * roughly [-6, +6]) moves the score, in the same units as baseScore's
 * +45 mood-fit bonus. Big enough to visibly reorder repeat winners/losers,
 * small enough that a strong mood fit still usually wins over a so-so
 * past reaction. */
const FEEDBACK_SCALE = 4;

export interface GeneratePlanOptions {
  /** Per-activity-id learning weight for this mood, from lib/feedback.ts. */
  feedbackWeights?: Map<string, number>;
  /** Activity ids to leave out of this pass — e.g. what the immediately
   * preceding plan just showed, so Reshuffle actually feels like a reshuffle.
   * Only applied if enough candidates remain afterward; never allowed to
   * empty out the pool. */
  excludeIds?: Set<string>;
}

/**
 * Build a plan. Returns an ordered list of ACTIVITIES indices.
 * Empty array means no combination matched (edge state).
 */
export function generatePlan(input: PlanInput, options: GeneratePlanOptions = {}): number[] {
  const { feedbackWeights, excludeIds } = options;

  let candidates: number[] = [];
  ACTIVITIES.forEach((a, i) => {
    if (passesConstraints(a, input)) candidates.push(i);
  });

  if (excludeIds && excludeIds.size > 0) {
    const target = Math.min(planCount(input.time), candidates.length);
    const filtered = candidates.filter((i) => !excludeIds.has(ACTIVITIES[i].id));
    if (filtered.length >= target) candidates = filtered;
  }

  if (candidates.length === 0) return [];

  // Score with a little jitter so Reshuffle feels alive, plus this
  // person's own accept/reject history for this mood, if any.
  const scored = candidates.map((i) => {
    const a = ACTIVITIES[i];
    const feedback = feedbackWeights?.get(a.id);
    const feedbackBonus = feedback ? feedback * FEEDBACK_SCALE : 0;
    return {
      i,
      s: baseScore(a, input) + Math.random() * 14 + feedbackBonus,
    };
  });

  // Greedy pick with category-diversity penalty
  const target = Math.min(planCount(input.time), scored.length);
  const usedCat: Record<string, number> = {};
  const chosen: number[] = [];
  const pool = scored.slice();

  while (chosen.length < target && pool.length) {
    pool.sort((a, b) => {
      const ea = a.s - (usedCat[ACTIVITIES[a.i].cat] || 0) * 22;
      const eb = b.s - (usedCat[ACTIVITIES[b.i].cat] || 0) * 22;
      return eb - ea;
    });
    const pick = pool.shift()!;
    chosen.push(pick.i);
    const c = ACTIVITIES[pick.i].cat;
    usedCat[c] = (usedCat[c] || 0) + 1;
  }

  return chosen;
}

/** The "why this helps right now" line for an activity in a given mood. */
export function whyFor(a: Activity, mood: MoodId): string {
  if (a.why && a.why[mood]) return a.why[mood] as string;
  const fb: string = CATS[a.cat].fallback;
  return fb.replace('{mood}', MOOD_WORD[mood] || 'this');
}
