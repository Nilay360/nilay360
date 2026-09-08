"use client";

// Site Visits (Phase 13) — list view. Structure, identity-lookup pattern,
// shared building blocks, and visual language all mirror
// src/app/agent/leads/page.tsx exactly, per that page's own established
// conventions — no new patterns invented for this feature.
//
// OPEN QUESTION, flagged rather than guessed: /agent/leads has no
// unassigned/"claim" flow — its query is strictly
// `.eq("assigned_to", agentRow.id)`, nothing else. This page mirrors that
// exactly (assigned_to = current agent only). If an unclaimed/available
// pool of site visits (assigned_to IS NULL) should also be visible here,
// that's a real product decision this page does not make on its own.
//
// Depends on migration 028 (site_visits.property_id -> uuid FK,
// assigned_to, inquiry_id columns) for the columns queried below, and
// almost certainly needs a NEW RLS policy on site_visits granting the
// assigned agent SELECT/UPDATE — 006_site_visits.sql's only real live
// policies are "seller_email = auth.jwt() email" or admin; there is no
// agent-facing policy today for either assigned_to or inquiry-ownership
// access. Unconfirmed whether one was added alongside 028 (no way to
// query pg_policies directly in this environment) — flagged, not
// assumed. See migration 029 for the proposed fix.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FilterChips } from "@/components/leads/FilterChips";
import { createClient } from "@/lib/supabase/client";

// site_visits.status is a bare, unconstrained TEXT column (default
// 'pending') — unlike inquiries.status, there is no live lead_status-style
// enum to mirror, and the only value ever written by the live contact form
// (src/app/property/[slug]/PropertyDetailClient.tsx submitVisit()) is
// "pending". This vocabulary (pending/confirmed/completed/cancelled) is a
// judgment call, not a confirmed real value set — flagged as an
// assumption needing confirmation, same as the unassigned-visibility
// question above. Typed as `string`, not a union, so an unexpected real
// value never crashes the page.
const VISIT_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

export interface SiteVisit {
  id: string;
  property_id: string | null;
  property_slug: string | null;
  property_title: string | null;
  seller_email: string | null;
  visitor_name: string;
  visitor_phone: string;
  visit_date: string;
  visit_time_slot: string;
  status: string;
  created_at: string;
  assigned_to: string | null;
  inquiry_id: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; visits: SiteVisit[] };

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Shared dark-theme building blocks ───────────────────────────
// Duplicated locally rather than imported from ../leads/page.tsx, matching
// this codebase's existing per-page convention (leads/page.tsx duplicates
// them from DashboardClient.tsx for the same reason).

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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "visits-spin 0.8s linear infinite" }}>
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

