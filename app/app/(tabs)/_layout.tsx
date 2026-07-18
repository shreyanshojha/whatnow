import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { colors, font } from '../../lib/theme';

/** Persistent bottom tabs: Home (the mood → context → plan flow), Saved,
 * and About/settings — always reachable, never buried behind "Start over."
 * Home has its own nested stack (see home/_layout.tsx) so the tab bar
 * stays visible through the whole mood-picking flow. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700' as const },
        tabBarActiveTintColor: colors.coralDeep,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11.5, ...font.semibold },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧭</Text>,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved for later',
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💛</Text>,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About WhatNow',
          tabBarLabel: 'About',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>ℹ️</Text>,
        }}
      />
    </Tabs>
  );
}
