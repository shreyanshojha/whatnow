import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, font } from '../lib/theme';

export interface SegOption<T> {
  val: T;
  label: string;
  ic?: string;
  aria?: string;
}

interface Props<T> {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const active = o.val === value;
          return (
            <Pressable
              key={String(o.val)}
              onPress={() => onChange(o.val)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.aria || o.label}
              style={({ pressed }) => [
                styles.seg,
                active && styles.segActive,
                pressed && styles.segPressed,
              ]}
            >
              {o.ic ? <Text style={styles.ic}>{o.ic}</Text> : null}
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 18 },
  label: {
    fontSize: 13,
    ...font.semibold,
    color: colors.inkFaint,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 9,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  segActive: {
    backgroundColor: colors.white,
    shadowColor: '#4A3226',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segPressed: { opacity: 0.7 },
  ic: { fontSize: 15 },
  segText: {
    fontSize: 14,
    ...font.medium,
    color: colors.inkSoft,
  },
  segTextActive: { color: colors.ink, ...font.semibold },
});
