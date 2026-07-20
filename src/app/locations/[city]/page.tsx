"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";

// ── Static city config ────────────────────────────────────────
type CityConfig = {
  name: string; state: string; country: string; img: string;
  population: string; lifestyle: string; transport: string; schools: string;
  ppsf: number; avgRent: number; growth: number;
  neighbourhoods: { name: string; ppsf: number; type: string; count: number }[];
  transport_list: string[]; schools_list: string[]; hospitals_list: string[]; shopping_list: string[];
  faqs: { q: string; a: string }[];
  trends: { year: string; sale: number; rent: number }[];
};

const CITY_DATA: Record<string, CityConfig> = {
  hyderabad: {
    name: "Hyderabad", state: "Telangana", country: "India",
    img: "https://images.unsplash.com/photo-1590577976322-3d2d6e2130d5?w=1600&q=80",
    population: "10.5 million", lifestyle: "Cosmopolitan IT hub blending Nizami heritage with modern corporate culture. Known for its biryani, pearls, and a fast-growing startup ecosystem.", transport: "Metro Rail (3 lines), TSRTC buses, ORR connectivity, Rajiv Gandhi International Airport (30km).", schools: "International School of Hyderabad, Oakridge International, Chirec, Bhavans, Jubilee Hills Public School.",
    ppsf: 95000, avgRent: 45000, growth: 14.2,
    neighbourhoods: [
      { name: "Jubilee Hills",   ppsf: 155000, type: "Ultra Luxury",  count: 38 },
      { name: "Banjara Hills",   ppsf: 140000, type: "Luxury",        count: 31 },
      { name: "Kokapet",         ppsf: 105000, type: "Premium",       count: 52 },
      { name: "Gachibowli",      ppsf: 92000,  type: "Premium",       count: 29 },
      { name: "Madhapur",        ppsf: 88000,  type: "Premium",       count: 24 },
      { name: "Kondapur",        ppsf: 82000,  type: "Mid-Premium",   count: 19 },
    ],
    transport_list: ["Rajiv Gandhi Intl Airport — 30 min", "Hyderabad Metro (3 lines)", "ORR — 158km ring road", "Secunderabad Railway Station"],
    schools_list: ["International School of Hyderabad", "Oakridge International", "Chirec International", "Bhavans Public School"],
    hospitals_list: ["Apollo Hospitals Jubilee Hills", "KIMS Hospitals", "Yashoda Hospitals", "Care Hospitals"],
    shopping_list: ["GVK One Mall", "Inorbit Mall Cyberabad", "Forum Sujana City", "City Centre Mall"],
    trends: [
      { year: "2020", sale: 62000, rent: 28000 },
      { year: "2021", sale: 68000, rent: 31000 },
      { year: "2022", sale: 76000, rent: 36000 },
      { year: "2023", sale: 84000, rent: 40000 },
      { year: "2024", sale: 91000, rent: 44000 },
      { year: "2025", sale: 95000, rent: 47000 },
    ],
    faqs: [
      { q: "Which is the best area to buy in Hyderabad?", a: "For ultra-luxury, Jubilee Hills and Banjara Hills are the gold standard. For premium investment with strong appreciation potential, Kokapet and the Financial District are the top picks due to proximity to GCCs and IT campuses." },
      { q: "What is the average 3BHK price in Hyderabad?", a: "A 3BHK apartment in Hyderabad ranges from ₹1.5 crore in areas like Kondapur to ₹4–5 crore in Banjara Hills. Kokapet averages ₹2–2.8 crore for a quality 3BHK." },
      { q: "Is Hyderabad good for rental investment?", a: "Yes. The IT corridor (Kokapet to Gachibowli) consistently delivers 3.5–5% gross rental yields, driven by demand from GCC employees. Occupancy rates remain above 92% in premium localities." },
      { q: "What are the upcoming infrastructure projects in Hyderabad?", a: "Key projects include the Regional Ring Road (RRR), Metro Phase 2 (including the Airport Corridor), and the 6-lane Hyderabad-Vijayawada Expressway — all of which are expected to significantly boost property values in the western corridor." },
      { q: "Is RERA mandatory for Hyderabad projects?", a: "Yes. All residential projects above 500 sq.m. or 8 apartments must be registered with TSRERA (Telangana RERA). Nilay 360 verifies TSRERA registration for every listing before it goes live." },
    ],
  },
  mumbai: {
    name: "Mumbai", state: "Maharashtra", country: "India",
    img: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&q=80",
    population: "20.7 million", lifestyle: "India's financial capital — high energy, world-class dining, Bollywood, and the most diverse real estate market in the country.", transport: "Chhatrapati Shivaji Maharaj International Airport, Western & Central Railways, Mumbai Metro, Mono Rail, Eastern & Western Expressways.", schools: "Dhirubhai Ambani International, Cathedral & John Connon, JBCN International, Bombay Scottish, Oberoi International.",
    ppsf: 185000, avgRent: 95000, growth: 9.8,
    neighbourhoods: [
      { name: "Bandra West",  ppsf: 280000, type: "Ultra Luxury",  count: 41 },
      { name: "Worli",        ppsf: 320000, type: "Ultra Luxury",  count: 27 },
      { name: "Lower Parel",  ppsf: 260000, type: "Luxury",        count: 18 },
      { name: "Powai",        ppsf: 175000, type: "Premium",       count: 33 },
      { name: "Thane West",   ppsf: 115000, type: "Mid-Premium",   count: 58 },
      { name: "Navi Mumbai",  ppsf: 95000,  type: "Mid-Premium",   count: 72 },
    ],
    transport_list: ["CSIA Airport — 30 min", "Western & Central Railways", "Mumbai Metro (9 lines)", "Mumbai Mono Rail"],
    schools_list: ["Dhirubhai Ambani International", "Cathedral & John Connon", "JBCN International", "Bombay Scottish School"],
    hospitals_list: ["Lilavati Hospital", "Kokilaben Dhirubhai Ambani Hospital", "Breach Candy Hospital", "Hinduja Hospital"],
    shopping_list: ["Palladium Mall", "High Street Phoenix", "Infiniti Mall", "R City Mall"],
    trends: [
      { year: "2020", sale: 145000, rent: 72000 },
      { year: "2021", sale: 152000, rent: 76000 },
      { year: "2022", sale: 162000, rent: 82000 },
      { year: "2023", sale: 172000, rent: 88000 },
      { year: "2024", sale: 181000, rent: 93000 },
      { year: "2025", sale: 185000, rent: 96000 },
    ],
    faqs: [
      { q: "What is the best area to buy in Mumbai?", a: "For ultra-premium: South Mumbai, Bandra West, and Worli. For strong appreciation: Powai, Lower Parel, and Thane West offer better value with excellent connectivity." },
      { q: "What is the average 2BHK price in Mumbai?", a: "A 2BHK in Mumbai ranges from ₹1.2–1.8Cr in Thane to ₹4–7Cr in Bandra West and ₹8–15Cr in Worli/South Mumbai." },
      { q: "Is Mumbai a good rental market?", a: "Yes, Mumbai has India's most liquid rental market. Bandra West yields 2.5–3.5% while Powai and Thane offer 3.5–5% with strong occupancy." },
      { q: "What is the stamp duty in Maharashtra?", a: "Stamp duty in Maharashtra is 5% of the property value for men and 4% for women buyers. Registration charges are an additional 1%." },
      { q: "What new infrastructure will boost Mumbai property?", a: "The Mumbai Trans Harbour Link (Atal Setu), Metro Line 3 (Aqua Line), and Navi Mumbai International Airport are the three transformative projects expected to reshape the market through 2030." },
    ],
  },
  bengaluru: {
    name: "Bengaluru", state: "Karnataka", country: "India",
    img: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1600&q=80",
    population: "13.2 million", lifestyle: "India's Silicon Valley — startup culture, craft beer, pleasant weather year-round, and the most cosmopolitan real estate market outside Mumbai.", transport: "Kempegowda International Airport, Namma Metro (2 operational lines + expansion), BMTC buses, NICE Ring Road.", schools: "Inventure Academy, Greenwood High, Candor International, DPS Bangalore, Bangalore International School.",
    ppsf: 112000, avgRent: 55000, growth: 11.5,
    neighbourhoods: [
      { name: "Whitefield",   ppsf: 98000,  type: "Premium",       count: 45 },
      { name: "Koramangala",  ppsf: 135000, type: "Luxury",        count: 34 },
      { name: "Indiranagar",  ppsf: 128000, type: "Luxury",        count: 22 },
      { name: "Hebbal",       ppsf: 105000, type: "Premium",       count: 29 },
      { name: "Sarjapur",     ppsf: 88000,  type: "Mid-Premium",   count: 37 },
      { name: "Electronic City", ppsf: 75000, type: "Mid-Premium",count: 41 },
    ],
    transport_list: ["Kempegowda Intl Airport — 45 min", "Namma Metro (Purple & Green Lines)", "NICE Ring Road", "BMTC City Buses"],
    schools_list: ["Inventure Academy", "Greenwood High International", "Candor International", "DPS Bangalore North"],
    hospitals_list: ["Manipal Hospital Old Airport Road", "Apollo Hospital Jayanagar", "Fortis Hospital Bannerghatta", "Narayana Health City"],
    shopping_list: ["UB City Mall", "Phoenix Marketcity Whitefield", "Orion Mall", "VR Bengaluru"],
    trends: [
      { year: "2020", sale: 78000, rent: 38000 },
      { year: "2021", sale: 83000, rent: 40000 },
      { year: "2022", sale: 90000, rent: 45000 },
      { year: "2023", sale: 98000, rent: 50000 },
      { year: "2024", sale: 108000, rent: 54000 },
      { year: "2025", sale: 112000, rent: 57000 },
    ],
    faqs: [
      { q: "Which area in Bengaluru has the best appreciation?", a: "Whitefield and Sarjapur Road have led appreciation driven by IT company relocations. Koramangala and Indiranagar are established premium markets with steady 8–10% annual growth." },
      { q: "What is the average 3BHK price in Bengaluru?", a: "3BHK flats range from ₹1.2Cr in Electronic City to ₹3–4Cr in Koramangala and Indiranagar. Whitefield averages ₹1.8–2.5Cr for a quality 3BHK." },
      { q: "Is metro connectivity improving in Bengaluru?", a: "Yes. Namma Metro Phase 2 and 2A extensions are adding 58km of new lines. The Airport Metro Line is expected by 2026, dramatically improving north Bengaluru connectivity." },
      { q: "What is stamp duty in Karnataka?", a: "Stamp duty in Karnataka is 5% for properties above ₹45L, with 1% registration charges. There is no gender-based concession unlike some other states." },
      { q: "Is Bengaluru good for NRI investors?", a: "Very much so. Strong IT-sector rental demand, transparent RERA implementation, and consistent price appreciation make Bengaluru one of the top two NRI investment cities alongside Hyderabad." },
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
    ppsf: 90000, avgRent: 40000, growth: 10.0,
    neighbourhoods: [],
    transport_list: [], schools_list: [], hospitals_list: [], shopping_list: [],
    trends: [
      { year: "2021", sale: 70000, rent: 30000 }, { year: "2022", sale: 76000, rent: 34000 },
      { year: "2023", sale: 82000, rent: 38000 }, { year: "2024", sale: 88000, rent: 41000 },
      { year: "2025", sale: 90000, rent: 43000 },
    ],
    faqs: [
      { q: `Is ${name} a good city to invest in real estate?`, a: `${name} offers strong fundamentals for real estate investment — growing infrastructure, rising employment, and consistent property appreciation.` },
      { q: "How do I find verified properties?", a: "All properties on Nilay 360 are manually verified by our ground team before listing. Each property comes with RERA registration details and legal clearance status." },
      { q: "Can NRIs buy property here?", a: "Yes. NRIs, PIOs, and OCI cardholders can purchase residential and commercial property across India under FEMA regulations. Visit our NRI Services page for detailed guidance." },
      { q: "What is the home loan interest rate?", a: "Home loan rates in India currently range from 8.5% to 10% per annum, depending on your credit profile and lender. Use our EMI Calculator to estimate your monthly payment." },
      { q: "Does Nilay 360 provide legal assistance?", a: "Yes. Our in-house legal team reviews title documents, encumbrance certificates, and builder credentials for every listing. We also offer POA assistance for NRI buyers." },
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
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "20px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", textAlign: "left" }}>
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
        <h4 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "17px", fontWeight: 600, color: "#020C1C", marginBottom: "8px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h4>
        <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#10C4C3", marginBottom: "10px" }}>{fmtINR(p.price, true)}{p.listing_type === "rent" ? "/mo" : ""}</p>
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
        const { data } = await supabase
          .from("properties")
          .select(`*, neighbourhood:neighbourhoods(name)`)
          .eq("status", "active")
          .eq("approval_status", "approved")
          .ilike("city_id", `%${cfg.name}%`)
          .limit(12);
        if (data && data.length > 0) {
          setProperties(data.map((p: any) => ({
            ...p,
            neighbourhood: p.neighbourhood?.name ?? null,
            featured_image: p.images?.[0] ?? null,
          })));
        } else {
          // Placeholder properties for this city
          setProperties(Array.from({ length: 6 }, (_, i) => ({
            id: `${slug}-${i}`, slug: `${slug}-property-${i + 1}`,
            title: [`Luxury 4BHK Villa`, `3BHK Premium Apartment`, `Sky Penthouse`, `2BHK Modern Flat`, `5BHK Independent House`, `1BHK Studio`][i] + ` — ${cfg.name}`,
            price: [85_000_000, 22_500_000, 65_000_000, 12_500_000, 120_000_000, 7_500_000][i],
            listing_type: (i < 4 ? "sale" : "rent") as "sale" | "rent",
            property_type: ["Villa", "Apartment", "Penthouse", "Apartment", "Independent House", "Apartment"][i],
            bedrooms: [4, 3, 4, 2, 5, 1][i], bathrooms: [4, 3, 4, 2, 5, 1][i],
            area_sqft: [6200, 2100, 5100, 1350, 8500, 650][i],
            images: [], featured_image: `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80`,
            neighbourhood: cfg.neighbourhoods[i % cfg.neighbourhoods.length]?.name ?? null,
          })));
        }
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

  const maxSale = Math.max(...cfg.trends.map(t => t.sale));
  const maxRent = Math.max(...cfg.trends.map(t => t.rent));

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
        body { font-family: 'Cal Sans', system-ui, sans-serif; background: #020C1C; overflow-x: hidden; }
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

        {/* ── NAVBAR ─────────────────────────────────────────── */}
        <nav className="loc-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(5,8,12,0.88)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "0.5px solid rgba(201,168,76,0.18)" }}>
          <a href="/" style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "19px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", textDecoration: "none" }}>
            Nilay 360 <span style={{ color: "#10C4C3" }}>·</span>
          </a>
          <div className="loc-nav-links" style={{ display: "flex", gap: "2px" }}>
            {[["Home", "/"], ["Properties", "/properties"], ["Search", "/search"], ["Locations", "/locations"], ["Blog", "/blog"], ["Contact", "/contact"]].map(([l, h]) => (
              <a key={l} href={h} style={{ padding: "7px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/login"    style={{ padding: "8px 18px", borderRadius: "7px", border: "0.5px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</a>
            <a href="/register" style={{ padding: "8px 22px", borderRadius: "7px", background: "#10C4C3", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>List Property</a>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "68px", minHeight: "520px", display: "flex", alignItems: "flex-end", position: "relative", overflow: "hidden" }}>
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
            <h1 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.05, marginBottom: "10px", animation: "fadeUp 0.5s ease-out both" }}>
              {cfg.name}
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.5)", marginBottom: "24px" }}>{cfg.state}, {cfg.country}</p>
            {/* Stats pills */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[
                { label: `${properties.length || "—"} listings`, icon: "🏠" },
                { label: `Avg ₹${(cfg.ppsf / 1000).toFixed(0)}K/sqft`, icon: "💰" },
                { label: `Avg rent ₹${(cfg.avgRent / 1000).toFixed(0)}K/mo`, icon: "🔑" },
                { label: `+${cfg.growth}% YoY`, icon: "📈" },
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
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C", lineHeight: 1.2, marginBottom: "22px" }}>
                Living in <em style={{ fontStyle: "italic", color: "#10C4C3" }}>{cfg.name}</em>
              </h2>
              <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.85, marginBottom: "24px" }}>{cfg.lifestyle}</p>
              <div className="loc-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { icon: "👥", label: "Population",      value: cfg.population },
                  { icon: "🚆", label: "Transport",       value: cfg.transport.split(",")[0] + "…" },
                  { icon: "🎓", label: "Top Schools",     value: cfg.schools.split(",")[0] + " & more" },
                  { icon: "📈", label: "Price Trend",     value: `+${cfg.growth}% YoY appreciation` },
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
                  { label: "Avg Sale Price",   value: `₹${(cfg.ppsf / 1000).toFixed(0)}K/sqft` },
                  { label: "Avg Monthly Rent", value: `₹${(cfg.avgRent / 1000).toFixed(0)}K/mo` },
                  { label: "YoY Appreciation", value: `+${cfg.growth}%` },
                  { label: "Active Listings",  value: `${properties.length || "—"}` },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(245,242,236,0.07)" }}>
                    <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.45)" }}>{row.label}</span>
                    <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#10C4C3" }}>{row.value}</span>
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
                <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
                  Properties in {cfg.name}
                </h2>
              </div>
              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[["all", "All"], ["sale", "For Sale"], ["rent", "For Rent"]].map(([v, l]) => (
                  <button key={v} onClick={() => setTypeFilter(v)} style={{ padding: "7px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: typeFilter === v ? "#020C1C" : "#fff", border: typeFilter === v ? "none" : "1.5px solid rgba(13,43,31,0.12)", color: typeFilter === v ? "#10C4C3" : "#6B7C72", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>{l}</button>
                ))}
                <div style={{ width: "1px", background: "rgba(13,43,31,0.1)", margin: "0 4px" }} />
                {[["all", "Any Price"], ["under1", "Under ₹1Cr"], ["1-3", "₹1–3Cr"], ["above3", "₹3Cr+"]].map(([v, l]) => (
                  <button key={v} onClick={() => setPriceFilter(v)} style={{ padding: "7px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: priceFilter === v ? "#10C4C3" : "#fff", border: priceFilter === v ? "none" : "1.5px solid rgba(13,43,31,0.12)", color: priceFilter === v ? "#020C1C" : "#6B7C72", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>{l}</button>
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
                <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "24px", color: "#020C1C", marginBottom: "8px" }}>No properties match this filter</p>
                <button onClick={() => { setTypeFilter("all"); setPriceFilter("all"); }} style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Clear filters</button>
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

        {/* ── MARKET TRENDS ──────────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="Price History" />
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
              {cfg.name} Market<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Trends</em>
            </h2>
          </div>
          <div style={{ background: "#fff", borderRadius: "18px", padding: "36px 36px", border: "1px solid rgba(13,43,31,0.07)" }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "28px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "3px", background: "#10C4C3", borderRadius: "2px" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7C72" }}>Avg Sale Price (₹/sqft)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "3px", background: "#4A90D9", borderRadius: "2px" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7C72" }}>Avg Monthly Rent (₹)</span>
              </div>
            </div>
            {/* Bar chart */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", height: "200px", paddingBottom: "36px", borderBottom: "2px solid rgba(13,43,31,0.06)", position: "relative" }}>
              {/* Y-axis lines */}
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{ position: "absolute", left: 0, right: 0, bottom: `calc(${pct}% + 36px)`, height: "1px", background: "rgba(13,43,31,0.04)", display: pct > 0 ? "block" : "none" }} />
              ))}
              {cfg.trends.map(t => (
                <div key={t.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", display: "flex", gap: "4px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, height: `${(t.sale / maxSale) * 160}px`, background: "linear-gradient(to top, #10C4C3, rgba(201,168,76,0.6))", borderRadius: "4px 4px 0 0", minHeight: "8px", transition: "height 0.4s" }} title={`₹${(t.sale / 1000).toFixed(0)}K/sqft`} />
                    <div style={{ flex: 1, height: `${(t.rent / maxRent) * 160}px`, background: "linear-gradient(to top, #4A90D9, rgba(74,144,217,0.5))", borderRadius: "4px 4px 0 0", minHeight: "8px", transition: "height 0.4s" }} title={`₹${(t.rent / 1000).toFixed(0)}K/mo`} />
                  </div>
                </div>
              ))}
            </div>
            {/* X axis labels */}
            <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
              {cfg.trends.map(t => (
                <div key={t.year} style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF" }}>{t.year}</p>
                </div>
              ))}
            </div>
            {/* Key numbers */}
            <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
              {[
                { label: "2025 Avg Sale",  value: `₹${(cfg.ppsf / 1000).toFixed(0)}K/sqft`, color: "#10C4C3" },
                { label: "2025 Avg Rent",  value: `₹${(cfg.avgRent / 1000).toFixed(0)}K/mo`, color: "#4A90D9" },
                { label: "5-Year Growth",  value: `+${(((cfg.ppsf / cfg.trends[0].sale) - 1) * 100).toFixed(0)}%`,  color: "#059669" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "#F8F6F1", borderRadius: "10px", padding: "14px 18px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "4px" }}>{s.label}</p>
                  <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── POPULAR NEIGHBOURHOODS ─────────────────────────── */}
        {cfg.neighbourhoods.length > 0 && (
          <section style={{ background: "#F8F6F1", padding: "72px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "44px" }}>
                <Eyebrow label="Local Areas" />
                <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
                  Popular Neighbourhoods<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>in {cfg.name}</em>
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" }}>
                {cfg.neighbourhoods.map((n, i) => {
                  const [hover, setHover] = useState(false);
                  return (
                    <a key={n.name} href={`/search?city=${encodeURIComponent(cfg.name)}&neighbourhood=${encodeURIComponent(n.name)}`} style={{ textDecoration: "none", display: "block", background: hover ? "#020C1C" : "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "14px", padding: "24px 22px", transition: "all 0.2s", boxShadow: hover ? "0 16px 48px rgba(13,43,31,0.14)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-3px)" : "none" }}
                      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                        <div>
                          <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: hover ? "#020C1C" : "#020C1C", transition: "color 0.2s" }}>{n.name}</h3>
                          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#10C4C3", textTransform: "uppercase" }}>{n.type}</span>
                        </div>
                        <span style={{ fontSize: "22px", opacity: 0.5 }}>{["🏡", "🏙", "🌆", "🏘", "🏗", "🌇"][i % 6]}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: hover ? "rgba(201,168,76,0.5)" : "#9CA3AF", textTransform: "uppercase", marginBottom: "2px" }}>Avg Price</p>
                          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "17px", fontWeight: 600, color: hover ? "#10C4C3" : "#020C1C", transition: "color 0.2s" }}>₹{(n.ppsf / 1000).toFixed(0)}K/sqft</p>
                        </div>
                        <span style={{ fontSize: "12px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF" }}>{n.count} listings</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── NEARBY AMENITIES ───────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="Infrastructure" />
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
              Amenities & Infrastructure
            </h2>
          </div>
          <div className="loc-amenities-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
            {AMENITY_CATS.map(cat => (
              <div key={cat.label} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "24px 20px" }}>
                <div style={{ fontSize: "26px", marginBottom: "12px" }}>{cat.icon}</div>
                <h4 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#020C1C", marginBottom: "14px" }}>{cat.label}</h4>
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
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
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
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.15, marginBottom: "16px" }}>
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
                <div style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's most trusted premium real estate platform.</p>
              </div>
              {[
                { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
                { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
                { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]] },
                { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"]] },
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
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", color: "rgba(201,168,76,0.5)" }}>RERA COMPLIANT</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
