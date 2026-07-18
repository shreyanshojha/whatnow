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
import { generateAiPlan } from '../lib/aiPlan';
import { fetchNearbyEvents, LiveEvent } from '../lib/events';
import {
  clearFeedback,
  getFeedbackWeights,
  recordAccepted,
  recordRejected,
  recordShown,
} from '../lib/feedback';
import { addLocationVisit, clearLocationHistory, getPatternHint } from '../lib/locationHistory';
import { generatePlan, PlanInput, WeatherState } from '../lib/plan';
import { NearbyPlace, fetchNearby } from '../lib/places';
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
  aiPlansUsedToday,
  canUseAiPlanToday,
  canUseEventsLookupToday,
  eventsLookupsUsedToday,
  recordAiPlanUse,
  recordEventsLookupUse,
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
}

const SAVED_KEY = 'whatnow.saved.v2';

interface PlanContextValue {
  // inputs
  mood: MoodId | null;
  energy: Energy;
  time: TimeVal;
  social: Social;
  setting: Place;
  budget: Budget;
  withKids: boolean;
  setMood: (m: MoodId) => void;
  setEnergy: (e: Energy) => void;
  setTime: (t: TimeVal) => void;
  setSocial: (s: Social) => void;
  setSetting: (p: Place) => void;
  setBudget: (b: Budget) => void;
  setWithKids: (v: boolean) => void;
  // derived
  weather: WeatherState | null;
  nearby: NearbyPlace | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<void>;
  nearbyEvents: LiveEvent[];
  eventsLoading: boolean;
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
}

const Ctx = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<MoodId | null>(null);
  const [energy, setEnergy] = useState<Energy>('medium');
  const [time, setTime] = useState<TimeVal>(60);
  const [social, setSocial] = useState<Social>('solo');
  const [setting, setSetting] = useState<Place>('either');
  const [budget, setBudget] = useState<Budget>('cheap');
  const [withKids, setWithKids] = useState<boolean>(false);

  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [nearbyEvents, setNearbyEvents] = useState<LiveEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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
  }, []);

  // ---- Load today's usage counts on mount ----
  useEffect(() => {
    refreshUsageCounts();
  }, [refreshUsageCounts]);

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

  const planInput: PlanInput | null = useMemo(() => {
    if (!mood) return null;
    return { mood, energy, time, social, setting, budget, weather, withKids };
  }, [mood, energy, time, social, setting, budget, weather, withKids]);

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
      };
      setPlanLoading(true);
      try {
        let cards: PlanCard[] | null = null;
        const excludeIds = options.excludeIds;

        if (aiEnabled && aiApiKey && (await canUseAiPlanToday())) {
          // Pattern hint is computed fresh from on-device history only — never stored,
          // never sent anywhere except as part of this one plan request.
          const patternHint = await getPatternHint(input.mood);
          const avoidTitles = excludeIds
            ? lastPlan.filter((c) => excludeIds.has(c.activity.id)).map((c) => c.activity.t)
            : [];
          const aiActivities = await generateAiPlan(
            input,
            { apiKey: aiApiKey },
            nearbyRef.current?.placeName ?? null,
            patternHint,
            avoidTitles
          );
          if (aiActivities && aiActivities.length >= 2) {
            cards = aiActivities.map((activity) => ({ activity, index: null, mood: input.mood }));
            setPlanSource('ai');
            await recordAiPlanUse();
            refreshUsageCounts();
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
        return cards;
      } finally {
        setPlanLoading(false);
      }
    },
    [mood, energy, time, social, setting, budget, withKids, aiEnabled, aiApiKey, refreshUsageCounts, lastPlan]
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
        // Both are independent + individually wrapped; never throw here.
        const [w, n] = await Promise.all([
          fetchWeather(latitude, longitude),
          fetchNearby(latitude, longitude),
        ]);
        if (w) setWeather(w);
        if (n) setNearby(n);
        setLocationStatus('granted');
        // On-device only — nothing here ever leaves the phone. See lib/locationHistory.ts.
        if (mood) addLocationVisit(mood, n?.placeName ?? null).catch(() => {});

        // Live events are their own optional, bring-your-own-key layer.
        if (eventsApiKey && (await canUseEventsLookupToday())) {
          setEventsLoading(true);
          fetchNearbyEvents(latitude, longitude, eventsApiKey)
            .then((events) => {
              setNearbyEvents(events);
              if (events.length > 0) {
                recordEventsLookupUse().then(refreshUsageCounts);
              }
            })
            .catch(() => setNearbyEvents([]))
            .finally(() => setEventsLoading(false));
        }
      } catch {
        setLocationStatus('unavailable');
      }
    })();

    locationPromiseRef.current = p;
    p.finally(() => {
      if (locationPromiseRef.current === p) locationPromiseRef.current = null;
    });
    return p;
  }, [eventsApiKey, mood, refreshUsageCounts]);

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
      setSaved((prev) => {
        const exists = prev.some((s) => s.activity.id === activity.id);
        const next = exists
          ? prev.filter((s) => s.activity.id !== activity.id)
          : [...prev, { activity, mood: mood ?? activity.moods[0] }];
        persistSaved(next);
        return next;
      });
      // Saving is a clear, deliberate positive signal — unsaving isn't treated
      // as a negative one (people tidy up saved lists for lots of reasons
      // unrelated to "I didn't like this").
      const alreadySaved = savedRef.current.some((s) => s.activity.id === activity.id);
      if (!alreadySaved) {
        recordAccepted(activity.id, mood ?? activity.moods[0]).catch(() => {});
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
    setLastPlan([]);
    setPlanSource(null);
  }, []);

  const value: PlanContextValue = {
    mood,
    energy,
    time,
    social,
    setting,
    budget,
    withKids,
    setMood,
    setEnergy,
    setTime,
    setSocial,
    setSetting,
    setBudget,
    setWithKids,
    weather,
    nearby,
    locationStatus,
    requestLocation,
    nearbyEvents,
    eventsLoading,
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
    eventsApiKey,
    setEventsApiKey,
    clearLocationHistory,
    clearFeedback,
    resetFlow,
    aiPlansRemainingToday,
    eventsLookupsRemainingToday,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlan(): PlanContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlan must be used within a PlanProvider');
  return v;
}
