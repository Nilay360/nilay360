"use client";

// Agent Leaderboard (Phase 25) — agent-facing, limited view. Schema
// (047: agent_profiles.leaderboard_opt_out) already live — this page
// only reads it, no schema changes here.
//
// Metric computation reuses computeAgentPerformance (Phase 21) as-is,
// called once per relevant agent for the selected period — this page
// only ever needs ONE current value per agent per metric, not a
// 12-month series, so the dashboard pilot's separate month-bucketing
// approach (built specifically for its 12-point charts) isn't the
// right tool here; computeAgentPerformance already returns exactly
// this in one call.
//
// Ranking direction is NOT uniform across metrics — flagged in code,
// not buried: for four of the five metrics, higher is better
// (descending). For Avg Time to Close, LOWER is better (closing deals
// faster is the good outcome), so that one metric sorts ascending.
//
// Agents with a null value for the selected metric (e.g. zero closed
// deals this period, so there's nothing to average) are excluded from
// the ranking entirely, not sorted to an extreme — null means "no
// data," not "worst" or "best." If the viewer themselves has no data
// for the selected metric/period, they see a distinct "not enough
// data yet" message rather than a fabricated rank.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resolveAgentNames, type AgentOption } from "../messages/page";
import {
  computeAgentPerformance, formatDurationHours, formatPercent, PERIOD_LABEL,
  type Period, type AgentPerformanceMetrics,
} from "@/lib/agentPerformance";

type MetricKey = "leadsAssigned" | "dealsClosed" | "conversionRatePct" | "avgTimeToCloseHours" | "callsLogged";

interface MetricConfig {
  key: MetricKey;
  label: string;
  direction: "asc" | "desc";
  format: (v: number) => string;
}

const METRICS: MetricConfig[] = [
  { key: "leadsAssigned",        label: "Leads Assigned",    direction: "desc", format: v => String(v) },
  { key: "dealsClosed",          label: "Deals Closed",      direction: "desc", format: v => String(v) },
  { key: "conversionRatePct",    label: "Conversion Rate",   direction: "desc", format: v => formatPercent(v) },
  { key: "avgTimeToCloseHours",  label: "Avg Time to Close", direction: "asc",  format: v => formatDurationHours(v) },
  { key: "callsLogged",          label: "Calls Logged",      direction: "desc", format: v => String(v) },
];

const PERIODS: Period[] = ["week", "month", "year"];

interface RankedEntry {
  agentId: string;
  name: string;
  value: number;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "error"; detail: string }
  | { kind: "opted_out"; agentId: string }
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "leaderboard-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function AgentLeaderboardPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [period, setPeriod] = useState<Period>("month");
  const [metricKey, setMetricKey] = useState<MetricKey>("leadsAssigned");
  const [entries, setEntries] = useState<RankedEntry[] | null>(null);
  const [computing, setComputing] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id, leaderboard_opt_out").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    if (agentRow.leaderboard_opt_out) {
      setState({ kind: "opted_out", agentId: agentRow.id });
      return;
    }

    setState({ kind: "ready", agentId: agentRow.id });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setComputing(true);
      const supabase = createClient();

      const { data: agents, error: agentsErr } = await supabase
        .from("agent_profiles")
        .select("id, user_id")
        .eq("status", "approved")
        .eq("leaderboard_opt_out", false);
      if (agentsErr) console.error("Leaderboard — agent_profiles query error:", agentsErr);
      const agentRows = (agents as { id: string; user_id: string }[] | null) ?? [];

      const nameMap: Map<string, AgentOption> = await resolveAgentNames(agentRows.map(a => a.id));

      const metric = METRICS.find(m => m.key === metricKey)!;
      const results = await Promise.all(agentRows.map(async a => {
        const metrics: AgentPerformanceMetrics = await computeAgentPerformance(supabase, a.id, period);
        return { agentId: a.id, name: nameMap.get(a.id)?.full_name ?? "Unnamed agent", value: metrics[metric.key] };
      }));

      const ranked = results
        .filter((r): r is { agentId: string; name: string; value: number } => r.value != null)
        .sort((a, b) => metric.direction === "asc" ? a.value - b.value : b.value - a.value);

      if (!cancelled) { setEntries(ranked); setComputing(false); }
    })();
    return () => { cancelled = true; };
  }, [state, period, metricKey]);

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Sign in to your agent account to view the leaderboard.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile — the leaderboard is only available to approved agents.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong</h4><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }
  if (state.kind === "opted_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>You&apos;re not currently participating in the leaderboard.</p>
          <Link href="/dashboard" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Turn it back on in your Profile →</Link>
        </Card>
      </Shell>
    );
  }

  const metric = METRICS.find(m => m.key === metricKey)!;
  const ownEntry = entries?.find(e => e.agentId === state.agentId);
  const ownRank = ownEntry ? (entries!.indexOf(ownEntry) + 1) : null;
  const top3 = entries?.slice(0, 3) ?? [];

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Leaderboard</h1>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>Top 3 agents, plus where you stand.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{ padding: "9px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", background: period === p ? "#10C4C3" : "rgba(255,255,255,0.06)", color: period === p ? "#020C1C" : "#FFFFFF", border: period === p ? "none" : "1.5px solid rgba(255,255,255,0.15)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <select
          value={metricKey}
          onChange={e => setMetricKey(e.target.value as MetricKey)}
          style={{ padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", cursor: "pointer" }}
        >
          {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {computing || !entries ? (
        <Card><Spinner /></Card>
      ) : (
        <>
          <Card style={{ padding: "24px", marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Your Standing</h3>
            {ownRank == null ? (
              <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Not enough data yet for {metric.label.toLowerCase()} this period.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                <span style={{ fontFamily: "var(--font-support-new)", fontSize: "32px", fontWeight: 700, color: "#10C4C3" }}>#{ownRank}</span>
                <span style={{ fontSize: "14px", color: "#A9B4C2" }}>of {entries.length} · {metric.format(ownEntry!.value)}</span>
              </div>
            )}
          </Card>

          <Card style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Top 3 — {metric.label}</h3>
            {top3.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#6B7686" }}>No data yet for this metric/period.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {top3.map((e, i) => (
                  <div key={e.agentId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: e.agentId === state.agentId ? "rgba(16,196,195,0.08)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{RANK_MEDAL[i + 1]}</span>
                      {e.name}{e.agentId === state.agentId ? " (You)" : ""}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#10C4C3" }}>{metric.format(e.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes leaderboard-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
