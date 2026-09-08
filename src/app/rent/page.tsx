"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";
import ResultsGate from "@/components/property/ResultsGate";
import { useLiveStats } from "@/lib/liveStats";

// ── Types ─────────────────────────────────────────────────────
type Property = {
  id: string;
  slug: string;
  title: string;
  price: number;
  area_sqft: number;
  bedrooms?: number;
  bathrooms?: number;
  city: string;
  neighbourhood?: string;
  type: string;
  listing_type: string;
  images?: string[];
  is_featured?: boolean;
  is_furnished?: boolean;
};

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count.
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];

// ── Mapper: property_listings row → Property shape ────────────
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function mapListingToProperty(row: Record<string, unknown>): Property {
  const photos = Array.isArray(row.photo_urls) ? (row.photo_urls as string[]).filter(Boolean) : [];
  return {
    id:            String(row.id ?? ""),
    slug:          typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:         typeof row.title === "string" ? row.title : "Untitled Property",
    price:         num(row.price) ?? 0,
    area_sqft:     num(row.built_up_area) ?? 0,
    bedrooms:      num(row.bedrooms) ?? undefined,
    bathrooms:     num(row.bathrooms) ?? undefined,
    city:          typeof row.city === "string" ? row.city : "",
    neighbourhood: typeof row.locality === "string" ? row.locality : undefined,
    type:          typeof row.property_category === "string" ? row.property_category : "",
    listing_type:  typeof row.listing_type === "string" ? row.listing_type : "rent",
    images:        photos.length > 0 ? photos : undefined,
    is_featured:   Boolean(row.is_featured),
    is_furnished:  row.furnishing != null && row.furnishing !== "unfurnished",
  };
}

// ── Helpers ───────────────────────────────────────────────────
function fmtRent(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L/mo`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}K/mo`;
  return `₹${v.toLocaleString("en-IN")}/mo`;
}

function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#10C4C3", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
    </div>
  );
}

// ── Property Card ─────────────────────────────────────────────
function RentalCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  const img = p.images?.[0] ?? `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: "#182B3F", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: hover ? "0 20px 52px rgba(16,196,195,0.1)" : "0 2px 8px rgba(0,0,0,0.3)", transform: hover ? "translateY(-5px)" : "none", transition: "all 0.25s" }}
    >
      <div style={{ position: "relative", height: "215px", overflow: "hidden" }}>
        <img src={optimizedImageUrl(img, 600)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.5) 0%, transparent 55%)" }} />
        <span style={{ position: "absolute", top: "12px", left: "12px", padding: "4px 11px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(45,106,79,0.9)", color: "#0A1526" }}>For Rent</span>
        {p.is_furnished && (
          <span style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(13,43,31,0.85)", color: "#10C4C3", border: "1px solid rgba(201,168,76,0.3)", backdropFilter: "blur(8px)" }}>Furnished</span>
        )}
        <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
          <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 600, color: "#10C4C3" }}>{fmtRent(p.price)}</span>
        </div>
      </div>
      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.3, marginBottom: "6px" }}>{p.title}</h3>
        <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "rgba(255,255,255,0.45)", marginBottom: "14px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}
        </p>
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
          {[{ v: p.bedrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Rooms" : "Beds" }, { v: p.bathrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Wash" : "Baths" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map((s, i) => s.v != null && (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>{s.v}</span>
              <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</span>
            </div>
          ))}
        </div>
        <a href={`/property/${p.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "14px", padding: "10px", minHeight: "44px", boxSizing: "border-box", background: "#020C1C", borderRadius: "8px", color: "#10C4C3", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
          View Details →
        </a>
      </div>
    </div>
  );
}

