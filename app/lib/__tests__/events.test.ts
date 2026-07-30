/* ============================================================
   Tests for the live nearby events layer (lib/events.ts). Mirrors
   aiPlan.test.ts/nearbySearch.test.ts's approach: mock global.fetch
   directly, assert graceful (never-throwing) degradation on any
   failure, and check the two transports (BYOK direct-to-Ticketmaster
   vs. shared events-proxy) hit the right URL with the right shape.
   ============================================================ */

import { fetchNearbyEvents } from '../events';

function mockTicketmasterResponse(events: unknown[], ok = true, status = 200) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ _embedded: { events } }),
  });
}

const RAW_EVENT = {
  name: 'Local Band Live',
  url: 'https://example.com/event',
  classifications: [{ segment: { name: 'Music' } }],
  _embedded: { venues: [{ name: 'The Fillmore', city: { name: 'San Francisco' } }] },
  dates: { start: { localDate: '2026-08-01', localTime: '20:00:00' } },
};

describe('fetchNearbyEvents', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an empty list when neither a BYOK key nor a shared token is provided', async () => {
    const result = await fetchNearbyEvents(37.8, -122.4, {});
    expect(result).toEqual([]);
  });

  it('calls Ticketmaster directly on the BYOK path and parses a real event', async () => {
    mockTicketmasterResponse([RAW_EVENT]);
    const result = await fetchNearbyEvents(37.8, -122.4, { apiKey: 'tm-test-key' });
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      name: 'Local Band Live',
      url: 'https://example.com/event',
      segment: 'Music',
      venueName: 'The Fillmore',
      city: 'San Francisco',
      localDate: '2026-08-01',
      localTime: '20:00:00',
    });
    const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('app.ticketmaster.com');
    expect(calledUrl).toContain('apikey=tm-test-key');
  });

  it('calls the shared events-proxy function when only a shared token is set', async () => {
    mockTicketmasterResponse([RAW_EVENT]);
    const result = await fetchNearbyEvents(37.8, -122.4, { sharedAccessToken: 'session-token' });
    expect(result.length).toBe(1);
    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toContain('/functions/v1/events-proxy');
    expect(call[1].headers.Authorization).toBe('Bearer session-token');
    const body = JSON.parse(call[1].body as string);
    expect(body).toEqual({ lat: 37.8, lon: -122.4, radiusKm: 15 });
  });

  it('prefers a BYOK key over a shared token when both are set', async () => {
    mockTicketmasterResponse([RAW_EVENT]);
    await fetchNearbyEvents(37.8, -122.4, { apiKey: 'tm-test-key', sharedAccessToken: 'session-token' });
    const calledUrl = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('app.ticketmaster.com');
  });

  it('drops malformed event entries but keeps valid ones', async () => {
    mockTicketmasterResponse([RAW_EVENT, { no: 'name field' }]);
    const result = await fetchNearbyEvents(37.8, -122.4, { apiKey: 'tm-test-key' });
    expect(result.length).toBe(1);
  });

  it('returns an empty list on a non-ok response (e.g. a bad/expired key)', async () => {
    mockTicketmasterResponse([], false, 401);
    const result = await fetchNearbyEvents(37.8, -122.4, { apiKey: 'bad-key' });
    expect(result).toEqual([]);
  });

  it('calls onCapped only on the shared path when the response is a 429', async () => {
    mockTicketmasterResponse([], false, 429);
    const onCapped = jest.fn();
    const result = await fetchNearbyEvents(37.8, -122.4, { sharedAccessToken: 'session-token' }, 15, onCapped);
    expect(result).toEqual([]);
    expect(onCapped).toHaveBeenCalledTimes(1);
  });

  it('never calls onCapped on the BYOK path even on a 429', async () => {
    mockTicketmasterResponse([], false, 429);
    const onCapped = jest.fn();
    await fetchNearbyEvents(37.8, -122.4, { apiKey: 'tm-test-key' }, 15, onCapped);
    expect(onCapped).not.toHaveBeenCalled();
  });

  it('returns an empty list on a network failure without throwing', async () => {
    (globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await fetchNearbyEvents(37.8, -122.4, { apiKey: 'tm-test-key' });
    expect(result).toEqual([]);
  });
});
