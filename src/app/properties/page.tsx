"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGES } from "@/constants/images";
import { useSavedProperties } from "@/hooks/useSavedProperties";
import { useCompare } from "@/context/CompareContext";
import RecentlyViewed from "@/components/property/RecentlyViewed";

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
};

function formatPrice(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
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
  };
}

function SkeletonCard() {
  return (
    <div style={{ background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.08)", borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ height: "220px", background: "rgba(245,242,236,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />
      <div style={{ padding: "20px" }}>
        {[80, 60, 40].map((w, i) => (
          <div key={i} style={{ height: "12px", borderRadius: "6px", marginBottom: "12px", width: `${w}%`, background: "rgba(245,242,236,0.06)", animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property, savedIds, onToggleSave }: { property: Property; savedIds: Set<string>; onToggleSave: (id: string, data?: Record<string, unknown>) => void }) {
  const saved = savedIds.has(property.id);
  const [imgError, setImgError] = useState(false);
  const { has: isComparing, toggle: toggleCompare, isFull } = useCompare();
  const comparing = isComparing(property.id);
  const img = !imgError && property.images?.length > 0
    ? property.images[0]
    : IMAGES.properties[property.type?.toLowerCase() as keyof typeof IMAGES.properties] || IMAGES.properties.apartment;

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
      style={{ display: "block", textDecoration: "none", color: "inherit", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.08)", borderRadius: "16px", overflow: "hidden", transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s", cursor: "pointer", position: "relative" }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(-4px)"; d.style.borderColor = "rgba(201,168,76,0.3)"; d.style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)"; }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(0)"; d.style.borderColor = "rgba(245,242,236,0.08)"; d.style.boxShadow = "none"; }}
    >
      <div style={{ position: "relative", height: "220px", overflow: "hidden", background: "#0a150f" }}>
        <img src={img} alt={property.title} onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px" }}>
          <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: property.listing_type === "rent" ? "rgba(45,106,79,0.9)" : "rgba(201,168,76,0.9)", color: property.listing_type === "rent" ? "#0B0D10" : "#000000", backdropFilter: "blur(8px)" }}>
            {property.listing_type === "rent" ? "For Rent" : "For Sale"}
          </span>
          {property.is_featured && (
            <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(13,43,31,0.85)", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.4)", backdropFilter: "blur(8px)" }}>Premium</span>
          )}
        </div>
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSave(property.id, { title: property.title, city: property.city, price: property.price, property_type: property.type, image: property.images?.[0] }); }} style={{ position: "absolute", top: "12px", right: "12px", width: "34px", height: "34px", borderRadius: "50%", background: "rgba(13,43,31,0.75)", border: "1px solid rgba(245,242,236,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "#2BA8E0" : "none"} stroke={saved ? "#2BA8E0" : "rgba(245,242,236,0.6)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <button onClick={handleCompare} title={!comparing && isFull ? "Comparison is full (max 3)" : comparing ? "Remove from comparison" : "Add to comparison"} style={{ position: "absolute", top: "12px", right: "54px", height: "34px", padding: "0 11px", borderRadius: "100px", background: comparing ? "#2BA8E0" : "rgba(13,43,31,0.75)", border: comparing ? "none" : "1px solid rgba(245,242,236,0.15)", display: "flex", alignItems: "center", gap: "5px", cursor: !comparing && isFull ? "not-allowed" : "pointer", opacity: !comparing && isFull ? 0.5 : 1, backdropFilter: "blur(8px)", fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: comparing ? "#000000" : "rgba(245,242,236,0.8)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {comparing ? <polyline points="20 6 9 17 4 12" /> : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
          </svg>
          {comparing ? "Added" : "Compare"}
        </button>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "32px 16px 14px" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#2BA8E0" }}>
            {formatPrice(property.price, property.listing_type)}
          </span>
          {property.price_per_sqft && property.listing_type !== "rent" && (
            <span style={{ fontSize: "11px", color: "rgba(245,242,236,0.55)", marginLeft: "8px" }}>₹{property.price_per_sqft.toLocaleString("en-IN")}/sqft</span>
          )}
        </div>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 600, color: "#000000", lineHeight: 1.3, marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{property.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "14px" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.5)" }}>{property.neighbourhood ? `${property.neighbourhood}, ` : ""}{property.city}</span>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid rgba(245,242,236,0.07)", paddingTop: "14px" }}>
          {[{ value: property.bedrooms, label: "Beds" }, { value: property.bathrooms, label: "Baths" }, { value: property.area_sqft?.toLocaleString("en-IN"), label: "sqft" }].map((s, i) => s.value != null && (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", borderRight: i < 2 ? "1px solid rgba(245,242,236,0.07)" : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{s.value}</span>
              <span style={{ fontSize: "10px", color: "rgba(245,242,236,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
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
      <div onClick={onChange} style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: checked ? "none" : "1.5px solid rgba(245,242,236,0.25)", background: checked ? "#2BA8E0" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span onClick={onChange} style={{ fontSize: "13px", color: checked ? "#000000" : "rgba(245,242,236,0.55)", transition: "color 0.15s" }}>{label}</span>
    </label>
  );
}

function toggleSet<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set);
  if (next.has(val)) next.delete(val); else next.add(val);
  return next;
}

export default function PropertiesPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { savedIds, toggleSave } = useSavedProperties(userId);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      console.log('properties page userId:', uid)
    }
    void loadUser()
  }, []);

  const [listingType, setListingType] = useState<"all" | "sale" | "rent">("all");
  const [city, setCity] = useState("all");
  const [propTypes, setPropTypes] = useState<Set<string>>(new Set());
  const [bhk, setBhk] = useState<Set<number>>(new Set());
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const filtered = useMemo(() => {
    let list = [...allProperties];
    if (listingType !== "all") list = list.filter(p => p.listing_type === listingType);
    if (city !== "all") list = list.filter(p => p.city?.toLowerCase() === city.toLowerCase());
    if (propTypes.size > 0) list = list.filter(p => propTypes.has(p.type));
    if (bhk.size > 0) list = list.filter(p => { const b = p.bedrooms ?? 0; return bhk.has(b >= 5 ? 5 : b); });
    if (amenityFilters.size > 0) list = list.filter(p => [...amenityFilters].every(a => (p.amenities ?? []).some(pa => pa.toLowerCase().includes(a.toLowerCase()))));
    if (minPrice) list = list.filter(p => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter(p => p.price <= Number(maxPrice));
    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    return list;
  }, [allProperties, listingType, city, propTypes, bhk, amenityFilters, minPrice, maxPrice, sortBy]);

  function clearFilters() {
    setListingType("all"); setCity("all"); setPropTypes(new Set());
    setBhk(new Set()); setAmenityFilters(new Set()); setMinPrice(""); setMaxPrice("");
  }

  const hasFilters = listingType !== "all" || city !== "all" || propTypes.size > 0 || bhk.size > 0 || amenityFilters.size > 0 || minPrice || maxPrice;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; overflow-x: hidden; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000", color: "#000000" }}>

        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />

        {/* Hero */}
        <div style={{ position: "relative", zIndex: 1, marginTop: "64px", background: "linear-gradient(135deg, #081c12 0%, #000000 60%, #132e1f 100%)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "48px 48px 40px" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <a href="/" style={{ fontSize: "12px", color: "rgba(245,242,236,0.4)", textDecoration: "none" }}>Home</a>
              <span style={{ color: "rgba(201,168,76,0.4)", fontSize: "10px" }}>›</span>
              <span style={{ fontSize: "12px", color: "#2BA8E0" }}>Properties</span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 300, color: "#000000", lineHeight: 1.1, marginBottom: "10px" }}>
              Find Your <em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Perfect Home</em>
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.45)" }}>
              {loading ? "Loading properties…" : `${allProperties.length} premium properties across India`}
            </p>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto", padding: "32px 48px 80px", display: "flex", gap: "28px", alignItems: "flex-start" }}>

          {/* Sidebar */}
          <aside style={{ width: "280px", flexShrink: 0, position: "sticky", top: "88px", background: "rgba(245,242,236,0.03)", border: "1px solid rgba(245,242,236,0.08)", borderRadius: "16px", overflow: "hidden", maxHeight: "calc(100vh - 108px)", overflowY: "auto" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(245,242,236,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.5)" }}>Filters</span>
              {hasFilters && <button onClick={clearFilters} style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2BA8E0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear All</button>}
            </div>

            <div style={{ padding: "20px" }}>
              {/* Listing type */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>Type</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["all", "sale", "rent"] as const).map(t => (
                    <button key={t} onClick={() => setListingType(t)} style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textTransform: "capitalize", background: listingType === t ? "#2BA8E0" : "rgba(245,242,236,0.05)", border: listingType === t ? "none" : "1px solid rgba(245,242,236,0.1)", color: listingType === t ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                      {t === "all" ? "All" : t === "sale" ? "Buy" : "Rent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>City</div>
                <div style={{ position: "relative" }}>
                  <select value={city} onChange={e => setCity(e.target.value)} style={{ width: "100%", padding: "10px 36px 10px 14px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: city === "all" ? "rgba(245,242,236,0.45)" : "#000000", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                    <option value="all" style={{ background: "#000000" }}>All Cities</option>
                    {["Hyderabad", "Mumbai", "Bengaluru"].map(c => <option key={c} value={c} style={{ background: "#000000" }}>{c}</option>)}
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* Property type */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>Property Type</div>
                {["apartment", "villa", "penthouse", "plot", "office"].map(t => (
                  <FilterCheck key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} checked={propTypes.has(t)} onChange={() => setPropTypes(s => toggleSet(s, t))} />
                ))}
              </div>

              {/* Price range */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>Price Range (₹)</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ placeholder: "Min", value: minPrice, onChange: setMinPrice }, { placeholder: "Max", value: maxPrice, onChange: setMaxPrice }].map(({ placeholder, value, onChange }) => (
                    <input key={placeholder} type="number" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, padding: "9px 10px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: "#000000", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[{ label: "< 50L", min: "", max: "5000000" }, { label: "1–3 Cr", min: "10000000", max: "30000000" }, { label: "3 Cr+", min: "30000000", max: "" }].map(p => (
                    <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }} style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 500, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#2BA8E0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{p.label}</button>
                  ))}
                </div>
              </div>

              {/* BHK */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>Bedrooms</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setBhk(s => toggleSet(s, n))} style={{ width: "40px", height: "36px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: bhk.has(n) ? "#2BA8E0" : "rgba(245,242,236,0.05)", border: bhk.has(n) ? "none" : "1px solid rgba(245,242,236,0.1)", color: bhk.has(n) ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{n === 5 ? "5+" : n}</button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>Amenities</div>
                {["Swimming Pool", "Gym", "Parking", "Security"].map(a => (
                  <FilterCheck key={a} label={a} checked={amenityFilters.has(a)} onChange={() => setAmenityFilters(s => toggleSet(s, a))} />
                ))}
              </div>

              {hasFilters && (
                <button onClick={clearFilters} style={{ width: "100%", padding: "11px", marginTop: "12px", background: "transparent", border: "1.5px solid rgba(201,168,76,0.4)", borderRadius: "8px", color: "#2BA8E0", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear All Filters</button>
              )}
            </div>
          </aside>

          {/* Right content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <RecentlyViewed theme="dark" />
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
              <div>
                {loading ? (
                  <div style={{ width: "160px", height: "18px", borderRadius: "6px", background: "rgba(245,242,236,0.08)", animation: "pulse 1.6s ease-in-out infinite" }} />
                ) : (
                  <span style={{ fontSize: "14px", color: "rgba(245,242,236,0.55)" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#000000", marginRight: "6px" }}>{filtered.length}</span>
                    {filtered.length === 1 ? "Property" : "Properties"} Found
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "9px 36px 9px 14px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: "#000000", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                    <option value="featured" style={{ background: "#000000" }}>Featured First</option>
                    <option value="price_asc" style={{ background: "#000000" }}>Price: Low to High</option>
                    <option value="price_desc" style={{ background: "#000000" }}>Price: High to Low</option>
                  </select>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div style={{ display: "flex", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                  {(["grid", "list"] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === mode ? "rgba(201,168,76,0.15)" : "transparent", border: "none", cursor: "pointer", borderRight: mode === "grid" ? "1px solid rgba(245,242,236,0.1)" : "none" }}>
                      {mode === "grid" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "#2BA8E0" : "rgba(245,242,236,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "list" ? "#2BA8E0" : "rgba(245,242,236,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards */}
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center", background: "rgba(245,242,236,0.02)", border: "1px solid rgba(245,242,236,0.06)", borderRadius: "16px" }}>
                <div style={{ fontSize: "48px", marginBottom: "20px", opacity: 0.4 }}>⌂</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#000000", marginBottom: "12px" }}>No Properties Found</h3>
                <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.4)", marginBottom: "24px", maxWidth: "320px" }}>No properties match your current filters. Try adjusting your search criteria.</p>
                <button onClick={clearFilters} style={{ padding: "11px 28px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear Filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {filtered.map(p => <PropertyCard key={p.id} property={p} savedIds={savedIds} onToggleSave={toggleSave} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {filtered.map(p => (
                  <a key={p.id} href={`/property/${p.slug}`} style={{ display: "flex", textDecoration: "none", color: "inherit", cursor: "pointer", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.08)", borderRadius: "16px", overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { const d = e.currentTarget as HTMLElement; d.style.borderColor = "rgba(201,168,76,0.3)"; d.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"; }}
                    onMouseLeave={e => { const d = e.currentTarget as HTMLElement; d.style.borderColor = "rgba(245,242,236,0.08)"; d.style.boxShadow = "none"; }}
                  >
                    <div style={{ width: "280px", flexShrink: 0, position: "relative" }}>
                      <img src={p.images?.[0] || IMAGES.properties[p.type?.toLowerCase() as keyof typeof IMAGES.properties] || IMAGES.properties.apartment} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "180px" }} />
                      <span style={{ position: "absolute", top: "12px", left: "12px", padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: p.listing_type === "rent" ? "rgba(45,106,79,0.9)" : "rgba(201,168,76,0.9)", color: p.listing_type === "rent" ? "#0B0D10" : "#000000", backdropFilter: "blur(8px)" }}>
                        {p.listing_type === "rent" ? "For Rent" : "For Sale"}
                      </span>
                    </div>
                    <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "8px" }}>
                          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#000000", lineHeight: 1.3 }}>{p.title}</h3>
                          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#2BA8E0", whiteSpace: "nowrap" }}>{formatPrice(p.price, p.listing_type)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "12px" }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.5)" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</span>
                        </div>
                        {p.description && <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.4)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "20px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(245,242,236,0.07)" }}>
                        {[{ label: "Beds", value: p.bedrooms }, { label: "Baths", value: p.bathrooms }, { label: "sqft", value: p.area_sqft?.toLocaleString("en-IN") }].map(s => s.value != null && (
                          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "15px", fontWeight: 600, color: "#000000" }}>{s.value}</span>
                            <span style={{ fontSize: "10px", color: "rgba(245,242,236,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                          </div>
                        ))}
                        {p.is_featured && <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "100px", alignSelf: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.3)" }}>Premium</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
