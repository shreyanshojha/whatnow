# WhatNow

**Plans around your mood, not your calendar.**

WhatNow is a warm, native mobile app that turns *how you feel* into something to do.
Tell it your mood and a few quick constraints, and it hands back a small, tailored plan
of 2–5 activities — each with a genuine "why this helps right now." No accounts, no feed,
no pressure. Built with Expo (React Native + TypeScript).

- **111 hand-written activities**, each tagged by mood-fit + reason, energy, time, social,
  indoor/outdoor, cost, and category (Move, Create, Rest, Connect, Explore, Learn,
  Indulge, Reset).
- A deterministic selection engine that scores for mood fit, energy, time, budget and
  category diversity, with a little jitter so **Reshuffle** always feels alive.
- **Optional, keyless real APIs** (all free, no API key):
  - **Open-Meteo** for local weather → biases the plan indoors/outdoors and shows a note
    like *"14°C & drizzly — I'll lean your plan indoors."*
  - **OpenStreetMap** (Nominatim reverse-geocode + Overpass) to name a real nearby
    park / cafe / library / gym in a suggestion.
  - Location is opt-in. Deny it, or if any call fails, the app degrades gracefully and
    still works with its bundled generic suggestions.

## Screens

1. **Mood** — expressive emoji + word grid of 12 moods.
2. **Context** — segmented controls for energy / time / solo-or-social / indoor-outdoor /
   budget, with sensible defaults (≈10 seconds to a plan) and the optional location tune-up.
3. **Plan** — 2–5 activity cards (title, description, why-this-helps, time & cost),
   plus **Reshuffle** and **Save**.
4. **Saved** — your kept activities, persisted on-device with AsyncStorage.
5. **About** — what it is, how it works, and a plain-English privacy note.

Warm friendly theme, smooth native reveal animations (with **reduce-motion** support),
safe-area aware, iOS + Android, phone sizes.

---

## Run it on your phone in ~60 seconds (Expo Go)

You only need a free **Expo** account and the **Expo Go** app on your phone.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start
```

Then open **Expo Go** (App Store / Play Store) and scan the QR code in your terminal.
The app loads live on your device. Edit any file and it hot-reloads.

> Uses `.npmrc` with `legacy-peer-deps=true` so `npm install` resolves cleanly.

---

## Build & submit to the stores (EAS)

Store builds use **EAS Build** (cloud) — no Mac required for iOS builds.

```bash
# One-time setup
npm install -g eas-cli
eas login                 # your free Expo account
eas build:configure       # links the project (already has eas.json)
```

**Build:**

```bash
# Quick shareable internal builds
eas build --profile preview --platform android   # .apk you can sideload
eas build --profile preview --platform ios       # simulator / internal

# Production store builds
eas build --profile production --platform android   # .aab for Play Store
eas build --profile production --platform ios       # for App Store
```

**Submit:**

```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

`eas.json` ships with **development**, **preview**, and **production** profiles.

### Store identifiers (already wired in `app.json`)

- Name: **WhatNow**
- iOS `bundleIdentifier`: `app.shreyanshojha.whatnow`
- Android `package`: `app.shreyanshojha.whatnow`
- Version `1.0.0` (iOS `buildNumber` 1 / Android `versionCode` 1)
- iOS location usage string + Android `ACCESS_*_LOCATION` permissions are set.

---

## What the founder needs

| For | Account | Cost |
| --- | --- | --- |
| Running in Expo Go + EAS builds | **Expo** account | Free |
| Submitting to the **App Store** | **Apple Developer Program** | **$99 / year** |
| Submitting to **Google Play** | **Google Play Developer** | **$25 one-time** |

You can develop, test on real devices, and produce builds entirely for free — the paid
accounts are only required to publish to the public stores.

---

## Project layout

```
app/                      expo-router screens
  _layout.tsx             stack + providers + theme
  index.tsx               mood picker (entry)
  context.tsx             context controls + optional location
  plan.tsx                plan reveal (reshuffle / save)
  saved.tsx               saved list
  about.tsx               about + privacy
components/
  ActivityCard.tsx        animated plan card
  Segmented.tsx           segmented control
context/PlanContext.tsx   global state + AsyncStorage + location flow
data/activities.ts        the 99-activity dataset + moods/categories (ported from web v1)
lib/plan.ts               selection engine (ported from web v1)
lib/weather.ts            Open-Meteo (keyless, cached, graceful)
lib/places.ts             OpenStreetMap Nominatim + Overpass (keyless, cached, graceful)
lib/theme.ts              warm design tokens
scripts/make_assets.py    regenerates icon / adaptive-icon / splash
```

The activity dataset and matching engine are ported directly from the WhatNow web v1.

---

Weather by [Open-Meteo](https://open-meteo.com) · Places by
[OpenStreetMap](https://www.openstreetmap.org/copyright) — both free, no key.
A Shreyansh Ojha product.
