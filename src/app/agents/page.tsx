"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Real data shape ─────────────────────────────────────────────
// Rebuilt 2026-08-29 against agent_profiles — the real, canonical agent
// table (2 real approved agents; backs the live become-an-agent →
// admin-approval → dashboard-self-edit flow). The earlier version of this
// page queried `agents`, which was dead schema (0 real rows) — see
// project memory for the full agents-vs-agent_profiles resolution.
//
// agent_profiles has no rating/review_count/specialisations/cities[]/
// is_verified/is_featured — those fields simply don't exist on the real
// table, so they are not displayed here. Only real fields: license number,
// agency name, bio, years of experience, and cities served (via the real
// agent_service_cities join table).
type Agent = {
  id: string;
  slug: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  email: string | null;
  agency_name: string | null;
  license_number: string | null;
  years_experience: number | null;
  cities_served: string[];
};

type AgentProfileRow = {
  id: string;
  slug: string;
  user_id: string;
  agency_name: string | null;
  license_number: string | null;
  years_experience: number | null;
  bio: string | null;
  agent_service_cities: { city: string }[] | null;
};

// Real public contact fields, from the `public_agent_contact` view
// (migration 016) — deliberately NOT a `profiles!inner(...)` embed. RLS
// policies gate rows, not columns, and `profiles` has genuinely sensitive
// columns (budget_min, date_of_birth, gender, etc.) that a bare row policy
// can't hide from every role. The view exposes only what these pages
// actually render, confirmed by reading the code, not guessed.
type ContactRow = {
  id: string; full_name: string | null; avatar_url: string | null;
  bio: string | null; city: string | null; phone: string | null; whatsapp: string | null; email: string | null;
};

function mapAgent(row: AgentProfileRow, contact: ContactRow | undefined): Agent {
  const cities = (row.agent_service_cities ?? []).map(c => c.city);
  return {
    id: row.id,
    slug: row.slug,
    full_name: contact?.full_name || "Unnamed Agent",
    phone: contact?.phone ?? null,
    avatar_url: contact?.avatar_url ?? null,
    bio: contact?.bio || row.bio || null,
    city: contact?.city || cities[0] || null,
    email: contact?.email ?? null,
    agency_name: row.agency_name,
    license_number: row.license_number,
    years_experience: row.years_experience,
    cities_served: cities,
  };
}

