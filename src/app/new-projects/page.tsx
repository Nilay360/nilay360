"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
type Project = {
  id: string;
  name: string;
  developer: string;
  location: string;
  city: string;
  price_from: number;
  property_type: string;
  status: "new_launch" | "under_construction" | "ready";
  units_total: number;
  units_available: number;
  possession_date: string;
  possession_year: number;
  rera_number: string;
  configurations: string;
  image: string;
  featured: boolean;
};

// ── Placeholder data ──────────────────────────────────────────
const PLACEHOLDER_PROJECTS: Project[] = [
  {
    id: "p1", name: "Prestige Luminary", developer: "Prestige Group",
    location: "Kokapet, Hyderabad", city: "Hyderabad",
    price_from: 22500000, property_type: "Apartments",
    status: "new_launch", units_total: 480, units_available: 312,
    possession_date: "Dec 2027", possession_year: 2027,
    rera_number: "P02400003621", configurations: "3 & 4 BHK",
    image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80", featured: true,
  },
  {
    id: "p2", name: "Sobha Neopolis", developer: "Sobha Realty",
    location: "Financial District, Hyderabad", city: "Hyderabad",
    price_from: 18500000, property_type: "Apartments",
    status: "under_construction", units_total: 622, units_available: 218,
    possession_date: "Mar 2026", possession_year: 2026,
    rera_number: "P02400004812", configurations: "2, 3 & 4 BHK",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", featured: false,
  },
  {
    id: "p3", name: "Lodha Malabar", developer: "Lodha Group",
    location: "Worli, Mumbai", city: "Mumbai",
    price_from: 95000000, property_type: "Apartments",
    status: "new_launch", units_total: 144, units_available: 97,
    possession_date: "Jun 2028", possession_year: 2028,
    rera_number: "P51900048221", configurations: "3, 4 & 5 BHK",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", featured: false,
  },
  {
    id: "p4", name: "Brigade Insignia", developer: "Brigade Group",
    location: "Yelahanka, Bengaluru", city: "Bengaluru",
    price_from: 12800000, property_type: "Villas",
    status: "new_launch", units_total: 96, units_available: 72,
    possession_date: "Sep 2027", possession_year: 2027,
    rera_number: "PRM/KA/RERA/1251/310/PR/2024/007823", configurations: "4 & 5 BHK Villas",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", featured: false,
  },
  {
    id: "p5", name: "DLF The Camellias 2", developer: "DLF Limited",
    location: "Golf Course Road, Gurugram", city: "Delhi NCR",
    price_from: 150000000, property_type: "Apartments",
    status: "new_launch", units_total: 88, units_available: 61,
    possession_date: "Dec 2028", possession_year: 2028,
    rera_number: "RC/REP/HARERA/GGM/2024/288", configurations: "4 & 5 BHK Penthouses",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", featured: false,
  },
  {
    id: "p6", name: "Godrej Reserve", developer: "Godrej Properties",
    location: "Whitefield, Bengaluru", city: "Bengaluru",
    price_from: 9800000, property_type: "Apartments",
    status: "under_construction", units_total: 740, units_available: 489,
    possession_date: "Mar 2026", possession_year: 2026,
    rera_number: "PRM/KA/RERA/1251/310/PR/2023/006142", configurations: "2 & 3 BHK",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", featured: false,
  },
  {
    id: "p7", name: "Mahindra Eden", developer: "Mahindra Lifespaces",
    location: "Kandivali East, Mumbai", city: "Mumbai",
    price_from: 16500000, property_type: "Apartments",
    status: "ready", units_total: 310, units_available: 44,
    possession_date: "Ready to Move", possession_year: 2024,
    rera_number: "P51800054817", configurations: "2 & 3 BHK",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80", featured: false,
  },
  {
    id: "p8", name: "Shapoorji Parkwest 2", developer: "Shapoorji Pallonji",
    location: "Binnypet, Bengaluru", city: "Bengaluru",
    price_from: 11200000, property_type: "Plots",
    status: "new_launch", units_total: 210, units_available: 187,
    possession_date: "Jun 2026", possession_year: 2026,
    rera_number: "PRM/KA/RERA/1251/310/PR/2024/008901", configurations: "1200–3600 sqft Plots",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", featured: false,
  },
];

