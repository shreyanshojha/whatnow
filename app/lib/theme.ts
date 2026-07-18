/* WhatNow — warm, friendly design tokens (ported palette from web v1). */

export const colors = {
  bg: '#FDF6EE',
  bg2: '#FBEEE0',
  card: '#FFFFFF',
  ink: '#2C2320',
  inkSoft: '#6B5D54',
  // Darkened from #9A8B80 (was ~3.1:1 on bg, below WCAG AA) to clear 4.5:1
  // with real margin — this color is used for meta text throughout the app.
  inkFaint: '#726357',
  line: '#EFE2D4',
  coral: '#E8654A',
  coralDeep: '#CF4D33',
  peach: '#F7B267',
  sage: '#7AA274',
  sky: '#6BA4C9',
  plum: '#9A6FB0',
  amber: '#E0A24A',
  white: '#FFFFFF',
  // subtle warm gradient stops used behind headers / splash
  glowPeach: '#FFF2E0',
  glowPink: '#FBE4EC',
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

export const font = {
  // System font stack keeps the bundle lean and store-ready without
  // shipping custom fonts; weights below read as friendly + warm.
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
