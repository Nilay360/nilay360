"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Static agent data (same as directory page) ────────────────
type Agent = {
  id: string; slug: string; full_name: string; title: string;
  agency: string; city: string; cities_served: string[];
  specialisation: string; specialisations: string[];
  languages: string[]; experience_years: number;
  rating: number; reviews_count: number;
  properties_sold: number; properties_listed: number;
  rera_number: string; verified: boolean; featured: boolean;
  avatar_color: string; bio: string; phone: string; email: string;
  whatsapp: string;
};

type Review = { name: string; rating: number; date: string; text: string; property: string };
type Property = { id: string; slug: string; title: string; price: number; type: string; city: string; bedrooms: number; area: number; image: string; listing_type: string };

const AGENTS: Record<string, Agent> = {
  "arjun-mehta": {
    id: "a1", slug: "arjun-mehta", full_name: "Arjun Mehta", title: "Senior Property Consultant", agency: "Nilay 360 Premium Realty",
    city: "Hyderabad", cities_served: ["Hyderabad", "Secunderabad", "Warangal"],
    specialisation: "Luxury Apartments", specialisations: ["Luxury Apartments", "Penthouse Sales", "NRI Investments", "Builder Tie-ups"],
    languages: ["English", "Hindi", "Telugu"], experience_years: 12,
    rating: 4.9, reviews_count: 214, properties_sold: 318, properties_listed: 42,
    rera_number: "A02400001234", verified: true, featured: true, avatar_color: "#000000",
    bio: "Arjun Mehta is one of Hyderabad's most decorated luxury real estate consultants, with over 12 years of deep expertise across the Jubilee Hills, Banjara Hills, Kokapet, and Financial District corridors.\n\nHis client portfolio spans C-suite executives, NRI professionals in the Gulf and USA, and institutional investors. Arjun is known for his meticulous due diligence, transparent advisory, and ability to negotiate complex high-value transactions with grace.\n\nHe holds certifications from RERA Telangana, the National Association of Realtors (NAR India), and the Nilay 360 Certified Advisor programme. In 2024, he was recognised as Nilay 360's Top Performer of the Year — an honour voted on by verified client reviews.",
    phone: "+919876543210", email: "arjun.mehta@nilay360.com", whatsapp: "+919876543210",
  },
  "priya-raghavan": {
    id: "a2", slug: "priya-raghavan", full_name: "Priya Raghavan", title: "Principal Advisor", agency: "Nilay 360 Premium Realty",
    city: "Mumbai", cities_served: ["Mumbai", "Navi Mumbai", "Thane"],
    specialisation: "Sea-View Residences", specialisations: ["Sea-View Residences", "Bandra & Worli", "NRI Clients", "Luxury Rentals"],
    languages: ["English", "Hindi", "Tamil"], experience_years: 9,
    rating: 4.8, reviews_count: 187, properties_sold: 241, properties_listed: 38,
    rera_number: "A51900002817", verified: true, featured: true, avatar_color: "#1E3A5F",
    bio: "Priya Raghavan is Mumbai's go-to specialist for premium sea-facing residences. Over nine years, she has curated transactions across Worli, Bandra West, Lower Parel, and Juhu — consistently delivering above-market outcomes for buyers and sellers alike.\n\nHer NRI clientele base spans the UAE, United Kingdom, and North America, and she offers a seamless end-to-end remote buying experience including virtual tours, FEMA-compliant documentation, and Power of Attorney coordination.\n\nPriya was previously with JLL Residential and brings institutional rigour to every advisory engagement.",
    phone: "+919876543211", email: "priya.raghavan@nilay360.com", whatsapp: "+919876543211",
  },
  "rohit-desai": {
    id: "a3", slug: "rohit-desai", full_name: "Rohit Desai", title: "Investment Specialist", agency: "Nilay 360 Premium Realty",
    city: "Bengaluru", cities_served: ["Bengaluru", "Mysuru", "Hosur"],
    specialisation: "IT Corridor Homes", specialisations: ["IT Corridor Homes", "Investment Portfolios", "Pre-Launch Projects", "Tech Professionals"],
    languages: ["English", "Hindi", "Kannada"], experience_years: 8,
    rating: 4.9, reviews_count: 156, properties_sold: 198, properties_listed: 31,
    rera_number: "A29200003441", verified: true, featured: true, avatar_color: "#3B1F5F",
    bio: "Rohit Desai brings a uniquely data-driven approach to property investment in Bengaluru's technology corridor. He specialises in helping software professionals, startup founders, and GCC employees build wealth through real estate — structuring purchases as portfolio investments rather than one-off transactions.\n\nHis deep knowledge of the Whitefield–Sarjapur belt, Koramangala, and Electronic City micro-markets, combined with strong builder relationships, gives his clients access to pre-launch pricing and off-market opportunities unavailable to the general public.",
    phone: "+919876543212", email: "rohit.desai@nilay360.com", whatsapp: "+919876543212",
  },
};