const DEVELOPERS = [
  { name: "Prestige Group",       logo: "PG", projects: 48, years: 38, cities: "Hyderabad · Bengaluru · Chennai" },
  { name: "Lodha Group",          logo: "LG", projects: 62, years: 35, cities: "Mumbai · Hyderabad · Pune" },
  { name: "Sobha Realty",         logo: "SR", projects: 29, years: 28, cities: "Hyderabad · Bengaluru · Dubai" },
  { name: "Godrej Properties",    logo: "GP", projects: 55, years: 31, cities: "Pan India" },
];

// ── Helpers ───────────────────────────────────────────────────
function fmtINR(v: number): string {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(0)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function statusLabel(s: Project["status"]): string {
  return s === "new_launch" ? "New Launch" : s === "under_construction" ? "Under Construction" : "Ready to Move";
}
function statusColor(s: Project["status"]): string {
  return s === "new_launch" ? "#10C4C3" : s === "under_construction" ? "#3B82F6" : "#10B981";
}
function statusBg(s: Project["status"]): string {
  return s === "new_launch" ? "#020C1C" : s === "under_construction" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)";
}

function Eyebrow({ label, light = false }: { label: string; light?: boolean }) {
  const c = light ? "rgba(201,168,76,0.55)" : "rgba(201,168,76,0.55)";
  const tc = "#10C4C3";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ width: "26px", height: "1px", background: c }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: tc, textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "26px", height: "1px", background: c }} />
    </div>
  );
}

