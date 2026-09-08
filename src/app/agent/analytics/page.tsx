"use client";

// Agent Performance Analytics (Phase 21) — individual agent view.
// Schema (046: deals.closed_at, call_logs) is already live — this
// page only reads it, no schema changes here.
//
// Metric computation lives in src/lib/agentPerformance.ts, shared
// with /admin's "Agent Performance" section — see that file's header
// for why this one piece of logic is a shared lib function rather
// than duplicated per page. StatCard here mirrors
// src/app/dashboard/DashboardClient.tsx's StatCard visual style
// exactly (gradient value text, icon in a muted box) — duplicated
// locally since DashboardClient doesn't export it, same as every
// other page tonight that needed a building block from a file that
// doesn't export one.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  computeAgentPerformance, formatDurationHours, formatPercent, PERIOD_LABEL,
  type Period, type AgentPerformanceMetrics,
} from "@/lib/agentPerformance";

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string };

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "analytics-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "20px 22px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", flex: "1 1 160px", minWidth: "150px" }}>
      <div style={{ fontFamily: "var(--font-support-new)", fontSize: "26px", fontWeight: 600, lineHeight: 1.1, background: accent ? "linear-gradient(135deg, #FFFFFF 0%, #10C4C3 100%)" : "none", WebkitBackgroundClip: accent ? "text" : undefined, backgroundClip: accent ? "text" : undefined, WebkitTextFillColor: accent ? "transparent" : undefined, color: "#FFFFFF" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "14px" }}>{children}</h3>;
}

const PERIODS: Period[] = ["week", "month", "year"];

export default function AgentAnalyticsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [period, setPeriod] = useState<Period>("month");
  const [metrics, setMetrics] = useState<AgentPerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    setState({ kind: "ready", agentId: agentRow.id });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setMetricsLoading(true);
      const supabase = createClient();
      const result = await computeAgentPerformance(supabase, state.agentId, period);
      if (!cancelled) { setMetrics(result); setMetricsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [state, period]);

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Sign in to your agent account to view your performance.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile — analytics are only available to approved agents.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong</h4><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Performance Analytics</h1>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>Your own funnel, speed, and activity metrics.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "9px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
                background: period === p ? "#10C4C3" : "rgba(255,255,255,0.06)",
                color: period === p ? "#020C1C" : "#FFFFFF",
                border: period === p ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                cursor: "pointer", fontFamily: "var(--font-body-new)",
              }}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {metricsLoading || !metrics ? (
        <Card><Spinner /></Card>
      ) : (
        <>
          <Card style={{ padding: "24px", marginBottom: "20px" }}>
            <SectionLabel>Funnel</SectionLabel>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <StatCard label="Leads Assigned" value={metrics.leadsAssigned} accent />
              <StatCard label="Leads Contacted" value={metrics.leadsContacted} />
              <StatCard label="Deals Created" value={metrics.dealsCreated} />
              <StatCard label="Deals Closed" value={metrics.dealsClosed} />
              <StatCard label="Conversion Rate" value={formatPercent(metrics.conversionRatePct)} accent />
            </div>
          </Card>

          <Card style={{ padding: "24px", marginBottom: "20px" }}>
            <SectionLabel>Speed</SectionLabel>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", minWidth: "200px" }}>
                <StatCard label="Avg. Time to First Contact" value={formatDurationHours(metrics.avgTimeToFirstContactHours)} />
                <p style={{ fontSize: "11px", color: "#6B7686", marginTop: "6px", lineHeight: 1.5 }}>
                  ⓘ Approximate — based on last_contacted_at, which records the most recent contact, not necessarily the first.
                </p>
              </div>
              <StatCard label="Avg. Time to Close" value={formatDurationHours(metrics.avgTimeToCloseHours)} />
            </div>
          </Card>

          <Card style={{ padding: "24px" }}>
            <SectionLabel>Activity</SectionLabel>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <StatCard label="Site Visits Completed" value={metrics.siteVisitsCompleted} />
              <StatCard label="Messages Sent" value={metrics.messagesSent} />
              <StatCard label="Tasks Completed" value={metrics.tasksCompleted} />
              <StatCard label="Calls Logged" value={metrics.callsLogged} />
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes analytics-spin { to { transform: rotate(360deg); } }`}</style>
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
