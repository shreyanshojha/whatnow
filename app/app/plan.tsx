import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityCard } from '../components/ActivityCard';
import { usePlan } from '../context/PlanContext';
import {
  ENERGY_LABEL,
  MOODS,
  PLACE_LABEL,
  SOCIAL_LABEL,
  TIME_LABEL,
} from '../data/activities';
import { colors, font, radius, shadow } from '../lib/theme';
import { useReducedMotion } from '../lib/useReducedMotion';
import { weatherNote } from '../lib/weather';

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const {
    mood,
    energy,
    time,
    social,
    setting,
    weather,
    nearby,
    nearbyEvents,
    eventsLoading,
    lastPlan,
    planSource,
    planLoading,
    reshuffle,
    isSaved,
    toggleSave,
    saved,
    resetFlow,
  } = usePlan();
  // Bump a key on reshuffle so cards re-mount + replay their reveal.
  const [nonce, setNonce] = React.useState(0);

  const moodMeta = mood ? MOODS.find((m) => m.id === mood) : null;

  const onReshuffle = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await reshuffle();
    setNonce((n) => n + 1);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      {moodMeta ? (
        <Text style={styles.h1}>
          Feeling {moodMeta.emo} {moodMeta.word}? Here's your plan.
        </Text>
      ) : (
        <Text style={styles.h1}>Here's your plan.</Text>
      )}

      <Text style={styles.sum}>
        {lastPlan.length} {lastPlan.length === 1 ? 'idea' : 'ideas'} tuned to{' '}
        <Text style={styles.b}>{ENERGY_LABEL[energy].toLowerCase()} energy</Text>,{' '}
        <Text style={styles.b}>{TIME_LABEL[time]}</Text>,{' '}
        <Text style={styles.b}>{SOCIAL_LABEL[social].toLowerCase()}</Text>,{' '}
        <Text style={styles.b}>{PLACE_LABEL[setting].toLowerCase()}</Text>.
      </Text>

      {planSource === 'ai' && !planLoading ? (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>✨ Composed fresh for you by AI</Text>
        </View>
      ) : null}

      {weather ? <Text style={styles.weather}>{weatherNote(weather)}</Text> : null}

      {planLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDeep} />
          <Text style={styles.loadingText}>Thinking through your plan…</Text>
        </View>
      ) : lastPlan.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmo}>🧭</Text>
          <Text style={styles.emptyH}>That combination is a tight fit.</Text>
          <Text style={styles.emptyP}>
            Nothing matched every constraint at once. Try widening one thing — a bit more
            time, a looser budget, or setting to Either.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.ghostText}>← Adjust details</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cards}>
          {lastPlan.map((card, i) => (
            <ActivityCard
              key={`${nonce}-${card.activity.id}`}
              activity={card.activity}
              order={i}
              mood={mood!}
              saved={isSaved(card.activity)}
              reducedMotion={reduced}
              nearby={nearby}
              onToggleSave={toggleSave}
            />
          ))}
        </View>
      )}

      {lastPlan.length > 0 && !planLoading ? (
        <View style={styles.tools}>
          <Pressable
            onPress={onReshuffle}
            disabled={planLoading}
            accessibilityRole="button"
            style={({ pressed }) => [styles.reshuffle, pressed && styles.reshufflePressed]}
          >
            <Text style={styles.reshuffleText}>↻  Reshuffle</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/saved')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.ghostText}>View saved ({saved.length})</Text>
          </Pressable>
        </View>
      ) : null}

      <NearbyRightNow nearby={nearby} events={nearbyEvents} eventsLoading={eventsLoading} />

      <Pressable
        onPress={() => {
          resetFlow();
          router.replace('/');
        }}
        style={({ pressed }) => [styles.startOver, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.startOverText}>Start over</Text>
      </Pressable>
    </ScrollView>
  );
}

const VENUE_ICON: Record<string, string> = {
  park: '🌳',
  cafe: '☕',
  library: '📚',
  gym: '🏋️',
  restaurant: '🍽️',
  bar: '🍸',
  museum: '🖼️',
  bookstore: '📖',
  cinema: '🎬',
};

