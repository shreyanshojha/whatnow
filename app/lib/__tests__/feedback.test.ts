/* ============================================================
   Tests for the on-device learning log (lib/feedback.ts).
   jest-expo's default AsyncStorage mock (in-memory, resets between
   test files but persists across it()s in the same file — hence
   the explicit clearFeedback() in beforeEach) backs these.
   ============================================================ */

import {
  clearFeedback,
  getFeedbackWeights,
  getHistoryEntries,
  getPersonalSignal,
  getPersonalStats,
  personalizationNote,
  recordAccepted,
  recordExplicitFeedback,
  recordRejected,
  recordShown,
} from '../feedback';

beforeEach(async () => {
  await clearFeedback();
});

describe('getFeedbackWeights', () => {
  it('returns no weights for an empty log', async () => {
    const w = await getFeedbackWeights('restless');
    expect(w.size).toBe(0);
  });

  it('carries no signal from "shown" events alone', async () => {
    await recordShown(['hike', 'read', 'nap'], 'restless');
    const w = await getFeedbackWeights('restless');
    expect(w.size).toBe(0);
  });

  it('gives a single reject a negative weight', async () => {
    await recordShown(['hike'], 'restless');
    await recordRejected(['hike'], 'restless');
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBeLessThan(0);
    expect(w.get('hike')).toBeGreaterThanOrEqual(-6);
  });

  it('gives a single accept a positive weight', async () => {
    await recordAccepted('hike', 'restless');
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBeGreaterThan(0);
  });

  it('weighs mood-matched history more than a cross-mood read', async () => {
    await recordAccepted('hike', 'restless');
    const matched = await getFeedbackWeights('restless');
    const crossMood = await getFeedbackWeights('drained');
    expect(matched.get('hike')!).toBeGreaterThan(crossMood.get('hike')!);
  });

  it('caps repeated rejects instead of letting them run away unbounded', async () => {
    for (let i = 0; i < 20; i++) {
      await recordRejected(['hike'], 'restless');
    }
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBe(-6);
  });

  it('reflects mixed accept/reject history precisely', async () => {
    await recordRejected(['hike'], 'restless');
    await recordRejected(['hike'], 'restless');
    await recordAccepted('hike', 'restless');
    const w = await getFeedbackWeights('restless');
    // 2 rejects (-2) + 1 accept (+1) = -1 net any; same mood -> netMood -1
    // raw = netMood*2 + netAny = -2 + -1 = -3
    expect(w.get('hike')).toBe(-3);
  });

  it('clearFeedback wipes the whole log', async () => {
    await recordAccepted('hike', 'restless');
    await clearFeedback();
    const w = await getFeedbackWeights('restless');
    expect(w.size).toBe(0);
  });

  it('scores independent activities independently', async () => {
    await recordAccepted('hike', 'restless');
    await recordRejected(['read'], 'restless');
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBeGreaterThan(0);
    expect(w.get('read')).toBeLessThan(0);
  });

  it('weighs an explicit thumbs-up more than an implicit accept', async () => {
    await recordAccepted('hike', 'restless');
    const implicitOnly = await getFeedbackWeights('restless');
    await clearFeedback();
    await recordExplicitFeedback('hike', 'restless', true);
    const explicitOnly = await getFeedbackWeights('restless');
    expect(explicitOnly.get('hike')!).toBeGreaterThan(implicitOnly.get('hike')!);
  });

  it('gives a thumbs-down a negative weight and caps it like other signals', async () => {
    for (let i = 0; i < 10; i++) {
      await recordExplicitFeedback('hike', 'restless', false);
    }
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBe(-6);
  });

  it('lets a thumbs-up and thumbs-down on the same activity roughly cancel out', async () => {
    await recordExplicitFeedback('hike', 'restless', true);
    await recordExplicitFeedback('hike', 'restless', false);
    const w = await getFeedbackWeights('restless');
    expect(w.get('hike')).toBeUndefined(); // net zero -> no weight stored
  });
});

