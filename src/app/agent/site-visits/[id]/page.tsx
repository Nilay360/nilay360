"use client";

// Site Visits (Phase 13) — detail view. Mirrors
// src/app/agent/leads/[id]/page.tsx's structure exactly: same identity
// lookup, same LoadState shape, same Field/Shell building blocks, same
// Select-based status dropdown. No note/activity timeline here — unlike
// inquiries, there is no site_visit_activities table, so this page only
// exposes the record itself + a status change.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SiteVisit } from "../page";
import { Card, VisitStatusBadge } from "../page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Same judgment-call vocabulary as ../page.tsx — flagged there as an
// assumption, not a confirmed real value set.
const VISIT_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

const STATUS_DOT_COLOR: Record<string, string> = {
  pending: "#FBBF24",
  confirmed: "#10C4C3",
  completed: "#4ADE80",
  cancelled: "#F87171",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: STATUS_DOT_COLOR[status] ?? "#A9B4C2" }}
    />
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; visit: SiteVisit; dealId: string | null };

function isMissingSchemaError(error: { code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function IconPhone() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconInbox() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconClock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7686", textTransform: "uppercase", marginBottom: "4px" }}>{label}</p>
      <div style={{ fontSize: "14px", color: "#FFFFFF" }}>{children}</div>
    </div>
  );
}

