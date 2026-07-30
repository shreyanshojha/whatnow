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

  it('parses a valid response spanning all four categories (bare-array shape)', async () => {
    mockAnthropicResponse([textBlock(JSON.stringify(VALID_RESULTS))]);
    const result = await searchNearby({ apiKey: 'test-key' }, 'Nob Hill, San Francisco');
    expect(result).not.toBeNull();
    expect(result!.results.map((r) => r.category).sort()).toEqual(['discover', 'event', 'movie', 'restaurant']);
    expect(result!.note).toBeNull();
  });

  it('parses the {note, results} object shape and surfaces the note', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify({ note: "It's 3am — most places nearby are closed.", results: VALID_RESULTS })),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.note).toBe("It's 3am — most places nearby are closed.");
    expect(result!.results.length).toBe(4);
  });

  it('treats a valid, empty results array with a note as a real (non-null) answer', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify({ note: 'Nothing is open this late nearby.', results: [] })),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.results).toEqual([]);
    expect(result!.note).toBe('Nothing is open this late nearby.');
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
    expect(result!.results.length).toBe(2);
  });

  it('drops an invalid-category result but still returns a real (non-null) outcome', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify([{ ...VALID_RESULTS[0], category: 'not-a-real-category' }])),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.results.length).toBe(0);
  });

  it('drops a fabricated-looking url but keeps the result', async () => {
    mockAnthropicResponse([
      textBlock(JSON.stringify([{ ...VALID_RESULTS[0], url: 'not a real url' }])),
    ]);
    const result = await searchNearby({ apiKey: 'test-key' });
    expect(result).not.toBeNull();
    expect(result!.results[0].url).toBeNull();
  });

  it('returns null for a non-JSON reply and reports an "unreadable" error', async () => {
    mockAnthropicResponse([textBlock('Sorry, I could not find anything specific.')]);
    const onError = jest.fn();
    const result = await searchNearby({ apiKey: 'test-key' }, null, undefined, undefined, onError);
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith('unreadable');
  });

  it('returns null on a non-ok HTTP response and reports a "network" error', async () => {
    mockAnthropicResponse([textBlock('irrelevant')], false);
    const onError = jest.fn();
    const result = await searchNearby({ apiKey: 'test-key' }, null, undefined, undefined, onError);
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith('network');
  });

  it('returns null on a network failure and reports a "network" error', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const onError = jest.fn();
    const result = await searchNearby({ apiKey: 'test-key' }, null, undefined, undefined, onError);
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith('network');
  });

  it('reports a "timeout" error on an aborted request', async () => {
    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const onError = jest.fn();
    const result = await searchNearby({ apiKey: 'test-key' }, null, undefined, undefined, onError);
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledWith('timeout');
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
