import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Phase 12 (Follow-ups) + Phase 11 (Calendar) — scheduled check. In-app
// notifications only, per explicit scope decision — no email, no
// WhatsApp.
//
// Two clearly separate steps in this one route, sharing the same admin
// client and auth check rather than a second cron/route: lead
// follow-ups (inquiries.next_follow_up) and calendar event reminders
// (calendar_events.reminder_minutes_before). Kept as two named
// functions below instead of interleaved logic, so each dedupe
// strategy stays legible on its own — they're genuinely different
// problems (see checkCalendarReminders' own comment for why it doesn't
// reuse checkFollowUps' metadata-dedupe approach).
//
// This runs server-side under a service-role client, same pattern as
// src/app/api/check-saved-search-alerts/route.ts's getAdminClient() —
// necessary here specifically because it must write a notification
// addressed to a *different* user (the assigned agent) than whoever
// (or whatever, in this case Vercel Cron) is calling the route. The
// live `notif_own` RLS policy on `notifications`
// (001_nivila_schema.sql:734, `FOR ALL USING (user_id = auth.uid())`)
// only lets a user act on their own rows — a normal authenticated
// client could never insert a notification on someone else's behalf,
// by design. This is legitimate server-side application code using its
// own service credential for a batch job — not the same thing as
// manually running ad-hoc writes against the database outside real
// app code.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface DueInquiry {
  id: string;
  inquirer_name: string | null;
  next_follow_up: string;
  assigned_to: string;
}

async function checkFollowUps(supabase: SupabaseClient) {
  const nowIso = new Date().toISOString();

  // Due inquiries: has a follow-up date, it's in the past or now, and
  // has an assigned agent (notifications.user_id is NOT NULL — there's
  // no one to notify for an unassigned lead, so those are skipped, not
  // an error).
  const { data: dueInquiries, error: dueErr } = await supabase
    .from("inquiries")
    .select("id, inquirer_name, next_follow_up, assigned_to")
    .not("next_follow_up", "is", null)
    .lte("next_follow_up", nowIso)
    .not("assigned_to", "is", null);

  if (dueErr) throw new Error("inquiries query error: " + dueErr.message);

  const due = (dueInquiries as DueInquiry[] | null) ?? [];
  if (due.length === 0) {
    return { due: 0, created: 0, skippedDuplicate: 0, skippedNoAgentUser: 0 };
  }

  // Resolve assigned_to (agent_profiles.id) -> agent_profiles.user_id
  // (profiles.id, what notifications.user_id actually references) —
  // batched, same "fetch then map" pattern used throughout this
  // codebase rather than a per-row lookup.
  const agentProfileIds = [...new Set(due.map(i => i.assigned_to))];
  const { data: agentProfiles, error: agentErr } = await supabase
    .from("agent_profiles")
    .select("id, user_id")
    .in("id", agentProfileIds);

  if (agentErr) throw new Error("agent_profiles query error: " + agentErr.message);

  const agentUserMap = new Map<string, string>(
    ((agentProfiles as { id: string; user_id: string }[] | null) ?? []).map(a => [a.id, a.user_id])
  );

  // Dedupe: has a notification already been created for this exact
  // (inquiry_id, follow_up_date) pair? No dedicated column for this —
  // notifications is a generic table — so the pairing is stored in
  // `metadata` (jsonb) and checked via PostgREST's ->> json-path filter
  // syntax, batched as one query rather than one per inquiry. This is
  // an application-level check, not a DB uniqueness constraint: safe
  // for a once-daily batch job with no realistic concurrent-run risk,
  // so no migration was needed for this — flagging that choice rather
  // than silently drafting a constraint that isn't actually required.
  const inquiryIds = due.map(i => i.id);
  const { data: existingNotifs, error: existingErr } = await supabase
    .from("notifications")
    .select("metadata")
    .eq("type", "lead_follow_up")
    .in("metadata->>inquiry_id", inquiryIds);

  if (existingErr) throw new Error("existing notifications query error: " + existingErr.message);

  const alreadyNotified = new Set(
    ((existingNotifs as { metadata: { inquiry_id?: string; follow_up_date?: string } | null }[] | null) ?? [])
      .filter(n => n.metadata?.inquiry_id && n.metadata?.follow_up_date)
      .map(n => `${n.metadata!.inquiry_id}:${n.metadata!.follow_up_date}`)
  );

  let created = 0;
  let skippedDuplicate = 0;
  let skippedNoAgentUser = 0;
  const toInsert: {
    user_id: string;
    title: string;
    body: string;
    type: string;
    channel: string;
    action_url: string;
    metadata: { inquiry_id: string; follow_up_date: string };
  }[] = [];

  for (const inquiry of due) {
    const key = `${inquiry.id}:${inquiry.next_follow_up}`;
    if (alreadyNotified.has(key)) { skippedDuplicate++; continue; }
    const userId = agentUserMap.get(inquiry.assigned_to);
    if (!userId) { skippedNoAgentUser++; continue; }

    toInsert.push({
      user_id: userId,
      title: "Follow-up due",
      body: `Follow-up due for ${inquiry.inquirer_name || "a lead"}`,
      type: "lead_follow_up",
      channel: "in_app",
      action_url: `/agent/leads/${inquiry.id}`,
      metadata: { inquiry_id: inquiry.id, follow_up_date: inquiry.next_follow_up },
    });
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("notifications").insert(toInsert);
    if (insertErr) throw new Error("notifications insert error: " + insertErr.message);
    created = toInsert.length;
  }

  return { due: due.length, created, skippedDuplicate, skippedNoAgentUser };
}

