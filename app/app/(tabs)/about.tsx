import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountCard } from '../../components/AccountCard';
import { Icon } from '../../components/Icon';
import { usePlan } from '../../context/PlanContext';
import { ACTIVITIES, MOODS } from '../../data/activities';
import { SHOW_BYOK_AI_UI } from '../../lib/betaConfig';
import { getPersonalStats, PersonalStats } from '../../lib/feedback';
import { colors, font, fontDisplay, radius } from '../../lib/theme';
import { MAX_AI_PLANS_PER_DAY, MAX_EVENTS_LOOKUPS_PER_DAY } from '../../lib/usageLimits';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const {
    aiEnabled,
    setAiEnabled,
    aiApiKey,
    setAiApiKey,
    sharedAiAvailable,
    eventsApiKey,
    setEventsApiKey,
    googlePlacesApiKey,
    setGooglePlacesApiKey,
    clearLocationHistory,
    clearFeedback,
    aiPlansRemainingToday,
    eventsLookupsRemainingToday,
  } = usePlan();
  const [keyDraft, setKeyDraft] = React.useState(aiApiKey);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [eventsKeyDraft, setEventsKeyDraft] = React.useState(eventsApiKey);
  const [eventsSavedFlash, setEventsSavedFlash] = React.useState(false);
  const [googlePlacesKeyDraft, setGooglePlacesKeyDraft] = React.useState(googlePlacesApiKey);
  const [googlePlacesSavedFlash, setGooglePlacesSavedFlash] = React.useState(false);
  const [historyCleared, setHistoryCleared] = React.useState(false);
  const [learningCleared, setLearningCleared] = React.useState(false);

  // Keep drafts in sync when the stored keys load (or after we save them).
  React.useEffect(() => {
    setKeyDraft(aiApiKey);
  }, [aiApiKey]);
  React.useEffect(() => {
    setEventsKeyDraft(eventsApiKey);
  }, [eventsApiKey]);
  React.useEffect(() => {
    setGooglePlacesKeyDraft(googlePlacesApiKey);
  }, [googlePlacesApiKey]);

  const onSaveKey = () => {
    setAiApiKey(keyDraft);
    // Saving a real key is a clear enough signal of intent — don't also make
    // someone hunt for a separate switch. Pasting a key turns AI planning on;
    // clearing the field back out turns it back off.
    setAiEnabled(!!keyDraft.trim());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const onSaveEventsKey = () => {
    setEventsApiKey(eventsKeyDraft);
    setEventsSavedFlash(true);
    setTimeout(() => setEventsSavedFlash(false), 1800);
  };

  const onSaveGooglePlacesKey = () => {
    setGooglePlacesApiKey(googlePlacesKeyDraft);
    setGooglePlacesSavedFlash(true);
    setTimeout(() => setGooglePlacesSavedFlash(false), 1800);
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
      "This forgets which activities you tend to save or skip, resetting recommendations to neutral. Your saved list is unaffected.",
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
        Most planners start with your calendar. WhatNow starts with how you feel. Tell it
        your mood and a few constraints, and get a tailored plan from {ACTIVITIES.length}{' '}
        hand-written activities — each with a real reason it might help.
      </Text>

      <AccountCard />

      <View style={styles.card}>
        {SHOW_BYOK_AI_UI ? (
          <>
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
              {sharedAiAvailable
                ? 'Already working automatically while you\'re signed in, with a fair shared daily ' +
                  'cap. '
                : ''}
              Want your own key instead? Paste an Anthropic API key below — it stays on this
              device and is never sent through our servers. Off, missing, or failed, and WhatNow
              just falls back to its built-in matching, no broken plans.{'\n\n'}
              Capped at {MAX_AI_PLANS_PER_DAY} plans/day. Also powers "Look online nearby" on the
              plan screen.
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
              <Pressable
                onPress={onSaveKey}
                accessibilityRole="button"
                accessibilityLabel="Save AI API key"
                hitSlop={6}
                style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
              >
                <FlashLabel flashed={savedFlash} flashedText="Saved" idleText="Save key" />
              </Pressable>
              {aiEnabled && aiApiKey ? (
                <Text style={styles.usageText}>
                  {aiPlansRemainingToday} of {MAX_AI_PLANS_PER_DAY} left today
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <View style={styles.aiHeaderRow}>
              <Text style={styles.cardH}>AI planning</Text>
              <Icon name="inspired" size={18} color={colors.plum} strokeWidth={1.8} />
            </View>
            <Text style={styles.cardP}>
              {sharedAiAvailable
                ? "Working automatically for you during the beta — no setup needed. Plans are " +
                  "composed by a shared key with a fair daily cap per person; if you ever hit it, " +
                  "WhatNow just uses its built-in matching engine until tomorrow, same as always. " +
                  "The same access also powers \"Look online nearby\" on your plan screen."
                : "Sign in to get AI-composed plans automatically during the beta — no key or " +
                  "setup required. Until then, WhatNow uses its built-in matching engine."}
            </Text>
          </>
        )}
      </View>

      <YourPatterns />

      <View style={styles.card}>
        <Text style={styles.cardH}>How it works</Text>
        <Step n="1" t="Pick a mood" d={`One of ${MOODS.length} feelings, from restless to content.`} />
        <Step n="2" t="Set the scene" d="Energy, time, solo or social, indoor/outdoor, budget." />
        <Step n="3" t="Get your plan" d="2–5 ideas, each with a why-this-helps. Reshuffle or save any." />
      </View>

      <View style={styles.card}>
        <View style={styles.acctHeaderRow}>
          <Icon name="shield" size={18} color={colors.ink} strokeWidth={1.7} />
          <Text style={styles.cardH}>Privacy</Text>
        </View>
        <Text style={styles.cardP}>
          Signing in is optional — everything below works fully on this device without an
          account.{'\n\n'}
          <Text style={font.semibold}>If you sign in: </Text>
          your saved activities, feedback, and plan history sync to WhatNow's servers,
          readable only by your account — just to sharpen your plans and follow you across
          devices. Never sold, never shared with advertisers. Delete your account above to
          erase it all.{'\n\n'}
          <Text style={font.semibold}>Location (optional): </Text>
          each time you grant it, WhatNow briefly checks live weather (Open-Meteo) and nearby
          places (OpenStreetMap, or Google Places if you've added a key) for that one plan
          only — sent only to those services.{'\n\n'}
          <Text style={font.semibold}>On-device memory: </Text>
          WhatNow also keeps a neighborhood-level pattern memory (never exact GPS) locally,
          never uploaded. Wipe either memory below anytime; deleting the app removes both for
          good.{'\n\n'}
          Full details in PRIVACY.md.
        </Text>
        <Pressable
          onPress={onClearHistory}
          accessibilityRole="button"
          accessibilityLabel="Clear location history"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={historyCleared} flashedText="Cleared" idleText="Clear location history" />
        </Pressable>
        <Pressable
          onPress={onClearFeedback}
          accessibilityRole="button"
          accessibilityLabel="Clear learning history"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={learningCleared} flashedText="Cleared" idleText="Clear learning history" />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardH}>Live events & better venues (optional)</Text>
        <Text style={styles.cardP}>
          Two separate, independent upgrades — add either, both, or neither.{'\n\n'}
          <Text style={font.semibold}>Ticketmaster: </Text>
          real concerts, shows, and games show up in "Nearby right now."{'\n\n'}
          <Text style={font.semibold}>Google Places: </Text>
          sharper, more complete nearby-spot names than the free OpenStreetMap data WhatNow
          uses by default.{'\n\n'}
          Both keys stay on this device, sent straight to their own provider. Ticketmaster
          lookups are capped at {MAX_EVENTS_LOOKUPS_PER_DAY}/day.
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
        <Pressable
          onPress={onSaveEventsKey}
          accessibilityRole="button"
          accessibilityLabel="Save Ticketmaster API key"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={eventsSavedFlash} flashedText="Saved" idleText="Save Ticketmaster key" />
        </Pressable>

        <TextInput
          value={googlePlacesKeyDraft}
          onChangeText={setGooglePlacesKeyDraft}
          placeholder="Paste your Google Places API key"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.keyInput, { marginTop: 12 }]}
        />
        <Pressable
          onPress={onSaveGooglePlacesKey}
          accessibilityRole="button"
          accessibilityLabel="Save Google Places API key"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={googlePlacesSavedFlash} flashedText="Saved" idleText="Save Google Places key" />
        </Pressable>
        {eventsApiKey ? (
          <Text style={styles.usageText}>
            {eventsLookupsRemainingToday} of {MAX_EVENTS_LOOKUPS_PER_DAY} left today
          </Text>
        ) : null}
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

/** A small, upbeat mirror of someone's own on-device history — "your
 * patterns," not admin analytics. Built entirely from data that already
 * exists in lib/feedback.ts's local log; nothing new is collected to show
 * it, and it disappears cleanly for anyone with no history yet. */
function YourPatterns() {
  const [stats, setStats] = React.useState<PersonalStats | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getPersonalStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats || stats.totalPlans === 0) return null;

  const topMoodMeta = stats.topMood ? MOODS.find((m) => m.id === stats.topMood) : null;

  return (
    <View style={styles.card}>
      <View style={styles.acctHeaderRow}>
        <Icon name="chart" size={19} color={colors.ink} strokeWidth={1.7} />
        <Text style={styles.cardH}>Your patterns</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.totalPlans}</Text>
          <Text style={styles.statLabel}>{stats.totalPlans === 1 ? 'plan made' : 'plans made'}</Text>
        </View>
        {stats.streakDays >= 2 ? (
          <View style={styles.statBox}>
            <View style={styles.statNumRow}>
              <Icon name="streak" size={17} color={colors.amber} strokeWidth={1.6} />
              <Text style={styles.statNum}>{stats.streakDays}</Text>
            </View>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
        ) : null}
        {stats.thumbsUp + stats.thumbsDown > 0 ? (
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.thumbsUp}</Text>
            <Text style={styles.statLabel}>good calls confirmed</Text>
          </View>
        ) : null}
      </View>
      {topMoodMeta ? (
        <View style={styles.topMoodRow}>
          <Icon name={topMoodMeta.id} size={16} color={topMoodMeta.color} strokeWidth={1.8} />
          <Text style={[styles.cardP, { flex: 1 }]}>
            You've reached for WhatNow feeling{' '}
            <Text style={font.semibold}>{topMoodMeta.word}</Text> more than anything else so far.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FlashLabel({
  flashed,
  flashedText,
  idleText,
}: {
  flashed: boolean;
  flashedText: string;
  idleText: string;
}) {
  return (
    <View style={styles.flashRow}>
      {flashed ? <Icon name="check" size={14} color={colors.coralDeep} strokeWidth={2.2} /> : null}
      <Text style={styles.keySavedText}>{flashed ? flashedText : idleText}</Text>
    </View>
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
  brand: { fontSize: 30, ...fontDisplay.bold, color: colors.ink, letterSpacing: -0.6 },
  tagline: { fontSize: 15, color: colors.amberDeep, ...font.semibold, marginTop: 4, marginBottom: 16 },
  p: { fontSize: 15.5, color: colors.inkSoft, lineHeight: 23, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardH: { fontSize: 17, ...font.bold, color: colors.ink, marginBottom: 12 },
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
  keyActionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  keySavedText: {
    fontSize: 14,
    ...font.semibold,
    color: colors.coralDeep,
  },
  flashRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  acctHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statNumRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, ...fontDisplay.bold, color: colors.ink },
  statLabel: { fontSize: 11, color: colors.inkFaint, ...font.medium, textAlign: 'center', marginTop: 2 },
  topMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, ...font.bold, color: colors.coralDeep },
  stepT: { fontSize: 15, ...font.semibold, color: colors.ink },
  stepD: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 19, marginTop: 1 },
  credit: { fontSize: 13.5, color: colors.inkFaint, lineHeight: 20, marginTop: 4 },
  link: { color: colors.coralDeep, ...font.semibold },
  version: { fontSize: 12.5, color: colors.inkFaint, marginTop: 12 },
});
