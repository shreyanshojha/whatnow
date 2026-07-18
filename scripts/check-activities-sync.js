#!/usr/bin/env node
/* ============================================================
   WhatNow — activity dataset sync check.

   The 111-activity dataset exists in two hand-maintained places:
   index.html (the static web prototype) and app/data/activities.ts
   (the native app). There's no shared source of truth or bundler
   linking them, so nothing stops the two from silently drifting
   apart when one gets edited and the other doesn't.

   This script is the stopgap: it parses both ACTIVITIES arrays and
   fails loudly (non-zero exit, a readable diff) if they don't match
   — same length, same ids in the same order, same field values.
   Run it locally after editing either file, and it's wired into CI
   (see .github/workflows/ci.yml) so a drifted PR can't merge quietly.

   This does not eliminate the duplication — that would mean giving
   index.html a build step so it can import the same source app/ uses,
   which is a bigger change to a prototype that may not be worth it.
   Until then, this script is the guardrail.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const TS_PATH = path.join(ROOT, 'app', 'data', 'activities.ts');

/** Finds `marker`, then the first `openCh` after it, then returns the
 * balanced-bracket substring from that `openCh` through its matching
 * `closeCh` (handles nested brackets/braces correctly, unlike a naive
 * indexOf('[', ...) + lastIndexOf(']') pair). */
function extractBalanced(src, marker, openCh, closeCh) {
  const startIdx = src.indexOf(marker);
  if (startIdx === -1) throw new Error(`Marker not found: ${marker}`);
  const bStart = src.indexOf(openCh, startIdx + marker.length);
  if (bStart === -1) throw new Error(`No '${openCh}' found after marker: ${marker}`);
  let depth = 0;
  let i = bStart;
  for (; i < src.length; i++) {
    if (src[i] === openCh) depth++;
    else if (src[i] === closeCh) {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return src.slice(bStart, i);
}

function loadActivities(filePath, marker) {
  const src = fs.readFileSync(filePath, 'utf8');
  const arrSrc = extractBalanced(src, marker, '[', ']');
  // eslint-disable-next-line no-new-func -- controlled input: our own source files, not user input
  return new Function(`return (${arrSrc});`)();
}

const REQUIRED_FIELDS = ['id', 't', 'd', 'cat', 'moods', 'e', 'time', 'soc', 'place', 'cost', 'why'];

function main() {
  const webActivities = loadActivities(HTML_PATH, 'const ACTIVITIES = ');
  const appActivities = loadActivities(TS_PATH, 'ACTIVITIES: Activity[] = ');

  const errors = [];

  if (webActivities.length !== appActivities.length) {
    errors.push(
      `Count mismatch: index.html has ${webActivities.length}, activities.ts has ${appActivities.length}.`
    );
  }

  const checkMissingFields = (activities, label) => {
    activities.forEach((a, i) => {
      for (const field of REQUIRED_FIELDS) {
        if (!(field in a)) errors.push(`${label}[${i}] ("${a.t ?? '?'}") missing field "${field}".`);
      }
    });
  };
  checkMissingFields(webActivities, 'index.html');
  checkMissingFields(appActivities, 'activities.ts');

  const webIds = webActivities.map((a) => a.id);
  const uniqueWebIds = new Set(webIds);
  if (uniqueWebIds.size !== webIds.length) {
    errors.push(`index.html has duplicate ids (${webIds.length} entries, ${uniqueWebIds.size} unique).`);
  }
  const appIds = appActivities.map((a) => a.id);
  const uniqueAppIds = new Set(appIds);
  if (uniqueAppIds.size !== appIds.length) {
    errors.push(`activities.ts has duplicate ids (${appIds.length} entries, ${uniqueAppIds.size} unique).`);
  }

  const n = Math.min(webActivities.length, appActivities.length);
  for (let i = 0; i < n; i++) {
    const w = webActivities[i];
    const a = appActivities[i];
    if (w.id !== a.id) {
      errors.push(`Index ${i}: id mismatch — index.html has "${w.id}", activities.ts has "${a.id}".`);
      continue; // don't pile on field diffs once ids are already out of order
    }
    for (const field of REQUIRED_FIELDS) {
      const wv = JSON.stringify(w[field]);
      const av = JSON.stringify(a[field]);
      if (wv !== av) {
        errors.push(`"${w.id}" field "${field}" differs — index.html: ${wv} | activities.ts: ${av}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`✗ Activity datasets are out of sync (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`);
    for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
    if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
    console.error(
      '\nindex.html and app/data/activities.ts must describe the exact same 111 activities. ' +
        'Edit both, or run the id-generation step again, then re-run this check.'
    );
    process.exit(1);
  }

  console.log(`✓ Activity datasets in sync — ${webActivities.length} activities match in both files.`);
}

main();
