"use client";

// Shared pin-drop + drag-to-adjust location picker, used by both
// post-property/page.tsx (create) and post-property/edit/[id]/page.tsx
// (edit). Geocode-then-adjust pattern: an address search (Places
// Autocomplete) geocodes and drops a pin; the seller can drag it to
// correct an imprecise result. Reuses loadGoogleMapsScript() (the same
// cached, fail-soft JS SDK loader Phase 2 already proved out) and the
// same dark map theme / teal circular marker styling as
// PropertyLocationMap, for visual consistency across the site's two
// Maps JS surfaces.
//
// "MANUALLY ADJUSTED" FLAG — the actual problem this solves: without it,
// re-geocoding on every address change would silently overwrite a pin the
// seller just dragged into place (e.g. while fixing an unrelated pincode
// typo after already correcting the pin). Once a drag happens, further
// address search results still update `lastGeocodedPosition` (so "Reset"
// always reverts to the newest search, not a stale one) but no longer
// move the visible pin or call onChange, until the seller explicitly
// resets.

import { useState, useEffect, useRef, useCallback } from "react";
import { loadGoogleMapsScript } from "@/lib/loadGoogleMapsScript";

// Same dark theme as PropertyLocationMap (PropertyDetailClient.tsx,
// Maps Phase 2) — duplicated here rather than imported, since that file
// isn't a shared module (it's a page-specific client component), matching
// this codebase's existing per-file-duplication convention for this kind
// of small style constant (see DashboardClient.tsx / agent/leads/page.tsx
// each defining their own Card/SectionHeading rather than sharing one).
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#111F33" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020C1C" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A9B4C2" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1B2C45" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A1526" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

