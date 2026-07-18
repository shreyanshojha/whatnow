import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { PlanProvider } from '../context/PlanContext';
import { hasCompletedOnboarding } from '../lib/onboarding';

// Keep the splash screen up until the custom typeface is ready — Fraunces
// and Inter are core to WhatNow's identity now, not a nice-to-have, so we
// never want a flash of the system font before they load.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,
  });

  // Whether the first-launch carousel (app/onboarding.tsx) still needs to
  // show. Checked once per app start — genuinely unknown until we've read
  // the flag, so `null` (not yet known) is a distinct state from `false`.
  const [needsOnboarding, setNeedsOnboarding] = React.useState<boolean | null>(null);
  useEffect(() => {
    hasCompletedOnboarding().then((done) => setNeedsOnboarding(!done));
  }, []);

  const ready = (fontsLoaded || fontError) && needsOnboarding !== null;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Fall back gracefully to system fonts rather than a blank screen if the
  // custom font files ever fail to load — same "never show a broken app"
  // philosophy used everywhere else in WhatNow.
  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlanProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            {needsOnboarding ? (
              <>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
              </>
            ) : (
              <>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
              </>
            )}
          </Stack>
        </PlanProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
