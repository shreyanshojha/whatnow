/* ============================================================
   WhatNow — Supabase client (accounts + server-side sync).

   Unlike the AI/events keys (bring-your-own-key, entered by the person
   using the app), this project URL + publishable key are WhatNow's own
   backend — they're meant to ship in the client, the same way every
   Supabase app embeds them. Row Level Security (see the migration in
   Supabase) is what actually protects data: every table only allows a
   signed-in user to read or write their own rows (auth.uid() = user_id).

   This client is used for:
   - Auth (sign up / sign in / sign out) — see context/AuthContext.tsx
   - Syncing saved activities + feedback events for a signed-in user, so
     personalization can follow them across devices (see lib/sync.ts)

   Everything that works fully signed-out today (deterministic engine,
   on-device saved list, on-device feedback log) keeps working exactly
   as before — signing in adds server sync on top, it doesn't replace
   the local-first fallback.
   ============================================================ */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = 'https://foxaoemjsrwozjnucgfj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_knkBrkubczJJ-xo7QBUvSQ_MUnOkTtp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