interface DueCalendarEvent {
  id: string;
  title: string;
  start_at: string;
  reminder_minutes_before: number;
  agent_profile_id: string;
}

async function checkCalendarReminders(supabase: SupabaseClient) {
  // Candidates: has a reminder configured, hasn't fired yet.
  // reminder_minutes_before varies per row, so "is this one due yet"
  // can't be expressed as a single PostgREST range filter the way
  // next_follow_up <= now() can — it's fetched and filtered in JS
  // instead. This table is agent-scoped and small by nature (one
  // agent's own scheduled events), so this isn't the kind of unbounded
  // table scan that would need a database-side computed comparison.
  const { data: candidates, error: candErr } = await supabase
    .from("calendar_events")
    .select("id, title, start_at, reminder_minutes_before, agent_profile_id")
    .not("reminder_minutes_before", "is", null)
    .eq("reminder_sent", false);

  if (candErr) throw new Error("calendar_events query error: " + candErr.message);

  const now = Date.now();
  const due = ((candidates as DueCalendarEvent[] | null) ?? []).filter(
    e => new Date(e.start_at).getTime() - e.reminder_minutes_before * 60_000 <= now
  );

  if (due.length === 0) {
    return { due: 0, created: 0, skippedNoAgentUser: 0 };
  }

  const agentProfileIds = [...new Set(due.map(e => e.agent_profile_id))];
  const { data: agentProfiles, error: agentErr } = await supabase
    .from("agent_profiles")
    .select("id, user_id")
    .in("id", agentProfileIds);

  if (agentErr) throw new Error("agent_profiles query error: " + agentErr.message);

  const agentUserMap = new Map<string, string>(
    ((agentProfiles as { id: string; user_id: string }[] | null) ?? []).map(a => [a.id, a.user_id])
  );

  // Dedupe: reminder_sent is a real column on this exact row — set it
  // true the moment a notification is created for it, and never
  // re-check a row once it's true (the .eq("reminder_sent", false)
  // above excludes it from every future run). No metadata-based
  // matching needed here, unlike checkFollowUps: a follow-up date can
  // be edited repeatedly on the same inquiry (so "already notified"
  // has to be checked per specific date value), but a calendar event
  // has exactly one reminder to ever fire — the row's own boolean flag
  // is the direct, correct dedupe mechanism, per the reasoning already
  // written into migration 032 itself.
  let created = 0;
  let skippedNoAgentUser = 0;
  const toInsert: {
    user_id: string;
    title: string;
    body: string;
    type: string;
    channel: string;
    action_url: string;
    metadata: { calendar_event_id: string };
  }[] = [];
  const firedEventIds: string[] = [];

  for (const event of due) {
    const userId = agentUserMap.get(event.agent_profile_id);
    if (!userId) { skippedNoAgentUser++; continue; }

    toInsert.push({
      user_id: userId,
      title: "Upcoming event",
      body: `${event.title} at ${new Date(event.start_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      type: "calendar_reminder",
      channel: "in_app",
      action_url: "/agent/calendar",
      metadata: { calendar_event_id: event.id },
    });
    firedEventIds.push(event.id);
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("notifications").insert(toInsert);
    if (insertErr) throw new Error("notifications insert error: " + insertErr.message);

    const { error: updateErr } = await supabase
      .from("calendar_events")
      .update({ reminder_sent: true })
      .in("id", firedEventIds);
    if (updateErr) throw new Error("calendar_events reminder_sent update error: " + updateErr.message);

    created = toInsert.length;
  }

  return { due: due.length, created, skippedNoAgentUser };
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically
  // once CRON_SECRET is set as an env var on the project. If it isn't
  // set yet, this check is skipped rather than hard-failing, so the
  // route stays manually testable before that env var exists — but
  // that also means an unset CRON_SECRET leaves this route callable by
  // anyone who knows the URL. Set CRON_SECRET before relying on this
  // in production.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("check-follow-ups: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const supabase = getAdminClient();

  let followUps: Awaited<ReturnType<typeof checkFollowUps>>;
  try {
    followUps = await checkFollowUps(supabase);
  } catch (err) {
    console.error("check-follow-ups: follow-up check failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "follow-up check failed" }, { status: 500 });
  }

  let calendarReminders: Awaited<ReturnType<typeof checkCalendarReminders>>;
  try {
    calendarReminders = await checkCalendarReminders(supabase);
  } catch (err) {
    console.error("check-follow-ups: calendar reminder check failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "calendar reminder check failed" }, { status: 500 });
  }

  return NextResponse.json({ followUps, calendarReminders });
}
