"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES } from "@/constants/images";
import { useSavedProperties } from "@/hooks/useSavedProperties";
import { useCompare } from "@/context/CompareContext";
import RecentlyViewed from "@/components/property/RecentlyViewed";
import { optimizedImageUrl } from "@/lib/image-url";
import Reveal from "@/components/ui/Reveal";

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
  area_sqft: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  address: string;
  city: string;
  neighbourhood: string | null;
  images: string[];
  amenities: string[];
  is_featured: boolean;
  is_furnished: boolean;
  saves: number;
  created_at: string | null;
};

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count.
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];
const NEW_LISTING_WINDOW_DAYS = 7;

function formatPrice(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

// Same ladder as formatPrice's sale branch, used for the price-range slider labels
function formatPriceShort(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function isNewListing(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= 0 && ageMs <= NEW_LISTING_WINDOW_DAYS * 86400000;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// Map a user-submitted property_listings row into the Property shape used by the cards
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function mapListingToProperty(row: Record<string, unknown>): Property {
  const photos = Array.isArray(row.photo_urls) ? (row.photo_urls as string[]).filter(Boolean) : [];
  return {
    id:             String(row.id ?? ""),
    slug:           typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:          typeof row.title === "string" ? row.title : "Untitled Property",
    description:    typeof row.highlights === "string" ? row.highlights : null,
    type:           typeof row.property_category === "string" ? row.property_category : "",
    listing_type:   typeof row.listing_type === "string" ? row.listing_type : "sale",
    status:         typeof row.status === "string" ? row.status : "pending_review",
    price:          num(row.price) ?? 0,
    price_per_sqft: null,
    area_sqft:      num(row.built_up_area) ?? 0,
    bedrooms:       num(row.bedrooms),
    bathrooms:      num(row.bathrooms),
    parking_spaces: null,
    address:        typeof row.address === "string" ? row.address : "",
    city:           typeof row.city === "string" ? row.city : "",
    neighbourhood:  typeof row.locality === "string" ? row.locality : null,
    images:         photos,
    amenities:      Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    is_featured:    Boolean(row.is_featured),
    is_furnished:   row.furnishing != null && row.furnishing !== "unfurnished",
    saves:          0,
    created_at:     typeof row.created_at === "string" ? row.created_at : null,
  };
}

function SkeletonCard() {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ height: "220px", background: "var(--bg-surface)", animation: "pulse 1.6s ease-in-out infinite" }} />
      <div style={{ padding: "20px" }}>
        {[80, 60, 40].map((w, i) => (
          <div key={i} style={{ height: "12px", borderRadius: "6px", marginBottom: "12px", width: `${w}%`, background: "var(--bg-surface)", animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property, savedIds, onToggleSave, reduceMotion }: { property: Property; savedIds: Set<string>; onToggleSave: (id: string, data?: Record<string, unknown>) => void; reduceMotion: boolean }) {
  const saved = savedIds.has(property.id);
  const [imgError, setImgError] = useState(false);
  const [hovering, setHovering] = useState(false);
  const { has: isComparing, toggle: toggleCompare, isFull } = useCompare();
  const comparing = isComparing(property.id);
  const img = !imgError && property.images?.length > 0
    ? property.images[0]
    : IMAGES.properties[property.type?.toLowerCase() as keyof typeof IMAGES.properties] || IMAGES.properties.apartment;
  const secondImg = property.images?.length > 1 ? property.images[1] : null;
  const isNew = isNewListing(property.created_at);

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!comparing && isFull) return;
    toggleCompare({
      id: property.id, slug: property.slug, title: property.title, price: property.price,
      listing_type: property.listing_type === "rent" ? "rent" : "sale",
      property_type: property.type, status: property.status,
      bedrooms: property.bedrooms, bathrooms: property.bathrooms, area_sqft: property.area_sqft,
      floor_number: null, total_floors: null, parking_spaces: property.parking_spaces,
      year_built: null, is_furnished: property.is_furnished, amenities: property.amenities ?? [],
      address: property.address, city: property.city, neighbourhood: property.neighbourhood ?? "",
      image: property.images?.[0] ?? null,
    });
  };

  return (
    <a
      href={`/property/${property.slug}`}
      className="pr-card"
      style={{ display: "block", textDecoration: "none", color: "inherit", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", transition: reduceMotion ? "none" : "transform 0.2s, border-color 0.2s, box-shadow 0.2s", cursor: "pointer", position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}
      onMouseEnter={e => { setHovering(true); if (!reduceMotion) { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(-4px)"; d.style.borderColor = "var(--border-accent)"; d.style.boxShadow = "0 20px 60px rgba(0,0,0,0.45)"; } }}
      onMouseLeave={e => { setHovering(false); if (!reduceMotion) { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(0)"; d.style.borderColor = "var(--border)"; d.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)"; } }}
    >
      <div className="pr-img-wrap" style={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", background: "var(--bg-surface)" }}>
        <img src={optimizedImageUrl(img, 600)} alt={property.title} loading="lazy" onError={() => setImgError(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: secondImg && hovering && !reduceMotion ? 0 : 1, transition: reduceMotion ? "none" : "opacity 0.5s ease" }} />
        {secondImg && (
          <img src={optimizedImageUrl(secondImg, 600)} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: hovering && !reduceMotion ? 1 : 0, transition: reduceMotion ? "none" : "opacity 0.5s ease" }} />
        )}
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", flexWrap: "wrap", maxWidth: "calc(100% - 56px)" }}>
          <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: property.listing_type === "rent" ? "var(--blue-deep)" : "var(--brand-accent)", color: "var(--brand-primary)", backdropFilter: "blur(8px)" }}>
            {property.listing_type === "rent" ? "For Rent" : "For Sale"}
          </span>
          {isNew && (
            <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--brand-primary)", color: "var(--brand-accent)", border: "1px solid var(--border-accent)", backdropFilter: "blur(8px)" }}>New</span>
          )}
          {property.is_featured && (
            <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--bg-elevated)", color: "var(--brand-accent)", border: "1px solid var(--border-accent)", backdropFilter: "blur(8px)" }}>Premium</span>
          )}
        </div>
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSave(property.id, { title: property.title, city: property.city, price: property.price, property_type: property.type, image: property.images?.[0] }); }} style={{ position: "absolute", top: "12px", right: "12px", width: "34px", height: "34px", borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "var(--brand-accent)" : "none"} stroke={saved ? "var(--brand-accent)" : "var(--text-secondary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <button onClick={handleCompare} title={!comparing && isFull ? "Comparison is full (max 3)" : comparing ? "Remove from comparison" : "Add to comparison"} style={{ position: "absolute", top: "54px", right: "12px", height: "34px", padding: "0 11px", borderRadius: "100px", background: comparing ? "var(--brand-accent)" : "var(--bg-elevated)", border: comparing ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center", gap: "5px", cursor: !comparing && isFull ? "not-allowed" : "pointer", opacity: !comparing && isFull ? 0.5 : 1, backdropFilter: "blur(8px)", fontFamily: "var(--font-body-new)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: comparing ? "var(--brand-primary)" : "var(--text-secondary)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {comparing ? <polyline points="20 6 9 17 4 12" /> : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
          </svg>
          {comparing ? "Added" : "Compare"}
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", padding: "32px 16px 14px" }}>
          <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 700, color: "var(--brand-accent)", background: "rgba(2,12,28,0.55)", padding: "4px 10px", borderRadius: "6px", backdropFilter: "blur(4px)" }}>
            {formatPrice(property.price, property.listing_type)}
          </span>
          {property.price_per_sqft && property.listing_type !== "rent" && (
            <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "8px" }}>₹{property.price_per_sqft.toLocaleString("en-IN")}/sqft</span>
          )}
        </div>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{property.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "14px" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{property.neighbourhood ? `${property.neighbourhood}, ` : ""}{property.city}</span>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
          {[{ value: property.bedrooms, label: COMMERCIAL_CATEGORIES.includes(property.type) ? "Rooms" : "Beds" }, { value: property.bathrooms, label: COMMERCIAL_CATEGORIES.includes(property.type) ? "Wash" : "Baths" }, { value: property.area_sqft?.toLocaleString("en-IN"), label: "sqft" }].map((s, i) => s.value != null && (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </a>
  );
}

function FilterCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "10px" }}>
      <div onClick={onChange} style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: checked ? "none" : "1.5px solid var(--border-hover)", background: checked ? "var(--brand-accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="var(--brand-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span onClick={onChange} style={{ fontSize: "13px", color: checked ? "var(--text-primary)" : "var(--text-secondary)", transition: "color 0.15s" }}>{label}</span>
    </label>
  );
}

function toggleSet<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set);
  if (next.has(val)) next.delete(val); else next.add(val);
  return next;
}

