import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlanProvider } from '../context/PlanContext';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlanProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="context" options={{ title: 'A few details' }} />
          <Stack.Screen name="plan" options={{ title: 'Your plan' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved for later' }} />
          <Stack.Screen name="about" options={{ title: 'About WhatNow' }} />
        </Stack>
      </PlanProvider>
    </SafeAreaProvider>
  );
}
