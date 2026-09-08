"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";

// ── Static city config ────────────────────────────────────────
// Descriptive/factual content only (real infrastructure, general FAQs) —
// no fabricated price/growth stats or per-neighbourhood numbers. Those
// were invented figures presented as real market data and have been
// removed; anything price/listing-related now comes only from the live
// properties query below.
type CityConfig = {
  name: string; state: string; country: string; img: string;
  population: string; lifestyle: string; transport: string; schools: string;
  transport_list: string[]; schools_list: string[]; hospitals_list: string[]; shopping_list: string[];
  faqs: { q: string; a: string }[];
};

const CITY_DATA: Record<string, CityConfig> = {
  hyderabad: {
    name: "Hyderabad", state: "Telangana", country: "India",
    img: "https://images.unsplash.com/photo-1590577976322-3d2d6e2130d5?w=1600&q=80",
    population: "10.5 million", lifestyle: "Cosmopolitan IT hub blending Nizami heritage with modern corporate culture. Known for its biryani, pearls, and a fast-growing startup ecosystem.", transport: "Metro Rail (3 lines), TSRTC buses, ORR connectivity, Rajiv Gandhi International Airport (30km).", schools: "International School of Hyderabad, Oakridge International, Chirec, Bhavans, Jubilee Hills Public School.",
    transport_list: ["Rajiv Gandhi Intl Airport — 30 min", "Hyderabad Metro (3 lines)", "ORR — 158km ring road", "Secunderabad Railway Station"],
    schools_list: ["International School of Hyderabad", "Oakridge International", "Chirec International", "Bhavans Public School"],
    hospitals_list: ["Apollo Hospitals Jubilee Hills", "KIMS Hospitals", "Yashoda Hospitals", "Care Hospitals"],
    shopping_list: ["GVK One Mall", "Inorbit Mall Cyberabad", "Forum Sujana City", "City Centre Mall"],
    faqs: [
      { q: "Which is the best area to buy in Hyderabad?", a: "For ultra-luxury, Jubilee Hills and Banjara Hills are the gold standard. For premium investment with strong appreciation potential, Kokapet and the Financial District are the top picks due to proximity to GCCs and IT campuses." },
      { q: "Is Hyderabad good for rental investment?", a: "Yes. The IT corridor (Kokapet to Gachibowli) has historically seen strong rental demand, driven by GCC employees." },
      { q: "What are the upcoming infrastructure projects in Hyderabad?", a: "Key projects include the Regional Ring Road (RRR), Metro Phase 2 (including the Airport Corridor), and the 6-lane Hyderabad-Vijayawada Expressway — all of which are expected to boost property values in the western corridor." },
      { q: "Is RERA mandatory for Hyderabad projects?", a: "Yes. All residential projects above 500 sq.m. or 8 apartments must be registered with TSRERA (Telangana RERA). Nilay 360 verifies TSRERA registration for every listing before it goes live." },
    ],
  },
  mumbai: {
    name: "Mumbai", state: "Maharashtra", country: "India",
    img: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&q=80",
    population: "20.7 million", lifestyle: "India's financial capital — high energy, world-class dining, Bollywood, and the most diverse real estate market in the country.", transport: "Chhatrapati Shivaji Maharaj International Airport, Western & Central Railways, Mumbai Metro, Mono Rail, Eastern & Western Expressways.", schools: "Dhirubhai Ambani International, Cathedral & John Connon, JBCN International, Bombay Scottish, Oberoi International.",
    transport_list: ["CSIA Airport — 30 min", "Western & Central Railways", "Mumbai Metro (9 lines)", "Mumbai Mono Rail"],
    schools_list: ["Dhirubhai Ambani International", "Cathedral & John Connon", "JBCN International", "Bombay Scottish School"],
    hospitals_list: ["Lilavati Hospital", "Kokilaben Dhirubhai Ambani Hospital", "Breach Candy Hospital", "Hinduja Hospital"],
    shopping_list: ["Palladium Mall", "High Street Phoenix", "Infiniti Mall", "R City Mall"],
    faqs: [
      { q: "What is the best area to buy in Mumbai?", a: "For ultra-premium: South Mumbai, Bandra West, and Worli. For strong appreciation: Powai, Lower Parel, and Thane West offer better value with excellent connectivity." },
      { q: "Is Mumbai a good rental market?", a: "Yes, Mumbai has India's most liquid rental market, with steady demand across Bandra West, Powai, and Thane." },
      { q: "What is the stamp duty in Maharashtra?", a: "Stamp duty in Maharashtra is 5% of the property value for men and 4% for women buyers. Registration charges are an additional 1%." },
      { q: "What new infrastructure will boost Mumbai property?", a: "The Mumbai Trans Harbour Link (Atal Setu), Metro Line 3 (Aqua Line), and Navi Mumbai International Airport are the three transformative projects expected to reshape the market through 2030." },
    ],
  },
  bengaluru: {
    name: "Bengaluru", state: "Karnataka", country: "India",
    img: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1600&q=80",
    population: "13.2 million", lifestyle: "India's Silicon Valley — startup culture, craft beer, pleasant weather year-round, and the most cosmopolitan real estate market outside Mumbai.", transport: "Kempegowda International Airport, Namma Metro (2 operational lines + expansion), BMTC buses, NICE Ring Road.", schools: "Inventure Academy, Greenwood High, Candor International, DPS Bangalore, Bangalore International School.",
    transport_list: ["Kempegowda Intl Airport — 45 min", "Namma Metro (Purple & Green Lines)", "NICE Ring Road", "BMTC City Buses"],
    schools_list: ["Inventure Academy", "Greenwood High International", "Candor International", "DPS Bangalore North"],
    hospitals_list: ["Manipal Hospital Old Airport Road", "Apollo Hospital Jayanagar", "Fortis Hospital Bannerghatta", "Narayana Health City"],
    shopping_list: ["UB City Mall", "Phoenix Marketcity Whitefield", "Orion Mall", "VR Bengaluru"],
    faqs: [
      { q: "Which area in Bengaluru has the best appreciation?", a: "Whitefield and Sarjapur Road have seen strong appreciation driven by IT company relocations. Koramangala and Indiranagar are established premium markets." },
      { q: "Is metro connectivity improving in Bengaluru?", a: "Yes. Namma Metro Phase 2 and 2A extensions are adding new lines. The Airport Metro Line is expected to significantly improve north Bengaluru connectivity." },
      { q: "What is stamp duty in Karnataka?", a: "Stamp duty in Karnataka is 5% for properties above ₹45L, with 1% registration charges. There is no gender-based concession unlike some other states." },
      { q: "Is Bengaluru good for NRI investors?", a: "Strong IT-sector rental demand and transparent RERA implementation make Bengaluru one of the top NRI investment cities alongside Hyderabad." },
    ],
  },
};

