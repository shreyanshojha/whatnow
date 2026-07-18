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
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Bump this whenever PRIVACY.md changes meaningfully — recorded against the
 * account the moment consent is captured, so we always know which version of
 * the policy someone actually agreed to. Keep in sync with the version note
 * at the top of PRIVACY.md. */
export const PRIVACY_POLICY_VERSION = '2026-07-17-v1';

const PENDING_CONSENT_KEY = 'whatnow.pendingPrivacyConsent.v1';

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
  signUpWithEmail: (email: string, password: string, acceptedPrivacyVersion: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
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
            const pending = await AsyncStorage.getItem(PENDING_CONSENT_KEY);
            if (pending) {
              await writeConsent(pending);
              await AsyncStorage.removeItem(PENDING_CONSENT_KEY);
            }
          } catch {
            // ignore — worst case consent gets recorded a little later
          }
        })();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (
    email: string,
    password: string,
    acceptedPrivacyVersion: string
  ): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendlyAuthError(error.message) };
    if (data.session) {
      // Confirmed immediately (email confirmations off) — record consent now.
      await writeConsent(acceptedPrivacyVersion);
    } else {
      // Awaiting email confirmation — no session yet to attach consent to.
      // Stash it and apply it the moment a session shows up (see the
      // onAuthStateChange handler above), so consent is never lost.
      try {
        await AsyncStorage.setItem(PENDING_CONSENT_KEY, acceptedPrivacyVersion);
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

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { error: 'Not signed in.' };
      const res = await fetch(`${(supabase as any).supabaseUrl}/functions/v1/delete-account`, {
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
