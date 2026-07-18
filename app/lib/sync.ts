/* ============================================================
   WhatNow — server sync for a signed-in account.

   Everything here is additive on top of the on-device-first design
   (AsyncStorage saved list + lib/feedback.ts log keep working exactly
   as before, signed in or not). When someone is signed in, these
   functions also mirror the same events to Supabase (see the
   saved_activities / feedback_events / plan_events tables), so their
   history follows them to another device and there's real server-side
   data to eventually personalize from.

   Every function here fails silently (catches its own errors) — sync
   is a bonus on top of a fully-working local experience, never a
   dependency of it. Nothing here should ever be able to break a plan,
   a save, or a feedback tap.
   ============================================================ */

import { Activity, MoodId } from '../data/activities';
import { PlanInput } from './plan';
import { supabase } from './supabase';

export type SyncFeedbackEvent = 'shown' | 'accepted' | 'rejected' | 'thumbsUp' | 'thumbsDown';

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function syncSaveActivity(activity: Activity, mood: MoodId): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from('saved_activities').upsert(
      {
        user_id: userId,
        activity_id: activity.id,
        activity_snapshot: activity,
        mood,
      },
      { onConflict: 'user_id,activity_id' }
    );
  } catch {
    // ignore — the on-device saved list is already the source of truth
  }
}

export async function syncUnsaveActivity(activityId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from('saved_activities').delete().eq('user_id', userId).eq('activity_id', activityId);
  } catch {
    // ignore
  }
}

/** Pulls this account's saved activities from the server — used once on
 * sign-in to merge into the on-device list (see PlanContext), so signing
 * in on a new device brings your saves with you. */
export async function fetchSyncedSavedActivities(): Promise<
  { activity: Activity; mood: MoodId }[] | null
> {
  const userId = await currentUserId();
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('saved_activities')
      .select('activity_snapshot, mood')
      .eq('user_id', userId);
    if (error || !data) return null;
    return data
      .filter((row) => row.activity_snapshot)
      .map((row) => ({ activity: row.activity_snapshot as Activity, mood: row.mood as MoodId }));
  } catch {
    return null;
  }
}

export async function syncFeedbackEvent(
  activityId: string,
  mood: MoodId,
  event: SyncFeedbackEvent
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from('feedback_events').insert({ user_id: userId, activity_id: activityId, mood, event });
  } catch {
    // ignore
  }
}

export async function syncPlanEvent(input: PlanInput, planSource: 'engine' | 'ai'): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await supabase.from('plan_events').insert({
      user_id: userId,
      mood: input.mood,
      energy: input.energy,
      time_minutes: input.time,
      social: input.social,
      setting: input.setting,
      budget: input.budget,
      with_kids: !!input.withKids,
      plan_source: planSource,
    });
  } catch {
    // ignore
  }
}
