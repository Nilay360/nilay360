// Shared agent-schedule aggregation — the three-source definition (this
// agent's calendar_events + assigned site_visits + inquiries with a
// next_follow_up set) originally built for /agent/calendar (Phase 11) and
// now reused by the dashboard overview's "Today's Schedule" stat (Phase 7).
// Keeping the query/shape logic in one place means the two surfaces can't
// quietly drift apart on what counts as "scheduled" — same reasoning as
// src/lib/notifications.ts.

import { createClient } from "@/lib/supabase/client";

export type ScheduleItemKind = "event" | "site_visit" | "follow_up";

export interface ScheduleItem {
  kind: ScheduleItemKind;
  id: string;       // the row's own id in its source table
  date: Date;
  title: string;
  subtitle?: string;
}

export interface CalendarEventRow {
  id: string;
  agent_profile_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  inquiry_id: string | null;
  site_visit_id: string | null;
  deal_id: string | null;
  property_id: string | null;
  reminder_minutes_before: number | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function isMissingSchemaError(error: { code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

export function eventToScheduleItem(e: CalendarEventRow): ScheduleItem {
  return {
    kind: "event",
    id: e.id,
    date: new Date(e.start_at),
    title: e.title,
    subtitle: e.location ?? undefined,
  };
}

/** Fetches this agent's raw calendar_events (full rows, needed for the
 *  calendar page's view/edit modal) plus site_visits and
 *  inquiries-with-follow-up already reshaped into ScheduleItems. Combine
 *  `events.map(eventToScheduleItem)` with siteVisitItems/followUpItems for
 *  the full three-source list. */
export async function loadAgentSchedule(agentId: string): Promise<{
  events: CalendarEventRow[];
  siteVisitItems: ScheduleItem[];
  followUpItems: ScheduleItem[];
}> {
  const supabase = createClient();

  const [eventsRes, visitsRes, leadsRes] = await Promise.all([
    supabase.from("calendar_events").select("*").eq("agent_profile_id", agentId).order("start_at", { ascending: true }),
    supabase.from("site_visits").select("id, visitor_name, property_title, visit_date, visit_time_slot").eq("assigned_to", agentId),
    supabase.from("inquiries").select("id, inquirer_name, next_follow_up").eq("assigned_to", agentId).not("next_follow_up", "is", null),
  ]);

  if (eventsRes.error && !isMissingSchemaError(eventsRes.error)) console.error("agentSchedule — calendar_events query error:", eventsRes.error);
  if (visitsRes.error) console.error("agentSchedule — site_visits query error:", visitsRes.error);
  if (leadsRes.error) console.error("agentSchedule — inquiries query error:", leadsRes.error);

  const events = (eventsRes.data as CalendarEventRow[] | null) ?? [];

  const visits = (visitsRes.data as { id: string; visitor_name: string; property_title: string | null; visit_date: string; visit_time_slot: string }[] | null) ?? [];
  const siteVisitItems: ScheduleItem[] = visits.map(v => ({
    kind: "site_visit" as const,
    id: v.id,
    date: startOfDay(new Date(v.visit_date)),
    title: v.visitor_name || "Site visit",
    subtitle: [v.visit_time_slot, v.property_title].filter(Boolean).join(" · "),
  }));

  const leads = (leadsRes.data as { id: string; inquirer_name: string | null; next_follow_up: string }[] | null) ?? [];
  const followUpItems: ScheduleItem[] = leads.map(l => ({
    kind: "follow_up" as const,
    id: l.id,
    date: new Date(l.next_follow_up),
    title: l.inquirer_name || "Unnamed lead",
    subtitle: "Follow-up due",
  }));

  return { events, siteVisitItems, followUpItems };
}
