/* ============================================================
   WhatNow — Open-Meteo weather (free, no key).
   Biases indoor/outdoor and produces a friendly weather note.
   Everything is wrapped so a failure degrades gracefully.
   ============================================================ */

import { WeatherState } from './plan';

interface WeatherDescriptor {
  desc: string;
  emo: string;
  bad: boolean;
  good: boolean;
}

// WMO weather interpretation codes -> friendly description
export function describeWeather(code: number): WeatherDescriptor {
  if (code === 0) return { desc: 'clear skies', emo: '☀️', bad: false, good: true };
  if (code <= 2) return { desc: 'mostly clear', emo: '🌤️', bad: false, good: true };
  if (code === 3) return { desc: 'overcast', emo: '☁️', bad: false, good: false };
  if (code === 45 || code === 48) return { desc: 'foggy', emo: '🌫️', bad: true, good: false };
  if (code >= 51 && code <= 57) return { desc: 'drizzly', emo: '🌦️', bad: true, good: false };
  if (code >= 61 && code <= 67) return { desc: 'rainy', emo: '🌧️', bad: true, good: false };
  if (code >= 71 && code <= 77) return { desc: 'snowy', emo: '❄️', bad: true, good: false };
  if (code >= 80 && code <= 82) return { desc: 'rain showers', emo: '🌧️', bad: true, good: false };
  if (code >= 85 && code <= 86) return { desc: 'snow showers', emo: '🌨️', bad: true, good: false };
  if (code >= 95) return { desc: 'stormy', emo: '⛈️', bad: true, good: false };
  return { desc: 'mild', emo: '🌥️', bad: false, good: false };
}

// Small in-memory cache keyed by rounded coordinates (respect API politeness).
const cache = new Map<string, { at: number; value: WeatherState }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherState | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}` +
      `&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('weather http ' + res.status);
    const data = await res.json();
    const cur = data && data.current;
    if (!cur || typeof cur.temperature_2m !== 'number') throw new Error('bad payload');

    const temp = Math.round(cur.temperature_2m);
    const code = cur.weather_code as number;
    const w = describeWeather(code);
    const cold = temp <= 4;
    const hot = temp >= 34;

    const value: WeatherState = {
      temp,
      code,
      desc: cold ? `${w.desc} and quite cold` : hot ? `${w.desc} and very hot` : w.desc,
      emo: w.emo,
      bad: w.bad || cold || hot,
      good: w.good && !cold && !hot,
    };
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    // Degrade gracefully — caller carries on without weather.
    return null;
  }
}

export function weatherNote(w: WeatherState): string {
  const lean = w.bad
    ? "I'll lean your plan indoors."
    : w.good
    ? 'Good conditions to get outside.'
    : 'Weather-neutral picks below.';
  return `It's ${w.temp}°C & ${w.desc} — ${lean}`;
}

/** Which of the three weather icon marks best fits this reading, for
 * callers that want to show a glyph next to weatherNote()'s text. */
export function weatherIconName(w: WeatherState): 'weather-good' | 'weather-neutral' | 'weather-bad' {
  if (w.bad) return 'weather-bad';
  if (w.good) return 'weather-good';
  return 'weather-neutral';
}
