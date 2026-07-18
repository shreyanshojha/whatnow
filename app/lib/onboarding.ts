/* ============================================================
   WhatNow — first-launch onboarding flag.

   A tiny persisted marker so the carousel (see app/onboarding.tsx)
   only ever shows once per install, not once per app open. Bumping
   ONBOARDING_VERSION re-shows it after a meaningful change to the
   flow (e.g. adding the accounts step) without affecting anyone who
   already saw the current version.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_VERSION = 'v2-accounts';
const KEY = `whatnow.onboarded.${ONBOARDING_VERSION}`;

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === '1';
  } catch {
    // If we can't tell, default to showing it once — worse case is one
    // extra view of the carousel, never a broken app.
    return false;
  }
}

export async function setCompletedOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // ignore — worst case the carousel shows again next launch
  }
}
