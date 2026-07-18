import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { PRIVACY_POLICY_VERSION, useAuth } from '../../context/AuthContext';
import { usePlan } from '../../context/PlanContext';
import { ACTIVITIES, MOODS } from '../../data/activities';
import { fetchReferralInfo } from '../../lib/sync';
import { colors, font, fontDisplay, radius } from '../../lib/theme';
import { MAX_AI_PLANS_PER_DAY, MAX_EVENTS_LOOKUPS_PER_DAY } from '../../lib/usageLimits';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const {
    aiEnabled,
    setAiEnabled,
    aiApiKey,
    setAiApiKey,
    eventsApiKey,
    setEventsApiKey,
    clearLocationHistory,
    clearFeedback,
    aiPlansRemainingToday,
    eventsLookupsRemainingToday,
  } = usePlan();
  const [keyDraft, setKeyDraft] = React.useState(aiApiKey);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [eventsKeyDraft, setEventsKeyDraft] = React.useState(eventsApiKey);
  const [eventsSavedFlash, setEventsSavedFlash] = React.useState(false);
  const [historyCleared, setHistoryCleared] = React.useState(false);
  const [learningCleared, setLearningCleared] = React.useState(false);

  // Keep drafts in sync when the stored keys load (or after we save them).
  React.useEffect(() => {
    setKeyDraft(aiApiKey);
  }, [aiApiKey]);
  React.useEffect(() => {
    setEventsKeyDraft(eventsApiKey);
  }, [eventsApiKey]);

  const onSaveKey = () => {
    setAiApiKey(keyDraft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const onSaveEventsKey = () => {
    setEventsApiKey(eventsKeyDraft);
    setEventsSavedFlash(true);
    setTimeout(() => setEventsSavedFlash(false), 1800);
  };

  const onClearHistory = () => {
    Alert.alert(
      'Clear location history?',
      "This forgets the neighborhood patterns WhatNow has picked up on this device. It doesn't affect your saved activities.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearLocationHistory();
            setHistoryCleared(true);
            setTimeout(() => setHistoryCleared(false), 1800);
          },
        },
      ]
    );
  };

  const onClearFeedback = () => {
    Alert.alert(
      'Clear learning history?',
      "This forgets which activities WhatNow has noticed you tend to save or reshuffle away, so recommendations go back to neutral. It doesn't affect your saved list itself.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearFeedback();
            setLearningCleared(true);
            setTimeout(() => setLearningCleared(false), 1800);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.brand}>
        What<Text style={{ color: colors.coral }}>Now</Text>
      </Text>
      <Text style={styles.tagline}>Plans around your mood, not your calendar.</Text>

      <Text style={styles.p}>
        Most planners start with your calendar. WhatNow starts with how you actually feel.
        Tell it your mood and a few constraints, and it builds a small, tailored plan of{' '}
        {ACTIVITIES.length} hand-written activities — each with a genuine reason it might
        help right now.
      </Text>

      <AccountCard />

      <View style={styles.card}>
        <Text style={styles.cardH}>How it works</Text>
        <Step n="1" t="Pick a mood" d={`One of ${MOODS.length} feelings, from restless to content.`} />
        <Step n="2" t="Set the scene" d="Energy, time, solo or social, indoor/outdoor, budget." />
        <Step n="3" t="Get your plan" d="2–5 ideas, each with a why-this-helps. Reshuffle or save any." />
      </View>

      <View style={styles.card}>
        <View style={styles.acctHeaderRow}>
          <Icon name="shield" size={18} color={colors.ink} strokeWidth={1.7} />
          <Text style={styles.cardH}>Privacy</Text>
        </View>
        <Text style={styles.cardP}>
          Signing in is optional — everything below still works without an account, using
          only this device. If you do sign in, your saved activities, feedback
          (thumbs-up/down, accepts, rejects), and plan history are stored on WhatNow's
          servers, protected so only your signed-in account can ever read or write them —
          purely to make the app's guesses better over time and let your history follow you
          to another device. We don't sell it, share it with advertisers, or use it for
          anything beyond running WhatNow. Delete your account any time above to permanently
          erase all of it. Location is entirely separate and optional: each time you grant
          it, WhatNow briefly checks the live weather (Open-Meteo) and nearby real places
          (OpenStreetMap) to tailor that one plan — those coordinates go only to those
          services, for that one lookup. Separately, WhatNow keeps a small neighborhood-level
          pattern memory (never your exact GPS position) entirely on this device, never
          uploaded anywhere. You can wipe either memory below any time, and deleting the app
          removes them for good. Deny location and everything still works, just without the
          location-aware tuning. Full details in PRIVACY.md.
        </Text>
        <Pressable
          onPress={onClearHistory}
          accessibilityRole="button"
          accessibilityLabel="Clear location history"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={historyCleared} flashedText="Cleared" idleText="Clear location history" />
        </Pressable>
        <Pressable
          onPress={onClearFeedback}
          accessibilityRole="button"
          accessibilityLabel="Clear learning history"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={learningCleared} flashedText="Cleared" idleText="Clear learning history" />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.aiHeaderRow}>
          <Text style={styles.cardH}>AI planning (optional)</Text>
          <Switch
            value={aiEnabled}
            onValueChange={setAiEnabled}
            trackColor={{ false: colors.line, true: colors.coral }}
            thumbColor={colors.white}
          />
        </View>
        <Text style={styles.cardP}>
          When it's on, WhatNow asks an AI to compose a fresh plan for this exact moment
          instead of picking from the built-in list. Bring your own API key — it's stored
          only on this device (in the OS keychain) and sent directly from your phone to the
          provider, never through a WhatNow server. If it's off, the key is missing, or a
          request fails for any reason, WhatNow falls back to its built-in matching engine
          instantly — you'll never see a broken plan. To keep any one day's usage
          reasonable, WhatNow caps itself at {MAX_AI_PLANS_PER_DAY} AI-composed plans per
          day (resets at midnight) — after that, it simply uses the built-in engine until
          tomorrow. The same key also powers the optional "Look online nearby" search on
          your plan screen, which looks up real local events and new movies playing near
          you — that's a separate, smaller daily cap, shown next to its own search button.
        </Text>
        <TextInput
          value={keyDraft}
          onChangeText={setKeyDraft}
          placeholder="Paste your Anthropic API key"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.keyInput}
        />
        <View style={styles.keyFooterRow}>
          <Pressable
            onPress={onSaveKey}
            accessibilityRole="button"
            accessibilityLabel="Save AI API key"
            hitSlop={6}
            style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
          >
            <FlashLabel flashed={savedFlash} flashedText="Saved" idleText="Save key" />
          </Pressable>
          {aiEnabled && aiApiKey ? (
            <Text style={styles.usageText}>
              {aiPlansRemainingToday} of {MAX_AI_PLANS_PER_DAY} left today
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardH}>Live nearby events (optional)</Text>
        <Text style={styles.cardP}>
          Add a free Ticketmaster Discovery API key to see real concerts, shows, and games
          happening near you in the "Nearby right now" section of your plan. Same
          bring-your-own-key setup: stored on this device only, sent straight to
          Ticketmaster. Without a key, you'll still see real nearby venues (parks, cafes,
          and the like) from OpenStreetMap — just not ticketed events. Capped at{' '}
          {MAX_EVENTS_LOOKUPS_PER_DAY} lookups a day, resetting at midnight.
        </Text>
        <TextInput
          value={eventsKeyDraft}
          onChangeText={setEventsKeyDraft}
          placeholder="Paste your Ticketmaster API key"
          placeholderTextColor={colors.inkFaint}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.keyInput}
        />
        {eventsApiKey ? (
          <Text style={styles.usageText}>
            {eventsLookupsRemainingToday} of {MAX_EVENTS_LOOKUPS_PER_DAY} left today
          </Text>
        ) : null}
        <Pressable
          onPress={onSaveEventsKey}
          accessibilityRole="button"
          accessibilityLabel="Save Ticketmaster API key"
          hitSlop={6}
          style={({ pressed }) => [styles.keyActionBtn, pressed && { opacity: 0.7 }]}
        >
          <FlashLabel flashed={eventsSavedFlash} flashedText="Saved" idleText="Save key" />
        </Pressable>
      </View>

      <Text style={styles.credit}>
        A{' '}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://shreyanshojha.app').catch(() => {})}
        >
          Shreyansh Ojha
        </Text>{' '}
        product. Weather by Open-Meteo, places by OpenStreetMap — both free, no key.
      </Text>
      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

