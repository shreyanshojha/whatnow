/* ============================================================
   Tests for the optional AI planning layer (lib/aiPlan.ts).
   generateAiPlan must return null (triggering the deterministic
   fallback in PlanContext) on any malformed/adversarial response,
   and only ever return well-formed, constraint-satisfying
   activities otherwise. These mock global.fetch directly rather
   than hitting the network.
   ============================================================ */

import { generateAiPlan } from '../aiPlan';
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

function mockAnthropicResponse(text: string, ok = true) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => ({ content: [{ text }] }),
  });
}

const VALID_ITEM = {
  t: 'Take a short walk',
  d: 'Get some air and move your body.',
  cat: 'move',
  e: 'medium',
  time: 15,
  soc: ['solo'],
  place: 'outdoor',
  cost: 'free',
  why: { restless: 'Movement gives restless energy somewhere to go.' },
};

describe('generateAiPlan', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when no API key is provided', async () => {
    const result = await generateAiPlan(baseInput(), { apiKey: '' });
    expect(result).toBeNull();
  });

  it('parses a valid plain-JSON response', async () => {
    mockAnthropicResponse(JSON.stringify([VALID_ITEM, { ...VALID_ITEM, t: 'Second idea' }]));
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result![0].t).toBe('Take a short walk');
  });

  it('parses a markdown-code-fenced JSON response', async () => {
    const fenced = '```json\n' + JSON.stringify([VALID_ITEM, { ...VALID_ITEM, t: 'Second' }]) + '\n```';
    mockAnthropicResponse(fenced);
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  it('rejects an activity with an invalid category', async () => {
    mockAnthropicResponse(
      JSON.stringify([{ ...VALID_ITEM, cat: 'not-a-real-category' }, { ...VALID_ITEM, t: 'Second' }])
    );
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    // Only one item is valid (the bad-category one is dropped) -> below the 2-item floor -> null
    expect(result).toBeNull();
  });

  it('rejects an activity whose time exceeds the available window', async () => {
    mockAnthropicResponse(
      JSON.stringify([{ ...VALID_ITEM, time: 240 }, { ...VALID_ITEM, t: 'Second' }])
    );
    const result = await generateAiPlan(baseInput({ time: 15 }), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('rejects an activity missing a why-line for the current mood', async () => {
    mockAnthropicResponse(
      JSON.stringify([
        { ...VALID_ITEM, why: { content: 'wrong mood key' } },
        { ...VALID_ITEM, t: 'Second' },
      ])
    );
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null for a non-JSON reply', async () => {
    mockAnthropicResponse('Sorry, I cannot help with that right now.');
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null when fewer than 2 valid activities remain', async () => {
    mockAnthropicResponse(JSON.stringify([VALID_ITEM]));
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('rejects an activity whose cost exceeds the stated budget', async () => {
    mockAnthropicResponse(
      JSON.stringify([{ ...VALID_ITEM, cost: 'treat' }, { ...VALID_ITEM, t: 'Second' }])
    );
    const result = await generateAiPlan(baseInput({ budget: 'free' }), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null on a network failure', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null on a non-ok HTTP response', async () => {
    mockAnthropicResponse('irrelevant', false);
    const result = await generateAiPlan(baseInput(), { apiKey: 'test-key' });
    expect(result).toBeNull();
  });
});
