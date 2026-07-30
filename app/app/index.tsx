import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { hasCompletedOnboarding } from '../lib/onboarding';
import { hasSeenWelcome } from '../lib/welcome';

/** The app always launches at "/" — expo-router requires an actual route
 * registered for that literal path, so this is it. All it does is check
 * the onboarding + welcome flags once and hand off to the right screen via
 * Redirect. (See app/_layout.tsx for why this couldn't just be Stack's
 * `initialRouteName` — that doesn't cover the initial launch URL.)
 *
 * Order: onboarding first (if never seen), then welcome/sign-in (if
 * onboarding's done but welcome hasn't been shown yet — see app/welcome.tsx
 * for why that's a separate, one-time screen rather than buried in a tab),
 * then straight to the app. Each only ever shows once. */
export default function Index() {
  const [target, setTarget] = useState<'/onboarding' | '/welcome' | '/(tabs)/home' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const onboarded = await hasCompletedOnboarding();
        if (!onboarded) {
          setTarget('/onboarding');
          return;
        }
        const welcomed = await hasSeenWelcome();
        setTarget(welcomed ? '/(tabs)/home' : '/welcome');
      } catch {
        setTarget('/onboarding');
      }
    })();
  }, []);

  if (!target) {
    // Same background as the root layout's own loading state, so this
    // never reads as a visible flash/flicker — just a continuous fade-in.
    return <View style={{ flex: 1, backgroundColor: '#FDF6EE' }} />;
  }

  return <Redirect href={target} />;
}
