import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Activity,
  CATS,
  COST_LABEL,
  MOODS,
  MoodId,
  PLACE_LABEL,
  TIME_LABEL,
} from '../data/activities';
import { getPersonalSignal, personalizationNote, recordExplicitFeedback } from '../lib/feedback';
import { whyFor } from '../lib/plan';
import { NearbyPlace } from '../lib/places';
import { colors, font, fontDisplay, radius, shadow } from '../lib/theme';
import { Icon, IconName } from './Icon';

const PLACE_ICON: Record<Activity['place'], IconName> = {
  outdoor: 'outdoor',
  indoor: 'indoor',
  either: 'either',
};
const COST_ICON: Record<Activity['cost'], IconName> = {
  free: 'budget-free',
  cheap: 'budget-cheap',
  treat: 'budget-treat',
};

interface Props {
  activity: Activity;
  mood: MoodId;
  order: number;
  saved: boolean;
  reducedMotion: boolean;
  nearby: NearbyPlace | null;
  onToggleSave: (activity: Activity) => void;
}

// Which amenity kinds (if any) each category can name a real nearby spot
// for — deliberately covers every category except reset, which is almost
// always a private, at-home task ("tidy a shelf") that a place name can't
// make more concrete. Order matters: the first kind with a real match wins.
const CAT_TO_AMENITY: Record<string, string[]> = {
  move: ['gym', 'park'],
  explore: ['park', 'museum', 'cinema', 'bookstore'],
  rest: ['park', 'cafe'],
  learn: ['library', 'museum', 'bookstore', 'cafe'],
  indulge: ['cafe', 'restaurant', 'bar'],
  connect: ['cafe', 'restaurant', 'bar', 'park'],
  create: ['cafe', 'bookstore'],
  food: ['restaurant', 'bar', 'cafe'],
};

// Friendly, singular phrasing for the generic-tip fallback below — only
// needs the amenity kinds CAT_TO_AMENITY actually references.
const AMENITY_GENERIC_LABEL: Record<string, string> = {
  gym: 'a gym',
  park: 'a park',
  museum: 'a museum',
  cinema: 'a movie theater',
  bookstore: 'a bookstore',
  library: 'a library',
  cafe: 'a café',
  restaurant: 'a restaurant',
  bar: 'a bar',
};

function formatDistance(m: number): string {
  return m < 1000 ? `${m}m away` : `${(m / 1000).toFixed(1)}km away`;
}

