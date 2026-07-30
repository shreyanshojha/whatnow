/* ============================================================
   WhatNow — account state (Supabase Auth).

   Accounts are real and non-negotiable (unlike the AI/events keys,
   which stay bring-your-own-key and fully optional): every person
   using WhatNow signs in so their saved activities and feedback
   history can follow them across devices and power real
   personalization over time. See lib/supabase.ts for the client
   and lib/sync.ts for what gets synced.

   Signing out or never signing in doesn't break anything — the app
   still works fully on-device (see PlanContext), it just won't sync.
   That graceful-degradation posture carries over from the AI/events
   features rather than being new here.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { SUPABASE_URL, supabase } from '../lib/supabase';

// Lets the OAuth browser flow (Google) hand control back to the app instead
// of leaving the browser tab open after redirecting — recommended by both
// Expo's and Supabase's own docs for this exact pattern.
WebBrowser.maybeCompleteAuthSession();

/** Bump this whenever PRIVACY.md changes meaningfully — recorded against the
 * account the moment consent is captured, so we always know which version of
 * the policy someone actually agreed to. Keep in sync with the version note
 * at the top of PRIVACY.md. */
export const PRIVACY_POLICY_VERSION = '2026-07-17-v1';

const PENDING_CONSENT_KEY = 'whatnow.pendingPrivacyConsent.v1';
const PENDING_REFERRAL_KEY = 'whatnow.pendingReferralCode.v1';

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True only while the initial stored session is being restored on app
   * launch — not a general-purpose loading flag for every auth action. */
  initializing: boolean;
  /** `acceptedPrivacyVersion` is required — sign-up always represents a
   * deliberate, recorded acceptance of the current privacy policy, captured
   * against the account (immediately if email confirmation is off, or the
   * moment a session exists if confirmation is required — see the pending
   * flow below). */
  /** `inviteCode` is optional — if provided and email confirmation is off,
   * it's redeemed immediately after account creation; if a session isn't
   * available yet (confirmation required), it's stashed the same way
   * pending consent is, and redeemed the moment a session shows up. */
  signUpWithEmail: (
    email: string,
    password: string,
    acceptedPrivacyVersion: string,
    inviteCode?: string
  ) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  /** Opens a browser-based Google OAuth flow via Supabase, then hands the
   * resulting session back the same way email sign-in does. Requires the
   * Google provider to be enabled (with a real OAuth client id/secret) in
   * the Supabase dashboard first — see NEXT_STEPS.md. */
  signInWithGoogle: (acceptedPrivacyVersion: string) => Promise<AuthResult>;
  /** Native "Sign in with Apple" (not a web redirect) — required by Apple's
   * own guidelines whenever another social sign-in is offered. iOS only;
   * callers should check `Platform.OS === 'ios'` before showing this as an
   * option at all. Requires the "Sign in with Apple" capability enabled in
   * Xcode/the Apple Developer portal (a paid Developer account) and the
   * Apple provider enabled in Supabase — see NEXT_STEPS.md. */
  signInWithApple: (acceptedPrivacyVersion: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Calls the delete-account Edge Function (see supabase/functions),
   * which verifies the caller's own JWT server-side before deleting the
   * auth user — cascading to every row tied to their account. Required
   * for App Store review (guideline 5.1.1(v)) once this ships there. */
  deleteAccount: () => Promise<AuthResult>;
}

const Ctx = createContext<AuthContextValue | null>(null);

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return "That email/password combination doesn't match an account.";
  if (m.includes('already registered') || m.includes('already exists')) {
    return 'An account with that email already exists — try signing in instead.';
  }
  if (m.includes('password') && m.includes('6')) return 'Password needs to be at least 6 characters.';
  if (m.includes('network') || m.includes('fetch')) return "Couldn't reach the server — check your connection.";
  return message;
}

/** Writes the recorded consent onto this account's profile row. Fails
 * silently (like every sync write in this app) — worst case, we retry on
 * the next sign-in via the pending-consent check below rather than ever
 * blocking or breaking sign-up/sign-in itself. */
async function writeConsent(version: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase
      .from('profiles')
      .update({ privacy_policy_version: version, privacy_accepted_at: new Date().toISOString() })
      .eq('id', userId);
  } catch {
    // ignore — see the pending-consent retry in AuthProvider's auth-state effect
  }
}

/** Calls the redeem-referral Edge Function with the caller's own JWT — a
 * service-role write is required since it also bumps *someone else's*
 * referral_count, which normal RLS on profiles rightly forbids from any
 * other account. Fails silently by design (like writeConsent above): an
 * invite code that doesn't redeem shouldn't ever block or break sign-up. */
