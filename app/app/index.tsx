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
import { MOODS, MoodId } from '../data/activities';
import { usePlan } from '../context/PlanContext';
import { colors, font, radius, shadow } from '../lib/theme';

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
        <View style={styles.headerRow}>
          <Text style={styles.brand}>
            What<Text style={{ color: colors.coral }}>Now</Text>
          </Text>
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push('/saved')} hitSlop={8}>
              <Text style={styles.headerLink}>Saved</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/about')} hitSlop={8}>
              <Text style={styles.headerLink}>About</Text>
            </Pressable>
          </View>
        </View>

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
                  active && styles.moodActive,
                  pressed && styles.moodPressed,
                ]}
              >
                <Text style={styles.moodEmo}>{m.emo}</Text>
                <Text style={[styles.moodWord, active && styles.moodWordActive]}>
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
          onPress={() => router.push('/context')}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  brand: { fontSize: 24, fontWeight: font.bold, color: colors.ink, letterSpacing: -0.5 },
  headerLinks: { flexDirection: 'row', gap: 18 },
  headerLink: { fontSize: 15, fontWeight: font.semibold, color: colors.coralDeep },
  tagline: {
    fontSize: 14,
    color: colors.amber,
    fontWeight: font.semibold,
    marginBottom: 8,
  },
  h1: {
    fontSize: 29,
    fontWeight: font.bold,
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
  moodActive: {
    borderColor: colors.coral,
    backgroundColor: '#FFF7F3',
  },
  moodPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  moodEmo: { fontSize: 34 },
  moodWord: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.inkSoft,
    textTransform: 'capitalize',
  },
  moodWordActive: { color: colors.coralDeep },
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
    fontWeight: font.medium,
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
  ctaText: { color: colors.white, fontSize: 17, fontWeight: font.bold },
});
