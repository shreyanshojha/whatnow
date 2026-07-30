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
import { ActivityCard } from '../../../components/ActivityCard';
import { Icon, IconName } from '../../../components/Icon';
import { usePlan } from '../../../context/PlanContext';
import {
  ENERGY_LABEL,
  MOODS,
  PLACE_LABEL,
  SOCIAL_LABEL,
  TIME_LABEL,
} from '../../../data/activities';
import { colors, font, fontDisplay, radius, shadow } from '../../../lib/theme';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { weatherIconName, weatherNote } from '../../../lib/weather';

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
    nearbySearchResults,
    nearbySearchLoading,
    lookOnlineNearby,
    aiApiKey,
    sharedAiAvailable,
    sharedAiCapped,
    lastPlan,
    planSource,
    planLoading,
    reshuffle,
    isSaved,
    toggleSave,
    saved,
    resetFlow,
    freeformDescription,
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
      {freeformDescription ? (
        <View style={styles.h1Row}>
          <Icon name="other" size={24} color={colors.coralDeep} strokeWidth={1.7} />
          <Text style={styles.h1}>For "{freeformDescription}" — here's your plan.</Text>
        </View>
      ) : moodMeta ? (
        <View style={styles.h1Row}>
          <Icon name={moodMeta.id} size={26} color={moodMeta.color} strokeWidth={1.7} />
          <Text style={styles.h1}>Feeling {moodMeta.word}? Here's your plan.</Text>
        </View>
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
          <Icon name="inspired" size={13} color={colors.plum} strokeWidth={1.8} />
          <Text style={styles.aiBadgeText}>Composed fresh for you by AI</Text>
        </View>
      ) : null}

      {sharedAiCapped && !planLoading ? (
        <View style={styles.cappedBadge}>
          <Icon name="info" size={13} color={colors.inkFaint} strokeWidth={1.8} />
          <Text style={styles.cappedBadgeText}>
            You've hit today's shared AI limit — this plan uses WhatNow's built-in matching
            instead. Resets tomorrow, or add your own key in Settings.
          </Text>
        </View>
      ) : null}

      {weather ? (
        <View style={styles.weather}>
          <Icon name={weatherIconName(weather)} size={16} color={colors.ink} strokeWidth={1.7} />
          <Text style={styles.weatherText}>{weatherNote(weather)}</Text>
        </View>
      ) : null}

      {planLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.coralDeep} />
          <Text style={styles.loadingText}>Thinking through your plan…</Text>
        </View>
      ) : lastPlan.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="compass" size={40} color={colors.inkFaint} strokeWidth={1.4} />
          <Text style={styles.emptyH}>That combination is a tight fit.</Text>
          <Text style={styles.emptyP}>
            Nothing matched every constraint at once. Try widening one thing — a bit more
            time, a looser budget, or setting to Anywhere.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghostRow, pressed && { opacity: 0.7 }]}
          >
            <Icon name="arrow-left" size={14} color={colors.inkSoft} strokeWidth={2} />
            <Text style={styles.ghostText}>Adjust details</Text>
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
            <View style={styles.reshuffleRow}>
              <Icon name="reset" size={17} color={colors.coralDeep} strokeWidth={1.9} />
              <Text style={styles.reshuffleText}>Reshuffle</Text>
            </View>
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

      {aiApiKey || sharedAiAvailable ? (
        <LookOnlineNearby
          results={nearbySearchResults}
          loading={nearbySearchLoading}
          onSearch={lookOnlineNearby}
        />
      ) : null}

      <Pressable
        onPress={() => {
          resetFlow();
          router.replace('/home');
        }}
        style={({ pressed }) => [styles.startOver, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.startOverText}>Start over</Text>
      </Pressable>
    </ScrollView>
  );
}