// Two overlapping native range inputs — no extra dependency, real min/max computed from live data.
function DualRangeSlider({
  min, max, valueMin, valueMax, onChangeMin, onChangeMax, formatValue,
}: {
  min: number; max: number; valueMin: number; valueMax: number;
  onChangeMin: (v: number) => void; onChangeMax: (v: number) => void;
  formatValue: (v: number) => string;
}) {
  const range = Math.max(1, max - min);
  const pctMin = ((valueMin - min) / range) * 100;
  const pctMax = ((valueMax - min) / range) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{formatValue(valueMin)}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{formatValue(valueMax)}</span>
      </div>
      <div style={{ position: "relative", height: "28px" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "4px", borderRadius: "2px", background: "var(--border-hover)", transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", left: `${pctMin}%`, right: `${100 - pctMax}%`, height: "4px", borderRadius: "2px", background: "var(--brand-accent)", transform: "translateY(-50%)" }} />
        <input type="range" min={min} max={max} value={valueMin} onChange={e => onChangeMin(Math.min(Number(e.target.value), valueMax))} className="pr-range-thumb" style={{ zIndex: 3 }} aria-label="Minimum" />
        <input type="range" min={min} max={max} value={valueMax} onChange={e => onChangeMax(Math.max(Number(e.target.value), valueMin))} className="pr-range-thumb" style={{ zIndex: 4 }} aria-label="Maximum" />
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { savedIds, toggleSave } = useSavedProperties(userId);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      console.log('properties page userId:', uid)
    }
    void loadUser()
  }, []);

  const [keyword, setKeyword] = useState("");
  const [listingType, setListingType] = useState<"all" | "sale" | "rent">("all");
  const [city, setCity] = useState("all");
  const [propTypes, setPropTypes] = useState<Set<string>>(new Set());
  const [bhk, setBhk] = useState<Set<number>>(new Set());
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [maxSqft, setMaxSqft] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Seed/catalog properties
      const { data: seedData, error: seedErr } = await supabase.from('properties').select('*');
      if (seedErr) console.error('properties load error:', seedErr);

      const { data: listingData, error: listingErr } = await supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'active');
      if (listingErr) console.error('property_listings load error:', listingErr);

      const mappedListings = (listingData ?? []).map((row: Record<string, unknown>) => mapListingToProperty(row));

      // User submissions first, then the seed catalog
      setAllProperties([...mappedListings, ...(seedData || [])]);
      setLoading(false);
    }
    load();
  }, []);

  const priceBounds = useMemo((): [number, number] => {
    const prices = allProperties.map(p => p.price).filter(p => p > 0);
    return prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 50000000];
  }, [allProperties]);

  const sqftBounds = useMemo((): [number, number] => {
    const areas = allProperties.map(p => p.area_sqft).filter(a => a > 0);
    return areas.length ? [Math.min(...areas), Math.max(...areas)] : [0, 5000];
  }, [allProperties]);

  const filtered = useMemo(() => {
    let list = [...allProperties];
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.neighbourhood ?? "").toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    }
    if (listingType !== "all") list = list.filter(p => p.listing_type === listingType);
    if (city !== "all") list = list.filter(p => p.city?.toLowerCase() === city.toLowerCase());
    if (propTypes.size > 0) list = list.filter(p => propTypes.has(p.type));
    if (bhk.size > 0) list = list.filter(p => { const b = p.bedrooms ?? 0; return bhk.has(b >= 5 ? 5 : b); });
    if (amenityFilters.size > 0) list = list.filter(p => [...amenityFilters].every(a => (p.amenities ?? []).some(pa => pa.toLowerCase().includes(a.toLowerCase()))));
    if (minPrice) list = list.filter(p => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter(p => p.price <= Number(maxPrice));
    if (minSqft) list = list.filter(p => p.area_sqft >= Number(minSqft));
    if (maxSqft) list = list.filter(p => p.area_sqft <= Number(maxSqft));
    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    return list;
  }, [allProperties, keyword, listingType, city, propTypes, bhk, amenityFilters, minPrice, maxPrice, minSqft, maxSqft, sortBy]);

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [filtered, page]
  );

  useEffect(() => { setPage(1); }, [filtered]);

  function clearFilters() {
    setKeyword(""); setListingType("all"); setCity("all"); setPropTypes(new Set());
    setBhk(new Set()); setAmenityFilters(new Set()); setMinPrice(""); setMaxPrice("");
    setMinSqft(""); setMaxSqft("");
  }

  const activeFilterCount = [
    !!keyword.trim(), listingType !== "all", city !== "all", propTypes.size > 0, bhk.size > 0,
    amenityFilters.size > 0, !!minPrice, !!maxPrice, !!minSqft, !!maxSqft,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: var(--brand-primary); overflow-x: hidden; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-accent); border-radius: 2px; }

        .pr-card .pr-img-wrap img { transition: ${reduceMotion ? "none" : "transform 0.4s ease, opacity 0.5s ease"}; }
        .pr-card:hover .pr-img-wrap img { transform: ${reduceMotion ? "none" : "scale(1.06)"}; }

        .pr-range-thumb { position: absolute; left: 0; top: 0; width: 100%; height: 28px; margin: 0; background: transparent; appearance: none; -webkit-appearance: none; pointer-events: none; }
        .pr-range-thumb::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; pointer-events: all; width: 16px; height: 16px; border-radius: 50%; background: var(--brand-accent); border: 2px solid var(--brand-primary); cursor: pointer; box-shadow: 0 0 0 1px var(--border-accent); }
        .pr-range-thumb::-moz-range-thumb { pointer-events: all; width: 16px; height: 16px; border-radius: 50%; background: var(--brand-accent); border: 2px solid var(--brand-primary); cursor: pointer; }
        .pr-range-thumb::-webkit-slider-runnable-track { background: transparent; }
        .pr-range-thumb::-moz-range-track { background: transparent; }

        .pr-mobile-filter-btn { display: none; }
        .pr-sidebar-close { display: none; }
        .pr-mobile-backdrop { display: none; }

        @media (max-width: 768px) {
          .pr-hero { padding: 48px 16px 32px !important; }
          .pr-layout { flex-direction: column !important; padding: 16px 16px 56px !important; gap: 16px !important; }
          .pr-mobile-filter-btn { display: flex !important; }
          .pr-sidebar { position: fixed !important; top: 0 !important; left: 0 !important; bottom: 0 !important; width: 86% !important; max-width: 340px !important; height: 100vh !important; max-height: 100vh !important; border-radius: 0 !important; transform: translateX(-100%); transition: ${reduceMotion ? "none" : "transform 0.3s ease"}; z-index: 60; }
          .pr-sidebar.pr-sidebar-open { transform: translateX(0); }
          .pr-sidebar-close { display: flex !important; }
          .pr-mobile-backdrop.pr-backdrop-open { display: block !important; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 59; }
          .pr-skeleton-grid { grid-template-columns: repeat(2,1fr) !important; }
          .pr-cards-grid { grid-template-columns: repeat(auto-fill, minmax(240px,1fr)) !important; }
          .pr-list-item { flex-direction: column !important; }
          .pr-list-img { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .pr-skeleton-grid { grid-template-columns: 1fr !important; }
          .pr-cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--brand-primary)", color: "var(--text-primary)" }}>

        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(16,196,195,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,196,195,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />

        {/* Hero */}
        <div className="pr-hero" style={{ position: "relative", zIndex: 1, marginTop: "64px", background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--brand-primary) 55%, var(--bg-surface) 100%)", borderBottom: "1px solid var(--border-accent)", padding: "48px 48px 40px" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <a href="/" style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>›</span>
              <span style={{ fontSize: "12px", color: "var(--brand-accent)" }}>Properties</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "10px" }}>
              Find Your <em style={{ fontStyle: "italic", color: "var(--brand-accent)" }}>Perfect Home</em>
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
              {loading ? "Loading properties…" : `${allProperties.length} premium properties across India`}
            </p>

            {/* Hero search bar — real client-side keyword search over title/city/locality/address */}
            <div style={{ position: "relative", maxWidth: "560px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Search by location, project or keyword…"
                style={{ width: "100%", padding: "14px 16px 14px 44px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-hover)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-body-new)", outline: "none" }}
              />
            </div>
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="pr-mobile-backdrop pr-backdrop-open" onClick={() => setMobileFiltersOpen(false)} />
        )}

        {/* Main layout */}
        <div className="pr-layout" style={{ position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto", padding: "32px 48px 80px", display: "flex", gap: "28px", alignItems: "flex-start" }}>

          {/* Sidebar */}
          <aside className={`pr-sidebar${mobileFiltersOpen ? " pr-sidebar-open" : ""}`} style={{ width: "280px", flexShrink: 0, position: "sticky", top: "72px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", maxHeight: "calc(100vh - 108px)", overflowY: "auto" }}>
            <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Filters</span>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {hasFilters && <button onClick={clearFilters} style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-accent)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear All</button>}
                <button className="pr-sidebar-close" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-primary)", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            </div>

            <div style={{ padding: "16px" }}>
              {/* Listing type */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Type</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["all", "sale", "rent"] as const).map(t => (
                    <button key={t} onClick={() => setListingType(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textTransform: "capitalize", background: listingType === t ? "var(--brand-accent)" : "rgba(255,255,255,0.05)", border: listingType === t ? "none" : "1px solid var(--border)", color: listingType === t ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.15s" }}>
                      {t === "all" ? "All" : t === "sale" ? "Buy" : "Rent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>City</div>
                <div style={{ position: "relative" }}>
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ width: "100%", padding: "10px 36px 10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-hover)", borderRadius: "8px", color: city === "all" ? "var(--text-muted)" : "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-body-new)", cursor: "pointer" }}>
                    <option value="all" style={{ background: "var(--brand-primary)", color: "var(--text-primary)" }}>All Cities</option>
                    {["Hyderabad", "Mumbai", "Bengaluru"].map(c => <option key={c} value={c} style={{ background: "var(--brand-primary)", color: "var(--text-primary)" }}>{c}</option>)}
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* Property type */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Property Type</div>
                {["apartment", "villa", "penthouse", "plot", "office"].map(t => (
                  <FilterCheck key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} checked={propTypes.has(t)} onChange={() => setPropTypes(s => toggleSet(s, t))} />
                ))}
              </div>

              {/* Price range */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Price Range</div>
                <DualRangeSlider
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  valueMin={minPrice ? Number(minPrice) : priceBounds[0]}
                  valueMax={maxPrice ? Number(maxPrice) : priceBounds[1]}
                  onChangeMin={v => setMinPrice(String(v))}
                  onChangeMax={v => setMaxPrice(String(v))}
                  formatValue={formatPriceShort}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                  {[{ label: "< 50L", min: "", max: "5000000" }, { label: "1–3 Cr", min: "10000000", max: "30000000" }, { label: "3 Cr+", min: "30000000", max: "" }].map(p => (
                    <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }} style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 500, background: "rgba(16,196,195,0.08)", border: "1px solid var(--border-accent)", color: "var(--brand-accent)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Square footage */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Area (sqft)</div>
                <DualRangeSlider
                  min={sqftBounds[0]}
                  max={sqftBounds[1]}
                  valueMin={minSqft ? Number(minSqft) : sqftBounds[0]}
                  valueMax={maxSqft ? Number(maxSqft) : sqftBounds[1]}
                  onChangeMin={v => setMinSqft(String(v))}
                  onChangeMax={v => setMaxSqft(String(v))}
                  formatValue={v => `${v.toLocaleString("en-IN")} sqft`}
                />
              </div>

              {/* BHK */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Bedrooms</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setBhk(s => toggleSet(s, n))} style={{ width: "40px", height: "36px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: bhk.has(n) ? "var(--brand-accent)" : "rgba(255,255,255,0.05)", border: bhk.has(n) ? "none" : "1px solid var(--border)", color: bhk.has(n) ? "var(--brand-primary)" : "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.15s" }}>{n === 5 ? "5+" : n}</button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>Amenities</div>
                {["Swimming Pool", "Gym", "Parking", "Security"].map(a => (
                  <FilterCheck key={a} label={a} checked={amenityFilters.has(a)} onChange={() => setAmenityFilters(s => toggleSet(s, a))} />
                ))}
              </div>

              {hasFilters && (
                <button onClick={clearFilters} style={{ width: "100%", padding: "11px", marginTop: "12px", background: "transparent", border: "1.5px solid var(--border-accent)", borderRadius: "8px", color: "var(--brand-accent)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear All Filters</button>
              )}
            </div>
          </aside>

          {/* Right content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <RecentlyViewed theme="dark" />
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button className="pr-mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)} style={{ alignItems: "center", gap: "8px", padding: "9px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)", position: "relative" }}>
                  ☰ Filters
                  {activeFilterCount > 0 && (
                    <span style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%", background: "var(--brand-accent)", color: "var(--brand-primary)", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilterCount}</span>
                  )}
                </button>
                {loading ? (
                  <div style={{ width: "160px", height: "18px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", animation: "pulse 1.6s ease-in-out infinite" }} />
                ) : (
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginRight: "6px" }}>{filtered.length}</span>
                    {filtered.length === 1 ? "Property" : "Properties"} Found
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 36px 9px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-hover)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-body-new)", cursor: "pointer" }}>
                    <option value="featured" style={{ background: "var(--brand-primary)", color: "var(--text-primary)" }}>Featured First</option>
                    <option value="price_asc" style={{ background: "var(--brand-primary)", color: "var(--text-primary)" }}>Price: Low to High</option>
                    <option value="price_desc" style={{ background: "var(--brand-primary)", color: "var(--text-primary)" }}>Price: High to Low</option>
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                  {(["grid", "list"] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === mode ? "rgba(16,196,195,0.15)" : "transparent", border: "none", cursor: "pointer", borderRight: mode === "grid" ? "1px solid var(--border)" : "none" }}>
                      {mode === "grid" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "var(--brand-accent)" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "list" ? "var(--brand-accent)" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="pr-skeleton-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px", opacity: 0.4 }}>⌂</div>
                <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 400, color: "var(--text-primary)", marginBottom: "12px" }}>No Properties Found</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "360px" }}>No properties match these filters — try adjusting your price range, area, or search terms.</p>
                <button onClick={clearFilters} style={{ padding: "11px 28px", background: "var(--brand-accent)", border: "none", borderRadius: "8px", color: "var(--brand-primary)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear Filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="pr-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", columnGap: "20px", rowGap: "32px" }}>
                {paginatedItems.map((p, i) => (
                  <Reveal key={p.id} delay={reduceMotion ? 0 : Math.min(i * 0.05, 0.3)}>
                    <PropertyCard property={p} savedIds={savedIds} onToggleSave={toggleSave} reduceMotion={reduceMotion} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {paginatedItems.map((p, i) => {
                  const isNew = isNewListing(p.created_at);
                  return (
                  <Reveal key={p.id} delay={reduceMotion ? 0 : Math.min(i * 0.05, 0.3)}>
                    <a href={`/property/${p.slug}`} className="pr-card pr-list-item" style={{ display: "flex", textDecoration: "none", color: "inherit", cursor: "pointer", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", transition: reduceMotion ? "none" : "border-color 0.2s, box-shadow 0.2s", boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}
                      onMouseEnter={e => { if (!reduceMotion) { const d = e.currentTarget as HTMLElement; d.style.borderColor = "var(--border-accent)"; d.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; } }}
                      onMouseLeave={e => { if (!reduceMotion) { const d = e.currentTarget as HTMLElement; d.style.borderColor = "var(--border)"; d.style.boxShadow = "0 4px 20px rgba(0,0,0,0.35)"; } }}
                    >
                      <div className="pr-list-img pr-img-wrap" style={{ width: "280px", flexShrink: 0, position: "relative", aspectRatio: "4 / 3", overflow: "hidden" }}>
                        <img src={optimizedImageUrl(p.images?.[0], 600) || IMAGES.properties[p.type?.toLowerCase() as keyof typeof IMAGES.properties] || IMAGES.properties.apartment} alt={p.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: p.listing_type === "rent" ? "var(--blue-deep)" : "var(--brand-accent)", color: "var(--brand-primary)", backdropFilter: "blur(8px)" }}>
                            {p.listing_type === "rent" ? "For Rent" : "For Sale"}
                          </span>
                          {isNew && (
                            <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "var(--brand-primary)", color: "var(--brand-accent)", border: "1px solid var(--border-accent)", backdropFilter: "blur(8px)" }}>New</span>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "8px" }}>
                            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{p.title}</h3>
                            <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 700, color: "var(--brand-accent)", whiteSpace: "nowrap" }}>{formatPrice(p.price, p.listing_type)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "12px" }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</span>
                          </div>
                          {p.description && <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                        </div>
                        <div style={{ display: "flex", gap: "20px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                          {[{ label: COMMERCIAL_CATEGORIES.includes(p.type) ? "Rooms" : "Beds", value: p.bedrooms }, { label: COMMERCIAL_CATEGORIES.includes(p.type) ? "Wash" : "Baths", value: p.bathrooms }, { label: "sqft", value: p.area_sqft?.toLocaleString("en-IN") }].map(s => s.value != null && (
                            <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                            </div>
                          ))}
                          {p.is_featured && <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "100px", alignSelf: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-accent)", border: "1px solid var(--border-accent)" }}>Premium</span>}
                        </div>
                      </div>
                    </a>
                  </Reveal>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 48, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)"}}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 24px", borderRadius: 10,
                    background: page === 1 ? "rgba(255,255,255,0.03)" : "#182B3F",
                    border: `1px solid ${page === 1 ? "rgba(255,255,255,0.05)" : "rgba(16,196,195,0.25)"}`,
                    color: page === 1 ? "rgba(255,255,255,0.2)" : "#FFFFFF",
                    fontSize: 14, fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease", fontFamily: "var(--font-body-new)"
                  }}
                  onMouseOver={e => { if (page !== 1) e.currentTarget.style.background = "rgba(16,196,195,0.1)"; }}
                  onMouseOut={e => { if (page !== 1) e.currentTarget.style.background = "#182B3F"; }}
                >
                  ← Previous
                </button>

                <div style={{display: "flex", gap: 6}}>
                  {Array.from({length: totalPages}, (_, i) => i + 1).slice(
                    Math.max(0, page - 3), Math.min(totalPages, page + 2)
                  ).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: p === page ? "#10C4C3" : "#182B3F",
                      border: `1px solid ${p === page ? "#10C4C3" : "rgba(255,255,255,0.08)"}`,
                      color: p === page ? "#000" : "rgba(255,255,255,0.6)",
                      fontSize: 14, fontWeight: p === page ? 700 : 400,
                      cursor: "pointer", transition: "all 0.2s ease",
                      fontFamily: "var(--font-body-new)"
                    }}>
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 24px", borderRadius: 10,
                    background: page === totalPages ? "rgba(255,255,255,0.03)" : "#182B3F",
                    border: `1px solid ${page === totalPages ? "rgba(255,255,255,0.05)" : "rgba(16,196,195,0.25)"}`,
                    color: page === totalPages ? "rgba(255,255,255,0.2)" : "#FFFFFF",
                    fontSize: 14, fontWeight: 600,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease", fontFamily: "var(--font-body-new)"
                  }}
                  onMouseOver={e => { if (page !== totalPages) e.currentTarget.style.background = "rgba(16,196,195,0.1)"; }}
                  onMouseOut={e => { if (page !== totalPages) e.currentTarget.style.background = "#182B3F"; }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
