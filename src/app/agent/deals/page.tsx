"use client";

// Deals (Phase 15/16) — list view. Structure, identity-lookup pattern,
// shared building blocks, and visual language mirror
// src/app/agent/leads/page.tsx and src/app/agent/site-visits/page.tsx
// exactly, per those pages' own established conventions.
//
// Schema (migration 030) is already live — this page only reads/writes
// it, no schema changes here.
//
// Property picker on the Create Deal form: `deals` has no built-in
// property-search UI to copy, so this reuses the one existing real
// concept for "which properties belong to this agent" —
// property_listings.assigned_agent_id, the same field/query
// DashboardClient.tsx's "Assigned Listings" tab already uses — rather
// than inventing a new free-text lookup.

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";

export type DealStage =
  | "negotiation" | "booking" | "agreement" | "registration" | "closed" | "lost";

export const DEAL_STAGES: DealStage[] = [
  "negotiation", "booking", "agreement", "registration", "closed", "lost",
];

export interface Deal {
  id: string;
  inquiry_id: string | null;
  site_visit_id: string | null;
  property_id: string | null;
  assigned_to: string;
  stage: DealStage;
  deal_price: number | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AssignedListing {
  id: string;
  slug: string;
  title: string;
}

// Fuller property record for display — thumbnail + address, shown on
// list cards and the detail page's property card.
export interface LinkedPropertyInfo {
  id: string;
  slug: string;
  title: string;
  photo_urls: string[] | null;
  locality: string | null;
  city: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; deals: Deal[]; sharedDeals: Deal[]; properties: Map<string, LinkedPropertyInfo> };

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPrice(price: number | null): string {
  return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
}

// ── Shared dark-theme building blocks — duplicated locally, same
// per-page convention as leads/page.tsx and site-visits/page.tsx. ─────

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#10C4C3" }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "340px", lineHeight: 1.65 }}>{subtitle}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "deals-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: bg, color, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}

// Stage colors: all six are already-live tones from leads/site-visits,
// none invented. "negotiation" reuses leads' STATUS_STYLE.negotiation
// color exactly (same word, same meaning). "closed" reuses leads'
// "Closed — Won" green, "lost" reuses the red bad-outcome tone (spam/
// rejected). "booking"/"agreement"/"registration" are judgment calls for
// stages with no directly-matching existing label — flagged, not
// assumed: booking=teal (brand accent, early forward motion), agreement=
// blue (matches leads' "qualified" mid-progress meaning), registration=
// gray (procedural/administrative, same neutral reading PriorityBadge
// gives "low" priority).
export const DEAL_STAGE_STYLE: Record<DealStage, { label: string; bg: string; color: string; border: string }> = {
  negotiation:  { label: "Negotiation",  bg: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "rgba(251,191,36,0.30)" },
  booking:      { label: "Booking",      bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
  agreement:    { label: "Agreement",    bg: "rgba(59,130,246,0.15)", color: "#3B82F6", border: "rgba(59,130,246,0.30)" },
  registration: { label: "Registration", bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
  closed:       { label: "Closed",       bg: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
  lost:         { label: "Lost",         bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.30)" },
};

export function DealStageBadge({ stage }: { stage: DealStage }) {
  const c = DEAL_STAGE_STYLE[stage] ?? { label: stage, bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return <Badge label={c.label} bg={c.bg} color={c.color} border={c.border} />;
}

// Forward lifecycle order — 'lost' is deliberately excluded, it's a
// distinct terminal state, not a rung on this ladder (per spec: "lost as
// a distinct visual state, not part of the forward progression").
const FORWARD_STAGES: DealStage[] = ["negotiation", "booking", "agreement", "registration", "closed"];

// Stage-progress stepper. Structural pattern reused from the existing
// Stepper in src/app/post-property/page.tsx (numbered circles, a
// checkmark once passed, a connecting line, labels below) — re-themed
// with this feature's actual brand tokens (teal/green/gray/red on navy)
// instead of that file's own local light-theme color object, which
// doesn't apply here. `size="compact"` (list cards) hides labels and
// shrinks the circles; `size="large"` (detail page) shows both.
// Passing `onSelectStage` makes it interactive (detail page); omitting
// it renders a read-only indicator (list cards).
export function DealStageStepper({
  stage,
  size = "large",
  onSelectStage,
}: {
  stage: DealStage;
  size?: "compact" | "large";
  onSelectStage?: (stage: DealStage) => void;
}) {
  const isLost = stage === "lost";
  const currentIndex = FORWARD_STAGES.indexOf(stage);
  const interactive = !!onSelectStage;
  const circleSize = size === "compact" ? 20 : 32;
  const fontSize = size === "compact" ? 9 : 12;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "center", opacity: isLost ? 0.4 : 1 }}>
        {FORWARD_STAGES.map((s, i) => {
          const done = !isLost && i < currentIndex;
          const active = !isLost && i === currentIndex;
          return (
            <Fragment key={s}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto" }}>
                <button
                  type="button"
                  onClick={interactive ? () => onSelectStage!(s) : undefined}
                  disabled={!interactive}
                  title={DEAL_STAGE_STYLE[s].label}
                  style={{
                    width: circleSize, height: circleSize, borderRadius: "50%", padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#4ADE80" : active ? "#10C4C3" : "rgba(255,255,255,0.06)",
                    border: `2px solid ${done ? "#4ADE80" : active ? "#10C4C3" : "rgba(255,255,255,0.18)"}`,
                    color: done || active ? "#020C1C" : "#A9B4C2",
                    fontSize, fontWeight: 700, fontFamily: "var(--font-support-new)",
                    cursor: interactive ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                >
                  {done ? "✓" : i + 1}
                </button>
                {size === "large" && (
                  <span style={{ fontSize: "9px", marginTop: "5px", fontFamily: "var(--font-support-new)", fontWeight: active ? 700 : 500, color: active ? "#10C4C3" : done ? "#A9B4C2" : "#6B7686", whiteSpace: "nowrap", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {DEAL_STAGE_STYLE[s].label}
                  </span>
                )}
              </div>
              {i < FORWARD_STAGES.length - 1 && (
                <div style={{ flex: "1 1 16px", height: "2px", marginTop: size === "large" ? "15px" : 0, minWidth: size === "compact" ? "8px" : "12px", background: done ? "#4ADE80" : "rgba(255,255,255,0.15)", transition: "background 0.2s" }} />
              )}
            </Fragment>
          );
        })}
      </div>

      <button
        type="button"
        onClick={interactive ? () => onSelectStage!("lost") : undefined}
        disabled={!interactive}
        title="Lost"
        style={{
          marginLeft: size === "large" ? "20px" : "8px",
          padding: size === "large" ? "6px 14px" : "3px 8px",
          borderRadius: "999px",
          fontSize: size === "large" ? "11px" : "9px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
          background: isLost ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)",
          color: isLost ? "#F87171" : "#6B7686",
          border: `1.5px solid ${isLost ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.12)"}`,
          cursor: interactive ? "pointer" : "default",
          fontFamily: "var(--font-support-new)",
          flexShrink: 0,
        }}
      >
        Lost
      </button>
    </div>
  );
}

function IconBriefcase() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconClock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

// Extracted so the main list and the "Shared With Me" section (Phase
// 18) render deals identically — same card markup, not a copy-pasted
// second version of it.
function DealCard({ deal, properties }: { deal: Deal; properties: Map<string, LinkedPropertyInfo> }) {
  const property = deal.property_id ? properties.get(deal.property_id) : undefined;
  const thumb = property?.photo_urls?.[0];
  return (
    <Link href={`/agent/deals/${deal.id}`} style={{ textDecoration: "none" }}>
      <Card style={{ padding: 0, cursor: "pointer", transition: "border-color 0.15s", overflow: "hidden" }}>
        <div className="deal-card-body" style={{ display: "flex", gap: 0 }}>
          {/* Thumbnail — same plain-<img>+optimizedImageUrl+lazy pattern
              already used for property thumbnails in src/app/admin/page.tsx,
              not a new image-handling approach. */}
          <div style={{ width: "110px", flexShrink: 0, position: "relative", background: "#0A1526", overflow: "hidden", minHeight: "110px" }}>
            {thumb ? (
              <img src={optimizedImageUrl(thumb, 220)} alt={property?.title ?? "Property"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#10C4C3", opacity: 0.3, minHeight: "110px" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: "18px 20px" }}>
            <div className="deal-row-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
              {/* Price is the most prominent element on the card, per spec. */}
              <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 700, color: deal.deal_price != null ? "#FFFFFF" : "#6B7686" }}>
                {fmtPrice(deal.deal_price)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                <IconClock />{fmtDate(deal.created_at)}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#A9B4C2", marginBottom: "12px" }}>
              <IconBuilding />
              <span style={{ color: property ? "#FFFFFF" : "#A9B4C2", fontWeight: property ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {property ? property.title : "No property linked"}
              </span>
            </div>

            <DealStageStepper stage={deal.stage} size="compact" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function AgentDealsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newPropertyId, setNewPropertyId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [assignedListings, setAssignedListings] = useState<AssignedListing[]>([]);

  async function load() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", uid)
      .eq("status", "approved")
      .maybeSingle();

    if (agentErr) {
      console.error("agent/deals — agent_profiles lookup error:", agentErr);
      setState({ kind: "error", detail: agentErr.message });
      return;
    }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: deals, error: dealsErr } = await supabase
      .from("deals")
      .select("id, inquiry_id, site_visit_id, property_id, assigned_to, stage, deal_price, lost_reason, notes, created_at, updated_at")
      .eq("assigned_to", agentRow.id)
      .order("created_at", { ascending: false });

    if (dealsErr) {
      console.error("agent/deals — deals query error:", dealsErr);
      if (isMissingSchemaError(dealsErr)) {
        setState({ kind: "schema_not_ready", detail: dealsErr.message });
      } else {
        setState({ kind: "error", detail: dealsErr.message });
      }
      return;
    }

    const dealRows = (deals as Deal[] | null) ?? [];

    // "Shared With Me" (Phase 18) — deals this agent collaborates on but
    // does not own. Migration 041 (deal_collaborators, already live) is
    // read here for the first time on this page. Same "fetch then map,
    // no PostgREST embed" convention as the property lookup below: get
    // the collaborator deal_ids first, then fetch those deals.
    const { data: collabRows, error: collabErr } = await supabase
      .from("deal_collaborators")
      .select("deal_id")
      .eq("agent_profile_id", agentRow.id);
    if (collabErr) console.error("agent/deals — deal_collaborators query error:", collabErr);
    const collabDealIds = [...new Set((collabRows as { deal_id: string }[] | null ?? []).map(r => r.deal_id))];

    let sharedDealRows: Deal[] = [];
    if (collabDealIds.length > 0) {
      const { data: shared, error: sharedErr } = await supabase
        .from("deals")
        .select("id, inquiry_id, site_visit_id, property_id, assigned_to, stage, deal_price, lost_reason, notes, created_at, updated_at")
        .in("id", collabDealIds)
        .order("created_at", { ascending: false });
      if (sharedErr) console.error("agent/deals — shared deals query error:", sharedErr);
      // Defensive exclusion: a primary agent wouldn't add themselves as
      // their own deal's collaborator, so this should never actually
      // filter anything out — kept anyway so a deal can never appear in
      // both sections regardless of how that data got there.
      sharedDealRows = (shared as Deal[] | null ?? []).filter(d => d.assigned_to !== agentRow.id);
    }

    // Second query for property titles — same "fetch then map" pattern
    // already used in src/app/agents/page.tsx for public_agent_contact,
    // rather than a PostgREST nested embed. Covers both sections' deals.
    const propertyIds = [...new Set(
      [...dealRows, ...sharedDealRows].map(d => d.property_id).filter((id): id is string => !!id)
    )];
    const propertyMap = new Map<string, LinkedPropertyInfo>();
    if (propertyIds.length > 0) {
      const { data: props } = await supabase
        .from("property_listings")
        .select("id, slug, title, photo_urls, locality, city")
        .in("id", propertyIds);
      (props as LinkedPropertyInfo[] | null ?? []).forEach(p => propertyMap.set(p.id, p));
    }

    // The agent's own assigned listings, for the Create Deal property
    // picker — same query DashboardClient.tsx's "Assigned Listings" tab
    // already uses.
    const { data: listings } = await supabase
      .from("property_listings")
      .select("id, slug, title")
      .eq("assigned_agent_id", agentRow.id)
      .order("submitted_at", { ascending: false });
    setAssignedListings((listings as AssignedListing[] | null) ?? []);

    setState({ kind: "ready", agentId: agentRow.id, deals: dealRows, sharedDeals: sharedDealRows, properties: propertyMap });
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) setState({ kind: "signed_out" });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateDeal(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    setCreating(true);
    setCreateError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deals")
      .insert({
        assigned_to: state.agentId,
        inquiry_id: null,
        site_visit_id: null,
        property_id: newPropertyId || null,
        deal_price: newPrice.trim() ? Number(newPrice) : null,
        notes: newNotes.trim() || null,
        stage: "negotiation",
      })
      .select("id, inquiry_id, site_visit_id, property_id, assigned_to, stage, deal_price, lost_reason, notes, created_at, updated_at")
      .single();
    setCreating(false);
    if (error) {
      console.error("Create deal error:", error);
      setCreateError("Could not create deal: " + error.message);
      return;
    }
    setShowCreate(false);
    setNewPropertyId("");
    setNewPrice("");
    setNewNotes("");
    setState({ ...state, deals: [data as Deal, ...state.deals] });
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;

  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconBriefcase />} title="Please sign in" subtitle="Sign in to your agent account to view your deals." />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-12px", paddingBottom: "8px" }}>
            <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none" }}>Sign In →</Link>
          </div>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconBriefcase />} title="Agent access only" subtitle="This account has no approved agent profile — deals are only available to approved agents." />
        </Card>
      </Shell>
    );
  }
  if (state.kind === "schema_not_ready") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Deals schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>This page depends on migration <code style={{ color: "#10C4C3" }}>030_deals_table.sql</code>.</p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>Underlying error: {state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "error") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your deals</h4>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }

  const { deals, sharedDeals, properties } = state;

  return (
    <Shell>
      <div className="deals-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <SectionHeading title={`Deals (${deals.length})`} subtitle="Deals assigned to you." />
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "#10C4C3", border: "none", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {showCreate ? "Cancel" : "+ Create Deal"}
        </button>
      </div>

      {showCreate && (
        <Card style={{ padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Create Deal</h3>
          <form onSubmit={handleCreateDeal}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Property (optional)</label>
              <select
                value={newPropertyId}
                onChange={e => setNewPropertyId(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", cursor: "pointer" }}
              >
                <option value="">No property linked</option>
                {assignedListings.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Deal Price (optional)</label>
              <input
                type="number"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                placeholder="e.g. 8500000"
                style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Notes (optional)</label>
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", resize: "vertical" }}
              />
            </div>
            {createError && <p style={{ fontSize: "12px", color: "#F87171", marginBottom: "12px" }}>{createError}</p>}
            <button type="submit" disabled={creating}
              style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
              {creating ? "Creating…" : "Create Deal"}
            </button>
          </form>
        </Card>
      )}

      {deals.length === 0 ? (
        <Card>
          <EmptyState icon={<IconBriefcase />} title="No deals yet" subtitle="Start a deal from a lead, a site visit, or create one directly here." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {deals.map(deal => <DealCard key={deal.id} deal={deal} properties={properties} />)}
        </div>
      )}

      {/* "Shared With Me" (Phase 18) — deals this agent collaborates on
          (migration 041, already live) but doesn't own. Hidden entirely
          when empty, same as how the property card on the deal detail
          page only renders at all when there's a property to show,
          rather than rendering an empty-state block for a secondary
          section. */}
      {sharedDeals.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <SectionHeading title={`Shared With Me (${sharedDeals.length})`} subtitle="Deals where you've been added as a co-agent." />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {sharedDeals.map(deal => <DealCard key={deal.id} deal={deal} properties={properties} />)}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes deals-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .deals-header { flex-direction: column; }
          .deal-row-header { flex-direction: column; align-items: flex-start; }
          .deal-card-body { flex-direction: column; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
