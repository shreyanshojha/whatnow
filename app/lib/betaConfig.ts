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