// Fallback for unmapped city slugs
function buildFallback(slug: string): CityConfig {
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return {
    name, state: "India", country: "India",
    img: `https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1600&q=80`,
    population: "Coming soon", lifestyle: `${name} is one of India's premium real estate markets, offering a blend of urban convenience and lifestyle infrastructure.`, transport: "Information coming soon.", schools: "Information coming soon.",
    transport_list: [], schools_list: [], hospitals_list: [], shopping_list: [],
    faqs: [
      { q: `Is ${name} a good city to invest in real estate?`, a: `${name} offers strong fundamentals for real estate investment — growing infrastructure, rising employment, and consistent property appreciation.` },
      { q: "How do I know a listing on Nilay 360 is legitimate?", a: "All properties on Nilay 360 go through admin review before they're published. Where available, a listing's RERA registration number is displayed on its page — Nilay 360 does not independently verify legal title or ownership, so always confirm those details directly with the seller or your own legal counsel before transacting." },
      { q: "Can NRIs buy property here?", a: "Yes. NRIs, PIOs, and OCI cardholders can purchase residential and commercial property across India under FEMA regulations. Visit our NRI Services page for detailed guidance." },
      { q: "What is the home loan interest rate?", a: "Home loan rates in India currently range from 8.5% to 10% per annum, depending on your credit profile and lender. Use our EMI Calculator to estimate your monthly payment." },
      { q: "Does Nilay 360 provide legal assistance?", a: "Nilay 360 does not provide in-house legal review of listings. We recommend engaging your own lawyer to review title documents and other legal paperwork before finalizing any purchase." },
    ],
  };
}

// ── Types ─────────────────────────────────────────────────────
type Property = {
  id: string; slug: string; title: string; price: number;
  listing_type: "sale" | "rent"; property_type: string;
  bedrooms: number | null; bathrooms: number | null;
  area_sqft: number | null; images: string[];
  featured_image?: string | null;
  neighbourhood?: string;
};

