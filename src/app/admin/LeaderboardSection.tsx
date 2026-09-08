"use client";

// Leaderboard — admin comparison view (Phase 25). Schema (047) is
// already live — this reads it, no schema changes here.
//
// Same self-fetching, own-file shape as AgentPerformanceSection.tsx
// (Phase 21) and for the same reason: admin/page.tsx is already
// ~3000 lines with every other section threaded through one central
// per-section useEffect, and this section's data need (every
// approved agent's value for one selected metric, regardless of
// leaderboard_opt_out) doesn't fit that shape without adding more
// top-level state to an already sprawling component. Not a
// modification to AgentPerformanceSection.tsx — a new, separate file,
// same pattern.
//
// Difference from the agent-facing page (src/app/agent/leaderboard/
// page.tsx): admin sees EVERY approved agent, including opted-out
// ones (opt-out only hides someone from the agent-facing view, not
// from admin) — plus an explicit "Opted Out" column so admin can see
// who's hidden from their peers. One metric column (whichever is
// selected), not the full 11-metric set AgentPerformanceSection
// shows — this is a ranking view, not a full comparison table.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeAgentPerformance, formatDurationHours, formatPercent, PERIOD_LABEL,
  type Period, type AgentPerformanceMetrics,
} from "@/lib/agentPerformance";

type MetricKey = "leadsAssigned" | "dealsClosed" | "conversionRatePct" | "avgTimeToCloseHours" | "callsLogged";

interface MetricConfig {
  key: MetricKey;
  label: string;
  direction: "asc" | "desc";
  format: (v: number | null) => string;
}

const METRICS: MetricConfig[] = [
  { key: "leadsAssigned",       label: "Leads Assigned",    direction: "desc", format: v => v == null ? "—" : String(v) },
  { key: "dealsClosed",         label: "Deals Closed",      direction: "desc", format: v => v == null ? "—" : String(v) },
  { key: "conversionRatePct",   label: "Conversion Rate",   direction: "desc", format: formatPercent },
  { key: "avgTimeToCloseHours", label: "Avg Time to Close", direction: "asc",  format: formatDurationHours },
  { key: "callsLogged",         label: "Calls Logged",      direction: "desc", format: v => v == null ? "—" : String(v) },
];

const PERIODS: Period[] = ["week", "month", "year"];

interface AgentRow {
  agentProfileId: string;
  fullName: string;
  optedOut: boolean;
  value: number | null;
}

export default function LeaderboardSection() {
  const [period, setPeriod] = useState<Period>("month");
  const [metricKey, setMetricKey] = useState<MetricKey>("leadsAssigned");
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const metric = METRICS.find(m => m.key === metricKey)!;

  // Reset sort direction to the metric's own natural "best first"
  // direction whenever the metric changes — avoids the admin having
  // to remember that lower is better for one metric but not the
  // others every time they switch the dropdown.
  useEffect(() => { setSortDir(metric.direction); }, [metricKey, metric.direction]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: agents, error: agentsErr } = await supabase
        .from("agent_profiles")
        .select("id, user_id, leaderboard_opt_out")
        .eq("status", "approved");
      if (agentsErr) {
        if (!cancelled) { setError(agentsErr.message); setLoading(false); }
        return;
      }
      const agentRows = (agents as { id: string; user_id: string; leaderboard_opt_out: boolean }[] | null) ?? [];

      const userIds = agentRows.map(a => a.user_id);
      const nameByUserId = new Map<string, string>();
      if (userIds.length > 0) {
        // Admin's own session can read profiles directly (008's
        // admin_select_all_profiles policy) — same reasoning already
        // confirmed for AgentPerformanceSection.tsx, not re-derived
        // here.
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles").select("id, full_name").in("id", userIds);
        if (profilesErr) console.error("LeaderboardSection — profiles query error:", profilesErr);
        (profiles as { id: string; full_name: string | null }[] | null ?? []).forEach(p => nameByUserId.set(p.id, p.full_name ?? "Unnamed agent"));
      }

      const withMetric = await Promise.all(agentRows.map(async a => {
        const metrics: AgentPerformanceMetrics = await computeAgentPerformance(supabase, a.id, period);
        return {
          agentProfileId: a.id,
          fullName: nameByUserId.get(a.user_id) ?? "Unnamed agent",
          optedOut: a.leaderboard_opt_out,
          value: metrics[metricKey],
        };
      }));

      if (!cancelled) { setRows(withMetric); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [period, metricKey]);

  const sorted = [...rows].sort((a, b) => {
    if (a.value == null && b.value == null) return 0;
    if (a.value == null) return 1;  // nulls last regardless of sort direction
    if (b.value == null) return -1;
    const cmp = a.value - b.value;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", fontWeight: 600, color: "#FFFFFF" }}>Leaderboard</h2>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "4px" }}>Every approved agent, ranked by the selected metric — includes agents opted out of the agent-facing leaderboard.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={metricKey}
            onChange={e => setMetricKey(e.target.value as MetricKey)}
            style={{ padding: "8px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "12px", outline: "none", cursor: "pointer" }}
          >
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{ padding: "8px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", background: period === p ? "#10C4C3" : "rgba(255,255,255,0.06)", color: period === p ? "#020C1C" : "#FFFFFF", border: period === p ? "none" : "1.5px solid rgba(255,255,255,0.15)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: "13px", color: "#F87171", marginBottom: "14px" }}>Something went wrong: {error}</p>}

      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#A9B4C2", fontSize: "13px" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#A9B4C2", fontSize: "13px" }}>No approved agents yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Rank</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Agent</th>
                  <th
                    onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
                    style={{ padding: "12px 16px", textAlign: "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", userSelect: "none" }}
                  >
                    {metric.label}{sortDir === "asc" ? " ▲" : " ▼"}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Opted Out</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.agentProfileId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", color: "#A9B4C2" }}>{row.value != null ? `#${i + 1}` : "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#FFFFFF", fontWeight: 600 }}>{row.fullName}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#A9B4C2" }}>{metric.format(row.value)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {row.optedOut && (
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "1px solid rgba(255,255,255,0.18)" }}>
                          Opted Out
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
