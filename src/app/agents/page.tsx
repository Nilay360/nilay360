"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
type Agent = {
  id: string;
  slug: string;
  full_name: string;
  title: string;
  city: string;
  specialisation: string;
  languages: string[];
  experience_years: number;
  rating: number;
  reviews_count: number;
  properties_sold: number;
  properties_listed: number;
  rera_number: string;
  verified: boolean;
  featured: boolean;
  avatar_color: string;
  bio: string;
};

// ── Placeholder data ──────────────────────────────────────────
const PLACEHOLDER_AGENTS: Agent[] = [
  { id: "a1",  slug: "arjun-mehta",        full_name: "Arjun Mehta",        title: "Senior Property Consultant",  city: "Hyderabad",  specialisation: "Luxury Apartments",   languages: ["English","Hindi","Telugu"],   experience_years: 12, rating: 0, reviews_count: 0, properties_sold: 318, properties_listed: 42, rera_number: "A02400001234", verified: true,  featured: true,  avatar_color: "#020C1C", bio: "Arjun is one of Hyderabad's most decorated luxury real estate consultants, with over 12 years of experience in the Jubilee Hills, Banjara Hills, and Financial District corridors." },
  { id: "a2",  slug: "priya-raghavan",     full_name: "Priya Raghavan",     title: "Principal Advisor",           city: "Mumbai",     specialisation: "Sea-View Residences", languages: ["English","Hindi","Tamil"],    experience_years: 9,  rating: 0, reviews_count: 0, properties_sold: 241, properties_listed: 38, rera_number: "A51900002817", verified: true,  featured: true,  avatar_color: "#1E3A5F", bio: "Priya specialises in Mumbai's premium sea-facing residences across Worli, Bandra, and Juhu. Her NRI clientele spans the UAE, UK, and North America." },
  { id: "a3",  slug: "rohit-desai",        full_name: "Rohit Desai",        title: "Investment Specialist",       city: "Bengaluru",  specialisation: "IT Corridor Homes",   languages: ["English","Hindi","Kannada"], experience_years: 8,  rating: 0, reviews_count: 0, properties_sold: 198, properties_listed: 31, rera_number: "A29200003441", verified: true,  featured: true,  avatar_color: "#3B1F5F", bio: "Rohit brings a data-driven approach to property investment, specialising in the Whitefield–Sarjapur corridor and helping tech professionals build property portfolios." },
  { id: "a4",  slug: "sunita-krishnan",    full_name: "Sunita Krishnan",    title: "Property Consultant",        city: "Chennai",    specialisation: "Villas & Plots",      languages: ["English","Tamil","Telugu"],   experience_years: 7,  rating: 0, reviews_count: 0, properties_sold: 142, properties_listed: 22, rera_number: "A33100004512", verified: true,  featured: false, avatar_color: "#5F1F3B", bio: "" },
  { id: "a5",  slug: "vikram-nair",        full_name: "Vikram Nair",        title: "NRI Specialist",              city: "Hyderabad",  specialisation: "NRI Investments",     languages: ["English","Hindi","Malayalam"],experience_years: 11, rating: 0, reviews_count: 0, properties_sold: 276, properties_listed: 34, rera_number: "A02400005623", verified: true,  featured: false, avatar_color: "#1F4D2B", bio: "" },
  { id: "a6",  slug: "ananya-sharma",      full_name: "Ananya Sharma",      title: "Luxury Homes Expert",        city: "Delhi NCR",  specialisation: "Ultra Luxury",        languages: ["English","Hindi","Punjabi"],  experience_years: 10, rating: 0, reviews_count: 0, properties_sold: 289, properties_listed: 45, rera_number: "A07200006718", verified: true,  featured: false, avatar_color: "#4D2B00", bio: "" },
  { id: "a7",  slug: "karthik-subramanian",full_name: "Karthik Subramanian",title: "Commercial Expert",           city: "Bengaluru",  specialisation: "Commercial Spaces",   languages: ["English","Tamil","Kannada"], experience_years: 6,  rating: 0, reviews_count: 0, properties_sold: 98,  properties_listed: 18, rera_number: "A29200007834", verified: true,  featured: false, avatar_color: "#001F4D", bio: "" },
  { id: "a8",  slug: "meera-pillai",       full_name: "Meera Pillai",       title: "Property Consultant",        city: "Pune",       specialisation: "Mid-Segment Homes",   languages: ["English","Hindi","Marathi"],  experience_years: 5,  rating: 0, reviews_count: 0, properties_sold: 112, properties_listed: 19, rera_number: "A27200008921", verified: true,  featured: false, avatar_color: "#2B1F5F", bio: "" },
  { id: "a9",  slug: "rahul-agarwal",      full_name: "Rahul Agarwal",      title: "Investment Advisor",         city: "Mumbai",     specialisation: "Plot Investments",    languages: ["English","Hindi","Gujarati"], experience_years: 8,  rating: 0, reviews_count: 0, properties_sold: 167, properties_listed: 28, rera_number: "A51900009012", verified: true,  featured: false, avatar_color: "#0D3B1F", bio: "" },
  { id: "a10", slug: "deepika-menon",      full_name: "Deepika Menon",      title: "Leasing Specialist",         city: "Hyderabad",  specialisation: "Premium Rentals",     languages: ["English","Malayalam","Telugu"],experience_years: 4, rating: 0, reviews_count: 0, properties_sold: 89,  properties_listed: 21, rera_number: "A02400010134", verified: false, featured: false, avatar_color: "#3B0D1F", bio: "" },
  { id: "a11", slug: "sanjay-kapoor",      full_name: "Sanjay Kapoor",      title: "Senior Advisor",             city: "Delhi NCR",  specialisation: "Luxury Villas",       languages: ["English","Hindi"],            experience_years: 14, rating: 0, reviews_count: 0, properties_sold: 342, properties_listed: 52, rera_number: "A07200011245", verified: true,  featured: false, avatar_color: "#1A0D2B", bio: "" },
  { id: "a12", slug: "lakshmi-iyer",       full_name: "Lakshmi Iyer",       title: "Property Consultant",        city: "Chennai",    specialisation: "Waterfront Homes",    languages: ["English","Tamil"],            experience_years: 6,  rating: 0, reviews_count: 0, properties_sold: 103, properties_listed: 17, rera_number: "A33100012356", verified: true,  featured: false, avatar_color: "#0D1F3B", bio: "" },
];

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "1px" }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#10C4C3" : "none"} stroke="#10C4C3" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
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

