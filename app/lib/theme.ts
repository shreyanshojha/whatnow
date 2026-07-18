/* ============================================================
   WhatNow — design tokens.

   Bespoke identity, not a template: warm cream/white surfaces with
   one decisive coral accent (never diluted by competing mood colors
   on the same surface), a serif display face for anything that
   should feel like a considered word choice from a friend (headlines,
   activity titles), and a clean grotesque for everything functional.
   Mood color now reads as a small accent (chip/stroke), not a full
   pastel wash — see MOODS in data/activities.ts.
   ============================================================ */

export const colors = {
  bg: '#FDF6EE',
  bg2: '#FBEEE0',
  card: '#FFFFFF',
  // Warm near-black, not soft brown-grey — sharper typographic contrast
  // than the earlier #2C2320 (16.8:1 on white vs. 15.4:1 before).
  ink: '#221C18',
  inkSoft: '#6B5D54',
  // Darkened from #9A8B80 (was ~3.1:1 on bg, below WCAG AA) to clear 4.5:1
  // with real margin — this color is used for meta text throughout the app.
  inkFaint: '#726357',
  line: '#EFE2D4',
  coral: '#E8654A',
  coralDeep: '#CF4D33',
  peach: '#F7B267',
  // sage: fine as an icon/accent/fill color, but never as text and never as
  // a base for white button labels — only ~2.9:1 with white, below WCAG AA.
  // Use sageDeep for either of those cases (~5:1 with white).
  sage: '#7AA274',
  sageDeep: '#4F7A49',
  sky: '#6BA4C9',
  plum: '#9A6FB0',
  // amber: fine as an icon/accent color, but never as text on bg/card —
  // only ~2.1:1, well below WCAG AA. Use amberDeep for any text usage
  // (~5:1 on bg).
  amber: '#E0A24A',
  amberDeep: '#94601F',
  white: '#FFFFFF',
  // subtle warm gradient stops used behind headers / splash
  glowPeach: '#FFF2E0',
  glowPink: '#FBE4EC',
  // Faint tints of the accent colors above, for small badges/pressed states
  // that need a hint of color without competing with a card surface.
  plumTint: '#F3ECF7',
  coralTint: '#FFF3EE',
};

export const radius = {
  sm: 13,
  md: 18,
  lg: 24,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadow = {
  card: {
    shadowColor: '#4A3226',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#4A3226',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};

/**
 * Functional text — UI chrome, body copy, labels, buttons. Inter reads
 * clean and neutral so it never competes with the display face below.
 * Spread these into a style object (`...font.semibold`), don't assign
 * to `fontWeight` — the weight is baked into each font file.
 */
export const font = {
  regular: { fontFamily: 'Inter_400Regular' as const },
  medium: { fontFamily: 'Inter_500Medium' as const },
  semibold: { fontFamily: 'Inter_600SemiBold' as const },
  bold: { fontFamily: 'Inter_700Bold' as const },
};

/**
 * Display text — the handful of moments that should feel like a
 * considered word choice from a friend, not app chrome: the brand
 * wordmark, screen headlines, and every activity title. Fraunces'
 * warm, slightly eccentric serif is what makes WhatNow's type
 * unmistakably its own rather than a system-font starter app.
 */
export const fontDisplay = {
  regular: { fontFamily: 'Fraunces_400Regular' as const },
  semibold: { fontFamily: 'Fraunces_600SemiBold' as const },
  bold: { fontFamily: 'Fraunces_700Bold' as const },
  black: { fontFamily: 'Fraunces_900Black' as const },
};
