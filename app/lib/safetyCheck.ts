/* ============================================================
   WhatNow — a small, local, keyword-based safety net for the
   freeform "type what you want" input (lib/moodMatch.ts).

   This exists because of a gap a simulated persona walkthrough
   surfaced (see the UX research pass): once freeform text is a
   real input, someone in real crisis could plausibly type
   something like "I want to die" expecting an activity suggestion
   back — and getting one, with no acknowledgment at all, would be
   a genuine failure of care, not just a missed opportunity.

   This is intentionally minimal: a local substring/regex check,
   nothing sent anywhere, no attempt to diagnose or be clever about
   it. False positives (flagging something that wasn't actually a
   crisis) are treated as the safe failure mode — worst case, someone
   sees an extra, dismissible note and taps past it.
   ============================================================ */

const CRISIS_PATTERNS: RegExp[] = [
  /kill myself/i,
  /killing myself/i,
  /suicid/i, // suicide, suicidal
  /want(ed)? to die/i,
  /wish i (was|were) dead/i,
  /end(ing)? my life/i,
  /don'?t want to (be alive|live)/i,
  /no reason to live/i,
  /can'?t (go on|do this anymore)/i,
  /hurt(ing)? myself/i,
  /self.?harm/i,
];

/** Returns true if the given freeform text contains language that plausibly
 * signals a mental health crisis. Deliberately conservative in scope (a
 * small fixed list) rather than clever — the goal is to catch the clearest
 * cases, not to build a clinical screening tool. */
export function checkForCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}
