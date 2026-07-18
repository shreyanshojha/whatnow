import { Stack } from 'expo-router';
import React from 'react';
import { font, colors } from '../../../lib/theme';

/** The mood → context → plan flow, nested inside the Home tab so the tab
 * bar (Home/Saved/About) stays visible the whole way through — Saved and
 * About are always one tap away, never a dead end mid-plan. */
export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { ...font.bold, fontSize: 17 },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="context" options={{ title: 'A few details' }} />
      <Stack.Screen name="plan" options={{ title: 'Your plan' }} />
    </Stack>
  );
}
