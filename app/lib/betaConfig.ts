/* ============================================================
   WhatNow — one-place beta feature flag.

   During the beta, AI planning and "Look online nearby" work
   automatically for anyone signed in, proxied through the ai-proxy
   Supabase Edge Function using Shreyansh's own Anthropic key (never
   shipped to any device) instead of requiring each person to bring
   their own. Real per-user and global daily caps are enforced
   server-side (see the beta_ai_config table + check_and_bump_beta_ai_usage
   function) — a client can't bypass them, and the cap numbers can be
   changed instantly via SQL with no redeploy.

   This flag is the client-side half of turning that off before a
   public launch (the open question in NEXT_STEPS.md §9): flip this to
   false, and every signed-in user goes back to needing their own BYOK
   key, with no other code changes required. The server can also be
   turned off independently by setting beta_ai_config.enabled = false —
   belt and suspenders, either one alone fully disables the shared path.
   ============================================================ */

export const SHARED_BETA_AI_ENABLED = true;

/** Whether the About screen shows the "bring your own key" switch/input/save
 * button for AI planning. Turned back on: the shared beta path depends on
 * sign-in, which depends on the Supabase project being up — and free-tier
 * Supabase projects auto-pause after a week idle, which just happened here.
 * BYOK has zero backend dependency (the key goes straight from the device to
 * Anthropic), so keeping this visible means AI planning still works even if
 * Supabase is ever paused, slow, or mid-restore again. Flip back to false if
 * this ever feels like one too many options during a later, calmer pass. */
export const SHOW_BYOK_AI_UI = true;