// ── Featured Agent Card ───────────────────────────────────────
function FeaturedCard({ a }: { a: Agent }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: "#fff", border: `2px solid ${hover ? "#10C4C3" : "rgba(201,168,76,0.3)"}`, borderRadius: "20px", padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", transition: "all 0.22s", boxShadow: hover ? "0 24px 64px rgba(13,43,31,0.13)" : "0 4px 20px rgba(13,43,31,0.06)", transform: hover ? "translateY(-6px)" : "none", position: "relative" }}>
      {/* Featured badge */}
      <span style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", padding: "4px 16px", background: "#10C4C3", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.14em", color: "#020C1C", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        ★ Top Performer
      </span>
      {/* Avatar */}
      <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: a.avatar_color, border: "3px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", boxShadow: "0 8px 24px rgba(13,43,31,0.18)", position: "relative" }}>
        <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "28px", fontWeight: 600, color: "#10C4C3" }}>{initials(a.full_name)}</span>
        {a.verified && (
          <span style={{ position: "absolute", bottom: "2px", right: "2px", width: "22px", height: "22px", background: "#10B981", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>✓</span>
        )}
      </div>
      <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#020C1C", marginBottom: "4px" }}>{a.full_name}</h3>
      <p style={{ fontSize: "12px", fontWeight: 600, color: "#6B7C72", marginBottom: "2px" }}>{a.title}</p>
      <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#9CA3AF", marginBottom: "12px" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {a.city}
      </p>
      <span style={{ padding: "4px 12px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "100px", fontSize: "10px", fontWeight: 700, color: "#10C4C3", marginBottom: "16px" }}>{a.specialisation}</span>
      {/* Rating */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
        {a.reviews_count > 0 ? (
          <>
            <Stars rating={a.rating} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#020C1C" }}>{a.rating}</span>
            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>({a.reviews_count} reviews)</span>
          </>
        ) : (
          <span style={{ fontSize: "11px", color: "#9CA3AF", fontStyle: "italic" }}>No reviews yet</span>
        )}
      </div>
      {/* Stats */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "16px", padding: "14px 0", borderTop: "1px solid rgba(13,43,31,0.06)", borderBottom: "1px solid rgba(13,43,31,0.06)", width: "100%" }}>
        {[["Properties Sold", a.properties_sold], ["Experience", `${a.experience_years}yrs`]].map(([l, v]) => (
          <div key={String(l)} style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#9CA3AF", textTransform: "uppercase" }}>{l}</p>
          </div>
        ))}
      </div>
      {/* Languages */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", marginBottom: "20px" }}>
        {a.languages.map(l => (
          <span key={l} style={{ padding: "3px 9px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.08)", borderRadius: "100px", fontSize: "10px", color: "#6B7C72", fontWeight: 600 }}>{l}</span>
        ))}
      </div>
      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", width: "100%" }}>
        <a href={`tel:+919876543210`} style={{ flex: 1, padding: "10px", background: "#020C1C", borderRadius: "8px", color: "#10C4C3", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>Contact</a>
        <a href={`/agents/${a.slug}`} style={{ flex: 1, padding: "10px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.15)", borderRadius: "8px", color: "#020C1C", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>View Profile</a>
      </div>
    </div>
  );
}

// ── Agent Grid Card ───────────────────────────────────────────
function AgentCard({ a }: { a: Agent }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "#020C1C" : "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "22px 18px", textAlign: "center", transition: "all 0.22s", boxShadow: hover ? "0 16px 44px rgba(13,43,31,0.14)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none", cursor: "pointer" }}>
      {/* Avatar */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: a.avatar_color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(13,43,31,0.15)" }}>
          <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#10C4C3" }}>{initials(a.full_name)}</span>
        </div>
        {a.verified && (
          <span style={{ position: "absolute", bottom: "1px", right: "1px", width: "18px", height: "18px", background: "#10B981", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#fff" }}>✓</span>
        )}
      </div>
      <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "17px", fontWeight: 600, color: hover ? "#020C1C" : "#020C1C", marginBottom: "3px", transition: "color 0.22s" }}>{a.full_name}</h3>
      <p style={{ fontSize: "11px", color: hover ? "#10C4C3" : "#10C4C3", fontWeight: 600, marginBottom: "4px" }}>{a.specialisation}</p>
      <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", fontSize: "11px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", marginBottom: "10px" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {a.city}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginBottom: "10px" }}>
        {a.reviews_count > 0 ? (
          <>
            <Stars rating={a.rating} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: hover ? "rgba(245,242,236,0.75)" : "#020C1C" }}>{a.rating}</span>
            <span style={{ fontSize: "10px", color: hover ? "rgba(245,242,236,0.3)" : "#9CA3AF" }}>({a.reviews_count})</span>
          </>
        ) : (
          <span style={{ fontSize: "10px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", fontStyle: "italic" }}>No reviews yet</span>
        )}
      </div>
      <p style={{ fontSize: "11px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", marginBottom: "14px" }}>
        {a.properties_sold} properties sold · {a.experience_years}yr exp
      </p>
      <a href={`/agents/${a.slug}`} style={{ display: "block", padding: "9px", background: hover ? "rgba(201,168,76,0.12)" : "#F8F6F1", border: hover ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(13,43,31,0.08)", borderRadius: "8px", color: hover ? "#10C4C3" : "#020C1C", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.22s" }}>
        View Profile
      </a>
    </div>
  );
}

// ── SEL helper ────────────────────────────────────────────────
function Sel({ value, onChange, opts, placeholder }: { value: string; onChange: (v: string) => void; opts: [string,string][]; placeholder: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "10px 36px 10px 14px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: value ? "#020C1C" : "#9CA3AF", fontFamily: "'Cal Sans', sans-serif", cursor: "pointer", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
      <option value="">{placeholder}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents]           = useState<Agent[]>(PLACEHOLDER_AGENTS);
  const [search, setSearch]           = useState("");
  const [cityFilter, setCityFilter]   = useState("");
  const [specFilter, setSpecFilter]   = useState("");
  const [langFilter, setLangFilter]   = useState("");
  const [expFilter, setExpFilter]     = useState("");
  const [page, setPage]               = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("agents").select("*").eq("is_active", true).order("featured", { ascending: false }).limit(40);
        if (data && data.length > 0) setAgents(data);
      } catch (_) {}
    }
    load();
  }, []);

  const featured = agents.filter(a => a.featured);

  const filtered = agents.filter(a => {
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) && !a.specialisation.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && !a.city.includes(cityFilter)) return false;
    if (specFilter && !a.specialisation.toLowerCase().includes(specFilter.toLowerCase())) return false;
    if (langFilter && !a.languages.includes(langFilter)) return false;
    if (expFilter === "0-5"  && a.experience_years > 5)  return false;
    if (expFilter === "5-10" && (a.experience_years < 5 || a.experience_years > 10)) return false;
    if (expFilter === "10+"  && a.experience_years < 10) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function clearFilters() { setSearch(""); setCityFilter(""); setSpecFilter(""); setLangFilter(""); setExpFilter(""); setPage(1); }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Cal Sans', system-ui, sans-serif; background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: #9CA3AF; }
        input:focus { border-color: rgba(201,168,76,0.5) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        @media (max-width: 768px) {
          .ag-hero { padding: 48px 16px 56px !important; }
          .ag-stats { gap: 24px !important; flex-wrap: wrap !important; justify-content: center !important; }
          .ag-filters { padding: 32px 16px 0 !important; }
          .ag-filter-row select { flex: 1 1 calc(50% - 5px) !important; }
          .ag-featured { padding: 40px 16px 0 !important; }
          .ag-featured-grid { grid-template-columns: 1fr !important; }
          .ag-all { padding: 40px 16px 56px !important; }
          .ag-all-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
          .ag-become { padding: 56px 16px !important; }
          .ag-become-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ag-cta { padding: 48px 16px !important; }
          .ag-cta-inner { padding: 40px 20px !important; }
          .ag-footer { padding: 48px 16px 0 !important; }
          .ag-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .ag-all-grid { grid-template-columns: 1fr !important; }
          .ag-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#020C1C", minHeight: "400px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 130%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", maskImage: "linear-gradient(to left, rgba(0,0,0,0.4), transparent)" }} />
          <div className="ag-hero" style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "72px 48px", textAlign: "center" }}>
            <div style={{ animation: "fadeUp 0.5s ease-out both" }}><Eyebrow label="Our Expert Team" /></div>
            <h1 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(44px, 6.5vw, 78px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.08, marginBottom: "16px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Meet Our Verified<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Agents</em>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", marginBottom: "48px", animation: "fadeUp 0.5s 0.18s ease-out both" }}>
              RERA certified professionals with proven track records
            </p>
            <div className="ag-stats" style={{ display: "flex", justifyContent: "center", gap: "60px", paddingTop: "28px", borderTop: "1px solid rgba(245,242,236,0.06)", animation: "fadeUp 0.5s 0.25s ease-out both" }}>
              {[["500+","Verified Agents"],["14","Cities Covered"]].map(([v,l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "34px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SEARCH & FILTERS ───────────────────────────────── */}
        <div className="ag-filters" style={{ maxWidth: "1280px", margin: "0 auto", padding: "44px 48px 0" }}>
          <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "20px 24px", boxShadow: "0 2px 12px rgba(13,43,31,0.04)" }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#020C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by agent name or specialisation…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: "100%", padding: "13px 16px 13px 44px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "10px", fontSize: "13px", color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none" }} />
            </div>
            {/* Filter row */}
            <div className="ag-filter-row" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <Sel value={cityFilter} onChange={v => { setCityFilter(v); setPage(1); }} placeholder="All Cities"
                opts={[["Hyderabad","Hyderabad"],["Mumbai","Mumbai"],["Bengaluru","Bengaluru"],["Delhi NCR","Delhi NCR"],["Chennai","Chennai"],["Pune","Pune"]]} />
              <Sel value={specFilter} onChange={v => { setSpecFilter(v); setPage(1); }} placeholder="Specialisation"
                opts={[["Luxury","Luxury Homes"],["NRI","NRI Investments"],["Commercial","Commercial"],["Villas","Villas & Plots"],["Rentals","Rentals"]]} />
              <Sel value={langFilter} onChange={v => { setLangFilter(v); setPage(1); }} placeholder="Language"
                opts={[["English","English"],["Hindi","Hindi"],["Telugu","Telugu"],["Tamil","Tamil"],["Kannada","Kannada"],["Malayalam","Malayalam"],["Marathi","Marathi"]]} />
              <Sel value={expFilter} onChange={v => { setExpFilter(v); setPage(1); }} placeholder="Experience"
                opts={[["0-5","0–5 Years"],["5-10","5–10 Years"],["10+","10+ Years"]]} />
              {(search || cityFilter || specFilter || langFilter || expFilter) && (
                <button onClick={clearFilters} style={{ padding: "10px 16px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: "#9CA3AF", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>
                  Clear ×
                </button>
              )}
              <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "#9CA3AF" }}>
                {filtered.length} agent{filtered.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>
        </div>

        {/* ── FEATURED AGENTS ────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="ag-featured" style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 0" }}>
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <Eyebrow label="Top Performers" />
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 400, color: "#020C1C" }}>
                Featured <em style={{ fontStyle: "italic", color: "#10C4C3" }}>Agents</em>
              </h2>
            </div>
            <div className="ag-featured-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              {featured.map(a => <FeaturedCard key={a.id} a={a} />)}
            </div>
          </section>
        )}

        {/* ── ALL AGENTS GRID ────────────────────────────────── */}
        <section className="ag-all" style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#020C1C" }}>
              All Agents <span style={{ color: "#10C4C3", fontStyle: "italic" }}>({filtered.length})</span>
            </h2>
          </div>

          {paginated.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "26px", color: "#020C1C", marginBottom: "8px" }}>No agents match your filters</p>
              <button onClick={clearFilters} style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="ag-all-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "36px" }}>
                {paginated.map(a => <AgentCard key={a.id} a={a} />)}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: "9px 16px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: page === 1 ? "#D1D5DB" : "#020C1C", cursor: page === 1 ? "default" : "pointer", fontFamily: "'Cal Sans', sans-serif" }}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      style={{ width: "38px", height: "38px", borderRadius: "8px", border: "1.5px solid rgba(13,43,31,0.1)", background: page === i + 1 ? "#020C1C" : "#fff", color: page === i + 1 ? "#10C4C3" : "#6B7C72", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: "9px 16px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: page === totalPages ? "#D1D5DB" : "#020C1C", cursor: page === totalPages ? "default" : "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Next →</button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── BECOME AN AGENT ────────────────────────────────── */}
        <section className="ag-become" style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div className="ag-become-grid" style={{ position: "relative", zIndex: 2, maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
            {/* Left */}
            <div>
              <Eyebrow label="Join Our Network" />
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.15, marginBottom: "16px" }}>
                Are You a Real Estate<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Professional?</em>
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.45)", lineHeight: 1.8, marginBottom: "32px" }}>
                Join India's fastest-growing premium real estate platform. Access verified leads, industry-leading tools, and a team that invests in your growth.
              </p>
              <div style={{ display: "flex", gap: "14px" }}>
                <a href="/agent-register" style={{ padding: "14px 32px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  Join as Agent →
                </a>
                <a href="/contact" style={{ padding: "14px 28px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.7)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  Learn More
                </a>
              </div>
            </div>
            {/* Right — benefits */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { icon: "🎯", title: "Premium Verified Leads",  desc: "Receive buyer and seller leads that are pre-qualified by our in-house concierge team — no cold calling." },
                { icon: "📊", title: "CRM Dashboard",           desc: "Manage clients, track listings, schedule viewings, and run follow-ups from one clean dashboard." },
                { icon: "📣", title: "Marketing Tools",         desc: "Professional photography, virtual tours, paid ads, and dedicated listing promotion included." },
                { icon: "🎓", title: "Training & Certification",desc: "Access RERA compliance workshops, negotiation masterclasses, and Nilay 360-certified agent status." },
              ].map(b => (
                <div key={b.title} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "16px 18px", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: "12px" }}>
                  <span style={{ fontSize: "22px", flexShrink: 0 }}>{b.icon}</span>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(245,242,236,0.85)", marginBottom: "3px" }}>{b.title}</p>
                    <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.35)", lineHeight: 1.6 }}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="ag-cta" style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 48px" }}>
          <div className="ag-cta-inner" style={{ background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "22px", padding: "60px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.06) 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <Eyebrow label="Expert Guidance" />
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, color: "#020C1C", marginBottom: "12px" }}>
                Not Sure Which Agent<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>to Work With?</em>
              </h2>
              <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.75, marginBottom: "28px", maxWidth: "440px", margin: "0 auto 28px" }}>
                Let us match you with the best-fit agent for your city, budget, and property preference — free of charge.
              </p>
              <a href="/contact" style={{ padding: "14px 36px", background: "#020C1C", borderRadius: "9px", color: "#10C4C3", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Get Agent Matched
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="ag-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="ag-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px" }}>India's most trusted premium real estate platform. Every listing verified, every agent certified.</p>
              </div>
              {[
                { heading: "Find Agents", links: [["Hyderabad Agents","/agents?city=Hyderabad"],["Mumbai Agents","/agents?city=Mumbai"],["Bengaluru Agents","/agents?city=Bengaluru"],["Join as Agent","/agent-register"]] },
                { heading: "Company",     links: [["About Us","/about"],["New Projects","/new-projects"],["NRI Services","/nri"],["Contact","/contact"]] },
                { heading: "Tools",       links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["Locations","/locations"]] },
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