export default function AgentSiteVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = (params?.id as string) ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [savingStatus, setSavingStatus] = useState(false);
  const [startingDeal, setStartingDeal] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: visit, error: visitErr } = await supabase
      .from("site_visits")
      .select(
        "id, property_id, property_slug, property_title, seller_email, visitor_name, visitor_phone, visit_date, visit_time_slot, status, created_at, assigned_to, inquiry_id"
      )
      .eq("id", visitId)
      .maybeSingle();

    if (visitErr) {
      if (isMissingSchemaError(visitErr)) setState({ kind: "schema_not_ready", detail: visitErr.message });
      else setState({ kind: "error", detail: visitErr.message });
      return;
    }
    if (!visit) { setState({ kind: "not_found" }); return; }
    if ((visit as SiteVisit).assigned_to !== agentRow.id) { setState({ kind: "forbidden" }); return; }

    // Deals (Phase 15/16, Part 3) — duplicate check before offering
    // "Start Deal", same as ../../leads/[id]/page.tsx's Part 2.
    const { data: existingDeal, error: dealErr } = await supabase
      .from("deals")
      .select("id")
      .eq("site_visit_id", visitId)
      .maybeSingle();

    if (dealErr) {
      console.error("agent/site-visits/[id] — linked deal query error:", dealErr);
    }

    setState({ kind: "ready", agentId: agentRow.id, visit: visit as SiteVisit, dealId: (existingDeal as { id: string } | null)?.id ?? null });
  }, [visitId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(newStatus: string) {
    if (state.kind !== "ready") return;
    setSavingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_visits")
      .update({ status: newStatus })
      .eq("id", state.visit.id);
    setSavingStatus(false);
    if (error) {
      console.error("Site visit status update error:", error);
      alert("Could not update status: " + error.message);
      return;
    }
    setState({ ...state, visit: { ...state.visit, status: newStatus } });
  }

  async function handleStartDeal() {
    if (state.kind !== "ready" || state.dealId) return;
    setStartingDeal(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deals")
      .insert({
        inquiry_id: state.visit.inquiry_id,
        site_visit_id: state.visit.id,
        property_id: state.visit.property_id,
        assigned_to: state.agentId,
        stage: "negotiation",
      })
      .select("id")
      .single();
    setStartingDeal(false);
    if (error) {
      console.error("Start deal error:", error);
      alert("Could not start deal: " + error.message);
      return;
    }
    router.push(`/agent/deals/${(data as { id: string }).id}`);
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "visit-spin 0.8s linear infinite" }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
      </Shell>
    );
  }
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view this site visit.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile.</p></Card></Shell>;
  }
  if (state.kind === "schema_not_ready") {
    return (
      <Shell backHref="/agent/site-visits" backLabel="← All Site Visits">
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Site visits schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>Depends on migration 028_site_visits_property_fk_and_assignment.sql.</p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_found") {
    return <Shell backHref="/agent/site-visits" backLabel="← All Site Visits"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Site visit not found.</p></Card></Shell>;
  }
  if (state.kind === "forbidden") {
    return <Shell backHref="/agent/site-visits" backLabel="← All Site Visits"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This site visit is not assigned to you.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell backHref="/agent/site-visits" backLabel="← All Site Visits"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  const { visit, dealId } = state;

  return (
    <Shell backHref="/agent/site-visits" backLabel="← All Site Visits">
      <div className="visit-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>{visit.visitor_name || "Unnamed Visitor"}</h1>
          <VisitStatusBadge status={visit.status} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {dealId ? (
            <Link href={`/agent/deals/${dealId}`} style={{ padding: "9px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-body-new)" }}>
              View Deal →
            </Link>
          ) : (
            <button
              onClick={handleStartDeal}
              disabled={startingDeal}
              style={{ padding: "9px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", cursor: startingDeal ? "default" : "pointer", opacity: startingDeal ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
            >
              {startingDeal ? "Starting…" : "Start Deal"}
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#A9B4C2" }}>
          Status
          <Select
            value={visit.status}
            disabled={savingStatus}
            onValueChange={v => handleStatusChange(v)}
          >
            <SelectTrigger
              className="h-8 border-[rgba(255,255,255,0.15)] bg-[#111F33] text-white data-[placeholder]:text-white [&_svg]:text-white/60 focus:border-[#10C4C3] focus:ring-[#10C4C3]/20"
              style={{ fontFamily: "var(--font-body-new)", opacity: savingStatus ? 0.6 : 1 }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[rgba(255,255,255,0.15)] bg-[#111F33] text-white [&_*[role=option]>span>svg]:shrink-0 [&_*[role=option]>span>svg]:text-muted-foreground/80 [&_*[role=option]>span]:end-2 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]]:pe-8 [&_*[role=option]]:ps-2">
              {VISIT_STATUSES.map(s => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-white focus:bg-[#182B3F] focus:text-white [&_svg]:text-[#10C4C3]"
                >
                  <span className="flex items-center gap-2">
                    <StatusDot status={s} />
                    <span className="truncate">{s}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </label>
        </div>
      </div>

      <div className="visit-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card style={{ padding: "24px" }}>
          <Field label="Property">
            {visit.property_title ? (
              visit.property_slug ? <Link href={`/property/${visit.property_slug}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconBuilding />{visit.property_title}</Link>
                : <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconBuilding />{visit.property_title}</span>
            ) : "—"}
          </Field>
          <Field label="Phone">
            {visit.visitor_phone ? <a href={`tel:${visit.visitor_phone}`} style={{ color: "#FFFFFF", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconPhone />{visit.visitor_phone}</a> : "—"}
          </Field>
          <Field label="Requested">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDate(visit.created_at)}</span>
          </Field>
        </Card>

        <Card style={{ padding: "24px" }}>
          <Field label="Visit Date">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDate(visit.visit_date)}</span>
          </Field>
          <Field label="Time Slot">{visit.visit_time_slot || "—"}</Field>
          <Field label="Linked Lead">
            {visit.inquiry_id
              ? <Link href={`/agent/leads/${visit.inquiry_id}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconInbox />View Lead</Link>
              : "—"}
          </Field>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children, backHref = "/dashboard", backLabel = "← Dashboard" }: { children: React.ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <>
      <style>{`
        @keyframes visit-spin { to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .visit-detail-grid { grid-template-columns: 1fr !important; }
          .visit-detail-header { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href={backHref} style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>{backLabel}</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
