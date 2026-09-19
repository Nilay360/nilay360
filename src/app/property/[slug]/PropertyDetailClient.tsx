"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Reveal from "@/components/ui/Reveal";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useAuth } from "@/context/AuthContext";
import { useSavedProperties } from "@/hooks/useSavedProperties";
import ReportButton from "@/components/shared/ReportButton";
import { optimizedImageUrl } from "@/lib/image-url";
import VideoSlide from "@/components/property/VideoSlide";
import { loadGoogleMapsScript } from "@/lib/loadGoogleMapsScript";
import { getVisitorKey } from "@/lib/visitorId";

interface FloorPlanRow {
  id: string
  image_url: string
  label: string | null
  display_order: number
}

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count, so display
// must not label it "Bedrooms" / "X BHK".
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];

// Optional preference fields on the contact form (Property Matching, Phase 10).
// Reuses the exact same real category/city lists post-property/edit/[id]/page.tsx
// already uses for property_category/city — not a separate invented list — so a
// visitor's stated preference can only ever match a value that actually appears
// on real listings.
const PREFERENCE_CATEGORIES = ["apartment", "villa", "plot", "office", "retail", "penthouse", "townhouse", "warehouse"];
const PREFERENCE_CITIES = ["Hyderabad", "Mumbai", "Bengaluru", "Delhi NCR", "Chennai", "Pune", "Kolkata", "Ahmedabad"];
const PREFERENCE_BHK_OPTIONS = ["1", "2", "3", "4", "5", "5+"];

// Quick-select presets for the contact form's message field — proposed wording,
// pending confirmation. "other" leaves the field blank for free text.
type ContactMsgType = "interested" | "visit" | "pricing" | "details" | "other";
const CONTACT_MSG_OPTIONS: { id: ContactMsgType; label: string; preset: string }[] = [
  { id: "interested", label: "Interested",      preset: "I'm interested in this property" },
  { id: "visit",      label: "Schedule a Visit", preset: "I'd like to schedule a visit" },
  { id: "pricing",    label: "Pricing Questions", preset: "I have questions about pricing" },
  { id: "details",    label: "More Details",     preset: "I'd like more details/photos" },
  { id: "other",      label: "Other",            preset: "" },
];

// Contact-form validation — same email regex as AuthModal.tsx/post-property/page.tsx,
// same Indian-mobile pattern as api/send-otp/route.ts. Name check is a lightweight
// sanity filter (reject digits/symbols, require a real letter run), not a full
// name-validation library, per scope.
function isPlausibleName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (!/^[A-Za-z\s'.-]+$/.test(trimmed)) return false;
  return /[A-Za-z]{2,}/.test(trimmed);
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
}
// profile.phone is stored as "+91" + 10 digits (see api/verify-otp/route.ts) — the
// contact form already renders its own fixed "+91" label, so strip the stored
// prefix before populating the input or it shows up twice.
function stripIndianCountryCode(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length === 12 && digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div style={{ fontSize: "11px", color: "#F87171", marginTop: "-8px", marginBottom: "12px" }}>{message}</div>;
}

// TEMPORARY (requested by Vanith, 2026-07-24): Kuula 360° tours are unlocked for
// everyone regardless of subscription_tier. Flip to false to restore the paywall.
const TOURS_TEMPORARILY_UNLOCKED = true;

// Temporary experiment requested by Vanith to build user base/leads. Started 2026-08-05.
// STAYS ACTIVE UNTIL VANITH EXPLICITLY SAYS TO RELEASE/TURN OFF — no automatic expiration.
// When true, logged-out visitors see a locked/blurred preview of this page instead of the
// full property details; signing in (any tier) unlocks it. Browse/search pages are unaffected.
const REQUIRE_SIGNIN_FOR_PROPERTY_VIEW = true;

// ── Types ────────────────────────────────────────────────────
type Property = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  listing_type: string;
  status: string;
  price: number;
  price_per_sqft: number | null;
  // Deliberately NOT reusing area_sqft below (that field means built_up_
  // area, mapped from property_listings.built_up_area) — this is the
  // separate ₹/sq.ft-calculator area from migration 069, only ever used
  // to compute price_per_sqft, never for the property's actual area
  // display. show_price_per_sqft gates whether price_per_sqft is shown
  // publicly at all.
  price_per_sqft_area: number | null;
  show_price_per_sqft: boolean;
  deposit_amount: number | null;
  // Rental-only (migration 070). available_from/preferred_tenant render
  // publicly whenever set — no separate toggle, same as deposit_amount's
  // existing convention above. Brokerage is the one field with an
  // explicit opt-in toggle, per spec.
  available_from: string | null;
  preferred_tenant: string | null;
  brokerage_mode: string | null;
  brokerage_value: number | null;
  show_brokerage_details: boolean;
  area_sqft: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  floor_number: number | null;
  total_floors: number | null;
  year_built: number | null;
  is_furnished: boolean;
  address: string;
  city: string;
  neighbourhood: string | null;
  state: string;
  pincode: string | null;
  images: string[];
  amenities: string[];
  facing: string | null;
  vastu_compliant: boolean | null;
  rera_number: string | null;
  ownership_type: string | null;
  is_featured: boolean;
  views: number;
  saves: number;
  created_at: string;
  video_url: string | null;
  // Seller-uploaded walkthrough clip (Bunny Stream) — distinct from
  // video_url above (a pasted YouTube/Vimeo link, its own separate
  // "Video Tour" section, untouched). See supabase/migrations/
  // 068_property_video_upload.sql for the full naming rationale.
  video_asset_provider: string | null;
  video_asset_id: string | null;
  video_asset_status: "processing" | "ready" | "failed" | null;
  video_asset_thumbnail_url: string | null;
  kuula_tour_url: string | null;
  google_maps_url: string | null;
  seller_email?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_whatsapp?: string;
  assigned_agent_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Real owner identity — added as foundation for the owner/agent-aware
  // panel (item #12). More robust than the pre-existing seller_email
  // string-match pattern (a free-typed form field, never validated
  // against the submitter's actual login email — see 057_property_
  // listings_owner_select.sql's own investigation of that exact gap).
  user_id?: string | null;
};

// One category's cached row from nearby_places_cache (063_nearby_places_cache.sql,
// 064_nearby_places_coordinates.sql). latitude/longitude are null for any row cached
// before 064 — repopulated on that row's next weekly refresh, never faked here.
type NearbyPlace = {
  id: string;
  category: string;
  name: string;
  address: string | null;
  distance_meters: number | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
};

// Colors deliberately distinct from the site's teal accent (#10C4C3) — these are
// data/category pins, not brand CTAs, and each color is reused identically for both
// the list's icon-circle badge and that category's map markers so the two read as
// one connected system.
const NEARBY_CATEGORY_META: Record<string, { color: string; label: string; glyph: string }> = {
  hospital:      { color: "#EF4444", label: "Hospitals",       glyph: "M11 4h2v6h6v2h-6v6h-2v-6H5v-2h6V4z" },
  school:        { color: "#3B82F6", label: "Schools",         glyph: "M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4.18L12 21l7-3.64v-4.18L12 17l-7-3.82z" },
  supermarket:   { color: "#22C55E", label: "Supermarkets",    glyph: "M7 4h-2v2h2l3.6 7.59-1.35 2.44A2 2 0 0 0 11 19h9v-2h-9l1.1-2h7.45a2 2 0 0 0 1.75-1.03L23.24 8H6.21l-.94-2H2v0zM7 20a2 2 0 1 0 .001-4.001A2 2 0 0 0 7 20zm10 0a2 2 0 1 0 .001-4.001A2 2 0 0 0 17 20z" },
  gas_station:   { color: "#F59E0B", label: "Gas Stations",    glyph: "M17.8 5.8 16.4 4.4l-1.4 1.4 1.4 1.4c-.5.4-.9.9-1.1 1.5H8V4H3v18h2v-9h8v6.5c0 1.4 1.1 2.5 2.5 2.5S18 20.9 18 19.5V9.8c0-.6-.2-1.2-.6-1.6l.4-.4zM5 9V6h2v3H5zm11 10.5a.5.5 0 0 1-1 0V11h1v8.5z" },
  shopping_mall: { color: "#A855F7", label: "Shopping Malls",  glyph: "M18 6h-2a4 4 0 0 0-8 0H6a2 2 0 0 0-2 2l-1 12a2 2 0 0 0 2 2.2h14a2 2 0 0 0 2-2.2l-1-12a2 2 0 0 0-2-2zm-6-2a2 2 0 0 1 2 2H10a2 2 0 0 1 2-2zM8 10a2 2 0 0 0 4 0V8h0v2a2 2 0 0 0 4 0V8h1.1l1 12H4.9l1-12H8v2z" },
};
const NEARBY_CATEGORY_ORDER = ["hospital", "school", "supermarket", "gas_station", "shopping_mall"];
const NEARBY_VISIBLE_COUNT = 3;