export function ActivityCard({
  activity,
  mood,
  order,
  saved,
  reducedMotion,
  nearby,
  onToggleSave,
}: Props) {
  const a = activity;
  const cat = CATS[a.cat];
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const [given, setGiven] = useState<'up' | 'down' | null>(null);
  const [personalNote, setPersonalNote] = useState<string | null>(null);

  // An honest, auditable "why this, for you" line — only ever shown when
  // there's real feedback history behind it (see lib/feedback.ts). This is
  // deliberately distinct from the mood-based "why this helps" copy below,
  // which is the same for everyone feeling this mood; this one is earned.
  useEffect(() => {
    let cancelled = false;
    const moodWord = MOODS.find((m) => m.id === mood)?.word ?? mood;
    getPersonalSignal(a.id, mood).then((signal) => {
      if (!cancelled) setPersonalNote(personalizationNote(signal, moodWord));
    });
    return () => {
      cancelled = true;
    };
  }, [a.id, mood]);

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: order * 80,
      useNativeDriver: true,
    }).start();
  }, [anim, order, reducedMotion]);

  // Saving is the app's most-repeated action — give it real delight: a
  // success haptic and a quick bounce, not just an instant icon swap.
  // Unsaving stays understated (a lighter tick, no bounce) since it's
  // usually tidying up rather than a moment worth celebrating.
  const handleToggleSave = () => {
    const willSave = !saved;
    if (Platform.OS !== 'web') {
      const feedback = willSave
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.selectionAsync();
      feedback.catch(() => {});
    }
    if (willSave && !reducedMotion) {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    onToggleSave(a);
  };

  // The explicit "was this a good call?" signal — a direct answer, weighted
  // more heavily than the implicit save/reshuffle signal (see lib/feedback.ts).
  // Tapping the already-chosen side is a no-op so a stray double-tap can't
  // silently double-record; tapping the other side lets someone change their
  // mind, which just adds a fresh, opposite-signed record to the log.
  const handleExplicitFeedback = (positive: boolean) => {
    const next = positive ? 'up' : 'down';
    if (given === next) return;
    setGiven(next);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    recordExplicitFeedback(a.id, mood, positive).catch(() => {});
  };

  // Surface a real, specific nearby spot instead of leaving "go somewhere"
  // vague — the nearest venue (of a kind this category actually calls for)
  // from the fuller list Overpass returned, not just whichever one place.ts
  // happened to pick for the "Nearby right now" section.
  const matchingKinds = CAT_TO_AMENITY[a.cat];
  const matchedVenue = matchingKinds
    ? (nearby?.venues ?? []).find(
        (v) => matchingKinds.includes(v.kind) && (a.place === 'outdoor' || a.place === 'either' || v.kind !== 'park')
      )
    : undefined;
  // The venue list (Overpass/Google Places) can come back empty even when
  // we still know roughly where someone is (reverse-geocoding the
  // neighborhood name is a separate, more reliable lookup) — e.g. the free
  // map API being temporarily overloaded shouldn't mean this card falls
  // all the way back to zero place context. Naming the real neighborhood
  // next to a generic venue type ("a park nearby in Nob Hill") is still
  // honest and still more useful than nothing, without inventing a
  // specific business that might not exist.
  const genericVenueLabel = matchingKinds ? AMENITY_GENERIC_LABEL[matchingKinds[0]] : undefined;
  const showGenericTip = !matchedVenue && !!genericVenueLabel && !!nearby?.placeName;
  const showTip = !!matchedVenue || showGenericTip;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderTopColor: cat.color,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.catTag, { backgroundColor: cat.tint }]}>
          <Icon name={a.cat} size={14} color={cat.color} strokeWidth={1.9} />
          <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
        </View>
        <Pressable
          onPress={handleToggleSave}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save for later'}
          style={styles.saveBtn}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Icon
              name={saved ? 'heart-filled' : 'heart-outline'}
              size={24}
              color={saved ? colors.coral : colors.inkFaint}
              strokeWidth={1.8}
            />
          </Animated.View>
        </Pressable>
      </View>

      <Text style={styles.title}>{a.t}</Text>
      <Text style={styles.desc}>{a.d}</Text>

      {personalNote ? (
        <View style={styles.personalRow}>
          <Icon name="thumb-up" size={12} color={colors.sageDeep} strokeWidth={2} />
          <Text style={styles.personalText}>{personalNote}</Text>
        </View>
      ) : null}

      <View style={[styles.why, { backgroundColor: cat.tint }]}>
        <Text style={[styles.whyLabel, { color: cat.color }]}>
          Why this helps right now
        </Text>
        <Text style={styles.whyText}>{whyFor(a, mood)}</Text>
      </View>

      {showTip && matchedVenue ? (
        <View style={styles.tipRow}>
          <Icon name="pin" size={13} color={colors.inkSoft} strokeWidth={1.9} />
          <Text style={styles.tip}>
            Try <Text style={styles.tipStrong}>{matchedVenue.name}</Text> — {formatDistance(matchedVenue.distanceM)}
          </Text>
        </View>
      ) : showGenericTip ? (
        <View style={styles.tipRow}>
          <Icon name="pin" size={13} color={colors.inkSoft} strokeWidth={1.9} />
          <Text style={styles.tip}>
            Worth checking for <Text style={styles.tipStrong}>{genericVenueLabel}</Text> around{' '}
            <Text style={styles.tipStrong}>{nearby!.placeName}</Text>
          </Text>
        </View>
      ) : null}

      <View style={styles.meta}>
        <Chip icon="clock">{TIME_LABEL[a.time]}</Chip>
        <Chip icon={PLACE_ICON[a.place]}>{PLACE_LABEL[a.place]}</Chip>
        <Chip icon={COST_ICON[a.cost]}>{COST_LABEL[a.cost]}</Chip>
      </View>

      <View style={styles.feedbackRow}>
        <Text style={styles.feedbackLabel}>
          {given ? 'Thanks — that helps WhatNow learn.' : 'Good call for this moment?'}
        </Text>
        <View style={styles.feedbackBtns}>
          <Pressable
            onPress={() => handleExplicitFeedback(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: given === 'up' }}
            accessibilityLabel="Yes, good call"
            style={[styles.feedbackBtn, given === 'up' && styles.feedbackBtnUpActive]}
          >
            <Icon
              name="thumb-up"
              size={15}
              color={given === 'up' ? colors.white : colors.inkFaint}
              strokeWidth={1.9}
            />
          </Pressable>
          <Pressable
            onPress={() => handleExplicitFeedback(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: given === 'down' }}
            accessibilityLabel="No, not a good call"
            style={[styles.feedbackBtn, given === 'down' && styles.feedbackBtnDownActive]}
          >
            <Icon
              name="thumb-down"
              size={15}
              color={given === 'down' ? colors.white : colors.inkFaint}
              strokeWidth={1.9}
            />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon: IconName }) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={13} color={colors.inkSoft} strokeWidth={1.9} />
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderTopWidth: 4,
    padding: 18,
    marginBottom: 14,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  catLabel: { fontSize: 12, ...font.bold, letterSpacing: 0.3 },
  saveBtn: { padding: 2 },
  title: {
    fontSize: 20,
    ...fontDisplay.bold,
    color: colors.ink,
    lineHeight: 26,
    marginBottom: 5,
  },
  desc: { fontSize: 15, color: colors.inkSoft, ...font.regular, lineHeight: 21, marginBottom: 14 },
  personalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: 14 },
  personalText: { flex: 1, fontSize: 12.5, ...font.semibold, color: colors.sageDeep },
  why: { borderRadius: radius.md, padding: 13, marginBottom: 12 },
  whyLabel: {
    fontSize: 11,
    ...font.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  whyText: { fontSize: 14.5, color: colors.ink, ...font.regular, lineHeight: 20 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  tip: { flex: 1, fontSize: 13.5, color: colors.inkSoft, ...font.regular },
  tipStrong: { ...font.semibold, color: colors.ink },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontSize: 12.5, color: colors.inkSoft, ...font.medium },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  feedbackLabel: { flex: 1, fontSize: 12.5, color: colors.inkFaint, ...font.regular },
  feedbackBtns: { flexDirection: 'row', gap: 8 },
  feedbackBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  feedbackBtnUpActive: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  feedbackBtnDownActive: { backgroundColor: colors.inkFaint, borderColor: colors.inkFaint },
});
