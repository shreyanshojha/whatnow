/* ============================================================
   WhatNow — AI planning settings, stored on-device only.

   The API key goes in expo-secure-store (OS keychain / keystore)
   since it's an actual credential. The on/off toggle is a plain
   boolean and lives in AsyncStorage alongside the rest of the
   app's small bits of local state. Nothing here ever leaves the
   device except the key itself being sent directly to the
   provider's API when a plan is requested with AI turned on.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const AI_ENABLED_KEY = 'whatnow.ai.enabled.v1';
const AI_API_KEY_KEY = 'whatnow_ai_api_key_v1';
const EVENTS_API_KEY_KEY = 'whatnow_ticketmaster_api_key_v1';

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
    const value = await SecureStore.getItemAsync(AI_API_KEY_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveAiApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await SecureStore.setItemAsync(AI_API_KEY_KEY, key.trim());
    } else {
      await SecureStore.deleteItemAsync(AI_API_KEY_KEY);
    }
  } catch {
    // ignore — in-memory state still holds for this session
  }
}

export async function loadEventsApiKey(): Promise<string> {
  try {
    const value = await SecureStore.getItemAsync(EVENTS_API_KEY_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveEventsApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await SecureStore.setItemAsync(EVENTS_API_KEY_KEY, key.trim());
    } else {
      await SecureStore.deleteItemAsync(EVENTS_API_KEY_KEY);
    }
  } catch {
    // ignore — in-memory state still holds for this session
  }
}
