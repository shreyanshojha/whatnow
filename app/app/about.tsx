import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlan } from '../context/PlanContext';
import { ACTIVITIES, MOODS } from '../data/activities';
import { colors, font, radius } from '../lib/theme';
import { MAX_AI_PLANS_PER_DAY, MAX_EVENTS_LOOKUPS_PER_DAY } from '../lib/usageLimits';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const {
    aiEnabled,
    setAiEnabled,
    aiApiKey,
    setAiApiKey,
    eventsApiKey,
    setEventsApiKey,
    clearLocationHistory,
    clearFeedback,
    aiPlansRemainingToday,
    eventsLookupsRemainingToday,
  } = usePlan();
  const [keyDraft, setKeyDraft] = React.useState(aiApiKey);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [eventsKeyDraft, setEventsKeyDraft] = React.useState(eventsApiKey);
  const [eventsSavedFlash, setEventsSavedFlash] = React.useState(false);
  const [historyCleared, setHistoryCleared] = React.useState(false);
  const [learningCleared, setLearningCleared] = React.useState(false);

  // Keep drafts in sync when the stored keys load (or after we save them).
  React.useEffect(() => {
    setKeyDraft(aiApiKey);
  }, [aiApiKey]);
  React.useEffect(() => {
    setEventsKeyDraft(eventsApiKey);
  }, [eventsApiKey]);

  const onSaveKey = () => {
    setAiApiKey(keyDraft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const onSaveEventsKey = () => {
    setEventsApiKey(eventsKeyDraft);
    setEventsSavedFlash(true);
    setTimeout(() => setEventsSavedFlash(false), 1800);
  };

  const onClearHistory = () => {
    Alert.alert(
      'Clear location history?',
      "This forgets the neighborhood patterns WhatNow has picked up on this device. It doesn't affect your saved activities.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearLocationHistory();
            setHistoryCleared(true);
            setTimeout(() => setHistoryCleared(false), 1800);
          },
        },
      ]
    );
  };

  const onClearFeedback = () => {
    Alert.alert(
      'Clear learning history?',
      "This forgets which activities WhatNow has noticed you tend to save or reshuffle away, so recommendations go back to neutral. It doesn't affect your saved list itself.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearFeedback();
            setLearningCleared(true);
            setTimeout(() => setLearningCleared(false), 1800);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.brand}>
        What<Text style={{ color: colors.coral }}>Now</Text>
      </Text>
      <Text style={styles.tagline}>Plans around your mood, not your calendar.</Text>

      <Text style={styles.p}>
        Most planners start with your calendar. WhatNow starts with how you actually feel.
        Tell it your mood and a few constraints, and it builds a small, tailored plan of{' '}
        {ACTIVITIES.length} hand-written activities — each with a genuine reason it might
        help right now.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardH}>How it works</Text>
        <Step n="1" t="Pick a mood" d={`One of ${MOODS.length} feelings, from restless to content.`} />
        <Step n="2" t="Set the scene" d="Energy, time, solo or social, indoor/outdoor, budget." />
        <Step n="3" t="Get your plan" d="2–5 ideas, each with a why-this-helps. Reshuffle or save any." />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardH}>Privacy</Text>
        <Text style={styles.cardP}>
          There's no account, no login, and nothing about you is ever sent to a WhatNow
          server — there isn't one. Location is entirely optional. Each time you grant it,
          WhatNow briefly checks the live weather (Open-Meteo) and nearby real places
          (OpenStreetMap) to tailor that one plan — those coordinates go only to those
          services, for that one lookup, and aren't kept afterward. Separately, WhatNow
          keeps a small neighborhood-level pattern memory (never your exact GPS position) —
          entirely on this device, never uploaded anywhere — so recommendations can notice
          real patterns over time. WhatNow also quietly notices which activities you save
          or reshuffle away, on this device only, so future plans lean toward what you
          actually pick. You can wipe either memory below any time, and deleting the app
          removes both for good. Your saved list also stays on this device. Deny location
          and everything still works, just without the location-aware tuning.
        </Text>
        <Text style={styles.keySavedText} onPress={onClearHistory}>
          {historyCleared ? 'Cleared ✓' : 'Clear location history'}
        </Text>
        <Text style={styles.keySavedText} onPress={onClearFeedback}>
          {learningCleared ? 'Cleared ✓' : 'Clear learning history'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.aiHeaderRow}>
          <Text style={styles.cardH}>AI planning (optional)</Text>
          <Switch
            value={aiEnabled}
            onValueChange={setAiEnabled}
            trackColor={{ false: colors.line, true: colors.coral }}
            thumbColor={colors.white}
          />
        </View>
        <Text style={styles.cardP}>
          When it's on, WhatNow asks an AI to compose a fresh plan for this exact moment
          instead of picking from the built-in list. Bring your own API key — it's stored
          only on this device (in the OS keychain) and sent directly from your phone to the
          provider, never through a WhatNow server. If it's off, the key is missing, or a
          request fails for any reason, WhatNow falls back to its built-in matching engine
          instantly — you'll never see a broken plan. To keep any one day's usage
          reasonable, WhatNow caps itself at {MAX_AI_PLANS_PER_DAY} AI-composed plans per
          day (resets at midnight) — after that, it simply uses the built-in engine until
          tomorrow.
        </Text>
        <TextInput
          value={keyDraft}
          onChangeText={setKeyDraft}
          placeholder="Paste your Anthropic API key"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.keyInput}
        />
        <View style={styles.keyFooterRow}>
          <Text style={styles.keySavedText} onPress={onSaveKey}>
            {savedFlash ? 'Saved ✓' : 'Save key'}
          </Text>
          {aiEnabled && aiApiKey ? (
            <Text style={styles.usageText}>
              {aiPlansRemainingToday} of {MAX_AI_PLANS_PER_DAY} left today
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardH}>Live nearby events (optional)</Text>
        <Text style={styles.cardP}>
          Add a free Ticketmaster Discovery API key to see real concerts, shows, and games
          happening near you in the "Nearby right now" section of your plan. Same
          bring-your-own-key setup: stored on this device only, sent straight to
          Ticketmaster. Without a key, you'll still see real nearby venues (parks, cafes,
          and the like) from OpenStreetMap — just not ticketed events. Capped at{' '}
          {MAX_EVENTS_LOOKUPS_PER_DAY} lookups a day, resetting at midnight.
        </Text>
        <TextInput
          value={eventsKeyDraft}
          onChangeText={setEventsKeyDraft}
          placeholder="Paste your Ticketmaster API key"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.keyInput}
        />
        {eventsApiKey ? (
          <Text style={styles.usageText}>
            {eventsLookupsRemainingToday} of {MAX_EVENTS_LOOKUPS_PER_DAY} left today
          </Text>
        ) : null}
        <Text style={styles.keySavedText} onPress={onSaveEventsKey}>
          {eventsSavedFlash ? 'Saved ✓' : 'Save key'}
        </Text>
      </View>

      <Text style={styles.credit}>
        A{' '}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://shreyanshojha.app').catch(() => {})}
        >
          Shreyansh Ojha
        </Text>{' '}
        product. Weather by Open-Meteo, places by OpenStreetMap — both free, no key.
      </Text>
      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepT}>{t}</Text>
        <Text style={styles.stepD}>{d}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  brand: { fontSize: 30, fontWeight: font.bold, color: colors.ink, letterSpacing: -0.6 },
  tagline: { fontSize: 15, color: colors.amber, fontWeight: font.semibold, marginTop: 4, marginBottom: 16 },
  p: { fontSize: 15.5, color: colors.inkSoft, lineHeight: 23, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardH: { fontSize: 17, fontWeight: font.bold, color: colors.ink, marginBottom: 12 },
  cardP: { fontSize: 14.5, color: colors.inkSoft, lineHeight: 21 },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  keyInput: {
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: colors.ink,
  },
  keySavedText: {
    marginTop: 10,
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.coralDeep,
    paddingVertical: 4,
  },
  keyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    marginTop: 10,
    fontSize: 12.5,
    color: colors.inkFaint,
  },
  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, fontWeight: font.bold, color: colors.coralDeep },
  stepT: { fontSize: 15, fontWeight: font.semibold, color: colors.ink },
  stepD: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 19, marginTop: 1 },
  credit: { fontSize: 13.5, color: colors.inkFaint, lineHeight: 20, marginTop: 4 },
  link: { color: colors.coralDeep, fontWeight: font.semibold },
  version: { fontSize: 12.5, color: colors.inkFaint, marginTop: 12 },
});