// ── Helpers ───────────────────────────────────────────────────
function fmtINR(v: number, compact = false): string {
  if (compact) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
    if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(0)}L`;
    return `₹${v.toLocaleString("en-IN")}`;
  }
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
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

function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(13,43,31,0.08)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "20px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "26px", height: "26px", borderRadius: "7px", background: open ? "#020C1C" : "rgba(201,168,76,0.1)", border: `1px solid ${open ? "transparent" : "rgba(201,168,76,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#10C4C3", flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#020C1C", lineHeight: 1.4 }}>{q}</span>
        </div>
        <span style={{ fontSize: "20px", color: "#10C4C3", flexShrink: 0, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? "300px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontSize: "13.5px", color: "#6B7C72", lineHeight: 1.8, padding: "0 0 20px 38px" }}>{a}</p>
      </div>
    </div>
  );
}

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count.
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];

// ── Property card ─────────────────────────────────────────────
function PropCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  const img = p.featured_image || p.images?.[0] || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80`;
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 16px 44px rgba(13,43,31,0.12)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none", transition: "all 0.2s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ height: "200px", overflow: "hidden", position: "relative" }}>
        <img src={optimizedImageUrl(img, 500)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s" }} />
        <span style={{ position: "absolute", top: "12px", left: "12px", padding: "3px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: p.listing_type === "sale" ? "#10C4C3" : "#4A90D9", color: p.listing_type === "sale" ? "#020C1C" : "#fff" }}>{p.listing_type === "sale" ? "For Sale" : "For Rent"}</span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#10C4C3", textTransform: "uppercase", marginBottom: "4px" }}>{p.property_type}{p.neighbourhood ? ` · ${p.neighbourhood}` : ""}</p>
        <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#020C1C", marginBottom: "8px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h4>
        <p style={{ fontFamily: "var(--font-support-new)", fontSize: "19px", fontWeight: 600, color: "#10C4C3", marginBottom: "10px" }}>{fmtINR(p.price, true)}{p.listing_type === "rent" ? "/mo" : ""}</p>
        {(p.bedrooms || p.bathrooms || p.area_sqft) && (
          <div style={{ display: "flex", gap: "12px" }}>
            {p.bedrooms    && <span style={{ fontSize: "11px", color: "#6B7C72" }}>🛏 {p.bedrooms} {COMMERCIAL_CATEGORIES.includes(p.property_type?.toLowerCase()) ? "Rooms" : "BHK"}</span>}
            {p.bathrooms   && <span style={{ fontSize: "11px", color: "#6B7C72" }}>🚿 {p.bathrooms}</span>}
            {p.area_sqft   && <span style={{ fontSize: "11px", color: "#6B7C72" }}>📐 {p.area_sqft.toLocaleString("en-IN")} sqft</span>}
          </div>
        )}
      </div>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function CityPage() {
  const params = useParams();
  const slug = (params?.city as string) ?? "";
  const cfg = CITY_DATA[slug] ?? buildFallback(slug);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        // Listings live in property_listings (seller-submitted) — the old
        // `properties` seed/catalog table this used to query is empty.
        const { data } = await supabase
          .from("property_listings")
          .select("*")
          .eq("status", "active")
          .ilike("city", `%${cfg.name}%`)
          .limit(12);
        setProperties((data ?? []).map((p: any) => ({
          id: String(p.id ?? ""),
          slug: typeof p.slug === "string" ? p.slug : String(p.id ?? ""),
          title: typeof p.title === "string" ? p.title : "Untitled Property",
          price: Number(p.price) || 0,
          listing_type: p.listing_type === "rent" ? "rent" : "sale",
          property_type: typeof p.property_category === "string" ? p.property_category : "",
          bedrooms: p.bedrooms != null ? Number(p.bedrooms) || null : null,
          bathrooms: p.bathrooms != null ? Number(p.bathrooms) || null : null,
          area_sqft: p.built_up_area != null ? Number(p.built_up_area) || null : null,
          images: Array.isArray(p.photo_urls) ? p.photo_urls.filter(Boolean) : [],
          featured_image: p.photo_urls?.[0] ?? null,
          neighbourhood: typeof p.locality === "string" ? p.locality : undefined,
        })));
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, cfg.name]);

  const filtered = useMemo(() => {
    let list = [...properties];
    if (typeFilter !== "all") list = list.filter(p => p.listing_type === typeFilter);
    if (priceFilter === "under1") list = list.filter(p => p.price < 1_00_00_000);
    if (priceFilter === "1-3")    list = list.filter(p => p.price >= 1_00_00_000 && p.price < 3_00_00_000);
    if (priceFilter === "above3") list = list.filter(p => p.price >= 3_00_00_000);
    return list;
  }, [properties, typeFilter, priceFilter]);

  const AMENITY_CATS = [
    { icon: "🚆", label: "Transport", items: cfg.transport_list },
    { icon: "🎓", label: "Schools",   items: cfg.schools_list },
    { icon: "🏥", label: "Hospitals", items: cfg.hospitals_list },
    { icon: "🛍", label: "Shopping",  items: cfg.shopping_list },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.45} }
        @media (max-width: 768px) {
          .loc-nav { padding: 0 16px !important; }
          .loc-nav-links { display: none !important; }
          .loc-hero-inner { padding: 0 16px 40px !important; }
          .loc-overview { padding: 48px 16px !important; }
          .loc-overview-grid { grid-template-columns: 1fr !important; }
          .loc-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .loc-listings { padding: 48px 16px !important; }
          .loc-amenities-grid { grid-template-columns: repeat(2,1fr) !important; }
          .loc-faq { padding: 48px 16px !important; }
          .loc-cta { padding: 56px 16px !important; }
          .loc-footer { padding: 48px 16px 0 !important; }
          .loc-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .loc-amenities-grid { grid-template-columns: 1fr !important; }
          .loc-footer-grid { grid-template-columns: 1fr !important; }
          .loc-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", minHeight: "520px", display: "flex", alignItems: "flex-end", position: "relative", overflow: "hidden" }}>
          <img src={cfg.img} alt={cfg.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.92) 0%, rgba(5,8,12,0.5) 50%, rgba(5,8,12,0.2) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 80% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div className="loc-hero-inner" style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "0 48px 60px" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "18px" }}>
              {[["Home", "/"], ["Locations", "/locations"], [cfg.name, ""]].map(([l, h], i, arr) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {h ? <a href={h} style={{ fontSize: "12px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>
                     : <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.75)", fontWeight: 600 }}>{l}</span>}
                  {i < arr.length - 1 && <span style={{ fontSize: "10px", color: "rgba(245,242,236,0.25)" }}>›</span>}
                </span>
              ))}
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.05, marginBottom: "10px", animation: "fadeUp 0.5s ease-out both" }}>
              {cfg.name}
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.5)", marginBottom: "24px" }}>{cfg.state}, {cfg.country}</p>
            {/* Stats pills */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[
                { label: `${properties.length} listings`, icon: "🏠" },
              ].map(p => (
                <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", background: "rgba(245,242,236,0.08)", border: "1px solid rgba(245,242,236,0.15)", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#020C1C", backdropFilter: "blur(8px)" }}>
                  {p.icon} {p.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITY OVERVIEW ──────────────────────────────────── */}
        <section className="loc-overview" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div className="loc-overview-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "flex-start" }}>
            {/* Text */}
            <div>
              <Eyebrow label="About the City" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C", lineHeight: 1.2, marginBottom: "22px" }}>
                Living in <em style={{ fontStyle: "italic", color: "#10C4C3" }}>{cfg.name}</em>
              </h2>
              <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.85, marginBottom: "24px" }}>{cfg.lifestyle}</p>
              <div className="loc-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { icon: "👥", label: "Population",      value: cfg.population },
                  { icon: "🚆", label: "Transport",       value: cfg.transport.split(",")[0] + "…" },
                  { icon: "🎓", label: "Top Schools",     value: cfg.schools.split(",")[0] + " & more" },
                ].map(item => (
                  <div key={item.label} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "12px", padding: "16px 16px" }}>
                    <div style={{ fontSize: "18px", marginBottom: "6px" }}>{item.icon}</div>
                    <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</p>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#020C1C", lineHeight: 1.4 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Stats card */}
            <div style={{ background: "#020C1C", borderRadius: "18px", padding: "32px 28px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "22px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10C4C3" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>Market Stats · {cfg.name}</span>
                </div>
                {[
                  { label: "Active Listings",  value: `${properties.length}` },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(245,242,236,0.07)" }}>
                    <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.45)" }}>{row.label}</span>
                    <span style={{ fontFamily: "var(--font-support-new)", fontSize: "20px", fontWeight: 600, color: "#10C4C3" }}>{row.value}</span>
                  </div>
                ))}
                <a href={`/search?city=${encodeURIComponent(cfg.name)}`} style={{ display: "block", marginTop: "20px", padding: "12px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
                  View All {cfg.name} Properties →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROPERTY LISTINGS ──────────────────────────────── */}
        <section className="loc-listings" style={{ background: "#F8F6F1", padding: "72px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
              <div>
                <Eyebrow label="Available Now" />
                <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
                  Properties in {cfg.name}
                </h2>
              </div>
              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[["all", "All"], ["sale", "For Sale"], ["rent", "For Rent"]].map(([v, l]) => (
                  <button key={v} onClick={() => setTypeFilter(v)} style={{ padding: "7px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: typeFilter === v ? "#020C1C" : "#fff", border: typeFilter === v ? "none" : "1.5px solid rgba(13,43,31,0.12)", color: typeFilter === v ? "#10C4C3" : "#6B7C72", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>{l}</button>
                ))}
                <div style={{ width: "1px", background: "rgba(13,43,31,0.1)", margin: "0 4px" }} />
                {[["all", "Any Price"], ["under1", "Under ₹1Cr"], ["1-3", "₹1–3Cr"], ["above3", "₹3Cr+"]].map(([v, l]) => (
                  <button key={v} onClick={() => setPriceFilter(v)} style={{ padding: "7px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: priceFilter === v ? "#10C4C3" : "#fff", border: priceFilter === v ? "none" : "1.5px solid rgba(13,43,31,0.12)", color: priceFilter === v ? "#020C1C" : "#6B7C72", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>{l}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)" }}>
                    <div style={{ height: "200px", background: "#F0EDE7", animation: "shimmer 1.6s ease-in-out infinite" }} />
                    <div style={{ padding: "16px" }}>
                      {[80, 60, 45].map((w, j) => <div key={j} style={{ height: "10px", background: "#F0EDE7", borderRadius: "5px", width: `${w}%`, marginBottom: "10px", animation: "shimmer 1.6s ease-in-out infinite" }} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", background: "#fff", borderRadius: "16px", border: "1px solid rgba(13,43,31,0.07)" }}>
                {properties.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", color: "#020C1C", marginBottom: "8px" }}>No properties listed in {cfg.name} yet</p>
                ) : (
                  <>
                    <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", color: "#020C1C", marginBottom: "8px" }}>No properties match this filter</p>
                    <button onClick={() => { setTypeFilter("all"); setPriceFilter("all"); }} style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear filters</button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {filtered.map(p => <PropCard key={p.id} p={p} />)}
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ textAlign: "center", marginTop: "36px" }}>
                <a href={`/search?city=${encodeURIComponent(cfg.name)}`} style={{ padding: "12px 32px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.18)", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  View All {cfg.name} Properties
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ── NEARBY AMENITIES ───────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="Infrastructure" />
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
              Amenities & Infrastructure
            </h2>
          </div>
          <div className="loc-amenities-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
            {AMENITY_CATS.map(cat => (
              <div key={cat.label} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "24px 20px" }}>
                <div style={{ fontSize: "26px", marginBottom: "12px" }}>{cat.icon}</div>
                <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#020C1C", marginBottom: "14px" }}>{cat.label}</h4>
                {cat.items.length > 0 ? (
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cat.items.map(item => (
                      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: "#6B7C72", lineHeight: 1.5 }}>
                        <span style={{ color: "#10C4C3", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Information coming soon.</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="loc-faq" style={{ background: "#F8F6F1", padding: "72px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "44px" }}>
              <Eyebrow label="Common Questions" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
                {cfg.name} Property<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>FAQs</em>
              </h2>
            </div>
            <div style={{ background: "#fff", borderRadius: "18px", padding: "8px 36px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 2px 14px rgba(13,43,31,0.04)" }}>
              {cfg.faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} idx={i} />)}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="loc-cta" style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.15, marginBottom: "16px" }}>
              Find Your Home<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>in {cfg.name}</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px" }}>
              Talk to a {cfg.name} property expert today. Schedule viewings, get price insights, and buy with complete confidence.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={`/search?city=${encodeURIComponent(cfg.name)}`} style={{ padding: "14px 36px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Browse {cfg.name} Properties
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="/contact" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Speak to an Advisor
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="loc-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="loc-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
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
              {[
                { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
                { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
                { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"],["Safety Guide","/safety-guide"]] },
                { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"],["Agent Terms","/agent-terms"],["Grievance Redressal","/grievance-redressal"]] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginBottom: "18px" }}>{col.heading}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {col.links.map(([l,h]) => <a key={l} href={h} style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>)}
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