function formatDistance(meters: number | null): string {
  if (meters == null) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function CategoryGlyphIcon({ category, size = 18 }: { category: string; size?: number }) {
  const meta = NEARBY_CATEGORY_META[category];
  return (
    <div style={{ width: size + 20, height: size + 20, borderRadius: "50%", background: `${meta.color}22`, border: `1px solid ${meta.color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill={meta.color}><path d={meta.glyph} /></svg>
    </div>
  );
}

// Public-safe agent card info only — same discipline as agents/[slug]/page.tsx:
// no raw phone/email/whatsapp fetched here at all, so there's nothing sensitive
// to accidentally render. slug is what "View Profile"/"Message Agent" link to.
type AssignedAgent = {
  slug: string;
  full_name: string;
  agency_name: string | null;
  years_experience: number | null;
  is_verified_badge: boolean;
};

// ── Map user-submitted property_listings row → detail Property ──
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function mapListingToProperty(row: Record<string, unknown>): Property {
  const photos = Array.isArray(row.photo_urls) ? (row.photo_urls as string[]).filter(Boolean) : [];
  const amenities = Array.isArray(row.amenities) ? (row.amenities as string[]) : [];
  return {
    id:             String(row.id ?? ""),
    slug:           typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:          typeof row.title === "string" ? row.title : "Untitled Property",
    description:    typeof row.highlights === "string" ? row.highlights : null,
    type:           typeof row.property_category === "string" ? row.property_category : "",
    listing_type:   typeof row.listing_type === "string" ? row.listing_type : "sale",
    status:         typeof row.status === "string" ? row.status : "pending_review",
    price:          num(row.price) ?? 0,
    // Previously hardcoded null — property_listings never had this
    // column until migration 069; the type/render path already existed
    // (see that migration's comment), it just had nothing to populate it.
    price_per_sqft:       typeof row.show_price_per_sqft === "boolean" && row.show_price_per_sqft ? num(row.price_per_sqft) : null,
    price_per_sqft_area:  num(row.area_sqft),
    show_price_per_sqft:  Boolean(row.show_price_per_sqft),
    // Previously hardcoded null — property_listings never had this
    // column until migration 070; same "type/render path already
    // existed, just nothing populated it" situation as price_per_sqft.
    deposit_amount:          num(row.deposit_amount),
    available_from:          typeof row.available_from === "string" ? row.available_from : null,
    preferred_tenant:        typeof row.preferred_tenant === "string" ? row.preferred_tenant : null,
    brokerage_mode:           typeof row.show_brokerage_details === "boolean" && row.show_brokerage_details && typeof row.brokerage_mode === "string" ? row.brokerage_mode : null,
    brokerage_value:          typeof row.show_brokerage_details === "boolean" && row.show_brokerage_details ? num(row.brokerage_value) : null,
    show_brokerage_details:   Boolean(row.show_brokerage_details),
    area_sqft:      num(row.built_up_area) ?? 0,
    bedrooms:       num(row.bedrooms),
    bathrooms:      num(row.bathrooms),
    parking_spaces: null,
    floor_number:   num(row.floor_number),
    total_floors:   num(row.total_floors),
    year_built:     null,
    is_furnished:   row.furnishing != null && row.furnishing !== "unfurnished",
    address:        typeof row.address === "string" ? row.address : "",
    city:           typeof row.city === "string" ? row.city : "",
    neighbourhood:  typeof row.locality === "string" ? row.locality : null,
    state:          typeof row.state === "string" ? row.state : "",
    pincode:        typeof row.pincode === "string" ? row.pincode : null,
    images:         photos,
    amenities,
    facing:         typeof row.facing === "string" ? row.facing : null,
    vastu_compliant: amenities.some(a => a.toLowerCase().includes("vastu")),
    // Previously hardcoded null, same situation as deposit_amount/
    // price_per_sqft above — property_listings.rera_number is new
    // (migration 070), a property/project-level RERA number, distinct
    // from agent_profiles.rera_number (the AGENT's own registration).
    rera_number:    typeof row.rera_number === "string" && row.rera_number.trim() ? row.rera_number : null,
    // Populated from the new listed_by column (Owner/Agent/Builder,
    // migration 070) — deliberately not renamed to match ownership_type's
    // DB-side name, since that name is already taken (with a different
    // meaning, Freehold/Leasehold) on the unrelated dead `properties`
    // table. This reuses the existing "🏠 Ownership" render slot below,
    // which previously had nothing to show.
    ownership_type: typeof row.listed_by === "string" && row.listed_by
      ? row.listed_by.charAt(0).toUpperCase() + row.listed_by.slice(1)
      : null,
    is_featured:    Boolean(row.is_featured),
    views:          num(row.views) ?? 0,
    saves:          0,
    created_at:     typeof row.created_at === "string"
      ? row.created_at
      : (typeof row.submitted_at === "string" ? row.submitted_at : new Date().toISOString()),
    video_url:      typeof row.video_url === "string" && row.video_url.trim() ? row.video_url : null,
    // Confirmed missing from Phase 1 — property_listings has these columns
    // and the wizard writes them, but this mapping never read them until now.
    video_asset_provider:      typeof row.video_asset_provider === "string" ? row.video_asset_provider : null,
    video_asset_id:            typeof row.video_asset_id === "string" && row.video_asset_id.trim() ? row.video_asset_id : null,
    video_asset_status:        row.video_asset_status === "processing" || row.video_asset_status === "ready" || row.video_asset_status === "failed"
      ? row.video_asset_status : null,
    video_asset_thumbnail_url: typeof row.video_asset_thumbnail_url === "string" && row.video_asset_thumbnail_url.trim() ? row.video_asset_thumbnail_url : null,
    kuula_tour_url: typeof row.kuula_tour_url === "string" && row.kuula_tour_url.trim() ? row.kuula_tour_url : null,
    google_maps_url: typeof row.google_maps_url === "string" && row.google_maps_url.trim() ? row.google_maps_url : null,
    seller_email:    typeof row.seller_email === "string" ? row.seller_email : undefined,
    seller_name:     typeof row.seller_name === "string" ? row.seller_name : undefined,
    seller_phone:    typeof row.seller_phone === "string" ? row.seller_phone : undefined,
    seller_whatsapp: typeof row.seller_whatsapp === "string" ? row.seller_whatsapp : undefined,
    assigned_agent_id: typeof row.assigned_agent_id === "string" ? row.assigned_agent_id : null,
    latitude:  num(row.latitude),
    longitude: num(row.longitude),
    user_id:   typeof row.user_id === "string" ? row.user_id : null,
  };
}

// ── Similar properties (active listings, same city → fall back to listing_type) ──
async function fetchSimilar(
  supabase: ReturnType<typeof createClient>,
  city: string,
  listingType: string,
  excludeId: string,
): Promise<Property[]> {
  const SELECT = "*";
  // Carousel target: 10 cards (middle of the 8-12 range) — enough to give the
  // horizontal-scroll carousel real content to scroll through.
  const TARGET = 10;
  // Primary: same city
  const { data: byCity } = await supabase
    .from("property_listings")
    .select(SELECT)
    .eq("status", "active")
    .eq("city", city)
    .neq("id", excludeId)
    .limit(TARGET);

  let rows = (byCity ?? []) as Record<string, unknown>[];

  // Fallback: top up with same listing_type when the city has too few
  if (rows.length < TARGET) {
    const haveIds = new Set(rows.map(r => String(r.id ?? "")));
    const { data: byType } = await supabase
      .from("property_listings")
      .select(SELECT)
      .eq("status", "active")
      .eq("listing_type", listingType)
      .neq("id", excludeId)
      .limit(TARGET * 2);
    for (const r of (byType ?? []) as Record<string, unknown>[]) {
      if (rows.length >= TARGET) break;
      if (!haveIds.has(String(r.id ?? ""))) { rows.push(r); haveIds.add(String(r.id ?? "")); }
    }
  }

  return rows.slice(0, TARGET).map(mapListingToProperty);
}

// ── Helpers ──────────────────────────────────────────────────
function formatPrice(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

// Full, never-rounded Indian comma grouping — for the PRIMARY price
// figure only (the listing's actual asking price/rent). formatPrice()
// above stays as the Cr/L/K shorthand used everywhere else (similar-
// property cards, EMI/loan figures, and now also this price's own
// secondary text) — deliberately not replaced, since those contexts
// want the compact form, not full digits.
function formatPriceFull(price: number): string {
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

// Secondary line next to the primary price: always the Cr/L/K shorthand,
// plus " · ₹X/sq.ft" appended only when show_price_per_sqft is on and a
// sale listing actually has both values — never for rent.
function priceSecondaryText(property: Property): string {
  const shorthand = formatPrice(property.price, property.listing_type);
  const showPsf = property.listing_type !== "rent" && property.show_price_per_sqft && property.price_per_sqft;
  return showPsf ? `≈ ${shorthand} · ₹${property.price_per_sqft!.toLocaleString("en-IN")}/sq.ft` : `≈ ${shorthand}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function calcEmi(principal: number, ratePercent: number, tenureYears: number): number {
  const r = ratePercent / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── Amenity icon map ─────────────────────────────────────────
const AMENITY_ICONS: Record<string, string> = {
  "Swimming Pool": "🏊", "Pool": "🏊", "Infinity Pool": "🏊", "Private Pool": "🏊", "Rooftop Pool": "🏊",
  "Gym": "🏋️", "Gymnasium": "🏋️",
  "Parking": "🅿️", "Covered Parking": "🅿️", "Valet Parking": "🅿️",
  "Security": "🛡️", "CCTV Security": "🛡️", "24/7 Security": "🛡️", "CCTV & Armed Security": "🛡️",
  "Garden": "🌿", "Landscaped Garden": "🌿",
  "Clubhouse": "🏛️", "Club House": "🏛️",
  "Elevator": "🛗", "Private Lift": "🛗",
  "Smart Home": "🏠", "Home Automation": "🏠", "Smart Home Automation": "🏠",
  "Power Backup": "⚡", "Solar Power": "⚡",
  "EV Charging": "🔋",
  "Home Theatre": "🎬",
  "Concierge": "🎩", "Concierge Service": "🎩",
  "Rooftop Deck": "🏙️", "Rooftop Lounge": "🏙️", "Rooftop Sky Deck": "🏙️",
  "Wine Cellar": "🍷",
  "Library": "📚",
  "Steam & Sauna": "♨️",
  "Children Play Area": "🎠",
  "Jogging Track": "🏃",
  "Badminton Court": "🏸",
  "Intercom": "📞",
  "Sky Lounge": "☁️",
  "Co-Working Space": "💻",
  "Puja Room": "🪔",
  "Staff Quarters": "🏘️",
  "Rainwater Harvesting": "💧",
};

function getAmenityIcon(name: string): string {
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "✦";
}

// ── Video embed parsing (YouTube / Vimeo) ─────────────────────
type VideoEmbed = { embedUrl: string; thumb: string | null };
function parseVideoUrl(url: string | null): VideoEmbed | null {
  if (!url) return null;
  const u = url.trim();
  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const id = yt[1];
    return { embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`, thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  }
  // Vimeo: vimeo.com/{id}
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return { embedUrl: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`, thumb: null };
  }
  return null;
}

// ── Branded brochure (opened in a new window → print/save as PDF) ──
function buildBrochureHtml(p: Property): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const spec = (label: string, value: string | null) =>
    value ? `<tr><td class="k">${esc(label)}</td><td class="v">${esc(value)}</td></tr>` : "";
  const location = [p.address, p.neighbourhood, p.city, p.state, p.pincode].filter(Boolean).join(", ");
  const amenities = p.amenities?.length
    ? `<div class="section"><h2>Amenities &amp; Features</h2><div class="amenities">${p.amenities.map(a => `<span>${esc(a)}</span>`).join("")}</div></div>`
    : "";
  const contact = [
    p.seller_name ? `Contact: ${esc(p.seller_name)}` : "",
    p.seller_phone ? `Phone: ${esc(p.seller_phone)}` : "",
    p.seller_email ? `Email: ${esc(p.seller_email)}` : "",
  ].filter(Boolean).join(" &nbsp;·&nbsp; ") || "Contact Nilay 360 for details";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${esc(p.title)} — Nilay 360</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cal Sans', Arial, sans-serif; color: #020C1C; background: #fff; padding: 48px; }
  .header { text-align: center; padding-bottom: 24px; border-bottom: 2px solid #10C4C3; margin-bottom: 32px; }
  .brand { font-family: 'Cal Sans', sans-serif; font-size: 26px; font-weight: 600; letter-spacing: 0.22em; color: #0A1526; }
  .brand span { color: #10C4C3; }
  .tagline { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7C72; margin-top: 6px; }
  h1 { font-family: 'Cal Sans', Georgia, serif; font-size: 34px; font-weight: 600; color: #0A1526; margin-bottom: 6px; }
  .price { font-family: 'Cal Sans', Georgia, serif; font-size: 30px; font-weight: 700; color: #10C4C3; margin: 12px 0; }
  .loc { font-size: 14px; color: #6B7C72; margin-bottom: 24px; }
  .section { margin-bottom: 28px; }
  h2 { font-family: 'Cal Sans', Georgia, serif; font-size: 20px; font-weight: 600; color: #0A1526; margin-bottom: 12px; border-left: 3px solid #10C4C3; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 4px; font-size: 14px; border-bottom: 1px solid #eee; }
  td.k { color: #6B7C72; width: 45%; }
  td.v { color: #020C1C; font-weight: 600; }
  p.desc { font-size: 14px; line-height: 1.7; color: #374151; }
  .amenities { display: flex; flex-wrap: wrap; gap: 8px; }
  .amenities span { font-size: 12px; padding: 5px 12px; background: rgba(16,196,195,0.12); border: 1px solid rgba(16,196,195,0.3); border-radius: 100px; color: #0B9C9B; }
  .footer { margin-top: 36px; padding-top: 20px; border-top: 2px solid #10C4C3; text-align: center; font-size: 12px; color: #6B7C72; }
  .footer .contact { color: #0A1526; font-weight: 600; margin-bottom: 6px; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
</style></head>
<body>
  <div class="header">
    <div class="brand">Nilay 360 <span>·</span></div>
    <div class="tagline">Premium Real Estate</div>
  </div>
  <h1>${esc(p.title)}</h1>
  <div class="price">${esc(formatPrice(p.price, p.listing_type))}</div>
  <div class="loc">${esc(location)}</div>
  <div class="section">
    <h2>Property Specifications</h2>
    <table>
      ${spec("Listing Type", p.listing_type === "rent" ? "For Rent" : "For Sale")}
      ${spec("Property Type", p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : null)}
      ${COMMERCIAL_CATEGORIES.includes(p.type)
        ? spec("Rooms / Cabins", p.bedrooms != null ? String(p.bedrooms) : null)
        : spec("Bedrooms", p.bedrooms != null ? `${p.bedrooms} BHK` : null)}
      ${spec(COMMERCIAL_CATEGORIES.includes(p.type) ? "Washrooms" : "Bathrooms", p.bathrooms != null ? String(p.bathrooms) : null)}
      ${spec("Built-up Area", p.area_sqft ? `${p.area_sqft.toLocaleString("en-IN")} sqft` : null)}
      ${spec("Floor", p.floor_number != null ? `${p.floor_number}${p.total_floors ? ` of ${p.total_floors}` : ""}` : null)}
      ${spec("Facing", p.facing)}
      ${spec("Furnishing", p.is_furnished ? "Furnished" : "Unfurnished")}
    </table>
  </div>
  ${p.description ? `<div class="section"><h2>About This Property</h2><p class="desc">${esc(p.description)}</p></div>` : ""}
  ${amenities}
  <div class="footer">
    <div class="contact">${contact}</div>
    <div>Generated by Nilay 360 · nilay360.com · Details are indicative; please verify before transacting.</div>
  </div>
</body></html>`;
}

// ── Site-visit time slots ─────────────────────────────────────
const VISIT_SLOTS = [
  { id: "morning", label: "Morning (10am – 12pm)" },
  { id: "afternoon", label: "Afternoon (12pm – 3pm)" },
  { id: "evening", label: "Evening (3pm – 6pm)" },
] as const;

// ── Section heading ───────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "8px" }}>{children}</h2>
      <div style={{ width: "36px", height: "2px", background: "#10C4C3", borderRadius: "1px" }} />
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "24px", ...style }}>
      {children}
    </div>
  );
}

// ── Small property card for similar ──────────────────────────
function SimilarCard({ p }: { p: Property }) {
  const img = p.images?.[0] || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block", flex: "0 0 240px", width: "240px", scrollSnapAlign: "start" }}>
      <div className="premium-card" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)" }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-8px)"; d.style.boxShadow = "0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(16,196,195,0.22)"; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(0)"; d.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)"; }}
      >
        <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
          <img src={optimizedImageUrl(img, 500)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", top: "10px", left: "10px", padding: "3px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: p.listing_type === "rent" ? "rgba(11,13,16,0.85)" : "rgba(16,196,195,0.9)", color: p.listing_type === "rent" ? "#10C4C3" : "#020C1C", border: p.listing_type === "rent" ? "1px solid rgba(16,196,195,0.5)" : "none" }}>
            {p.listing_type === "rent" ? "Rent" : "Sale"}
          </span>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#10C4C3", marginBottom: "6px" }}>{formatPrice(p.price, p.listing_type)}</div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#FFFFFF", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
          <div style={{ fontSize: "11px", color: "#A9B4C2" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</div>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {[{ v: p.bedrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Rooms" : "Beds" }, { v: p.bathrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Wash" : "Bath" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map(s => s.v != null && (
              <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF" }}>{s.v}</span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Assigned agent card (item #9) ─────────────────────────────
// No raw phone/email/whatsapp here — same admin-only-contact discipline as
// agents/[slug]/page.tsx. "View Profile" and "Message Agent" both link to
// the agent's real public profile (Message Agent anchors to #send-message,
// the existing wrapper id around the profile page's already-wired
// ContactForm) rather than duplicating that form's state/validation/insert
// logic a second time on this already-large page.
function AgentInfoCard({ agent }: { agent: AssignedAgent }) {
  return (
    <Reveal>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #020C1C 0%, #111F33 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#10C4C3", border: "1px solid rgba(255,255,255,0.1)" }}>
            {agent.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: "160px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#FFFFFF" }}>{agent.full_name}</span>
              {agent.is_verified_badge && (
                <img src="/brand/nilay360_verified_agent_badge.png" alt="Verified Agent" style={{ width: "18px", height: "18px" }} />
              )}
            </div>
            <div style={{ fontSize: "12.5px", color: "#A9B4C2", marginTop: "3px" }}>
              {agent.agency_name ? `${agent.agency_name} · ` : ""}
              {agent.years_experience != null ? `${agent.years_experience}+ yrs experience` : "Listing agent"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href={`/agents/${agent.slug}`} style={{ textDecoration: "none" }}>
              <button style={{ padding: "9px 16px", fontSize: "13px", fontWeight: 500, color: "#FFFFFF", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                View Profile
              </button>
            </a>
            <a href={`/agents/${agent.slug}#send-message`} style={{ textDecoration: "none" }}>
              <button style={{ padding: "9px 18px", fontSize: "13px", fontWeight: 600, color: "#020C1C", background: "#10C4C3", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                Message Agent
              </button>
            </a>
          </div>
        </div>
      </Card>
    </Reveal>
  );
}

// ── Owner/agent stats + shortcuts panel (item #12) ─────────────
// Replaces the buyer inquiry form's card contents when the signed-in
// viewer is this listing's owner or assigned agent. Card chrome itself
// (the outer <Card>) stays shared with the buyer-form branch — only the
// contents differ, per the render-site diff below.
function OwnerAgentStatTile({ value, label }: { value: number | null; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flex: 1 }}>
      <span style={{ fontFamily: "var(--font-support-new)", fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
        {value == null ? "—" : value.toLocaleString("en-IN")}
      </span>
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
    </div>
  );
}

function OwnerAgentPanel({
  property, isAgentSession, realViewCount, savePropertyCount, imageClickCount,
}: {
  property: Property;
  isAgentSession: boolean;
  realViewCount: number | null;
  savePropertyCount: number | null;
  imageClickCount: number | null;
}) {
  // Same two destinations confirmed correct in prior investigation:
  // agent sessions -> /agent/leads (the real, already-built leads view);
  // owner/seller sessions -> /dashboard's own Inquiries tab. Both already
  // support ?property= filtering (agent/leads/page.tsx's own fix, and
  // DashboardClient's pre-existing InquiriesTab filter).
  const inquiriesHref = isAgentSession
    ? `/agent/leads?property=${property.id}`
    : `/dashboard?tab=inquiries&property=${property.id}`;
  // Same destination MyListingsList's own Edit button already uses
  // (post-property/edit/[id]/page.tsx) — reused, not reinvented.
  const editHref = `/post-property/edit/${property.id}`;
  // "View Listing" — same destination + label MyListingsList's own row
  // action already uses (components/dashboard/MyListingsList.tsx:422,
  // "View" -> /property/${slug}). Reused even though it's technically
  // this same page: it's the established convention for "see this
  // listing" elsewhere in the app, kept consistent rather than omitted
  // just because it happens to resolve to where the owner already is.
  const viewListingHref = `/property/${property.slug}`;
  // "Manage Property" — MyListingsList's own row (Delete/Request
  // Deletion/etc.) is where the actions beyond Edit/View Leads actually
  // live; no separate per-property "manage" page exists, so this points
  // at that same row rather than inventing a new destination.
  const manageHref = `/dashboard/my-listings`;

  return (
    <div>
      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#10C4C3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
        {isAgentSession ? "You're the assigned agent" : "This is your listing"}
      </div>
      <div style={{ fontSize: "17px", fontWeight: 600, color: "#FFFFFF", marginBottom: "20px", lineHeight: 1.3 }}>{property.title}</div>

      <div style={{ display: "flex", padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px" }}>
        <OwnerAgentStatTile value={realViewCount} label="Views" />
        <div style={{ alignSelf: "stretch", width: "1px", background: "rgba(255,255,255,0.08)" }} />
        <OwnerAgentStatTile value={savePropertyCount} label="Saves" />
        <div style={{ alignSelf: "stretch", width: "1px", background: "rgba(255,255,255,0.08)" }} />
        <OwnerAgentStatTile value={imageClickCount} label="Photo Clicks" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <Link href={editHref} style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "13px", background: "#10C4C3", border: "none", borderRadius: "16px", color: "#020C1C", fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>
            Edit Listing
          </button>
        </Link>
        <Link href={inquiriesHref} style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", color: "#FFFFFF", fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
            View Leads
          </button>
        </Link>
        <Link href={viewListingHref} style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", color: "#FFFFFF", fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
            View Listing
          </button>
        </Link>
        <Link href={manageHref} style={{ textDecoration: "none" }}>
          <button style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", color: "#FFFFFF", fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
            Manage Property
          </button>
        </Link>
      </div>
    </div>
  );
}

// Shown only while identityResolving is true — static placeholder blocks
// (no animation added: this file's one existing "pulse" animation
// reference has no matching @keyframes anywhere in the codebase, so
// reusing that name would silently do nothing; not fixing that
// pre-existing, unrelated gap here, just not compounding it with a
// second broken reference). Same muted-glass tones already used
// throughout this file, no new colors.
function OwnerAgentPanelSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ height: "12px", width: "50%", background: "rgba(255,255,255,0.08)", borderRadius: "6px" }} />
      <div style={{ height: "18px", width: "80%", background: "rgba(255,255,255,0.08)", borderRadius: "6px" }} />
      <div style={{ height: "64px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", marginTop: "6px" }} />
      <div style={{ height: "44px", background: "rgba(255,255,255,0.05)", borderRadius: "16px" }} />
      <div style={{ height: "44px", background: "rgba(255,255,255,0.05)", borderRadius: "16px" }} />
    </div>
  );
}

// ── Nearby & Around: map (item #10 redesign) ──────────────────
// Property marker (larger, teal) + one marker per cached place, colored by
// category. Rows with null latitude/longitude (cached before
// 064_nearby_places_coordinates.sql, not yet refreshed) are skipped — never
// plotted at a guessed position. Fails soft: no key / script-load failure
// just means no map renders, not a crashed page.
function NearbyPlacesMap({
  propertyLat, propertyLng, places,
}: { propertyLat: number; propertyLng: number; places: Record<string, NearbyPlace[]> }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(maps => {
        if (cancelled || !mapDivRef.current) return;

        const map = new maps.Map(mapDivRef.current, {
          center: { lat: propertyLat, lng: propertyLng },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#111F33" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#020C1C" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#A9B4C2" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#1B2C45" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A1526" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ],
        });

        const svgMarker = (color: string, size: number) =>
          `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${color}" stroke="#020C1C" stroke-width="2"/></svg>`
          )}`;

        new maps.Marker({
          position: { lat: propertyLat, lng: propertyLng },
          map,
          title: "This property",
          icon: { url: svgMarker("#10C4C3", 34), scaledSize: new maps.Size(34, 34), anchor: new maps.Point(17, 17) },
          zIndex: 999,
        });

        for (const category of NEARBY_CATEGORY_ORDER) {
          const color = NEARBY_CATEGORY_META[category].color;
          for (const place of places[category] ?? []) {
            if (place.latitude == null || place.longitude == null) continue; // no real position — skip, don't guess
            new maps.Marker({
              position: { lat: place.latitude, lng: place.longitude },
              map,
              title: place.name,
              icon: { url: svgMarker(color, 22), scaledSize: new maps.Size(22, 22), anchor: new maps.Point(11, 11) },
            });
          }
        }
      })
      .catch(err => {
        console.error("[NearbyPlacesMap] Failed to load Google Maps:", err);
        if (!cancelled) setMapFailed(true);
      });
    return () => { cancelled = true; };
  }, [propertyLat, propertyLng, places]);

  if (mapFailed) return null;
  return <div ref={mapDivRef} style={{ width: "100%", height: "340px", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px", background: "#111F33" }} />;
}

// ── Location map (Maps Phase 2) ────────────────────────────────
// Replaces the old google_maps_url-dependent iframe as the PRIMARY path —
// driven directly by property.latitude/longitude, which (confirmed live,
// 2026-09-14) 100% of listings already have. google_maps_url stays a
// legacy override: only consulted if the SDK itself fails to load (see
// mapFailed below), never removed.
//
// VIEWPORT-GATED, unlike NearbyPlacesMap (which loads the Maps JS SDK
// unconditionally on mount): this card sits much higher on the page and
// renders on every single property view, so eagerly loading the SDK here
// the way NearbyPlacesMap does would multiply that cost across this
// page's own traffic. An IntersectionObserver defers even starting the
// script load until the card is within 300px of the viewport.
function PropertyLocationMap({
  latitude, longitude, title, fallbackEmbedUrl,
}: { latitude: number; longitude: number; title: string; fallbackEmbedUrl: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      // No IntersectionObserver support (very old browser) — fail open to
      // an eager load rather than a map that silently never appears.
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    loadGoogleMapsScript()
      .then(maps => {
        if (cancelled || !mapDivRef.current) return;

        const map = new maps.Map(mapDivRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          // Same dark theme as NearbyPlacesMap, for visual consistency
          // between this page's two maps.
          styles: [
            { elementType: "geometry", stylers: [{ color: "#111F33" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#020C1C" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#A9B4C2" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#1B2C45" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A1526" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ],
        });

        const markerIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#10C4C3" stroke="#020C1C" stroke-width="2"/></svg>`
        )}`;
        new maps.Marker({
          position: { lat: latitude, lng: longitude },
          map,
          title,
          icon: { url: markerIcon, scaledSize: new maps.Size(34, 34), anchor: new maps.Point(17, 17) },
        });

        setMapReady(true);
      })
      .catch(err => {
        console.error("[PropertyLocationMap] Failed to load Google Maps:", err);
        if (!cancelled) setMapFailed(true);
      });
    return () => { cancelled = true; };
  }, [inView, latitude, longitude, title]);

  // Coordinate-based deep link (dir/?api=1&destination=lat,lng) — more
  // accurate than the pre-existing locality-text search query, per spec.
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  if (mapFailed) {
    // Same fallback as the no-coordinates case: the legacy admin-pasted
    // embed link if one exists, else a plain Maps link — never a blank
    // or broken card.
    if (fallbackEmbedUrl) {
      return (
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
          <iframe
            src={fallbackEmbedUrl}
            title={`${title} — location map`}
            loading="lazy"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      );
    }
    return (
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "rgba(16,196,195,0.1)", border: "1px solid rgba(16,196,195,0.3)", textDecoration: "none" }}
      >
        View on Google Maps
      </a>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "340px", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
      {/* Fixed-height container from the first render, regardless of
          loading state — the placeholder and the real map share the exact
          same box, so mounting the map never shifts layout. */}
      {!mapReady && (
        <div style={{ position: "absolute", inset: 0, background: "#111F33" }} />
      )}
      <div ref={mapDivRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {mapReady && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ position: "absolute", bottom: "12px", right: "12px", zIndex: 2, display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, color: "#020C1C", background: "#10C4C3", textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
        >
          Get Directions
        </a>
      )}
    </div>
  );
}

// ── Nearby & Around: category card (item #10 redesign) ────────
// Colored icon-circle badge, first 3 items shown, "View All (N)" reveals
// the rest — purely local display state, no new data (the route already
// caps at 5/category).
function NearbyCategoryCard({ category, items }: { category: string; items: NearbyPlace[] }) {
  const [expanded, setExpanded] = useState(false);
  const meta = NEARBY_CATEGORY_META[category];
  const visible = expanded ? items : items.slice(0, NEARBY_VISIBLE_COUNT);
  const hiddenCount = items.length - NEARBY_VISIBLE_COUNT;

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <CategoryGlyphIcon category={category} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{meta.label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {visible.map(place => (
          <div key={place.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontSize: "12.5px", color: "#A9B4C2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.name}</span>
            <span style={{ fontSize: "11.5px", color: meta.color, fontWeight: 600, flexShrink: 0 }}>{formatDistance(place.distance_meters)}</span>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ marginTop: "12px", padding: 0, background: "none", border: "none", color: "#10C4C3", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {expanded ? "Show Less" : `View All (${items.length})`}
        </button>
      )}
    </div>
  );
}

// ── Nearby & Around: section (item #10 redesign) ──────────────
// Map first, category cards below — confirmed layout. Grouped by category,
// cache-fresh rows from nearby_places_cache via /api/nearby-places.
// Categories with zero results simply don't render; a total failure (no
// coordinates, or every category empty/failed) hides the whole section.
function NearbyPlacesSection({
  places, propertyLat, propertyLng,
}: { places: Record<string, NearbyPlace[]>; propertyLat: number; propertyLng: number }) {
  const categoriesWithResults = NEARBY_CATEGORY_ORDER.filter(c => (places[c]?.length ?? 0) > 0);
  if (categoriesWithResults.length === 0) return null;

  return (
    <Reveal>
      <div style={{ marginBottom: "24px" }}>
        <SectionHeading>Nearby &amp; Around</SectionHeading>
        <NearbyPlacesMap propertyLat={propertyLat} propertyLng={propertyLng} places={places} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {categoriesWithResults.map(category => (
            <NearbyCategoryCard key={category} category={category} items={places[category]} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

// ── Locked preview (gated by REQUIRE_SIGNIN_FOR_PROPERTY_VIEW) ──
// Shown to logged-out visitors instead of the full detail page: blurred hero,
// basic info only (same as what's already visible on listing cards), full
// details hidden behind a "Sign In" CTA that opens the existing AuthModal.
// One full-height, deliberately-centered composition — the blurred hero reads
// as a scrim behind a single frosted card, not a stray floating box.
function LockedPropertyPreview({
  property, heroImage, onSignIn,
}: { property: Property; heroImage: string; onSignIn: () => void }) {
  const isCommercial = COMMERCIAL_CATEGORIES.includes(property.type);
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; color: #FFFFFF; overflow-x: hidden; }
        .pd-lock-btn { transition: background 0.2s, box-shadow 0.2s, transform 0.2s; }
        .pd-lock-btn:hover { background: #3DDAD9 !important; transform: translateY(-1px); }
        @media (max-width: 480px) {
          .pd-lock-card { padding: 28px 22px !important; }
          .pd-lock-price { font-size: 30px !important; }
        }
      `}</style>
      <div style={{ background: "#020C1C", minHeight: "100vh" }}>
        <div style={{ position: "relative", minHeight: "calc(100vh - 64px)", marginTop: "64px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {/* Blurred hero — deliberately full-bleed scrim, not a stray image */}
          <img
            src={optimizedImageUrl(heroImage, 1200)}
            alt=""
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(36px) brightness(0.55) saturate(1.05)", transform: "scale(1.15)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,12,28,0.55) 0%, rgba(2,12,28,0.72) 45%, rgba(2,12,28,0.94) 100%)" }} />

          {/* Centered content column */}
          <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "440px", margin: "0 auto", padding: "56px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: property.listing_type === "rent" ? "rgba(11,13,16,0.85)" : "rgba(16,196,195,0.92)", color: property.listing_type === "rent" ? "#10C4C3" : "#020C1C", border: property.listing_type === "rent" ? "1px solid rgba(16,196,195,0.5)" : "none", marginBottom: "16px" }}>
              {property.listing_type === "rent" ? "For Rent" : "For Sale"}
            </span>
            <div className="pd-lock-price" style={{ fontFamily: "var(--font-support-new)", fontSize: "36px", fontWeight: 700, color: "#10C4C3", marginBottom: "4px" }}>
              {formatPriceFull(property.price)}
            </div>
            <div style={{ fontSize: "13px", color: "#A9B4C2", marginBottom: "14px" }}>
              {priceSecondaryText(property)}
            </div>
            <div style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "18px" }}>
              {property.neighbourhood ? `${property.neighbourhood}, ` : ""}{property.city}
            </div>
            <div style={{ display: "flex", gap: "20px", marginBottom: "28px" }}>
              {[
                { v: property.bedrooms, l: isCommercial ? "Rooms" : "Beds" },
                { v: property.bathrooms, l: isCommercial ? "Wash" : "Bath" },
                { v: property.area_sqft ? property.area_sqft.toLocaleString("en-IN") : null, l: "sqft" },
              ].map(s => s.v != null && (
                <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF" }}>{s.v}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Single frosted card — lock icon, CTA, and "back to browse" all live
                inside it so nothing floats loose against the blurred scrim. */}
            <div className="pd-lock-card" style={{ width: "100%", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px", padding: "36px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,196,195,0.06)" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <div style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>
                Sign In to View Full Details
              </div>
              <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.6, marginBottom: "24px" }}>
                Create a free account to see photos, exact location, amenities, and contact the seller.
              </p>
              <button
                onClick={onSignIn}
                className="pd-lock-btn"
                style={{ width: "100%", padding: "13px", background: "#10C4C3", border: "none", borderRadius: "16px", boxShadow: "0 10px 30px rgba(30,167,255,.35)", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                Sign In to View Full Details
              </button>
              <div style={{ marginTop: "20px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <a href="/properties" style={{ fontSize: "12.5px", color: "#A9B4C2", textDecoration: "none" }}>← Back to Browse</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PropertyDetailClient() {
  const params = useParams();
  const slug = params?.slug as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [similar, setSimilar] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [assignedAgent, setAssignedAgent] = useState<AssignedAgent | null>(null);
  const similarScrollRef = useRef<HTMLDivElement>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Record<string, NearbyPlace[]> | null>(null);
  // number | null (not a plain number defaulting to 0) so the new owner/
  // agent stats panel can distinguish "still loading" from "genuinely
  // zero saves" — tightened alongside that panel's build, since the
  // previous plain-0 default couldn't make that distinction.
  const [savePropertyCount, setSavePropertyCount] = useState<number | null>(null);
  // Real view count (item #2) — null means "not shown", not "zero". Only
  // fetched for this listing's own owner or assigned agent (via the shared
  // isOwnerOrAgent identity above — previously this only checked isSeller,
  // which meant an assigned agent viewing their own managed listing never
  // saw the real count; fixed as part of item #12's foundation work) or an
  // admin: property_view_events' RLS (066) restricts SELECT to owner/
  // assigned-agent/admin anyway, but a non-owner's query would come back as
  // an RLS-filtered *empty* result — indistinguishable from a genuinely-
  // zero count — so this stat is only even attempted for roles this page
  // can confirm client-side, rather than ever risking showing a false "0"
  // to an ordinary visitor browsing the listing.
  const [realViewCount, setRealViewCount] = useState<number | null>(null);
  // Image-click count (item #2's property_image_clicks) — same RLS-scoped
  // shape as realViewCount above. Not yet displayed anywhere in this file;
  // built now as foundation for item #12's owner/agent stats panel, which
  // will consume it directly rather than re-deriving a separate query.
  const [imageClickCount, setImageClickCount] = useState<number | null>(null);

  // Gallery state
  const [activeImg, setActiveImg] = useState(0);
  const [userId, setUserId] = useState<string | null>(null)
  const { savedIds, toggleSave } = useSavedProperties(userId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, []);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsgType, setContactMsgType] = useState<ContactMsgType>("interested");
  const [contactMsg, setContactMsg] = useState(CONTACT_MSG_OPTIONS[0].preset);
  const [contactFocus, setContactFocus] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactFieldErrors, setContactFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  // Optional preference fields (Property Matching, Phase 10) — collapsed by
  // default so a visitor who just wants a quick callback isn't forced through
  // them. All blank/unset until the visitor opts in; never defaulted to a
  // guessed value.
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefBudgetMin, setPrefBudgetMin] = useState("");
  const [prefBudgetMax, setPrefBudgetMax] = useState("");
  const [prefBhk, setPrefBhk] = useState("");
  const [prefLocality, setPrefLocality] = useState("");
  const [prefCity, setPrefCity] = useState("");
  const [prefPropertyType, setPrefPropertyType] = useState("");

  // EMI calculator state
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  // Feature 1 — lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Floor plans
  const [floorPlans, setFloorPlans] = useState<FloorPlanRow[]>([]);
  const [activeFloorPlan, setActiveFloorPlan] = useState(0);
  const [floorPlanZoom, setFloorPlanZoom] = useState(false);

  // Feature 4 — video tour lazy load
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Feature 2 — schedule visit modal
  const { user, profile, loading: authLoading, openAuthModal } = useAuth();

  // ── Shared owner/agent identity (foundation for item #12) ──────
  // Single source of truth, computed once, rather than the inline
  // isSeller/isAssignedAgent checks duplicated ad-hoc elsewhere in this
  // file (load()'s non-active-listing gate does its own separate,
  // narrower check — see that block's own comment for why it's
  // intentionally NOT replaced by this).
  //
  // myAgentProfileId: undefined = not yet looked up, null = looked up,
  // this user has no agent_profiles row (or lookup failed — fails
  // closed, never assumes agent access on an error), string = their
  // real agent_profiles.id. Tracked separately from a plain boolean so
  // "still checking" is distinguishable from "checked, and no."
  const [myAgentProfileId, setMyAgentProfileId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return; // wait for the real user.id, don't fetch on a stale/undefined one
    // Deferred rather than called synchronously in the effect body — same
    // pattern as LocationPicker.tsx's initial-sync effect: this only
    // avoids a same-commit cascading render, behavior is unchanged.
    if (!user?.id) { queueMicrotask(() => setMyAgentProfileId(null)); return; }
    let cancelled = false;
    // Deferred — same reasoning as above. This call was only surfaced by
    // eslint after the first violation in this same effect was fixed —
    // both are part of the same identity-lookup effect from tonight's
    // item #12 work.
    queueMicrotask(() => setMyAgentProfileId(undefined)); // re-enter "checking" for the new user id
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[PropertyDetailClient] agent_profiles identity lookup failed:", error);
        setMyAgentProfileId(null); // fail closed — never assume agent access on error
      } else {
        setMyAgentProfileId(data?.id ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  // true while any input this decision depends on hasn't resolved yet —
  // property itself, auth, or the agent_profiles lookup. Consumers (the
  // view-count gate below, and item #12's owner panel later) should wait
  // for this to go false before rendering an identity-dependent UI, so a
  // real owner/agent never sees a buyer view first and then a swap.
  const identityResolving = !property || authLoading || myAgentProfileId === undefined;

  const isOwner = useMemo(
    () => !!user?.id && !!property?.user_id && user.id === property.user_id,
    [user?.id, property?.user_id]
  );
  const isAssignedAgent = useMemo(
    // Dependency widened from property?.assigned_agent_id to the whole
    // `property` object — React Compiler's static analysis infers this
    // memo actually depends on `property` broadly (any optional-chained
    // access off a value that can be reassigned wholesale widens to the
    // parent reference), and a narrower manually-specified array than
    // what it infers makes it skip optimizing this component entirely.
    // property only changes reference on a genuine refetch, so this
    // doesn't meaningfully change how often this recomputes in practice.
    () => !!myAgentProfileId && !!property?.assigned_agent_id && myAgentProfileId === property.assigned_agent_id,
    [myAgentProfileId, property]
  );
  const isOwnerOrAgent = isOwner || isAssignedAgent;
  // Same role check DashboardClient.tsx's own isAgent uses (profile.role,
  // from useAuth() — already destructured above), reused here to decide
  // which destination "View Inquiries for this listing" should link to.
  const isAgentSession = profile?.role === "agent" || profile?.role === "builder";

  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitSlot, setVisitSlot] = useState<"morning" | "afternoon" | "evening">("morning");
  const [visitName, setVisitName] = useState("");
  const [visitPhone, setVisitPhone] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitDone, setVisitDone] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  const [prevProperty, setPrevProperty] = useState<{slug:string, title:string, price:number, photo_urls:string[]} | null>(null);
  const [nextProperty, setNextProperty] = useState<{slug:string, title:string, price:number, photo_urls:string[]} | null>(null);

  // Contact form: this page is sign-in gated, so the account's verified phone
  // is already known — pre-fill it and lock the field rather than trust a
  // free-typed number. Only when the profile has no phone on file does the
  // field stay editable (nothing verified to fall back on).
  useEffect(() => {
    if (profile?.phone) setContactPhone(stripIndianCountryCode(profile.phone));
  }, [profile?.phone]);
  const phoneLocked = !!profile?.phone;

  // Prefill name/email from the signed-in user's session/profile — same
  // "only if still blank" rule as post-property.tsx's PREFILL_SELLER_EMAIL:
  // never overwrites something the visitor already typed into the form.
  useEffect(() => {
    if (profile?.full_name) setContactName(prev => prev || profile.full_name || "");
  }, [profile?.full_name]);
  useEffect(() => {
    if (user?.email) setContactEmail(prev => prev || user.email || "");
  }, [user?.email]);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const supabase = createClient();

      // 1) Try the seed/catalog properties table
      const { data, error } = await supabase.from("properties").select("*").eq("slug", slug).single();
      if (!error && data) {
        setProperty(data as Property);
        setSimilar(await fetchSimilar(supabase, data.city, data.listing_type, data.id));
        setLoading(false);
        return;
      }

      // 2) Fall back to a user-submitted listing
      const { data: listing, error: listingErr } = await supabase
        .from("property_listings")
        .select("*")
        .eq("slug", slug)
        .single();
      if (listingErr || !listing) { setNotFound(true); setLoading(false); return; }

      const row = listing as Record<string, unknown>;
      if (row.status !== "active") {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email ?? null;
        const uid = session?.user?.id ?? null;
        const isSeller = !!userEmail && userEmail === row.seller_email;

        // Additive: also allow the approved agent assigned to a real lead
        // referencing this exact property — mirrors migration 026's RLS
        // logic (agent_profiles.status='approved' + inquiries.assigned_to),
        // just re-expressed as a frontend query since this is this
        // component's own display rule, not a database permission. 026
        // already grants the underlying row visibility; without this, an
        // assigned agent could load the row but still get bounced here.
        // inquiries.property_id is untyped TEXT (no FK, no CREATE TABLE
        // migration in-repo — see 026's own commentary), so no uuid cast
        // is needed on this side: we're filtering that text column against
        // a plain string literal (row.id), not joining it to a uuid column
        // in SQL, so there's no operator-mismatch risk here.
        // Named distinctly from the component-level `isAssignedAgent` (added
        // later, in Part 2 of item #12's foundation work) — that one checks
        // property.assigned_agent_id directly; this one is a narrower,
        // inquiry-based proxy used only for this specific visibility gate.
        // Same variable would mean two different things in the same file.
        let isAssignedAgentViaInquiry = false;
        if (!isSeller && uid) {
          const { data: myAgentProfile } = await supabase
            .from("agent_profiles")
            .select("id")
            .eq("user_id", uid)
            .eq("status", "approved")
            .maybeSingle();
          if (myAgentProfile) {
            const { data: myAssignedInquiry } = await supabase
              .from("inquiries")
              .select("id")
              .eq("property_id", String(row.id))
              .eq("assigned_to", myAgentProfile.id)
              .limit(1)
              .maybeSingle();
            isAssignedAgentViaInquiry = !!myAssignedInquiry;
          }
        }

        if (!isSeller && !isAssignedAgentViaInquiry) {
          setNotFound(true);
          setLoading(false);
          return;
        }
      }

      const mapped = mapListingToProperty(row);
      setProperty(mapped);
      setSimilar(await fetchSimilar(supabase, mapped.city, mapped.listing_type, mapped.id));
      setLoading(false);
    }
    load();
  }, [slug]);

  // Floor plans live in a separate table (property_id → property_listings.id);
  // this is a no-op for seed/catalog properties since their id has no matching rows.
  useEffect(() => {
    if (!property?.id) { setFloorPlans([]); return; }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("property_floor_plans")
      .select("id, image_url, label, display_order")
      .eq("property_id", property.id)
      .order("display_order", { ascending: true })
      .then(({ data }: { data: FloorPlanRow[] | null }) => {
        if (cancelled) return;
        setFloorPlans(data ?? []);
        setActiveFloorPlan(0);
      });
    return () => { cancelled = true; };
  }, [property?.id]);

  // Assigned agent (item #9) — gracefully absent when assigned_agent_id is
  // null, which is the common case (assignment is manual, not automatic).
  // Only public/non-sensitive fields are fetched: agent_profiles for
  // agency_name/years_experience/is_verified_badge/slug, and the same
  // public_agent_contact view agents/[slug]/page.tsx uses for full_name —
  // no phone/email/whatsapp queried here at all, so there's nothing raw to
  // accidentally render on this card.
  useEffect(() => {
    if (!property?.assigned_agent_id) { setAssignedAgent(null); return; }
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: agentProfile } = await supabase
        .from("agent_profiles")
        .select("user_id, slug, agency_name, years_experience, is_verified_badge")
        .eq("id", property.assigned_agent_id)
        .maybeSingle();
      if (cancelled || !agentProfile) { if (!cancelled) setAssignedAgent(null); return; }

      const { data: contact } = await supabase
        .from("public_agent_contact")
        .select("full_name")
        .eq("id", agentProfile.user_id)
        .maybeSingle();
      if (cancelled) return;

      setAssignedAgent({
        slug: agentProfile.slug,
        full_name: contact?.full_name || "Unnamed Agent",
        agency_name: agentProfile.agency_name,
        years_experience: agentProfile.years_experience,
        is_verified_badge: agentProfile.is_verified_badge,
      });
    })();
    return () => { cancelled = true; };
  }, [property?.assigned_agent_id]);

  // Nearby & Around (item #10) — only fires when the listing has real
  // coordinates (060_property_geocoordinates.sql is additive/nullable, so
  // plenty of listings won't). The route itself decides per-category
  // whether to hit Google or serve cache; this effect just calls it once
  // per property and renders whatever comes back.
  useEffect(() => {
    if (property?.latitude == null || property?.longitude == null) { setNearbyPlaces(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/nearby-places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: property.id, latitude: property.latitude, longitude: property.longitude }),
        });
        if (!res.ok) { if (!cancelled) setNearbyPlaces(null); return; }
        const json = await res.json();
        if (!cancelled) setNearbyPlaces(json.places ?? null);
      } catch (err) {
        console.error("[NearbyPlaces] fetch failed:", err);
        if (!cancelled) setNearbyPlaces(null);
      }
    })();
    return () => { cancelled = true; };
  }, [property?.id, property?.latitude, property?.longitude]);

  // Record one page-view event (item #2) — fire-and-forget, never blocks
  // render. Deduped server-side to one row per property+visitor+day by
  // property_view_events' own UNIQUE constraint (066), so this can safely
  // fire on every mount without inflating anything.
  useEffect(() => {
    if (!property?.id) return;
    fetch("/api/track-property-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: property.id, viewerKey: getVisitorKey(userId) }),
    }).catch(err => console.error("[PropertyDetailClient] track-property-view failed:", err));
  }, [property?.id, userId]);

  // Public save count for this one property — public_property_save_counts
  // (065) is a public view, safe to read regardless of sign-in state.
  useEffect(() => {
    // Deferred — see the identity-lookup effect above for why.
    if (!property?.id) { queueMicrotask(() => setSavePropertyCount(null)); return; }
    // Same "surfaces only after the first fix" case as the identity-lookup
    // effect above.
    queueMicrotask(() => setSavePropertyCount(null)); // resolving for this property
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("public_property_save_counts")
        .select("save_count")
        .eq("property_id", property.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) { console.error("Save count load error:", error); return; }
      setSavePropertyCount(data?.save_count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [property?.id]);

  useEffect(() => {
    const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
    // Waits on identityResolving too — not strictly required for correctness
    // (isOwnerOrAgent is already a tracked dependency and starts false, so
    // this effect re-fires once it resolves either way), but makes the
    // "don't fetch on a still-resolving identity" intent explicit rather
    // than relying on that being an incidental side effect of dependency
    // tracking.
    // Deferred — see the identity-lookup effect above for why.
    if (!property?.id || identityResolving || !(isAdmin || isOwnerOrAgent)) { queueMicrotask(() => setRealViewCount(null)); return; }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("property_view_events")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property.id);
      if (cancelled) return;
      if (error) { console.error("View count load error:", error); return; }
      setRealViewCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [property?.id, isOwnerOrAgent, identityResolving, profile?.role]);

  // Image-click count — same shape/gating as the view-count effect above,
  // just a different table. Built for item #12's owner/agent panel to
  // consume; nothing renders this yet.
  useEffect(() => {
    const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
    // Deferred — see the identity-lookup effect above for why.
    if (!property?.id || identityResolving || !(isAdmin || isOwnerOrAgent)) { queueMicrotask(() => setImageClickCount(null)); return; }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("property_image_clicks")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property.id);
      if (cancelled) return;
      if (error) { console.error("Image click count load error:", error); return; }
      setImageClickCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [property?.id, isOwnerOrAgent, identityResolving, profile?.role]);

  const scrollSimilar = useCallback((direction: "left" | "right") => {
    const el = similarScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -520 : 520, behavior: "smooth" });
  }, []);

  // Record this property in per-device "recently viewed" history
  const { addRecentlyViewed } = useRecentlyViewed();
  useEffect(() => {
    if (!property) return;
    addRecentlyViewed({
      id: property.id,
      slug: property.slug,
      title: property.title,
      city: property.city,
      price: property.price,
      listing_type: property.listing_type,
      image: property.images?.[0] ?? null,
    });
  }, [property, addRecentlyViewed]);

  useEffect(() => {
    if (!property) return;
    const fetchAdjacent = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('property_listings')
        .select('slug, title, price, photo_urls, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;

      const currentIndex = data.findIndex((p: any) => p.slug === property.slug);
      if (currentIndex === -1) return;

      setPrevProperty(currentIndex > 0 ? data[currentIndex - 1] : null);
      setNextProperty(currentIndex < data.length - 1 ? data[currentIndex + 1] : null);
    };
    fetchAdjacent();
  }, [property?.slug]);

  const emi = useMemo(() => {
    if (!property) return 0;
    const loan = property.price * (1 - downPct / 100);
    return calcEmi(loan, rate, tenure);
  }, [property, downPct, rate, tenure]);

  const loanAmount = property ? property.price * (1 - downPct / 100) : 0;
  const totalPayable = emi * tenure * 12;
  const totalInterest = totalPayable - loanAmount;

  const images = property?.images?.length
    ? property.images
    : [
        `https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80`,
        `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80`,
        `https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80`,
        `https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80`,
      ];

  // Video slide — a distinct, always-last slide in the nav sequence, never
  // merged into `images` (Option B, decided explicitly): keeps every
  // existing photo render path (optimizedImageUrl, track-image-click,
  // the lightbox) completely untouched, since none of them ever see a
  // non-URL entry in `images` itself.
  //
  // Gated on THREE things, all of which fail this closed (no video slide
  // at all, never a broken one) rather than open:
  //   - video_asset_status === 'ready' — 'processing'/'failed'/null all
  //     mean the slide doesn't exist yet, per spec (no placeholder ever
  //     shown for an in-progress or failed upload).
  //   - video_asset_id present — malformed/empty defensively excluded too.
  //   - NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID configured — without it,
  //     VideoSlide has no way to build a playable embed URL at all, so
  //     the slide is skipped entirely rather than existing-but-broken.
  const hasVideoSlide = Boolean(
    property?.video_asset_status === "ready" &&
    property.video_asset_id &&
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID
  );
  const videoSlideIndex = images.length; // always last, only meaningful when hasVideoSlide
  const slideCount = images.length + (hasVideoSlide ? 1 : 0);

  const nextImg = useCallback(() => setActiveImg(i => (i + 1) % slideCount), [slideCount]);
  const prevImg = useCallback(() => setActiveImg(i => (i - 1 + slideCount) % slideCount), [slideCount]);

  // Opening the lightbox is this page's "photo click" engagement event
  // (item #2) — one handler shared by every entry point (main image,
  // "View All Photos" buttons) so the tracking call only lives in one
  // place rather than being duplicated at each onClick.
  const openLightbox = useCallback(() => {
    setLightboxOpen(true);
    // activeImg can point at the video slide (index === images.length,
    // when hasVideoSlide) — images[activeImg] would be undefined there,
    // so this only fires the click-tracking call for an actual photo.
    if (property?.id && activeImg < images.length) {
      fetch("/api/track-image-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, imageUrl: images[activeImg], viewerKey: getVisitorKey(userId) }),
      }).catch(err => console.error("[PropertyDetailClient] track-image-click failed:", err));
    }
    // Dependency widened from property?.id to the whole `property` object —
    // same React Compiler inference-mismatch reasoning as isAssignedAgent
    // above. property only changes reference on a genuine refetch, so this
    // doesn't meaningfully change how often this callback gets recreated.
  }, [property, images, activeImg, userId]);

  // Lightbox keyboard nav + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImg();
      else if (e.key === "ArrowLeft") prevImg();
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, nextImg, prevImg]);

  // Pre-fill the visit form from the logged-in user's profile when it opens
  useEffect(() => {
    if (!visitOpen) return;
    // Seeding form fields from the external auth/profile system on open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitName(prev => prev || profile?.full_name || "");
    setVisitPhone(prev => prev || profile?.phone || "");
  }, [visitOpen, profile]);

  const today = new Date().toISOString().split("T")[0];
  const video = useMemo(() => parseVideoUrl(property?.video_url ?? null), [property?.video_url]);

  // Fetched in isolation (not via AuthContext's profile) so a missing
  // subscription_tier column only affects this gate, not every signed-in
  // page's auth state.
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id || (!property?.kuula_tour_url && floorPlans.length === 0)) { setSubscriptionTier(null); return; }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }: { data: { subscription_tier?: string } | null; error: unknown }) => {
        if (cancelled) return;
        if (error) { console.error("Subscription tier fetch error:", error); return; }
        setSubscriptionTier(data?.subscription_tier ?? null);
      });
    return () => { cancelled = true; };
  }, [user?.id, property?.kuula_tour_url, floorPlans.length]);
  const isPremium = subscriptionTier === "premium";
  const tourUnlocked = TOURS_TEMPORARILY_UNLOCKED || isPremium;
  const hasTour = !!property?.kuula_tour_url;

  // Locality + city + state only — no precise street address in the query, per privacy-by-default.
  const mapsUrl = useMemo(() => {
    const query = [property?.neighbourhood, property?.city, property?.state].filter(Boolean).join(", ");
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
  }, [property?.neighbourhood, property?.city, property?.state]);

  // Only a real Google Maps "Embed a map" link (google.com/maps/embed?pb=...) will
  // render in an iframe — regular share/place links set X-Frame-Options and refuse
  // to be framed, and no client-side query-string trick can change that. If the
  // admin pasted the wrong kind of link, fall back to the search link-button below
  // instead of showing a broken iframe.
  const embedMapsUrl = useMemo(() => {
    const url = property?.google_maps_url;
    return url && url.includes("google.com/maps/embed") ? url : null;
  }, [property?.google_maps_url]);

  async function submitVisit() {
    if (!property) return;
    if (!visitName.trim() || !visitPhone.trim()) { setVisitError("Name and phone are required"); return; }
    if (!visitDate) { setVisitError("Please choose a visit date"); return; }
    setVisitSubmitting(true);
    setVisitError(null);
    const slotLabel = VISIT_SLOTS.find(s => s.id === visitSlot)?.label ?? visitSlot;
    const supabase = createClient();
    // Re-check the session directly at submit time rather than trusting
    // `user` from useAuth() — that hook's `loading` can flip to false
    // via AuthContext's 5s safety timer before its own refreshAuth()
    // call has actually set `user`, and this write shouldn't depend on
    // winning or losing that race. auth.getUser() asks Supabase for the
    // current session right now, independent of whatever React state
    // happens to say.
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { error } = await supabase.from("site_visits").insert({
      property_id:     property.id,
      property_slug:   property.slug,
      property_title:  property.title,
      seller_email:    property.seller_email ?? null,
      visitor_name:    visitName,
      visitor_phone:   visitPhone,
      visit_date:      visitDate,
      visit_time_slot: slotLabel,
      status:          "pending",
      // 048 (live) — links this booking back to the logged-in user, if
      // any, so it can show up in their own "My Appointments" view.
      // null for a signed-out booking, same as every historical row —
      // the INSERT policy (WITH CHECK (true)) already permits both.
      visitor_user_id: currentUser?.id ?? null,
    });
    setVisitSubmitting(false);
    if (error) {
      console.error("Site visit error:", error);
      setVisitError("Could not schedule. Please try again.");
      return;
    }
    setVisitDone(true);
    // Fire-and-forget seller notification — visit already saved
    fetch("/api/send-inquiry-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerEmail:   property.seller_email ?? null,
        sellerName:    property.seller_name ?? null,
        inquirerName:  visitName,
        inquirerEmail: user?.email ?? null,
        inquirerPhone: visitPhone,
        message:       `Site visit requested for ${visitDate} — ${slotLabel}.`,
        propertyTitle: property.title,
        inquiryType:   "site_visit",
      }),
    }).catch(err => console.error("Site visit email failed:", err));
  }

  function downloadBrochure() {
    if (!property) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(buildBrochureHtml(property));
    w.document.close();
  }

  function inputStyle(focused: boolean, hasError?: boolean): React.CSSProperties {
    return {
      width: "100%", padding: "11px 14px",
      background: hasError ? "rgba(185,28,28,0.12)" : "rgba(255,255,255,0.06)",
      border: hasError ? "1px solid #F87171" : focused ? "1px solid #10C4C3" : "1px solid rgba(255,255,255,0.10)",
      borderRadius: "16px",
      fontSize: "13px", color: "#FFFFFF",
      fontFamily: "var(--font-body-new)",
      outline: "none", transition: "border-color 0.15s, background 0.15s",
      marginBottom: "12px",
    };
  }

  async function submitInquiry(inquiryType: "callback" | "viewing") {
    if (!property) return;
    // Fully own the error state here — this always replaces contactFieldErrors
    // wholesale (never merges with prior state), so a leftover WhatsApp-Owner
    // error can never survive into a Request Callback attempt, and vice versa.
    const fieldErrors: { name?: string; email?: string; phone?: string } = {};
    if (!isPlausibleName(contactName)) fieldErrors.name = "Please enter your real name.";
    if (!isValidEmail(contactEmail)) fieldErrors.email = "Please enter a valid email address.";
    // Skip format-checking the phone when it's locked to the verified account number —
    // trust the account, don't dead-end the user on a field they can't edit here.
    if (!phoneLocked && contactPhone && !isValidIndianMobile(contactPhone)) fieldErrors.phone = "Please enter a valid 10-digit mobile number.";
    if (Object.keys(fieldErrors).length > 0) { setContactFieldErrors(fieldErrors); return; }
    setContactFieldErrors({});
    setContactSubmitting(true);
    setContactError(null);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").insert({
      property_id:    property.id,
      property_slug:  property.slug,
      property_title: property.title,
      seller_email:   property.seller_email ?? null,
      inquirer_name:  contactName,
      inquirer_email: contactEmail,
      inquirer_phone: contactPhone || null,
      message:        contactMsg || null,
      inquiry_type:   inquiryType,
      status:         "new",
      budget_min:               prefBudgetMin.trim() ? Number(prefBudgetMin) : null,
      budget_max:               prefBudgetMax.trim() ? Number(prefBudgetMax) : null,
      bhk:                      prefBhk || null,
      preferred_locality:       prefLocality.trim() || null,
      preferred_city:           prefCity || null,
      property_type_preference: prefPropertyType || null,
    });
    setContactSubmitting(false);
    if (error) {
      console.error("Inquiry error:", error);
      setContactError("Could not send. Please try again.");
    } else {
      setContactSent(true);
      // Fire-and-forget — inquiry already saved; email failure must not surface to user
      fetch("/api/send-inquiry-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerEmail:   property.seller_email ?? null,
          sellerName:    property.seller_name ?? null,
          inquirerName:  contactName,
          inquirerEmail: contactEmail,
          inquirerPhone: contactPhone || null,
          message:       contactMsg || null,
          propertyTitle: property.title,
          inquiryType,
        }),
      }).catch((err) => console.error("Inquiry email failed:", err));
    }
  }

  const handleInquiry = () => submitInquiry("callback");

  // WhatsApp number: prefer seller_whatsapp, fall back to seller_phone; normalise to 91 + 10 digits
  const waRaw = (property?.seller_whatsapp || property?.seller_phone || "").replace(/\D/g, "");
  const waNumber = waRaw ? (waRaw.length === 10 ? `91${waRaw}` : waRaw) : "";

  // Wait for auth to resolve too (when the gate is on) so we don't flash full
  // content before locking it — the property spinner covers both.
  if (loading || (REQUIRE_SIGNIN_FOR_PROPERTY_VIEW && authLoading)) return (
    <>
      <div style={{ minHeight: "100vh", background: "#020C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", color: "#FFFFFF", opacity: 0.6, animation: "pulse 1.6s ease-in-out infinite" }}>Loading property…</div>
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <div style={{ minHeight: "100vh", background: "#020C1C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ fontSize: "64px", opacity: 0.25, color: "#FFFFFF" }}>⌂</div>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "40px", fontWeight: 300, color: "#FFFFFF" }}>Property Not Found</h1>
        <p style={{ fontSize: "14px", color: "#A9B4C2" }}>This listing may have been removed or the URL is incorrect.</p>
        <a href="/properties" style={{ marginTop: "8px", padding: "12px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 700, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>Browse Properties</a>
      </div>
    </>
  );

  if (!property) return null;

  if (REQUIRE_SIGNIN_FOR_PROPERTY_VIEW && !user) {
    return (
      <LockedPropertyPreview
        property={property}
        heroImage={images[0]}
        onSignIn={() => openAuthModal("signin")}
      />
    );
  }

  // Shared badges + share/save/report overlay — sits on top of whichever
  // section is currently primary (the tour hero when hasTour, else the gallery hero).
  const heroTopControls = (
    <>
      {/* Badges */}
      <div style={{ position: "absolute", top: "24px", left: "24px", display: "flex", gap: "8px" }}>
        <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: property.listing_type === "rent" ? "rgba(11,13,16,0.85)" : "rgba(16,196,195,0.92)", color: property.listing_type === "rent" ? "#10C4C3" : "#020C1C", border: property.listing_type === "rent" ? "1px solid rgba(16,196,195,0.5)" : "none", backdropFilter: "blur(8px)" }}>
          {property.listing_type === "rent" ? "For Rent" : "For Sale"}
        </span>
        {property.is_featured && (
          <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(11,13,16,0.85)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.5)", backdropFilter: "blur(8px)" }}>Premium</span>
        )}
      </div>

      {/* Share + Save */}
      <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => { if (navigator.share) { navigator.share({ title: property.title, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); } }}
          className="pd-lb-btn"
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body-new)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          Share
        </button>
        <button
          onClick={() => toggleSave(property.id)}
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "999px", background: savedIds.has(property.id) ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.06)", border: savedIds.has(property.id) ? "1px solid rgba(16,196,195,0.5)" : "1px solid rgba(255,255,255,0.10)", color: savedIds.has(property.id) ? "#10C4C3" : "#fff", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body-new)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", transition: "all 0.15s" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={savedIds.has(property.id) ? "#10C4C3" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          {savedIds.has(property.id) ? "Saved" : "Save"}
          {/* Only shown for a real positive count — a "Save · 0" reads as
              "nobody wants this", so a zero/unknown count shows nothing. */}
          {(savePropertyCount ?? 0) > 0 && ` · ${savePropertyCount}`}
        </button>
        <ReportButton entityType="listing" entityId={property.id} variant="dark" />
      </div>
    </>
  );

  // 360° tour hero content — same iframe/locked-preview logic that used to live
  // further down the page, now reused as the primary hero when hasTour is true.
  const tourHeroBody = tourUnlocked ? (
    <iframe
      src={property.kuula_tour_url ?? undefined}
      title={`${property.title} — 360° virtual tour`}
      allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
      allowFullScreen
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
    />
  ) : (
    <>
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: property.images?.[0] ? `url(${optimizedImageUrl(property.images[0], 1600)})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(16px)", transform: "scale(1.1)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(11,13,16,0.72)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px", textAlign: "center" }}>
        <span style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(16,196,195,0.15)", border: "1.5px solid rgba(16,196,195,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10C4C3" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </span>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>360° Virtual Tour</div>
        <div style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "320px" }}>Upgrade to Premium to view</div>
        {user ? (
          <a
            href="/pricing"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.03em", color: "#020C1C", background: "#10C4C3", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Upgrade to Premium
          </a>
        ) : (
          <button
            onClick={() => openAuthModal("signin")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.03em", color: "#020C1C", background: "#10C4C3", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Sign In to Unlock
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; color: #FFFFFF; overflow-x: hidden; }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #10C4C3; cursor: pointer; border: 2px solid #0A1526; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        html, body { max-width: 100vw; overflow-x: hidden !important; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.45); }
        input[type=date] { color-scheme: dark; }
        .pd-lb-btn { transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .pd-lb-btn:hover { border-color: rgba(16,196,195,0.55) !important; color: #10C4C3 !important; background: rgba(16,196,195,0.12) !important; }
        .pd-btn-primary:hover { background: #3DDAD9 !important; }
        @media (max-width: 768px) {
          .pd-nav { padding: 0 16px !important; }
          .pd-nav-links { display: none !important; }
          .pd-breadcrumb { padding: 12px 16px !important; }
          .pd-layout { flex-direction: column !important; padding: 0 16px 48px !important; }
          .pd-left { flex: none !important; width: 100% !important; }
          .pd-right { flex: none !important; width: 100% !important; position: static !important; top: auto !important; }
          .pd-emi-grid { grid-template-columns: 1fr !important; }
          .pd-prev-next { padding: 32px 16px !important; grid-template-columns: 1fr !important; }
        }
        .pd-similar-scroll::-webkit-scrollbar { height: 6px; }
        .pd-similar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .pd-similar-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={{ background: "#020C1C", minHeight: "100vh" }}>

        <div style={{ paddingTop: "64px" }}>

          {hasTour ? (
            <>
              {/* ── 360° VIRTUAL TOUR (PRIMARY HERO) ── */}
              <div style={{ background: "#0A1526", position: "relative" }}>
                <div style={{ position: "relative", height: "520px", overflow: "hidden" }}>
                  {tourHeroBody}
                  {heroTopControls}
                  <span style={{ position: "absolute", bottom: "24px", left: "24px", display: "inline-flex", alignItems: "center", gap: "7px", padding: "6px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "11px", fontWeight: 600, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    360° Virtual Tour
                  </span>
                </div>
              </div>

              {/* ── PHOTO GALLERY (SECONDARY) ── */}
              <div style={{ background: "#0A1526", position: "relative", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ padding: "14px 24px 0" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2" }}>View More Photos</div>
                </div>
                <div style={{ position: "relative", height: "320px", overflow: "hidden" }}>
                  {hasVideoSlide && activeImg === videoSlideIndex ? (
                    <VideoSlide
                      videoAssetId={property.video_asset_id as string}
                      thumbnailUrl={property.video_asset_thumbnail_url ?? null}
                      title={property.title}
                      height="320px"
                    />
                  ) : (
                    <img
                      src={optimizedImageUrl(images[activeImg], 1600)}
                      alt={property.title}
                      onClick={openLightbox}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.3s", cursor: "zoom-in" }}
                    />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)", pointerEvents: "none" }} />

                  <button
                    onClick={openLightbox}
                    className="pd-lb-btn"
                    style={{ position: "absolute", bottom: "16px", left: "24px", display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    View All {images.length} Photos
                  </button>

                  <div style={{ position: "absolute", bottom: "16px", right: "24px", padding: "5px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", color: "#fff", fontSize: "12px" }}>
                    {activeImg + 1} / {slideCount}
                  </div>
                </div>

                {/* Thumbnails */}
                <div style={{ display: "flex", gap: "4px", padding: "4px", background: "#0A1526" }}>
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveImg(i)}
                      style={{ flex: 1, height: "80px", overflow: "hidden", cursor: "pointer", opacity: activeImg === i ? 1 : 0.55, border: activeImg === i ? "2px solid #10C4C3" : "2px solid transparent", borderRadius: "4px", transition: "opacity 0.15s, border-color 0.15s" }}
                    >
                      <img src={optimizedImageUrl(img, 200)} alt={`View ${i + 1}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ))}
                  {hasVideoSlide && (
                    <div
                      onClick={() => setActiveImg(videoSlideIndex)}
                      style={{ flex: 1, height: "80px", overflow: "hidden", cursor: "pointer", position: "relative", opacity: activeImg === videoSlideIndex ? 1 : 0.55, border: activeImg === videoSlideIndex ? "2px solid #10C4C3" : "2px solid transparent", borderRadius: "4px", transition: "opacity 0.15s, border-color 0.15s" }}
                    >
                      {property.video_asset_thumbnail_url ? (
                        <img src={optimizedImageUrl(property.video_asset_thumbnail_url, 200)} alt="Walkthrough video" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #020C1C 0%, #0A1526 100%)" }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── IMAGE GALLERY (PRIMARY HERO — no tour on this listing) ── */
            <div style={{ background: "#0A1526", position: "relative" }}>
              {/* Main image */}
              <div style={{ position: "relative", height: "520px", overflow: "hidden" }}>
                {hasVideoSlide && activeImg === videoSlideIndex ? (
                  <VideoSlide
                    videoAssetId={property.video_asset_id as string}
                    thumbnailUrl={property.video_asset_thumbnail_url ?? null}
                    title={property.title}
                    height="520px"
                  />
                ) : (
                  <img
                    src={optimizedImageUrl(images[activeImg], 1600)}
                    alt={property.title}
                    onClick={openLightbox}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.3s", cursor: "zoom-in" }}
                  />
                )}
                {/* Dark overlay gradient */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)", pointerEvents: "none" }} />

                {/* View all photos */}
                <button
                  onClick={openLightbox}
                  className="pd-lb-btn"
                  style={{ position: "absolute", bottom: "100px", left: "24px", display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  View All {images.length} Photos
                </button>

                {heroTopControls}

                {/* Image counter */}
                <div style={{ position: "absolute", bottom: "100px", right: "24px", padding: "5px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", color: "#fff", fontSize: "12px" }}>
                  {activeImg + 1} / {slideCount}
                </div>
              </div>

              {/* Thumbnails */}
              <div style={{ display: "flex", gap: "4px", padding: "4px", background: "#0A1526" }}>
                {images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{ flex: 1, height: "80px", overflow: "hidden", cursor: "pointer", opacity: activeImg === i ? 1 : 0.55, border: activeImg === i ? "2px solid #10C4C3" : "2px solid transparent", borderRadius: "4px", transition: "opacity 0.15s, border-color 0.15s" }}
                  >
                    <img src={optimizedImageUrl(img, 200)} alt={`View ${i + 1}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                ))}
                {hasVideoSlide && (
                  <div
                    onClick={() => setActiveImg(videoSlideIndex)}
                    style={{ flex: 1, height: "80px", overflow: "hidden", cursor: "pointer", position: "relative", opacity: activeImg === videoSlideIndex ? 1 : 0.55, border: activeImg === videoSlideIndex ? "2px solid #10C4C3" : "2px solid transparent", borderRadius: "4px", transition: "opacity 0.15s, border-color 0.15s" }}
                  >
                    {property.video_asset_thumbnail_url ? (
                      <img src={optimizedImageUrl(property.video_asset_thumbnail_url, 200)} alt="Walkthrough video" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #020C1C 0%, #0A1526 100%)" }} />
                    )}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BREADCRUMB ── */}
          <div className="pd-breadcrumb" style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px 48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <a href="/" style={{ fontSize: "12px", color: "#A9B4C2", textDecoration: "none" }}>Home</a>
              <span style={{ color: "#10C4C3", fontSize: "10px" }}>›</span>
              <a href="/properties" style={{ fontSize: "12px", color: "#A9B4C2", textDecoration: "none" }}>Properties</a>
              <span style={{ color: "#10C4C3", fontSize: "10px" }}>›</span>
              <span style={{ fontSize: "12px", color: "#FFFFFF", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "300px" }}>{property.title}</span>
            </div>
          </div>

          {/* ── TWO COLUMN LAYOUT ── */}
          <div className="pd-layout" style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 48px 80px", display: "flex", gap: "28px", alignItems: "flex-start" }}>

            {/* ══ LEFT COLUMN ══ */}
            <div className="pd-left" style={{ flex: "0 0 65%", minWidth: 0 }}>

              {/* ── PRICE & TITLE ── */}
              <Card>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "2px" }}>
                      <span style={{ fontFamily: "var(--font-support-new)", fontSize: "42px", fontWeight: 600, color: "#10C4C3", lineHeight: 1 }}>
                        {formatPriceFull(property.price)}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#A9B4C2", marginBottom: "4px" }}>
                      {priceSecondaryText(property)}
                    </div>
                    {property.listing_type === "rent" && property.deposit_amount && (
                      <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "4px" }}>
                        Deposit: {formatPrice(property.deposit_amount, "sale")}
                      </div>
                    )}
                    {/* available_from/preferred_tenant render whenever
                        set — same no-separate-toggle convention as
                        deposit_amount above. Brokerage is the one field
                        gated by its own explicit toggle, per spec. */}
                    {property.listing_type === "rent" && property.available_from && (
                      <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "4px" }}>
                        Available from: {formatDate(property.available_from)}
                      </div>
                    )}
                    {property.listing_type === "rent" && property.preferred_tenant && (
                      <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "4px" }}>
                        Preferred tenant: {property.preferred_tenant.charAt(0).toUpperCase() + property.preferred_tenant.slice(1)}
                      </div>
                    )}
                    {property.show_brokerage_details && property.brokerage_mode && property.brokerage_value != null && (
                      <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "4px" }}>
                        Brokerage: {
                          property.brokerage_mode === "days_rent" ? `${property.brokerage_value} days' rent`
                          : property.brokerage_mode === "months_rent" ? `${property.brokerage_value} months' rent`
                          : property.brokerage_mode === "percentage" ? `${property.brokerage_value}%`
                          : `₹${property.brokerage_value.toLocaleString("en-IN")}`
                        }
                      </div>
                    )}
                  </div>
                  {property.rera_number && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "100px", background: "rgba(16,196,195,0.15)", border: "1px solid rgba(16,196,195,0.3)", fontSize: "11px", fontWeight: 600, color: "#10C4C3", letterSpacing: "0.06em" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      RERA: {property.rera_number}
                    </span>
                  )}
                </div>

                <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "32px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "12px" }}>{property.title}</h1>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span style={{ fontSize: "14px", color: "#A9B4C2" }}>{property.address}{property.neighbourhood ? `, ${property.neighbourhood}` : ""}, {property.city}, {property.state}</span>
                  </div>
                  {mapsUrl && !embedMapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#10C4C3", background: "rgba(16,196,195,0.1)", border: "1px solid rgba(16,196,195,0.3)", textDecoration: "none" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      View on Google Maps
                    </a>
                  )}
                </div>

                {/* Key specs grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "12px" }}>
                  {(() => {
                    const isCommSpec = COMMERCIAL_CATEGORIES.includes(property.type);
                    return [
                      isCommSpec
                        ? { icon: "🏢", label: "Rooms / Cabins", value: property.bedrooms != null ? `${property.bedrooms}` : null }
                        : { icon: "🛏", label: "Bedrooms", value: property.bedrooms != null ? `${property.bedrooms} BHK` : null },
                      isCommSpec
                        ? { icon: "🚿", label: "Washrooms", value: property.bathrooms != null ? `${property.bathrooms}` : null }
                        : { icon: "🚿", label: "Bathrooms", value: property.bathrooms != null ? `${property.bathrooms} Bath` : null },
                    { icon: "⬛", label: "Area", value: property.area_sqft ? `${property.area_sqft.toLocaleString("en-IN")} sqft` : null },
                    { icon: "🏢", label: "Floor", value: property.floor_number != null ? `${property.floor_number}${property.total_floors ? ` of ${property.total_floors}` : ""}` : null },
                    { icon: "🚗", label: "Parking", value: property.parking_spaces != null ? `${property.parking_spaces} Car${property.parking_spaces !== 1 ? "s" : ""}` : null },
                    { icon: "📅", label: "Year Built", value: property.year_built ? `${property.year_built}` : null },
                    { icon: "🧭", label: "Facing", value: property.facing ?? null },
                    { icon: "🏠", label: "Ownership", value: property.ownership_type ?? null },
                    ];
                  })().filter(s => s.value !== null).map(spec => (
                    <div key={spec.label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "16px", padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "18px", marginBottom: "6px" }}>{spec.icon}</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>{spec.value}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{spec.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── VIDEO TOUR ── */}
              {video && (
                <Card>
                  <SectionHeading>Video Tour</SectionHeading>
                  <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
                    {videoPlaying ? (
                      <iframe
                        src={video.embedUrl}
                        title={`${property.title} — video tour`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      />
                    ) : (
                      <button
                        onClick={() => setVideoPlaying(true)}
                        aria-label="Play video tour"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", padding: 0, background: video.thumb ? `center / cover no-repeat url(${video.thumb})` : "linear-gradient(135deg, #020C1C 0%, #0A1526 100%)" }}
                      >
                        <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "72px", height: "72px", borderRadius: "50%", background: "rgba(16,196,195,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#020C1C" style={{ marginLeft: "4px" }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </span>
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* ── FLOOR PLANS ── */}
              {floorPlans.length > 0 && (
                <Card>
                  <SectionHeading>Floor Plans</SectionHeading>

                  {floorPlans.length > 1 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                      {floorPlans.map((plan, idx) => (
                        <button
                          key={plan.id}
                          onClick={() => setActiveFloorPlan(idx)}
                          style={{
                            padding: "8px 16px", borderRadius: "100px",
                            border: `1px solid ${idx === activeFloorPlan ? "#10C4C3" : "rgba(255,255,255,0.12)"}`,
                            background: idx === activeFloorPlan ? "rgba(16,196,195,0.12)" : "transparent",
                            color: idx === activeFloorPlan ? "#10C4C3" : "#A9B4C2",
                            fontSize: "12.5px", fontWeight: idx === activeFloorPlan ? 700 : 500,
                            cursor: "pointer", fontFamily: "var(--font-body-new)", whiteSpace: "nowrap",
                            transition: "all 0.15s",
                          }}
                        >
                          {plan.label?.trim() || `Plan ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {isPremium ? (
                    <div
                      onClick={() => setFloorPlanZoom(true)}
                      style={{ position: "relative", width: "100%", paddingTop: "66%", borderRadius: "12px", overflow: "hidden", background: "#0A1526", cursor: "zoom-in" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={optimizedImageUrl(floorPlans[activeFloorPlan]?.image_url, 1200)}
                        alt={floorPlans[activeFloorPlan]?.label || `${property.title} — floor plan`}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                  ) : (
                    <div style={{ position: "relative", width: "100%", paddingTop: "66%", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
                      <div
                        style={{
                          position: "absolute", inset: 0,
                          backgroundImage: `url(${optimizedImageUrl(floorPlans[0]?.image_url, 900)})`,
                          backgroundSize: "cover", backgroundPosition: "center",
                          filter: "blur(16px)", transform: "scale(1.1)",
                        }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(11,13,16,0.72)" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px", textAlign: "center" }}>
                        <span style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(16,196,195,0.15)", border: "1.5px solid rgba(16,196,195,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10C4C3" }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </span>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>Floor Plans</div>
                        <div style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "320px" }}>Upgrade to Premium to view</div>
                        {user ? (
                          <a
                            href="/pricing"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.03em", color: "#020C1C", background: "#10C4C3", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
                          >
                            Upgrade to Premium
                          </a>
                        ) : (
                          <button
                            onClick={() => openAuthModal("signin")}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "9px 20px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.03em", color: "#020C1C", background: "#10C4C3", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                          >
                            Sign In to Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ── LOCATION MAP ── */}
              {property.latitude != null && property.longitude != null ? (
                <Card>
                  <SectionHeading>Location</SectionHeading>
                  <PropertyLocationMap
                    latitude={property.latitude}
                    longitude={property.longitude}
                    title={property.title}
                    fallbackEmbedUrl={embedMapsUrl}
                  />
                </Card>
              ) : embedMapsUrl ? (
                // No coordinates (rare, per live spot-check — verified
                // 100% of listings have them today) — same legacy behavior
                // as before this change, untouched.
                <Card>
                  <SectionHeading>Location</SectionHeading>
                  <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px", overflow: "hidden", background: "#0A1526" }}>
                    <iframe
                      src={embedMapsUrl}
                      title={`${property.title} — location map`}
                      loading="lazy"
                      allowFullScreen
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                </Card>
              ) : null}

              {/* ── DESCRIPTION ── */}
              <Card>
                <SectionHeading>About This Property</SectionHeading>
                {property.is_furnished && (
                  <span style={{ display: "inline-block", marginBottom: "16px", padding: "5px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(16,196,195,0.15)", border: "1px solid rgba(16,196,195,0.3)", color: "#10C4C3" }}>Fully Furnished</span>
                )}
                {!property.is_furnished && (
                  <span style={{ display: "inline-block", marginBottom: "16px", padding: "5px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#A9B4C2" }}>Unfurnished</span>
                )}
                <p style={{ fontSize: "15px", lineHeight: 1.8, color: "#A9B4C2" }}>
                  {property.description || "No description available for this property."}
                </p>
                {property.vastu_compliant && (
                  <div style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "#A9B4C2", fontWeight: 500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Vastu Compliant
                  </div>
                )}
              </Card>

              {/* ── AMENITIES ── */}
              {property.amenities?.length > 0 && (
                <Card>
                  <SectionHeading>Amenities & Features</SectionHeading>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {property.amenities.map(a => (
                      <div key={a} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", fontSize: "13px", color: "#FFFFFF", fontWeight: 500 }}>
                        <span style={{ fontSize: "15px" }}>{getAmenityIcon(a)}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── EMI CALCULATOR ── */}
              {property.listing_type === "sale" && (
                <Card>
                  <SectionHeading>Calculate Your EMI</SectionHeading>
                  <div className="pd-emi-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      {/* Property price display */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "8px" }}>Property Price</div>
                        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "24px", fontWeight: 600, color: "#FFFFFF" }}>{formatPrice(property.price, "sale")}</div>
                      </div>

                      {/* Down payment */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2" }}>Down Payment</div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{downPct}% — {formatPrice(property.price * downPct / 100, "sale")}</div>
                        </div>
                        <input type="range" min={5} max={50} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} />
                      </div>

                      {/* Interest rate */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2" }}>Interest Rate (p.a.)</div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{rate}%</div>
                        </div>
                        <input type="range" min={6} max={15} step={0.5} value={rate} onChange={e => setRate(Number(e.target.value))} />
                      </div>

                      {/* Tenure */}
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "8px" }}>Loan Tenure</div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {[10, 15, 20, 25, 30].map(y => (
                            <button key={y} onClick={() => setTenure(y)} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: tenure === y ? "#10C4C3" : "rgba(255,255,255,0.06)", border: tenure === y ? "none" : "1px solid rgba(255,255,255,0.12)", color: tenure === y ? "#020C1C" : "#A9B4C2", cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.15s" }}>{y}Y</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Results */}
                    <div style={{ background: "#111F33", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "8px" }}>Monthly EMI</div>
                        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "38px", fontWeight: 600, color: "#10C4C3", lineHeight: 1 }}>
                          {formatPrice(Math.round(emi), "rent").replace("/mo", "")}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>per month</div>
                      </div>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[
                          { label: "Loan Amount", value: formatPrice(Math.round(loanAmount), "sale") },
                          { label: "Total Interest", value: formatPrice(Math.round(totalInterest), "sale") },
                          { label: "Total Payable", value: formatPrice(Math.round(totalPayable), "sale") },
                        ].map(row => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{row.label}</span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* ── ASSIGNED AGENT ── */}
              {assignedAgent && <AgentInfoCard agent={assignedAgent} />}

              {/* ── NEARBY & AROUND ── */}
              {nearbyPlaces && property?.latitude != null && property?.longitude != null && (
                <NearbyPlacesSection places={nearbyPlaces} propertyLat={property.latitude} propertyLng={property.longitude} />
              )}

              {/* ── SIMILAR PROPERTIES (horizontal-scroll carousel) ── */}
              {similar.length > 0 && (
                <Reveal>
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <SectionHeading>Similar Properties</SectionHeading>
                      {/* Arrow buttons: touch devices already scroll this row with a
                          swipe, but a desktop mouse user has no drag-to-scroll
                          affordance on a plain overflow-x row, so these give them an
                          obvious way to advance the carousel without hunting for a
                          trackpad gesture. Hidden on touch via CSS would be nicer but
                          adds complexity for little benefit — clicking a visible arrow
                          on a touch device is harmless, so it stays simple. */}
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        {(["left", "right"] as const).map(dir => (
                          <button
                            key={dir}
                            onClick={() => scrollSimilar(dir)}
                            aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
                            style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            {dir === "left" ? "←" : "→"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      ref={similarScrollRef}
                      className="pd-similar-scroll"
                      style={{ display: "flex", flexWrap: "nowrap", gap: "16px", overflowX: "auto", scrollSnapType: "x proximity", paddingBottom: "8px" }}
                    >
                      {similar.map(p => <SimilarCard key={p.id} p={p} />)}
                    </div>
                  </div>
                </Reveal>
              )}

            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div className="pd-right" style={{ flex: "0 0 35%", position: "sticky", top: "72px" }}>

              {/* ── CONTACT FORM (buyer) / OWNER-AGENT PANEL (item #12) ── */}
              <Card style={{ marginBottom: "20px" }}>
                {identityResolving ? (
                  // Skeleton while property/auth/agent-profile identity is
                  // still resolving — never the buyer form or the owner
                  // panel first, to avoid a visible swap either direction.
                  <OwnerAgentPanelSkeleton />
                ) : isOwnerOrAgent && property ? (
                  <OwnerAgentPanel
                    property={property}
                    isAgentSession={isAgentSession}
                    realViewCount={realViewCount}
                    savePropertyCount={savePropertyCount}
                    imageClickCount={imageClickCount}
                  />
                ) : (
                <>
                {/* Agent header */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #020C1C 0%, #111F33 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--font-body-new)", fontSize: "20px", color: "#10C4C3", fontWeight: 600 }}>N</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>Nilay 360 Expert</div>
                    <div style={{ fontSize: "12px", color: "#A9B4C2" }}>Property Specialist</div>
                  </div>
                </div>

                {contactSent ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>Request Sent!</div>
                    <div style={{ fontSize: "13px", color: "#A9B4C2" }}>Our expert will contact you shortly.</div>
                  </div>
                ) : (
                  <>
                    <input
                      placeholder="Your Full Name *"
                      value={contactName}
                      onChange={e => { setContactName(e.target.value); if (contactFieldErrors.name) setContactFieldErrors(f => ({ ...f, name: undefined })); }}
                      onFocus={() => setContactFocus("name")}
                      onBlur={() => setContactFocus(null)}
                      style={inputStyle(contactFocus === "name", !!contactFieldErrors.name)}
                    />
                    <FieldError message={contactFieldErrors.name} />

                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={contactEmail}
                      onChange={e => { setContactEmail(e.target.value); if (contactFieldErrors.email) setContactFieldErrors(f => ({ ...f, email: undefined })); }}
                      onFocus={() => setContactFocus("email")}
                      onBlur={() => setContactFocus(null)}
                      style={inputStyle(contactFocus === "email", !!contactFieldErrors.email)}
                    />
                    <FieldError message={contactFieldErrors.email} />

                    <div style={{ position: "relative", marginBottom: "4px" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#A9B4C2", fontWeight: 500, pointerEvents: "none" }}>+91</span>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={contactPhone}
                        readOnly={phoneLocked}
                        onChange={e => { if (!phoneLocked) { setContactPhone(e.target.value); if (contactFieldErrors.phone) setContactFieldErrors(f => ({ ...f, phone: undefined })); } }}
                        onFocus={() => setContactFocus("phone")}
                        onBlur={() => setContactFocus(null)}
                        style={{ ...inputStyle(contactFocus === "phone", !!contactFieldErrors.phone), paddingLeft: "46px", marginBottom: 0, cursor: phoneLocked ? "default" : "text", opacity: phoneLocked ? 0.75 : 1 }}
                      />
                    </div>
                    {phoneLocked ? (
                      <div style={{ fontSize: "11px", color: "#A9B4C2", marginTop: "6px", marginBottom: "12px" }}>Using your verified account number</div>
                    ) : (
                      <FieldError message={contactFieldErrors.phone} />
                    )}

                    {/* Message-type quick-select */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                      {CONTACT_MSG_OPTIONS.map(opt => {
                        const on = contactMsgType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { setContactMsgType(opt.id); setContactMsg(opt.preset); }}
                            style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, letterSpacing: "0.02em", background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.14s" }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      placeholder={contactMsgType === "other" ? "Tell us what you'd like to know…" : "Message"}
                      value={contactMsg}
                      onChange={e => setContactMsg(e.target.value)}
                      onFocus={() => setContactFocus("msg")}
                      onBlur={() => setContactFocus(null)}
                      rows={3}
                      style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: contactFocus === "msg" ? "1px solid #10C4C3" : "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical", marginBottom: "14px" }}
                    />

                    {/* Optional preferences — collapsed by default, never required */}
                    {!showPreferences ? (
                      <button
                        type="button"
                        onClick={() => setShowPreferences(true)}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "0 0 14px", color: "#10C4C3", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                      >
                        + Add your preferences (optional)
                      </button>
                    ) : (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "8px" }}>
                          Your Preferences <span style={{ opacity: 0.6, textTransform: "none", fontWeight: 500 }}>(optional)</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <input
                            type="number"
                            placeholder="Budget min (₹)"
                            value={prefBudgetMin}
                            onChange={e => setPrefBudgetMin(e.target.value)}
                            style={{ ...inputStyle(contactFocus === "budgetMin"), marginBottom: 0 }}
                            onFocus={() => setContactFocus("budgetMin")}
                            onBlur={() => setContactFocus(null)}
                          />
                          <input
                            type="number"
                            placeholder="Budget max (₹)"
                            value={prefBudgetMax}
                            onChange={e => setPrefBudgetMax(e.target.value)}
                            style={{ ...inputStyle(contactFocus === "budgetMax"), marginBottom: 0 }}
                            onFocus={() => setContactFocus("budgetMax")}
                            onBlur={() => setContactFocus(null)}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {PREFERENCE_BHK_OPTIONS.map(v => {
                            const on = prefBhk === v;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setPrefBhk(on ? "" : v)}
                                style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                              >
                                {v} BHK
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <input
                            placeholder="Preferred locality"
                            value={prefLocality}
                            onChange={e => setPrefLocality(e.target.value)}
                            style={{ ...inputStyle(contactFocus === "locality"), marginBottom: 0 }}
                            onFocus={() => setContactFocus("locality")}
                            onBlur={() => setContactFocus(null)}
                          />
                          <select
                            value={prefCity}
                            onChange={e => setPrefCity(e.target.value)}
                            style={{ ...inputStyle(contactFocus === "city"), marginBottom: 0, cursor: "pointer" }}
                            onFocus={() => setContactFocus("city")}
                            onBlur={() => setContactFocus(null)}
                          >
                            <option value="">Preferred city</option>
                            {PREFERENCE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <select
                          value={prefPropertyType}
                          onChange={e => setPrefPropertyType(e.target.value)}
                          style={{ ...inputStyle(contactFocus === "propertyType"), cursor: "pointer" }}
                          onFocus={() => setContactFocus("propertyType")}
                          onBlur={() => setContactFocus(null)}
                        >
                          <option value="">Property type</option>
                          {PREFERENCE_CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Error */}
                    {contactError && (
                      <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(185,28,28,0.15)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: "16px", color: "#F87171", fontSize: "12px", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>⚠</span>
                        {contactError}
                      </div>
                    )}

                    {/* Buttons */}
                    <button
                      onClick={handleInquiry}
                      disabled={contactSubmitting}
                      style={{ width: "100%", padding: "13px", background: "#10C4C3", border: "none", borderRadius: "16px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: contactSubmitting ? "not-allowed" : "pointer", opacity: contactSubmitting ? 0.65 : 1, fontFamily: "var(--font-body-new)", marginBottom: "10px", boxShadow: "0 10px 30px rgba(30,167,255,.35)", transition: "background 0.2s" }}
                      className="pd-btn-primary"
                    >{contactSubmitting ? "Sending…" : "Request Callback"}</button>

                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'm ${contactName.trim()}. I'm interested in this property: ${property.title} - ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => {
                          // Fully own the error state on click rather than merging with
                          // whatever Request Callback may have left behind, and vice versa —
                          // each action's validation always starts from a clean slate.
                          if (!isPlausibleName(contactName)) {
                            e.preventDefault();
                            setContactFieldErrors({ name: "Please enter your name above before messaging the owner on WhatsApp." });
                          } else {
                            setContactFieldErrors({});
                          }
                        }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "13px", background: "#25D366", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", marginBottom: "10px" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.107 1.504 5.837L.057 23.882l6.233-1.634C7.891 23.221 9.904 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.643-.51-5.148-1.397l-.368-.219-3.824 1.003 1.022-3.731-.239-.38C2.51 15.67 2 13.895 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                        WhatsApp Owner
                      </a>
                    )}

                    {/* Payment-risk warning — sits right at the one point on this
                        page where a buyer gets direct, unmediated contact with the
                        seller. Amber palette matches the existing warning
                        convention used in admin/page.tsx and DashboardClient.tsx
                        (#F59E0B / rgba(245,158,11,...)), not invented here. */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "10px 12px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "13px", color: "#F59E0B", flexShrink: 0, lineHeight: 1.4 }}>⚠</span>
                      <p style={{ fontSize: "11.5px", color: "#F59E0B", lineHeight: 1.5, margin: 0 }}>
                        Never pay before visiting in person and verifying documents.{" "}
                        <a href="/safety-guide" style={{ color: "#F59E0B", textDecoration: "underline" }}>Read our safety guide</a>
                      </p>
                    </div>

                    <button
                      onClick={() => { setVisitError(null); setVisitOpen(true); }}
                      style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      Schedule Visit
                    </button>
                  </>
                )}
                </>
                )}
              </Card>

              {/* ── DOWNLOAD BROCHURE ── */}
              <button
                onClick={downloadBrochure}
                style={{ width: "100%", padding: "13px", background: "#111F33", border: "1px solid rgba(16,196,195,0.3)", borderRadius: "16px", color: "#10C4C3", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Brochure
              </button>

              {/* ── QUICK FACTS ── */}
              <Card>
                <SectionHeading>Quick Facts</SectionHeading>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "Listed On", value: formatDate(property.created_at) },
                    { label: "Property ID", value: property.id.slice(0, 8).toUpperCase() },
                    ...(realViewCount != null ? [{ label: "Views", value: realViewCount.toLocaleString("en-IN") }] : []),
                    { label: "Property Type", value: property.type.charAt(0).toUpperCase() + property.type.slice(1) },
                    { label: "Status", value: property.status.charAt(0).toUpperCase() + property.status.slice(1) },
                    ...(property.pincode ? [{ label: "Pincode", value: property.pincode }] : []),
                  ].map(fact => (
                    <div key={fact.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <span style={{ fontSize: "12px", color: "#A9B4C2" }}>{fact.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{fact.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </div>

          {(prevProperty || nextProperty) && (
            <div className="pd-prev-next" style={{
              maxWidth: 1280, margin: "0 auto", padding: "48px 40px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16
            }}>
              {/* Previous */}
              {prevProperty ? (
                <a href={`/property/${prevProperty.slug}`} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#111F33", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16, padding: 20, textDecoration: "none",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(16,196,195,0.3)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                  <div style={{fontSize: 24, color: "rgba(255,255,255,0.3)"}}>←</div>
                  <div style={{overflow: "hidden", flex: 1}}>
                    <div style={{fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em"}}>Previous Property</div>
                    <div style={{fontSize: 15, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-heading-new)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{prevProperty.title}</div>
                    <div style={{fontSize: 13, color: "#10C4C3", marginTop: 4, fontWeight: 600}}>₹{(prevProperty.price / 10000000).toFixed(1)} Cr</div>
                  </div>
                  {prevProperty.photo_urls?.[0] && (
                    <div style={{width: 64, height: 64, borderRadius: 10, backgroundImage: `url(${optimizedImageUrl(prevProperty.photo_urls[0], 128)})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0}} />
                  )}
                </a>
              ) : <div />}

              {/* Next */}
              {nextProperty ? (
                <a href={`/property/${nextProperty.slug}`} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#111F33", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16, padding: 20, textDecoration: "none",
                  transition: "all 0.3s ease", justifyContent: "flex-end"
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(16,196,195,0.3)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                  {nextProperty.photo_urls?.[0] && (
                    <div style={{width: 64, height: 64, borderRadius: 10, backgroundImage: `url(${optimizedImageUrl(nextProperty.photo_urls[0], 128)})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0}} />
                  )}
                  <div style={{overflow: "hidden", flex: 1, textAlign: "right"}}>
                    <div style={{fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em"}}>Next Property</div>
                    <div style={{fontSize: 15, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-heading-new)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{nextProperty.title}</div>
                    <div style={{fontSize: 13, color: "#10C4C3", marginTop: 4, fontWeight: 600}}>₹{(nextProperty.price / 10000000).toFixed(1)} Cr</div>
                  </div>
                  <div style={{fontSize: 24, color: "rgba(255,255,255,0.3)"}}>→</div>
                </a>
              ) : <div />}
            </div>
          )}

        </div>
      </div>

      {/* ── LIGHTBOX (Feature 1) ── */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <style>{`@keyframes lbFade { from { opacity: 0; } to { opacity: 1; } }`}</style>

          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close gallery"
            className="pd-lb-btn"
            style={{ position: "absolute", top: "24px", right: "24px", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          {slideCount > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImg(); }}
              aria-label="Previous photo"
              className="pd-lb-btn"
              style={{ position: "absolute", left: "24px", top: "50%", transform: "translateY(-50%)", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}

          {hasVideoSlide && activeImg === videoSlideIndex ? (
            <div key={activeImg} onClick={(e) => e.stopPropagation()} style={{ width: "86vw", maxWidth: "1100px", aspectRatio: "16/9", borderRadius: "6px", overflow: "hidden", animation: "lbFade 0.25s ease" }}>
              <VideoSlide
                videoAssetId={property.video_asset_id as string}
                thumbnailUrl={property.video_asset_thumbnail_url ?? null}
                title={property.title}
                height="100%"
              />
            </div>
          ) : (
            <img
              key={activeImg}
              src={optimizedImageUrl(images[activeImg], 1920)}
              alt={`${property.title} — photo ${activeImg + 1}`}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "86vw", maxHeight: "82vh", objectFit: "contain", borderRadius: "6px", animation: "lbFade 0.25s ease" }}
            />
          )}

          {slideCount > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImg(); }}
              aria-label="Next photo"
              className="pd-lb-btn"
              style={{ position: "absolute", right: "24px", top: "50%", transform: "translateY(-50%)", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          <div style={{ position: "absolute", bottom: "28px", left: "50%", transform: "translateX(-50%)", padding: "6px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em" }}>
            {activeImg + 1} / {slideCount}
          </div>
        </div>
      )}

      {/* ── FLOOR PLAN ZOOM MODAL ── */}
      {floorPlanZoom && floorPlans[activeFloorPlan] && (
        <div
          onClick={() => setFloorPlanZoom(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFloorPlanZoom(false); }}
            aria-label="Close floor plan"
            className="pd-lb-btn"
            style={{ position: "absolute", top: "24px", right: "24px", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={optimizedImageUrl(floorPlans[activeFloorPlan].image_url, 1920)}
            alt={floorPlans[activeFloorPlan].label || `${property.title} — floor plan`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "86vh", objectFit: "contain", borderRadius: "6px" }}
          />
        </div>
      )}

      {/* ── SCHEDULE VISIT MODAL (Feature 2) ── */}
      {visitOpen && (
        <div
          onClick={() => { setVisitOpen(false); setVisitDone(false); setVisitError(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#111F33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "24px", maxWidth: "440px", width: "100%", padding: "32px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", position: "relative" }}
          >
            <button
              onClick={() => { setVisitOpen(false); setVisitDone(false); setVisitError(null); }}
              aria-label="Close"
              style={{ position: "absolute", top: "18px", right: "18px", background: "transparent", border: "none", cursor: "pointer", color: "#A9B4C2", padding: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {visitDone ? (
              <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📅</div>
                <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>Visit Scheduled!</h3>
                <p style={{ fontSize: "14px", color: "#A9B4C2", lineHeight: 1.6 }}>The seller will confirm your appointment.</p>
                <button
                  onClick={() => { setVisitOpen(false); setVisitDone(false); }}
                  style={{ marginTop: "22px", padding: "11px 28px", background: "#10C4C3", border: "none", borderRadius: "16px", boxShadow: "0 10px 30px rgba(30,167,255,.35)", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                >Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>Schedule a Site Visit</h3>
                <p style={{ fontSize: "13px", color: "#A9B4C2", marginBottom: "22px" }}>{property.title}</p>

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>Preferred Date</label>
                <input
                  type="date" value={visitDate} min={today}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", marginBottom: "18px" }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>Time Slot</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                  {VISIT_SLOTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setVisitSlot(s.id)}
                      style={{ padding: "11px 14px", borderRadius: "8px", textAlign: "left", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-body-new)", cursor: "pointer", border: visitSlot === s.id ? "1px solid #10C4C3" : "1px solid rgba(255,255,255,0.10)", background: visitSlot === s.id ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.06)", color: visitSlot === s.id ? "#10C4C3" : "#A9B4C2" }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>Your Name</label>
                <input
                  type="text" value={visitName} placeholder="Full name"
                  onChange={(e) => setVisitName(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", marginBottom: "14px" }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px" }}>Phone Number</label>
                <input
                  type="tel" value={visitPhone} placeholder="10-digit mobile"
                  onChange={(e) => setVisitPhone(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "16px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", marginBottom: "18px" }}
                />

                {visitError && (
                  <div style={{ marginBottom: "14px", padding: "10px 14px", background: "rgba(185,28,28,0.15)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: "16px", color: "#F87171", fontSize: "12px" }}>
                    {visitError}
                  </div>
                )}

                <button
                  onClick={submitVisit}
                  disabled={visitSubmitting}
                  style={{ width: "100%", padding: "13px", background: "#10C4C3", border: "none", borderRadius: "16px", boxShadow: "0 10px 30px rgba(30,167,255,.35)", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: visitSubmitting ? "not-allowed" : "pointer", opacity: visitSubmitting ? 0.65 : 1, fontFamily: "var(--font-body-new)", transition: "background 0.2s" }}
                  className="pd-btn-primary"
                >{visitSubmitting ? "Scheduling…" : "Confirm Visit"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
