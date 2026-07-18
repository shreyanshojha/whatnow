# WhatNow Privacy Policy

*Last updated: July 2026*

WhatNow ("the app") is built by Shreyansh Ojha. This page explains, in plain language, what
information the app touches and what happens to it. There are no user accounts, no logins,
and no names collected anywhere in this app.

## What WhatNow never collects

WhatNow doesn't ask for your name, email, phone number, or any account. There's nothing to
sign up for and nothing tying any of the below to your identity.

## Your mood and plan preferences

The mood, energy, time, social, indoor/outdoor, and budget choices you make stay on your
device. They're used only to generate your plan in the moment and aren't sent anywhere.

## Your saved activities

Anything you save lives only in your device's local storage. It's never uploaded, backed
up to a server, or visible to anyone else — including us.

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
at the time. This never leaves your device, is never uploaded to any server WhatNow
controls, and isn't tied to any account or identity beyond living on this one phone. It
exists purely so the app can notice real patterns ("often near a park when feeling
restless") and gently factor them into future plans. You can clear this at any time from the
About screen, and deleting the app removes it permanently.

## Learning from what you choose

WhatNow also keeps a small **on-device-only** log of which activities you've saved or
reshuffled away, paired with the mood you were feeling. This is what lets the app get better
at guessing what you'll actually want over time — nothing more than a lightweight tally per
activity, never uploaded, never tied to an account. A single reshuffle never buries an
activity forever, and a single save never crowds everything else out; it's a gentle nudge
that builds up gradually. You can clear this at any time from the About screen, separately
from your location pattern memory, without affecting your saved list.

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

## Optional live events

If you turn on live nearby events and provide your own Ticketmaster API key, your
coordinates are sent directly from your device to Ticketmaster to look up nearby events.
Same bring-your-own-key model: the key lives only in your device's secure keychain.

## Your choices

- Deny or skip location entirely — the app still works, using its built-in library of
  activities with no location-aware tuning.
- Clear your on-device location pattern memory or your on-device learning history any time
  from the About screen, independently of each other and without affecting your saved
  activities.
- Turn AI planning or live events off any time in the About screen — this also clears the
  saved key from your device.
- Delete the app to remove everything stored locally, including your saved activities, your
  location pattern memory, and your learning history.

## Changes to this policy

If what WhatNow collects or how it's used changes meaningfully, this page will be updated
and the in-app version note will reflect it.

## Contact

Questions about this policy: hello@shreyanshojha.app
