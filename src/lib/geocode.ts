// Server-side only — never import this from a "use client" component.
// Uses the Google Geocoding API (a separate REST endpoint from the Maps
// JavaScript API used client-side for the property-detail embed).
//
// IMPORTANT: does NOT reuse NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. That key is
// exposed to browsers by design (NEXT_PUBLIC_ prefix) and, per Google's
// own guidance, should be restricted by HTTP referrer — a browser-only
// concept enforced via the Referer header. A server-to-server fetch()
// call sends no browser Referer header Google will accept as matching an
// allowed pattern, so a referrer-restricted key is likely to be rejected
// here. Google's documented recommendation: use a SEPARATE key for
// server-side calls, restricted by IP address (or API-restricted only,
// no referrer/IP restriction). This file reads GOOGLE_GEOCODING_API_KEY
// (no NEXT_PUBLIC_ prefix — never sent to the browser) — a distinct env
// var from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.error('[geocode] GOOGLE_GEOCODING_API_KEY not set — skipping geocode.');
    return null;
  }
  if (!address.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
      console.error(`[geocode] Failed for "${address}": ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`);
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch (err) {
    console.error(`[geocode] Unexpected error geocoding "${address}":`, err);
    return null;
  }
}
