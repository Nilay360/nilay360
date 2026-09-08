"use client";

// Phase 8 (Lead Management) — visual pass.
// Styled entirely from patterns already live on this site: Card/SectionHeading/
// EmptyState/Spinner/status-badge shapes from src/app/dashboard/DashboardClient.tsx,
// and the InquiryTypeBadge convention that "Viewing" = teal. Colors are the exact
// hex values already defined in src/styles/globals.css (navy/teal/white/gray) plus
// the site's existing green (#4ADE80, "contacted"/success), amber (#FBBF24, the
// existing IconAlert color), and red (#F87171, "rejected") — no new colors
// introduced. No external template/component library used.
//
// Requires migrations 012_lead_status_add_spam.sql and
// 013_inquiries_lead_management.sql to be applied (assigned_to column,
// lead_status enum incl. 'spam', inquiry_activities table). Those are NOT
// yet applied to production — this page shows a schema-not-ready message
// rather than crash if the columns don't exist yet.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FilterChips } from "@/components/leads/FilterChips";
import { createClient } from "@/lib/supabase/client";

export type LeadStatus =
  | "new" | "contacted" | "qualified" | "viewing_scheduled"
  | "negotiation" | "closed" | "lost" | "spam";

const LEAD_STATUSES: LeadStatus[] = [
  "new", "contacted", "qualified", "viewing_scheduled",
  "negotiation", "closed", "lost", "spam",
];

export interface Lead {
  id: string;
  property_id: string | null;
  property_slug: string | null;
  property_title: string | null;
  inquirer_name: string | null;
  inquirer_email: string | null;
  inquirer_phone: string | null;
  message: string | null;
  inquiry_type: string | null;
  status: LeadStatus;
  priority: string | null;
  source: string | null;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  assigned_to: string | null;
  created_at: string;
  // Structured preference fields (Property Matching, Phase 10 — migration 025).
  // Null on every pre-migration row unless manually backfilled and reviewed —
  // never assume non-null.
  budget_min: number | null;
  budget_max: number | null;
  bhk: string | null;
  preferred_locality: string | null;
  preferred_city: string | null;
  property_type_preference: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; leads: Lead[] };

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Follow-up Date (Phase 12) — list-page signal only, per spec: don't
// change the existing card layout, just add this one indicator.
function followUpUrgency(nextFollowUp: string | null): "overdue" | "today" | null {
  if (!nextFollowUp) return null;
  const due = new Date(nextFollowUp);
  const now = new Date();
  if (due < now) return "overdue";
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (due <= todayEnd) return "today";
  return null;
}

function FollowUpBadge({ nextFollowUp }: { nextFollowUp: string | null }) {
  const urgency = followUpUrgency(nextFollowUp);
  if (!urgency) return null;
  const overdue = urgency === "overdue";
  return (
    <Badge
      label={overdue ? "Overdue" : "Due Today"}
      bg={overdue ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)"}
      color={overdue ? "#F87171" : "#FBBF24"}
      border={overdue ? "rgba(248,113,113,0.30)" : "rgba(251,191,36,0.30)"}
    />
  );
}

// ── Shared dark-theme building blocks ───────────────────────────
// Same visual language as DashboardClient.tsx's Card/SectionHeading/
// EmptyState/Spinner — duplicated locally because that file doesn't export
// them, matching this codebase's existing per-page convention.

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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "leads-spin 0.8s linear infinite" }}>
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