function markerIcon(size: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#10C4C3" stroke="#020C1C" stroke-width="2"/></svg>`
  )}`;
}

// Fallback center when nothing else is known yet (no coordinates, no
// address text to geocode) — the approximate geographic center of India,
// not any specific city, picked only so the map has somewhere sane to
// render rather than crashing on an undefined center.
const INDIA_DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 };

type LatLng = { lat: number; lng: number };

// ─── City/state normalization against this app's own fixed dropdowns ──────
// Both post-property/page.tsx and post-property/edit/[id]/page.tsx render
// `city`/`state` as <select>s against small fixed option lists (CITIES/
// STATES, identical 8-item and 15-item lists in both files) — not free
// text. A <select> whose bound value doesn't exactly match one of its
// <option>s renders as if nothing were selected, while the underlying
// form state still holds that non-matching string, which any downstream
// code assuming one of the known literal strings (e.g. this app's own
// PP_CITY_STATE_MAP) would then silently mishandle. Google's reverse-
// geocode "locality"/"administrative_area_level_1" text must therefore be
// normalized against — or rejected as not matching — these exact lists
// before ever being handed back to a form, never assigned as-is.

// Google generally already returns the modern official name for most of
// these directly (e.g. "Bengaluru", "Mumbai", "Chennai", "Kolkata" match
// this list's exact strings as-is) — this map exists only for known
// variants: Bangalore/Bengaluru, Secunderabad as part of the Hyderabad
// metro, and the legacy Calcutta/Madras/Bombay names. Best-effort, not
// exhaustive — an unmapped name resolves to undefined below, which is the
// safe outcome (city stays unfilled), not a bug.
//
// Deliberately no entry for "Delhi NCR": it isn't a real place Google's
// Geocoding API ever returns — any pin in the National Capital Region
// resolves to an actual, distinct city (New Delhi, Gurugram, Noida,
// Ghaziabad, Faridabad, ...), and folding any of those into one umbrella
// "Delhi NCR" string would misrepresent genuinely different cities. Left
// unmapped on purpose — a seller there sees city blank and picks it
// manually, same as any other unmatched result.
const CITY_NAME_MAP: Record<string, string> = {
  'hyderabad': 'Hyderabad',
  'secunderabad': 'Hyderabad',
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'chennai': 'Chennai',
  'madras': 'Chennai',
  'pune': 'Pune',
  'kolkata': 'Kolkata',
  'calcutta': 'Kolkata',
  'ahmedabad': 'Ahmedabad',
};

function normalizeCity(rawCity: string): string | undefined {
  return CITY_NAME_MAP[rawCity.trim().toLowerCase()];
}

const KNOWN_STATES = [
  'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Telangana', 'Tamil Nadu',
  'Delhi', 'Gujarat', 'Rajasthan', 'West Bengal', 'Punjab', 'Uttar Pradesh',
  'Kerala', 'Madhya Pradesh', 'Haryana', 'Goa',
];

// A couple of known alternate forms Google can return for a state this
// app lists under one canonical string — kept minimal and conservative,
// same reasoning as CITY_NAME_MAP above.
const STATE_NAME_ALIASES: Record<string, string> = {
  'nct of delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
};

function normalizeState(rawState: string): string | undefined {
  const trimmed = rawState.trim().toLowerCase();
  const exact = KNOWN_STATES.find(s => s.toLowerCase() === trimmed);
  return exact ?? STATE_NAME_ALIASES[trimmed];
}

// What LocationPicker hands back on "Confirm Location" — city/state are
// already normalized against the lists above (or omitted entirely when
// nothing matched); the caller (either form) fills each field only if it
// is still blank, exactly like this app's existing PREFILL_SELLER_*
// pattern.
export interface ReverseGeocodedAddress {
  address: string;
  locality: string;
  city?: string;
  state?: string;
  pincode: string;
}

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  onChange: (lat: number, lng: number) => void;
  onConfirm: (addr: ReverseGeocodedAddress) => void;
}

export default function LocationPicker({
  latitude, longitude, address, locality, city, state, pincode, onChange, onConfirm,
}: LocationPickerProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const markerObjRef = useRef<google.maps.Marker | null>(null);
  const didInitialSyncRef = useRef(false);

  const [sdkFailed, setSdkFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [hasManualAdjustment, setHasManualAdjustment] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Last position arrived at via search/geocode (never a manual drag) —
  // what "Reset to searched location" restores.
  const [lastGeocodedPosition, setLastGeocodedPosition] = useState<LatLng | null>(
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null
  );

  // Long-lived event listeners (dragend, place_changed) are registered
  // once, on mount — they must always see the CURRENT onChange/
  // hasManualAdjustment, not whatever they were at listener-registration
  // time, without forcing the whole map/marker/autocomplete to be torn
  // down and rebuilt every time either changes. Refs solve that.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const hasManualAdjustmentRef = useRef(hasManualAdjustment);
  useEffect(() => { hasManualAdjustmentRef.current = hasManualAdjustment; }, [hasManualAdjustment]);

  // Build the map + marker + autocomplete exactly once. Later position
  // changes (drag, search, external prop sync) update the existing
  // objects via the refs above, never rebuild them.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(maps => {
        if (cancelled || !mapDivRef.current) return;

        const initialCenter: LatLng =
          latitude != null && longitude != null ? { lat: latitude, lng: longitude } : INDIA_DEFAULT_CENTER;

        const map = new maps.Map(mapDivRef.current, {
          center: initialCenter,
          zoom: latitude != null && longitude != null ? 16 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          styles: DARK_MAP_STYLES,
          // Without this, 'auto' (the default) resolves to 'greedy' for a
          // same-origin, non-iframe embed like this one — a single-finger
          // touch starting anywhere over the map pans it instead of
          // scrolling the page, trapping a seller's scroll gesture on a
          // long mobile form. 'cooperative' requires two fingers to pan
          // the map, so one-finger touch keeps scrolling the page through.
          gestureHandling: "cooperative",
        });
        mapObjRef.current = map;

        const marker = new maps.Marker({
          position: initialCenter,
          map,
          draggable: true,
          icon: { url: markerIcon(34), scaledSize: new maps.Size(34, 34), anchor: new maps.Point(17, 34) },
        });
        markerObjRef.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (!pos) return;
          setHasManualAdjustment(true);
          onChangeRef.current(pos.lat(), pos.lng());
        });

        if (searchInputRef.current) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["geometry"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return; // no result selected (e.g. Enter pressed with no suggestion picked) — do nothing, never crash
            const pos: LatLng = { lat: loc.lat(), lng: loc.lng() };
            // Always remember the newest search result for "Reset", even
            // while a manual adjustment is active and the pin itself isn't
            // moving — so Reset never reverts to a stale earlier search.
            setLastGeocodedPosition(pos);
            if (!hasManualAdjustmentRef.current) {
              map.setCenter(pos);
              map.setZoom(16);
              marker.setPosition(pos);
              onChangeRef.current(pos.lat, pos.lng);
            }
          });
        }

        setMapReady(true);
      })
      .catch(err => {
        console.error("[LocationPicker] Failed to load Google Maps:", err);
        if (!cancelled) setSdkFailed(true);
      });
    return () => { cancelled = true; };
    // Deliberately mount-once — see comment above the ref block for why
    // onChange/hasManualAdjustment don't belong in this dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time initial sync, run only once the map actually exists. Handles
  // both directions of a real race: the edit page loads its listing (and
  // this component's latitude/longitude props) asynchronously, which may
  // resolve before OR after the map finishes mounting.
  useEffect(() => {
    if (!mapReady || didInitialSyncRef.current) return;
    const map = mapObjRef.current;
    const marker = markerObjRef.current;
    if (!map || !marker) return;
    didInitialSyncRef.current = true; // only ever attempt this once, regardless of outcome

    if (latitude != null && longitude != null) {
      const pos = { lat: latitude, lng: longitude };
      map.setCenter(pos);
      map.setZoom(16);
      marker.setPosition(pos);
      // Deferred rather than called synchronously in the effect body: this
      // effect's real job is syncing the external Maps SDK objects above
      // (map/marker) — lastGeocodedPosition is only React state, and only
      // actually needs updating here for the race case where latitude/
      // longitude arrive asynchronously AFTER mount (e.g. the edit page's
      // DB fetch resolving late); when they're already present at mount,
      // useState's own initializer below already set this to the same
      // value, making a synchronous re-set here redundant on top of being
      // the wrong place for it.
      queueMicrotask(() => setLastGeocodedPosition(pos));
      return; // already had real coordinates — nothing to derive, no need to notify (parent already knows)
    }

    // No coordinates yet, but real address text may already exist (the
    // seller typed the plain Street Address/Locality/City/State/Pincode
    // fields before ever touching this picker) — geocode it once so the
    // pin starts somewhere real instead of the bare India-wide default.
    const composedAddress = [address, locality, city, state, pincode].filter(Boolean).join(", ");
    if (!composedAddress) return; // truly nothing to go on — stay at the default center

    (async () => {
      try {
        const res = await fetch("/api/geocode-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: composedAddress }),
        });
        const json = await res.json();
        const result = json?.result as { latitude: number; longitude: number } | null;
        if (!result) return; // no match — never crash, just stay at the default center
        const pos = { lat: result.latitude, lng: result.longitude };
        map.setCenter(pos);
        map.setZoom(16);
        marker.setPosition(pos);
        setLastGeocodedPosition(pos);
        onChangeRef.current(pos.lat, pos.lng);
      } catch (err) {
        console.error("[LocationPicker] Initial geocode from typed address failed:", err);
        // stay at the default center — never crash, per spec
      }
    })();
  }, [mapReady, latitude, longitude, address, locality, city, state, pincode]);

  const handleReset = useCallback(() => {
    setHasManualAdjustment(false);
    if (lastGeocodedPosition && mapObjRef.current && markerObjRef.current) {
      mapObjRef.current.setCenter(lastGeocodedPosition);
      markerObjRef.current.setPosition(lastGeocodedPosition);
      onChangeRef.current(lastGeocodedPosition.lat, lastGeocodedPosition.lng);
    }
  }, [lastGeocodedPosition]);

  // A real pin exists once either a search/geocode result has been
  // applied, or the seller has manually dragged the (possibly still
  // default-centered) marker somewhere — as opposed to the marker just
  // sitting at the meaningless India-wide default with nothing chosen
  // yet. Confirm Location only makes sense once one of those has
  // happened.
  const hasPlacedPin = lastGeocodedPosition !== null || hasManualAdjustment;

  const handleConfirm = useCallback(async () => {
    const pos = markerObjRef.current?.getPosition();
    if (!pos) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat(), lng: pos.lng() }),
      });
      const json = await res.json();
      const result = json?.result as {
        address: string; locality: string; city: string; state: string; pincode: string;
      } | null;
      if (!result) return; // no result / API failure — fail-soft: no autofill, no crash
      onConfirm({
        address: result.address,
        locality: result.locality,
        city: normalizeCity(result.city),
        state: normalizeState(result.state),
        pincode: result.pincode,
      });
    } catch (err) {
      console.error("[LocationPicker] Reverse geocode on confirm failed:", err);
      // fail-soft — no autofill, no crash; pin and form stay exactly as they were
    } finally {
      setConfirming(false);
    }
  }, [onConfirm]);

  if (sdkFailed) {
    // Never a blank/broken box — the rest of the form (including the
    // plain address fields, and the existing geocode-at-submit safety
    // net) keeps working with no pin at all.
    return (
      <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "12.5px", color: "#A9B4C2", fontFamily: "var(--font-body-new)" }}>
        Map unavailable right now — you can still fill in the address fields above; your listing will be geocoded automatically when you submit.
      </div>
    );
  }

  return (
    <div>
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search for the address to drop a pin…"
        autoComplete="off"
        style={{
          width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: "10px",
          background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
          // 16px, not 13px: iOS Safari auto-zooms the whole viewport on
          // focus for any input with a computed font-size under 16px —
          // 13px triggered a jarring zoom-in when tapping this field on
          // an iPhone. 16px reads slightly larger than the original design
          // but doesn't break the input's layout (padding/height unchanged).
          borderRadius: "8px", fontSize: "16px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none",
        }}
      />
      <div style={{ position: "relative", width: "100%", height: "260px", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
        {!mapReady && <div style={{ position: "absolute", inset: 0, background: "#111F33" }} />}
        <div ref={mapDivRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.4)" }}>Drag the pin to fine-tune the exact location.</span>
        {hasManualAdjustment && lastGeocodedPosition && (
          <button
            type="button"
            onClick={handleReset}
            style={{ padding: 0, background: "none", border: "none", color: "#10C4C3", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Reset to searched location
          </button>
        )}
      </div>
      {hasPlacedPin && (
        // Deliberately an outlined pill, not the wizard's solid gradient
        // Next/Submit button (S.btnPrimary elsewhere in this form) — this
        // must never read as "advance the form"; it only fills in fields
        // on the current step.
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          style={{
            marginTop: "10px",
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 16px",
            background: "transparent",
            border: `1.5px solid ${confirming ? "rgba(16,196,195,0.35)" : "#10C4C3"}`,
            borderRadius: "8px",
            color: confirming ? "rgba(16,196,195,0.6)" : "#10C4C3",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-body-new)",
            cursor: confirming ? "default" : "pointer",
          }}
        >
          {confirming ? "Looking up address…" : "Confirm Location — fill in address fields"}
        </button>
      )}
    </div>
  );
}
