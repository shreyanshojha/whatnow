/* ============================================================
   WhatNow — first-launch "welcome / sign in" screen flag.

   Mirrors lib/onboarding.ts's pattern exactly: a tiny persisted marker so
   app/welcome.tsx (see that file for why it exists — putting sign-in at
   the front of the experience instead of buried at the bottom of the
   About tab) only ever shows once per install, not once per app open.
   Signing in stays fully optional — this only controls whether the
   *screen* appears again, never whether someone is required to use it.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_VERSION = 'v1';
const KEY = `whatnow.seenWelcome.${WELCOME_VERSION}`;

export async function hasSeenWelcome(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === '1';
  } catch {
    // If we can't tell, default to showing it once — worse case is one
    // extra view of the screen, never a broken app.
    return false;
  }
}

export async function setSeenWelcome(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // ignore — worst case the screen shows again next launch
  }
}
