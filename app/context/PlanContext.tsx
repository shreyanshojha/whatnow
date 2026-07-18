/* ============================================================
   WhatNow — global app state.
   Holds mood + context inputs, the current plan, saved list
   (persisted to AsyncStorage as full activity snapshots), and
   optional location-derived weather / nearby place. All network
   + GPS is optional and degrades gracefully. AI planning is an
   optional, additive layer — see lib/aiPlan.ts — that always
   falls back to the deterministic engine in lib/plan.ts.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ACTIVITIES, Activity, Energy, MoodId, Place, Social, TimeVal } from '../data/activities';
import { useAuth } from './AuthContext';
import { generateAiPlan } from '../lib/aiPlan';
import { SHARED_BETA_AI_ENABLED } from '../lib/betaConfig';
import { cancelCompletionNotification, scheduleCompletionNotification } from '../lib/completionCheck';
import { fetchNearbyEvents, LiveEvent } from '../lib/events';
import {
  clearFeedback,
  getFeedbackWeights,
  recordAccepted,
  recordRejected,
  recordShown,
} from '../lib/feedback';
import { addLocationVisit, clearLocationHistory, getPatternHint } from '../lib/locationHistory';
import { NearbyResult, searchNearby } from '../lib/nearbySearch';
import { generatePlan, PlanInput, WeatherState } from '../lib/plan';
import { NearbyPlace, RADIUS_METERS, SearchRadius, fetchNearby } from '../lib/places';
import {
  fetchSyncedSavedActivities,
  syncPlanEvent,
  syncSaveActivity,
  syncUnsaveActivity,
} from '../lib/sync';
import {
  loadAiApiKey,
  loadAiEnabled,
  loadEventsApiKey,
  saveAiApiKey,
  saveAiEnabled,
  saveEventsApiKey,
} from '../lib/secureSettings';
import {
  MAX_AI_PLANS_PER_DAY,
  MAX_EVENTS_LOOKUPS_PER_DAY,
  MAX_NEARBY_SEARCHES_PER_DAY,
  aiPlansUsedToday,
  canUseAiPlanToday,
  canUseEventsLookupToday,
  canUseNearbySearchToday,
  eventsLookupsUsedToday,
  nearbySearchesUsedToday,
  recordAiPlanUse,
  recordEventsLookupUse,
  recordNearbySearchUse,
} from '../lib/usageLimits';
import { fetchWeather } from '../lib/weather';

type Budget = 'free' | 'cheap' | 'treat';
export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';
export type PlanSource = 'engine' | 'ai' | null;

/** A card on the Plan screen: an activity, plus where it came from. */
export interface PlanCard {
  activity: Activity;
  /** Index into ACTIVITIES if it's from the deterministic engine, else null (AI-composed). */
  index: number | null;
  /** The mood this card was shown under — kept on the card (not just read from
   * global state later) so feedback recorded after a mood change still lands
   * against the mood the person actually had when they saw it. */
  mood: MoodId;
}

/** A saved activity, snapshotted in full so it never depends on the dataset. */
export interface SavedEntry {
  activity: Activity;
  mood: MoodId;
  /** When this was saved — powers the completion check-in (lib/completionCheck.ts),
   * which needs to know it's been long enough that the person plausibly had a
   * chance to actually do it. Optional only because entries saved before this
   * field existed won't have it; those are simply never eligible for a check-in. */
  savedAt?: number;
}

const SAVED_KEY = 'whatnow.saved.v2';
// Last-used context inputs (energy/time/social/setting/budget/withKids —
// deliberately NOT mood, which should always be asked fresh). Restoring
// these on the next app open means a returning person mostly just picks a
// mood and taps through, instead of re-answering the same "1 hour, solo,
// either, a little" every single time — a small but real piece of "the app
// remembers you" that doesn't depend on any personalization model at all.
const LAST_CONTEXT_KEY = 'whatnow.lastContext.v1';

interface StoredContext {
  energy: Energy;
  time: TimeVal;
  social: Social;
  setting: Place;
  budget: Budget;
  withKids: boolean;
}

