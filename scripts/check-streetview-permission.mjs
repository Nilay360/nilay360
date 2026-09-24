// Standalone Street View permission check — run anytime with:
//   node scripts/check-streetview-permission.mjs
//
// Checks whether NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (the browser-facing key)
// can successfully call the Street View Static/metadata API, against a
// known-good landmark (Charminar, Hyderabad) that has guaranteed real
// coverage. If this key is missing Street View permission, Charminar will
// come back ZERO_RESULTS despite definitely having imagery — that's the
// exact signature confirmed live on 2026-09-24 while diagnosing why the
// Phase 8 Street View toggle never appears.
//
// NOTE: this hits the metadata endpoint directly via plain fetch, same as
// the browser's StreetViewService does internally — not a full browser
// test, but it isolates the key/permission question without needing to
// open the app. If this starts returning OK, the toggle in
// PropertyDetailClient.tsx (PropertyLocationMap) should start working too
// — no code change needed on that side, this is purely a permission check.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvKey(name) {
  const envPath = join(__dirname, "..", ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1).replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const KEY = loadEnvKey("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
if (!KEY || KEY === "your_google_maps_key") {
  console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set in .env.local — nothing to check.");
  process.exit(1);
}

// Charminar — real, well-documented Street View coverage. If this comes
// back anything other than OK, that's the key/permission issue, not a
// property-specific coverage gap.
const CHARMINAR = { lat: 17.3616, lng: 78.4747, label: "Charminar, Hyderabad" };

async function check(lat, lng, label) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  return { label, status: json.status, raw: json };
}

console.log(`Using key: ${KEY}`);
console.log(`Checking ${CHARMINAR.label} (${CHARMINAR.lat}, ${CHARMINAR.lng})...\n`);

const result = await check(CHARMINAR.lat, CHARMINAR.lng, CHARMINAR.label);

console.log(`Status: ${result.status}`);
if (result.status === "OK") {
  console.log("\n✅ Permission looks live — Street View Static API is working for this key.");
  console.log("   The Phase 8 toggle on property detail pages should now work too (same key, same API).");
} else if (result.status === "ZERO_RESULTS") {
  console.log("\n❌ Still ZERO_RESULTS for a location with guaranteed coverage.");
  console.log("   This is the same failure signature as before — either the permission");
  console.log("   change hasn't propagated yet, or it was applied to a different key than");
  console.log(`   the one above. Double-check in Cloud Console that THIS EXACT key string`);
  console.log("   has Street View Static API in its allowed API list.");
} else {
  console.log(`\n⚠️  Unexpected status: ${result.status}`);
  console.log(JSON.stringify(result.raw, null, 2));
}
