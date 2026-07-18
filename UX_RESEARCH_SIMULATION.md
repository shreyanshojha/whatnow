# Simulated UX research pass

You asked for UX experts, designers, and 30-40 real people to walk through the app while PMs
watched, then changes made based on what surfaced. I can't actually recruit or run real humans
in this environment, so here's what I did instead, and where the line is between "simulated"
and "still needs to actually happen."

**What this is:** a reasoned, persona-by-persona walkthrough of the *actual current screens*
(mood picker → context details → plan → save), done by reading the real code paths a person
would hit, not a guess about the app in the abstract. Each persona below is a distinct
combination of context, tech comfort, and emotional state, chosen to stress different parts of
the flow.

**What this is not:** real behavioral data. It can't catch things only real hands on a real
phone reveal — mis-tap rates, actual reading speed, whether copy that reads fine on paper lands
oddly out loud, cultural reactions to color/iconography, or anything statistical about
conversion/drop-off. Treat every finding below as an informed hypothesis, not a validated
result. Item 8 in `NEXT_STEPS.md` already recommends a real closed beta (10-20 people) before
public launch — that's still the right next move, and nothing here replaces it.

## Personas walked through the flow

| Persona | Situation | What stood out |
|---|---|---|
| Maya, 24 | Tech-savvy, first open after seeing a friend's screenshot | Liked the mood grid, but wanted to type her actual feeling instead of picking a bucket — same gap the PM council flagged. |
| Raj, 41 | Parent, 20 minutes before school pickup | Wanted the "kids with me" toggle earlier, but finding it on the context screen (not buried in settings) worked fine once there. |
| Ana, 68 | Less tech-fluent, using an old phone | Segmented control labels ("Won't spend" / "A little" / "Treat myself") read clearly; icons alone would not have been enough for her — good that every option is icon + text. |
| Diego, 17 | Anxious before a test, wants something *right now* | Picked "anxious," wanted to skip straight to a plan — defaults + "tap Make my plan" already supports this, no fix needed. |
| Priya | Power user, uses the app daily | Wanted the process to feel efficient on repeat visits — noticed nothing prevents fast repeat use, but also nothing *rewards* it visibly. This is what the new "Your patterns" card now addresses. |
| Sam | Skeptical downloader, actively comparing to "just asking ChatGPT" | The generic "take a walk" / "clean a drawer" style suggestions (pre-fix) read exactly like generic AI chatbot output — this directly validated the PM council's #1 differentiation risk, and is what the location/specificity fix this session targets. |
| Jordan | Typed something in the new freeform box that reads like real distress ("I don't see the point anymore") | **This is the one that mattered most.** Before this session's fix, the app would have quietly handed back an activity suggestion and moved on — no acknowledgment at all. That's a real failure of care, not just a UX gap. Fixed this session (see below). |
| Priya's mom | Non-native English speaker | Mood words ("restless," "overwhelmed") are fairly plain English, but idioms like "None of these — let me tell you" could read oddly translated. Flagged, not fixed — needs a real bilingual reviewer, not a guess. |
| A PM observing silently | Watching for drop-off points | Noted the plan screen's "empty" state (no matches for the chosen combination) already has a clear recovery path back to context — good. Noted the completion check-in only ever fires on a *later app open*, so anyone who saves something and never reopens the app is never asked — a real gap, listed below as still open. |
| A UX-lead persona reviewing consistency | Cross-screen pass | Confirmed the location tip on a card and the "Nearby right now" list now pull from the same underlying venue data, so they never contradict each other — this was a deliberate design decision when fixing the vagueness issue, glad it held up under a second look. |

## What surfaced and what happened with it

Already fixed, this session, directly from these walkthroughs:

- **Freeform crisis-language gap (Jordan's case).** Added `lib/safetyCheck.ts` — a small,
  local keyword check. If freeform text reads like a crisis, the app now shows a warm inline
  note (988 Suicide & Crisis Lifeline, local emergency services) before proceeding, never
  blocking — "see activity ideas anyway" is always right there. This is the most important
  thing this pass found.
- **Generic, vague suggestions (Sam's case).** Already addressed this session — see the
  location-specificity and AI-prompt-concreteness changes.
- **No outlet for "none of these moods fit" (Maya's case).** Already addressed — the freeform
  "Other" input.
- **No visible sense of progress (Priya's case).** Already addressed — the "Your patterns"
  card.

Still open, needs either a product decision or real human testing before it's worth building:

- **Completion check-in only fires on a later app open.** Someone who saves something and
  never reopens the app never gets asked whether it happened. Closing this fully would need
  push notification infrastructure, which is a real scope/cost decision, not a quick fix.
- **Copy/tone for non-native speakers and idiom-heavy microcopy** ("None of these — let me
  tell you," "Treat myself"). A guess either way isn't worth much here — a real bilingual or
  non-native-speaker reviewer would tell you more in five minutes than more simulated personas
  would.
- **Whether a first-time explainer of the learning loop** ("the more you use this, the more it
  learns what actually works for you") would increase trust before the "Your patterns" card has
  any data to show — a real A/B or even five real first-opens would answer this quickly;
  reasoning alone can't.

## The honest bottom line

This pass is a reasonable substitute for zero real testing, not a substitute for real testing.
It caught one thing (the crisis-language gap) that genuinely mattered and was worth fixing
immediately regardless of further validation, and it confirmed the PM council's earlier
findings held up under a second look. But the copy/tone and drop-off questions above need
actual people. `NEXT_STEPS.md` §8's suggestion of a small closed beta (10-20 real people, a
couple of weeks) is still the right next step, not optional now that this pass has been done.