interface PlanContextValue {
  // inputs
  mood: MoodId | null;
  energy: Energy;
  time: TimeVal;
  social: Social;
  setting: Place;
  budget: Budget;
  withKids: boolean;
  // Set only by the mood grid's "Other" tile — the raw text someone typed
  // instead of picking a listed mood. See lib/moodMatch.ts for how it still
  // gets bucketed into a real MoodId for the engine/feedback log underneath.
  freeformDescription: string;
  setMood: (m: MoodId) => void;
  setEnergy: (e: Energy) => void;
  setTime: (t: TimeVal) => void;
  setSocial: (s: Social) => void;
  setSetting: (p: Place) => void;
  setBudget: (b: Budget) => void;
  setWithKids: (v: boolean) => void;
  setFreeformDescription: (v: string) => void;
  // derived
  weather: WeatherState | null;
  nearby: NearbyPlace | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<void>;
  /** For someone who'd rather type a place than share GPS — see lib/places.ts. */
  setManualLocation: (lat: number, lon: number, radius: SearchRadius) => Promise<void>;
  nearbyEvents: LiveEvent[];
  eventsLoading: boolean;
  // "Look online nearby" web search (optional, bring-your-own-key — same key as AI planning)
  nearbySearchResults: NearbyResult[] | null;
  nearbySearchLoading: boolean;
  lookOnlineNearby: () => Promise<void>;
  // plan
  lastPlan: PlanCard[];
  planSource: PlanSource;
  planLoading: boolean;
  makePlan: () => Promise<PlanCard[]>;
  reshuffle: () => Promise<PlanCard[]>;
  planInput: PlanInput | null;
  // saved
  saved: SavedEntry[];
  isSaved: (activity: Activity) => boolean;
  toggleSave: (activity: Activity) => void;
  clearSaved: () => void;
  // AI planning (optional, bring-your-own-key)
  aiEnabled: boolean;
  setAiEnabled: (v: boolean) => void;
  aiApiKey: string;
  setAiApiKey: (key: string) => void;
  /** True when a signed-in person without their own BYOK key gets AI
   * planning + "Look online nearby" automatically via the shared beta
   * backend (see lib/betaConfig.ts) — lets screens gate UI on "is AI
   * available at all" without caring which path is actually in use. */
  sharedAiAvailable: boolean;
  // Live nearby events (optional, bring-your-own-key)
  eventsApiKey: string;
  setEventsApiKey: (key: string) => void;
  // On-device-only location pattern memory (see lib/locationHistory.ts)
  clearLocationHistory: () => void;
  // On-device-only accept/reject learning log (see lib/feedback.ts)
  clearFeedback: () => void;
  // Clears mood/constraints/lastPlan for a genuine "start over" — see plan.tsx
  resetFlow: () => void;
  // Reasonable daily caps on the BYOK calls (see lib/usageLimits.ts)
  aiPlansRemainingToday: number;
  eventsLookupsRemainingToday: number;
  nearbySearchesRemainingToday: number;
}

