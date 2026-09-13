"use client";

// Rebuilt 2026-08-29 against agent_profiles — the real, canonical agent
// table. The dynamic segment is the agent's real `agent_profiles.slug`
// value, matched against the `slug` column (fixed 2026-08-30 — this
// previously matched against `id`, so slug URLs like /agents/ramana-murthy
// 404'd since a slug string isn't a valid uuid). Display fields
// (full_name, phone, bio, etc.) live on `profiles`, joined via `user_id`.
//
// Real fields only: license number, agency name, bio, years of experience,
// cities served (agent_service_cities). No rating/review_count/
// specialisations/is_verified — those don't exist on agent_profiles and
// are not fabricated here.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReportButton from "@/components/shared/ReportButton";
import { optimizedImageUrl } from "@/lib/image-url";
import { useAuth } from "@/context/AuthContext";

type Agent = {
  id: string;
  userId: string;
  full_name: string; city: string | null;
  cities_served: string[];
  agency_name: string | null;
  license_number: string | null;
  years_experience: number | null;
  bio: string | null; phone: string | null; email: string | null; avatar_url: string | null; whatsapp: string | null;
  is_verified_badge: boolean;
  rera_number: string | null;
};

type AgentProfileRow = {
  id: string; user_id: string;
  agency_name: string | null; license_number: string | null; years_experience: number | null; bio: string | null;
  is_verified_badge: boolean;
  rera_number: string | null;
  agent_service_cities: { city: string }[] | null;
};

// Real public contact fields, from the `public_agent_contact` view
// (migration 016) — not a `profiles!inner(...)` embed. See ../page.tsx
// for why: RLS gates rows, not columns, and `profiles` has genuinely
// sensitive fields a bare row policy can't hide from every role.
type ContactRow = {
  id: string; full_name: string | null; avatar_url: string | null;
  bio: string | null; city: string | null; phone: string | null; whatsapp: string | null; email: string | null;
};

function mapAgent(row: AgentProfileRow, contact: ContactRow | undefined): Agent {
  const cities = (row.agent_service_cities ?? []).map(c => c.city);
  return {
    id: row.id,
    userId: row.user_id,
    full_name: contact?.full_name || "Unnamed Agent",
    city: contact?.city || cities[0] || null,
    cities_served: cities,
    agency_name: row.agency_name,
    license_number: row.license_number,
    years_experience: row.years_experience,
    bio: contact?.bio || row.bio || null,
    phone: contact?.phone ?? null,
    email: contact?.email ?? null,
    avatar_url: contact?.avatar_url ?? null,
    whatsapp: contact?.whatsapp ?? null,
    is_verified_badge: row.is_verified_badge,
    rera_number: row.rera_number,
  };
}

