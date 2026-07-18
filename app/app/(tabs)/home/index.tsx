import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { MOODS, MoodId } from '../../../data/activities';
import { usePlan } from '../../../context/PlanContext';
import { colors, font, fontDisplay, radius, shadow } from '../../../lib/theme';

export default function MoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mood, setMood } = usePlan();

  const pick = (id: MoodId) => {
    setMood(id);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const selectedWord = mood ? MOODS.find((m) => m.id === mood)?.word : null;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          What<Text style={{ color: colors.coral }}>Now</Text>
        </Text>

        <Text style={styles.tagline}>Plans around your mood, not your calendar.</Text>
        <Text style={styles.h1}>How are you feeling right now?</Text>
        <Text style={styles.sub}>
          Pick the one that fits. We'll build a small plan around it — no wrong answers.
        </Text>

        <View style={styles.grid}>
          {MOODS.map((m) => {
            const active = m.id === mood;
            return (
              <Pressable
                key={m.id}
                onPress={() => pick(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Mood: ${m.word}`}
                style={({ pressed }) => [
                  styles.mood,
                  active && { borderColor: m.color, backgroundColor: m.tint },
                  pressed && styles.moodPressed,
                ]}
              >
                <Icon
                  name={m.id}
                  size={30}
                  color={active ? m.color : colors.inkFaint}
                  strokeWidth={1.6}
                />
                <Text style={[styles.moodWord, active && { color: m.color }]}>
                  {m.word}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {selectedWord ? (
          <Text style={styles.footerHint}>
            Feeling {selectedWord}. Let's tailor it.
          </Text>
        ) : (
          <Text style={styles.footerHintFaint}>Tap a mood to begin</Text>
        )}
        <Pressable
          disabled={!mood}
          onPress={() => router.push('/home/context')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            !mood && styles.ctaDisabled,
            pressed && mood && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>Next  →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20 },
  brand: {
    fontSize: 24,
    ...fontDisplay.bold,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 22,
  },
  tagline: {
    fontSize: 14,
    color: colors.amber,
    ...font.semibold,
    marginBottom: 8,
  },
  h1: {
    fontSize: 29,
    ...fontDisplay.bold,
    color: colors.ink,
    lineHeight: 35,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sub: { fontSize: 15.5, color: colors.inkSoft, lineHeight: 22, marginBottom: 22 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  mood: {
    width: '31.5%',
    aspectRatio: 0.92,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.soft,
  },
  moodPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  moodEmo: { fontSize: 34 },
  moodWord: {
    fontSize: 14,
    ...font.semibold,
    color: colors.inkSoft,
    textTransform: 'capitalize',
  },
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
  footerHint: {
    fontSize: 14,
    color: colors.ink,
    ...font.medium,
    marginBottom: 10,
    textAlign: 'center',
  },
  footerHintFaint: {
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: 10,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.soft,
  },
  ctaDisabled: { backgroundColor: '#EAD9CD' },
  ctaPressed: { backgroundColor: colors.coralDeep },
  ctaText: { color: colors.white, fontSize: 17, ...font.bold },
});
