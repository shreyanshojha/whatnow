import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountCard } from '../components/AccountCard';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { setSeenWelcome } from '../lib/welcome';
import { colors, font, fontDisplay, radius } from '../lib/theme';

/* ============================================================
   WhatNow — the sign-in screen, shown once, right after onboarding.

   Sign-in unlocks AI-composed plans automatically via WhatNow's shared
   beta backend (see lib/betaConfig.ts) — genuinely no API key needed, just
   an account. That's a real, free upgrade over the on-device matching
   engine, but it used to live at the bottom of the About tab: a third of
   people probably never even scrolled to it, and everyone else
   experienced "AI planning" as something that needed a key they had to
   go find and paste in, when for a signed-in person it just works.

   This screen puts that choice at the front of the experience instead —
   right after onboarding, before the mood picker — without ever making
   it mandatory. WhatNow's whole design principle (see PRIVACY.md, the
   About screen's copy) is that everything works fully on-device without
   an account; "Skip for now" is exactly as prominent as signing in, and
   this screen only ever shows once (see lib/welcome.ts) — nobody gets
   nagged on every launch. It's still reachable later from the About tab
   for anyone who skips now and changes their mind.
   ============================================================ */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, initializing } = useAuth();
  const advancedRef = React.useRef(false);

  const advance = React.useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    setSeenWelcome().finally(() => router.replace('/(tabs)/home'));
  }, [router]);

  // Once someone actually signs in on this screen, there's nothing left
  // for them to do here — move on to the app automatically instead of
  // making them also tap a separate "Continue" button.
  React.useEffect(() => {
    if (!initializing && user) advance();
  }, [initializing, user, advance]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconBubble}>
        <Icon name="inspired" size={30} color={colors.coralDeep} strokeWidth={1.7} />
      </View>
      <Text style={styles.h1}>One more thing before you start</Text>
      <Text style={styles.sub}>
        Sign in and AI-composed plans work automatically — genuinely no API key to find or
        paste in. It's how WhatNow remembers what works for you, too.
      </Text>

      <AccountCard />

      <Pressable
        onPress={advance}
        accessibilityRole="button"
        accessibilityLabel="Skip for now"
        style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.skipText}>Skip for now — WhatNow works fully without an account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glowPeach,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  h1: {
    fontSize: 25,
    ...fontDisplay.bold,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 8,
  },
  sub: { fontSize: 15, color: colors.inkSoft, ...font.regular, lineHeight: 22, marginBottom: 22 },
  skip: { paddingVertical: 16, alignItems: 'center' },
  skipText: {
    fontSize: 13.5,
    color: colors.inkFaint,
    ...font.medium,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