// Status → color mapping. Every color is one already live on this site:
// teal (#10C4C3, the brand accent), green (#4ADE80, DashboardClient's
// "contacted"/success tone), amber (#FBBF24, DashboardClient's IconAlert
// color), red (#F87171, admin's "rejected" tone), gray (#A9B4C2, the
// existing muted/closed tone).
const STATUS_STYLE: Record<LeadStatus, { label: string; bg: string; color: string; border: string }> = {
  new:                { label: "New",               bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
  contacted:          { label: "Contacted",          bg: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
  qualified:          { label: "Qualified",          bg: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
  viewing_scheduled:  { label: "Viewing Scheduled",  bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
  negotiation:        { label: "Negotiation",        bg: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "rgba(251,191,36,0.30)" },
  closed:             { label: "Closed — Won",       bg: "rgba(74,222,128,0.15)", color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
  lost:               { label: "Lost",               bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
  spam:               { label: "Spam",               bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.30)" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const c = STATUS_STYLE[status];
  return <Badge label={c.label} bg={c.bg} color={c.color} border={c.border} />;
}

const PRIORITY_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  high:   { label: "High",   bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.30)" },
  medium: { label: "Medium", bg: "rgba(251,191,36,0.15)",  color: "#FBBF24", border: "rgba(251,191,36,0.30)" },
  low:    { label: "Low",    bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  const c = PRIORITY_STYLE[priority ?? "medium"] ?? PRIORITY_STYLE.medium;
  return <Badge label={c.label} bg={c.bg} color={c.color} border={c.border} />;
}

function IconInbox() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconPhone() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IconMail() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>;
}

export default function AgentLeadsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sortBy, setSortBy] = useState<"created_at" | "priority">("created_at");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (cancelled) return;
      if (!uid) { setState({ kind: "signed_out" }); return; }

      // agent_profiles is the real, canonical agent table (confirmed
      // 2026-08-29 — backs become-an-agent/admin-approval/dashboard-self-edit;
      // `agents` was dead schema this was mistakenly built against).
      // status = 'approved' matches the same gate used elsewhere (admin's
      // public agent list, the homepage's real agent count).
      const { data: agentRow, error: agentErr } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("user_id", uid)
        .eq("status", "approved")
        .maybeSingle();

      if (cancelled) return;

      if (agentErr) {
        console.error("agent/leads — agent_profiles lookup error:", agentErr);
        setState({ kind: "error", detail: agentErr.message });
        return;
      }
      if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

      const { data: leads, error: leadsErr } = await supabase
        .from("inquiries")
        .select(
          "id, property_id, property_slug, property_title, inquirer_name, inquirer_email, inquirer_phone, message, inquiry_type, status, priority, source, next_follow_up, last_contacted_at, assigned_to, created_at, budget_min, budget_max, bhk, preferred_locality, preferred_city, property_type_preference"
        )
        .eq("assigned_to", agentRow.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (leadsErr) {
        console.error("agent/leads — inquiries query error:", leadsErr);
        if (isMissingSchemaError(leadsErr)) {
          setState({ kind: "schema_not_ready", detail: leadsErr.message });
        } else {
          setState({ kind: "error", detail: leadsErr.message });
        }
        return;
      }

      setState({ kind: "ready", agentId: agentRow.id, leads: (leads as Lead[] | null) ?? [] });
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
          <EmptyState icon={<IconInbox />} title="Please sign in" subtitle="Sign in to your agent account to view your leads." />
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
          <EmptyState icon={<IconInbox />} title="Agent access only" subtitle="This account has no approved agent profile — lead management is only available to approved agents. If you've applied, your application may still be pending admin review." />
        </Card>
      </Shell>
    );
  }
  if (state.kind === "schema_not_ready") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Lead management schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>
            This page depends on migrations <code style={{ color: "#10C4C3" }}>012_lead_status_add_spam.sql</code> and <code style={{ color: "#10C4C3" }}>013_inquiries_lead_management.sql</code>, which are written and verified but not yet run against this database.
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
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your leads</h4>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }

  const { leads } = state;
  const filtered = statusFilter ? leads.filter(l => l.status === statusFilter) : leads;
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.priority ?? "medium"] ?? 1) - (order[b.priority ?? "medium"] ?? 1);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Shell>
      <div className="leads-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <SectionHeading title={`My Leads (${leads.length})`} subtitle="Inquiries assigned to you, across all your listings." />
      </div>

      <div className="leads-filters" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <SelectField label="Status" value={statusFilter} onChange={v => setStatusFilter(v as LeadStatus | "")}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
        </SelectField>
        <SelectField label="Sort" value={sortBy} onChange={v => setSortBy(v as "created_at" | "priority")}>
          <option value="created_at">Newest first</option>
          <option value="priority">Priority</option>
        </SelectField>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <FilterChips
          filters={[
            ...(statusFilter !== "" ? [{ id: "status" as const, label: "Status", value: STATUS_STYLE[statusFilter].label }] : []),
            ...(sortBy !== "created_at" ? [{ id: "sort" as const, label: "Sort", value: "Priority" }] : []),
          ]}
          onRemove={(id) => {
            if (id === "status") setStatusFilter("");
            if (id === "sort") setSortBy("created_at");
          }}
          onClearAll={() => {
            setStatusFilter("");
            setSortBy("created_at");
          }}
        />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconInbox />}
            title="No leads yet"
            subtitle={statusFilter ? `No leads with status "${STATUS_STYLE[statusFilter].label}" right now.` : "When a lead is assigned to you, it will show up here."}
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {sorted.map(lead => (
            <Link key={lead.id} href={`/agent/leads/${lead.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s" }}>
                <div className="lead-row-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>
                      {lead.inquirer_name || "Unnamed Lead"}
                    </span>
                    <LeadStatusBadge status={lead.status} />
                    <PriorityBadge priority={lead.priority} />
                    <FollowUpBadge nextFollowUp={lead.next_follow_up} />
                  </div>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{fmtDate(lead.created_at)}</span>
                </div>

                {lead.property_title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "13px", color: "#A9B4C2" }}>
                    <IconBuilding />
                    <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{lead.property_title}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
                  {lead.inquirer_phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2" }}>
                      <IconPhone />{lead.inquirer_phone}
                    </span>
                  )}
                  {lead.inquirer_email && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2" }}>
                      <IconMail />{lead.inquirer_email}
                    </span>
                  )}
                </div>
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
        @keyframes leads-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .leads-header { flex-direction: column; }
          .leads-filters { flex-direction: column; align-items: stretch; }
          .leads-filters label { justify-content: space-between; }
          .lead-row-header { flex-direction: column; align-items: flex-start; }
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
