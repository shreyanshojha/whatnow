import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { CatId, MoodId } from '../data/activities';
import { colors } from '../lib/theme';

/**
 * WhatNow's custom line-icon system — replaces every emoji in the product
 * (moods, categories, place/energy/budget indicators, nearby venue kinds,
 * and feedback controls) with a single cohesive geometric mark language:
 * 1.75px rounded strokes on a 24x24 grid, minimal fills used only as
 * small accents. Built with react-native-svg so it scales cleanly and
 * always matches theme color, instead of relying on the OS emoji font
 * (which looks different per-platform and reads as "generic app").
 */
export type IconName =
  | MoodId
  | CatId
  | 'indoor'
  | 'outdoor'
  | 'either'
  | 'social-solo'
  | 'social-someone'
  | 'social-group'
  | 'kids'
  | 'clock'
  | 'energy-low'
  | 'energy-medium'
  | 'energy-high'
  | 'budget-free'
  | 'budget-cheap'
  | 'budget-treat'
  | 'pin'
  | 'ticket'
  | 'compass'
  | 'heart-outline'
  | 'heart-filled'
  | 'info'
  | 'weather-good'
  | 'weather-neutral'
  | 'weather-bad'
  | 'venue-park'
  | 'venue-cafe'
  | 'venue-library'
  | 'venue-gym'
  | 'venue-restaurant'
  | 'venue-bar'
  | 'venue-museum'
  | 'venue-bookstore'
  | 'venue-cinema'
  | 'thumb-up'
  | 'thumb-down'
  | 'check'
  | 'user'
  | 'mail'
  | 'lock'
  | 'log-out'
  | 'trash'
  | 'arrow-right'
  | 'arrow-left'
  | 'shield'
  | 'other'
  | 'streak'
  | 'chart';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// A few venue/UI icons are visual aliases of an existing mark rather than
