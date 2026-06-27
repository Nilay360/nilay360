"use client";
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AMENITIES } from "@/constants";

// ── Types ─────────────────────────────────────────────────────
type Property = {
  id: string; slug: string; title: string; description: string | null;
  type: string; listing_type: string; status: string;
  price: number; price_per_sqft: number | null; area_sqft: number;
  bedrooms: number | null; bathrooms: number | null; parking_spaces: number | null;
  floor_number: number | null; year_built: number | null;
  is_furnished: boolean; is_new_construction: boolean; rera_number: string | null;
  address: string; city: string; neighbourhood: string | null;
  images: string[]; amenities: string[]; is_featured: boolean; saves: number;
  facing: string | null; possession: string | null;
};

// ── Helpers ───────────────────────────────────────────────────
function fmt(price: number, lt: string): string {
  if (lt === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

const BUDGET_PRESETS: Record<string, [number, number]> = {
  "Under 50L": [0, 5000000],
  "50L – 1Cr": [5000000, 10000000],
  "1 – 2 Cr": [10000000, 20000000],
  "2 – 5 Cr": [20000000, 50000000],
  "5 Cr+": [50000000, 999999999],
};

const PAGE_SIZE = 12;

// ── Mapper: property_listings row → Property shape ────────────
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function mapListingToProperty(row: Record<string, unknown>): Property {
  const photos = Array.isArray(row.photo_urls) ? (row.photo_urls as string[]).filter(Boolean) : [];
  return {
    id:                  String(row.id ?? ""),
    slug:                typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:               typeof row.title === "string" ? row.title : "Untitled Property",
    description:         typeof row.highlights === "string" ? row.highlights : null,
    type:                typeof row.property_category === "string" ? row.property_category : "",
    listing_type:        typeof row.listing_type === "string" ? row.listing_type : "sale",
    status:              typeof row.status === "string" ? row.status : "pending_review",
    price:               num(row.price) ?? 0,
    price_per_sqft:      null,
    area_sqft:           num(row.built_up_area) ?? 0,
    bedrooms:            num(row.bedrooms),
    bathrooms:           num(row.bathrooms),
    parking_spaces:      null,
    floor_number:        num(row.floor_number),
    year_built:          null,
    is_furnished:        row.furnishing != null && row.furnishing !== "unfurnished",
    is_new_construction: false,
    rera_number:         null,
    address:             typeof row.address === "string" ? row.address : "",
    city:                typeof row.city === "string" ? row.city : "",
    neighbourhood:       typeof row.locality === "string" ? row.locality : null,
    images:              photos,
    amenities:           Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    is_featured:         Boolean(row.is_featured),
    saves:               0,
    facing:              typeof row.facing === "string" ? row.facing : null,
    possession:          typeof row.possession_status === "string" ? row.possession_status
                          : (typeof row.possession === "string" ? row.possession : null),
  };
}

// ── State / City / Pincode maps ───────────────────────────────
const STATE_CITY_MAP: Record<string, string[]> = {
  "Telangana": ["Hyderabad"],
  "Maharashtra": ["Mumbai", "Pune"],
  "Karnataka": ["Bengaluru"],
  "Delhi": ["Delhi NCR"],
  "Tamil Nadu": ["Chennai"],
  "West Bengal": ["Kolkata"],
  "Gujarat": ["Ahmedabad"],
  "Rajasthan": ["Jaipur"],
  "Uttar Pradesh": ["Lucknow", "Noida"],
  "Haryana": ["Gurugram", "Faridabad"],
  "Punjab": ["Chandigarh"],
  "Madhya Pradesh": ["Bhopal", "Indore"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada"],
  "Kerala": ["Kochi", "Thiruvananthapuram"],
};

const CITY_STATE_MAP: Record<string, string> = {
  "Hyderabad": "Telangana",
  "Mumbai": "Maharashtra",
  "Pune": "Maharashtra",
  "Bengaluru": "Karnataka",
  "Delhi NCR": "Delhi",
  "Chennai": "Tamil Nadu",
  "Kolkata": "West Bengal",
  "Ahmedabad": "Gujarat",
  "Jaipur": "Rajasthan",
  "Lucknow": "Uttar Pradesh",
  "Noida": "Uttar Pradesh",
  "Gurugram": "Haryana",
  "Faridabad": "Haryana",
  "Chandigarh": "Punjab",
  "Bhopal": "Madhya Pradesh",
  "Indore": "Madhya Pradesh",
  "Visakhapatnam": "Andhra Pradesh",
  "Vijayawada": "Andhra Pradesh",
  "Kochi": "Kerala",
  "Thiruvananthapuram": "Kerala",
};

const PINCODE_MAP: Record<string, { state: string; city: string }> = {
  "500": { state: "Telangana", city: "Hyderabad" },
  "400": { state: "Maharashtra", city: "Mumbai" },
  "411": { state: "Maharashtra", city: "Pune" },
  "560": { state: "Karnataka", city: "Bengaluru" },
  "110": { state: "Delhi", city: "Delhi NCR" },
  "600": { state: "Tamil Nadu", city: "Chennai" },
  "700": { state: "West Bengal", city: "Kolkata" },
  "380": { state: "Gujarat", city: "Ahmedabad" },
  "302": { state: "Rajasthan", city: "Jaipur" },
  "226": { state: "Uttar Pradesh", city: "Lucknow" },
  "201": { state: "Uttar Pradesh", city: "Noida" },
  "122": { state: "Haryana", city: "Gurugram" },
  "121": { state: "Haryana", city: "Faridabad" },
  "160": { state: "Punjab", city: "Chandigarh" },
  "462": { state: "Madhya Pradesh", city: "Bhopal" },
  "452": { state: "Madhya Pradesh", city: "Indore" },
  "530": { state: "Andhra Pradesh", city: "Visakhapatnam" },
  "682": { state: "Kerala", city: "Kochi" },
  "695": { state: "Kerala", city: "Thiruvananthapuram" },
};

// Possession options and facing directions for the advanced filters
const POSSESSION_OPTIONS = ["Ready to Move", "Under Construction", "New Launch"];
const FACING_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const AGE_OPTIONS: { label: string; value: string }[] = [
  { label: "New (< 1 yr)", value: "0-1" },
  { label: "1 – 5 yrs",    value: "1-5" },
  { label: "5 – 10 yrs",   value: "5-10" },
  { label: "10+ yrs",      value: "10+" },
];
const CURRENT_YEAR = 2026;

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ background: "#161A1F", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ height: "200px", background: "rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite" }} />
      <div style={{ padding: "18px" }}>
        {[75, 55, 40].map((w, i) => (
          <div key={i} style={{ height: "11px", borderRadius: "5px", marginBottom: "10px", width: `${w}%`, background: "rgba(255,255,255,0.06)", animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "100px", background: "rgba(43,168,224,0.12)", border: "1px solid rgba(43,168,224,0.3)", fontSize: "12px", fontWeight: 500, color: "#E8EAED", whiteSpace: "nowrap" }}>
      {label}
      <span onClick={onRemove} style={{ cursor: "pointer", fontSize: "13px", lineHeight: 1, color: "#1577B8", fontWeight: 700 }}>×</span>
    </span>
  );
}

// ── FilterCheck ───────────────────────────────────────────────
function FilterCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", marginBottom: "10px" }}>
      <div onClick={onChange} style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: checked ? "none" : "1.5px solid rgba(245,242,236,0.25)", background: checked ? "#2BA8E0" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span onClick={onChange} style={{ fontSize: "13px", color: checked ? "#FFFFFF" : "rgba(245,242,236,0.55)", transition: "color 0.15s" }}>{label}</span>
    </label>
  );
}

