# WhatNow Privacy Policy

*Version: 2026-07-17-v1 · Last updated: July 17, 2026*

WhatNow ("the app") is built by Shreyansh Ojha. This page explains, in plain language, what
information the app touches and what happens to it.

## Accounts

WhatNow uses real user accounts (email + password) so your saved activities and the app's
sense of what you like can follow you to a new device instead of living only on one phone.
Creating an account is how WhatNow personalizes its very first guess over time — that's the
whole point of the app. You can still use most of WhatNow without signing in (see "Your
choices" below), but some personalization only works once you have an account.

Your account is protected by row-level security on our database: the technical rule is that
your rows can only ever be read or written by you, authenticated as you — not by other
users, and not by us browsing a general table. We (WhatNow) can see that an account exists
and, if needed for support or legal reasons, its email address, saved activities, and
feedback history — the same way any app operator can access data on its own servers. We
don't sell your data, share it with advertisers, or use it for anything beyond running and
improving WhatNow.

You can permanently delete your account and all data tied to it at any time from the Account
section of the About screen — this is a real, immediate deletion (see "Your choices").

## Your mood and plan preferences

The mood, energy, time, social, indoor/outdoor, and budget choices you make are used to
generate your plan in the moment. If you're signed in, each plan you generate is also logged
to your account (mood, energy, time, social setting, and whether kids were with you) purely
so WhatNow can learn what tends to fit — never sold, never shared, and deleted the moment you
delete your account.

## Your saved activities

Anything you save lives on your device. If you're signed in, it's also mirrored to your
account so it's there when you sign in on another device or reinstall the app. If you're not
signed in, saved activities stay local to this device only, exactly as before.

## Location — what happens if you grant it

Location is entirely optional; the app works fully without it. WhatNow has no server of its
own, so there is nowhere centralized for location data to go. If you choose to share it,
each time you do, two things happen:

1. **A live weather check** (via [Open-Meteo](https://open-meteo.com)) biases that one plan
   indoors or outdoors and shows a short weather note. Your coordinates are sent to
   Open-Meteo for this lookup only; WhatNow doesn't control what Open-Meteo does with that
   request, but no account or identifier is attached to it.
2. **A live nearby-places check** (via [OpenStreetMap](https://www.openstreetmap.org/copyright)'s
   Nominatim and Overpass services) names real nearby spots — parks, cafés, and similar —
   for that plan. Same as above: your coordinates go to OpenStreetMap for this one lookup,
   with no identifying information attached.

Separately, WhatNow keeps a small **on-device-only** pattern memory: a rolling log of
roughly neighborhood-level locations (never exact GPS) paired with the mood you were feeling
at the time. This never leaves your device and is never uploaded anywhere, signed in or not.
It exists purely so the app can notice real patterns ("often near a park when feeling
restless") and gently factor them into future plans. You can clear this at any time from the
About screen, and deleting the app removes it permanently.

## Learning from what you choose

WhatNow keeps a log of which activities you've saved, reshuffled away, or given a direct
thumbs-up/down, paired with the mood you were feeling — this is what lets the app get better
at guessing what you'll actually want over time. This always lives on your device; if you're
signed in, it's also mirrored to your account so that learning follows you to another device
and — over time — powers better first guesses than an on-device-only log ever could. A
single reshuffle never buries an activity forever, and a single save never crowds everything
else out; it's a gentle nudge that builds up gradually. You can clear the on-device copy at
any time from the About screen; deleting your account clears the server copy too.

## Optional AI planning

If you turn on AI planning and provide your own API key, your mood, context, and — if you've
granted location — a one-line summary of your on-device pattern memory (never raw location
history, never your saved list) are sent directly from your device to that AI provider (for
example, Anthropic) to generate a plan. Your API key is stored only in your device's secure
keychain — never on any WhatNow server, never in the app itself. If this feature is off, if
no key is set, or if the request fails for any reason, WhatNow instantly falls back to its
built-in, fully offline matching engine.

## Optional "Look online nearby" search

This reuses your AI planning API key — no separate key is needed. When you tap "Search,"
your rough nearby place name (if location is granted) is sent directly from your device to
that same AI provider, which searches the live web and returns real local events and new
movies playing near you. Nothing is stored by WhatNow; results only exist on your screen for
that session.

## Invite codes

If you're signed in, your account has a short invite code you can share with friends. If a
friend enters it when creating their own account, WhatNow records that one link (which
account invited which) so we can show you how many friends have joined — nothing more than
that pairing and a count is stored, and it's deleted along with your account.

## Optional live events

If you turn on live nearby events and provide your own Ticketmaster API key, your
coordinates are sent directly from your device to Ticketmaster to look up nearby events.
Same bring-your-own-key model: the key lives only in your device's secure keychain.

## Your choices

- Use WhatNow without an account — plans, saves, and on-device learning all still work; they
  just stay local to this device rather than following you to another one.
- Deny or skip location entirely — the app still works, using its built-in library of
  activities with no location-aware tuning.
- Clear your on-device location pattern memory or your on-device learning history any time
  from the About screen, independently of each other and without affecting your saved
  activities.
- Turn AI planning or live events off any time in the About screen — this also clears the
  saved key from your device.
- Delete your account any time from the Account section of the About screen. This is
  immediate and permanent: it removes your profile, saved activities, feedback history, and
  plan history from our servers. It doesn't affect activities saved locally on your device.
- Delete the app to remove everything stored locally, including your saved activities, your
  location pattern memory, and your learning history (your account, if you have one, is
  unaffected and can be signed back into from a reinstall).

## Changes to this policy

If what WhatNow collects or how it's used changes meaningfully, this page will be updated
and the in-app version note will reflect it.

## Contact

Questions about this policy: hello@shreyanshojha.app
