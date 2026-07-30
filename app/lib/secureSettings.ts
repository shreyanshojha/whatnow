/* ============================================================
   WhatNow — AI planning settings, stored on-device only.

   The API key goes in expo-secure-store (OS keychain / keystore)
   since it's an actual credential — on native. On web, expo-secure-
   store is an empty stub (see node_modules/expo-secure-store/src/
   ExpoSecureStore.web.ts — it exports {}, so every SecureStore call
   silently throws and the surrounding try/catch swallows it). That
   meant a saved key only ever lived in React state for the current
   tab: it looked saved (the UI updated fine), kept working for the
   rest of that browser session, and then silently vanished on the
   very next page load — with zero error, zero indication anything
   was wrong, just AI planning quietly going generic again. Browsers
   have no OS keychain equivalent, so localStorage (via AsyncStorage,
   which already works correctly on web) is the realistic option —
   same trust boundary as any other client-side web app value, and
   still never sent anywhere but straight to the provider's API.
   The on/off toggle is a plain boolean and always lived in
   AsyncStorage already. Nothing here ever leaves the device except
   the key itself being sent directly to the provider's API when a
   plan is requested with AI turned on.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AI_ENABLED_KEY = 'whatnow.ai.enabled.v1';
const AI_API_KEY_KEY = 'whatnow_ai_api_key_v1';
const EVENTS_API_KEY_KEY = 'whatnow_ticketmaster_api_key_v1';
const GOOGLE_PLACES_API_KEY_KEY = 'whatnow_google_places_api_key_v1';

// Thin wrapper so every load/save function below can stay one-liners
// regardless of platform, instead of repeating this branch four times.
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

export async function loadAiEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AI_ENABLED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function saveAiEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AI_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore — in-memory state still holds for this session
  }
}

export async function loadAiApiKey(): Promise<string> {
  try {
    const value = await secureStorage.getItem(AI_API_KEY_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveAiApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await secureStorage.setItem(AI_API_KEY_KEY, key.trim());
    } else {
      await secureStorage.removeItem(AI_API_KEY_KEY);
    }
  } catch {
    // ignore — in-memory state still holds for this session
  }
}

export async function loadEventsApiKey(): Promise<string> {
  try {
    const value = await secureStorage.getItem(EVENTS_API_KEY_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveEventsApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await secureStorage.setItem(EVENTS_API_KEY_KEY, key.trim());
    } else {
      await secureStorage.removeItem(EVENTS_API_KEY_KEY);
    }
  } catch {
    // ignore — in-memory state still holds for this session
  }
}

/** Google Places API key — an optional, paid upgrade over the free
 * OpenStreetMap venue data in lib/places.ts (better names, more complete
 * coverage). Kept as its own key/setting since it's billed through Google
 * Cloud, not Ticketmaster's account. (Yelp was considered instead but
 * dropped for cost reasons; Google Places has a usable free monthly credit.) */
export async function loadGooglePlacesApiKey(): Promise<string> {
  try {
    const value = await secureStorage.getItem(GOOGLE_PLACES_API_KEY_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveGooglePlacesApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await secureStorage.setItem(GOOGLE_PLACES_API_KEY_KEY, key.trim());
    } else {
      await secureStorage.removeItem(GOOGLE_PLACES_API_KEY_KEY);
    }
  } catch {
    // ignore — in-memory state still holds for this session
  }
}