function buildFallback(slug: string): Agent {
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  return {
    id: slug, slug, full_name: name, title: "Property Consultant", agency: "Nilay 360 Premium Realty",
    city: "India", cities_served: ["Pan India"],
    specialisation: "Residential Properties", specialisations: ["Residential Properties", "Investment Advisory"],
    languages: ["English", "Hindi"], experience_years: 5,
    rating: 4.7, reviews_count: 62, properties_sold: 88, properties_listed: 14,
    rera_number: "A00000000000", verified: true, featured: false, avatar_color: "#000000",
    bio: `${name} is a certified real estate professional at Nilay 360, specialising in residential properties across India's premium markets. With a focus on transparency and client-first advisory, they bring deep market knowledge and a commitment to helping buyers and investors make confident decisions.`,
    phone: "+919999999999", email: "contact@nilay360.com", whatsapp: "+919999999999",
  };
}

const PLACEHOLDER_REVIEWS: Review[] = [
  { name: "Aditya Sharma", rating: 5, date: "Nov 2024", property: "3BHK in Kokapet", text: "Exceptional service from start to finish. The agent understood exactly what we were looking for and showed us properties that actually matched our requirements — not just whatever was in the database. Closed within 3 weeks." },
  { name: "Shalini Verma", rating: 5, date: "Oct 2024", property: "4BHK Villa, Jubilee Hills", text: "As an NRI buyer, I was nervous about the process. The agent handled everything remotely — virtual tours, legal checks, registration — with complete transparency. I'd recommend them to any NRI looking to invest in Hyderabad." },
  { name: "Rajesh Patel", rating: 4, date: "Sep 2024", property: "2BHK Investment Flat", text: "Very professional and patient through a long process. Deep knowledge of the Financial District market and helped us get a great price on a resale flat. Only giving 4 stars because registration took longer than expected — though that wasn't the agent's fault." },
  { name: "Kavitha Nair", rating: 5, date: "Aug 2024", property: "Penthouse, Banjara Hills", text: "Handled a very complex seller-side transaction for us. The agent brought 3 serious buyers within two weeks and ultimately achieved a price 8% above our target. Phenomenal negotiation skills and complete confidentiality throughout." },
];

