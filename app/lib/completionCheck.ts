/* ============================================================
   WhatNow — lightweight completion check-in.

   A first, deliberately small step toward tracking whether a
   suggestion actually helped, not just whether it was shown or
   saved. The in-app card (shown the next time the mood screen is
   open, 3 hours to 5 days after a save — see getPendingCompletionCheck
   below) covers anyone who naturally reopens the app in that window.

   That alone misses someone who saves something and never opens
   the app again on their own — so a local, on-device scheduled
   notification (no server, no push infrastructure) is fired a few
   hours after each save as a nudge back in. This is genuinely just
   a local alarm, not a remote push: the content and timing are
   both fully known at save time, so there's nothing a server would
   add — which is why this doesn't need Expo push tokens, APNs/FCM
   credentials, or a server dispatch job to close the gap.

   The answer, whichever way someone gets to it, is logged as an
   explicit thumbs-up/down (see lib/feedback.ts) — the same underlying
   signal, just captured later and with real-world context instead
   of an in-the-moment reaction.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { SavedEntry } from '../context/PlanContext';

const ASKED_KEY = 'whatnow.completionAsked.v1';
const NOTIF_IDS_KEY = 'whatnow.completionNotifIds.v1';
// Shown once, ever, right before the very first OS permission prompt — so
// that prompt (which the OS only lets us show once per install) never
// appears with zero context. If someone declines the primer, we just skip
// scheduling for now rather than force the OS dialog on them.
const PRIMER_SHOWN_KEY = 'whatnow.notifPrimerShown.v1';

// A save needs to be at least this old before we ask — otherwise "did this
// happen?" would be asked before there's been any real chance to do it.
const MIN_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours
// And not so old the question feels random and disconnected from anything.
const MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

// How long after a save the local nudge notification fires — comfortably
// past MIN_AGE_MS so it's never asking too early, but same-day so it still
// feels connected to the save rather than random.
const NOTIFY_DELAY_SECONDS = 5 * 60 * 60; // 5 hours

async function readAsked(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(ASKED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function writeAsked(ids: Set<string>): Promise<void> {
  try {
    // Keep this bounded — only the most recent 200 ids matter for
    // "have we already asked," so this never grows without limit.
    await AsyncStorage.setItem(ASKED_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // ignore — worst case the same check-in could resurface once more
  }
}

/** Finds the single most recently saved activity that's old enough to
 * plausibly have happened, not so old it's stale, and hasn't already been
 * asked about — or null if nothing qualifies right now. */
export async function getPendingCompletionCheck(saved: SavedEntry[]): Promise<SavedEntry | null> {
  const asked = await readAsked();
  const now = Date.now();
  const eligible = saved
    .filter((s) => typeof s.savedAt === 'number')
    .filter((s) => !asked.has(s.activity.id))
    .filter((s) => {
      const age = now - (s.savedAt as number);
      return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
    })
    .sort((a, b) => (b.savedAt as number) - (a.savedAt as number));
  return eligible[0] ?? null;
}

/** Marks an activity as asked-about so the same check-in never resurfaces —
 * call this on any response, including "skip," since the point is to ask
 * once per saved activity, not to nag. */
export async function dismissCompletionCheck(activityId: string): Promise<void> {
  const asked = await readAsked();
  asked.add(activityId);
  await writeAsked(asked);
}

async function readNotifIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeNotifIds(ids: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore — worst case a stale notification fires or fails to cancel
  }
}

/** Shows a one-time, plain-language explainer immediately before the OS
 * permission dialog's first-ever appearance, so that dialog (which iOS/
 * Android only let an app show once) never appears out of nowhere. Only
 * ever shown once regardless of the answer — declining just means this
 * particular save doesn't get a nudge scheduled. */
async function showPrimerIfNeeded(): Promise<boolean> {
  const alreadyShown = await AsyncStorage.getItem(PRIMER_SHOWN_KEY);
  if (alreadyShown) return true;
  await AsyncStorage.setItem(PRIMER_SHOWN_KEY, '1');
  return new Promise<boolean>((resolve) => {
    try {
      Alert.alert(
        'One quick nudge?',
        'WhatNow can send a single reminder a few hours after you save something, just asking whether it actually happened. Nothing else — and you can turn it off anytime from your phone\'s notification settings.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Sounds good', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    } catch {
      resolve(false);
    }
  });
}

/** Requests notification permission if it hasn't been decided yet. Never
 * throws, never blocks — if the person denies or this fails for any
 * reason, the app just falls back to the in-app-only check-in. Safe to
 * call as often as needed; only actually prompts once per OS rules. */
async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false; // no local notifications on web
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const okToAsk = await showPrimerIfNeeded();
    if (!okToAsk) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return !!requested.granted;
  } catch {
    return false;
  }
}

/** Schedules the one-time local nudge for a freshly saved activity. A pure
 * courtesy on top of the in-app card — if permission isn't granted, or
 * scheduling fails for any reason, saving still works exactly as before.
 *
 * Self-contained: always cancels any notification already pending for this
 * same activity id before scheduling a new one. A rapid save→unsave→save on
 * the same card calls this and cancelCompletionNotification back-to-back
 * without any external ordering guarantee — without this, a stale
 * "did this happen" notification could survive an unsave and fire ~5 hours
 * later for something no longer even saved. */
export async function scheduleCompletionNotification(entry: SavedEntry): Promise<void> {
  try {
    const granted = await ensurePermission();
    if (!granted) return;

    const ids = await readNotifIds();
    const existingId = ids[entry.activity.id];
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quick check-in',
        body: `Last time, you saved "${entry.activity.t}" — did it end up happening?`,
        data: { activityId: entry.activity.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: NOTIFY_DELAY_SECONDS,
      },
    });

    ids[entry.activity.id] = id;
    await writeNotifIds(ids);
  } catch {
    // ignore — the in-app card (getPendingCompletionCheck) still covers this
    // activity on the next natural app open regardless
  }
}

/** Cancels a not-yet-fired nudge — call when an activity is unsaved, so
 * someone who changes their mind doesn't get asked about something they
 * decided against. Safe to call even if nothing was ever scheduled. */
export async function cancelCompletionNotification(activityId: string): Promise<void> {
  try {
    const ids = await readNotifIds();
    const id = ids[activityId];
    if (!id) return;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    delete ids[activityId];
    await writeNotifIds(ids);
  } catch {
    // ignore — worst case a stale notification still fires once
  }
}