// ── Toggle switch ─────────────────────────────────────────────
function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: "14px" }}>
      <span style={{ fontSize: "13px", color: checked ? "#FFFFFF" : "rgba(245,242,236,0.55)", transition: "color 0.15s" }}>{label}</span>
      <div style={{ width: "36px", height: "20px", borderRadius: "10px", background: checked ? "#2BA8E0" : "rgba(245,242,236,0.15)", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: "3px", left: checked ? "19px" : "3px", width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </div>
    </div>
  );
}

// ── Property card ─────────────────────────────────────────────
function PropertyCard({ p, comparing, onCompare, onSave, saved }: { p: Property; comparing: boolean; onCompare: () => void; onSave: () => void; saved: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const img = !imgErr && p.images?.length > 0 ? p.images[0] : `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <div style={{ background: "#161A1F", border: comparing ? "2px solid #2BA8E0" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden", transition: "transform 0.18s, box-shadow 0.18s, border-color 0.15s", cursor: "pointer", position: "relative" }}
      onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; if (!comparing) { d.style.transform = "translateY(-3px)"; d.style.boxShadow = "0 12px 40px rgba(43,168,224,0.1)"; } }}
      onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; if (!comparing) { d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; } }}
    >
      {/* Compare checkbox */}
      <div onClick={e => { e.stopPropagation(); onCompare(); }} style={{ position: "absolute", top: "12px", left: "12px", zIndex: 3, width: "22px", height: "22px", borderRadius: "5px", background: comparing ? "#2BA8E0" : "rgba(255,255,255,0.85)", border: comparing ? "none" : "1.5px solid rgba(13,43,31,0.2)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
        {comparing && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>

      <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ position: "relative", height: "200px", overflow: "hidden", background: "#0B0D10" }}>
          <img src={img} alt={p.title} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.35s" }}
            onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)"}
            onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"}
          />
          <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px" }}>
            <span style={{ padding: "3px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: p.listing_type === "rent" ? "rgba(45,106,79,0.9)" : "rgba(201,168,76,0.9)", color: p.listing_type === "rent" ? "#0B0D10" : "#000000", backdropFilter: "blur(6px)" }}>
              {p.listing_type === "rent" ? "Rent" : "Sale"}
            </span>
            {p.is_featured && <span style={{ padding: "3px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(13,43,31,0.82)", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.35)", backdropFilter: "blur(6px)" }}>Premium</span>}
          </div>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); onSave(); }} style={{ position: "absolute", bottom: "12px", right: "12px", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "#2BA8E0" : "none"} stroke={saved ? "#2BA8E0" : "#6B7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          </button>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.55))", padding: "28px 14px 12px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#2BA8E0" }}>{fmt(p.price, p.listing_type)}</span>
            {p.price_per_sqft && p.listing_type !== "rent" && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginLeft: "7px" }}>₹{p.price_per_sqft.toLocaleString("en-IN")}/sqft</span>}
          </div>
        </div>

        <div style={{ padding: "16px 18px 18px" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "16px", fontWeight: 600, color: "#E8EAED", lineHeight: 1.3, marginBottom: "6px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</span>
          </div>
          <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px" }}>
            {[{ v: p.bedrooms, l: "Beds" }, { v: p.bathrooms, l: "Bath" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map((s, i) => s.v != null && (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#E8EAED" }}>{s.v}</span>
                <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </a>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────
function ListRow({ p, comparing, onCompare, onSave, saved }: { p: Property; comparing: boolean; onCompare: () => void; onSave: () => void; saved: boolean }) {
  const img = p.images?.[0] || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <div className="search-list-card" style={{ background: "#161A1F", border: comparing ? "2px solid #2BA8E0" : "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflow: "hidden", display: "flex", transition: "box-shadow 0.18s, border-color 0.15s" }}
      onMouseEnter={e => { if (!comparing) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(43,168,224,0.08)"; }}
      onMouseLeave={e => { if (!comparing) (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ width: "260px", flexShrink: 0, position: "relative" }}>
        <a href={`/property/${p.slug}`} style={{ display: "block", height: "100%" }}>
          <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: "160px" }} />
        </a>
        <div onClick={e => { e.stopPropagation(); onCompare(); }} style={{ position: "absolute", top: "10px", left: "10px", width: "22px", height: "22px", borderRadius: "5px", background: comparing ? "#2BA8E0" : "rgba(255,255,255,0.85)", border: comparing ? "none" : "1.5px solid rgba(13,43,31,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {comparing && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3 3 7-7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
      </div>
      <a href={`/property/${p.slug}`} style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "6px" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#E8EAED", lineHeight: 1.3 }}>{p.title}</h3>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#2BA8E0", whiteSpace: "nowrap" }}>{fmt(p.price, p.listing_type)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</span>
          </div>
          {p.description && <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
        </div>
        <div style={{ display: "flex", gap: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "12px", alignItems: "center" }}>
          {[{ v: p.bedrooms, l: "Beds" }, { v: p.bathrooms, l: "Bath" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map((s, i) => s.v != null && (
            <div key={i}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#E8EAED" }}>{s.v}</span>
              <span style={{ fontSize: "10px", color: "#9CA3AF", marginLeft: "3px", textTransform: "uppercase" }}>{s.l}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
            {p.is_featured && <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.3)" }}>Premium</span>}
            <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: p.listing_type === "rent" ? "rgba(45,106,79,0.08)" : "rgba(201,168,76,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(43,168,224,0.2)" }}>
              {p.listing_type === "rent" ? "Rent" : "Sale"}
            </span>
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); onSave(); }} style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "#2BA8E0" : "none"} stroke={saved ? "#2BA8E0" : "#6B7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            </button>
          </div>
        </div>
      </a>
    </div>
  );
}

// ── Sidebar section label ─────────────────────────────────────
function SbLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,242,236,0.35)", marginBottom: "12px" }}>{children}</div>;
}

// ── Main page ─────────────────────────────────────────────────
function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allProps, setAllProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [listingType, setListingType] = useState<"all" | "sale" | "rent">("all");
  const [city, setCity] = useState("all");
  const [propTypes, setPropTypes] = useState<Set<string>>(new Set());
  const [bhk, setBhk] = useState<Set<number>>(new Set());
  const [amenityFilters, setAmenityFilters] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [furnished, setFurnished] = useState<boolean | null>(null);
  const [newConstruction, setNewConstruction] = useState(false);
  const [reraApproved, setReraApproved] = useState(false);
  // Advanced filters
  const [possession, setPossession] = useState("all");
  const [propertyAge, setPropertyAge] = useState("all");
  const [minFloor, setMinFloor] = useState("");
  const [maxFloor, setMaxFloor] = useState("");
  const [facingFilters, setFacingFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("featured");

  // Search bar
  const [sbCity, setSbCity] = useState("all");
  const [sbType, setSbType] = useState("all");
  const [sbBhk, setSbBhk] = useState("all");
  const [sbBudget, setSbBudget] = useState("all");

  // Free-text query (from homepage q param or future search input)
  const [textQuery, setTextQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [searchSavedToast, setSearchSavedToast] = useState(false);

  // State / pincode filters
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [pincodeInput, setPincodeInput] = useState<string>("");

  // Read URL params once on mount
  useEffect(() => {
    const c    = searchParams.get("city")    || "all";
    const t    = searchParams.get("type")    || "all";
    const l    = searchParams.get("listing") || "all";
    const b    = searchParams.get("budget")  || "all";
    const beds = searchParams.get("beds")    || "all";
    const q    = searchParams.get("q")       || "";
    const tab  = searchParams.get("tab")     || "";

    setSbCity(c); setSbType(t); setSbBhk(beds); setSbBudget(b);
    if (c !== "all") setCity(c);
    if (t !== "all") setPropTypes(new Set([t]));
    // listing param takes precedence; tab param from homepage maps buy→sale, rent→rent
    if (l !== "all") {
      setListingType(l as "all" | "sale" | "rent");
    } else if (tab === "buy") {
      setListingType("sale");
    } else if (tab === "rent") {
      setListingType("rent");
    }
    if (beds !== "all") setBhk(new Set([parseInt(beds)]));
    if (b !== "all" && BUDGET_PRESETS[b]) {
      setMinPrice(String(BUDGET_PRESETS[b][0] || ""));
      setMaxPrice(String(BUDGET_PRESETS[b][1] === 999999999 ? "" : BUDGET_PRESETS[b][1]));
    }
    if (q) setTextQuery(q);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then((res: { data: { session: { user: { id: string } } | null } }) => {
      setUserId(res.data.session?.user?.id ?? null);
    });
  }, []);

  // Fetch both seed properties and user-submitted property_listings
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: seedData }, { data: listingData }] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("property_listings").select("*").eq("status", "active"),
      ]);
      const mapped = (listingData ?? []).map((row: Record<string, unknown>) => mapListingToProperty(row));
      setAllProps([...mapped, ...((seedData ?? []) as Property[])]);
      setLoading(false);
    }
    void load();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (city !== "all") params.set("city", city);
    if (propTypes.size === 1) params.set("type", [...propTypes][0]);
    if (listingType !== "all") params.set("listing", listingType);
    if (bhk.size === 1) params.set("beds", String([...bhk][0]));
    window.history.replaceState(null, "", `/search${params.toString() ? "?" + params.toString() : ""}`);
  }, [city, propTypes, listingType, bhk]);

  const handlePincodeChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setPincodeInput(digits);
    if (digits.length >= 3) {
      const prefix = digits.slice(0, 3);
      const match = PINCODE_MAP[prefix];
      if (match) {
        setStateFilter(match.state);
        setCity(match.city);
      }
    }
  };

  const handleStateChange = (newState: string) => {
    setStateFilter(newState);
    if (newState === "all") {
      setCity("all");
    } else {
      const citiesInState = STATE_CITY_MAP[newState] || [];
      if (!citiesInState.includes(city)) {
        setCity("all");
      }
    }
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    if (newCity !== "all") {
      const parentState = CITY_STATE_MAP[newCity];
      if (parentState) setStateFilter(parentState);
    }
  };

  const toggleSet = useCallback(<T,>(set: Set<T>, val: T): Set<T> => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  }, []);

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...allProps];
    // Free-text search: title, city, neighbourhood/locality, address
    if (textQuery.trim()) {
      const terms = textQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        const searchable = [
          p.title, p.city, p.neighbourhood, p.address,
          p.description, p.type,
        ].filter(Boolean).join(' ').toLowerCase();
        return terms.some(term => searchable.includes(term));
      });
    }
    if (listingType !== "all") list = list.filter(p => p.listing_type === listingType);
    if (city !== "all") list = list.filter(p => p.city?.toLowerCase() === city.toLowerCase());
    // State filter
    if (stateFilter !== "all") {
      list = list.filter(p =>
        (p as unknown as Record<string, string>).state?.toLowerCase() === stateFilter.toLowerCase() ||
        CITY_STATE_MAP[(p.city || "")]?.toLowerCase() === stateFilter.toLowerCase()
      );
    }
    if (propTypes.size > 0) list = list.filter(p => propTypes.has(p.type));
    if (bhk.size > 0) list = list.filter(p => { const b = p.bedrooms ?? 0; return bhk.has(b >= 5 ? 5 : b); });
    if (amenityFilters.size > 0) list = list.filter(p => [...amenityFilters].every(a => (p.amenities ?? []).some(pa => pa.toLowerCase().includes(a.toLowerCase()))));
    if (minPrice) list = list.filter(p => p.price >= Number(minPrice));
    if (maxPrice) list = list.filter(p => p.price <= Number(maxPrice));
    if (furnished === true) list = list.filter(p => p.is_furnished);
    if (furnished === false) list = list.filter(p => !p.is_furnished);
    if (newConstruction) list = list.filter(p => p.is_new_construction);
    if (reraApproved) list = list.filter(p => !!p.rera_number);
    // Possession status
    if (possession !== "all") {
      const want = possession.toLowerCase();
      list = list.filter(p => {
        if (p.possession) return p.possession.toLowerCase().includes(want);
        // fall back to the new-construction flag when possession data is absent
        if (want === "under construction" || want === "new launch") return p.is_new_construction;
        if (want === "ready to move") return !p.is_new_construction;
        return false;
      });
    }
    // Property age (derived from year_built)
    if (propertyAge !== "all") {
      list = list.filter(p => {
        if (!p.year_built) return false;
        const age = CURRENT_YEAR - p.year_built;
        if (propertyAge === "0-1") return age <= 1;
        if (propertyAge === "1-5") return age > 1 && age <= 5;
        if (propertyAge === "5-10") return age > 5 && age <= 10;
        if (propertyAge === "10+") return age > 10;
        return true;
      });
    }
    // Floor number range
    if (minFloor) list = list.filter(p => p.floor_number != null && p.floor_number >= Number(minFloor));
    if (maxFloor) list = list.filter(p => p.floor_number != null && p.floor_number <= Number(maxFloor));
    // Facing direction
    if (facingFilters.size > 0) list = list.filter(p => !!p.facing && [...facingFilters].some(f => p.facing!.toLowerCase() === f.toLowerCase()));

    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "area_desc") list.sort((a, b) => (b.area_sqft || 0) - (a.area_sqft || 0));
    else if (sortBy === "popular") list.sort((a, b) => (b.saves || 0) - (a.saves || 0));
    else list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

    return list;
  }, [allProps, textQuery, listingType, city, stateFilter, pincodeInput, propTypes, bhk, amenityFilters, minPrice, maxPrice, furnished, newConstruction, reraApproved, possession, propertyAge, minFloor, maxFloor, facingFilters, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clearFilters() {
    setListingType("all"); setCity("all"); setPropTypes(new Set()); setBhk(new Set());
    setAmenityFilters(new Set()); setMinPrice(""); setMaxPrice("");
    setFurnished(null); setNewConstruction(false); setReraApproved(false);
    setPossession("all"); setPropertyAge("all"); setMinFloor(""); setMaxFloor(""); setFacingFilters(new Set());
    setStateFilter("all"); setPincodeInput("");
    setPage(1);
  }

  function applySearch() {
    if (sbCity !== "all") setCity(sbCity); else setCity("all");
    if (sbType !== "all") setPropTypes(new Set([sbType])); else setPropTypes(new Set());
    if (sbBhk !== "all") setBhk(new Set([parseInt(sbBhk)])); else setBhk(new Set());
    if (sbBudget !== "all" && BUDGET_PRESETS[sbBudget]) {
      const [mn, mx] = BUDGET_PRESETS[sbBudget];
      setMinPrice(mn ? String(mn) : "");
      setMaxPrice(mx < 999999999 ? String(mx) : "");
    } else {
      setMinPrice(""); setMaxPrice("");
    }
    setPage(1);
  }

  async function saveSearch() {
    if (!saveSearchName.trim() || !userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("property_searches").insert({
      user_id:      userId,
      search_query: saveSearchName.trim(),
      filters: {
        city,
        listingType,
        propTypes:      Array.from(propTypes),
        bhk:            Array.from(bhk),
        minPrice,
        maxPrice,
        amenityFilters: Array.from(amenityFilters),
        furnished,
        newConstruction,
        reraApproved,
      },
    });
    if (error) {
      console.error("Save search error:", error);
    } else {
      setSaveSearchName("");
      setShowSaveModal(false);
      setSearchSavedToast(true);
      setTimeout(() => setSearchSavedToast(false), 3000);
    }
  }

  // Active filter chips
  const chips: { label: string; remove: () => void }[] = [];
  if (listingType !== "all") chips.push({ label: listingType === "sale" ? "For Sale" : "For Rent", remove: () => setListingType("all") });
  if (city !== "all") chips.push({ label: city, remove: () => setCity("all") });
  [...propTypes].forEach(t => chips.push({ label: t.charAt(0).toUpperCase() + t.slice(1), remove: () => setPropTypes(s => toggleSet(s, t)) }));
  [...bhk].forEach(b => chips.push({ label: `${b}${b === 5 ? "+" : ""} BHK`, remove: () => setBhk(s => toggleSet(s, b)) }));
  if (minPrice || maxPrice) chips.push({ label: `₹${minPrice ? fmt(Number(minPrice), "sale") : "0"} – ${maxPrice ? fmt(Number(maxPrice), "sale") : "Any"}`, remove: () => { setMinPrice(""); setMaxPrice(""); } });
  if (furnished === true) chips.push({ label: "Furnished", remove: () => setFurnished(null) });
  if (furnished === false) chips.push({ label: "Unfurnished", remove: () => setFurnished(null) });
  if (newConstruction) chips.push({ label: "New Construction", remove: () => setNewConstruction(false) });
  if (reraApproved) chips.push({ label: "RERA Approved", remove: () => setReraApproved(false) });
  if (possession !== "all") chips.push({ label: possession, remove: () => setPossession("all") });
  if (propertyAge !== "all") chips.push({ label: AGE_OPTIONS.find(o => o.value === propertyAge)?.label ?? propertyAge, remove: () => setPropertyAge("all") });
  if (minFloor || maxFloor) chips.push({ label: `Floor ${minFloor || "0"}–${maxFloor || "Any"}`, remove: () => { setMinFloor(""); setMaxFloor(""); } });
  [...facingFilters].forEach(f => chips.push({ label: `${f} Facing`, remove: () => setFacingFilters(s => toggleSet(s, f)) }));
  [...amenityFilters].forEach(a => chips.push({ label: a, remove: () => setAmenityFilters(s => toggleSet(s, a)) }));

  const hasFilters = chips.length > 0;

  // Search criteria summary
  const criteriaLabel = [
    city !== "all" ? city : null,
    listingType !== "all" ? (listingType === "sale" ? "For Sale" : "For Rent") : null,
    [...propTypes].join(", ") || null,
    [...bhk].length > 0 ? `${[...bhk].join("/")} BHK` : null,
  ].filter(Boolean).join(" · ") || "All Properties";

  const selStyle = { padding: "10px 36px 10px 14px", background: "rgba(245,242,236,0.06)", border: "1px solid rgba(245,242,236,0.14)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" } as React.CSSProperties;
  const chevron = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; overflow-x: hidden; }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px; }

        .mobile-filter-toggle { display: none; }

        @media (max-width: 768px) {
          .mobile-filter-toggle { display: flex !important; align-items: center; gap: 8px; background: #1a1a2e; color: #2BA8E0; border: 1px solid #2BA8E0; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 12px 16px; width: calc(100% - 32px); justify-content: center; font-family: 'DM Sans', sans-serif; }
          .search-layout { flex-direction: column !important; padding: 0 !important; }
          .search-sidebar { width: 100% !important; position: fixed !important; top: 0 !important; left: 0 !important; height: 100vh !important; z-index: 999 !important; overflow-y: auto !important; transform: translateX(-100%) !important; transition: transform 0.3s ease !important; background: #0B0D10 !important; padding: 24px 16px !important; }
          .search-sidebar.open { transform: translateX(0) !important; }
          .search-summary { padding: 12px 16px !important; flex-wrap: wrap !important; gap: 8px !important; }
          .search-bar-row { padding: 12px 16px !important; flex-wrap: wrap !important; gap: 8px !important; }
          .search-bar-row select, .search-bar-row input { width: 100% !important; min-width: unset !important; }
          .search-results-grid { padding: 0 16px !important; grid-template-columns: 1fr !important; }
          .search-list-card { flex-direction: column !important; width: 100% !important; }
          .search-list-card img { width: 100% !important; height: 200px !important; object-fit: cover !important; }
          .search-save-modal { width: min(420px, 92vw) !important; margin: 0 auto !important; }
        }

        @media (max-width: 480px) {
          .search-bar-row { padding: 10px 12px !important; }
          .search-results-grid { padding: 0 12px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000" }}>

        {/* ── NAV ── */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(5,8,12,0.82)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "0.5px solid rgba(201,168,76,0.18)" }}>
          <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "19px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
            Nilay 360 <span style={{ color: "#2BA8E0", fontSize: "22px", lineHeight: 1 }}>·</span>
          </a>
          <div style={{ display: "flex", gap: "2px" }}>
            {[["Home", "/"], ["Properties", "/properties"], ["Search", "/search"], ["Blog", "/blog"]].map(([lbl, href]) => (
              <a key={lbl} href={href} style={{ padding: "7px 15px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: lbl === "Search" ? "#fff" : "rgba(255,255,255,0.55)", textDecoration: "none", background: lbl === "Search" ? "rgba(255,255,255,0.07)" : "transparent" }}>{lbl}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/login" style={{ padding: "8px 18px", borderRadius: "7px", border: "0.5px solid rgba(255,255,255,0.22)", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</a>
            <a href="/register" style={{ padding: "8px 22px", borderRadius: "7px", background: "#2BA8E0", color: "#000000", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>List Property</a>
          </div>
        </nav>

        {/* ── SEARCH SUMMARY BAND ── */}
        <div className="search-summary" style={{ marginTop: "68px", background: "#000000", padding: "14px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {loading ? (
              <div style={{ height: "14px", width: "200px", borderRadius: "4px", background: "rgba(245,242,236,0.1)", animation: "pulse 1.6s ease-in-out infinite" }} />
            ) : (
              <>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#2BA8E0" }}>{filtered.length}</span>
                <span style={{ fontSize: "13px", color: "rgba(245,242,236,0.6)" }}>properties found for</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8EAED" }}>{criteriaLabel}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* View mode toggle */}
            {(["grid", "list", "map"] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "capitalize", background: viewMode === mode ? "#2BA8E0" : "rgba(245,242,236,0.07)", border: viewMode === mode ? "none" : "1px solid rgba(245,242,236,0.12)", color: viewMode === mode ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                {mode === "grid" ? "⊞ Grid" : mode === "list" ? "≡ List" : "⊕ Map"}
              </button>
            ))}
            <button onClick={() => { if (!userId) { router.push("/login"); return; } setShowSaveModal(true); }} style={{ padding: "7px 16px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", background: "transparent", border: "1px solid rgba(201,168,76,0.35)", color: "#2BA8E0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              Save Search
            </button>
          </div>
        </div>

        {/* ── SEARCH BAR ROW ── */}
        <div className="search-bar-row" style={{ background: "#0B0D10", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 48px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", maxWidth: "1400px", margin: "0 auto", flexWrap: "wrap" }}>
            {/* City */}
            <div style={{ position: "relative", flex: "1 1 160px" }}>
              <select value={sbCity} onChange={e => setSbCity(e.target.value)} style={selStyle}>
                <option value="all" style={{ background: "#000000" }}>Any City</option>
                {["Hyderabad", "Mumbai", "Bengaluru"].map(c => <option key={c} value={c} style={{ background: "#000000" }}>{c}</option>)}
              </select>
              {chevron}
            </div>
            {/* Type */}
            <div style={{ position: "relative", flex: "1 1 160px" }}>
              <select value={sbType} onChange={e => setSbType(e.target.value)} style={selStyle}>
                <option value="all" style={{ background: "#000000" }}>Any Type</option>
                {["apartment", "villa", "penthouse", "plot", "office"].map(t => <option key={t} value={t} style={{ background: "#000000" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              {chevron}
            </div>
            {/* BHK */}
            <div style={{ position: "relative", flex: "1 1 130px" }}>
              <select value={sbBhk} onChange={e => setSbBhk(e.target.value)} style={selStyle}>
                <option value="all" style={{ background: "#000000" }}>Any BHK</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={String(n)} style={{ background: "#000000" }}>{n}{n === 5 ? "+" : ""} BHK</option>)}
              </select>
              {chevron}
            </div>
            {/* Budget */}
            <div style={{ position: "relative", flex: "1 1 160px" }}>
              <select value={sbBudget} onChange={e => setSbBudget(e.target.value)} style={selStyle}>
                <option value="all" style={{ background: "#000000" }}>Any Budget</option>
                {Object.keys(BUDGET_PRESETS).map(k => <option key={k} value={k} style={{ background: "#000000" }}>{k}</option>)}
              </select>
              {chevron}
            </div>
            {/* Search button */}
            <button onClick={applySearch} style={{ padding: "10px 28px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Search
            </button>
          </div>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div className="search-layout" style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 48px 80px", display: "flex", gap: "24px", alignItems: "flex-start" }}>

          {/* ══ SIDEBAR ══ */}
          <button className="mobile-filter-toggle" onClick={() => setFiltersOpen(prev => !prev)}>
            ☰ Filters
          </button>
          <aside className={filtersOpen ? "search-sidebar open" : "search-sidebar"} style={{ width: "272px", flexShrink: 0, position: "sticky", top: "88px", background: "#000000", borderRadius: "14px", overflow: "hidden", maxHeight: "calc(100vh - 108px)", overflowY: "auto" }}>
            <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(245,242,236,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,242,236,0.45)" }}>Filters</span>
              {hasFilters && <button onClick={clearFilters} style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2BA8E0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear All</button>}
            </div>

            {/* Active chips */}
            {chips.length > 0 && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,242,236,0.07)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {chips.map((c, i) => <Chip key={i} label={c.label} onRemove={c.remove} />)}
              </div>
            )}

            <div style={{ padding: "18px 16px" }}>

              {/* Listing type */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Type</SbLabel>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["all", "sale", "rent"] as const).map(t => (
                    <button key={t} onClick={() => { setListingType(t); setPage(1); }} style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: listingType === t ? "#2BA8E0" : "rgba(245,242,236,0.05)", border: listingType === t ? "none" : "1px solid rgba(245,242,236,0.1)", color: listingType === t ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>
                      {t === "all" ? "All" : t === "sale" ? "Buy" : "Rent"}
                    </button>
                  ))}
                </div>
              </div>

              {/* State */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>State</SbLabel>
                <div style={{ position: "relative" }}>
                  <select value={stateFilter} onChange={e => { handleStateChange(e.target.value); setPage(1); }} style={{ width: "100%", padding: "10px 32px 10px 12px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: stateFilter === "all" ? "rgba(245,242,236,0.4)" : "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}>
                    <option value="all" style={{ background: "#000000" }}>All States</option>
                    {Object.keys(STATE_CITY_MAP).sort().map(s => <option key={s} value={s} style={{ background: "#000000" }}>{s}</option>)}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* City */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>City</SbLabel>
                <div style={{ position: "relative" }}>
                  <select value={city} onChange={e => { handleCityChange(e.target.value); setPage(1); }} style={{ width: "100%", padding: "10px 32px 10px 12px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: city === "all" ? "rgba(245,242,236,0.4)" : "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}>
                    <option value="all" style={{ background: "#000000" }}>All Cities</option>
                    {(stateFilter !== "all" ? (STATE_CITY_MAP[stateFilter] || []) : Object.keys(CITY_STATE_MAP).sort()).map(c => <option key={c} value={c} style={{ background: "#000000" }}>{c}</option>)}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* Pincode */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Pincode</SbLabel>
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={e => handlePincodeChange(e.target.value)}
                  placeholder="Enter pincode..."
                  maxLength={6}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                />
                {pincodeInput.length >= 3 && PINCODE_MAP[pincodeInput.slice(0, 3)] && (
                  <div style={{ fontSize: "11px", color: "#2BA8E0", marginTop: "6px" }}>
                    📍 {PINCODE_MAP[pincodeInput.slice(0, 3)].city}, {PINCODE_MAP[pincodeInput.slice(0, 3)].state}
                  </div>
                )}
              </div>

              {/* Property type */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Property Type</SbLabel>
                {["apartment", "villa", "penthouse", "plot", "office"].map(t => (
                  <FilterCheck key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} checked={propTypes.has(t)} onChange={() => { setPropTypes(s => toggleSet(s, t)); setPage(1); }} />
                ))}
              </div>

              {/* Price */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Price Range (₹)</SbLabel>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  {[{ ph: "Min", val: minPrice, set: setMinPrice }, { ph: "Max", val: maxPrice, set: setMaxPrice }].map(({ ph, val, set }) => (
                    <input key={ph} type="number" placeholder={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }} style={{ flex: 1, padding: "9px 10px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {Object.entries(BUDGET_PRESETS).map(([label, [mn, mx]]) => (
                    <button key={label} onClick={() => { setMinPrice(mn ? String(mn) : ""); setMaxPrice(mx < 999999999 ? String(mx) : ""); setPage(1); }} style={{ padding: "3px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 600, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#2BA8E0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* BHK */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Bedrooms</SbLabel>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => { setBhk(s => toggleSet(s, n)); setPage(1); }} style={{ width: "40px", height: "36px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: bhk.has(n) ? "#2BA8E0" : "rgba(245,242,236,0.05)", border: bhk.has(n) ? "none" : "1px solid rgba(245,242,236,0.1)", color: bhk.has(n) ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{n === 5 ? "5+" : n}</button>
                  ))}
                </div>
              </div>

              {/* Possession status */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Possession Status</SbLabel>
                <div style={{ position: "relative" }}>
                  <select value={possession} onChange={e => { setPossession(e.target.value); setPage(1); }} style={{ width: "100%", padding: "10px 32px 10px 12px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: possession === "all" ? "rgba(245,242,236,0.4)" : "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}>
                    <option value="all" style={{ background: "#000000" }}>Any Status</option>
                    {POSSESSION_OPTIONS.map(o => <option key={o} value={o} style={{ background: "#000000" }}>{o}</option>)}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* Property age */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Property Age</SbLabel>
                <div style={{ position: "relative" }}>
                  <select value={propertyAge} onChange={e => { setPropertyAge(e.target.value); setPage(1); }} style={{ width: "100%", padding: "10px 32px 10px 12px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: propertyAge === "all" ? "rgba(245,242,236,0.4)" : "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}>
                    <option value="all" style={{ background: "#000000" }}>Any Age</option>
                    {AGE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#000000" }}>{o.label}</option>)}
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(245,242,236,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              {/* Floor number range */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Floor Number</SbLabel>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ ph: "Min", val: minFloor, set: setMinFloor }, { ph: "Max", val: maxFloor, set: setMaxFloor }].map(({ ph, val, set }) => (
                    <input key={ph} type="number" placeholder={ph} value={val} onChange={e => { set(e.target.value); setPage(1); }} style={{ flex: 1, padding: "9px 10px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                  ))}
                </div>
              </div>

              {/* Facing direction */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Facing</SbLabel>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {FACING_OPTIONS.map(f => (
                    <button key={f} onClick={() => { setFacingFilters(s => toggleSet(s, f)); setPage(1); }} style={{ padding: "6px 11px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: facingFilters.has(f) ? "#2BA8E0" : "rgba(245,242,236,0.05)", border: facingFilters.has(f) ? "none" : "1px solid rgba(245,242,236,0.1)", color: facingFilters.has(f) ? "#000000" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: "22px" }}>
                <SbLabel>Amenities</SbLabel>
                {AMENITIES.map(a => (
                  <FilterCheck key={a} label={a} checked={amenityFilters.has(a)} onChange={() => { setAmenityFilters(s => toggleSet(s, a)); setPage(1); }} />
                ))}
              </div>

              {/* Extra toggles */}
              <div style={{ marginBottom: "22px", paddingTop: "16px", borderTop: "1px solid rgba(245,242,236,0.07)" }}>
                <SbLabel>Preferences</SbLabel>
                <ToggleSwitch label="Furnished" checked={furnished === true} onChange={() => { setFurnished(v => v === true ? null : true); setPage(1); }} />
                <ToggleSwitch label="Unfurnished" checked={furnished === false} onChange={() => { setFurnished(v => v === false ? null : false); setPage(1); }} />
                <ToggleSwitch label="New Construction" checked={newConstruction} onChange={() => { setNewConstruction(v => !v); setPage(1); }} />
                <ToggleSwitch label="RERA Approved" checked={reraApproved} onChange={() => { setReraApproved(v => !v); setPage(1); }} />
              </div>

              {/* Saved searches */}
              {savedSearches.length > 0 && (
                <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(245,242,236,0.07)" }}>
                  <SbLabel>Saved Searches</SbLabel>
                  {savedSearches.map(s => (
                    <div key={s} style={{ fontSize: "12px", color: "rgba(245,242,236,0.6)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {hasFilters && (
                <button onClick={clearFilters} style={{ width: "100%", padding: "11px", marginTop: "8px", background: "transparent", border: "1.5px solid rgba(201,168,76,0.35)", borderRadius: "8px", color: "#2BA8E0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear All Filters</button>
              )}
            </div>
          </aside>

          {/* ══ RIGHT CONTENT ══ */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                {loading ? <div style={{ width: "180px", height: "18px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", animation: "pulse 1.6s ease-in-out infinite" }} /> : (
                  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 600, color: "#2BA8E0", marginRight: "6px" }}>{filtered.length}</span>
                    Properties Found{city !== "all" ? ` in ${city}` : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {/* Sort */}
                <div style={{ position: "relative" }}>
                  <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} style={{ padding: "9px 36px 9px 14px", background: "#0B0D10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", outline: "none" }}>
                    <option value="featured">Featured First</option>
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="popular">Most Popular</option>
                    <option value="area_desc">Largest Area</option>
                  </select>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                {/* Grid/list inline toggle */}
                <div style={{ display: "flex", background: "#161A1F", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                  {(["grid", "list"] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === m ? "rgba(201,168,76,0.12)" : "transparent", border: "none", cursor: "pointer", borderRight: m === "grid" ? "1px solid rgba(13,43,31,0.08)" : "none" }}>
                      {m === "grid" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "#2BA8E0" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "list" ? "#2BA8E0" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            {viewMode === "map" ? (
              /* Map placeholder */
              <div style={{ background: "#0B0D10", borderRadius: "14px", overflow: "hidden", position: "relative", height: "600px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(13,43,31,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,43,31,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                  <div style={{ fontSize: "48px", opacity: 0.3 }}>🗺️</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 400, color: "#E8EAED", opacity: 0.5 }}>Map View</div>
                  <div style={{ fontSize: "13px", color: "#6B7C72", textAlign: "center", maxWidth: "300px" }}>
                    Interactive map with property pins coming soon. Add a Google Maps API key to enable.
                  </div>
                </div>
                {/* Fake pins */}
                {paginated.slice(0, 6).map((p, i) => (
                  <div key={p.id} style={{ position: "absolute", top: `${20 + (i * 13) % 60}%`, left: `${15 + (i * 17) % 70}%`, transform: "translate(-50%, -100%)" }}>
                    <div style={{ background: "#000000", color: "#2BA8E0", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      {fmt(p.price, p.listing_type)}
                    </div>
                    <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #000000", margin: "0 auto" }} />
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(270px, 1fr))" : "1fr", gap: "16px" }}>
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
              </div>
            ) : paginated.length === 0 && !(textQuery.trim() && allProps.length > 0) ? (
              /* Empty state */
              <div style={{ textAlign: "center", padding: "80px 24px", background: "#161A1F", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: "52px", marginBottom: "16px", opacity: 0.25 }}>⌂</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#E8EAED", marginBottom: "10px" }}>No Properties Found</h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", marginBottom: "8px" }}>Try adjusting your filters for more results.</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginTop: "20px" }}>
                  {["Try any city", "Remove BHK filter", "Expand price range", "Clear all filters"].map(s => (
                    <span key={s} onClick={clearFilters} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.07)", borderRadius: "100px", fontSize: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", border: "1px solid rgba(255,255,255,0.07)" }}>{s}</span>
                  ))}
                </div>
                <button onClick={clearFilters} style={{ marginTop: "24px", padding: "12px 28px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear All Filters</button>
              </div>
            ) : (() => {
              const fallback = paginated.length === 0 && textQuery.trim() && allProps.length > 0;
              const displayList = fallback ? allProps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : paginated;
              return (
                <>
                  {fallback && (
                    <div style={{ marginBottom: "16px", padding: "12px 18px", background: "rgba(43,168,224,0.08)", border: "1px solid rgba(43,168,224,0.2)", borderRadius: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                      Showing all properties — no exact match found for <span style={{ color: "#2BA8E0", fontWeight: 600 }}>{textQuery}</span>
                    </div>
                  )}
                  <div className="search-results-grid" style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(270px, 1fr))" : "1fr", gap: "16px" }}>
                    {viewMode === "grid"
                      ? displayList.map(p => <PropertyCard key={p.id} p={p} comparing={compareIds.has(p.id)} onCompare={() => { if (compareIds.has(p.id)) { setCompareIds(s => { const n = new Set(s); n.delete(p.id); return n; }); } else if (compareIds.size < 3) { setCompareIds(s => new Set([...s, p.id])); } }} onSave={() => setSavedIds(s => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} saved={savedIds.has(p.id)} />)
                      : displayList.map(p => <ListRow key={p.id} p={p} comparing={compareIds.has(p.id)} onCompare={() => { if (compareIds.has(p.id)) { setCompareIds(s => { const n = new Set(s); n.delete(p.id); return n; }); } else if (compareIds.size < 3) { setCompareIds(s => new Set([...s, p.id])); } }} onSave={() => setSavedIds(s => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} saved={savedIds.has(p.id)} />)
                    }
                  </div>
                </>
              );
            })()}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "40px" }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: page === 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: page === 1 ? "rgba(255,255,255,0.3)" : "#E8EAED", cursor: page === 1 ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : (page <= 4 ? i + 1 : page - 3 + i);
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)} style={{ width: "38px", height: "38px", borderRadius: "8px", fontSize: "13px", fontWeight: page === p ? 700 : 400, background: page === p ? "#2BA8E0" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: page === p ? "#000000" : "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{p}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, background: page === totalPages ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: page === totalPages ? "rgba(255,255,255,0.3)" : "#E8EAED", cursor: page === totalPages ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>
              </div>
            )}
          </div>
        </div>

        {/* ── COMPARE BAR ── */}
        {compareIds.size >= 2 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "#000000", borderTop: "1px solid rgba(201,168,76,0.3)", padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "slideUp 0.25s ease-out", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "13px", color: "rgba(245,242,236,0.6)" }}>Comparing</span>
            <div style={{ display: "flex", gap: "10px" }}>
              {[...compareIds].map(id => {
                const p = allProps.find(x => x.id === id);
                return p ? (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(245,242,236,0.06)", borderRadius: "8px", border: "1px solid rgba(245,242,236,0.12)" }}>
                    <span style={{ fontSize: "12px", color: "#E8EAED", maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
                    <span onClick={() => setCompareIds(s => { const n = new Set(s); n.delete(id); return n; })} style={{ color: "rgba(245,242,236,0.4)", cursor: "pointer", fontSize: "14px", fontWeight: 700, lineHeight: 1 }}>×</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setCompareIds(new Set())} style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(245,242,236,0.2)", borderRadius: "8px", color: "rgba(245,242,236,0.6)", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
            <button style={{ padding: "9px 24px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Compare {compareIds.size} Properties →</button>
          </div>
        </div>
        )}

        {/* ── SAVE SEARCH MODAL ── */}
        {showSaveModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
            <div className="search-save-modal" style={{ background: "#161A1F", borderRadius: "16px", padding: "36px", width: "420px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.07)" }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 500, color: "#E8EAED", marginBottom: "8px" }}>Save This Search</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "24px" }}>Get notified when new properties match your criteria.</p>
              <input
                placeholder="Search name (e.g. 3BHK in Jubilee Hills)"
                value={saveSearchName}
                onChange={e => setSaveSearchName(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", color: "#FFFFFF", fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: "16px" }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                <button onClick={() => { void saveSearch(); }} style={{ flex: 1, padding: "12px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Save Search</button>
              </div>
            </div>
          </div>
        )}

        {searchSavedToast && (
          <div style={{ position: "fixed", top: "88px", right: "24px", zIndex: 500, padding: "12px 20px", borderRadius: "10px", background: "#161A1F", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Search saved to your dashboard
          </div>
        )}

      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#000000" }} />}>
      <SearchPageInner />
    </Suspense>
  );
}
