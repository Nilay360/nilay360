"use client";

// Agent Performance (Phase 21) — admin comparison view. Schema (046)
// is already live — this reads it, no schema changes here.
//
// Kept in its own file rather than inlined into admin/page.tsx (every
// other admin section is a component defined directly in that file):
// admin/page.tsx is already ~3000 lines with every section's data
// loaded through one central per-section useEffect keyed on `active`.
// This section's data need (every approved agent's full metric set,
// via computeAgentPerformance) doesn't fit that per-section-state
// shape without adding a dozen new top-level state variables to an
// already sprawling component — so this is self-fetching (owns its
// own useEffect/loading state), the same shape
// DashboardClient.tsx's useAgentOverviewStats hook already uses for
// an analogous "this needs its own multi-query fetch" case. Mounted
// from admin/page.tsx with zero props.
//
// Confirmed, not assumed: admin's own session can read agent_profiles
// and profiles directly for every agent, not just their own row —
// agent_profiles has no owner-only SELECT policy blocking is_admin()
// (every write/read policy this codebase has written all night ORs in
// public.is_admin()), and profiles has an explicit admin-only SELECT
// policy for exactly this (008_admin_profiles_rls.sql,
// "admin_select_all_profiles" — USING (public.is_admin())). So this
// queries `profiles` directly for names, unlike the agent-portal
// picker/name-resolution code (resolveAgentNames in
// src/app/agent/messages/page.tsx), which deliberately avoids
// `profiles` and uses the `public_agent_contact` view instead — that
// workaround exists because a non-admin agent's own session can't
// read other users' `profiles` rows, which isn't this session's
// situation at all.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeAgentPerformance, formatDurationHours, formatPercent, PERIOD_LABEL,
  type Period, type AgentPerformanceMetrics,
} from "@/lib/agentPerformance";

interface AgentRow {
  agentProfileId: string;
  fullName: string;
  metrics: AgentPerformanceMetrics | null;
}

type SortKey = keyof AgentPerformanceMetrics | "fullName";

const PERIODS: Period[] = ["week", "month", "year"];

const COLUMNS: { key: SortKey; label: string; format: (r: AgentRow) => string }[] = [
  { key: "fullName", label: "Agent", format: r => r.fullName },
  { key: "leadsAssigned", label: "Leads Assigned", format: r => String(r.metrics?.leadsAssigned ?? "—") },
  { key: "leadsContacted", label: "Leads Contacted", format: r => String(r.metrics?.leadsContacted ?? "—") },
  { key: "dealsCreated", label: "Deals Created", format: r => String(r.metrics?.dealsCreated ?? "—") },
  { key: "dealsClosed", label: "Deals Closed", format: r => String(r.metrics?.dealsClosed ?? "—") },
  { key: "conversionRatePct", label: "Conversion", format: r => formatPercent(r.metrics?.conversionRatePct ?? null) },
  { key: "avgTimeToFirstContactHours", label: "Avg. First Contact", format: r => formatDurationHours(r.metrics?.avgTimeToFirstContactHours ?? null) },
  { key: "avgTimeToCloseHours", label: "Avg. Time to Close", format: r => formatDurationHours(r.metrics?.avgTimeToCloseHours ?? null) },
  { key: "siteVisitsCompleted", label: "Site Visits", format: r => String(r.metrics?.siteVisitsCompleted ?? "—") },
  { key: "messagesSent", label: "Messages", format: r => String(r.metrics?.messagesSent ?? "—") },
  { key: "tasksCompleted", label: "Tasks Done", format: r => String(r.metrics?.tasksCompleted ?? "—") },
  { key: "callsLogged", label: "Calls Logged", format: r => String(r.metrics?.callsLogged ?? "—") },
];

function sortValue(row: AgentRow, key: SortKey): number | string {
  if (key === "fullName") return row.fullName.toLowerCase();
  const v = row.metrics?.[key];
  return v == null ? -Infinity : v;
}

export default function AgentPerformanceSection() {
  const [period, setPeriod] = useState<Period>("month");
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: agents, error: agentsErr } = await supabase
        .from("agent_profiles")
        .select("id, user_id")
        .eq("status", "approved");
      if (agentsErr) {
        if (!cancelled) { setError(agentsErr.message); setLoading(false); }
        return;
      }
      const agentRows = (agents as { id: string; user_id: string }[] | null) ?? [];

      const userIds = agentRows.map(a => a.user_id);
      const nameByUserId = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles").select("id, full_name").in("id", userIds);
        if (profilesErr) console.error("AgentPerformanceSection — profiles query error:", profilesErr);
        (profiles as { id: string; full_name: string | null }[] | null ?? []).forEach(p => nameByUserId.set(p.id, p.full_name ?? "Unnamed agent"));
      }

      const withMetrics = await Promise.all(agentRows.map(async a => {
        const metrics = await computeAgentPerformance(supabase, a.id, period);
        return { agentProfileId: a.id, fullName: nameByUserId.get(a.user_id) ?? "Unnamed agent", metrics };
      }));

      if (!cancelled) { setRows(withMetrics); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [period]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "fullName" ? "asc" : "desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", fontWeight: 600, color: "#FFFFFF" }}>Agent Performance</h2>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "4px" }}>Every approved agent's funnel, speed, and activity metrics, side by side.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "8px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em",
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
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{ padding: "12px 16px", textAlign: col.key === "fullName" ? "left" : "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}
                    >
                      {col.label}{sortKey === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row.agentProfileId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {COLUMNS.map(col => (
                      <td
                        key={col.key}
                        style={{ padding: "12px 16px", textAlign: col.key === "fullName" ? "left" : "right", color: col.key === "fullName" ? "#FFFFFF" : "#A9B4C2", fontWeight: col.key === "fullName" ? 600 : 400, whiteSpace: "nowrap" }}
                      >
                        {col.format(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: "11px", color: "#6B7686", marginTop: "10px" }}>
        ⓘ Avg. First Contact is approximate — based on last_contacted_at, which records the most recent contact, not necessarily the first.
      </p>
    </div>
  );
}
