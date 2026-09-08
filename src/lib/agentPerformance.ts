// Performance Analytics (Phase 21) — shared metric computation, used
// by both /agent/analytics (an agent viewing their own numbers) and
// /admin's "Agent Performance" section (an admin viewing every
// agent's numbers side by side). Pulled into src/lib rather than
// duplicated per-page (the usual convention for this codebase's list/
// detail page pairs) because this is the one piece of logic genuinely
// shared across two unrelated route trees (the agent portal and
// admin) — duplicating a ~9-query metric computation in both places
// would be the exact kind of drift risk this codebase has avoided
// elsewhere tonight (e.g. shares_team_with existing as one function
// instead of six inline copies).
//
// No schema changes anywhere in this file — every query reads
// migration 046's live deals.closed_at / call_logs, and existing
// live columns elsewhere. Average-duration metrics (avg time to first
// contact, avg time to close) are computed client-side from raw
// timestamp pairs rather than via a SQL avg(interval) expression,
// since PostgREST has no computed-expression select syntax for that
// without a dedicated RPC/view — and adding one would be a schema
// change, out of scope here.

import { createClient } from "@/lib/supabase/client";

export type Period = "week" | "month" | "year";

export interface AgentPerformanceMetrics {
  leadsAssigned: number;
  leadsContacted: number;
  dealsCreated: number;
  dealsClosed: number;
  conversionRatePct: number | null; // null when leadsAssigned is 0 — "no leads" is not "0%"
  avgTimeToFirstContactHours: number | null;
  avgTimeToCloseHours: number | null;
  siteVisitsCompleted: number;
  messagesSent: number;
  tasksCompleted: number;
  callsLogged: number;
}

// Monday-start week, no explicit upper bound on any query below (just
// `.gte(dateCol, start)`) — same "open-ended forward/backward filter"
// convention already used elsewhere in this codebase (e.g.
// site_visits' own "upcoming" filter is `.gte("visit_date", today)`
// with no end bound either).
export function periodStart(period: Period, now: Date = new Date()): Date {
  if (period === "week") {
    const day = now.getDay(); // 0 = Sunday .. 6 = Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

export const PERIOD_LABEL: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

function avgHoursBetween(rows: { start: string; end: string }[]): number | null {
  if (rows.length === 0) return null;
  const totalMs = rows.reduce((sum, r) => sum + (new Date(r.end).getTime() - new Date(r.start).getTime()), 0);
  return totalMs / rows.length / (1000 * 60 * 60);
}

export function formatDurationHours(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatPercent(pct: number | null): string {
  return pct == null ? "—" : `${pct.toFixed(0)}%`;
}

type Supabase = ReturnType<typeof createClient>;

export async function computeAgentPerformance(
  supabase: Supabase,
  agentProfileId: string,
  period: Period
): Promise<AgentPerformanceMetrics> {
  const startIso = periodStart(period).toISOString();
  const startDateStr = (() => {
    const d = periodStart(period);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [
    leadsAssignedRes,
    leadsContactedRes,
    dealsCreatedRes,
    dealsClosedRes,
    firstContactRowsRes,
    closedDealRowsRes,
    siteVisitsRes,
    messagesRes,
    tasksRes,
    callsRes,
  ] = await Promise.all([
    // Leads assigned — period applies to the inquiry's own created_at.
    supabase.from("inquiries").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).gte("created_at", startIso),
    // Leads contacted — same base set, plus last_contacted_at set.
    // Judgment call: "in period" filters created_at (same as leads
    // assigned), not last_contacted_at — this counts "of the leads
    // assigned in this period, how many have been contacted at all,"
    // not "how many contact events happened in this period."
    supabase.from("inquiries").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).gte("created_at", startIso).not("last_contacted_at", "is", null),
    // Deals created — period applies to the deal's own created_at.
    supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).gte("created_at", startIso),
    // Deals closed/won — period applies to closed_at (046, live),
    // not created_at or updated_at, per instruction.
    supabase.from("deals").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).eq("stage", "closed").gte("closed_at", startIso),
    // Raw pairs for avg time to first contact — same base filter as
    // leadsContacted above.
    supabase.from("inquiries").select("created_at, last_contacted_at")
      .eq("assigned_to", agentProfileId).gte("created_at", startIso).not("last_contacted_at", "is", null),
    // Raw pairs for avg time to close.
    supabase.from("deals").select("created_at, closed_at")
      .eq("assigned_to", agentProfileId).eq("stage", "closed").gte("closed_at", startIso),
    // Site visits completed — status vocabulary confirmed live in
    // src/app/agent/site-visits/[id]/page.tsx (VISIT_STATUSES),
    // 'completed' is the real value, not guessed. Judgment call:
    // period filters visit_date (the business date the visit actually
    // happened on), not created_at (when the row was scheduled) —
    // visit_date is a plain `date` column, so the string comparison
    // against startDateStr (not startIso) is deliberate.
    supabase.from("site_visits").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).eq("status", "completed").gte("visit_date", startDateStr),
    // Messages sent — sender_id keys off agent_profiles.id, same as
    // everywhere else in messaging (034).
    supabase.from("messages").select("id", { count: "exact", head: true })
      .eq("sender_id", agentProfileId).gte("created_at", startIso),
    // Tasks completed — status vocabulary is this UI's own judgment
    // call from Phase 19 (tasks.status is plain text, no enum);
    // 'done' is the value this codebase already uses for it.
    // completed_at, not created_at — a task created long ago but
    // finished this period should count this period.
    supabase.from("tasks").select("id", { count: "exact", head: true })
      .eq("assigned_to", agentProfileId).eq("status", "done").gte("completed_at", startIso),
    // Calls logged — call_logs (046, live).
    supabase.from("call_logs").select("id", { count: "exact", head: true })
      .eq("agent_profile_id", agentProfileId).gte("called_at", startIso),
  ]);

  const errors = [
    leadsAssignedRes.error, leadsContactedRes.error, dealsCreatedRes.error, dealsClosedRes.error,
    firstContactRowsRes.error, closedDealRowsRes.error, siteVisitsRes.error, messagesRes.error,
    tasksRes.error, callsRes.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    console.error("computeAgentPerformance — query error(s):", errors);
  }

  const leadsAssigned = leadsAssignedRes.count ?? 0;
  const dealsClosed = dealsClosedRes.count ?? 0;

  const firstContactRows = (firstContactRowsRes.data as { created_at: string; last_contacted_at: string }[] | null) ?? [];
  const closedDealRows = (closedDealRowsRes.data as { created_at: string; closed_at: string }[] | null) ?? [];

  return {
    leadsAssigned,
    leadsContacted: leadsContactedRes.count ?? 0,
    dealsCreated: dealsCreatedRes.count ?? 0,
    dealsClosed,
    conversionRatePct: leadsAssigned > 0 ? (dealsClosed / leadsAssigned) * 100 : null,
    avgTimeToFirstContactHours: avgHoursBetween(firstContactRows.map(r => ({ start: r.created_at, end: r.last_contacted_at }))),
    avgTimeToCloseHours: avgHoursBetween(closedDealRows.map(r => ({ start: r.created_at, end: r.closed_at }))),
    siteVisitsCompleted: siteVisitsRes.count ?? 0,
    messagesSent: messagesRes.count ?? 0,
    tasksCompleted: tasksRes.count ?? 0,
    callsLogged: callsRes.count ?? 0,
  };
}
