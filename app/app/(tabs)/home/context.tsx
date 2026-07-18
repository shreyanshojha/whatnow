import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { Segmented } from '../../../components/Segmented';
import { usePlan } from '../../../context/PlanContext';
import { MOODS } from '../../../data/activities';
import { colors, font, fontDisplay, radius, shadow } from '../../../lib/theme';
import { weatherIconName, weatherNote } from '../../../lib/weather';

export default function ContextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    mood,
    energy,
    setEnergy,
    time,
    setTime,
    social,
    setSocial,
    setting,
    setSetting,
    budget,
    setBudget,
    weather,
    nearby,
    locationStatus,
    requestLocation,
    makePlan,
  } = usePlan();

  const moodMeta = MOODS.find((m) => m.id === mood);

  const onMakePlan = () => {
    // Fire the plan request and navigate immediately — the Plan screen
    // shows its own loading state while this resolves (instant for the
    // deterministic engine, a couple seconds if AI planning is on).
    makePlan().catch(() => {});
    router.push('/home/plan');
  };

  const locationBody = (() => {
    if (weather) return weatherNote(weather);
    switch (locationStatus) {
      case 'loading':
        return 'Checking your local weather…';
      case 'denied':
        return 'No location — totally fine, WhatNow works great without it.';
      case 'unavailable':
        return "Couldn't reach location — carrying on without it.";
      default:
        return 'Optional: use your location to weather-tune the plan and name a real spot nearby.';
    }
  })();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {moodMeta ? (
          <View
            style={[
              styles.moodPill,
              { backgroundColor: moodMeta.tint, borderColor: moodMeta.color },
            ]}
          >
            <Icon name={moodMeta.id} size={16} color={moodMeta.color} strokeWidth={1.9} />
            <Text style={[styles.moodPillText, { color: moodMeta.color }]}>
              Feeling {moodMeta.word}
            </Text>
          </View>
        ) : null}

        <Text style={styles.h1}>A few quick details</Text>
        <Text style={styles.sub}>
          Defaults are set — tweak anything, or just tap Make my plan.
        </Text>

        <Segmented
          label="Energy"
          value={energy}
          onChange={setEnergy}
          options={[
            { val: 'low', label: 'Low', ic: 'energy-low' },
            { val: 'medium', label: 'Medium', ic: 'energy-medium' },
            { val: 'high', label: 'High', ic: 'energy-high' },
          ]}
        />
        <Segmented
          label="Time available"
          value={time}
          onChange={setTime}
          options={[
            { val: 15, label: '15 min', ic: 'clock', aria: '15 minutes' },
            { val: 60, label: '~1 hour', ic: 'clock', aria: 'About one hour' },
            { val: 240, label: 'Half-day', ic: 'clock', aria: 'Half a day' },
          ]}
        />
        <Segmented
          label="Solo or social"
          value={social}
          onChange={setSocial}
          options={[
            { val: 'solo', label: 'Solo', ic: 'social-solo' },
            { val: 'someone', label: 'Someone', ic: 'social-someone', aria: 'With someone' },
            { val: 'group', label: 'Group', ic: 'social-group' },
          ]}
        />
        <Segmented
          label="Indoor or outdoor"
          value={setting}
          onChange={setSetting}
          options={[
            { val: 'indoor', label: 'Indoor', ic: 'indoor' },
            { val: 'outdoor', label: 'Outdoor', ic: 'outdoor' },
            { val: 'either', label: 'Either', ic: 'either' },
          ]}
        />
        <Segmented
          label="Budget"
          value={budget}
          onChange={setBudget}
          options={[
            { val: 'free', label: "Won't spend", ic: 'budget-free' },
            { val: 'cheap', label: 'A little', ic: 'budget-cheap' },
            { val: 'treat', label: 'Treat myself', ic: 'budget-treat' },
          ]}
        />

        <View style={styles.weatherCard}>
          <View style={styles.weatherRow}>
            {weather ? (
              <Icon name={weatherIconName(weather)} size={17} color={colors.inkSoft} strokeWidth={1.7} />
            ) : null}
            <Text style={styles.weatherBody}>{locationBody}</Text>
          </View>
          {nearby?.placeName ? (
            <View style={[styles.weatherRow, { marginTop: 8 }]}>
              <Icon name="pin" size={14} color={colors.ink} strokeWidth={1.8} />
              <Text style={styles.weatherPlace}>{nearby.placeName}</Text>
            </View>
          ) : null}
          {!weather && locationStatus !== 'denied' ? (
            <Pressable
              onPress={requestLocation}
              disabled={locationStatus === 'loading'}
              accessibilityRole="button"
              style={({ pressed }) => [styles.weatherBtn, pressed && { opacity: 0.7 }]}
            >
              {locationStatus === 'loading' ? (
                <ActivityIndicator color={colors.coralDeep} size="small" />
              ) : (
                <Text style={styles.weatherBtnText}>Use my location</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          onPress={onMakePlan}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Make my plan  →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  moodPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  moodPillEmo: { fontSize: 15 },
  moodPillText: {
    fontSize: 13.5,
    ...font.semibold,
    textTransform: 'capitalize',
  },
  h1: {
    fontSize: 26,
    ...fontDisplay.bold,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: { fontSize: 15, color: colors.inkSoft, lineHeight: 21, marginBottom: 22 },
  weatherCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.soft,
  },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherBody: { flex: 1, fontSize: 14.5, color: colors.inkSoft, lineHeight: 21 },
  weatherPlace: { fontSize: 13.5, color: colors.ink, ...font.medium },
  weatherBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.bg2,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: 'center',
  },
  weatherBtnText: { fontSize: 14.5, ...font.semibold, color: colors.coralDeep },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.soft,
  },
  ctaPressed: { backgroundColor: colors.coralDeep },
  ctaText: { color: colors.white, fontSize: 17, ...font.bold },
});
