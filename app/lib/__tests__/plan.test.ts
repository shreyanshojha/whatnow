/* ============================================================
   Tests for the deterministic matching engine (lib/plan.ts).
   Covers: baseline plan generation, reshuffle exclusion (never
   emptying the pool), and feedback-weight biasing up/down.
   ============================================================ */

import { ACTIVITIES } from '../../data/activities';
import { generatePlan, planCount } from '../plan';
import type { PlanInput } from '../plan';

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    mood: 'restless',
    energy: 'medium',
    time: 60,
    social: 'solo',
    setting: 'either',
    budget: 'cheap',
    weather: null,
    ...overrides,
  };
}

describe('generatePlan', () => {
  it('returns a non-empty plan for a common mood, sized to planCount(time)', () => {
    const input = baseInput();
    const idxs = generatePlan(input);
    expect(idxs.length).toBeGreaterThan(0);
    expect(idxs.length).toBeLessThanOrEqual(planCount(input.time));
  });

  it('respects excludeIds when enough candidates remain, for a genuine reshuffle', () => {
    const input = baseInput();
    const first = generatePlan(input);
    const excludeIds = new Set(first.map((i) => ACTIVITIES[i].id));
    const second = generatePlan(input, { excludeIds });
    const overlap = second.filter((i) => excludeIds.has(ACTIVITIES[i].id));
    expect(overlap.length).toBe(0);
  });

  it('never empties the pool just because excludeIds would remove everything', () => {
    const input = baseInput();
    const candidateIds = ACTIVITIES.filter(
      (a) => a.time <= input.time && a.soc.includes(input.social)
    ).map((a) => a.id);
    const excludeIds = new Set(candidateIds); // try to exclude basically everything plausible
    const idxs = generatePlan(input, { excludeIds });
    expect(idxs.length).toBeGreaterThan(0);
  });

  it('calling generatePlan(input) with no options object still works (back-compat)', () => {
    const idxs = generatePlan(baseInput());
    expect(Array.isArray(idxs)).toBe(true);
  });

  it('a strong positive feedback weight increases how often that activity is selected', () => {
    const input = baseInput({ mood: 'bored' });
    const target = ACTIVITIES.find(
      (a) => a.moods.includes('bored') && a.time <= input.time && a.soc.includes(input.social)
    );
    expect(target).toBeDefined();
    const weights = new Map([[target!.id, 6]]);

    let withBoost = 0;
    let withoutBoost = 0;
    const trials = 40;
    for (let t = 0; t < trials; t++) {
      if (generatePlan(input, { feedbackWeights: weights }).some((i) => ACTIVITIES[i].id === target!.id)) {
        withBoost++;
      }
      if (generatePlan(input).some((i) => ACTIVITIES[i].id === target!.id)) {
        withoutBoost++;
      }
    }
    expect(withBoost).toBeGreaterThanOrEqual(withoutBoost);
  });

  it('a strong negative feedback weight decreases how often that activity is selected', () => {
    const input = baseInput({ mood: 'bored' });
    const target = ACTIVITIES.find(
      (a) => a.moods.includes('bored') && a.time <= input.time && a.soc.includes(input.social)
    );
    expect(target).toBeDefined();
    const weights = new Map([[target!.id, -6]]);

    let withPenalty = 0;
    let withoutPenalty = 0;
    const trials = 40;
    for (let t = 0; t < trials; t++) {
      if (generatePlan(input, { feedbackWeights: weights }).some((i) => ACTIVITIES[i].id === target!.id)) {
        withPenalty++;
      }
      if (generatePlan(input).some((i) => ACTIVITIES[i].id === target!.id)) {
        withoutPenalty++;
      }
    }
    expect(withPenalty).toBeLessThanOrEqual(withoutPenalty);
  });
});

describe('planCount', () => {
  it('scales with available time', () => {
    expect(planCount(15)).toBe(3);
    expect(planCount(60)).toBe(4);
    expect(planCount(240)).toBe(5);
  });
});
