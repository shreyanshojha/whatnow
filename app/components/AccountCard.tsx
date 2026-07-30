/* ============================================================
   WhatNow — account sign-in/sign-up card.

   Pulled out of app/(tabs)/about.tsx so the exact same component can be
   reused on the new app/welcome.tsx screen (shown once, right after
   onboarding — see that file for why) as well as staying put on the About
   tab for anyone who skipped it and wants to sign in later. One
   implementation, two entry points, never drifts out of sync.

   Signing in is what unlocks AI planning + "Look online nearby"
   automatically via WhatNow's shared beta backend (see lib/betaConfig.ts) —
   no API key required. It's also still fully optional: WhatNow works
   completely on-device without an account, and every caller of this
   component should always pair it with an obvious way to skip.
   ============================================================ */

import * as AppleAuthentication from 'expo-apple-authentication';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { PRIVACY_POLICY_VERSION, useAuth } from '../context/AuthContext';
import { fetchReferralInfo } from '../lib/sync';
import { colors, font, fontDisplay, radius } from '../lib/theme';

export function AccountCard() {
  const {
    user,
    initializing,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    deleteAccount,
  } = useAuth();
  const [mode, setMode] = React.useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [consented, setConsented] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    if (mode === 'signUp' && !consented) {
      setError('Please accept the privacy policy to create an account.');
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === 'signUp'
          ? await signUpWithEmail(email, password, PRIVACY_POLICY_VERSION, inviteCode)
          : await signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setPassword('');
      }
    } finally {
      setBusy(false);
    }
  };

  // Google/Apple are meant to be a single tap, unlike the email form above —
  // gating them behind the same separate checkbox used to mean tapping
  // "Continue with Google" with the checkbox (easy to miss, off-screen on
  // some layouts) still unchecked did visibly nothing beyond a small error
  // line, which read as "Google sign-in is broken." Consent is instead
  // implied by tapping a button whose caption says exactly that (see the
  // "By continuing..." line under these buttons) — same pattern used by
  // most apps' social sign-in rows. signInWithGoogle/signInWithApple still
  // record the actual consent version once the provider confirms success.
  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await signInWithGoogle(PRIVACY_POLICY_VERSION);
      if (result.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  };

  const onApple = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await signInWithApple(PRIVACY_POLICY_VERSION);
      if (result.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAccount = () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), 4000);
      return;
    }
    setDeleteError(null);
    setDeleteBusy(true);
    deleteAccount()
      .then((result) => {
        if (result.error) setDeleteError(result.error);
        setDeleteArmed(false);
      })
      .finally(() => setDeleteBusy(false));
  };

  if (initializing) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.coralDeep} />
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.card}>
        <View style={styles.acctHeaderRow}>
          <Icon name="user" size={20} color={colors.ink} strokeWidth={1.8} />
          <Text style={styles.cardH}>Account</Text>
        </View>
        <Text style={styles.cardP}>
          Signed in as <Text style={font.semibold}>{user.email}</Text>. Your saved activities
          and learning history follow you to any device you sign into.
        </Text>

        <InviteFriends />

        <Pressable
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={6}
          style={({ pressed }) => [styles.acctBtn, pressed && { opacity: 0.7 }]}
        >
          <Icon name="log-out" size={16} color={colors.inkSoft} strokeWidth={1.9} />
          <Text style={styles.acctBtnText}>Sign out</Text>
        </Pressable>
        <Pressable
          onPress={onDeleteAccount}
          disabled={deleteBusy}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          hitSlop={6}
          style={({ pressed }) => [
            styles.acctBtn,
            deleteArmed && styles.acctBtnDanger,
            pressed && { opacity: 0.7 },
          ]}
        >
          {deleteBusy ? (
            <ActivityIndicator size="small" color={colors.inkSoft} />
          ) : (
            <Icon
              name="trash"
              size={16}
              color={deleteArmed ? colors.white : colors.inkSoft}
              strokeWidth={1.9}
            />
          )}
          <Text style={[styles.acctBtnText, deleteArmed && { color: colors.white }]}>
            {deleteArmed ? 'Tap again to permanently delete' : 'Delete account'}
          </Text>
        </Pressable>
        {deleteError ? <Text style={styles.acctError}>{deleteError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.acctHeaderRow}>
        <Icon name="user" size={20} color={colors.ink} strokeWidth={1.8} />
        <Text style={styles.cardH}>Account</Text>
      </View>
      <Text style={styles.cardP}>
        Create an account so your saved activities and learning follow you across devices —
        and your very first guess gets better over time.
      </Text>

      <View style={styles.acctModeRow}>
        <Pressable
          onPress={() => setMode('signUp')}
          style={[styles.acctModeBtn, mode === 'signUp' && styles.acctModeBtnActive]}
        >
          <Text style={[styles.acctModeText, mode === 'signUp' && styles.acctModeTextActive]}>
            Create account
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('signIn')}
          style={[styles.acctModeBtn, mode === 'signIn' && styles.acctModeBtnActive]}
        >
          <Text style={[styles.acctModeText, mode === 'signIn' && styles.acctModeTextActive]}>
            Sign in
          </Text>
        </Pressable>
      </View>

      <View style={styles.acctFieldRow}>
        <Icon name="mail" size={16} color={colors.inkFaint} strokeWidth={1.7} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.acctInput}
        />
      </View>
      <View style={styles.acctFieldRow}>
        <Icon name="lock" size={16} color={colors.inkFaint} strokeWidth={1.7} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'signUp' ? 'Create a password (6+ characters)' : 'Password'}
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.acctInput}
        />
      </View>

      {mode === 'signUp' ? (
        <View style={styles.acctFieldRow}>
          <Icon name="user" size={16} color={colors.inkFaint} strokeWidth={1.7} />
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Invite code (optional)"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.acctInput}
          />
        </View>
      ) : null}

      {mode === 'signUp' ? (
        <Pressable
          onPress={() => setConsented(!consented)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          style={styles.consentRow}
        >
          <View style={[styles.consentBox, consented && styles.consentBoxChecked]}>
            {consented ? <Icon name="check" size={12} color={colors.white} strokeWidth={2.4} /> : null}
          </View>
          <Text style={styles.consentText}>
            I've read and agree to the Privacy section below, including that my saved
            activities and feedback are stored on WhatNow's servers to personalize my plans.
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.acctError}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={mode === 'signUp' ? 'Create account' : 'Sign in'}
        style={({ pressed }) => [styles.acctSubmitBtn, pressed && { opacity: 0.85 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.acctSubmitText}>
              {mode === 'signUp' ? 'Create account' : 'Sign in'}
            </Text>
            <Icon name="arrow-right" size={16} color={colors.white} strokeWidth={2} />
          </>
        )}
      </Pressable>

      <View style={styles.acctDividerRow}>
        <View style={styles.acctDividerLine} />
        <Text style={styles.acctDividerText}>or</Text>
        <View style={styles.acctDividerLine} />
      </View>

      <Pressable
        onPress={onGoogle}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={mode === 'signUp' ? 'Create account with Google' : 'Sign in with Google'}
        style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </Pressable>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === 'signUp'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.md}
          style={styles.appleBtn}
          onPress={onApple}
        />
      ) : null}

      {mode === 'signUp' ? (
        <Text style={styles.socialConsentNote}>
          By continuing with Google{appleAvailable ? ' or Apple' : ''}, you agree to the Privacy
          section below.
        </Text>
      ) : null}

      <Text style={styles.acctSkipNote}>
        You can skip this — WhatNow still works fully on this device. Signing in is what lets
        it remember you elsewhere.
      </Text>
    </View>
  );
}