const PLACEHOLDER_PROPERTIES: Property[] = [
  { id: "pr1", slug: "luxury-4bhk-kokapet", title: "Luxury 4BHK — Prestige Luminary, Kokapet", price: 32500000, type: "Apartment", city: "Hyderabad", bedrooms: 4, area: 3200, image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80", listing_type: "sale" },
  { id: "pr2", slug: "sky-penthouse-banjara", title: "Sky Penthouse — Banjara Hills", price: 78000000, type: "Penthouse", city: "Hyderabad", bedrooms: 5, area: 6100, image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", listing_type: "sale" },
  { id: "pr3", slug: "3bhk-gachibowli", title: "3BHK Premium — Sobha Crystal, Gachibowli", price: 21000000, type: "Apartment", city: "Hyderabad", bedrooms: 3, area: 2050, image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80", listing_type: "sale" },
  { id: "pr4", slug: "villa-jubilee-hills", title: "Independent Villa — Jubilee Hills Road 36", price: 95000000, type: "Villa", city: "Hyderabad", bedrooms: 5, area: 7200, image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80", listing_type: "sale" },
  { id: "pr5", slug: "3bhk-rental-kokapet", title: "3BHK Luxury Rental — Kokapet", price: 85000, type: "Apartment", city: "Hyderabad", bedrooms: 3, area: 2100, image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80", listing_type: "rent" },
  { id: "pr6", slug: "2bhk-madhapur", title: "2BHK Modern Flat — Madhapur", price: 12500000, type: "Apartment", city: "Hyderabad", bedrooms: 2, area: 1350, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", listing_type: "sale" },
];

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function fmtINR(v: number, compact = true): string {
  if (compact) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
    if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(0)} L`;
    return `₹${v.toLocaleString("en-IN")}`;
  }
  return "₹" + v.toLocaleString("en-IN");
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#2BA8E0" : "none"} stroke="#2BA8E0" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  );
}

function Eyebrow({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────
function ReviewCard({ r }: { r: Review }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "14px", padding: "22px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#000000", marginBottom: "2px" }}>{r.name}</p>
          <p style={{ fontSize: "10px", color: "#9CA3AF" }}>{r.property} · {r.date}</p>
        </div>
        <Stars rating={r.rating} size={11} />
      </div>
      <p style={{ fontSize: "12.5px", color: "#6B7C72", lineHeight: 1.75 }}>{r.text}</p>
    </div>
  );
}

// ── Property mini-card ────────────────────────────────────────
function PropCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 12px 36px rgba(13,43,31,0.1)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-3px)" : "none", transition: "all 0.2s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ height: "170px", overflow: "hidden", position: "relative" }}>
        <img src={p.image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s" }} />
        <span style={{ position: "absolute", top: "10px", left: "10px", padding: "3px 9px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: p.listing_type === "sale" ? "#2BA8E0" : "#3B82F6", color: p.listing_type === "sale" ? "#000000" : "#fff" }}>
          {p.listing_type === "sale" ? "For Sale" : "For Rent"}
        </span>
      </div>
      <div style={{ padding: "14px 14px" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#2BA8E0", textTransform: "uppercase", marginBottom: "3px" }}>{p.type}</p>
        <h4 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "14px", fontWeight: 600, color: "#000000", marginBottom: "6px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h4>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "16px", fontWeight: 600, color: "#2BA8E0", marginBottom: "6px" }}>{fmtINR(p.price)}{p.listing_type === "rent" ? "/mo" : ""}</p>
        <p style={{ fontSize: "11px", color: "#9CA3AF" }}>🛏 {p.bedrooms} BHK · 📐 {p.area.toLocaleString("en-IN")} sqft</p>
      </div>
    </a>
  );
}

// ── Contact Form ──────────────────────────────────────────────
function ContactForm({ agent }: { agent: Agent }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const supabase = createClient();
      await supabase.from("agent_enquiries").insert({
        agent_id: agent.id, agent_name: agent.full_name,
        ...form, created_at: new Date().toISOString(),
      });
    } catch (_) {}
    setSent(true);
  }

  if (sent) {
    return (
      <div style={{ padding: "32px", textAlign: "center", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "14px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>✅</div>
        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", color: "#000000", marginBottom: "8px" }}>Message Sent!</p>
        <p style={{ fontSize: "12px", color: "#6B7C72", lineHeight: 1.7 }}>{agent.full_name} will respond within 2 hours during business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[
        { label: "Your Name",    key: "name",  type: "text",  placeholder: "Full name" },
        { label: "Email",        key: "email", type: "email", placeholder: "you@email.com" },
        { label: "Phone (+91)",  key: "phone", type: "tel",   placeholder: "98765 43210" },
      ].map(f => (
        <div key={f.key}>
          <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} required value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            style={{ width: "100%", padding: "10px 13px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        </div>
      ))}
      <div>
        <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Message</label>
        <textarea placeholder="I'm looking for a 3BHK in Kokapet under ₹2.5Cr…" rows={4} required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          style={{ width: "100%", padding: "10px 13px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical" }} />
      </div>
      <button type="submit" style={{ padding: "13px", background: "#2BA8E0", border: "none", borderRadius: "9px", color: "#000000", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
        Send Message →
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AgentProfilePage() {
  const params = useParams();
  const slug   = (params?.slug as string) ?? "";
  const agent  = AGENTS[slug] ?? buildFallback(slug);

  const [properties, setProperties] = useState<Property[]>(PLACEHOLDER_PROPERTIES);
  const [reviews,    setReviews]    = useState<Review[]>(PLACEHOLDER_REVIEWS);
  const [activeTab,  setActiveTab]  = useState<"listings" | "reviews">("listings");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [{ data: props }, { data: revs }] = await Promise.all([
          supabase.from("properties").select("*").eq("agent_id", agent.id).eq("status", "active").limit(6),
          supabase.from("agent_reviews").select("*").eq("agent_id", agent.id).order("created_at", { ascending: false }).limit(12),
        ]);
        if (props && props.length > 0) setProperties(props);
        if (revs  && revs.length  > 0) setReviews(revs.map((r: any) => ({ name: r.reviewer_name, rating: r.rating, date: r.created_at?.slice(0,7) ?? "", text: r.text, property: r.property_title ?? "" })));
      } catch (_) {}
    }
    load();
  }, [agent.id]);

  const ratingBreakdown = [5,4,3,2,1].map(star => ({
    star, pct: star === 5 ? 72 : star === 4 ? 18 : star === 3 ? 6 : star === 2 ? 3 : 1
  }));

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
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
        input:focus, textarea:focus { border-color: rgba(201,168,76,0.5) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        @media (max-width: 768px) {
          .as-nav { padding: 0 16px !important; }
          .as-nav-links { display: none !important; }
          .as-hero { padding: 80px 16px 40px !important; }
          .as-hero-actions { flex-wrap: wrap !important; gap: 10px !important; }
          .as-hero-actions a, .as-hero-actions button { flex: 1 1 calc(50% - 5px) !important; justify-content: center !important; }
          .as-stats { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; padding: 24px 16px !important; }
          .as-layout { grid-template-columns: 1fr !important; padding: 24px 16px !important; gap: 24px !important; }
          .as-left { width: 100% !important; }
          .as-right { width: 100% !important; position: static !important; }
          .as-listings-grid { grid-template-columns: 1fr !important; }
          .as-footer { padding: 48px 16px 0 !important; }
          .as-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .as-stats { grid-template-columns: 1fr 1fr !important; }
          .as-footer-grid { grid-template-columns: 1fr !important; }
          .as-hero-actions a, .as-hero-actions button { flex: 1 1 100% !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000" }}>

        {/* ── NAVBAR ─────────────────────────────────────────── */}
        <nav className="as-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(5,8,12,0.9)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "0.5px solid rgba(201,168,76,0.18)" }}>
          <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "19px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", textDecoration: "none" }}>
            Nilay 360 <span style={{ color: "#2BA8E0" }}>·</span>
          </a>
          <div className="as-nav-links" style={{ display: "flex", gap: "2px" }}>
            {[["Home","/"],["Properties","/properties"],["New Projects","/new-projects"],["Agents","/agents"],["Locations","/locations"],["Contact","/contact"]].map(([l,h]) => (
              <a key={l} href={h} style={{ padding: "7px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: l === "Agents" ? "#2BA8E0" : "rgba(255,255,255,0.5)", textDecoration: "none", background: l === "Agents" ? "rgba(201,168,76,0.08)" : "transparent" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/login"    style={{ padding: "8px 18px", borderRadius: "7px", border: "0.5px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</a>
            <a href="/register" style={{ padding: "8px 22px", borderRadius: "7px", background: "#2BA8E0", color: "#000000", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>List Property</a>
          </div>
        </nav>

        {/* ── AGENT HERO ─────────────────────────────────────── */}
        <section className="as-hero" style={{ paddingTop: "68px", background: "#000000", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 30% 120%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 0" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "32px" }}>
              {[["Home","/"],["Agents","/agents"],[agent.full_name,""]].map(([l,h],i,arr) => (
                <span key={String(l)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {h ? <a href={h} style={{ fontSize: "12px", color: "rgba(245,242,236,0.35)", textDecoration: "none" }}>{l}</a>
                     : <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.65)", fontWeight: 600 }}>{l}</span>}
                  {i < arr.length - 1 && <span style={{ fontSize: "10px", color: "rgba(245,242,236,0.2)" }}>›</span>}
                </span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "36px", alignItems: "flex-start", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.08)" }}>
              {/* Avatar */}
              <div style={{ position: "relative" }}>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: agent.avatar_color, border: "3px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(5,8,12,0.4)" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 600, color: "#2BA8E0" }}>{initials(agent.full_name)}</span>
                </div>
                {agent.verified && (
                  <div style={{ position: "absolute", bottom: "4px", right: "4px", width: "30px", height: "30px", background: "#10B981", borderRadius: "50%", border: "3px solid #000000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>✓</div>
                )}
              </div>

              {/* Info */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 400, color: "#000000", lineHeight: 1.1 }}>{agent.full_name}</h1>
                  {agent.verified && (
                    <span style={{ padding: "4px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#10B981", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>✓ RERA Verified</span>
                  )}
                </div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#2BA8E0", marginBottom: "8px" }}>{agent.title} · {agent.agency}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "14px" }}>
                  {[
                    { icon: "📍", text: agent.city },
                    { icon: "🌐", text: agent.languages.join(", ") },
                    { icon: "💼", text: `${agent.experience_years} years experience` },
                    { icon: "📋", text: `RERA: ${agent.rera_number}` },
                  ].map(item => (
                    <span key={item.text} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "rgba(245,242,236,0.5)" }}>
                      {item.icon} {item.text}
                    </span>
                  ))}
                </div>

                {/* Rating */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Stars rating={agent.rating} size={16} />
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#2BA8E0" }}>{agent.rating}</span>
                  <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.35)" }}>({agent.reviews_count} verified reviews)</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="as-hero-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "200px" }}>
                <a href={`tel:${agent.phone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px 22px", background: "#2BA8E0", borderRadius: "10px", color: "#000000", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.53 2 2 0 0 1 3.71 1.35h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Call Agent
                </a>
                <a href={`https://wa.me/${agent.whatsapp.replace(/\+/g,"")}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 22px", background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.3)", borderRadius: "10px", color: "#25D366", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  WhatsApp
                </a>
                <a href="#send-message" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 22px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.18)", borderRadius: "10px", color: "rgba(245,242,236,0.65)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Send Message
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <section style={{ background: "#000000" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 48px" }}>
            <div className="as-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid rgba(245,242,236,0.06)" }}>
              {[
                { label: "Properties Listed", value: agent.properties_listed, suffix: "" },
                { label: "Properties Sold",   value: agent.properties_sold,   suffix: "" },
                { label: "Years Experience",  value: agent.experience_years,  suffix: "yrs" },
                { label: "Client Rating",     value: agent.rating,             suffix: "/5" },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: "28px 20px", borderRight: i < 3 ? "1px solid rgba(245,242,236,0.06)" : "none", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "38px", fontWeight: 600, color: "#2BA8E0", lineHeight: 1 }}>{s.value}<span style={{ fontSize: "20px" }}>{s.suffix}</span></p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginTop: "6px" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ───────────────────────────────────── */}
        <div className="as-layout" style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 80px", display: "grid", gridTemplateColumns: "1fr 360px", gap: "36px", alignItems: "flex-start" }}>

          {/* LEFT COL */}
          <div className="as-left">
            {/* ── About ─── */}
            <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "32px 28px", marginBottom: "24px" }}>
              <div style={{ marginBottom: "20px" }}><Eyebrow label="About" /></div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 400, color: "#000000", marginBottom: "18px" }}>About {agent.full_name.split(" ")[0]}</h2>
              {agent.bio.split("\n\n").map((para, i) => (
                <p key={i} style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.85, marginBottom: "14px" }}>{para}</p>
              ))}

              {/* Specialisations */}
              <div style={{ marginTop: "22px", paddingTop: "22px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "12px" }}>Specialisations</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {agent.specialisations.map(s => (
                    <span key={s} style={{ padding: "6px 14px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "100px", fontSize: "11px", fontWeight: 700, color: "#2BA8E0" }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Cities served */}
              <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "12px" }}>Cities Served</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {agent.cities_served.map(c => (
                    <span key={c} style={{ padding: "5px 12px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.08)", borderRadius: "100px", fontSize: "11px", fontWeight: 600, color: "#6B7C72", display: "flex", alignItems: "center", gap: "5px" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Tabs: Listings / Reviews ─── */}
            <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", overflow: "hidden" }}>
              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
                {(["listings", "reviews"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ flex: 1, padding: "16px", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2.5px solid #2BA8E0" : "2.5px solid transparent", fontSize: "13px", fontWeight: 700, color: activeTab === tab ? "#000000" : "#9CA3AF", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize", letterSpacing: "0.05em", transition: "color 0.15s" }}>
                    {tab === "listings" ? `Active Listings (${properties.length})` : `Reviews (${reviews.length})`}
                  </button>
                ))}
              </div>

              <div style={{ padding: "28px" }}>
                {activeTab === "listings" ? (
                  properties.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: "14px", padding: "40px" }}>No active listings at the moment.</p>
                  ) : (
                    <div className="as-listings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      {properties.map(p => <PropCard key={p.id} p={p} />)}
                    </div>
                  )
                ) : (
                  <div>
                    {/* Rating summary */}
                    <div style={{ display: "flex", gap: "28px", alignItems: "center", padding: "20px", background: "#F8F6F1", borderRadius: "14px", marginBottom: "22px" }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "52px", fontWeight: 600, color: "#2BA8E0", lineHeight: 1 }}>{agent.rating}</p>
                        <Stars rating={agent.rating} size={14} />
                        <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>{agent.reviews_count} reviews</p>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                        {ratingBreakdown.map(rb => (
                          <div key={rb.star} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", width: "8px", textAlign: "right" }}>{rb.star}</span>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#2BA8E0" stroke="#2BA8E0" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            <div style={{ flex: 1, height: "6px", background: "rgba(13,43,31,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${rb.pct}%`, background: "#2BA8E0", borderRadius: "3px", transition: "width 0.4s" }} />
                            </div>
                            <span style={{ fontSize: "10px", color: "#9CA3AF", width: "26px" }}>{rb.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Review cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {reviews.map((r, i) => <ReviewCard key={i} r={r} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COL — sticky sidebar */}
          <div className="as-right" style={{ position: "sticky", top: "84px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Contact card */}
            <div id="send-message" style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "26px 22px", boxShadow: "0 4px 20px rgba(13,43,31,0.06)" }}>
              <div style={{ marginBottom: "16px" }}><Eyebrow label="Get in Touch" /></div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#000000", marginBottom: "18px" }}>Message {agent.full_name.split(" ")[0]}</h3>
              <ContactForm agent={agent} />
            </div>

            {/* Quick contact */}
            <div style={{ background: "#000000", borderRadius: "14px", padding: "20px 18px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(201,168,76,0.55)", textTransform: "uppercase", marginBottom: "14px" }}>Quick Contact</p>
              {[
                { icon: "📞", label: "Call directly", value: agent.phone, href: `tel:${agent.phone}` },
                { icon: "✉️", label: "Email",         value: agent.email, href: `mailto:${agent.email}` },
              ].map(c => (
                <a key={c.label} href={c.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 0", borderBottom: "1px solid rgba(245,242,236,0.06)", textDecoration: "none" }}>
                  <span style={{ fontSize: "16px" }}>{c.icon}</span>
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{c.label}</p>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(245,242,236,0.75)" }}>{c.value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Share */}
            <button onClick={() => typeof navigator !== "undefined" && navigator.clipboard?.writeText(window.location.href)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "10px", fontSize: "12px", fontWeight: 600, color: "#6B7C72", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Profile
            </button>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="as-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="as-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#2BA8E0" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px" }}>India's most trusted premium real estate platform. Every agent RERA verified.</p>
              </div>
              {[
                { heading: "Find Agents", links: [["All Agents","/agents"],["Hyderabad","/agents?city=Hyderabad"],["Mumbai","/agents?city=Mumbai"],["Join Network","/agent-register"]] },
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
