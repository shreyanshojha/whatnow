# Shipping WhatNow: what's actually left

Once you've tried the app locally (see `TESTING.md`) and you're ready to put it in front of
real people, here's what remains — roughly in the order you'd want to do it, with the
smaller/free steps first so you're not spending money before you've confirmed you like where
this is headed.

## 0. What's already done

Worth knowing before reading the rest of this: the backend is real and already running (a
Supabase project under your own account — email/password accounts, saved activities, feedback
learning, referrals, account deletion all work end-to-end right now). App icons, splash
screen, bundle identifiers (`app.shreyanshojha.whatnow`), and location permission strings are
already configured in `app/app.json`. There is no company-wide "AI API key" to set up — AI
planning and live events are bring-your-own-key per person using the app, so nothing to
provision on your end for that to work as designed.

Most recently added, directly from your feedback: suggestions now name a real, distance-ranked
nearby place instead of being vague ("walk to Riverside Park," not "take a walk"), and the AI
prompt now requires concrete objects generally, not just places. A "Your patterns" card (About
screen) shows plans made, streak, and thumbs-up count from data already being collected — no
new tracking. A freeform "None of these — let me tell you" input lets someone type exactly how
they feel instead of picking from 12 tiles, mapped locally to the closest bucket for the
existing engine while the raw text gets real weight in the AI prompt. A lightweight completion
check-in asks, the next time the app opens 3 hours to 5 days after a save, whether it actually
happened. And — the one addition that mattered most from a simulated UX pass (see
`UX_RESEARCH_SIMULATION.md`) — a local, keyword-based safety net now shows a caring note with
crisis-line info if the freeform input reads like real distress, without ever blocking someone
from continuing to activity ideas.

## 1. Push the code somewhere (free, 5 minutes)

The repo is currently local-only (no git remote). Push it to GitHub (or GitLab/Bitbucket) —
partly for backup, partly because the next step needs it.

```bash
cd whatnow
git remote add origin <your-new-empty-repo-url>
git push -u origin main
```

## 2. Host the privacy policy somewhere public (free, 5 minutes)

Both Apple and Google require a **live, public URL** to your privacy policy before they'll
list the app — `PRIVACY.md` sitting in your repo isn't enough on its own. Easiest free option:
turn on GitHub Pages for the repo you just pushed (Settings → Pages → deploy from `main` /
root), which gives you a URL like `https://<you>.github.io/whatnow/PRIVACY.md`. You'll enter
this URL in both App Store Connect and Google Play Console later.

## 3. Get an Expo account (free)

Needed regardless of which stores you target — this is what actually builds the app binaries.

```bash
npx expo login   # or: npx eas login
```

## 4. Apple Developer Program — $99/year

Sign up at [developer.apple.com](https://developer.apple.com/programs/). Takes anywhere from
a few hours to a couple of days for Apple to approve, so it's worth starting this early even
if you're not ready to submit yet. You'll need this for:
- Building a real (non-Expo-Go) iOS binary
- TestFlight (letting a handful of real people test it on their own phones before public
  launch — genuinely worth doing before a public App Store release)
- The eventual App Store listing itself

One thing to note: your current sign-up flow is email/password only, with no "Sign in with
Google/Facebook/etc." option. Apple's guideline 4.8 (which requires offering Apple Sign-In)
only kicks in if you offer a *third-party* social sign-in — plain email/password doesn't
trigger it. So you're not required to add Apple Sign-In right now; only worth revisiting if
you later add Google/Facebook login.

## 5. Google Play Console — $25 one-time

Sign up at [play.google.com/console](https://play.google.com/console/). Much faster approval
than Apple, usually same-day. Lets you use closed testing tracks (a private beta, similar
purpose to TestFlight) before a public release.

## 6. Build and submit

```bash
cd app
npm install -g eas-cli
eas build --profile production --platform ios       # and/or android
eas submit --profile production --platform ios       # and/or android
```

`eas build` is what needs the Apple/Google accounts above (it'll prompt you for credentials
the first time). Expo's free tier includes a limited number of builds per month, which is
plenty for iterating toward a first release.

## 7. Store listing content (do this while builds are running)

Both stores will ask for:
- Screenshots (a few required sizes each — can be taken from a real device or the iOS
  Simulator/Android emulator running the Expo build)
- A short description and full description
- A support contact (an email is fine)
- Age rating questionnaire
- **A data-safety / privacy "nutrition label" form** — both stores now require you to
  explicitly declare what data the app collects. Based on what's actually implemented, you'll
  want to declare: email address (account creation), user-generated content (saved
  activities, thumbs-up/down feedback), and precise/approximate location (optional, user-
  granted). All of this is spelled out for reference in `PRIVACY.md`.

## 8. What's still genuinely missing (not guessed away, not fixed by reasoning alone)

A simulated UX research pass (`UX_RESEARCH_SIMULATION.md` — persona walkthroughs of the real
screens, since recruiting actual UX experts and 30-40 real testers isn't possible in this
environment) surfaced one thing worth fixing immediately (done — the crisis-language safety
net above) and a few things that genuinely need real people, not more reasoning:

- **The completion check-in only fires on a later app open.** Someone who saves an activity
  and never reopens the app never gets asked whether it happened. Fully closing this needs
  push notifications, which is a real scope/cost decision for you to make, not a quick fix.
- **Copy and tone haven't been checked against a non-native English speaker or an older user
  in real life** — idiom-heavy microcopy like "None of these — let me tell you" reads fine to
  me on paper, which is exactly why it needs a real second opinion, not another guess.
- **Whether a first-time explainer of the learning loop would help** ("the more you use this,
  the more it learns what works for you") before the new "Your patterns" card has any data to
  show is genuinely an open question — a handful of real first-opens would answer it faster
  than any amount of further thinking.
- **The real thing this all points back to:** a small closed beta (10-20 people, a couple of
  weeks — see §9 below) is still the right next step. This session's simulated pass is a
  reasonable substitute for zero testing, not a substitute for real testing.

## 9. Decide what "done" looks like before a public launch

A few product questions worth answering deliberately rather than by default, now that
accounts and learning are real:
- Do you want a closed beta (TestFlight / Play internal testing) with a small group first, or
  go straight to public release? Given how much of WhatNow's value depends on the learning
  loop actually working over repeated real use, a beta with even 10–20 people using it for a
  couple of weeks would tell you a lot before a public launch.
- Is the current daily-cap-only BYOK model (AI planning, events, "look online nearby" all
  require the person's own API key) the launch experience you want, or would you rather offer
  a small taste of AI planning on a WhatNow-paid key before asking people to bring their own?
  That's a real cost/product tradeoff worth deciding deliberately rather than by default.

Nothing above is required to keep testing locally — all of it is specifically about the path
from "works on my phone" to "listed in an app store."
