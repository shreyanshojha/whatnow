import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { MOODS, MoodId } from '../../../data/activities';
import { SavedEntry, usePlan } from '../../../context/PlanContext';
import { dismissCompletionCheck, getPendingCompletionCheck } from '../../../lib/completionCheck';
import { recordExplicitFeedback } from '../../../lib/feedback';
import { detectImpliedCategories, matchMoodFromText } from '../../../lib/moodMatch';
import { checkForCrisisLanguage } from '../../../lib/safetyCheck';
import { colors, font, fontDisplay, radius, shadow } from '../../../lib/theme';

export default function MoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    moods,
    toggleMood,
    setMood,
    freeformDescription,
    setFreeformDescription,
    categories,
    toggleCategory,
    saved,
  } = usePlan();
  const [otherOpen, setOtherOpen] = React.useState(!!freeformDescription);
  const [draft, setDraft] = React.useState(freeformDescription);
  const [checkIn, setCheckIn] = React.useState<SavedEntry | null>(null);
  const [showCrisisNotice, setShowCrisisNotice] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getPendingCompletionCheck(saved).then((entry) => {
      if (!cancelled) setCheckIn(entry);
    });
    return () => {
      cancelled = true;
    };
    // Only re-check when the saved list itself changes — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const answerCheckIn = (positive: boolean | null) => {
    if (!checkIn) return;
    if (positive !== null) {
      recordExplicitFeedback(checkIn.activity.id, checkIn.mood, positive).catch(() => {});
    }
    dismissCompletionCheck(checkIn.activity.id).catch(() => {});
    setCheckIn(null);
  };

  const pick = (id: MoodId) => {
    toggleMood(id);
    setFreeformDescription(''); // a real mood tile always wins over stale freeform text
    // Undo any category nudge a previous freeform description implied (e.g.
    // "hungry" → food, see detectImpliedCategories) — a real mood tile is a
    // fresh start, not a refinement of the stale freeform text.
    for (const cat of categories) toggleCategory(cat);
    setOtherOpen(false);
    setShowCrisisNotice(false); // switching to a normal mood tile clears any lingering notice
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const proceedWithFreeform = (text: string) => {
    // Always clear this here — the one place every "actually move forward"
    // path runs through, whether that's a direct non-crisis submit or
    // tapping "See activity ideas anyway" on the crisis notice. Without
    // this, editing the text to remove concerning language and resubmitting
    // left the notice stuck showing (with nothing left to dismiss it) on
    // every future visit to this screen.
    setShowCrisisNotice(false);
    const matched = matchMoodFromText(text);
    setMood(matched);
    setFreeformDescription(text);
    // AI planning reads the raw text directly and handles this on its own,
    // but the deterministic fallback engine only ever sees the matched mood
    // bucket — so something like "hungry" (a physical state, not one of the
    // 12 moods) needs a category nudge too, or it can land on anything at
    // all. See lib/moodMatch.ts's detectImpliedCategories.
    for (const cat of detectImpliedCategories(text)) {
      if (!categories.includes(cat)) toggleCategory(cat);
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    router.push('/home/context');
  };

  const submitOther = () => {
    const text = draft.trim();
    if (!text) return;
    // A caring pause, not a gate: if this reads like a crisis, say something
    // human first, but never trap the person — "see ideas anyway" is always
    // right there. Collapses the freeform box so the notice is the one clear
    // thing on screen instead of both showing at once.
    if (checkForCrisisLanguage(text)) {
      setOtherOpen(false);
      setShowCrisisNotice(true);
      return;
    }
    proceedWithFreeform(text);
  };

  const selectedWords =
    moods.length > 0 && !freeformDescription
      ? moods.map((id) => MOODS.find((m) => m.id === id)?.word).filter(Boolean)
      : [];

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

        {checkIn ? (
          <View style={styles.checkInCard}>
            <View style={styles.checkInHeaderRow}>
              <Icon name="streak" size={16} color={colors.amber} strokeWidth={1.8} />
              <Text style={styles.checkInHeader}>Quick check-in</Text>
            </View>
            <Text style={styles.checkInBody}>
              Last time, you saved "{checkIn.activity.t}" — did it end up happening?
            </Text>
            <View style={styles.checkInRow}>
              <Pressable
                onPress={() => answerCheckIn(true)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.checkInBtn, styles.checkInBtnYes, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.checkInBtnYesText}>Yes, it helped</Text>
              </Pressable>
              <Pressable
                onPress={() => answerCheckIn(false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.checkInBtn, styles.checkInBtnNo, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.checkInBtnNoText}>Not really</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => answerCheckIn(null)} accessibilityRole="button">
              <Text style={styles.checkInSkip}>Skip</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.tagline}>Plans around your mood, not your calendar.</Text>
        <Text style={styles.h1}>How are you feeling right now?</Text>
        <Text style={styles.sub}>
          Pick what fits — one or a few. No wrong answers.
        </Text>

        <View style={styles.grid}>
          {MOODS.map((m) => {
            const active = moods.includes(m.id);
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

        <Pressable
          onPress={() => setOtherOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: !!freeformDescription }}
          style={[styles.otherRow, !!freeformDescription && styles.otherRowActive]}
        >
          <Icon
            name="other"
            size={18}
            color={freeformDescription ? colors.coralDeep : colors.inkFaint}
            strokeWidth={1.7}
          />
          <Text style={[styles.otherRowText, !!freeformDescription && { color: colors.coralDeep }]}>
            {freeformDescription ? `"${freeformDescription}"` : "None of these — let me tell you"}
          </Text>
        </Pressable>

        {otherOpen ? (
          <View style={styles.otherBox}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="How are you actually feeling right now?"
              placeholderTextColor={colors.inkFaint}
              multiline
              style={styles.otherInput}
            />
            <Pressable
              onPress={submitOther}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.otherSubmit,
                !draft.trim() && styles.ctaDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.otherSubmitText}>Use this</Text>
              <Icon name="arrow-right" size={15} color={colors.white} strokeWidth={2.1} />
            </Pressable>
            <Text style={styles.otherHint}>
              WhatNow will match this to the closest mood under the hood, but your own words —
              not just that label — shape the suggestions when AI planning is on.
            </Text>
          </View>
        ) : null}

        {showCrisisNotice ? (
          <View style={styles.crisisCard}>
            <Text style={styles.crisisH}>Before anything else</Text>
            <Text style={styles.crisisBody}>
              That sounds heavy. If you're in immediate danger, please contact your local
              emergency number. In the US, the 988 Suicide & Crisis Lifeline is free,
              confidential, and reachable 24/7 by call or text — wherever you are, reaching out
              to someone you trust is worth doing.
            </Text>
            <Pressable
              onPress={() => {
                setShowCrisisNotice(false);
                proceedWithFreeform(draft.trim());
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.crisisBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.crisisBtnText}>See activity ideas anyway</Text>
            </Pressable>
            <Pressable onPress={() => setShowCrisisNotice(false)} accessibilityRole="button">
              <Text style={styles.crisisDismiss}>Not now</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {showCrisisNotice ? (
          <Text style={styles.footerHintFaint}>Take your time — no rush to continue</Text>
        ) : selectedWords.length > 0 ? (
          <Text style={styles.footerHint}>
            Feeling {selectedWords.join(' + ')}. Let's tailor it.
          </Text>
        ) : otherOpen ? (
          <Text style={styles.footerHintFaint}>Tap "Use this" above to continue</Text>
        ) : (
          <Text style={styles.footerHintFaint}>Tap a mood to begin</Text>
        )}
        <Pressable
          disabled={moods.length === 0}
          onPress={() => router.push('/home/context')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            moods.length === 0 && styles.ctaDisabled,
            pressed && moods.length > 0 && styles.ctaPressed,
          ]}
        >
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>Next</Text>
            <Icon name="arrow-right" size={17} color={colors.white} strokeWidth={2.1} />
          </View>
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
    color: colors.amberDeep,
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
  sub: { fontSize: 15.5, color: colors.inkSoft, ...font.regular, lineHeight: 22, marginBottom: 22 },
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
  moodWord: {
    fontSize: 14,
    ...font.semibold,
    color: colors.inkSoft,
    textTransform: 'capitalize',
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  otherRowActive: { borderColor: colors.coral, backgroundColor: colors.coralTint },
  otherRowText: { flex: 1, fontSize: 13.5, ...font.medium, color: colors.inkSoft },
  otherBox: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  otherInput: {
    fontSize: 14.5,
    color: colors.ink,
    ...font.regular,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  otherSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.coralDeep,
    borderRadius: radius.pill,
    paddingVertical: 11,
    marginBottom: 8,
  },
  otherSubmitText: { fontSize: 14, ...font.bold, color: colors.white },
  otherHint: { fontSize: 12, color: colors.inkFaint, ...font.regular, lineHeight: 17 },
  crisisCard: {
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.sage,
    padding: 16,
  },
  crisisH: { fontSize: 14.5, ...font.bold, color: colors.ink, marginBottom: 6 },
  crisisBody: { fontSize: 13.5, color: colors.inkSoft, ...font.regular, lineHeight: 20, marginBottom: 14 },
  crisisBtn: {
    backgroundColor: colors.sageDeep,
    borderRadius: radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 8,
  },
  crisisBtnText: { fontSize: 13.5, ...font.semibold, color: colors.white },
  crisisDismiss: { fontSize: 12.5, ...font.medium, color: colors.inkFaint, textAlign: 'center' },
  checkInCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 20,
    ...shadow.soft,
  },
  checkInHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  checkInHeader: { fontSize: 12.5, ...font.bold, color: colors.amberDeep, textTransform: 'uppercase', letterSpacing: 0.4 },
  checkInBody: { fontSize: 14.5, ...font.medium, color: colors.ink, lineHeight: 21, marginBottom: 12 },
  checkInRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  checkInBtn: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  checkInBtnYes: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  checkInBtnYesText: { fontSize: 13.5, ...font.bold, color: colors.white },
  checkInBtnNo: { backgroundColor: 'transparent', borderColor: colors.line },
  checkInBtnNoText: { fontSize: 13.5, ...font.semibold, color: colors.inkSoft },
  checkInSkip: {
    fontSize: 12.5,
    ...font.medium,
    color: colors.inkFaint,
    textAlign: 'center',
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
    ...font.regular,
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
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ctaDisabled: { backgroundColor: colors.line },
  ctaPressed: { backgroundColor: colors.coralDeep },
  ctaText: { color: colors.white, fontSize: 17, ...font.bold },
});