function AccountCard() {
  const { user, initializing, signUpWithEmail, signInWithEmail, signOut, deleteAccount } = useAuth();
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
        Create an account so your saved activities and what WhatNow learns about you follow
        you across devices — this is what lets the app's first guess get better over time,
        not just within one session.
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

      <Text style={styles.acctSkipNote}>
        You can skip this — WhatNow still works fully on this device. Signing in is what lets
        it remember you elsewhere.
      </Text>
    </View>
  );
}

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

function FlashLabel({
  flashed,
  flashedText,
  idleText,
}: {
  flashed: boolean;
  flashedText: string;
  idleText: string;
}) {
  return (
    <View style={styles.flashRow}>
      {flashed ? <Icon name="check" size={14} color={colors.coralDeep} strokeWidth={2.2} /> : null}
      <Text style={styles.keySavedText}>{flashed ? flashedText : idleText}</Text>
    </View>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepT}>{t}</Text>
        <Text style={styles.stepD}>{d}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  brand: { fontSize: 30, ...fontDisplay.bold, color: colors.ink, letterSpacing: -0.6 },
  tagline: { fontSize: 15, color: colors.amber, ...font.semibold, marginTop: 4, marginBottom: 16 },
  p: { fontSize: 15.5, color: colors.inkSoft, lineHeight: 23, marginBottom: 20 },
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
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  keyInput: {
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: colors.ink,
  },
  keyActionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  keySavedText: {
    fontSize: 14,
    ...font.semibold,
    color: colors.coralDeep,
  },
  flashRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    marginTop: 10,
    fontSize: 12.5,
    color: colors.inkFaint,
  },
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
  inviteCount: { fontSize: 12.5, ...font.semibold, color: colors.sage },
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
  acctSkipNote: { fontSize: 12.5, color: colors.inkFaint, marginTop: 12, lineHeight: 18 },
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
  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, ...font.bold, color: colors.coralDeep },
  stepT: { fontSize: 15, ...font.semibold, color: colors.ink },
  stepD: { fontSize: 13.5, color: colors.inkSoft, lineHeight: 19, marginTop: 1 },
  credit: { fontSize: 13.5, color: colors.inkFaint, lineHeight: 20, marginTop: 4 },
  link: { color: colors.coralDeep, ...font.semibold },
  version: { fontSize: 12.5, color: colors.inkFaint, marginTop: 12 },
});
