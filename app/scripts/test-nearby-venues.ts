/* Ad-hoc live check: does the real Overpass/Nominatim pipeline in
   lib/places.ts actually return real restaurant/venue data for a real
   location? Run with: npx tsx scripts/test-nearby-venues.ts */

import { fetchNearby } from '../lib/places';

const RUSSIAN_HILL = { lat: 37.8021, lon: -122.4187 };

async function main() {
  console.log(`Fetching real nearby venues for Russian Hill, SF (${RUSSIAN_HILL.lat}, ${RUSSIAN_HILL.lon})...\n`);
  const result = await fetchNearby(RUSSIAN_HILL.lat, RUSSIAN_HILL.lon, 1500);
  console.log(`Resolved place name: ${result.placeName ?? '(none)'}`);
  console.log(`Venues found: ${result.venues.length}\n`);
  for (const v of result.venues) {
    console.log(`  - [${v.kind}] ${v.name} — ${v.distanceM}m away`);
  }
  const restaurants = result.venues.filter((v) => v.kind === 'restaurant' || v.kind === 'bar' || v.kind === 'cafe');
  console.log(`\nFood-relevant venues (restaurant/bar/cafe): ${restaurants.length}`);
  if (result.venues.length === 0) {
    console.log('\n⚠ No venues returned — either the sandbox network cannot reach overpass-api.de, or genuinely nothing nearby matched.');
  }
}

main();