describe('getPersonalSignal + personalizationNote', () => {
  it('returns an all-zero signal and no note for an activity with no history', async () => {
    const signal = await getPersonalSignal('hike', 'restless');
    expect(signal).toEqual({ thumbsUp: 0, thumbsDown: 0, accepted: 0, rejected: 0 });
    expect(personalizationNote(signal, 'restless')).toBeNull();
  });

  it('only counts events matching both the activity id and the mood', async () => {
    await recordExplicitFeedback('hike', 'restless', true);
    await recordExplicitFeedback('hike', 'drained', true); // different mood
    await recordExplicitFeedback('read', 'restless', true); // different activity
    const signal = await getPersonalSignal('hike', 'restless');
    expect(signal.thumbsUp).toBe(1);
  });

  it('produces a note after a single thumbs-up', async () => {
    await recordExplicitFeedback('hike', 'restless', true);
    const signal = await getPersonalSignal('hike', 'restless');
    expect(personalizationNote(signal, 'restless')).toMatch(/good call/i);
  });

  it('produces a stronger note after repeated thumbs-up', async () => {
    await recordExplicitFeedback('hike', 'restless', true);
    await recordExplicitFeedback('hike', 'restless', true);
    const signal = await getPersonalSignal('hike', 'restless');
    expect(personalizationNote(signal, 'restless')).toMatch(/confirmed/i);
  });

  it('produces a note from a save alone, with no thumbs-up', async () => {
    await recordAccepted('hike', 'restless');
    const signal = await getPersonalSignal('hike', 'restless');
    expect(personalizationNote(signal, 'restless')).toMatch(/saved/i);
  });

  it('says nothing when a thumbs-down is the strongest signal', async () => {
    await recordAccepted('hike', 'restless');
    await recordExplicitFeedback('hike', 'restless', false);
    const signal = await getPersonalSignal('hike', 'restless');
    expect(personalizationNote(signal, 'restless')).toBeNull();
  });
});

describe('getPersonalStats', () => {
  it('returns all-zero stats for an empty log', async () => {
    const stats = await getPersonalStats();
    expect(stats).toEqual({ totalPlans: 0, topMood: null, thumbsUp: 0, thumbsDown: 0, streakDays: 0 });
  });

  it('counts one plan per distinct recordShown call, not per activity', async () => {
    await recordShown(['a', 'b', 'c'], 'restless'); // one plan, 3 activities
    const stats = await getPersonalStats();
    expect(stats.totalPlans).toBe(1);
  });

  it('counts multiple separate plan generations correctly', async () => {
    await recordShown(['a', 'b'], 'restless');
    await new Promise((r) => setTimeout(r, 2)); // ensure a distinct timestamp
    await recordShown(['c', 'd'], 'curious');
    const stats = await getPersonalStats();
    expect(stats.totalPlans).toBe(2);
  });

  it('identifies the most frequently shown mood', async () => {
    await recordShown(['a'], 'restless');
    await new Promise((r) => setTimeout(r, 2));
    await recordShown(['b'], 'restless');
    await new Promise((r) => setTimeout(r, 2));
    await recordShown(['c'], 'curious');
    const stats = await getPersonalStats();
    expect(stats.topMood).toBe('restless');
  });

  it('tallies explicit thumbs-up and thumbs-down separately', async () => {
    await recordExplicitFeedback('a', 'restless', true);
    await recordExplicitFeedback('b', 'restless', true);
    await recordExplicitFeedback('c', 'restless', false);
    const stats = await getPersonalStats();
    expect(stats.thumbsUp).toBe(2);
    expect(stats.thumbsDown).toBe(1);
  });

  it('gives a fresh, same-day-only log a 1-day streak', async () => {
    await recordShown(['a'], 'restless');
    const stats = await getPersonalStats();
    expect(stats.streakDays).toBe(1);
  });
});

describe('getHistoryEntries', () => {
  it('returns nothing for an empty log', async () => {
    const entries = await getHistoryEntries();
    expect(entries).toEqual([]);
  });

  it('excludes plain "shown" and "rejected" events', async () => {
    await recordShown(['hike'], 'restless');
    await recordRejected(['hike'], 'restless');
    const entries = await getHistoryEntries();
    expect(entries).toEqual([]);
  });

  it('includes saves and explicit thumbs feedback, newest first', async () => {
    await recordAccepted('hike', 'restless');
    await new Promise((r) => setTimeout(r, 2));
    await recordExplicitFeedback('read', 'content', true);
    const entries = await getHistoryEntries();
    expect(entries.map((e) => e.id)).toEqual(['read', 'hike']);
    expect(entries[0].event).toBe('thumbsUp');
    expect(entries[1].event).toBe('accepted');
  });

  it('resolves a real dataset title, and reconstructs an AI-composed one from its slug', async () => {
    await recordAccepted('a-10-minute-walk-without-your-phone', 'restless');
    await recordAccepted('ai:cook-a-three-ingredient-midnight-snack', 'bored');
    const entries = await getHistoryEntries();
    const byId = new Map(entries.map((e) => [e.id, e.title]));
    expect(byId.get('a-10-minute-walk-without-your-phone')).toBe('A 10-minute walk without your phone');
    expect(byId.get('ai:cook-a-three-ingredient-midnight-snack')).toBe('Cook A Three Ingredient Midnight Snack');
  });

  it('collapses repeats of the same activity/mood/event into one entry', async () => {
    await recordAccepted('hike', 'restless');
    await recordAccepted('hike', 'restless');
    const entries = await getHistoryEntries();
    expect(entries.length).toBe(1);
  });
});