function formatEventDate(localDate: string | null): string {
  if (!localDate) return '';
  const d = new Date(`${localDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return localDate;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function NearbyRightNow({
  nearby,
  events,
  eventsLoading,
}: {
  nearby: ReturnType<typeof usePlan>['nearby'];
  events: ReturnType<typeof usePlan>['nearbyEvents'];
  eventsLoading: boolean;
}) {
  const venues = nearby?.venues ?? [];
  const hasAnything = venues.length > 0 || events.length > 0 || eventsLoading;
  if (!hasAnything) return null;

  return (
    <View style={styles.nearbySection}>
      <Text style={styles.nearbyH}>Nearby right now</Text>

      {venues.slice(0, 5).map((v) => (
        <View key={v.name} style={styles.nearbyRow}>
          <Text style={styles.nearbyIcon}>{VENUE_ICON[v.kind] ?? '📍'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.nearbyName}>{v.name}</Text>
            <Text style={styles.nearbyMeta}>
              {v.distanceM < 1000 ? `${v.distanceM}m away` : `${(v.distanceM / 1000).toFixed(1)}km away`}
            </Text>
          </View>
        </View>
      ))}

      {eventsLoading ? (
        <View style={styles.nearbyRow}>
          <ActivityIndicator size="small" color={colors.coralDeep} />
          <Text style={[styles.nearbyMeta, { marginLeft: 10 }]}>Checking for live events…</Text>
        </View>
      ) : (
        events.slice(0, 5).map((e) => (
          <Pressable
            key={e.name + e.localDate}
            style={styles.nearbyRow}
            disabled={!e.url}
            onPress={() => {
              if (e.url) Linking.openURL(e.url).catch(() => {});
            }}
          >
            <Text style={styles.nearbyIcon}>🎟️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nearbyName}>{e.name}</Text>
              <Text style={styles.nearbyMeta}>
                {[formatEventDate(e.localDate), e.venueName, e.segment].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      {venues.length > 0 ? (
        <Text
          style={styles.nearbyAttribution}
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}
        >
          Places data © OpenStreetMap contributors
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },
  h1: {
    fontSize: 26,
    fontWeight: font.bold,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 8,
  },
  sum: { fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginBottom: 8 },
  b: { fontWeight: font.semibold, color: colors.ink },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3ECF7',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  aiBadgeText: { fontSize: 12.5, fontWeight: font.semibold, color: colors.plum },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: { fontSize: 14.5, color: colors.inkSoft },
  nearbySection: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nearbyH: { fontSize: 15, fontWeight: font.bold, color: colors.ink, marginBottom: 10 },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  nearbyIcon: { fontSize: 18, width: 22, textAlign: 'center' },
  nearbyName: { fontSize: 14.5, fontWeight: font.semibold, color: colors.ink },
  nearbyMeta: { fontSize: 12.5, color: colors.inkFaint, marginTop: 1 },
  nearbyAttribution: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  weather: {
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 13,
    overflow: 'hidden',
    marginBottom: 18,
    lineHeight: 20,
  },
  cards: { marginTop: 6 },
  tools: { gap: 10, marginTop: 4, marginBottom: 8 },
  reshuffle: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.coral,
    ...shadow.soft,
  },
  reshufflePressed: { backgroundColor: '#FFF3EE' },
  reshuffleText: { fontSize: 16, fontWeight: font.bold, color: colors.coralDeep },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostText: { fontSize: 15, fontWeight: font.semibold, color: colors.inkSoft },
  startOver: { paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  startOverText: { fontSize: 14.5, color: colors.inkFaint, fontWeight: font.medium },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 26,
    alignItems: 'center',
    marginTop: 16,
    ...shadow.soft,
  },
  emptyEmo: { fontSize: 40, marginBottom: 10 },
  emptyH: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyP: {
    fontSize: 14.5,
    color: colors.inkSoft,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
});
