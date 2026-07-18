/* ============================================================
   WhatNow — on-device location pattern memory.

   No central database, no server, no account, no per-install ID
   sent anywhere. Every time someone grants location, one small
   entry (mood + neighborhood name + timestamp) is appended to a
   rolling local log kept only in this device's own storage.
   Older entries are trimmed automatically so it never grows
   without bound.

   getPatternHint() turns that local log into a short, plain-
   English hint ("often near Prospect Park when feeling restless")
   used to nudge AI-composed plans (lib/aiPlan.ts) toward a
   person's real habits — but only once a real repeat shows up,
   never from a single visit. This hint is the only thing derived
   from location history that ever leaves the device, and only as
   part of a plan request, never stored anywhere else.

   A person can wipe this at any time from the About screen, or by
   deleting the app.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodId } from '../data/activities';

interface Visit {
  mood: MoodId;
  neighborhood: string;
  at: number;
}

const HISTORY_KEY = 'whatnow.locationHistory.v1';
const MAX_ENTRIES = 40;
/** Don't suggest a pattern from a single coincidence — require a real repeat. */
const MIN_REPEATS_FOR_HINT = 2;

async function loadVisits(): Promise<Visit[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is Visit =>
        !!v &&
        typeof v === 'object' &&
        typeof (v as Visit).mood === 'string' &&
        typeof (v as Visit).neighborhood === 'string' &&
        typeof (v as Visit).at === 'number'
    );
  } catch {
    return [];
  }
}

/** Record one visit locally. Best-effort — never blocks or throws. */
export async function addLocationVisit(mood: MoodId, neighborhood: string | null): Promise<void> {
  if (!neighborhood) return;
  try {
    const visits = await loadVisits();
    visits.push({ mood, neighborhood, at: Date.now() });
    // Keep only the most recent MAX_ENTRIES — simple rolling window, nothing unbounded.
    const trimmed = visits.slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore — pattern memory is a nice-to-have, never a hard dependency
  }
}

/**
 * A short, natural-language pattern hint for the current mood, e.g.
 * "They've often been near Prospect Park when feeling restless." Returns
 * null until a real repeat pattern exists — never invents one from a
 * single data point.
 */
export async function getPatternHint(mood: MoodId): Promise<string | null> {
  const visits = await loadVisits();
  const sameMood = visits.filter((v) => v.mood === mood);
  if (sameMood.length < MIN_REPEATS_FOR_HINT) return null;

  const counts = new Map<string, number>();
  for (const v of sameMood) {
    counts.set(v.neighborhood, (counts.get(v.neighborhood) ?? 0) + 1);
  }

  let topNeighborhood: string | null = null;
  let topCount = 0;
  for (const [neighborhood, count] of counts) {
    if (count > topCount) {
      topNeighborhood = neighborhood;
      topCount = count;
    }
  }

  if (!topNeighborhood || topCount < MIN_REPEATS_FOR_HINT) return null;
  return `They've often been near ${topNeighborhood} when feeling ${mood} — lean into that if it fits.`;
}

export async function clearLocationHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