// Same color language as leads/page.tsx's STATUS_STYLE — teal/green/amber/
// gray, no new colors. "cancelled" reuses the same muted-red-adjacent tone
// leads uses for "lost", since both mean "did not happen".
export const VISIT_STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending:   { label: "Pending",   bg: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "rgba(251,191,36,0.30)" },
  confirmed: { label: "Confirmed", bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
  completed: { label: "Completed", bg: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
  cancelled: { label: "Cancelled", bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.30)" },
};

export function VisitStatusBadge({ status }: { status: string }) {
  const c = VISIT_STATUS_STYLE[status] ?? { label: status, bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return <Badge label={c.label} bg={c.bg} color={c.color} border={c.border} />;
}

function IconCalendar() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconPhone() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IconClock() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

export default function AgentSiteVisitsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"visit_date" | "created_at">("visit_date");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (cancelled) return;
      if (!uid) { setState({ kind: "signed_out" }); return; }

      const { data: agentRow, error: agentErr } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", uid)
        .eq("status", "approved")
        .maybeSingle();

      if (cancelled) return;

      if (agentErr) {
        console.error("agent/site-visits — agent_profiles lookup error:", agentErr);
        setState({ kind: "error", detail: agentErr.message });
        return;
      }
      if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

      const { data: visits, error: visitsErr } = await supabase
        .from("site_visits")
        .select(
          "id, property_id, property_slug, property_title, seller_email, visitor_name, visitor_phone, visit_date, visit_time_slot, status, created_at, assigned_to, inquiry_id"
        )
        .eq("assigned_to", agentRow.id)
        .order("visit_date", { ascending: true });

      if (cancelled) return;

      if (visitsErr) {
        console.error("agent/site-visits — site_visits query error:", visitsErr);
        if (isMissingSchemaError(visitsErr)) {
          setState({ kind: "schema_not_ready", detail: visitsErr.message });
        } else {
          setState({ kind: "error", detail: visitsErr.message });
        }
        return;
      }

      setState({ kind: "ready", agentId: agentRow.id, visits: (visits as SiteVisit[] | null) ?? [] });
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) setState({ kind: "signed_out" });
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;

  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconCalendar />} title="Please sign in" subtitle="Sign in to your agent account to view your site visits." />
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
          <EmptyState icon={<IconCalendar />} title="Agent access only" subtitle="This account has no approved agent profile — site visits are only available to approved agents." />
        </Card>
      </Shell>
    );
  }
  if (state.kind === "schema_not_ready") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Site visits schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>
            This page depends on migration <code style={{ color: "#10C4C3" }}>028_site_visits_property_fk_and_assignment.sql</code>&apos;s <code style={{ color: "#10C4C3" }}>assigned_to</code>/<code style={{ color: "#10C4C3" }}>inquiry_id</code> columns.
          </p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>Underlying error: {state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "error") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your site visits</h4>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }

  const { visits } = state;
  const filtered = statusFilter ? visits.filter(v => v.status === statusFilter) : visits;
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "created_at") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
  });

  return (
    <Shell>
      <div className="visits-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <SectionHeading title={`Site Visits (${visits.length})`} subtitle="Visit requests assigned to you." />
      </div>

      <div className="visits-filters" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <SelectField label="Status" value={statusFilter} onChange={setStatusFilter}>
          <option value="">All statuses</option>
          {VISIT_STATUSES.map(s => <option key={s} value={s}>{VISIT_STATUS_STYLE[s].label}</option>)}
        </SelectField>
        <SelectField label="Sort" value={sortBy} onChange={v => setSortBy(v as "visit_date" | "created_at")}>
          <option value="visit_date">Upcoming first</option>
          <option value="created_at">Newest requested</option>
        </SelectField>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <FilterChips
          filters={[
            ...(statusFilter !== "" ? [{ id: "status" as const, label: "Status", value: (VISIT_STATUS_STYLE[statusFilter]?.label ?? statusFilter) }] : []),
            ...(sortBy !== "visit_date" ? [{ id: "sort" as const, label: "Sort", value: "Newest requested" }] : []),
          ]}
          onRemove={(id) => {
            if (id === "status") setStatusFilter("");
            if (id === "sort") setSortBy("visit_date");
          }}
          onClearAll={() => {
            setStatusFilter("");
            setSortBy("visit_date");
          }}
        />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconCalendar />}
            title="No site visits yet"
            subtitle={statusFilter ? `No site visits with status "${VISIT_STATUS_STYLE[statusFilter]?.label ?? statusFilter}" right now.` : "When a site visit is assigned to you, it will show up here."}
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {sorted.map(visit => (
            <Link key={visit.id} href={`/agent/site-visits/${visit.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div className="visit-row-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>
                      {visit.visitor_name || "Unnamed Visitor"}
                    </span>
                    <VisitStatusBadge status={visit.status} />
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                    <IconClock />{fmtDate(visit.visit_date)} · {visit.visit_time_slot}
                  </span>
                </div>

                {visit.property_title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2" }}>
                    <IconBuilding />
                    <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{visit.property_title}</span>
                  </div>
                )}

                {visit.visitor_phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2", marginTop: "10px" }}>
                    <IconPhone />{visit.visitor_phone}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#A9B4C2" }}>
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 12px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
        {children}
      </select>
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes visits-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .visits-header { flex-direction: column; }
          .visits-filters { flex-direction: column; align-items: stretch; }
          .visits-filters label { justify-content: space-between; }
          .visit-row-header { flex-direction: column; align-items: flex-start; }
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