async function redeemPendingCode(code: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(`${SUPABASE_URL}/functions/v1/redeem-referral`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    // ignore — worth retrying isn't worth the complexity here; a missed
    // redemption just means one fewer referral counted, never a broken app
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Tracks whether we've already resolved the pending-consent flow, so a
  // token refresh (which also fires onAuthStateChange) doesn't retry it
  // needlessly on every subsequent event.
  const pendingCheckedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user && !pendingCheckedRef.current) {
        pendingCheckedRef.current = true;
        (async () => {
          try {
            const pendingConsent = await AsyncStorage.getItem(PENDING_CONSENT_KEY);
            if (pendingConsent) {
              await writeConsent(pendingConsent);
              await AsyncStorage.removeItem(PENDING_CONSENT_KEY);
            }
            const pendingCode = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
            if (pendingCode) {
              await redeemPendingCode(pendingCode);
              await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
            }
          } catch {
            // ignore — worst case consent/referral get recorded a little later
          }
        })();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (
    email: string,
    password: string,
    acceptedPrivacyVersion: string,
    inviteCode?: string
  ): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendlyAuthError(error.message) };
    const trimmedCode = inviteCode?.trim();
    if (data.session) {
      // Confirmed immediately (email confirmations off) — record consent
      // and redeem any invite code right away.
      await writeConsent(acceptedPrivacyVersion);
      if (trimmedCode) await redeemPendingCode(trimmedCode);
    } else {
      // Awaiting email confirmation — no session yet to attach either to.
      // Stash both and apply them the moment a session shows up (see the
      // onAuthStateChange handler above), so neither is ever lost.
      try {
        await AsyncStorage.setItem(PENDING_CONSENT_KEY, acceptedPrivacyVersion);
        if (trimmedCode) await AsyncStorage.setItem(PENDING_REFERRAL_KEY, trimmedCode);
      } catch {
        // ignore
      }
    }
    return { error: null };
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? friendlyAuthError(error.message) : null };
  };

  const signInWithGoogle = async (acceptedPrivacyVersion: string): Promise<AuthResult> => {
    try {
      // WhatNow's own custom scheme (see app.json's "scheme") — Google
      // redirects back to this URL once the person approves the sign-in,
      // and WebBrowser hands control back to the app right there.
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return { error: friendlyAuthError(error?.message ?? 'Could not start Google sign-in.') };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        // Cancelled by the person — not a real error, don't show one.
        return { error: null };
      }

      // This project's Supabase instance actually redirects back with
      // tokens straight in the URL fragment ("#access_token=...&refresh_
      // token=...", the implicit-flow shape) rather than a "?code=..."
      // query param — confirmed by inspecting a real redirect during
      // testing. Linking.parse only reads query params, so a `code`-only
      // check here silently failed every real sign-in with "no session
      // came back" even though Google + Supabase had both already
      // succeeded. Handle both shapes: prefer the PKCE `code` if a future
      // Supabase config change starts sending one, otherwise fall back to
      // reading the fragment directly and setting the session from it.
      const { queryParams } = Linking.parse(result.url);
      const authError = queryParams?.error_description ?? queryParams?.error;
      if (authError) return { error: friendlyAuthError(String(authError)) };

      const code = queryParams?.code as string | undefined;
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) return { error: friendlyAuthError(exchangeErr.message) };
        await writeConsent(acceptedPrivacyVersion);
        return { error: null };
      }

      const hashIndex = result.url.indexOf('#');
      const hashParams = new URLSearchParams(hashIndex >= 0 ? result.url.slice(hashIndex + 1) : '');
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      if (!access_token || !refresh_token) {
        return { error: 'Google sign-in finished, but no session came back — try again.' };
      }
      const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (setErr) return { error: friendlyAuthError(setErr.message) };
      await writeConsent(acceptedPrivacyVersion);
      return { error: null };
    } catch {
      return { error: "Couldn't reach Google — check your connection and try again." };
    }
  };

  const signInWithApple = async (acceptedPrivacyVersion: string): Promise<AuthResult> => {
    if (Platform.OS !== 'ios') return { error: 'Sign in with Apple is only available on iOS.' };
    try {
      // A random nonce, hashed with SHA-256 before being sent to Apple —
      // Apple returns it unhashed inside the identity token, and Supabase
      // verifies it matches on its end. Standard Sign in with Apple +
      // Supabase pairing, not WhatNow-specific.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        return { error: "Apple didn't return a usable sign-in — try again." };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return { error: friendlyAuthError(error.message) };
      await writeConsent(acceptedPrivacyVersion);
      return { error: null };
    } catch (e: any) {
      // Apple's own SDK throws a specific code when the person cancels —
      // treat that as a silent no-op, not an error banner.
      if (e?.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: "Couldn't complete Apple sign-in — try again." };
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { error: 'Not signed in.' };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body?.error ?? 'Could not delete account — try again.' };
      }
      await supabase.auth.signOut();
      return { error: null };
    } catch {
      return { error: "Couldn't reach the server — check your connection and try again." };
    }
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    initializing,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    deleteAccount,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within an AuthProvider');
  return v;
}