// ── Interest Modal ────────────────────────────────────────────
function InterestModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  if (!project) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const supabase = createClient();
      await supabase.from("project_enquiries").insert({
        project_id: project!.id, project_name: project!.name,
        ...form, created_at: new Date().toISOString(),
      });
    } catch (_) {}
    setSent(true);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(5,8,12,0.72)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", zIndex: 2, background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "460px", padding: "36px", boxShadow: "0 32px 80px rgba(5,8,12,0.28)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(13,43,31,0.06)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#6B7C72" }}>×</button>
        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>✅</div>
            <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "24px", color: "#020C1C", marginBottom: "8px" }}>Interest Registered!</h3>
            <p style={{ fontSize: "13px", color: "#6B7C72", lineHeight: 1.7 }}>Our project advisor will contact you within 24 hours with detailed brochures, pricing, and floor plans for <strong>{project.name}</strong>.</p>
            <button onClick={onClose} style={{ marginTop: "22px", padding: "10px 28px", background: "#020C1C", border: "none", borderRadius: "8px", color: "#10C4C3", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "22px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#10C4C3", textTransform: "uppercase", marginBottom: "4px" }}>{project.developer}</p>
              <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#020C1C" }}>Register Interest — {project.name}</h3>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Your full name" },
                { label: "Email Address", key: "email", type: "email", placeholder: "you@email.com" },
                { label: "Phone (+91)", key: "phone", type: "tel", placeholder: "98765 43210" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} required value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "13px", color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Message (optional)</label>
                <textarea placeholder="Any specific requirements…" rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "13px", color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none", resize: "vertical" }} />
              </div>
              <button type="submit" style={{ padding: "13px", background: "#10C4C3", border: "none", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>
                Register My Interest →
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────
function ProjectCard({ p, onInterest }: { p: Project; onInterest: (p: Project) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 20px 52px rgba(13,43,31,0.12)" : "0 2px 8px rgba(13,43,31,0.04)", transform: hover ? "translateY(-5px)" : "none", transition: "all 0.25s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {/* Image */}
      <div style={{ position: "relative", height: "210px", overflow: "hidden" }}>
        <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.45) 0%, transparent 60%)" }} />
        {/* Status badge */}
        <span style={{ position: "absolute", top: "12px", left: "12px", padding: "4px 11px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: statusBg(p.status), color: statusColor(p.status), border: `1px solid ${statusColor(p.status)}33`, backdropFilter: "blur(8px)" }}>
          {statusLabel(p.status)}
        </span>
        {/* RERA badge */}
        <span style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", backdropFilter: "blur(8px)" }}>
          ✓ RERA
        </span>
        {/* Developer pill */}
        <span style={{ position: "absolute", bottom: "12px", left: "12px", padding: "4px 11px", borderRadius: "100px", fontSize: "10px", fontWeight: 600, background: "rgba(5,8,12,0.65)", color: "rgba(245,242,236,0.85)", backdropFilter: "blur(8px)" }}>
          {p.developer}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 18px" }}>
        <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#020C1C", marginBottom: "4px", lineHeight: 1.3 }}>{p.name}</h3>
        <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#9CA3AF", marginBottom: "14px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {p.location}
        </p>

        {/* Price */}
        <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#10C4C3", marginBottom: "12px" }}>
          Starting {fmtINR(p.price_from)}
        </p>

        {/* Key info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          {[
            { icon: "🏠", label: "Config",      value: p.configurations },
            { icon: "📅", label: "Possession",  value: p.possession_date },
            { icon: "🏗", label: "Units Avail", value: `${p.units_available} of ${p.units_total}` },
            { icon: "📋", label: "RERA",         value: p.rera_number.slice(0, 14) + "…" },
          ].map(r => (
            <div key={r.label} style={{ background: "#F8F6F1", borderRadius: "8px", padding: "8px 10px" }}>
              <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "2px" }}>{r.icon} {r.label}</p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#020C1C", lineHeight: 1.3 }}>{r.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <a href={`/new-projects/${p.id}`} style={{ flex: 1, padding: "10px", background: "#020C1C", borderRadius: "8px", color: "#10C4C3", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
            View Details
          </a>
          <button onClick={() => onInterest(p)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.15)", borderRadius: "8px", color: "#020C1C", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>
            Register Interest
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function NewProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(PLACEHOLDER_PROJECTS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [possessionFilter, setPossessionFilter] = useState("all");
  const [interestProject, setInterestProject] = useState<Project | null>(null);
  const [alertForm, setAlertForm] = useState({ email: "", city: "", type: "" });
  const [alertSent, setAlertSent] = useState(false);

  const featured = projects.find(p => p.featured) ?? projects[0];

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("new_projects")
          .select("*")
          .eq("status", "active")
          .order("featured", { ascending: false })
          .limit(20);
        if (data && data.length > 0) setProjects(data);
      } catch (_) {}
    }
    load();
  }, []);

  // Client-side filter
  const filtered = projects.filter(p => {
    if (typeFilter !== "All" && p.property_type !== typeFilter) return false;
    if (cityFilter !== "All Cities" && !p.city.includes(cityFilter)) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.developer.toLowerCase().includes(search.toLowerCase()) &&
        !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (budgetFilter === "under1" && p.price_from >= 1_00_00_000) return false;
    if (budgetFilter === "1-3"    && (p.price_from < 1_00_00_000 || p.price_from >= 3_00_00_000)) return false;
    if (budgetFilter === "3-10"   && (p.price_from < 3_00_00_000 || p.price_from >= 10_00_00_000)) return false;
    if (budgetFilter === "above10" && p.price_from < 10_00_00_000) return false;
    if (possessionFilter === "rtm"  && p.status !== "ready") return false;
    if (possessionFilter === "2025" && p.possession_year !== 2025) return false;
    if (possessionFilter === "2026" && p.possession_year !== 2026) return false;
    if (possessionFilter === "2027" && p.possession_year !== 2027) return false;
    return true;
  });

  async function handleAlertSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const supabase = createClient();
      await supabase.from("launch_alerts").insert({ ...alertForm, created_at: new Date().toISOString() });
    } catch (_) {}
    setAlertSent(true);
  }

  const PILL_BTN = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{ padding: "8px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: active ? "#020C1C" : "rgba(245,242,236,0.06)", border: active ? "none" : "1px solid rgba(245,242,236,0.14)", color: active ? "#10C4C3" : "rgba(245,242,236,0.55)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", transition: "all 0.18s" }}>
      {label}
    </button>
  );

  const SEL = (value: string, onChange: (v: string) => void, opts: [string, string][], placeholder: string) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "9px 32px 9px 14px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: value === "all" ? "#9CA3AF" : "#020C1C", fontFamily: "'Cal Sans', sans-serif", cursor: "pointer", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
      <option value="all">{placeholder}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Cal Sans', system-ui, sans-serif; background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder, textarea::placeholder { color: #9CA3AF; }
        input:focus, textarea:focus, select:focus { border-color: rgba(201,168,76,0.5) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        @media (max-width: 768px) {
          .np-hero { padding: 80px 16px 48px !important; }
          .np-filters { padding: 24px 16px !important; }
          .np-filters-row { flex-wrap: wrap !important; gap: 10px !important; }
          .np-filters-row select { width: 100% !important; }
          .np-grid { grid-template-columns: 1fr !important; padding: 0 16px !important; gap: 16px !important; }
          .np-developers { padding: 48px 16px !important; }
          .np-dev-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .np-why { padding: 48px 16px !important; }
          .np-why-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .np-alert { padding: 48px 16px !important; }
          .np-footer { padding: 48px 16px 0 !important; }
          .np-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .np-dev-grid { grid-template-columns: 1fr !important; }
          .np-why-grid { grid-template-columns: 1fr !important; }
          .np-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="np-hero" style={{ paddingTop: "64px", background: "#020C1C", minHeight: "520px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          {/* Grid texture */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          {/* Glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 130%, rgba(201,168,76,0.12) 0%, transparent 55%)", pointerEvents: "none" }} />
          {/* Dot pattern right */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40%", backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", maskImage: "linear-gradient(to left, rgba(0,0,0,0.4), transparent)" }} />

          <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "72px 48px", textAlign: "center" }}>
            <div style={{ animation: "fadeUp 0.5s ease-out both" }}>
              <Eyebrow label="New Launches 2025" />
            </div>
            <h1 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(44px, 6.5vw, 80px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.08, marginBottom: "16px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Discover New<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Projects</em>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", marginBottom: "40px", animation: "fadeUp 0.5s 0.18s ease-out both" }}>
              RERA approved launches from India's finest developers
            </p>

            {/* Search bar */}
            <div style={{ maxWidth: "580px", margin: "0 auto 28px", position: "relative", animation: "fadeUp 0.5s 0.24s ease-out both" }}>
              <input type="text" placeholder="Search by project, developer or location…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "16px 56px 16px 20px", background: "rgba(245,242,236,0.06)", border: "1.5px solid rgba(245,242,236,0.14)", borderRadius: "12px", fontSize: "14px", color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none", backdropFilter: "blur(8px)" }} />
              <svg style={{ position: "absolute", right: "18px", top: "50%", transform: "translateY(-50%)", opacity: 0.45 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#020C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>

            {/* Type filter pills */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", animation: "fadeUp 0.5s 0.3s ease-out both" }}>
              {["All", "Apartments", "Villas", "Commercial", "Plots"].map(t => PILL_BTN(t, typeFilter === t, () => setTypeFilter(t)))}
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "48px", paddingTop: "28px", borderTop: "1px solid rgba(245,242,236,0.06)", animation: "fadeUp 0.5s 0.36s ease-out both" }}>
              {[["240+", "Active Projects"], ["48", "Top Developers"], ["12", "Cities Covered"], ["₹500Cr+", "Value Listed"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "28px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED LAUNCH ────────────────────────────────── */}
        {featured && (
          <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
              <Eyebrow label="Featured Launch" />
            </div>
            <div style={{ borderRadius: "22px", overflow: "hidden", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", minHeight: "420px", boxShadow: "0 24px 72px rgba(13,43,31,0.16)", border: "1px solid rgba(13,43,31,0.08)" }}>
              {/* Image side */}
              <div style={{ position: "relative", overflow: "hidden" }}>
                <img src={featured.image} alt={featured.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(13,43,31,0.6) 0%, transparent 60%)" }} />
                {/* Badge */}
                <div style={{ position: "absolute", top: "22px", left: "22px", display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#10C4C3", borderRadius: "100px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "#020C1C", textTransform: "uppercase" }}>★ Featured Launch</span>
                </div>
                {/* RERA */}
                <div style={{ position: "absolute", bottom: "22px", left: "22px", padding: "5px 12px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "100px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981" }}>✓ RERA Approved · {featured.rera_number}</span>
                </div>
              </div>
              {/* Info side */}
              <div style={{ background: "#020C1C", padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "#10C4C3", textTransform: "uppercase", marginBottom: "6px" }}>{featured.developer}</p>
                  <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 400, color: "#020C1C", lineHeight: 1.2, marginBottom: "8px" }}>{featured.name}</h2>
                  <p style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "rgba(245,242,236,0.4)", marginBottom: "24px" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {featured.location}
                  </p>
                  <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "32px", fontWeight: 600, color: "#10C4C3", marginBottom: "24px" }}>
                    Starting {fmtINR(featured.price_from)}
                  </p>
                  {/* Highlights */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "28px" }}>
                    {[
                      { label: "Configuration",   value: featured.configurations },
                      { label: "Total Units",      value: featured.units_total.toString() },
                      { label: "Available Units",  value: featured.units_available.toString() },
                      { label: "Possession",       value: featured.possession_date },
                    ].map(r => (
                      <div key={r.label} style={{ padding: "10px 12px", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: "9px" }}>
                        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: "3px" }}>{r.label}</p>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(245,242,236,0.85)" }}>{r.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <a href={`/new-projects/${featured.id}`} style={{ flex: 1, padding: "13px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}>
                      View Project →
                    </a>
                    <button onClick={() => setInterestProject(featured)} style={{ flex: 1, padding: "13px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>
                      Register Interest
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── FILTERS ROW ────────────────────────────────────── */}
        <div className="np-filters" style={{ maxWidth: "1280px", margin: "0 auto", padding: "44px 48px 0" }}>
          <div className="np-filters-row" style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "14px", padding: "18px 22px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(13,43,31,0.04)" }}>
            {/* City tabs */}
            <div style={{ display: "flex", gap: "4px", background: "#F8F6F1", borderRadius: "9px", padding: "3px" }}>
              {["All Cities", "Hyderabad", "Mumbai", "Bengaluru", "Delhi NCR"].map(c => (
                <button key={c} onClick={() => setCityFilter(c)} style={{ padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, background: cityFilter === c ? "#020C1C" : "transparent", color: cityFilter === c ? "#10C4C3" : "#6B7C72", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ width: "1px", height: "28px", background: "rgba(13,43,31,0.08)", flexShrink: 0 }} />
            {SEL(budgetFilter, setBudgetFilter, [["under1","Under ₹1 Cr"],["1-3","₹1–3 Cr"],["3-10","₹3–10 Cr"],["above10","Above ₹10 Cr"]], "Any Budget")}
            {SEL(possessionFilter, setPossessionFilter, [["rtm","Ready to Move"],["2025","2025"],["2026","2026"],["2027","2027"]], "Possession Year")}
            <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "#9CA3AF" }}>
              {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
            </span>
          </div>
        </div>

        {/* ── PROJECTS GRID ──────────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 48px 72px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "28px", color: "#020C1C", marginBottom: "8px" }}>No projects match your filters</p>
              <button onClick={() => { setCityFilter("All Cities"); setBudgetFilter("all"); setPossessionFilter("all"); setTypeFilter("All"); setSearch(""); }}
                style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Clear all filters</button>
            </div>
          ) : (
            <div className="np-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px" }}>
              {filtered.map(p => <ProjectCard key={p.id} p={p} onInterest={setInterestProject} />)}
            </div>
          )}
        </section>

        {/* ── DEVELOPER SPOTLIGHT ────────────────────────────── */}
        <section className="np-developers" style={{ background: "#F8F6F1", padding: "72px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "44px" }}>
              <Eyebrow label="Trusted Partners" />
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
                Featured<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Developers</em>
              </h2>
            </div>
            <div className="np-dev-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
              {DEVELOPERS.map((d, i) => {
                const [hover, setHover] = useState(false);
                return (
                  <div key={d.name} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                    style={{ background: hover ? "#020C1C" : "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "28px 22px", textAlign: "center", transition: "all 0.22s", boxShadow: hover ? "0 20px 52px rgba(13,43,31,0.14)" : "0 2px 8px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none", cursor: "pointer" }}>
                    {/* Logo placeholder */}
                    <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: hover ? "rgba(201,168,76,0.1)" : "#F8F6F1", border: hover ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(13,43,31,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 700, color: "#10C4C3", transition: "all 0.22s" }}>
                      {d.logo}
                    </div>
                    <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "18px", fontWeight: 600, color: hover ? "#020C1C" : "#020C1C", marginBottom: "4px", transition: "color 0.22s" }}>{d.name}</h3>
                    <p style={{ fontSize: "11px", color: hover ? "rgba(245,242,236,0.35)" : "#9CA3AF", marginBottom: "14px", transition: "color 0.22s" }}>{d.cities}</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "14px" }}>
                      {[["Projects", d.projects], ["Years Exp.", d.years]].map(([l, v]) => (
                        <div key={String(l)}>
                          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
                          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: hover ? "rgba(245,242,236,0.3)" : "#9CA3AF", textTransform: "uppercase" }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "100px", background: hover ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", fontSize: "9px", fontWeight: 800, color: "#10B981", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      ✓ Verified Developer
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── WHY BUY NEW ────────────────────────────────────── */}
        <section className="np-why" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ textAlign: "center", marginBottom: "44px" }}>
            <Eyebrow label="The Advantage" />
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#020C1C" }}>
              Why Buy a<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>New Project?</em>
            </h2>
          </div>
          <div className="np-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {[
              {
                icon: "🛡", color: "#059669", bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.12)",
                title: "RERA Protection",
                desc: "Every new project is mandatorily registered under RERA, ensuring legal compliance, delivery timelines, and your money is fully protected.",
                points: ["Builder accountability", "Escrow-protected funds", "Penalty for delays"],
              },
              {
                icon: "✨", color: "#10C4C3", bg: "rgba(201,168,76,0.06)", border: "rgba(201,168,76,0.15)",
                title: "Modern Amenities",
                desc: "New launches feature contemporary design, smart home integration, EV charging, co-working spaces, and resort-style lifestyle amenities.",
                points: ["Smart home tech", "EV charging bays", "Wellness centres"],
              },
              {
                icon: "💰", color: "#3B82F6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)",
                title: "Better Financing",
                desc: "Banks offer preferential home loan rates for RERA-approved new projects. Construction-linked payment plans ease the financial burden.",
                points: ["Lower EMI rates", "Flexi payment plans", "Tax benefits u/s 80C"],
              },
              {
                icon: "📈", color: "#8B5CF6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)",
                title: "Higher Appreciation",
                desc: "Buying at launch-stage pricing typically yields 20–35% capital appreciation by possession, as the project nears completion and demand rises.",
                points: ["Pre-launch discounts", "20–35% avg gain", "Rental yield from day 1"],
              },
            ].map(b => (
              <div key={b.title} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: "18px", padding: "28px 24px" }}>
                <div style={{ fontSize: "28px", marginBottom: "14px" }}>{b.icon}</div>
                <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#020C1C", marginBottom: "10px" }}>{b.title}</h3>
                <p style={{ fontSize: "12.5px", color: "#6B7C72", lineHeight: 1.75, marginBottom: "16px" }}>{b.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {b.points.map(pt => (
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

        {/* ── PRE-LAUNCH ALERTS ──────────────────────────────── */}
        <section className="np-alert" style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
            <Eyebrow label="Stay Ahead" />
            <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.15, marginBottom: "12px" }}>
              Be First<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>to Know</em>
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.45)", lineHeight: 1.75, marginBottom: "40px" }}>
              Get exclusive pre-launch alerts for new RERA-approved projects before they go public. Pre-launch prices are typically 15–20% lower.
            </p>

            {alertSent ? (
              <div style={{ padding: "32px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "16px" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎉</div>
                <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", color: "#020C1C", marginBottom: "6px" }}>You're on the list!</p>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)" }}>We'll alert you the moment a matching pre-launch goes live in your preferred city.</p>
              </div>
            ) : (
              <form onSubmit={handleAlertSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input type="email" placeholder="Your email address" required value={alertForm.email} onChange={e => setAlertForm(p => ({ ...p, email: e.target.value }))}
                    style={{ padding: "14px 16px", background: "rgba(245,242,236,0.06)", border: "1.5px solid rgba(245,242,236,0.1)", borderRadius: "10px", fontSize: "13px", color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none" }} />
                  <select value={alertForm.city} onChange={e => setAlertForm(p => ({ ...p, city: e.target.value }))} required
                    style={{ padding: "14px 16px", background: "rgba(245,242,236,0.06)", border: "1.5px solid rgba(245,242,236,0.1)", borderRadius: "10px", fontSize: "13px", color: alertForm.city ? "#020C1C" : "rgba(245,242,236,0.35)", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}>
                    <option value="" disabled>Preferred City</option>
                    {["Hyderabad", "Mumbai", "Bengaluru", "Delhi NCR", "Chennai", "Pune", "Any City"].map(c => (
                      <option key={c} value={c} style={{ color: "#020C1C", background: "#fff" }}>{c}</option>
                    ))}
                  </select>
                </div>
                <select value={alertForm.type} onChange={e => setAlertForm(p => ({ ...p, type: e.target.value }))} required
                  style={{ padding: "14px 16px", background: "rgba(245,242,236,0.06)", border: "1.5px solid rgba(245,242,236,0.1)", borderRadius: "10px", fontSize: "13px", color: alertForm.type ? "#020C1C" : "rgba(245,242,236,0.35)", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}>
                  <option value="" disabled>Property Type Preference</option>
                  {["Apartments", "Villas", "Plots", "Commercial", "Any Type"].map(t => (
                    <option key={t} value={t} style={{ color: "#020C1C", background: "#fff" }}>{t}</option>
                  ))}
                </select>
                <button type="submit" style={{ padding: "15px", background: "#10C4C3", border: "none", borderRadius: "10px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                  Subscribe to Pre-Launch Alerts
                </button>
                <p style={{ fontSize: "11px", color: "rgba(245,242,236,0.25)" }}>We respect your privacy. No spam — only relevant project alerts.</p>
              </form>
            )}
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 48px" }}>
          <div style={{ background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "22px", padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.06) 1px, transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <Eyebrow label="Get Started" />
              <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 400, color: "#020C1C", marginBottom: "14px" }}>
                Ready to Invest in<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>India's Finest Projects?</em>
              </h2>
              <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.75, marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px" }}>
                Our project advisors have deep expertise across every developer and micro-market. Get a personalized project recommendation today.
              </p>
              <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/contact" style={{ padding: "14px 36px", background: "#020C1C", borderRadius: "9px", color: "#10C4C3", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  Talk to a Project Advisor
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </a>
                <a href="/calculator" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.15)", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                  EMI Calculator
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="np-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="np-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's most trusted premium real estate platform. Every listing verified, every project curated.</p>
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
                { heading: "New Projects",  links: [["All Projects","/new-projects"],["Hyderabad","/locations/hyderabad"],["Mumbai","/locations/mumbai"],["Bengaluru","/locations/bengaluru"]] },
                { heading: "Company",       links: [["About Us","/about"],["Blog","/blog"],["NRI Services","/nri"],["Contact","/contact"]] },
                { heading: "Tools",         links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["Locations","/locations"]] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginBottom: "18px" }}>{col.heading}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {col.links.map(([l, h]) => <a key={l} href={h} style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>)}
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

      {/* ── INTEREST MODAL ─────────────────────────────────── */}
      <InterestModal project={interestProject} onClose={() => setInterestProject(null)} />
    </>
  );
}
