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

// Raw, unnormalized address components from a reverse-geocode lookup —
// deliberately NOT the app's own address/locality/city/state/pincode form
// fields. "city" and "state" here are exactly what Google's
// address_components returned (the `locality` and
// `administrative_area_level_1` types respectively), which do not
// reliably match this app's own fixed CITIES/STATES dropdown lists (e.g.
// "Bangalore" vs "Bengaluru", or "Delhi NCR" — one of this app's 8 city
// options — which Google never actually returns for anywhere in the NCR).
// Normalizing/validating against those fixed lists is the CALLER's job
// (LocationPicker.tsx), not this function's — this function only reports
// what Google actually said.
export interface ReverseGeocodeResult {
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.error('[geocode] GOOGLE_GEOCODING_API_KEY not set — skipping reverse geocode.');
    return null;
  }

  try {
    // Same REST endpoint as geocodeAddress above, same server-side key —
    // Google's Geocoding API supports both directions on one endpoint,
    // just swapping the `address=` query param for `latlng=`.
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]?.address_components) {
      console.error(`[geocode] Reverse geocode failed for ${lat},${lng}: ${data.status}${data.error_message ? ' — ' + data.error_message : ''}`);
      return null;
    }

    const components = data.results[0].address_components as Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    const componentOfType = (type: string) =>
      components.find(c => c.types.includes(type))?.long_name ?? '';

    const streetNumber = componentOfType('street_number');
    const route = componentOfType('route');
    // sublocality_level_1 is the more specific of the two when present
    // (Google splits some metros into multiple sublocality levels);
    // falls back to the street name itself when neither is present,
    // rather than leaving this blank when we do have *something*
    // location-specific to offer.
    const sublocality = componentOfType('sublocality_level_1') || componentOfType('sublocality');

    return {
      address: [streetNumber, route].filter(Boolean).join(' '),
      locality: sublocality || route,
      city: componentOfType('locality'),
      state: componentOfType('administrative_area_level_1'),
      pincode: componentOfType('postal_code'),
    };
  } catch (err) {
    console.error(`[geocode] Unexpected error reverse geocoding ${lat},${lng}:`, err);
    return null;
  }
}
