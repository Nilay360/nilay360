// Client-side only. Loads the Google Maps JavaScript API script exactly once
// per page session, regardless of how many components ask for it — the
// first caller injects the <script> tag and every caller (including that
// same first one, on remount) shares the same cached Promise.
//
// Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — the browser-safe, referrer-
// restricted key already present in env but, until now, never actually read
// by any component (see @/lib/geocode.ts's header comment for why this is a
// deliberately SEPARATE key from GOOGLE_GEOCODING_API_KEY, which is server-
// only and IP/API-restricted instead).
//
// Deliberately hand-written rather than pulling in @react-google-maps/api or
// @googlemaps/js-api-loader — nothing else in this codebase uses a Maps JS
// wrapper library (every other Google Maps touchpoint here is either a
// plain fetch() to a REST endpoint or a static iframe embed), so adding a
// dependency for one map instance isn't warranted.
//
// Fails soft: a missing key or a script-load error rejects the returned
// Promise rather than throwing synchronously — callers are expected to
// catch and simply not render a map, not crash the page.

let loadPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMapsScript(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMapsScript called outside the browser"));
  }

  // Already loaded (this call, an earlier call, or some other script on the
  // page) — but "loaded" alone isn't enough to resolve on: an earlier
  // caller may have initialized google.maps before this loader requested
  // "places" (e.g. a stale cached bundle, or in principle any other
  // script that inits Maps first). Resolving with that object as-is would
  // hand LocationPicker a maps.places that's undefined, and
  // `new maps.places.Autocomplete(...)` would throw. So: only resolve
  // immediately if the places library is actually attached; otherwise
  // lazy-load just that missing piece via Google's own importLibrary API,
  // which works on an already-initialized google.maps regardless of what
  // the original <script> tag's `libraries=` param requested — safer than
  // injecting a second script tag, which Google's loader does not
  // reliably merge library sets for and logs a duplicate-script warning
  // for instead.
  if (window.google?.maps) {
    if (window.google.maps.places) {
      return Promise.resolve(window.google.maps);
    }
    return window.google.maps.importLibrary("places").then(() => window.google.maps);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      loadPromise = null;
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set"));
      return;
    }

    const existing = document.getElementById("google-maps-js-api") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () => { loadPromise = null; reject(new Error("Google Maps script failed to load")); });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js-api";
    // "places" added for LocationPicker's Places Autocomplete (the location-
    // picker phase) — confirmed additive-only before adding this: neither
    // NearbyPlacesMap nor PropertyLocationMap (Phase 2) reference
    // google.maps.places anywhere, only Map/Marker/Size/Point, so widening
    // the requested library list doesn't change what those two already use.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else { loadPromise = null; reject(new Error("Google Maps script loaded but window.google.maps is missing")); }
    };
    script.onerror = () => { loadPromise = null; reject(new Error("Google Maps script failed to load")); };
    document.head.appendChild(script);
  });

  return loadPromise;
}
