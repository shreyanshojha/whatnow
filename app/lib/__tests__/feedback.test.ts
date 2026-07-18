/* ============================================================
   Tests for the on-device learning log (lib/feedback.ts).
   jest-expo's default AsyncStorage mock (in-memory, resets between
   test files but persists across it()s in the same file — hence
   the explicit clearFeedback() in beforeEach) backs these.
   ============================================================ */

import {
  clearFeedback,
  getFeedbackWeights,
  recordAccepted,
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
});