function avatarColorFor(id: string): string {
  const palette = ["#000000", "#1E3A5F", "#3B1F5F", "#5F1F3B", "#1F4D2B", "#4D2B00", "#001F4D", "#2B1F5F", "#0D3B1F", "#3B0D1F", "#1A0D2B", "#0D1F3B"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
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

// ── Agent Grid Card ───────────────────────────────────────────
function AgentCard({ a }: { a: Agent }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "#020C1C" : "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "22px 18px", textAlign: "center", transition: "all 0.22s", boxShadow: hover ? "0 16px 44px rgba(13,43,31,0.14)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none", cursor: "pointer" }}>
      {/* Avatar */}
      <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: avatarColorFor(a.id), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(13,43,31,0.15)", overflow: "hidden" }}>
          {a.avatar_url ? (
            <img src={a.avatar_url} alt={a.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-body-new)", fontSize: "22px", fontWeight: 600, color: "#10C4C3" }}>{initials(a.full_name)}</span>
          )}
        </div>
      </div>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: hover ? "#FFFFFF" : "#020C1C", marginBottom: "3px", transition: "color 0.22s" }}>{a.full_name}</h3>
      {a.agency_name && <p style={{ fontSize: "11px", color: hover ? "#10C4C3" : "#10C4C3", fontWeight: 600, marginBottom: "4px" }}>{a.agency_name}</p>}
      {a.city && (
        <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", fontSize: "11px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", marginBottom: "10px" }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {a.city}
        </p>
      )}
      <p style={{ fontSize: "11px", color: hover ? "rgba(245,242,236,0.4)" : "#9CA3AF", marginBottom: "14px" }}>
        {a.years_experience != null ? `${a.years_experience}yr experience` : "Nilay 360 Agent"}
      </p>
      <a href={`/agents/${a.slug}`} style={{ display: "block", padding: "9px", background: hover ? "rgba(16,196,195,0.12)" : "#F8F6F1", border: hover ? "1px solid rgba(16,196,195,0.25)" : "1px solid rgba(13,43,31,0.08)", borderRadius: "8px", color: hover ? "#10C4C3" : "#020C1C", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", transition: "all 0.22s" }}>
        View Profile
      </a>
    </div>
  );
}

// ── SEL helper ────────────────────────────────────────────────
function Sel({ value, onChange, opts, placeholder }: { value: string; onChange: (v: string) => void; opts: [string,string][]; placeholder: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "10px 36px 10px 14px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: value ? "#020C1C" : "#9CA3AF", fontFamily: "var(--font-body-new)", cursor: "pointer", outline: "none", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
      <option value="">{placeholder}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(false);
  const [search, setSearch]           = useState("");
  const [cityFilter, setCityFilter]   = useState("");
  const [page, setPage]               = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("agent_profiles")
          .select("id, slug, user_id, agency_name, license_number, years_experience, bio, agent_service_cities(city)")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(40);
        if (error) {
          setLoadError(true);
        } else {
          const rows = (data as unknown as AgentProfileRow[]) ?? [];
          const userIds = rows.map(r => r.user_id);
          const { data: contacts } = userIds.length > 0
            ? await supabase.from("public_agent_contact").select("id, full_name, avatar_url, bio, city, phone, whatsapp, email").in("id", userIds)
            : { data: [] as ContactRow[] };
          const contactMap = new Map(((contacts ?? []) as unknown as ContactRow[]).map(c => [c.id, c]));
          setAgents(rows.map(r => mapAgent(r, contactMap.get(r.user_id))));
        }
      } catch (_) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = agents.filter(a => {
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) && !(a.agency_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && a.city !== cityFilter && !a.cities_served.includes(cityFilter)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function clearFilters() { setSearch(""); setCityFilter(""); setPage(1); }

  // Real, computed hero stats — never fabricated. Blank when there is
  // nothing real to report yet.
  const cityCount = new Set(agents.flatMap(a => [a.city, ...a.cities_served]).filter(Boolean)).size;
  const heroStats: [string, string][] = agents.length > 0
    ? [[String(agents.length), agents.length === 1 ? "Agent" : "Agents"], [String(cityCount), cityCount === 1 ? "City Covered" : "Cities Covered"]]
    : [];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
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
          .ag-all { padding: 40px 16px 56px !important; }
          .ag-all-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
          .ag-become { padding: 56px 16px !important; }
          .ag-become-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ag-cta { padding: 48px 16px !important; }
          .ag-cta-inner { padding: 40px 20px !important; }
        }
        @media (max-width: 480px) {
          .ag-all-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#020C1C", minHeight: "400px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 130%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div className="ag-hero" style={{ position: "relative", zIndex: 2, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "72px 48px", textAlign: "center" }}>
            <div style={{ animation: "fadeUp 0.5s ease-out both" }}><Eyebrow label="Our Expert Team" /></div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(44px, 6.5vw, 78px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.08, marginBottom: "16px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Meet Our<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Agents</em>
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", marginBottom: "48px", animation: "fadeUp 0.5s 0.18s ease-out both" }}>
              Real estate professionals approved through our admin review process
            </p>
            {heroStats.length > 0 && (
              <div className="ag-stats" style={{ display: "flex", justifyContent: "center", gap: "60px", paddingTop: "28px", borderTop: "1px solid rgba(245,242,236,0.06)", animation: "fadeUp 0.5s 0.25s ease-out both" }}>
                {heroStats.map(([v,l]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: "var(--font-support-new)", fontSize: "34px", fontWeight: 600, color: "#10C4C3" }}>{v}</p>
                    <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── SEARCH & FILTERS ───────────────────────────────── */}
        <div className="ag-filters" style={{ maxWidth: "1280px", margin: "0 auto", padding: "44px 48px 0" }}>
          <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "20px 24px", boxShadow: "0 2px 12px rgba(13,43,31,0.04)" }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#020C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search by agent name or agency…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: "100%", padding: "13px 16px 13px 44px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "10px", fontSize: "13px", color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none" }} />
            </div>
            <div className="ag-filter-row" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <Sel value={cityFilter} onChange={v => { setCityFilter(v); setPage(1); }} placeholder="All Cities"
                opts={[["Hyderabad","Hyderabad"],["Mumbai","Mumbai"],["Bengaluru","Bengaluru"],["Delhi NCR","Delhi NCR"],["Chennai","Chennai"],["Pune","Pune"]]} />
              {(search || cityFilter) && (
                <button onClick={clearFilters} style={{ padding: "10px 16px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "9px", fontSize: "12px", fontWeight: 600, color: "#9CA3AF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                  Clear ×
                </button>
              )}
              <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "#9CA3AF" }}>
                {filtered.length} agent{filtered.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>
        </div>

        {/* ── ALL AGENTS GRID ────────────────────────────────── */}
        <section className="ag-all" style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 400, color: "#FFFFFF" }}>
              All Agents <span style={{ color: "#10C4C3", fontStyle: "italic" }}>({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Loading agents…</p>
            </div>
          ) : agents.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", color: "#020C1C", marginBottom: "8px" }}>Agent profiles coming soon</p>
              <p style={{ fontSize: "13px", color: "#6B7C72" }}>
                {loadError
                  ? "We're unable to load agents right now — please check back shortly."
                  : <>We're onboarding agents. Check back soon, or <a href="/become-an-agent" style={{ color: "#10C4C3", fontWeight: 600 }}>apply to join as an agent</a>.</>}
              </p>
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", color: "#020C1C", marginBottom: "8px" }}>No agents match your filters</p>
              <button onClick={clearFilters} style={{ fontSize: "13px", fontWeight: 600, color: "#10C4C3", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="ag-all-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "36px" }}>
                {paginated.map(a => <AgentCard key={a.id} a={a} />)}
              </div>
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: "9px 16px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: page === 1 ? "#D1D5DB" : "#020C1C", cursor: page === 1 ? "default" : "pointer", fontFamily: "var(--font-body-new)" }}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      style={{ width: "38px", height: "38px", borderRadius: "8px", border: "1.5px solid rgba(13,43,31,0.1)", background: page === i + 1 ? "#020C1C" : "#fff", color: page === i + 1 ? "#10C4C3" : "#6B7C72", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: "9px 16px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: page === totalPages ? "#D1D5DB" : "#020C1C", cursor: page === totalPages ? "default" : "pointer", fontFamily: "var(--font-body-new)" }}>Next →</button>
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
            <div>
              <Eyebrow label="Join Our Network" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, color: "#FFFFFF", lineHeight: 1.15, marginBottom: "16px" }}>
                Are You a Real Estate<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Professional?</em>
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.45)", lineHeight: 1.8, marginBottom: "32px" }}>
                Join India's fastest-growing premium real estate platform. Apply below — our admin team reviews every application.
              </p>
              <div style={{ display: "flex", gap: "14px" }}>
                <a href="/become-an-agent" style={{ padding: "14px 32px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  Apply Now →
                </a>
                <a href="/contact" style={{ padding: "14px 28px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.7)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
