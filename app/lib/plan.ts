/* ============================================================
   WhatNow — matching engine (ported from web v1).
   Pure, deterministic selection with a little jitter so
   Reshuffle feels alive. No external state, no side effects.
   ============================================================ */

import {
  ACTIVITIES,
  Activity,
  CATS,
  CatId,
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
  /** When true, only surface activities tagged kidFriendly (see
   * data/activities.ts) — a cross-cutting filter independent of the
   * solo/someone/group headcount, since "kids along" can be true at
   * any group size. */
  withKids?: boolean;
  /** Raw text from the "Other — type what you want" mood option, kept
   * alongside the closest-matching MoodId bucket (see lib/moodMatch.ts).
   * The deterministic engine below never reads this — it has no way to
   * act on free text — but lib/aiPlan.ts gives it far more weight than
   * the bucket label when AI planning is on. Undefined for the normal
   * pick-a-mood-tile flow. */
  freeform?: string;
  /** Local clock hour, 0–23, at the moment the plan is generated (see
   * PlanContext's makePlan — always `new Date().getHours()`, never
   * user-set). Used only to keep outdoor suggestions from showing up in
   * the middle of the night, when most outdoor spots are closed or empty
   * anyway — framed as "keeping it low-key this late," not a safety
   * lecture. Optional so existing callers/tests that don't care about
   * time-of-day keep working unchanged. */
  hour?: number;
  /** Local day of week, 0 (Sunday)–6 (Saturday), at the moment the plan is
   * generated (see PlanContext's makePlan — always `new Date().getDay()`).
   * A soft scoring nudge only (see baseScore) — never a hard filter, since
   * WhatNow has no idea what anyone's actual weekday schedule looks like.
   * Optional so existing callers/tests keep working unchanged. */
  dayOfWeek?: number;
  /** Extra moods picked alongside the primary `mood` on the mood-picker
   * screen's multi-select grid. Each is a softer scoring bonus than the
   * primary (see baseScore) — blends them into one plan instead of letting
   * any one of them fully dominate category diversity. Optional; omitted
   * for the common single-mood case, so every existing caller/test that
   * only sets `mood` keeps working unchanged. */
  secondaryMoods?: MoodId[];
  /** Optional "what kind of thing" filter (see CATS) — when non-empty, only
   * activities in one of these categories are considered at all. Undefined
   * or empty means no filtering, same as today. */
  categories?: CatId[];
}

function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/** 10pm–6am: quiet hours where an outdoor suggestion (a park, a trail, a
 * bike ride) is more likely to be a dead end than a good idea — not a
 * judgment call about the person, just what's actually open and lively
 * at that hour. */
function isQuietHours(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

function passesConstraints(a: Activity, input: PlanInput): boolean {
  // Time: activity's needed time must fit inside available window
  if (a.time > input.time) return false;
  // Kids along: a cross-cutting content filter, independent of headcount
  if (input.withKids && !a.kidFriendly) return false;
  // Social
  if (!a.soc.includes(input.social)) return false;
  // Setting
  if (input.setting !== 'either' && a.place !== 'either' && a.place !== input.setting)
    return false;
  // Budget: activity cost must be <= chosen budget
  if (COST[a.cost] > COST[input.budget]) return false;
  // Energy: never suggest something two steps above the user's energy
  if (E[a.e] - E[input.energy] >= 2) return false;
  // Quiet hours: skip anything that requires being outdoors specifically
  // (activities tagged 'either' are unaffected — plenty of them work fine
  // as an indoor substitute).
  if (input.hour !== undefined && isQuietHours(input.hour) && a.place === 'outdoor') return false;
  // "What kind of thing" filter: only applied when someone has actually
  // picked one or more categories — an empty/undefined list means no
  // narrowing at all, same as before this filter existed.
  if (input.categories && input.categories.length > 0 && !input.categories.includes(a.cat))
    return false;
  return true;
}

function baseScore(a: Activity, input: PlanInput): number {
  let s = 10;
  // Mood fit is the heart of it
  if (a.moods.includes(input.mood)) s += 45;
  // Any additional moods picked alongside the primary one get a real say,
  // just a smaller one — the primary mood still leads.
  if (input.secondaryMoods) {
    for (const m of input.secondaryMoods) {
      if (m !== input.mood && a.moods.includes(m)) s += 18;
    }
  }
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
  // Quiet-hours bias: lean toward wind-down activities late at night,
  // same spirit as the weather bias above — a nudge, not a hard rule
  // (hard outdoor exclusion is handled in passesConstraints).
  if (input.hour !== undefined && isQuietHours(input.hour)) {
    if (a.cat === 'rest') s += 8;
    if (a.e === 'high') s -= 6;
  }
  // Day-of-week bias: a light nudge, not a schedule assumption — WhatNow
  // has no idea if someone works weekends or is off on a Tuesday. Weekends
  // lean toward things that take longer or involve other people (more
  // likely to have the time/company for them); nothing is excluded either
  // way, and a strong mood/energy fit still wins over this easily.
  if (input.dayOfWeek !== undefined) {
    if (isWeekend(input.dayOfWeek)) {
      if (a.time >= 60) s += 4;
      if (a.soc.includes('group') && a.cat !== 'rest') s += 3;
    } else {
      if (a.time === 15) s += 3;
    }
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
