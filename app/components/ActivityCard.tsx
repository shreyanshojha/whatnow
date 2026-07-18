import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Activity,
  CATS,
  COST_LABEL,
  MoodId,
  PLACE_LABEL,
  TIME_LABEL,
} from '../data/activities';
import { whyFor } from '../lib/plan';
import { NearbyPlace } from '../lib/places';
import { colors, font, radius, shadow } from '../lib/theme';

interface Props {
  activity: Activity;
  mood: MoodId;
  order: number;
  saved: boolean;
  reducedMotion: boolean;
  nearby: NearbyPlace | null;
  onToggleSave: (activity: Activity) => void;
}

// Which amenity kind (if any) each category can name a real nearby spot for.
const CAT_TO_AMENITY: Record<string, string[]> = {
  move: ['gym', 'park'],
  explore: ['park', 'cafe', 'library'],
  rest: ['park', 'cafe'],
  learn: ['library', 'cafe'],
  indulge: ['cafe'],
  connect: ['cafe', 'park'],
};

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

  const placeIcon = a.place === 'outdoor' ? '🌳' : a.place === 'indoor' ? '🏠' : '🔀';

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

  // Surface a real nearby amenity as a gentle tip when it fits the category.
  const amenity = nearby?.amenity;
  const showTip =
    amenity &&
    CAT_TO_AMENITY[a.cat]?.includes(amenity.kind) &&
    (a.place === 'outdoor' || a.place === 'either' || amenity.kind !== 'park');

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
          <Text style={styles.catEmo}>{cat.emo}</Text>
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
          <Animated.Text
            style={[
              styles.heart,
              saved && { color: colors.coral },
              { transform: [{ scale: heartScale }] },
            ]}
          >
            {saved ? '♥' : '♡'}
          </Animated.Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{a.t}</Text>
      <Text style={styles.desc}>{a.d}</Text>

      <View style={[styles.why, { backgroundColor: cat.tint }]}>
        <Text style={[styles.whyLabel, { color: cat.color }]}>
          Why this helps right now
        </Text>
        <Text style={styles.whyText}>{whyFor(a, mood)}</Text>
      </View>

      {showTip && amenity ? (
        <Text style={styles.tip}>
          📍 Near you: <Text style={styles.tipStrong}>{amenity.name}</Text>
        </Text>
      ) : null}

      <View style={styles.meta}>
        <Chip>{`⏱ ${TIME_LABEL[a.time]}`}</Chip>
        <Chip>{`${placeIcon} ${PLACE_LABEL[a.place]}`}</Chip>
        <Chip>{COST_LABEL[a.cost]}</Chip>
      </View>
    </Animated.View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.chip}>
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
  catEmo: { fontSize: 13 },
  catLabel: { fontSize: 12, fontWeight: font.bold, letterSpacing: 0.3 },
  saveBtn: { padding: 2 },
  heart: { fontSize: 26, color: colors.inkFaint, lineHeight: 28 },
  title: {
    fontSize: 20,
    fontWeight: font.bold,
    color: colors.ink,
    lineHeight: 26,
    marginBottom: 5,
  },
  desc: { fontSize: 15, color: colors.inkSoft, lineHeight: 21, marginBottom: 14 },
  why: { borderRadius: radius.md, padding: 13, marginBottom: 12 },
  whyLabel: {
    fontSize: 11,
    fontWeight: font.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  whyText: { fontSize: 14.5, color: colors.ink, lineHeight: 20 },
  tip: { fontSize: 13.5, color: colors.inkSoft, marginBottom: 12 },
  tipStrong: { fontWeight: font.semibold, color: colors.ink },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontSize: 12.5, color: colors.inkSoft, fontWeight: font.medium },
});
