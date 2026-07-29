import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors, font, fontDisplay } from '../lib/theme';

/* ============================================================
   Web-only landing spot for Google's OAuth redirect.

   On native, the redirect goes straight to WhatNow's custom URL
   scheme and never touches expo-router at all — WebBrowser.
   openAuthSessionAsync intercepts it before any screen would render.
   On web there's no custom scheme, so the redirect is a real page
   load at this path (see AuthContext's signInWithGoogle, which
   builds this URL via Linking.createURL('auth-callback')). Without
   a real route here, that load would hit expo-router's "Unmatched
   Route" screen for a moment before the popup closes itself — this
   is just a calmer, on-brand stand-in for that instant.

   No logic lives here: the actual handoff (WebBrowser.
   maybeCompleteAuthSession(), which posts this URL back to the
   window that opened the popup) runs at module scope in
   AuthContext.tsx, which loads regardless of which route matches.
   ============================================================ */
export default function AuthCallback() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
      }}
    >
      <ActivityIndicator color={colors.coralDeep} size="large" />
      <Text style={{ fontSize: 17, ...fontDisplay.bold, color: colors.ink }}>
        Finishing sign-in…
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.inkSoft,
          ...font.regular,
          textAlign: 'center',
        }}
      >
        This window will close on its own in a second.
      </Text>
    </View>
  );
}