const Ctx = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  // Beta: signed-in people without their own BYOK key get AI planning +
  // "Look online nearby" automatically via the shared, capped ai-proxy
  // backend — see lib/betaConfig.ts. A BYOK key, once set and enabled,
  // always takes precedence over the shared path.
  const sharedAiAvailable = SHARED_BETA_AI_ENABLED && !!user && !!session?.access_token;
  const [mood, setMood] = useState<MoodId | null>(null);
  const [energy, setEnergy] = useState<Energy>('medium');
  const [time, setTime] = useState<TimeVal>(60);
  const [social, setSocial] = useState<Social>('solo');
  const [setting, setSetting] = useState<Place>('either');
  const [budget, setBudget] = useState<Budget>('cheap');
  const [withKids, setWithKids] = useState<boolean>(false);
  const [freeformDescription, setFreeformDescription] = useState<string>('');

  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [nearbyEvents, setNearbyEvents] = useState<LiveEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [nearbySearchResults, setNearbySearchResults] = useState<NearbyResult[] | null>(null);
  const [nearbySearchLoading, setNearbySearchLoading] = useState(false);

  const [lastPlan, setLastPlan] = useState<PlanCard[]>([]);
  const [planSource, setPlanSource] = useState<PlanSource>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  const [aiEnabled, setAiEnabledState] = useState(false);
  const [aiApiKey, setAiApiKeyState] = useState('');
  const [eventsApiKey, setEventsApiKeyState] = useState('');

  const [aiPlansRemainingToday, setAiPlansRemainingToday] = useState(MAX_AI_PLANS_PER_DAY);
  const [eventsLookupsRemainingToday, setEventsLookupsRemainingToday] = useState(
    MAX_EVENTS_LOOKUPS_PER_DAY
  );
  const [nearbySearchesRemainingToday, setNearbySearchesRemainingToday] = useState(
    MAX_NEARBY_SEARCHES_PER_DAY
  );

  // ---- Guards against the makePlan/location race ----
  // weather/nearby arrive asynchronously (GPS + network). If someone taps
  // "Make my plan" in the gap between requesting location and it resolving,
  // makePlan would otherwise silently build a plan from stale (null)
  // location state, and nothing would ever regenerate it once the real
  // weather/place data showed up a moment later. Refs (always current,
  // unlike a value captured in a closure) plus a short bounded wait fix
  // that without ever blocking plan generation indefinitely.
  const weatherRef = React.useRef<WeatherState | null>(null);
  const nearbyRef = React.useRef<NearbyPlace | null>(null);
  const locationPromiseRef = React.useRef<Promise<void> | null>(null);
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);
  useEffect(() => {
    nearbyRef.current = nearby;
  }, [nearby]);

  const refreshUsageCounts = useCallback(() => {
    aiPlansUsedToday().then((used) => setAiPlansRemainingToday(Math.max(0, MAX_AI_PLANS_PER_DAY - used)));
    eventsLookupsUsedToday().then((used) =>
      setEventsLookupsRemainingToday(Math.max(0, MAX_EVENTS_LOOKUPS_PER_DAY - used))
    );
    nearbySearchesUsedToday().then((used) =>
      setNearbySearchesRemainingToday(Math.max(0, MAX_NEARBY_SEARCHES_PER_DAY - used))
    );
  }, []);

  // ---- Load today's usage counts on mount ----
  useEffect(() => {
    refreshUsageCounts();
  }, [refreshUsageCounts]);

  // ---- Rehydrate last-used context inputs (see LAST_CONTEXT_KEY above) ----
  const contextRehydratedRef = React.useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_CONTEXT_KEY);
        if (raw) {
          const parsed: Partial<StoredContext> = JSON.parse(raw);
          if (parsed.energy) setEnergy(parsed.energy);
          if (parsed.time) setTime(parsed.time);
          if (parsed.social) setSocial(parsed.social);
          if (parsed.setting) setSetting(parsed.setting);
          if (parsed.budget) setBudget(parsed.budget);
          if (typeof parsed.withKids === 'boolean') setWithKids(parsed.withKids);
        }
      } catch {
        // ignore — just start from the hardcoded defaults above
      } finally {
        // Only start persisting *after* rehydration finishes, so the
        // effect below doesn't stomp the just-loaded values with the
        // pre-rehydration defaults on the very first render.
        contextRehydratedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!contextRehydratedRef.current) return;
    const snapshot: StoredContext = { energy, time, social, setting, budget, withKids };
    AsyncStorage.setItem(LAST_CONTEXT_KEY, JSON.stringify(snapshot)).catch(() => {});
  }, [energy, time, social, setting, budget, withKids]);

  // ---- Rehydrate saved list (full snapshots — no dataset dependency) ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const entries = parsed.filter(
          (e): e is SavedEntry =>
            !!e && typeof e === 'object' && !!(e as SavedEntry).activity && !!(e as SavedEntry).mood
        );
        setSaved(entries);
      } catch {
        // ignore — start with an empty list
      }
    })();
  }, []);

  // ---- Rehydrate AI + events settings ----
  useEffect(() => {
    (async () => {
      const [enabled, key, eventsKey] = await Promise.all([
        loadAiEnabled(),
        loadAiApiKey(),
        loadEventsApiKey(),
      ]);
      setAiEnabledState(enabled);
      setAiApiKeyState(key);
      setEventsApiKeyState(eventsKey);
    })();
  }, []);

  const setAiEnabled = useCallback((v: boolean) => {
    setAiEnabledState(v);
    saveAiEnabled(v);
  }, []);

  const setAiApiKey = useCallback((key: string) => {
    setAiApiKeyState(key);
    saveAiApiKey(key);
  }, []);

  const setEventsApiKey = useCallback((key: string) => {
    setEventsApiKeyState(key);
    saveEventsApiKey(key);
  }, []);

  const persistSaved = useCallback((entries: SavedEntry[]) => {
    (async () => {
      try {
        await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(entries));
      } catch {
        // ignore write errors — in-memory state still holds
      }
    })();
  }, []);

  // ---- Merge server-synced saved activities in on sign-in ----
  // One-way merge, union by activity id — never removes a local save that
  // isn't on the server yet (toggleSave's own sync call will push it up).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const synced = await fetchSyncedSavedActivities();
      if (!synced || synced.length === 0) return;
      setSaved((prev) => {
        const byId = new Map(prev.map((s) => [s.activity.id, s]));
        for (const entry of synced) {
          if (!byId.has(entry.activity.id)) byId.set(entry.activity.id, entry);
        }
        const merged = Array.from(byId.values());
        persistSaved(merged);
        return merged;
      });
    })();
  }, [user, persistSaved]);

  const planInput: PlanInput | null = useMemo(() => {
    if (!mood) return null;
    return {
      mood,
      energy,
      time,
      social,
      setting,
      budget,
      weather,
      withKids,
      freeform: freeformDescription || undefined,
    };
  }, [mood, energy, time, social, setting, budget, weather, withKids, freeformDescription]);

  /** Bounded wait: if a location request just kicked off, give it a moment
   * to land so the plan can use it — but never block plan generation for
   * long. If it's still pending after this, we proceed with whatever
   * weatherRef/nearbyRef currently hold (possibly still null), same
   * graceful-degradation posture as every other optional feature here. */
  const LOCATION_WAIT_MS = 6000;
  async function awaitPendingLocation(): Promise<void> {
    const pending = locationPromiseRef.current;
    if (!pending) return;
    await Promise.race([pending, new Promise<void>((resolve) => setTimeout(resolve, LOCATION_WAIT_MS))]);
  }

  const makePlan = useCallback(
    async (options: { excludeIds?: Set<string> } = {}): Promise<PlanCard[]> => {
      if (!mood) return [];
      await awaitPendingLocation();

      const input: PlanInput = {
        mood,
        energy,
        time,
        social,
        setting,
        budget,
        weather: weatherRef.current,
        withKids,
        freeform: freeformDescription || undefined,
      };
      setPlanLoading(true);
      try {
        let cards: PlanCard[] | null = null;
        let planSourceForSync: 'engine' | 'ai' = 'engine';
        const excludeIds = options.excludeIds;

        const byokReady = aiEnabled && !!aiApiKey && (await canUseAiPlanToday());
        // BYOK, once configured and enabled, always wins over the shared beta
        // path — someone who's brought their own key gets their own limits.
        const useShared = !byokReady && sharedAiAvailable;
        if (byokReady || useShared) {
          // Pattern hint is computed fresh from on-device history only — never stored,
          // never sent anywhere except as part of this one plan request.
          const patternHint = await getPatternHint(input.mood);
          const avoidTitles = excludeIds
            ? lastPlan.filter((c) => excludeIds.has(c.activity.id)).map((c) => c.activity.t)
            : [];
          const aiActivities = await generateAiPlan(
            input,
            byokReady ? { apiKey: aiApiKey } : { sharedAccessToken: session?.access_token },
            nearbyRef.current?.placeName ?? null,
            patternHint,
            avoidTitles,
            nearbyRef.current?.venues ?? []
          );
          if (aiActivities && aiActivities.length >= 2) {
            cards = aiActivities.map((activity) => ({ activity, index: null, mood: input.mood }));
            setPlanSource('ai');
            planSourceForSync = 'ai';
            if (byokReady) {
              await recordAiPlanUse();
              refreshUsageCounts();
            }
          }
        }

        if (!cards) {
          // This person's own accept/reject history for this mood, folded gently
          // into scoring — see lib/feedback.ts and lib/plan.ts's FEEDBACK_SCALE.
          const feedbackWeights = await getFeedbackWeights(input.mood);
          const idxs = generatePlan(input, { feedbackWeights, excludeIds });
          cards = idxs.map((i) => ({ activity: ACTIVITIES[i], index: i, mood: input.mood }));
          setPlanSource('engine');
        }

        setLastPlan(cards);
        recordShown(
          cards.map((c) => c.activity.id),
          input.mood
        ).catch(() => {});
        syncPlanEvent(input, planSourceForSync).catch(() => {});
        return cards;
      } finally {
        setPlanLoading(false);
      }
    },
    [
      mood,
      energy,
      time,
      social,
      setting,
      budget,
      withKids,
      freeformDescription,
      aiEnabled,
      aiApiKey,
      sharedAiAvailable,
      session,
      refreshUsageCounts,
      lastPlan,
    ]
  );

  const reshuffle = useCallback(async (): Promise<PlanCard[]> => {
    const previous = lastPlan;
    const excludeIds = new Set(previous.map((c) => c.activity.id));
    const next = await makePlan({ excludeIds });

    // Anything the previous plan showed that isn't in this new plan, and
    // wasn't saved, just got reshuffled away — a real, if soft, "no thanks".
    if (previous.length > 0) {
      const nextIds = new Set(next.map((c) => c.activity.id));
      const rejectedByMood = new Map<MoodId, string[]>();
      for (const card of previous) {
        if (nextIds.has(card.activity.id)) continue;
        if (savedRef.current.some((s) => s.activity.id === card.activity.id)) continue;
        const list = rejectedByMood.get(card.mood) ?? [];
        list.push(card.activity.id);
        rejectedByMood.set(card.mood, list);
      }
      for (const [m, ids] of rejectedByMood) {
        recordRejected(ids, m).catch(() => {});
      }
    }

    return next;
  }, [lastPlan, makePlan]);

  /** "Look online nearby" — searches the live web (via the same Anthropic
   * key used for AI planning) for real, currently-happening local events
   * and new movies that structured APIs like Ticketmaster/OpenStreetMap
   * don't cover. Fully optional: does nothing without a key, silently
   * clears results on any failure so the section just disappears rather
   * than showing something broken. See lib/nearbySearch.ts. */
  const lookOnlineNearby = useCallback(async (): Promise<void> => {
    const byokReady = !!aiApiKey && (await canUseNearbySearchToday());
    const useShared = !byokReady && sharedAiAvailable;
    if (!byokReady && !useShared) {
      setNearbySearchResults(null);
      return;
    }
    setNearbySearchLoading(true);
    try {
      const config = byokReady ? { apiKey: aiApiKey } : { sharedAccessToken: session?.access_token };
      const results = await searchNearby(config, nearbyRef.current?.placeName ?? null);
      setNearbySearchResults(results);
      if (results && byokReady) {
        await recordNearbySearchUse();
        refreshUsageCounts();
      }
    } finally {
      setNearbySearchLoading(false);
    }
  }, [aiApiKey, sharedAiAvailable, session, refreshUsageCounts]);

  /** Shared by both the GPS path (requestLocation) and the manual-place path
   * (setManualLocation) below — everything that happens once we have *some*
   * coordinates, regardless of how we got them. Never throws; the caller
   * decides what locationStatus to fall back to if this itself fails. */
  const applyResolvedLocation = useCallback(
    async (lat: number, lon: number, radiusMeters: number): Promise<void> => {
      // Both are independent + individually wrapped; never throw here.
      const [w, n] = await Promise.all([fetchWeather(lat, lon), fetchNearby(lat, lon, radiusMeters)]);
      if (w) setWeather(w);
      if (n) setNearby(n);
      setLocationStatus('granted');
      // On-device only — nothing here ever leaves the phone. See lib/locationHistory.ts.
      if (mood) addLocationVisit(mood, n?.placeName ?? null).catch(() => {});

      // Live events are their own optional, bring-your-own-key layer.
      if (eventsApiKey && (await canUseEventsLookupToday())) {
        setEventsLoading(true);
        fetchNearbyEvents(lat, lon, eventsApiKey)
          .then((events) => {
            setNearbyEvents(events);
            if (events.length > 0) {
              recordEventsLookupUse().then(refreshUsageCounts);
            }
          })
          .catch(() => setNearbyEvents([]))
          .finally(() => setEventsLoading(false));
      }
    },
    [eventsApiKey, mood, refreshUsageCounts]
  );

  const requestLocation = useCallback((): Promise<void> => {
    // Registered in locationPromiseRef so makePlan can wait for this exact
    // in-flight request instead of racing it — see awaitPendingLocation above.
    const p = (async () => {
      setLocationStatus('loading');
      try {
        const services = await Location.hasServicesEnabledAsync();
        if (!services) {
          setLocationStatus('unavailable');
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const { latitude, longitude } = pos.coords;
        await applyResolvedLocation(latitude, longitude, 1500);
      } catch {
        setLocationStatus('unavailable');
      }
    })();

    locationPromiseRef.current = p;
    p.finally(() => {
      if (locationPromiseRef.current === p) locationPromiseRef.current = null;
    });
    return p;
  }, [applyResolvedLocation]);

  /** For someone who'd rather type a place than share GPS (denied location,
   * doesn't want to, or just wants a different area than where they are) —
   * see lib/places.ts's searchPlace for the search itself and the "Search a
   * place instead" flow on the context screen for the UI. */
  const setManualLocation = useCallback(
    (lat: number, lon: number, radius: SearchRadius): Promise<void> => {
      // Registered in locationPromiseRef exactly like requestLocation, so a
      // "Make my plan" tap that lands while this is still resolving waits
      // for it instead of racing it — see awaitPendingLocation above. Without
      // this, tapping a search result and immediately tapping "Make my plan"
      // could silently build that one plan from stale (null) nearby data.
      const p = (async () => {
        setLocationStatus('loading');
        try {
          await applyResolvedLocation(lat, lon, RADIUS_METERS[radius]);
        } catch {
          setLocationStatus('unavailable');
        }
      })();

      locationPromiseRef.current = p;
      p.finally(() => {
        if (locationPromiseRef.current === p) locationPromiseRef.current = null;
      });
      return p;
    },
    [applyResolvedLocation]
  );

  // Kept in a ref (not just the `saved` state) so reshuffle's reject-recording
  // logic — defined earlier in this file, before isSaved exists as a value —
  // can read the latest saved list without an awkward dependency cycle.
  const savedRef = React.useRef<SavedEntry[]>([]);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const isSaved = useCallback(
    (activity: Activity) => saved.some((s) => s.activity.id === activity.id),
    [saved]
  );

  const toggleSave = useCallback(
    (activity: Activity) => {
      const savedMood = mood ?? activity.moods[0];
      let savedAt = 0;
      // Captured from the same `prev` the state update itself uses, inside
      // the updater closure — not from savedRef (which only catches up via a
      // separate effect a commit later). A rapid save→unsave→save on the
      // same activity previously risked reading a one-commit-stale ref here
      // and taking the wrong schedule/cancel branch below.
      let existedBefore = false;
      setSaved((prev) => {
        existedBefore = prev.some((s) => s.activity.id === activity.id);
        savedAt = Date.now();
        const next = existedBefore
          ? prev.filter((s) => s.activity.id !== activity.id)
          : [...prev, { activity, mood: savedMood, savedAt }];
        persistSaved(next);
        return next;
      });
      // Saving is a clear, deliberate positive signal — unsaving isn't treated
      // as a negative one (people tidy up saved lists for lots of reasons
      // unrelated to "I didn't like this").
      if (!existedBefore) {
        recordAccepted(activity.id, savedMood).catch(() => {});
        syncSaveActivity(activity, savedMood).catch(() => {});
        // A courtesy local nudge in case this person never reopens the app
        // on their own — see lib/completionCheck.ts. Never blocks the save.
        scheduleCompletionNotification({ activity, mood: savedMood, savedAt }).catch(() => {});
      } else {
        syncUnsaveActivity(activity.id).catch(() => {});
        cancelCompletionNotification(activity.id).catch(() => {});
      }
    },
    [persistSaved, mood]
  );

  const clearSaved = useCallback(() => {
    setSaved([]);
    persistSaved([]);
  }, [persistSaved]);

  /** "Start over" should mean it: clear the mood + constraint choices and the
   * plan they produced, not just navigate back to the mood picker while the
   * old mood stays highlighted and could silently regenerate the same plan.
   * Saved activities, location, and AI/events settings are untouched — those
   * aren't part of "this one plan attempt." */
  const resetFlow = useCallback(() => {
    setMood(null);
    setEnergy('medium');
    setTime(60);
    setSocial('solo');
    setSetting('either');
    setBudget('cheap');
    setWithKids(false);
    setFreeformDescription('');
    setLastPlan([]);
    setPlanSource(null);
    setNearbySearchResults(null);
  }, []);

  const value: PlanContextValue = {
    mood,
    energy,
    time,
    social,
    setting,
    budget,
    withKids,
    freeformDescription,
    setMood,
    setEnergy,
    setTime,
    setSocial,
    setSetting,
    setBudget,
    setWithKids,
    setFreeformDescription,
    weather,
    nearby,
    locationStatus,
    requestLocation,
    setManualLocation,
    nearbyEvents,
    eventsLoading,
    nearbySearchResults,
    nearbySearchLoading,
    lookOnlineNearby,
    lastPlan,
    planSource,
    planLoading,
    makePlan,
    reshuffle,
    planInput,
    saved,
    isSaved,
    toggleSave,
    clearSaved,
    aiEnabled,
    setAiEnabled,
    aiApiKey,
    setAiApiKey,
    sharedAiAvailable,
    eventsApiKey,
    setEventsApiKey,
    clearLocationHistory,
    clearFeedback,
    resetFlow,
    aiPlansRemainingToday,
    eventsLookupsRemainingToday,
    nearbySearchesRemainingToday,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan(): PlanContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlan must be used within a PlanProvider');
  return v;
}
