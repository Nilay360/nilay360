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
  // page) — resolve immediately, no duplicate <script> tag.
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
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