// a new drawing — kept as a lookup so we draw each shape exactly once.
const ALIAS: Partial<Record<IconName, IconName>> = {
  'venue-park': 'outdoor',
  'venue-library': 'learn',
};

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.75 }: IconProps) {
  const resolved = ALIAS[name] ?? name;
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw(resolved, s, color)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

function draw(name: IconName, s: StrokeProps, color: string) {
  switch (name) {
    // ---------------- Moods ----------------
    case 'restless':
      return <Path {...s} d="M12 12c0-4 4-4 4 0s-6 5-6-1 5-7 7-1" />;
    case 'drained':
      return (
        <>
          <Rect {...s} x="3" y="8" width="15" height="8" rx="2" />
          <Line {...s} x1="19" y1="10.5" x2="19" y2="13.5" />
          <Rect x="5.2" y="10.2" width="2.8" height="3.6" rx="0.6" fill={color} stroke="none" />
        </>
      );
    case 'anxious':
      return <Path {...s} d="M2 13h3l2-6 3 11 2-8 1.5 3H21" />;
    case 'bored':
      return (
        <>
          <Path {...s} d="M3.5 13.5c2.4-3 5-4.4 8.5-4.4s6.1 1.4 8.5 4.4" />
          <Circle cx="12" cy="13.6" r="1.2" fill={color} stroke="none" />
          <Line {...s} x1="17" y1="5" x2="18.4" y2="6.4" />
          <Line {...s} x1="19.3" y1="3.3" x2="20.7" y2="4.7" />
        </>
      );
    case 'low':
      return (
        <>
          <Path
            {...s}
            d="M6.5 11.5A3.5 3.5 0 0 1 6.8 4.6 4.5 4.5 0 0 1 15.5 5.3 3.2 3.2 0 0 1 15 11.5z"
          />
          <Line {...s} x1="8" y1="15" x2="7" y2="18.5" />
          <Line {...s} x1="12" y1="15" x2="11" y2="18.5" />
          <Line {...s} x1="16" y1="15" x2="15" y2="18.5" />
        </>
      );
    case 'frustrated':
      return <Path {...s} d="M13 2 4.5 14H10l-1 8 10-13h-5.5z" />;
    case 'content':
      return (
        <>
          <Path {...s} d="M5 19c0-8.5 4-13.5 13.5-14.5C17.5 13 12.5 18 5 19z" />
          <Line {...s} x1="6.5" y1="17.5" x2="12" y2="12" />
        </>
      );
    case 'inspired':
      return (
        <Path
          {...s}
          d="M12 3c.6 3.7 1.7 5.7 5.3 6.3-3.6.6-4.7 2.6-5.3 6.3-.6-3.7-1.7-5.7-5.3-6.3 3.6-.6 4.7-2.6 5.3-6.3z"
        />
      );
    case 'lonely':
      return <Path {...s} d="M15.5 4a8 8 0 1 0 0 16 6.6 6.6 0 0 1 0-16z" />;
    case 'overwhelmed':
      return (
        <>
          <Path {...s} d="M2.5 8.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
          <Path {...s} d="M2.5 13c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
          <Path {...s} d="M2.5 17.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
        </>
      );
    case 'playful':
      return (
        <>
          <Path
            {...s}
            d="M12 3a5 5 0 0 1 5 5c0 3.4-2.2 5.9-3.9 6.9l.9.9-2 1-2-1 .9-.9C9.2 13.9 7 11.4 7 8a5 5 0 0 1 5-5z"
          />
          <Line {...s} x1="12" y1="16.8" x2="12" y2="21" />
        </>
      );
    case 'curious':
      return (
        <>
          <Circle {...s} cx="10.3" cy="10.3" r="6" />
          <Line {...s} x1="14.8" y1="14.8" x2="20.5" y2="20.5" />
        </>
      );

    // ---------------- Categories ----------------
    case 'move':
      return (
        <>
          <Path {...s} d="M4.5 17.5 9.5 12l-5-5.5" />
          <Path {...s} d="M12 17.5 17 12l-5-5.5" />
        </>
      );
    case 'create':
      return (
        <>
          <Path {...s} d="M4 20c.2-3 1.2-4.8 3-5.8L17.3 4 20 6.7 9.8 17c-1 1.8-2.8 2.8-5.8 3z" />
          <Line {...s} x1="15" y1="6" x2="18" y2="9" />
        </>
      );
    case 'rest':
      return (
        <>
          <Path {...s} d="M4 18v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
          <Line {...s} x1="3" y1="18" x2="21" y2="18" />
          <Path {...s} d="M7.5 11V9.3A2.3 2.3 0 0 1 9.8 7h4.4a2.3 2.3 0 0 1 2.3 2.3V11" />
        </>
      );
    case 'connect':
      return (
        <>
          <Path {...s} d="M3 5h10v6.5H8.5L6 14v-2.5H3z" />
          <Path {...s} d="M10.5 9.5H21V16h-3v2.5L15.5 16h-5z" opacity={0.85} />
        </>
      );
    case 'explore':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="9" />
          <Path d="M14.7 9.3 13 13.2l-3.9 1.5 1.7-3.9z" fill={color} stroke="none" />
        </>
      );
    case 'learn':
      return (
        <>
          <Path {...s} d="M12 6.3c-1.6-1.1-4-1.6-8-1.1v13c4-.5 6.4 0 8 1.1 1.6-1.1 4-1.6 8-1.1v-13c-4-.5-6.4 0-8 1.1z" />
          <Line {...s} x1="12" y1="6.3" x2="12" y2="19.3" />
        </>
      );
    case 'indulge':
      return <Path {...s} d="M12 3c3.2 4.1 6 8.2 6 11.5a6 6 0 1 1-12 0C6 11.2 8.8 7.1 12 3z" />;
    case 'reset':
      return (
        <>
          <Path {...s} d="M19.8 12a7.8 7.8 0 1 1-2.2-5.4" />
          <Path {...s} d="M19.8 4v4.4h-4.4" />
        </>
      );

    // ---------------- Place ----------------
    case 'indoor':
      return (
        <>
          <Path {...s} d="M4 11 12 4l8 7" />
          <Path {...s} d="M6 10v9.5h12V10" />
          <Rect {...s} x="10" y="14" width="4" height="5.5" />
        </>
      );
    case 'outdoor':
      return (
        <>
          <Circle {...s} cx="12" cy="9.5" r="5.2" />
          <Line {...s} x1="12" y1="14.5" x2="12" y2="21" />
        </>
      );
    case 'either':
      return (
        <>
          <Path {...s} d="M3 7h4l10 10h4" />
          <Path {...s} d="M3 17h4l10-10h4" />
          <Path {...s} d="M18 4.5 21 7l-3 2.5" />
          <Path {...s} d="M18 14.5 21 17l-3 2.5" />
        </>
      );

    // ---------------- Social (headcount) ----------------
    case 'social-solo':
      return (
        <>
          <Circle {...s} cx="12" cy="8.6" r="3.3" />
          <Path {...s} d="M6 20c0-3.6 2.7-6.1 6-6.1s6 2.5 6 6.1" />
        </>
      );
    case 'social-someone':
      return (
        <>
          <Circle {...s} cx="8.7" cy="8.3" r="2.6" />
          <Path {...s} d="M4 19.2c0-3 2.1-5.1 4.7-5.1s4.7 2.1 4.7 5.1" />
          <Circle {...s} cx="16.2" cy="9.4" r="2.2" />
          <Path {...s} d="M12.7 19.2c.3-2.6 1.9-4.4 3.9-4.4s3.7 1.8 4 4.4" />
        </>
      );
    case 'social-group':
      return (
        <>
          <Circle {...s} cx="6.6" cy="9.4" r="2.1" />
          <Circle {...s} cx="17.4" cy="9.4" r="2.1" />
          <Circle {...s} cx="12" cy="7.8" r="2.4" />
          <Path {...s} d="M2.8 19c.2-2.5 1.7-4.1 3.8-4.1" />
          <Path {...s} d="M21.2 19c-.2-2.5-1.7-4.1-3.8-4.1" />
          <Path {...s} d="M7.7 19c.3-2.9 1.9-4.8 4.3-4.8s4 1.9 4.3 4.8" />
        </>
      );

    case 'kids':
      return (
        <>
          <Circle {...s} cx="7.5" cy="7.6" r="3.1" />
          <Path {...s} d="M2.5 19c0-3.3 2.2-5.6 5-5.6s5 2.3 5 5.6" />
          <Circle {...s} cx="17" cy="11.2" r="2" />
          <Path {...s} d="M13.3 19c.2-2.4 1.8-3.9 3.7-3.9s3.5 1.5 3.7 3.9" />
        </>
      );

    // ---------------- Time / energy / budget ----------------
    case 'clock':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="9" />
          <Line {...s} x1="12" y1="12" x2="12" y2="7" />
          <Line {...s} x1="12" y1="12" x2="15.5" y2="14" />
        </>
      );
    case 'energy-low':
      return (
        <>
          <Rect x="4" y="15" width="3.4" height="5" rx="0.6" fill={color} stroke="none" />
          <Rect {...s} x="10.3" y="11" width="3.4" height="9" rx="0.6" />
          <Rect {...s} x="16.6" y="6" width="3.4" height="14" rx="0.6" />
        </>
      );
    case 'energy-medium':
      return (
        <>
          <Rect x="4" y="15" width="3.4" height="5" rx="0.6" fill={color} stroke="none" />
          <Rect x="10.3" y="11" width="3.4" height="9" rx="0.6" fill={color} stroke="none" />
          <Rect {...s} x="16.6" y="6" width="3.4" height="14" rx="0.6" />
        </>
      );
    case 'energy-high':
      return (
        <>
          <Rect x="4" y="15" width="3.4" height="5" rx="0.6" fill={color} stroke="none" />
          <Rect x="10.3" y="11" width="3.4" height="9" rx="0.6" fill={color} stroke="none" />
          <Rect x="16.6" y="6" width="3.4" height="14" rx="0.6" fill={color} stroke="none" />
        </>
      );
    case 'budget-free':
      return <Circle {...s} cx="12" cy="12" r="8" />;
    case 'budget-cheap':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="8" />
          <Circle cx="12" cy="12" r="2.4" fill={color} stroke="none" />
        </>
      );
    case 'budget-treat':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="8" />
          <Line {...s} x1="12" y1="8.2" x2="12" y2="9.6" />
          <Line {...s} x1="12" y1="14.4" x2="12" y2="15.8" />
          <Line {...s} x1="8.2" y1="12" x2="9.6" y2="12" />
          <Line {...s} x1="14.4" y1="12" x2="15.8" y2="12" />
          <Circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
        </>
      );

    // ---------------- Misc UI ----------------
    case 'pin':
      return (
        <>
          <Path {...s} d="M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12z" />
          <Circle {...s} cx="12" cy="9" r="2.4" />
        </>
      );
    case 'ticket':
      return (
        <>
          <Path
            {...s}
            d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.7a2 2 0 0 0 0 3.6V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.7a2 2 0 0 0 0-3.6z"
          />
          <Line {...s} x1="14" y1="7" x2="14" y2="18" strokeDasharray="2 2.4" />
        </>
      );
    case 'compass':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="9.5" />
          <Path d="M15.2 8.8 13 13l-4.2 2.2L11 11z" fill={color} stroke="none" />
        </>
      );
    case 'heart-outline':
      return (
        <Path
          {...s}
          d="M12 20.2s-7.2-4.6-9.5-9.1A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.5 5.1c-2.3 4.5-9.5 9.1-9.5 9.1z"
        />
      );
    case 'heart-filled':
      return (
        <Path
          d="M12 20.2s-7.2-4.6-9.5-9.1A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.5 5.1c-2.3 4.5-9.5 9.1-9.5 9.1z"
          fill={color}
          stroke="none"
        />
      );
    case 'weather-good':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="4" />
          <Line {...s} x1="12" y1="2.5" x2="12" y2="5" />
          <Line {...s} x1="12" y1="19" x2="12" y2="21.5" />
          <Line {...s} x1="2.5" y1="12" x2="5" y2="12" />
          <Line {...s} x1="19" y1="12" x2="21.5" y2="12" />
          <Line {...s} x1="5.4" y1="5.4" x2="7.2" y2="7.2" />
          <Line {...s} x1="16.8" y1="16.8" x2="18.6" y2="18.6" />
          <Line {...s} x1="18.6" y1="5.4" x2="16.8" y2="7.2" />
          <Line {...s} x1="7.2" y1="16.8" x2="5.4" y2="18.6" />
        </>
      );
    case 'weather-neutral':
      return (
        <Path
          {...s}
          d="M6.5 15.5A3.5 3.5 0 0 1 6.8 8.6 4.5 4.5 0 0 1 15.5 9.3 3.2 3.2 0 0 1 15 15.5z"
        />
      );
    case 'weather-bad':
      return (
        <>
          <Path
            {...s}
            d="M6.5 11.5A3.5 3.5 0 0 1 6.8 4.6 4.5 4.5 0 0 1 15.5 5.3 3.2 3.2 0 0 1 15 11.5z"
          />
          <Line {...s} x1="8" y1="15" x2="7" y2="18.5" />
          <Line {...s} x1="12" y1="15" x2="11" y2="18.5" />
          <Line {...s} x1="16" y1="15" x2="15" y2="18.5" />
        </>
      );
    case 'check':
      return <Path {...s} d="M4 12.5 9 17.5 20 6" />;
    case 'info':
      return (
        <>
          <Circle {...s} cx="12" cy="12" r="9" />
          <Line {...s} x1="12" y1="11" x2="12" y2="16.5" />
          <Circle cx="12" cy="7.6" r="1.1" fill={color} stroke="none" />
        </>
      );
    case 'thumb-up':
      return (
        <Path
          {...s}
          d="M7.2 11v9H4.3v-9zm0 0 3-7.2a2 2 0 0 1 2 2v3.2h5a2 2 0 0 1 2 2.3l-1.4 5.7a2 2 0 0 1-2 1.5H7.2"
        />
      );
    case 'thumb-down':
      return (
        <Path
          {...s}
          d="M7.2 13V4H4.3v9zm0 0 3 7.2a2 2 0 0 0 2-2v-3.2h5a2 2 0 0 0 2-2.3l-1.4-5.7A2 2 0 0 0 15.8 5.5H7.2"
        />
      );

    // ---------------- Account ----------------
    case 'user':
      return (
        <>
          <Circle {...s} cx="12" cy="8.6" r="3.3" />
          <Path {...s} d="M6 20c0-3.6 2.7-6.1 6-6.1s6 2.5 6 6.1" />
        </>
      );
    case 'mail':
      return (
        <>
          <Rect {...s} x="3" y="5.5" width="18" height="13" rx="1.8" />
          <Path {...s} d="M3.5 6.5 12 13l8.5-6.5" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect {...s} x="5" y="11" width="14" height="9.5" rx="1.8" />
          <Path {...s} d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" />
          <Circle cx="12" cy="15.3" r="1.3" fill={color} stroke="none" />
        </>
      );
    case 'log-out':
      return (
        <>
          <Path {...s} d="M9.5 4H5.5a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5.5 20h4" />
          <Line {...s} x1="10" y1="12" x2="20.5" y2="12" />
          <Path {...s} d="M17 8.3 20.7 12l-3.7 3.7" />
        </>
      );
    case 'trash':
      return (
        <>
          <Path {...s} d="M4.5 7h15" />
          <Path {...s} d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
          <Path {...s} d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
          <Line {...s} x1="10" y1="11" x2="10.3" y2="17" />
          <Line {...s} x1="14" y1="11" x2="13.7" y2="17" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Line {...s} x1="3.5" y1="12" x2="19.5" y2="12" />
          <Path {...s} d="M14 6.5 20 12l-6 5.5" />
        </>
      );
    case 'arrow-left':
      return (
        <>
          <Line {...s} x1="20.5" y1="12" x2="4.5" y2="12" />
          <Path {...s} d="M10 6.5 4 12l6 5.5" />
        </>
      );
    case 'shield':
      return (
        <>
          <Path {...s} d="M12 3.2 19.5 6v6.3c0 4.7-3.3 7.7-7.5 8.5-4.2-.8-7.5-3.8-7.5-8.5V6z" />
          <Path {...s} d="M8.7 12.2l2.2 2.2 4.4-4.6" />
        </>
      );

    case 'streak':
      return (
        <Path
          {...s}
          d="M12 2.5c1 3 .3 4.4-1 5.8-1.6 1.7-2.5 3.3-2.5 5.2A5.5 5.5 0 0 0 14 19a4 4 0 0 0 2-7.5c.6 1.4.3 2.5-.4 3.3.6-3-1-4-1.4-6.3-.3 1.3-1 2-2 2.4.2-2.8-.5-5-2-9.4z"
        />
      );
    case 'chart':
      return (
        <>
          <Line {...s} x1="4" y1="4" x2="4" y2="20" />
          <Line {...s} x1="4" y1="20" x2="21" y2="20" />
          <Rect x="7.5" y="13" width="3" height="7" rx="0.6" fill={color} stroke="none" />
          <Rect x="12.5" y="9" width="3" height="11" rx="0.6" fill={color} stroke="none" />
          <Rect x="17.5" y="6" width="3" height="14" rx="0.6" fill={color} stroke="none" />
        </>
      );
    case 'other':
      return (
        <>
          <Path {...s} d="M4 17c0-6 4-10 8-10s8 4 8 10" />
          <Line {...s} x1="12" y1="10.5" x2="12" y2="13.2" />
          <Circle cx="12" cy="16.3" r="1.1" fill={color} stroke="none" />
        </>
      );

    // ---------------- Venue kinds (not aliased above) ----------------
    case 'venue-cafe':
      return (
        <>
          <Path {...s} d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
          <Path {...s} d="M16 10.5h1.7a2 2 0 0 1 0 4H16" />
          <Path {...s} d="M8 5c0 1-1 1-1 2M12 5c0 1-1 1-1 2" />
        </>
      );
    case 'venue-gym':
      return (
        <>
          <Line {...s} x1="7" y1="12" x2="17" y2="12" />
          <Rect {...s} x="2.5" y="9" width="3" height="6" rx="1" />
          <Rect {...s} x="18.5" y="9" width="3" height="6" rx="1" />
        </>
      );
    case 'venue-restaurant':
      return (
        <>
          <Line {...s} x1="6.5" y1="2" x2="6.5" y2="10" />
          <Line {...s} x1="9.5" y1="2" x2="9.5" y2="10" />
          <Path {...s} d="M6.5 10a1.5 1.5 0 0 0 3 0" />
          <Line {...s} x1="8" y1="10" x2="8" y2="22" />
          <Line {...s} x1="16" y1="2" x2="14.5" y2="12" />
          <Line {...s} x1="16" y1="2" x2="16" y2="22" />
        </>
      );
    case 'venue-bar':
      return (
        <>
          <Path {...s} d="M4.5 4h15l-7.5 8.5z" />
          <Line {...s} x1="12" y1="12.5" x2="12" y2="21" />
          <Line {...s} x1="8" y1="21" x2="16" y2="21" />
        </>
      );
    case 'venue-museum':
      return (
        <>
          <Path {...s} d="M3 9 12 4l9 5" />
          <Line {...s} x1="4.5" y1="9" x2="4.5" y2="19" />
          <Line {...s} x1="9" y1="9" x2="9" y2="19" />
          <Line {...s} x1="15" y1="9" x2="15" y2="19" />
          <Line {...s} x1="19.5" y1="9" x2="19.5" y2="19" />
          <Line {...s} x1="2" y1="20" x2="22" y2="20" />
        </>
      );
    case 'venue-bookstore':
      return (
        <>
          <Rect {...s} x="5" y="4" width="14" height="17" rx="1.5" />
          <Line {...s} x1="9" y1="4" x2="9" y2="21" />
        </>
      );
    case 'venue-cinema':
      return (
        <>
          <Path {...s} d="M4.5 9 6 4.2h3.4L7.9 9z" />
          <Path {...s} d="M10 9 11.5 4.2h3.4L13.4 9z" />
          <Rect {...s} x="4" y="9" width="16" height="11" rx="1" />
        </>
      );

    default:
      return <Circle {...s} cx="12" cy="12" r="9" />;
  }
}
