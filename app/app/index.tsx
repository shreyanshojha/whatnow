import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { hasCompletedOnboarding } from '../lib/onboarding';

/** The app always launches at "/" — expo-router requires an actual route
 * registered for that literal path, so this is it. All it does is check
 * the onboarding flag once and hand off to the right screen via Redirect.
 * (See app/_layout.tsx for why this couldn't just be Stack's
 * `initialRouteName` — that doesn't cover the initial launch URL.) */
export default function Index() {
  const [target, setTarget] = useState<'/onboarding' | '/(tabs)/home' | null>(null);

  useEffect(() => {
    hasCompletedOnboarding()
      .then((done) => setTarget(done ? '/(tabs)/home' : '/onboarding'))
      .catch(() => setTarget('/onboarding'));
  }, []);

  if (!target) {
    // Same background as the root layout's own loading state, so this
    // never reads as a visible flash/flicker — just a continuous fade-in.
    return <View style={{ flex: 1, backgroundColor: '#FDF6EE' }} />;
  }

  return <Redirect href={target} />;
}
