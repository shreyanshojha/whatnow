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

## 8. Decide what "done" looks like before a public launch

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