// ── Footer data ───────────────────────────────────────────────
const FOOTER_COLS = [
  { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
  { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
  { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"],["Safety Guide","/safety-guide"]] },
  { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"],["Agent Terms","/agent-terms"],["Grievance Redressal","/grievance-redressal"]] },
];

// ── Rental Zones ──────────────────────────────────────────────
const ZONES = [
  { name: "Jubilee Hills", city: "Hyderabad", avgRent: "₹42K – 90K/mo", query: "hyderabad" },
  { name: "Kokapet",       city: "Hyderabad", avgRent: "₹40K – 70K/mo", query: "hyderabad" },
  { name: "Gachibowli",   city: "Hyderabad", avgRent: "₹28K – 55K/mo", query: "hyderabad" },
  { name: "Banjara Hills", city: "Hyderabad", avgRent: "₹55K – 1.2L/mo", query: "hyderabad" },
  { name: "Powai",         city: "Mumbai",    avgRent: "₹65K – 1.8L/mo", query: "mumbai" },
  { name: "Whitefield",    city: "Bengaluru", avgRent: "₹24K – 50K/mo", query: "bengaluru" },
];

// ── Main page ─────────────────────────────────────────────────
export default function RentPage() {
  const liveStats = useLiveStats();
  const [properties, setProperties] = useState<Property[]>([]);
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [bhkFilter, setBhkFilter] = useState("All");
  const [budgetFilter, setBudgetFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: listingData }, { data: seedData }] = await Promise.all([
        supabase
          .from("property_listings")
          .select("*")
          .eq("listing_type", "rent")
          .eq("status", "active"),
        supabase
          .from("properties")
          .select("*")
          .eq("listing_type", "rent")
          .eq("status", "active")
          .eq("approval_status", "approved"),
      ]);
      const mapped = (listingData ?? []).map((row: Record<string, unknown>) => mapListingToProperty(row));
      setProperties([...mapped, ...((seedData ?? []) as Property[])]);
    }
    void load();
  }, []);

  const filtered = properties.filter(p => {
    if (cityFilter !== "All" && !p.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    if (typeFilter !== "All" && p.type !== typeFilter.toLowerCase()) return false;
    if (bhkFilter !== "All") {
      const bhk = parseInt(bhkFilter);
      if (!isNaN(bhk) && p.bedrooms !== bhk) return false;
    }
    if (budgetFilter === "under30" && p.price >= 30000) return false;
    if (budgetFilter === "30-60" && (p.price < 30000 || p.price >= 60000)) return false;
    if (budgetFilter === "60-150" && (p.price < 60000 || p.price >= 150000)) return false;
    if (budgetFilter === "above150" && p.price < 150000) return false;
    return true;
  });

  const SEL_STYLE = { padding: "9px 32px 9px 14px", minHeight: "44px", boxSizing: "border-box" as const, background: "#0A1526", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "9px", fontSize: "12px", fontWeight: 600 as const, fontFamily: "var(--font-body-new)", cursor: "pointer" as const, outline: "none", appearance: "none" as const, color: "#FFFFFF" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23AEB4BC' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat" as const, backgroundPosition: "right 12px center" as const };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .rn-hero { padding: 80px 16px 48px !important; }
          .rn-guide { padding: 48px 16px !important; }
          .rn-guide-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .rn-filters { padding: 0 16px !important; flex-wrap: wrap !important; gap: 10px !important; }
          .rn-filters select { width: 100% !important; }
          .rn-listings { padding: 24px 16px 48px !important; }
          .rn-grid { grid-template-columns: 1fr !important; }
          .rn-benefits { padding: 48px 16px !important; }
          .rn-benefits-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .rn-zones { padding: 48px 16px !important; }
          .rn-zones-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .rn-cta { padding: 56px 16px !important; }
          .rn-footer { padding: 48px 16px 0 !important; }
          .rn-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .rn-guide-grid { grid-template-columns: 1fr !important; }
          .rn-benefits-grid { grid-template-columns: 1fr !important; }
          .rn-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="rn-hero" style={{ paddingTop: "64px", background: "#020C1C", minHeight: "520px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 130%, rgba(201,168,76,0.12) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", maskImage: "linear-gradient(to left, rgba(0,0,0,0.4), transparent)" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "72px 48px", textAlign: "center" }}>
            <div style={{ animation: "fadeUp 0.5s ease-out both" }}>
              <Eyebrow label="Premium Rentals" />
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(44px, 6.5vw, 80px)", fontWeight: 300, color: "#FFFFFF", lineHeight: 1.08, marginBottom: "16px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Find Your Perfect Rental<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Home</em>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", marginBottom: "48px", animation: "fadeUp 0.5s 0.18s ease-out both" }}>
              Zero brokerage, flexible tenures — premium rentals across India's finest neighbourhoods.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "48px", paddingTop: "28px", borderTop: "1px solid rgba(245,242,236,0.06)", animation: "fadeUp 0.5s 0.26s ease-out both" }}>
              {[[String(liveStats.listingsByType.rent), "Rentals"], ["Zero", "Brokerage"], ["Digital", "Agreements"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "var(--font-support-new)", fontSize: "30px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RENTING GUIDE ────────────────────────────────────── */}
        <section className="rn-guide" style={{ background: "#020C1C", padding: "72px 48px" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <Eyebrow label="How To Rent" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                Renting Made<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Effortless</em>
              </h2>
            </div>
            <div className="rn-guide-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "22px" }}>
              {[
                { n: "01", icon: "🔍", title: "Browse Listings", desc: "Filter by city, BHK, and budget to find your ideal rental, complete with photos and floor plans." },
                { n: "02", icon: "📅", title: "Schedule Viewing", desc: "Book a free site visit at your convenience. Our agents accompany you and answer all your questions on-site." },
                { n: "03", icon: "🤝", title: "Negotiate & Agree", desc: "We help you negotiate rent, security deposit, and maintenance charges to get the best deal." },
                { n: "04", icon: "🏡", title: "Move In", desc: "Digital rental agreement, key handover, and post-move-in support — all handled by our team for a smooth transition." },
              ].map(step => (
                <div key={step.n} style={{ background: "#182B3F", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "30px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "16px", right: "18px", fontFamily: "var(--font-support-new)", fontSize: "48px", fontWeight: 700, color: "rgba(255,255,255,0.04)", lineHeight: 1 }}>{step.n}</div>
                  <div style={{ fontSize: "28px", marginBottom: "14px" }}>{step.icon}</div>
                  <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "10px" }}>{step.title}</h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.75 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FILTERS ──────────────────────────────────────────── */}
        <div className="rn-filters" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
            <Eyebrow label="Browse Rentals" />
          </div>
          <div style={{ background: "#111F33", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px 22px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ ...SEL_STYLE, color: cityFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0A1526" }}>All Cities</option>
              {["Hyderabad", "Mumbai", "Bengaluru", "Gurugram", "Noida", "Chennai", "Pune"].map(c => <option key={c} value={c} style={{ background: "#0A1526" }}>{c}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...SEL_STYLE, color: typeFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0A1526" }}>All Types</option>
              {["Apartment", "Villa", "Studio"].map(t => <option key={t} value={t} style={{ background: "#0A1526" }}>{t}</option>)}
            </select>
            <select value={bhkFilter} onChange={e => setBhkFilter(e.target.value)} style={{ ...SEL_STYLE, color: bhkFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0A1526" }}>All BHK</option>
              {["1 BHK", "2 BHK", "3 BHK", "4 BHK"].map((b, i) => <option key={b} value={String(i + 1)} style={{ background: "#0A1526" }}>{b}</option>)}
            </select>
            <select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value)} style={{ ...SEL_STYLE, color: budgetFilter === "all" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="all" style={{ background: "#0A1526" }}>Any Budget</option>
              <option value="under30" style={{ background: "#0A1526" }}>Under ₹30K/mo</option>
              <option value="30-60" style={{ background: "#0A1526" }}>₹30K – 60K/mo</option>
              <option value="60-150" style={{ background: "#0A1526" }}>₹60K – 1.5L/mo</option>
              <option value="above150" style={{ background: "#0A1526" }}>Above ₹1.5L/mo</option>
            </select>
            <button onClick={() => { setCityFilter("All"); setTypeFilter("All"); setBhkFilter("All"); setBudgetFilter("all"); }} style={{ padding: "9px 18px", minHeight: "44px", boxSizing: "border-box", borderRadius: "9px", border: "1.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Reset</button>
            <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>{filtered.length} rentals</span>
          </div>
        </div>

        {/* ── LISTINGS GRID ────────────────────────────────────── */}
        <section className="rn-listings" style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 48px 72px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#182B3F", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.07)" }}>
              {properties.length === 0 ? (
                <>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.08)", border: "1.5px solid rgba(16,196,195,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", color: "#FFFFFF", marginBottom: "10px" }}>No rentals found</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>We don't have any rental listings at the moment. Check back soon or explore properties for sale.</p>
                  <a href="/buy" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 24px", background: "#0A1526", borderRadius: "8px", color: "#10C4C3", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Browse Sales →</a>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", color: "#FFFFFF", marginBottom: "10px" }}>No rentals match your filters</p>
                  <button onClick={() => { setCityFilter("All"); setTypeFilter("All"); setBhkFilter("All"); setBudgetFilter("all"); }} style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear all filters →</button>
                </>
              )}
            </div>
          ) : (
            <ResultsGate>
              <div className="rn-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px" }}>
                {filtered.map(p => <RentalCard key={p.id} p={p} />)}
              </div>
            </ResultsGate>
          )}
        </section>

        {/* ── TENANT BENEFITS ──────────────────────────────────── */}
        <section className="rn-benefits" style={{ background: "#0A1526", padding: "72px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "44px" }}>
              <Eyebrow label="Tenant Advantages" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#FFFFFF" }}>
                Why Rent Through<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Nilay 360?</em>
              </h2>
            </div>
            <div className="rn-benefits-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
              {[
                { icon: "✦", color: "#059669", bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.12)", title: "Zero Brokerage", desc: "We charge landlords, not tenants. You pay zero brokerage and no hidden platform fees — ever.", pts: ["No tenant commission", "No processing fee", "Transparent costs"] },
                { icon: "🛡", color: "#10C4C3", bg: "rgba(201,168,76,0.06)", border: "rgba(201,168,76,0.18)", title: "Dedicated Support", desc: "Our team helps you review rental terms and prepare your agreement before you sign.", pts: ["Rental agreement review", "Move-in support", "Ongoing assistance"] },
                { icon: "📆", color: "#3B82F6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", title: "Flexible Tenure", desc: "Short-term or long-term — find 3-month, 6-month, or 11-month leases with flexible lock-in clauses.", pts: ["3–11 month leases", "Flexible lock-in terms", "Early exit options"] },
                { icon: "📄", color: "#8B5CF6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)", title: "Digital Agreements", desc: "Legally valid eStamped rental agreements signed digitally. No trips to stamp paper vendors.", pts: ["Aadhaar eSign", "eStamped agreement", "Instant delivery"] },
              ].map(b => (
                <div key={b.title} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: "18px", padding: "28px 24px" }}>
                  <div style={{ fontSize: "26px", marginBottom: "14px", color: b.color, fontWeight: 700 }}>{b.icon}</div>
                  <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "10px" }}>{b.title}</h3>
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: "16px" }}>{b.desc}</p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {b.pts.map(pt => (
                      <li key={pt} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11.5px", fontWeight: 600, color: b.color }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POPULAR RENTAL ZONES ─────────────────────────────── */}
        <section className="rn-zones" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="Top Locations" />
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#FFFFFF" }}>
              Popular Rental<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Neighbourhoods</em>
            </h2>
          </div>
          <div className="rn-zones-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {ZONES.map(zone => {
              const [hover, setHover] = useState(false);
              return (
                <a key={zone.name} href={`/search?city=${zone.query}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px", background: hover ? "#111F33" : "#182B3F", border: hover ? "1.5px solid rgba(16,196,195,0.2)" : "1.5px solid rgba(255,255,255,0.07)", borderRadius: "14px", textDecoration: "none", transition: "all 0.22s", boxShadow: hover ? "0 16px 44px rgba(16,196,195,0.08)" : "0 2px 8px rgba(0,0,0,0.3)", transform: hover ? "translateY(-3px)" : "none" }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "3px", transition: "color 0.22s" }}>{zone.name}</p>
                    <p style={{ fontSize: "11px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", transition: "color 0.22s" }}>{zone.city}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "var(--font-support-new)", fontSize: "14px", fontWeight: 600, color: "#10C4C3", marginBottom: "3px" }}>{zone.avgRent}</p>
                    <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", transition: "color 0.22s" }}>Avg Rent</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hover ? "#10C4C3" : "rgba(255,255,255,0.25)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "14px", flexShrink: 0, transition: "stroke 0.22s" }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="rn-cta" style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
            <Eyebrow label="Move In Today" />
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#FFFFFF", lineHeight: 1.15, marginBottom: "14px" }}>
              Ready to<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Move?</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.45)", lineHeight: 1.75, marginBottom: "36px" }}>
              Browse {liveStats.listingsByType.rent} rental {liveStats.listingsByType.rent === 1 ? "property" : "properties"} with zero brokerage
              {liveStats.cityNames.length === 1 ? ` in ${liveStats.cityNames[0]}` : ` across India's top cities`}. Your next home is waiting.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/search" style={{ padding: "14px 36px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Browse Rentals
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
              <a href="/contact" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.8)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Talk to an Agent
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="rn-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div className="rn-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "40px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "260px", marginBottom: "20px" }}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { s: "IN", href: "https://www.instagram.com/nilay360_/" },
                    { s: "LI", href: "https://linkedin.com/company/nilay360" },
                    { s: "YT", href: "https://www.youtube.com/@nilay360.digital" },
                  ].map(({ s, href }) => (
                    <a key={s} href={href} target="_blank" rel="noopener noreferrer" aria-label={s} style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 700, textDecoration: "none" }}>{s}</a>
                  ))}
                </div>
              </div>
              {FOOTER_COLS.map(col => (
                <div key={col.heading}>
                  <h4 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.28)", textTransform: "uppercase", marginBottom: "18px" }}>{col.heading}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {col.links.map(([l, h]) => (
                      <a key={l} href={h} style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", flexWrap: "wrap", gap: "12px" }}>
              <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.2)" }}>© 2025 Nilay 360. All rights reserved.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
