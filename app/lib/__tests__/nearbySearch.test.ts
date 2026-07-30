/* ============================================================
   Tests for the "Look online nearby" web-search layer (lib/nearbySearch.ts).
   Mirrors aiPlan.test.ts's approach: mock global.fetch directly rather than
   hitting the network, and assert searchNearby degrades to null on any
   malformed/adversarial response instead of throwing.
   ============================================================ */

import { searchNearby } from '../nearbySearch';

function mockAnthropicResponse(contentBlocks: unknown[], ok = true) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => ({ content: contentBlocks }),
  });
}

function textBlock(text: string) {
  return { type: 'text', text };
}

const VALID_RESULTS = [
  { name: 'Tadich Grill', blurb: "SF's oldest restaurant, great for old-school seafood.", category: 'restaurant', url: 'https://example.com/tadich' },
  { name: 'Sundown Night Market', blurb: 'A monthly night market with local food vendors.', category: 'event', url: null },
  { name: 'Some New Movie', blurb: 'Just opened in theaters nearby.', category: 'movie', url: 'https://example.com/movie' },
  { name: 'Coit Tower Overlook', blurb: 'A well-known scenic viewpoint over the bay.', category: 'discover', url: null },
];

describe('searchNearby', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when no key is provided', async () => {
    const result = await searchNearby({});
    expect(result).toBeNull();
  });

  it('parses a valid response spanning all four categories', async () => {
    mockAnthropicResponse([textBlock(JSON.stringify(VALID_RESULTS))]);
    const result = await searchNearby({ apiKey: 'test-key' }, 'Nob Hill, San Francisco');
    expect(result).not.toBeNull();
    expect(result!.map((r) => r.category).sort()).toEqual(['discover', 'event', 'movie', 'restaurant']);
  });

  it('joins interleaved text blocks (as web-search tool use produces) before parsing', async () => {
    mockAnthropicResponse([
      { type: 'server_tool_use', id: 'x' },
      textBlock('[' + JSON.stringify(VALID_RESULTS[0])),
      { type: 'web_search_tool_result', id: 'y' },
      textBlock(',' + JSON.stringify(VALID_RESULTS[1]) + ']'),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
  });

  it('rejects a result with an invalid category', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify([{ ...VALID_RESULTS[0], category: 'not-a-real-category' }])),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('drops a fabricated-looking url but keeps the result', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify([{ ...VALID_RESULTS[0], url: 'not a real url' }])),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result![0].url).toBeNull();
  });

  it('returns null for a non-JSON reply', async () => {
    mockAnthropicResponse([textBlock('Sorry, I could not find anything specific.')]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null on a non-ok HTTP response', async () => {
    mockAnthropicResponse([textBlock('irrelevant')], false);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('returns null on a network failure', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).toBeNull();
  });

  it('passes a refineHint through without throwing (prompt content is not asserted here)', async () => {
    mockAnthropicResponse([textBlock(JSON.stringify([VALID_RESULTS[0]]))]);
    const result = await searchNearby({ apiKey: 'test-key' }, 'Nob Hill, San Francisco', undefined, 'Italian food');
    expect(result).not.toBeNull();
    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.messages[0].content).toContain('Italian food');
  });
});
