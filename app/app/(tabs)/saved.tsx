import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { usePlan } from '../../context/PlanContext';
import { CATS, COST_LABEL, TIME_LABEL } from '../../data/activities';
import { colors, font, fontDisplay, radius, shadow } from '../../lib/theme';

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saved, toggleSave, clearSaved } = usePlan();

  if (saved.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <Icon name="heart-outline" size={44} color={colors.inkFaint} strokeWidth={1.4} />
        <Text style={styles.emptyH}>Nothing saved yet</Text>
        <Text style={styles.emptyP}>
          Tap the heart on any activity to tuck it away here for later. Your saves stay on
          this device.
        </Text>
        <Pressable
          onPress={() => router.push('/home')}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Build a plan</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sub}>Things you tucked away, kept on this device.</Text>

      {saved.map((entry) => {
        const a = entry.activity;
        const cat = CATS[a.cat];
        return (
          <View key={a.id} style={[styles.item, { borderLeftColor: cat.color }]}>
            <View style={[styles.itemIconWrap, { backgroundColor: cat.tint }]}>
              <Icon name={a.cat} size={17} color={cat.color} strokeWidth={1.8} />
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{a.t}</Text>
              <Text style={styles.itemMeta}>
                {cat.label} · {TIME_LABEL[a.time]} · {COST_LABEL[a.cost]}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleSave(a)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${a.t} from saved`}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={clearSaved}
        style={({ pressed }) => [styles.clear, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.clearText}>Clear all</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  sub: { fontSize: 15, color: colors.inkSoft, marginBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    ...shadow.soft,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15.5, ...font.semibold, color: colors.ink, lineHeight: 20 },
  itemMeta: { fontSize: 12.5, color: colors.inkFaint, marginTop: 2 },
  remove: {
    backgroundColor: colors.bg2,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  removeText: { fontSize: 13, ...font.semibold, color: colors.coralDeep },
  clear: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  clearText: { fontSize: 14.5, color: colors.inkFaint, ...font.medium },
  emptyRoot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  emptyEmo: { fontSize: 46, marginBottom: 12 },
  emptyH: { fontSize: 20, ...fontDisplay.bold, color: colors.ink, marginBottom: 8 },
  emptyP: {
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 30,
    ...shadow.soft,
  },
  ctaPressed: { backgroundColor: colors.coralDeep },
  ctaText: { color: colors.white, fontSize: 16, ...font.bold },
});
