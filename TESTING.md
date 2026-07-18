# Testing WhatNow locally

This is the fastest way to try the real app on your own phone before touching anything
App Store/Play Store/hosting-related. No accounts to create, no API keys to get, nothing to
deploy — just run it and use it.

## 1. Run it (about a minute)

You'll need [Node.js](https://nodejs.org) installed on your computer, and the free **Expo
Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
[Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

```bash
cd app
npm install
npx expo start
```

A QR code appears in your terminal. Scan it with your phone's camera (iOS) or the Expo Go
app's scanner (Android) — WhatNow opens right on your phone, running from your computer.
Both need to be on the same Wi-Fi network.

Every code change you make and save will show up on your phone in about a second (no
reinstalling) — this is the normal Expo development workflow, the same one you'd use for any
amount of further iteration before a real release.

## 2. What to actually try

A few paths worth walking through, since they exercise the parts most worth getting right:

- **The core loop.** Pick a mood, adjust a couple of context toggles (time, who you're with,
  budget), get a plan, reshuffle it once, save one activity, tap a thumbs-up or thumbs-down on
  a card. Check the Saved tab shows what you saved.
- **First-launch onboarding.** To see the 4-screen carousel again after your first run,
  either reinstall the app in Expo Go, or clear it manually: in the running app, this is
  keyed off AsyncStorage, so a fresh Expo Go install or `npx expo start -c` (clears the
  Metro cache, not app storage) won't bring it back — easiest is uninstalling/reinstalling
  Expo Go's copy of the project, or temporarily bumping `ONBOARDING_VERSION` in
  `app/lib/onboarding.ts`.
- **Create an account.** About tab → Account card → "Create account." This is real —  it's
  already wired to a live Supabase backend (no setup needed from you). Save an activity while
  signed in, then sign out and back in — it should reappear, pulled from the server.
- **Invite a friend.** Once signed in, the Account card shows your invite code with a Share
  button. Create a second account (a different email) and enter that code during its sign-up
  — the first account's friend count should tick up by one.
- **Delete an account.** Also real and permanent — worth doing once on a throwaway test
  account (not one you've saved real activities to) just to confirm it behaves as expected.
- **Optional AI features — only if you want to test them.** The "AI planning" and "Live
  nearby events" and "Look online nearby" sections in the About tab are bring-your-own-key:
  you'd need your own Anthropic API key (for AI planning + Look online nearby) or Ticketmaster
  Discovery API key (for live events) to see those in action. Skip this entirely if you just
  want to test the core, keyless experience — everything works fully without them.

## 3. Where your test data lives

Signed-out use never leaves your phone (AsyncStorage only). Signed-in use also writes to the
same Supabase project the rest of the app already uses — there's no separate "test" backend.
That's completely fine for now (it's early), but worth knowing: test accounts you create here
are real rows in the real database. You can delete any of them in-app (Account → Delete
account) whenever you're done with one.

## 4. If something looks broken

Shake your phone (or press `Cmd+D` in the iOS Simulator / `Cmd+M` in the Android emulator, if
you're using one instead of a physical phone) to open the Expo Go developer menu — "Reload"
re-fetches the latest code, and the on-screen error overlay (if one appears) usually points
straight at the problem. If a screen ever looks visually broken but doesn't show a red error
screen, that's worth flagging directly — the whole app is built to degrade gracefully rather
than crash, so a silent visual bug is more likely than a hard error.

## What's already been verified for you

Before this was handed to you, the whole codebase was already checked with a fresh
`npm install`, TypeScript (`tsc --noEmit`), the full test suite (`npx jest`), Expo's own
health check (`npx expo-doctor`), and a Metro bundler dry run — all clean. That doesn't
replace actually using it, but it means what you're about to try isn't untested code.

When you're happy with how it behaves, see `NEXT_STEPS.md` for what's involved in actually
shipping it (Apple/Google developer accounts, app store submission, and so on) — none of
that is needed just to try it out.
