import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { Segmented } from '../../../components/Segmented';
import { usePlan } from '../../../context/PlanContext';
import { CATS, CatId, MOODS, PLACE_LABEL, TIME_LABEL } from '../../../data/activities';
import { PlaceCandidate, SearchRadius, searchPlace } from '../../../lib/places';
import { colors, font, fontDisplay, radius, shadow } from '../../../lib/theme';
import { weatherIconName, weatherNote } from '../../../lib/weather';

export default function ContextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    moods,
    categories,
    toggleCategory,
    energy,
    setEnergy,
    time,
    setTime,
    social,
    setSocial,
    setting,
    setSetting,
    budget,
    setBudget,
    withKids,
    setWithKids,
    weather,
    nearby,
    locationStatus,
    requestLocation,
    setManualLocation,
    makePlan,
    freeformDescription,
  } = usePlan();

  const selectedMoodMetas = moods
    .map((id) => MOODS.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  // "Search a place instead" — for anyone who'd rather type a city/area than
  // share GPS (denied it, doesn't want to, or just wants a different place
  // than where they physically are right now). See lib/places.ts's
  // searchPlace + PlanContext's setManualLocation.
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualQuery, setManualQuery] = React.useState('');
  const [manualRadius, setManualRadius] = React.useState<SearchRadius>('medium');
  const [manualCandidates, setManualCandidates] = React.useState<PlaceCandidate[] | null>(null);
  const [manualSearching, setManualSearching] = React.useState(false);
  const [manualApplying, setManualApplying] = React.useState(false);
  // Bumped on every search, so a slower earlier request can't clobber a
  // newer one's results if two searches ever overlap (e.g. the keyboard's
  // "search" key fired twice in quick succession before the first resolved).
  const manualSearchSeq = React.useRef(0);

  const onManualSearch = async () => {
    const q = manualQuery.trim();
    if (!q || manualSearching) return;
    const seq = ++manualSearchSeq.current;
    setManualSearching(true);
    setManualCandidates(null);
    try {
      const results = await searchPlace(q);
      if (seq === manualSearchSeq.current) setManualCandidates(results);
    } finally {
      if (seq === manualSearchSeq.current) setManualSearching(false);
    }
  };

  const onPickCandidate = async (c: PlaceCandidate) => {
    setManualApplying(true);
    try {
      await setManualLocation(c.lat, c.lon, manualRadius);
      setManualOpen(false);
      setManualCandidates(null);
      setManualQuery('');
    } finally {
      setManualApplying(false);
    }
  };

  const onMakePlan = () => {
    // Fire the plan request and navigate immediately — the Plan screen
    // shows its own loading state while this resolves (instant for the
    // deterministic engine, a couple seconds if AI planning is on).
    makePlan().catch(() => {});
    router.push('/home/plan');
  };

  const locationBody = (() => {
    if (weather) return weatherNote(weather);
    switch (locationStatus) {
      case 'loading':
        return 'Checking your local weather…';
      case 'denied':
        return 'No location — totally fine, WhatNow works great without it.';
      case 'unavailable':
        return "Couldn't reach location — carrying on without it.";
      default:
        return 'Optional: use your location to weather-tune the plan and name a real spot nearby.';
    }
  })();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {freeformDescription ? (
          <View style={[styles.moodPill, { backgroundColor: colors.coralTint, borderColor: colors.coral }]}>
            <Icon name="other" size={16} color={colors.coralDeep} strokeWidth={1.9} />
            <Text style={[styles.moodPillText, { color: colors.coralDeep }]} numberOfLines={1}>
              "{freeformDescription}"
            </Text>
          </View>
        ) : selectedMoodMetas.length > 0 ? (
          <View style={styles.moodPillRow}>
            {selectedMoodMetas.map((m) => (
              <View
                key={m.id}
                style={[styles.moodPill, { backgroundColor: m.tint, borderColor: m.color }]}
              >
                <Icon name={m.id} size={16} color={m.color} strokeWidth={1.9} />
                <Text style={[styles.moodPillText, { color: m.color }]}>{m.word}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.h1}>A few quick details</Text>
        <Text style={styles.sub}>
          Defaults are set — tweak anything, or just tap Make my plan.
        </Text>

        <Segmented
          label="Energy"
          value={energy}
          onChange={setEnergy}
          options={[
            { val: 'low', label: 'Low', ic: 'energy-low' },
            { val: 'medium', label: 'Medium', ic: 'energy-medium' },
            { val: 'high', label: 'High', ic: 'energy-high' },
          ]}
        />
        <Segmented
          label="Time available"
          value={time}
          onChange={setTime}
          options={[
            { val: 15, label: TIME_LABEL[15], ic: 'clock', aria: '15 minutes' },
            { val: 60, label: TIME_LABEL[60], ic: 'clock', aria: 'About one hour' },
            { val: 240, label: 'Half-day', ic: 'clock', aria: 'Half a day' },
          ]}
        />
        <Segmented
          label="Solo or social"
          value={social}
          onChange={setSocial}
          options={[
            { val: 'solo', label: 'Solo', ic: 'social-solo' },
            { val: 'someone', label: 'Someone', ic: 'social-someone', aria: 'With someone' },
            { val: 'group', label: 'Group', ic: 'social-group' },
          ]}
        />
        <Segmented
          label="Indoor or outdoor"
          value={setting}
          onChange={setSetting}
          options={[
            { val: 'indoor', label: 'Indoor', ic: 'indoor' },
            { val: 'outdoor', label: 'Outdoor', ic: 'outdoor' },
            { val: 'either', label: PLACE_LABEL.either, ic: 'either' },
          ]}
        />
        <Segmented
          label="Budget"
          value={budget}
          onChange={setBudget}
          options={[
            { val: 'free', label: "Won't spend", ic: 'budget-free' },
            { val: 'cheap', label: 'A little', ic: 'budget-cheap' },
            { val: 'treat', label: 'Treat myself', ic: 'budget-treat' },
          ]}
        />

        <Text style={styles.catLabel}>What kind of thing (optional)</Text>
        <View style={styles.catRow}>
          {(Object.keys(CATS) as CatId[]).map((id) => {
            const cat = CATS[id];
            const active = categories.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggleCategory(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={cat.label}
                style={({ pressed }) => [
                  styles.catChip,
                  active && { backgroundColor: cat.tint, borderColor: cat.color },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Icon name={id} size={15} color={active ? cat.color : colors.inkFaint} strokeWidth={1.8} />
                <Text style={[styles.catChipText, active && { color: cat.color }]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setWithKids(!withKids)}
          accessibilityRole="switch"
          accessibilityState={{ checked: withKids }}
          accessibilityLabel="Kids will be with me"
          style={({ pressed }) => [
            styles.kidsToggle,
            withKids && styles.kidsToggleActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="kids" size={19} color={withKids ? colors.white : colors.inkSoft} strokeWidth={1.8} />
          <Text style={[styles.kidsToggleText, withKids && styles.kidsToggleTextActive]}>
            Kids will be with me
          </Text>
          <View style={[styles.kidsCheck, withKids && styles.kidsCheckActive]}>
            {withKids ? <Icon name="check" size={12} color={colors.coral} strokeWidth={2.4} /> : null}
          </View>
        </Pressable>

        <View style={styles.weatherCard}>
          <View style={styles.weatherRow}>
            {weather ? (
              <Icon name={weatherIconName(weather)} size={17} color={colors.inkSoft} strokeWidth={1.7} />
            ) : null}
            <Text style={styles.weatherBody}>{locationBody}</Text>
          </View>
          {nearby?.placeName ? (
            <View style={[styles.weatherRow, { marginTop: 8 }]}>
              <Icon name="pin" size={14} color={colors.ink} strokeWidth={1.8} />
              <Text style={styles.weatherPlace}>{nearby.placeName}</Text>
            </View>
          ) : null}
          {!weather ? (
            <View style={styles.weatherBtnRow}>
              {locationStatus !== 'denied' ? (
                <Pressable
                  onPress={requestLocation}
                  disabled={locationStatus === 'loading'}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.weatherBtn, pressed && { opacity: 0.7 }]}
                >
                  {locationStatus === 'loading' ? (
                    <ActivityIndicator color={colors.coralDeep} size="small" />
                  ) : (
                    <Text style={styles.weatherBtnText}>Use my location</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setManualOpen((v) => !v)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.weatherBtnGhost, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.weatherBtnGhostText}>Search a place instead</Text>
              </Pressable>
            </View>
          ) : null}

          {manualOpen ? (
            <View style={styles.manualBox}>
              <View style={styles.manualSearchRow}>
                <TextInput
                  value={manualQuery}
                  onChangeText={setManualQuery}
                  placeholder="City or area, e.g. Brooklyn, NY"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.manualInput}
                  onSubmitEditing={onManualSearch}
                  returnKeyType="search"
                />
                <Pressable
                  onPress={onManualSearch}
                  disabled={!manualQuery.trim() || manualSearching}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                  style={({ pressed }) => [
                    styles.manualSearchBtn,
                    (!manualQuery.trim() || manualSearching) && styles.ctaDisabledGhost,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {manualSearching ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Icon name="curious" size={16} color={colors.white} strokeWidth={2} />
                  )}
                </Pressable>
              </View>

              <Segmented
                label="How far to look"
                value={manualRadius}
                onChange={setManualRadius}
                options={[
                  { val: 'close', label: 'Close by', ic: 'pin' },
                  { val: 'medium', label: 'Nearby', ic: 'pin' },
                  { val: 'far', label: 'Willing to travel', ic: 'pin' },
                ]}
              />

              {manualCandidates && manualCandidates.length === 0 ? (
                <Text style={styles.manualHint}>
                  Couldn't find that place — try a nearby bigger city or a different spelling.
                </Text>
              ) : manualCandidates ? (
                <View style={styles.manualResults}>
                  {manualCandidates.map((c) => (
                    <Pressable
                      key={`${c.lat}-${c.lon}`}
                      onPress={() => onPickCandidate(c)}
                      disabled={manualApplying}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.manualResultRow, pressed && { opacity: 0.7 }]}
                    >
                      <Icon name="pin" size={14} color={colors.inkSoft} strokeWidth={1.8} />
                      <Text style={styles.manualResultText} numberOfLines={2}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          onPress={onMakePlan}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>Make my plan</Text>
            <Icon name="arrow-right" size={17} color={colors.white} strokeWidth={2.1} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  moodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  moodPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  moodPillText: {
    fontSize: 13.5,
    ...font.semibold,
    textTransform: 'capitalize',
  },
  h1: {
    fontSize: 26,
    ...fontDisplay.bold,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: { fontSize: 15, color: colors.inkSoft, ...font.regular, lineHeight: 21, marginBottom: 22 },
  catLabel: {
    fontSize: 13,
    color: colors.inkSoft,
    ...font.semibold,
    marginBottom: 10,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  catChipText: { fontSize: 13, ...font.medium, color: colors.inkSoft },
  kidsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 18,
  },
  kidsToggleActive: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  kidsToggleText: { flex: 1, fontSize: 14.5, color: colors.ink, ...font.medium },
  kidsToggleTextActive: { color: colors.white, ...font.semibold },
  kidsCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidsCheckActive: { backgroundColor: colors.white, borderColor: colors.white },
  weatherCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.soft,
  },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherBody: { flex: 1, fontSize: 14.5, color: colors.inkSoft, ...font.regular, lineHeight: 21 },
  weatherPlace: { fontSize: 13.5, color: colors.ink, ...font.medium },
  weatherBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.bg2,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 140,
    alignItems: 'center',
  },
  weatherBtnText: { fontSize: 14.5, ...font.semibold, color: colors.coralDeep },
  weatherBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  weatherBtnGhost: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  weatherBtnGhostText: {
    fontSize: 14.5,
    ...font.semibold,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
  manualBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  manualSearchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  manualInput: {
    flex: 1,
    backgroundColor: colors.bg2,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: colors.ink,
    ...font.regular,
  },
  manualSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabledGhost: { backgroundColor: colors.line },
  manualHint: { fontSize: 13, color: colors.inkFaint, ...font.regular, lineHeight: 19, marginTop: 4 },
  manualResults: { marginTop: 6, gap: 2 },
  manualResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  manualResultText: { flex: 1, fontSize: 13.5, color: colors.ink, ...font.medium, lineHeight: 19 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.soft,
  },
  ctaPressed: { backgroundColor: colors.coralDeep },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ctaText: { color: colors.white, fontSize: 17, ...font.bold },
});
