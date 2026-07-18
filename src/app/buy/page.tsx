"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";

// ── Types ─────────────────────────────────────────────────────
type Property = {
  id: string;
  slug: string;
  title: string;
  price: number;
  price_per_sqft?: number;
  area_sqft: number;
  bedrooms?: number;
  bathrooms?: number;
  city: string;
  neighbourhood?: string;
  type: string;
  listing_type: string;
  images?: string[];
  is_featured?: boolean;
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
    id:           String(row.id ?? ""),
    slug:         typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:        typeof row.title === "string" ? row.title : "Untitled Property",
    price:        num(row.price) ?? 0,
    area_sqft:    num(row.built_up_area) ?? 0,
    bedrooms:     num(row.bedrooms) ?? undefined,
    bathrooms:    num(row.bathrooms) ?? undefined,
    city:         typeof row.city === "string" ? row.city : "",
    neighbourhood: typeof row.locality === "string" ? row.locality : undefined,
    type:         typeof row.property_category === "string" ? row.property_category : "",
    listing_type: typeof row.listing_type === "string" ? row.listing_type : "sale",
    images:       photos.length > 0 ? photos : undefined,
    is_featured:  Boolean(row.is_featured),
  };
}

// ── Helpers ───────────────────────────────────────────────────
function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function calcEMI(p: number, r: number, n: number): number {
  const mr = r / 100 / 12;
  const mn = n * 12;
  if (mr === 0) return p / mn;
  return (p * mr * Math.pow(1 + mr, mn)) / (Math.pow(1 + mr, mn) - 1);
}

function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
    </div>
  );
}