/** A small, upbeat mirror of someone's own on-device history — "your
 * patterns," not admin analytics. Built entirely from data that already
 * exists in lib/feedback.ts's local log; nothing new is collected to show
 * it, and it disappears cleanly for anyone with no history yet. */
function InviteFriends() {
  const [info, setInfo] = React.useState<{ code: string; count: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchReferralInfo().then((result) => {
      if (!cancelled) {
        setInfo(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onShare = () => {
    if (!info) return;
    Share.share({
      message: `I've been using WhatNow to figure out what to do when I can't decide — tell it your mood, it builds a plan. Sign up and enter my invite code ${info.code} to link up: https://whatnow.app`,
    }).catch(() => {});
  };

  if (loading || !info) return null;

  return (
    <View style={styles.inviteBox}>
      <View style={styles.inviteHeaderRow}>
        <Text style={styles.inviteLabel}>Your invite code</Text>
        {info.count > 0 ? (
          <Text style={styles.inviteCount}>
            {info.count} friend{info.count === 1 ? '' : 's'} joined
          </Text>
        ) : null}
      </View>
      <Text style={styles.inviteCode}>{info.code}</Text>
      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share invite code"
        style={({ pressed }) => [styles.inviteShareBtn, pressed && { opacity: 0.8 }]}
      >
        <Icon name="arrow-right" size={15} color={colors.white} strokeWidth={2} />
        <Text style={styles.inviteShareText}>Invite a friend</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardH: { fontSize: 17, ...font.bold, color: colors.ink, marginBottom: 12 },
  cardP: { fontSize: 14.5, color: colors.inkSoft, lineHeight: 21 },
  acctHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inviteBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 14,
  },
  inviteHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inviteLabel: { fontSize: 12.5, ...font.semibold, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.3 },
  inviteCount: { fontSize: 12.5, ...font.semibold, color: colors.sageDeep },
  inviteCode: { fontSize: 22, ...fontDisplay.bold, color: colors.coralDeep, letterSpacing: 2, marginTop: 6, marginBottom: 12 },
  inviteShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.coralDeep,
    borderRadius: radius.md,
    paddingVertical: 11,
  },
  inviteShareText: { fontSize: 14, ...font.bold, color: colors.white },
  acctModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 3,
    marginTop: 6,
    marginBottom: 14,
  },
  acctModeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.md - 3 },
  acctModeBtnActive: { backgroundColor: colors.card },
  acctModeText: { fontSize: 13.5, ...font.semibold, color: colors.inkFaint },
  acctModeTextActive: { color: colors.coralDeep },
  acctFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  acctInput: { flex: 1, paddingVertical: 12, fontSize: 14.5, color: colors.ink },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 12 },
  consentBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentBoxChecked: { backgroundColor: colors.coralDeep, borderColor: colors.coralDeep },
  consentText: { flex: 1, fontSize: 13, color: colors.inkSoft, lineHeight: 18.5 },
  acctError: { fontSize: 13, color: colors.coralDeep, marginBottom: 10 },
  acctSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.coralDeep,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  acctSubmitText: { fontSize: 15, ...font.bold, color: colors.white },
  acctDividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 12 },
  acctDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  acctDividerText: { fontSize: 12, color: colors.inkFaint, ...font.semibold },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginBottom: 10,
  },
  socialBtnText: { fontSize: 14.5, ...font.semibold, color: colors.ink },
  appleBtn: { width: '100%', height: 46, marginBottom: 10 },
  acctSkipNote: { fontSize: 12.5, color: colors.inkFaint, marginTop: 12, lineHeight: 18 },
  socialConsentNote: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 10,
    lineHeight: 17,
    textAlign: 'center',
  },
  acctBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
  },
  acctBtnDanger: {
    backgroundColor: colors.coralDeep,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  acctBtnText: { fontSize: 14, ...font.semibold, color: colors.inkSoft },
});
