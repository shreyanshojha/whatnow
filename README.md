# WhatNow 🧭

**Plans around your mood, not your calendar.** Tell it how you feel and a few constraints; it hands back a small, tailored plan of 2–5 activities — each with a "why this helps right now."

This repo has two things:

- **`/index.html`** — the **web app / prototype**. Zero build, zero keys, works offline (111 curated activities + a mood-aware planning engine). *This is the "see it working" demo.*
- **`/app`** — the **native mobile app** (Expo / React Native + TypeScript), ready for the App Store & Play Store.

## Try the web demo (10 seconds)
Open `index.html`, or deploy free on GitHub Pages (Settings → Pages → `main` / root).

## Run the mobile app on your phone (~60s)
```bash
cd app
npm install
npx expo start          # scan the QR code with the Expo Go app
```

## APIs (free, no key)
Weather (**Open-Meteo**) and nearby-place hints (**OpenStreetMap** Nominatim + Overpass) are free and keyless. They only fire if you grant location, and the app degrades gracefully to great generic suggestions if you don't. Nothing to configure.

## Ship to the app stores
```bash
cd app
npm install -g eas-cli && eas login          # free Expo account
eas build --profile production --platform ios      # and/or android
eas submit --profile production --platform ios      # and/or android
```
Publishing requires an **Apple Developer account ($99/yr)** and/or **Google Play account ($25 one-time)**.

A Shreyansh Ojha product · shreyanshojha.app