// ── Property Card ─────────────────────────────────────────────
function PropertyCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  const img = p.images?.[0] ?? `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: "#161A1F", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: hover ? "0 20px 52px rgba(43,168,224,0.1)" : "0 2px 8px rgba(0,0,0,0.3)", transform: hover ? "translateY(-5px)" : "none", transition: "all 0.25s" }}
    >
      <div style={{ position: "relative", height: "215px", overflow: "hidden" }}>
        <img src={optimizedImageUrl(img, 600)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.5) 0%, transparent 55%)" }} />
        <span style={{ position: "absolute", top: "12px", left: "12px", padding: "4px 11px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(201,168,76,0.9)", color: "#000000" }}>For Sale</span>
        {p.is_featured && (
          <span style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(13,43,31,0.85)", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.3)", backdropFilter: "blur(8px)" }}>Premium</span>
        )}
        <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#2BA8E0" }}>{fmtINR(p.price)}</span>
          {p.price_per_sqft && <span style={{ fontSize: "10px", color: "rgba(245,242,236,0.6)", marginLeft: "7px" }}>₹{p.price_per_sqft.toLocaleString("en-IN")}/sqft</span>}
        </div>
      </div>
      <div style={{ padding: "18px 20px 20px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 600, color: "#E8EAED", lineHeight: 1.3, marginBottom: "6px" }}>{p.title}</h3>
        <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "rgba(255,255,255,0.45)", marginBottom: "14px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}
        </p>
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px", gap: "0" }}>
          {[{ v: p.bedrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Rooms" : "Beds" }, { v: p.bathrooms, l: COMMERCIAL_CATEGORIES.includes(p.type) ? "Wash" : "Baths" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map((s, i) => s.v != null && (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#E8EAED" }}>{s.v}</span>
              <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</span>
            </div>
          ))}
        </div>
        <a href={`/property/${p.slug}`} style={{ display: "block", marginTop: "14px", padding: "10px", background: "#000000", borderRadius: "8px", color: "#2BA8E0", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
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
  { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]] },
  { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"]] },
];

// ── Main page ─────────────────────────────────────────────────
export default function BuyPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [bhkFilter, setBhkFilter] = useState("All");
  const [budgetFilter, setBudgetFilter] = useState("all");

  // EMI calculator state
  const [loanAmt, setLoanAmt] = useState(8000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const emi = calcEMI(loanAmt, rate, tenure);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: listingData }, { data: seedData }] = await Promise.all([
        supabase
          .from("property_listings")
          .select("*")
          .eq("listing_type", "sale")
          .eq("status", "active"),
        supabase
          .from("properties")
          .select("*")
          .eq("listing_type", "sale")
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
    if (budgetFilter === "under1" && p.price >= 1_00_00_000) return false;
    if (budgetFilter === "1-3" && (p.price < 1_00_00_000 || p.price >= 3_00_00_000)) return false;
    if (budgetFilter === "3-10" && (p.price < 3_00_00_000 || p.price >= 10_00_00_000)) return false;
    if (budgetFilter === "above10" && p.price < 10_00_00_000) return false;
    return true;
  });

  const SEL_STYLE = { padding: "9px 32px 9px 14px", background: "#0B0D10", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "9px", fontSize: "12px", fontWeight: 600 as const, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" as const, outline: "none", appearance: "none" as const, color: "#FFFFFF" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23AEB4BC' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat" as const, backgroundPosition: "right 12px center" as const };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #2BA8E0; border: 2.5px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.18); cursor: pointer; }
        @media (max-width: 768px) {
          .buy-hero { padding: 80px 16px 48px !important; }
          .buy-steps { padding: 48px 16px !important; }
          .buy-steps-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .buy-filters { padding: 24px 16px !important; flex-wrap: wrap !important; gap: 10px !important; }
          .buy-filters select, .buy-filters input { width: 100% !important; }
          .buy-grid { grid-template-columns: 1fr !important; padding: 0 16px !important; }
          .buy-emi { padding: 48px 16px !important; }
          .buy-why { padding: 48px 16px !important; }
          .buy-why-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .buy-cta { padding: 48px 16px !important; }
          .buy-footer { padding: 48px 16px 0 !important; }
          .buy-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .buy-why-grid { grid-template-columns: 1fr !important; }
          .buy-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000" }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="buy-hero" style={{ paddingTop: "64px", background: "#000000", minHeight: "520px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 130%, rgba(201,168,76,0.12) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", maskImage: "linear-gradient(to left, rgba(0,0,0,0.4), transparent)" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "72px 48px", textAlign: "center" }}>
            <div style={{ animation: "fadeUp 0.5s ease-out both" }}>
              <Eyebrow label="Verified Listings" />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(44px, 6.5vw, 80px)", fontWeight: 300, color: "#E8EAED", lineHeight: 1.08, marginBottom: "16px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Buy Your Dream Property<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>in India's Finest Addresses</em>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", marginBottom: "48px", animation: "fadeUp 0.5s 0.18s ease-out both" }}>
              Curated for-sale listings with full legal due diligence, RERA verification, and expert guidance.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "48px", paddingTop: "28px", borderTop: "1px solid rgba(245,242,236,0.06)", animation: "fadeUp 0.5s 0.26s ease-out both" }}>
              {[["2,400+", "For Sale"], ["14", "Cities"], ["RERA", "Verified"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 600, color: "#2BA8E0" }}>{v}</p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BUYING PROCESS ───────────────────────────────────── */}
        <section className="buy-steps" style={{ background: "#000000", padding: "72px 48px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="How It Works" />
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 300, color: "#E8EAED", lineHeight: 1.15 }}>
                Your Path to<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Home Ownership</em>
              </h2>
            </div>
            <div style={{ position: "relative" }}>
              {/* Connecting line */}
              <div style={{ position: "absolute", top: "30px", left: "calc(10% + 20px)", right: "calc(10% + 20px)", height: "1px", background: "linear-gradient(to right, transparent, rgba(201,168,76,0.3) 15%, rgba(201,168,76,0.3) 85%, transparent)", pointerEvents: "none" }} />
              <div className="buy-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "20px" }}>
                {[
                  { n: "01", title: "Define Budget", desc: "Assess your finances, explore home loan eligibility, and set a realistic budget with our free advisors." },
                  { n: "02", title: "Shortlist Properties", desc: "Filter by city, type, BHK, and budget to create a curated shortlist tailored to your needs." },
                  { n: "03", title: "Site Visit & Verification", desc: "Schedule free site visits. Our team accompanies you and verifies all RERA and structural details." },
                  { n: "04", title: "Legal Due Diligence", desc: "Expert lawyers review title deeds, encumbrance certificate, OC/CC, and all ownership documents." },
                  { n: "05", title: "Registration & Possession", desc: "We handle stamp duty, registration, and coordinate builder handover for a seamless move-in." },
                ].map((step, i) => (
                  <div key={step.n} style={{ position: "relative", textAlign: "center", padding: "0 10px" }}>
                    <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#2BA8E0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 0 0 6px rgba(201,168,76,0.12)", position: "relative", zIndex: 1 }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 700, color: "#000000" }}>{step.n}</span>
                    </div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 600, color: "#E8EAED", marginBottom: "8px", lineHeight: 1.3 }}>{step.title}</h3>
                    <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.38)", lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FILTERS ──────────────────────────────────────────── */}
        <div className="buy-filters" style={{ maxWidth: "1280px", margin: "0 auto", padding: "52px 48px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
            <Eyebrow label="Browse Properties" />
          </div>
          <div style={{ background: "#121519", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px 22px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ ...SEL_STYLE, color: cityFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0B0D10" }}>All Cities</option>
              {["Hyderabad", "Mumbai", "Bengaluru", "Gurugram", "Noida", "Chennai", "Pune"].map(c => <option key={c} value={c} style={{ background: "#0B0D10" }}>{c}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...SEL_STYLE, color: typeFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0B0D10" }}>All Types</option>
              {["Apartment", "Villa", "Penthouse", "Plot", "Office"].map(t => <option key={t} value={t} style={{ background: "#0B0D10" }}>{t}</option>)}
            </select>
            <select value={bhkFilter} onChange={e => setBhkFilter(e.target.value)} style={{ ...SEL_STYLE, color: bhkFilter === "All" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="All" style={{ background: "#0B0D10" }}>All BHK</option>
              {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"].map((b, i) => <option key={b} value={String(i + 1)} style={{ background: "#0B0D10" }}>{b}</option>)}
            </select>
            <select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value)} style={{ ...SEL_STYLE, color: budgetFilter === "all" ? "rgba(255,255,255,0.4)" : "#FFFFFF" }}>
              <option value="all" style={{ background: "#0B0D10" }}>Any Budget</option>
              <option value="under1" style={{ background: "#0B0D10" }}>Under ₹1 Cr</option>
              <option value="1-3" style={{ background: "#0B0D10" }}>₹1 – 3 Cr</option>
              <option value="3-10" style={{ background: "#0B0D10" }}>₹3 – 10 Cr</option>
              <option value="above10" style={{ background: "#0B0D10" }}>Above ₹10 Cr</option>
            </select>
            <button onClick={() => { setCityFilter("All"); setTypeFilter("All"); setBhkFilter("All"); setBudgetFilter("all"); }} style={{ padding: "9px 18px", borderRadius: "9px", border: "1.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Reset</button>
            <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>{filtered.length} properties</span>
          </div>
        </div>

        {/* ── LISTINGS GRID ────────────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "28px 48px 72px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#161A1F", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.07)" }}>
              {properties.length === 0 ? (
                <>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(43,168,224,0.08)", border: "1.5px solid rgba(43,168,224,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#E8EAED", marginBottom: "10px" }}>No properties found</p>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>We don't have any sale listings at the moment. Check back soon or explore our rental options.</p>
                  <a href="/rent" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 24px", background: "#0B0D10", borderRadius: "8px", color: "#2BA8E0", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Browse Rentals →</a>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#E8EAED", marginBottom: "10px" }}>No properties match your filters</p>
                  <button onClick={() => { setCityFilter("All"); setTypeFilter("All"); setBhkFilter("All"); setBudgetFilter("all"); }} style={{ fontSize: "13px", fontWeight: 600, color: "#2BA8E0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear all filters →</button>
                </>
              )}
            </div>
          ) : (
            <div className="buy-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px" }}>
              {filtered.map(p => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </section>

        {/* ── MORTGAGE CALCULATOR TEASER ───────────────────────── */}
        <section className="buy-emi" style={{ background: "#0B0D10", padding: "72px 48px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "52px", alignItems: "center" }}>
            {/* Left text */}
            <div>
              <Eyebrow label="EMI Calculator" />
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 400, color: "#E8EAED", lineHeight: 1.2, marginBottom: "16px" }}>
                Estimate Your<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Monthly EMI</em>
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: "28px" }}>
                Use our quick EMI estimator to understand your monthly outgo before you commit. Adjust loan amount, interest rate, and tenure to see real-time results.
              </p>
              <a href="/calculator" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 28px", background: "#2BA8E0", borderRadius: "9px", color: "#000000", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                Use Full Calculator
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
            {/* Right dark card */}
            <div style={{ background: "#000000", borderRadius: "20px", padding: "36px 32px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ marginBottom: "22px" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: "8px" }}>
                    <span>Loan Amount</span><span style={{ color: "#2BA8E0" }}>{fmtINR(loanAmt)}</span>
                  </label>
                  <input type="range" min={1000000} max={50000000} step={500000} value={loanAmt} onChange={e => setLoanAmt(Number(e.target.value))}
                    style={{ width: "100%", background: `linear-gradient(to right, #2BA8E0 ${((loanAmt - 1000000) / 49000000) * 100}%, rgba(245,242,236,0.12) ${((loanAmt - 1000000) / 49000000) * 100}%)` }} />
                </div>
                <div style={{ marginBottom: "22px" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: "8px" }}>
                    <span>Interest Rate</span><span style={{ color: "#2BA8E0" }}>{rate}%</span>
                  </label>
                  <input type="range" min={6} max={14} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))}
                    style={{ width: "100%", background: `linear-gradient(to right, #2BA8E0 ${((rate - 6) / 8) * 100}%, rgba(245,242,236,0.12) ${((rate - 6) / 8) * 100}%)` }} />
                </div>
                <div style={{ marginBottom: "28px" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: "8px" }}>
                    <span>Tenure</span><span style={{ color: "#2BA8E0" }}>{tenure} yrs</span>
                  </label>
                  <input type="range" min={5} max={30} step={1} value={tenure} onChange={e => setTenure(Number(e.target.value))}
                    style={{ width: "100%", background: `linear-gradient(to right, #2BA8E0 ${((tenure - 5) / 25) * 100}%, rgba(245,242,236,0.12) ${((tenure - 5) / 25) * 100}%)` }} />
                </div>
                <div style={{ padding: "20px 22px", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "12px", textAlign: "center" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase", marginBottom: "6px" }}>Monthly EMI</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "38px", fontWeight: 600, color: "#2BA8E0" }}>
                    ₹{Math.round(emi).toLocaleString("en-IN")}
                  </p>
                  <p style={{ fontSize: "11px", color: "rgba(245,242,236,0.3)", marginTop: "4px" }}>
                    Total Interest: {fmtINR(Math.round(emi * tenure * 12 - loanAmt))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY BUY WITH Nilay 360 ───────────────────────────────── */}
        <section className="buy-why" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="Why Nilay 360" />
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#E8EAED" }}>
              Buy with<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Complete Confidence</em>
            </h2>
          </div>
          <div className="buy-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {[
              { icon: "🛡", color: "#059669", bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.12)", title: "RERA Protected", desc: "Every listed property is verified under RERA. Builder obligations, delivery timelines, and your investment are legally safeguarded.", pts: ["Mandatory RERA number", "Escrow-protected funds", "Penalty clauses enforced"] },
              { icon: "⚖️", color: "#2BA8E0", bg: "rgba(201,168,76,0.06)", border: "rgba(201,168,76,0.18)", title: "Legal Clarity", desc: "Our in-house legal team reviews title deeds, encumbrance certificates, and ownership documents before you sign anything.", pts: ["Title deed verification", "Encumbrance check", "OC/CC reviewed"] },
              { icon: "👤", color: "#3B82F6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", title: "Expert Agents", desc: "Work with RERA-certified agents who know the local micro-market, pricing trends, and negotiate on your behalf.", pts: ["RERA certified agents", "Local market expertise", "Negotiation support"] },
              { icon: "💎", color: "#8B5CF6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)", title: "Transparent Pricing", desc: "No hidden charges, no inflated quotes. Our pricing is straightforward with a detailed cost breakup before any commitment.", pts: ["No brokerage surprise", "Detailed cost sheet", "Zero hidden charges"] },
            ].map(b => (
              <div key={b.title} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: "18px", padding: "28px 24px" }}>
                <div style={{ fontSize: "28px", marginBottom: "14px" }}>{b.icon}</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#E8EAED", marginBottom: "10px" }}>{b.title}</h3>
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
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="buy-cta" style={{ background: "#000000", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
            <Eyebrow label="Get Started" />
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#E8EAED", lineHeight: 1.15, marginBottom: "14px" }}>
              Start Your Property<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Search Today</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.45)", lineHeight: 1.75, marginBottom: "36px" }}>
              Over 2,400 verified properties across 14 Indian cities. Our experts guide you from search to registration.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/properties" style={{ padding: "14px 36px", background: "#2BA8E0", borderRadius: "9px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Browse All
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
              <a href="/contact" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.8)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Talk to Expert
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="buy-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div className="buy-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "40px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#2BA8E0" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "260px" }}>India's most trusted premium real estate platform. Every listing verified, every project curated.</p>
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
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", color: "rgba(201,168,76,0.5)" }}>RERA COMPLIANT</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
