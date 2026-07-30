import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { PlanProvider } from '../context/PlanContext';
import { colors } from '../lib/theme';

// NOTE: SplashScreen.preventAutoHideAsync() is deliberately NOT called here.
// On this SDK 57 / New Architecture (Fabric, bridgeless) build, calling it
// reliably hung the app on the native splash forever — JS booted fine
// (confirmed via the debugger attaching successfully) but the native splash
// module never handed control back, even with hideAsync() called from a
// hard timeout. Letting the OS dismiss the launch screen on its own (as
// soon as the first frame is drawn) avoids that native-side bug entirely,
// at the cost of a brief flash of system-font text before Fraunces/Inter
// load in. If this needs revisiting, first check whether a newer
// expo-splash-screen release has fixed the handoff for this RN version.

// Show the completion check-in nudge (lib/completionCheck.ts) as a normal
// banner even if it fires while the app is already open in the foreground —
// otherwise a locally-scheduled notification silently does nothing while
// the app happens to be active.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,
  });

  // Whether to show onboarding first vs. jump straight to the tabs is
  // decided by app/index.tsx (a Redirect), not here — this layout only
  // needs to know fonts are ready before rendering anything.
  const ready = fontsLoaded || fontError;

  // Render a real (matching-background) view rather than `null` while not
  // ready, so the OS has an actual first frame to draw as soon as it
  // dismisses the native launch screen on its own — this keeps the
  // transition looking seamless (cream background straight through) even
  // though we're no longer manually controlling the splash hide/prevent.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#FDF6EE' }} />;
  }

  // `index` is a lightweight <Redirect> (see app/index.tsx) that decides
  // onboarding vs. tabs — expo-router needs an actual route registered for
  // the literal "/" path, which `initialRouteName` alone doesn't cover (that
  // only affects in-navigator fallbacks, not the app's initial launch URL —
  // this was the actual cause of landing on "Unmatched Route" at cold launch).
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PlanProvider>
          <StatusBar style="dark" />
          {/* Every layout in this app (mood grid percentages, the bottom tab
              bar, card widths) was built for a phone-width viewport. Wide
              desktop browser windows are how this gets tested during the
              iOS TestFlight wait, and without a cap those percentage-based
              layouts stretch to fill the whole window — the mood tiles blow
              up into huge near-empty squares instead of the compact grid
              they're designed to be. Capping to a phone-sized column on web
              only (native is completely untouched) fixes that without
              touching any per-screen layout code. */}
          {Platform.OS === 'web' ? (
            // The 100vh values are real CSS on web (where this branch is the
            // only one that ever renders) but not part of RN's ViewStyle
            // types — cast at the usage site so the shared style objects
            // below stay normally typed everywhere else.
            <View style={[styles.webBackdrop, { minHeight: '100vh' } as any]}>
              <View style={[styles.webPhone, { height: '100vh' } as any]}>{stack}</View>
            </View>
          ) : (
            stack
          )}
        </PlanProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  webPhone: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    maxHeight: 900,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