function avatarColorFor(id: string): string {
  const palette = ["#000000", "#1E3A5F", "#3B1F5F", "#5F1F3B", "#1F4D2B", "#4D2B00", "#001F4D", "#2B1F5F", "#0D3B1F", "#3B0D1F", "#1A0D2B", "#0D1F3B"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

type Property = { id: string; slug: string; title: string; price: number; type: string; city: string; bedrooms: number; area: number; image: string; listing_type: string };

function initials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function fmtINR(v: number, compact = true): string {
  if (compact) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
    if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(0)} L`;
    return `₹${v.toLocaleString("en-IN")}`;
  }
  return "₹" + v.toLocaleString("en-IN");
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

const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];

function PropCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 12px 36px rgba(13,43,31,0.1)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-3px)" : "none", transition: "all 0.2s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ height: "170px", overflow: "hidden", position: "relative" }}>
        <img src={optimizedImageUrl(p.image, 400)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s" }} />
        <span style={{ position: "absolute", top: "10px", left: "10px", padding: "3px 9px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: p.listing_type === "sale" ? "#10C4C3" : "#3B82F6", color: p.listing_type === "sale" ? "#020C1C" : "#fff" }}>
          {p.listing_type === "sale" ? "For Sale" : "For Rent"}
        </span>
      </div>
      <div style={{ padding: "14px 14px" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#10C4C3", textTransform: "uppercase", marginBottom: "3px" }}>{p.type}</p>
        <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "14px", fontWeight: 600, color: "#020C1C", marginBottom: "6px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h4>
        <p style={{ fontFamily: "var(--font-support-new)", fontSize: "16px", fontWeight: 600, color: "#10C4C3", marginBottom: "6px" }}>{fmtINR(p.price)}{p.listing_type === "rent" ? "/mo" : ""}</p>
        <p style={{ fontSize: "11px", color: "#9CA3AF" }}>🛏 {p.bedrooms} {COMMERCIAL_CATEGORIES.includes(p.type) ? "Rooms" : "BHK"} · 📐 {p.area.toLocaleString("en-IN")} sqft</p>
      </div>
    </a>
  );
}

function ContactForm({ agent, prefillName, prefillEmail, prefillPhone }: { agent: Agent; prefillName?: string | null; prefillEmail?: string | null; prefillPhone?: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Prefill from the signed-in visitor's own session/profile — "only if
  // still blank" rule, same as post-property.tsx's PREFILL_SELLER_EMAIL:
  // never overwrites something already typed into the form.
  useEffect(() => {
    if (prefillName) setForm(f => ({ ...f, name: f.name || prefillName }));
  }, [prefillName]);
  useEffect(() => {
    if (prefillEmail) setForm(f => ({ ...f, email: f.email || prefillEmail }));
  }, [prefillEmail]);
  useEffect(() => {
    if (prefillPhone) setForm(f => ({ ...f, phone: f.phone || prefillPhone }));
  }, [prefillPhone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const supabase = createClient();
      // Real, live table (agent_enquiries never existed in production — every
      // prior submission through this form was silently discarded while
      // showing "Message Sent!" regardless). assigned_to pre-assigns this
      // inquiry directly to the agent, same column /agent/leads already
      // reads from — no new schema, no admin routing step needed.
      const { error } = await supabase.from("inquiries").insert({
        property_id: null,
        property_slug: null,
        property_title: null,
        seller_email: null,
        inquirer_name: form.name,
        inquirer_email: form.email,
        inquirer_phone: form.phone || null,
        message: form.message || null,
        inquiry_type: "agent_contact",
        status: "new",
        assigned_to: agent.id,
      });
      setStatus(error ? "error" : "sent");

      // Notify the agent — fire-and-forget, non-fatal. The inquiry row above
      // is the durable record; a failure here only means the agent finds out
      // via /agent/leads instead of the notification bell, not a lost lead.
      if (!error) {
        fetch("/api/notify-agent-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentUserId: agent.userId,
            name: form.name,
            email: form.email,
            phone: form.phone,
          }),
        }).catch((err) => console.error("[ContactForm] Agent notification failed:", err));
      }
    } catch (_) {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div style={{ padding: "32px", textAlign: "center", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "14px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>✅</div>
        <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", color: "#020C1C", marginBottom: "8px" }}>Message Sent!</p>
        <p style={{ fontSize: "12px", color: "#6B7C72", lineHeight: 1.7 }}>{agent.full_name} will respond within 2 hours during business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {status === "error" && (
        <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "12px", color: "#B91C1C" }}>
          Something went wrong sending your message. Please try again, or call/WhatsApp directly using the details on the right.
        </div>
      )}
      {[
        { label: "Your Name",    key: "name",  type: "text",  placeholder: "Full name" },
        { label: "Email",        key: "email", type: "email", placeholder: "you@email.com" },
        { label: "Phone (+91)",  key: "phone", type: "tel",   placeholder: "98765 43210" },
      ].map(f => (
        <div key={f.key}>
          <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} required value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            style={{ width: "100%", padding: "10px 13px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "8px", fontSize: "13px", color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none" }} />
        </div>
      ))}
      <div>
        <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Message</label>
        <textarea placeholder="I'm looking for a 3BHK in Kokapet under ₹2.5Cr…" rows={4} required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          style={{ width: "100%", padding: "10px 13px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "8px", fontSize: "13px", color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical" }} />
      </div>
      <button type="submit" disabled={status === "sending"} style={{ padding: "13px", background: "#10C4C3", border: "none", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: status === "sending" ? "default" : "pointer", opacity: status === "sending" ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
        {status === "sending" ? "Sending…" : "Send Message →"}
      </button>
    </form>
  );
}

const SHARED_STYLE = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
`;

function AgentNotFound() {
  return (
    <>
      <style>{SHARED_STYLE}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "34px", color: "#fff", marginBottom: "12px" }}>Agent Not Found</p>
          <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.5)", lineHeight: 1.7, marginBottom: "24px" }}>
            This agent profile doesn't exist or is no longer approved. Browse our current agents instead.
          </p>
          <a href="/agents" style={{ display: "inline-block", padding: "12px 28px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Browse Agents</a>
        </div>
      </div>
    </>
  );
}

export default function AgentProfilePage() {
  const params = useParams();
  const agentSlug = (params?.slug as string) ?? "";

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dealsClosed, setDealsClosed] = useState(0);
  const [activeTab, setActiveTab] = useState<"listings">("listings");
  const { user, profile, openAuthModal } = useAuth();
  // Raw contact details (phone/WhatsApp/email) are admin-only — every other
  // viewer, signed out or signed in as any other role, uses the Send Message
  // form instead. Same check already established in admin/page.tsx:2480.
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  useEffect(() => {
    async function load() {
      if (!agentSlug) { setNotFound(true); setLoading(false); return; }
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("agent_profiles")
          .select("id, user_id, agency_name, license_number, years_experience, bio, is_verified_badge, rera_number, agent_service_cities(city)")
          .eq("slug", agentSlug)
          .eq("status", "approved")
          .maybeSingle();

        if (error || !data) { setNotFound(true); setLoading(false); return; }

        const row = data as unknown as AgentProfileRow;
        const { data: contact } = await supabase
          .from("public_agent_contact")
          .select("id, full_name, avatar_url, bio, city, phone, whatsapp, email")
          .eq("id", row.user_id)
          .maybeSingle();

        const loadedAgent = mapAgent(row, (contact as ContactRow | null) ?? undefined);
        setAgent(loadedAgent);

        // Real listings assigned to this agent via property_listings.assigned_agent_id
        const { data: listings } = await supabase.from("property_listings")
          .select("id, slug, title, price, property_category, city, bedrooms, built_up_area, photo_urls, listing_type")
          .eq("assigned_agent_id", loadedAgent.id)
          .eq("status", "active")
          .limit(6);
        if (listings) {
          setProperties((listings as any[]).map(r => ({
            id: r.id, slug: r.slug ?? r.id, title: r.title ?? "Untitled Property",
            price: r.price ?? 0, type: r.property_category ?? "Property", city: r.city ?? "",
            bedrooms: r.bedrooms ?? 0, area: r.built_up_area ?? 0,
            image: Array.isArray(r.photo_urls) && r.photo_urls[0] ? r.photo_urls[0] : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
            listing_type: r.listing_type ?? "sale",
          })));
        }

        // Deals table confirmed live (2026-09-11): stage enum includes
        // 'closed', assigned_to -> agent_profiles.id — a real, direct count,
        // not fabricated or derived from anything else.
        const { count: closedCount } = await supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", loadedAgent.id)
          .eq("stage", "closed");
        setDealsClosed(closedCount ?? 0);
      } catch (_) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentSlug]);

  if (loading) {
    return (
      <>
        <style>{SHARED_STYLE}</style>
        <div style={{ minHeight: "100vh", background: "#020C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.4)" }}>Loading agent profile…</p>
        </div>
      </>
    );
  }

  if (notFound || !agent) return <AgentNotFound />;

  return (
    <>
      <style>{`
        ${SHARED_STYLE}
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

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── NAVBAR ─────────────────────────────────────────── */}
        <nav className="as-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(5,8,12,0.9)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "0.5px solid rgba(16,196,195,0.18)" }}>
          <a href="/" style={{ fontFamily: "var(--font-support-new)", fontSize: "19px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", textDecoration: "none" }}>
            Nilay 360 <span style={{ color: "#10C4C3" }}>·</span>
          </a>
          <div className="as-nav-links" style={{ display: "flex", gap: "2px" }}>
            {[["Home","/"],["Properties","/properties"],["New Projects","/new-projects"],["Agents","/agents"],["Locations","/locations"],["Contact","/contact"]].map(([l,h]) => (
              <a key={l} href={h} style={{ padding: "7px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: l === "Agents" ? "#10C4C3" : "rgba(255,255,255,0.5)", textDecoration: "none", background: l === "Agents" ? "rgba(16,196,195,0.08)" : "transparent" }}>{l}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <a href="/login"    style={{ padding: "8px 18px", borderRadius: "7px", border: "0.5px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</a>
            <a href="/register" style={{ padding: "8px 22px", borderRadius: "7px", background: "#10C4C3", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>List Property</a>
          </div>
        </nav>

        {/* ── AGENT HERO ─────────────────────────────────────── */}
        <section className="as-hero" style={{ paddingTop: "68px", background: "#020C1C", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 30% 120%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 0" }}>
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
              <div style={{ position: "relative" }}>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: avatarColorFor(agent.id), border: "3px solid rgba(201,168,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(5,8,12,0.4)", overflow: "hidden" }}>
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-body-new)", fontSize: "40px", fontWeight: 600, color: "#10C4C3" }}>{initials(agent.full_name)}</span>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 400, color: "#020C1C", lineHeight: 1.1 }}>{agent.full_name}</h1>
                  <span style={{ padding: "4px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#10B981", textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0 }}>✓ Verified Agent</span>
                  {agent.is_verified_badge && (
                    <img
                      src="/brand/nilay360_verified_agent_badge.png"
                      alt="Verified Agent"
                      title="Verified Agent"
                      style={{ height: "44px", width: "auto", flexShrink: 0 }}
                    />
                  )}
                </div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#10C4C3", marginBottom: "8px" }}>
                  {agent.agency_name || "Nilay 360 Agent"}{agent.city ? ` · ${agent.city}` : ""}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "14px" }}>
                  {[
                    agent.city && { icon: "📍", text: agent.city },
                    agent.years_experience != null && { icon: "💼", text: `${agent.years_experience} years experience` },
                    agent.license_number && { icon: "📋", text: `License: ${agent.license_number}` },
                    agent.rera_number && { icon: "🏛️", text: `RERA: ${agent.rera_number}` },
                  ].filter(Boolean).map((item: any) => (
                    <span key={item.text} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "rgba(245,242,236,0.5)" }}>
                      {item.icon} {item.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="as-hero-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "200px" }}>
                {isAdmin && agent.phone && (
                  <a href={`tel:${agent.phone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "13px 22px", background: "#10C4C3", borderRadius: "10px", color: "#020C1C", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.53 2 2 0 0 1 3.71 1.35h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Call Agent
                  </a>
                )}
                {isAdmin && agent.whatsapp && (
                  <a href={`https://wa.me/${agent.whatsapp.replace(/\+/g,"")}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 22px", background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.3)", borderRadius: "10px", color: "#25D366", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    WhatsApp
                  </a>
                )}
                <a href="#send-message" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 22px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.18)", borderRadius: "10px", color: "rgba(245,242,236,0.65)", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Send Message
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ROW (real fields only) ────────────────────── */}
        <section style={{ background: "#020C1C" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 48px" }}>
            <div className="as-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid rgba(245,242,236,0.06)" }}>
              {[
                { label: "Active Listings", value: properties.length, suffix: "" },
                { label: "Deals Closed",    value: dealsClosed, suffix: "" },
                { label: "Years Experience", value: agent.years_experience ?? "—", suffix: agent.years_experience != null ? "yrs" : "" },
                { label: "Cities Served",   value: agent.cities_served.length || (agent.city ? 1 : 0), suffix: "" },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ padding: "28px 20px", borderRight: i < arr.length - 1 ? "1px solid rgba(245,242,236,0.06)" : "none", textAlign: "center" }}>
                  <p style={{ fontFamily: "var(--font-support-new)", fontSize: "38px", fontWeight: 600, color: "#10C4C3", lineHeight: 1 }}>{s.value}<span style={{ fontSize: "20px" }}>{s.suffix}</span></p>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginTop: "6px" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ───────────────────────────────────── */}
        <div className="as-layout" style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 48px 80px", display: "grid", gridTemplateColumns: "1fr 360px", gap: "36px", alignItems: "flex-start" }}>

          <div className="as-left">
            <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "32px 28px", marginBottom: "24px" }}>
              <div style={{ marginBottom: "20px" }}><Eyebrow label="About" /></div>
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 400, color: "#020C1C", marginBottom: "18px" }}>About {agent.full_name.split(" ")[0]}</h2>
              {agent.bio ? (
                agent.bio.split("\n\n").map((para, i) => (
                  <p key={i} style={{ fontSize: "14px", color: "#4B5563", lineHeight: 1.85, marginBottom: "14px" }}>{para}</p>
                ))
              ) : (
                <p style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: 1.85, marginBottom: "14px" }}>This agent hasn't added a bio yet.</p>
              )}

              {agent.cities_served.length > 0 && (
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
              )}
            </div>

            <div style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
                <button style={{ flex: 1, padding: "16px", background: "transparent", border: "none", borderBottom: "2.5px solid #10C4C3", fontSize: "13px", fontWeight: 700, color: "#020C1C", cursor: "default", fontFamily: "var(--font-body-new)", textTransform: "capitalize", letterSpacing: "0.05em" }}>
                  Active Listings ({properties.length})
                </button>
              </div>
              <div style={{ padding: "28px" }}>
                {properties.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: "14px", padding: "40px" }}>No active listings at the moment.</p>
                ) : (
                  <div className="as-listings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    {properties.map(p => <PropCard key={p.id} p={p} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="as-right" style={{ position: "sticky", top: "84px", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div id="send-message" style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "26px 22px", boxShadow: "0 4px 20px rgba(13,43,31,0.06)" }}>
              <div style={{ marginBottom: "16px" }}><Eyebrow label="Get in Touch" /></div>
              <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#020C1C", marginBottom: "18px" }}>Message {agent.full_name.split(" ")[0]}</h3>
              {user ? (
                <ContactForm agent={agent} prefillName={profile?.full_name} prefillEmail={user.email} prefillPhone={profile?.phone} />
              ) : (
                <div style={{ textAlign: "center", padding: "24px 12px" }}>
                  <p style={{ fontSize: "13px", color: "#6B7C72", lineHeight: 1.6, marginBottom: "16px" }}>
                    Sign in to contact {agent.full_name.split(" ")[0]} directly.
                  </p>
                  <button
                    onClick={() => openAuthModal("signin")}
                    style={{ width: "100%", padding: "13px", background: "#10C4C3", border: "none", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {isAdmin && (agent.phone || agent.email || agent.whatsapp) && (
              <div style={{ background: "#020C1C", borderRadius: "14px", padding: "20px 18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(201,168,76,0.55)", textTransform: "uppercase", marginBottom: "14px" }}>Quick Contact</p>
                {[
                  agent.phone && { icon: "📞", label: "Call directly", value: agent.phone, href: `tel:${agent.phone}` },
                  agent.whatsapp && { icon: "💬", label: "WhatsApp",   value: agent.whatsapp, href: `https://wa.me/${agent.whatsapp.replace(/\+/g,"")}` },
                  agent.email && { icon: "✉️", label: "Email",         value: agent.email, href: `mailto:${agent.email}` },
                ].filter(Boolean).map((c: any) => (
                  <a key={c.label} href={c.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 0", borderBottom: "1px solid rgba(245,242,236,0.06)", textDecoration: "none" }}>
                    <span style={{ fontSize: "16px" }}>{c.icon}</span>
                    <div>
                      <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase" }}>{c.label}</p>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(245,242,236,0.75)" }}>{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <button onClick={() => typeof navigator !== "undefined" && navigator.clipboard?.writeText(window.location.href)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "10px", fontSize: "12px", fontWeight: 600, color: "#6B7C72", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Profile
            </button>

            <ReportButton entityType="profile" entityId={agent.userId} variant="light" />
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="as-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="as-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px" }}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
              </div>
              {[
                { heading: "Find Agents", links: [["All Agents","/agents"],["Join Network","/become-an-agent"]] },
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
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