const VENUE_ICON: Record<string, IconName> = {
  park: 'venue-park',
  cafe: 'venue-cafe',
  library: 'venue-library',
  gym: 'venue-gym',
  restaurant: 'venue-restaurant',
  bar: 'venue-bar',
  museum: 'venue-museum',
  bookstore: 'venue-bookstore',
  cinema: 'venue-cinema',
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
          <View style={styles.nearbyIconWrap}>
            <Icon name={VENUE_ICON[v.kind] ?? 'pin'} size={17} color={colors.inkSoft} strokeWidth={1.7} />
          </View>
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
            <View style={styles.nearbyIconWrap}>
              <Icon name="ticket" size={17} color={colors.inkSoft} strokeWidth={1.7} />
            </View>
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

const RESULT_ICON: Record<string, IconName> = {
  movie: 'venue-cinema',
  event: 'ticket',
  restaurant: 'venue-restaurant',
  discover: 'compass',
};
const CAT_FILTER_LABEL: Record<string, string> = {
  event: 'Events',
  movie: 'Movies',
  restaurant: 'Food',
  discover: 'Discover',
};
const RESULT_CATS = ['event', 'movie', 'restaurant', 'discover'] as const;

// A quick, natural follow-up once real results are in — asking "any
// preference?" before searching would just be a form; asking it after
// someone's already seen a real restaurant or movie pick is a normal
// question ("oh, any cuisine in mind?") that meaningfully narrows the next
// search instead of adding friction up front. Shown at most once per
// search — dismissing it or picking a chip both close it for this batch.
const CUISINE_CHIPS = ['Italian', 'Mexican', 'Japanese', 'Indian', 'Thai', 'Something cozy'];
const GENRE_CHIPS = ['Comedy', 'Action', 'Drama', 'Family-friendly', 'Horror', 'Documentary'];

/** A web-search-backed complement to NearbyRightNow — surfaces real, currently
 * open/happening restaurants, events, movies, and general local discoveries
 * (things a structured API wouldn't carry, or wouldn't think to surface at
 * all) via the same Anthropic key used for AI planning (see
 * lib/nearbySearch.ts). Starts collapsed as a single button so it never
 * looks like a broken, empty section. */
function LookOnlineNearby({
  results,
  loading,
  onSearch,
}: {
  results: ReturnType<typeof usePlan>['nearbySearchResults'];
  loading: boolean;
  onSearch: (refineHint?: string) => Promise<void>;
}) {
  const [searched, setSearched] = React.useState(false);
  // Purely a client-side view filter over whatever the search already
  // returned — the search itself always asks for a mix (see
  // lib/nearbySearch.ts), this just lets someone narrow what they're
  // looking at afterward without a second search or any backend change.
  const [filter, setFilter] = React.useState<'all' | (typeof RESULT_CATS)[number]>('all');
  // Whether the one-time follow-up question ("craving a cuisine?" / "in the
  // mood for a genre?") has already been shown-and-resolved for the current
  // batch of results — reset on every fresh (non-refine) search.
  const [followUpResolved, setFollowUpResolved] = React.useState(false);

  const handlePress = () => {
    setSearched(true);
    setFilter('all');
    setFollowUpResolved(false);
    onSearch().catch(() => {});
  };

  const handleRefine = (hint: string) => {
    setFollowUpResolved(true);
    setFilter('all');
    onSearch(hint).catch(() => {});
  };

  const visibleResults = results?.filter((r) => filter === 'all' || r.category === filter) ?? null;
  const presentCats = RESULT_CATS.filter((c) => results?.some((r) => r.category === c));
  const hasRestaurants = presentCats.includes('restaurant');
  const hasMoviesNow = presentCats.includes('movie');
  // Restaurant takes priority over movie if a batch somehow has both — one
  // question at a time, never a multi-part form.
  const followUpKind: 'cuisine' | 'genre' | null =
    !loading && searched && !followUpResolved && results && results.length > 0
      ? hasRestaurants
        ? 'cuisine'
        : hasMoviesNow
          ? 'genre'
          : null
      : null;

  return (
    <View style={styles.nearbySection}>
      <View style={styles.lookRow}>
        <Text style={styles.nearbyH}>Look online nearby</Text>
        {!loading ? (
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.lookBtn, pressed && { opacity: 0.8 }]}
          >
            <Icon name="curious" size={14} color={colors.coralDeep} strokeWidth={1.9} />
            <Text style={styles.lookBtnText}>
              {searched ? 'Search again' : 'Search'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.nearbyRow}>
          <ActivityIndicator size="small" color={colors.coralDeep} />
          <Text style={[styles.nearbyMeta, { marginLeft: 10 }]}>
            Searching the web for what's actually open right now…
          </Text>
        </View>
      ) : !searched ? (
        <Text style={styles.lookHint}>
          Finds real restaurants, events, movies, and hidden-gem spots nearby — things worth
          discovering, not just what's closest.
        </Text>
      ) : results === null ? (
        <Text style={styles.lookHint}>
          Couldn't find anything just now — try again in a bit.
        </Text>
      ) : (
        <>
          {presentCats.length > 1 ? (
            <View style={styles.lookFilterRow}>
              {(['all', ...presentCats] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f }}
                  style={[styles.lookFilterChip, filter === f && styles.lookFilterChipActive]}
                >
                  <Text style={[styles.lookFilterText, filter === f && styles.lookFilterTextActive]}>
                    {f === 'all' ? 'All' : CAT_FILTER_LABEL[f]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {visibleResults?.map((r, i) => (
            <Pressable
              key={`${r.name}-${i}`}
              style={styles.nearbyRow}
              disabled={!r.url}
              onPress={() => {
                if (r.url) Linking.openURL(r.url).catch(() => {});
              }}
            >
              <View style={styles.nearbyIconWrap}>
                <Icon
                  name={RESULT_ICON[r.category] ?? 'pin'}
                  size={17}
                  color={colors.inkSoft}
                  strokeWidth={1.7}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nearbyName}>{r.name}</Text>
                <Text style={styles.nearbyMeta}>{r.blurb}</Text>
              </View>
            </Pressable>
          ))}

          {followUpKind ? (
            <View style={styles.followUpBox}>
              <Text style={styles.followUpQ}>
                {followUpKind === 'cuisine' ? 'Craving a specific cuisine?' : 'In the mood for a genre?'}
              </Text>
              <View style={styles.followUpChipRow}>
                {(followUpKind === 'cuisine' ? CUISINE_CHIPS : GENRE_CHIPS).map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => handleRefine(chip)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.followUpChip, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.followUpChipText}>{chip}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setFollowUpResolved(true)} accessibilityRole="button">
                <Text style={styles.followUpDismiss}>Not fussy — leave it</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },
  h1Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  h1: {
    flexShrink: 1,
    fontSize: 26,
    ...fontDisplay.bold,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  sum: { fontSize: 15, color: colors.inkSoft, ...font.regular, lineHeight: 22, marginBottom: 8 },
  b: { ...font.semibold, color: colors.ink },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.plumTint,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  aiBadgeText: { fontSize: 12.5, ...font.semibold, color: colors.plum },
  cappedBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  cappedBadgeText: { flex: 1, fontSize: 12.5, color: colors.inkFaint, ...font.medium, lineHeight: 18 },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: { fontSize: 14.5, color: colors.inkSoft, ...font.regular },
  nearbySection: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nearbyH: { fontSize: 15, ...font.bold, color: colors.ink, marginBottom: 10 },
  lookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.coral,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  lookBtnText: { fontSize: 12.5, ...font.semibold, color: colors.coralDeep },
  lookHint: { fontSize: 13, color: colors.inkFaint, ...font.regular, lineHeight: 19 },
  lookFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  lookFilterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  lookFilterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  lookFilterText: { fontSize: 12, ...font.semibold, color: colors.inkFaint },
  lookFilterTextActive: { color: colors.white },
  followUpBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  followUpQ: { fontSize: 13.5, ...font.semibold, color: colors.ink, marginBottom: 8 },
  followUpChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  followUpChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.coral,
    backgroundColor: colors.coralTint,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  followUpChipText: { fontSize: 12.5, ...font.semibold, color: colors.coralDeep },
  followUpDismiss: { fontSize: 12.5, color: colors.inkFaint, ...font.medium },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  nearbyIconWrap: { width: 22, alignItems: 'center' },
  nearbyName: { fontSize: 14.5, ...font.semibold, color: colors.ink },
  nearbyMeta: { fontSize: 12.5, color: colors.inkFaint, ...font.regular, marginTop: 1 },
  nearbyAttribution: {
    fontSize: 11,
    color: colors.inkFaint,
    ...font.regular,
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 13,
    marginBottom: 18,
  },
  weatherText: { flex: 1, fontSize: 14, color: colors.ink, ...font.regular, lineHeight: 20 },
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
  reshufflePressed: { backgroundColor: colors.coralTint },
  reshuffleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reshuffleText: { fontSize: 16, ...font.bold, color: colors.coralDeep },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  ghostText: { fontSize: 15, ...font.semibold, color: colors.inkSoft },
  startOver: { paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  startOverText: { fontSize: 14.5, color: colors.inkFaint, ...font.medium },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 26,
    alignItems: 'center',
    marginTop: 16,
    ...shadow.soft,
  },
  emptyH: {
    fontSize: 18,
    ...font.bold,
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyP: {
    fontSize: 14.5,
    color: colors.inkSoft,
    ...font.regular,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
});
