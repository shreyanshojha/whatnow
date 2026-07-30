import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/Icon';
import { setCompletedOnboarding } from '../lib/onboarding';
import { colors, font, fontDisplay, radius } from '../lib/theme';

// A starting guess only — corrected the moment the carousel's own wrapper
// actually lays out (see onLayout below). On native this is the real
// screen width, so nothing changes there. On web this app is capped to a
// phone-width column (see app/_layout.tsx's webPhone wrapper) that's
// usually much narrower than the full browser window Dimensions.get
// reports — sizing each slide and every scrollTo offset off the wrong
// (much larger) window width was why "Next" silently did nothing on web:
// it was scrolling by a whole browser-window's worth of pixels inside a
// ~480px-wide viewport, which either overshot every slide or never moved
// the visible frame at all, forcing people to tap Skip instead.
const { width: INITIAL_WIDTH } = Dimensions.get('window');

interface Slide {
  icons: IconName[];
  eyebrow: string;
  title: string;
  body: string;
  tint: string;
}

const SLIDES: Slide[] = [
  {
    icons: ['inspired'],
    eyebrow: 'Welcome to WhatNow',
    title: "Plans around your mood, not your calendar.",
    body: "Most apps ask what you're doing. We ask how you're feeling — and start there.",
    tint: colors.glowPeach,
  },
  {
    icons: ['clock', 'social-group', 'budget-cheap'],
    eyebrow: 'A few quick taps',
    title: 'Add what’s true right now.',
    body: "Time, company, indoor or out, budget — a few taps, not a questionnaire.",
    tint: colors.glowPink,
  },
  {
    icons: ['thumb-up', 'thumb-down', 'user'],
    eyebrow: 'It learns you',
    title: 'Tell it when a plan lands — or doesn’t.',
    body: "Thumbs up or down teaches WhatNow what works for you. Sign in and it follows you to any device.",
    tint: colors.bg2,
  },
  {
    icons: ['venue-cinema', 'ticket', 'compass'],
    eyebrow: 'Beyond the built-in list',
    title: 'Real events and new movies, on demand.',
    body: '"Look online nearby" searches the live web for events and new movies close to you — even things too new for any database.',
    tint: colors.glowPeach,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const [index, setIndex] = React.useState(0);
  const [pageWidth, setPageWidth] = React.useState(INITIAL_WIDTH);

  const finish = React.useCallback(() => {
    setCompletedOnboarding().finally(() => router.replace('/(tabs)/home'));
  }, [router]);

  const onCarouselLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== pageWidth) setPageWidth(w);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * pageWidth, animated: true });
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        style={[styles.skip, { top: insets.top + 12 }]}
        hitSlop={10}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onLayout={onCarouselLayout}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: pageWidth }]}>
            <View style={[styles.artWrap, { backgroundColor: slide.tint }]}>
              <View style={styles.iconRow}>
                {slide.icons.map((name, ii) => (
                  <View
                    key={ii}
                    style={[
                      styles.iconBubble,
                      slide.icons.length === 1 && styles.iconBubbleSolo,
                      ii > 0 && { marginLeft: -10 },
                    ]}
                  >
                    <Icon name={name} size={slide.icons.length === 1 ? 46 : 30} color={colors.coralDeep} strokeWidth={1.7} />
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.nextText}>{isLast ? 'Get started' : 'Next'}</Text>
          <Icon name="arrow-right" size={17} color={colors.white} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  skip: { position: 'absolute', right: 20, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14.5, ...font.semibold, color: colors.inkFaint },
  slide: { flex: 1, paddingHorizontal: 28, paddingTop: 100, alignItems: 'flex-start' },
  artWrap: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconBubbleSolo: { width: 88, height: 88, borderRadius: 44 },
  eyebrow: { fontSize: 13, ...font.bold, color: colors.coralDeep, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 },
  title: { fontSize: 27, ...fontDisplay.bold, color: colors.ink, lineHeight: 34, marginBottom: 14 },
  body: { fontSize: 15.5, color: colors.inkSoft, lineHeight: 23 },
  footer: { paddingHorizontal: 28, paddingTop: 10 },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.coralDeep, width: 20 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.coralDeep,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  nextText: { fontSize: 16, ...font.bold, color: colors.white },
});
