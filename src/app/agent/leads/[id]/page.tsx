"use client";

// Phase 8 (Lead Management) — visual pass, detail page.
// Same shared building blocks and color/font rules as ../page.tsx.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "../page";
import { Card, LeadStatusBadge, PriorityBadge } from "../page";
import { VisitStatusBadge } from "../../site-visits/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dot colors for the status Select — every value already real/live on this
// site: teal (brand accent), blue (#3B82F6, already used for "For Rent" on
// PropCard), amber (#FBBF24, existing IconAlert color), green (#4ADE80,
// existing "contacted"/success tone), red (#F87171, existing "rejected"
// tone), neutral gray (#A9B4C2, existing muted tone).
const STATUS_DOT_COLOR: Record<LeadStatus, string> = {
  new: "#10C4C3",
  contacted: "#10C4C3",
  qualified: "#3B82F6",
  viewing_scheduled: "#FBBF24",
  negotiation: "#FBBF24",
  closed: "#4ADE80",
  lost: "#F87171",
  spam: "#A9B4C2",
};

function StatusDot({ status }: { status: LeadStatus }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: STATUS_DOT_COLOR[status] }}
    />
  );
}

const LEAD_STATUSES: LeadStatus[] = [
  "new", "contacted", "qualified", "viewing_scheduled",
  "negotiation", "closed", "lost", "spam",
];

// Property Matching (Phase 10, Part 4). Real property_listings columns only
// (bedrooms, property_category, locality, city, price — confirmed live via
// OpenAPI introspection in migration 025's own commentary). No fabricated
// fields, no invented "match score" beyond a plain price-distance sort.
interface MatchedProperty {
  id: string;
  slug: string;
  title: string;
  price: number;
  bedrooms: string | null;
  property_category: string | null;
  city: string | null;
  locality: string | null;
  listing_type: string | null;
  photo_urls: string[] | null;
}

type MatchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; mode: "structured" | "fallback"; results: MatchedProperty[] };

const MATCH_SELECT = "id, slug, title, price, bedrooms, property_category, city, locality, listing_type, photo_urls";

interface LeadActivity {
  id: string;
  inquiry_id: string;
  actor_id: string | null;
  type: string;
  content: string | null;
  metadata: unknown;
  created_at: string;
}

// Site Visits (Phase 13, Part 2) — inline summary if a site_visits row is
// linked to this lead via inquiry_id (migration 028). Only the fields
// this summary actually renders — full detail lives at
// /agent/site-visits/[id].
interface LinkedSiteVisit {
  id: string;
  visit_date: string;
  visit_time_slot: string;
  status: string;
}

// Call Logs (Phase 21) — call_logs table, migration 046, already live.
interface CallLogRow {
  id: string;
  direction: string;
  notes: string | null;
  called_at: string;
}

const CALL_DIRECTIONS = ["outbound", "inbound"] as const;

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; userId: string; lead: Lead; activities: LeadActivity[]; siteVisits: LinkedSiteVisit[]; dealId: string | null; callLogs: CallLogRow[] };

function isMissingSchemaError(error: { code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// site_visits.visit_date is a plain `date` column (no time component) —
// using fmtDateTime on it would fabricate a fake midnight time in the
// display, so this is a separate date-only formatter, same as
// ../../site-visits/page.tsx's fmtDate.
function fmtDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function IconPhone() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IconMail() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>;
}
function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconClock() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

// Follow-up Date (Phase 12) — same datetime <-> <input type="datetime-local">
// conversion any date/time picker needs: the input wants local
// "YYYY-MM-DDTHH:mm" with no timezone, the DB stores/returns a real
// timestamptz ISO string.
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FollowUpUrgency = "overdue" | "today" | null;
function followUpUrgency(nextFollowUp: string | null): FollowUpUrgency {
  if (!nextFollowUp) return null;
  const due = new Date(nextFollowUp);
  const now = new Date();
  if (due < now) return "overdue";
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (due <= todayEnd) return "today";
  return null;
}

type SaveMessage = { type: "success" | "error"; text: string } | null;
function SaveConfirmation({ message }: { message: SaveMessage }) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <span style={{ fontSize: "12px", fontWeight: 600, color: isError ? "#F87171" : "#4ADE80", display: "inline-flex", alignItems: "center", gap: "5px" }}>
      {isError ? "⚠" : "✓"} {message.text}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7686", textTransform: "uppercase", marginBottom: "4px" }}>{label}</p>
      <div style={{ fontSize: "14px", color: "#FFFFFF" }}>{children}</div>
    </div>
  );
}

export default function AgentLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = (params?.id as string) ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [matching, setMatching] = useState<MatchState>({ kind: "idle" });
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [startingDeal, setStartingDeal] = useState(false);

  // Follow-up Date (Phase 12) — view/edit/save/confirm, same pattern as
  // Deals' deal_price/notes fields: view mode by default, Edit reveals
  // the picker, Save persists + flashes an inline confirmation, then
  // returns to view mode.
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [followUpInput, setFollowUpInput] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState<SaveMessage>(null);

  // Log a Call (Phase 21) — call_logs, migration 046, already live.
  const [callDirection, setCallDirection] = useState<(typeof CALL_DIRECTIONS)[number]>("outbound");
  const [callNotes, setCallNotes] = useState("");
  const [callAt, setCallAt] = useState(() => isoToDatetimeLocal(new Date().toISOString()));
  const [loggingCall, setLoggingCall] = useState(false);
  const [callMessage, setCallMessage] = useState<SaveMessage>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    // agent_profiles is the real, canonical agent table — see ../page.tsx
    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: lead, error: leadErr } = await supabase
      .from("inquiries")
      .select(
        "id, property_id, property_slug, property_title, inquirer_name, inquirer_email, inquirer_phone, message, inquiry_type, status, priority, source, next_follow_up, last_contacted_at, assigned_to, created_at, budget_min, budget_max, bhk, preferred_locality, preferred_city, property_type_preference"
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr) {
      if (isMissingSchemaError(leadErr)) setState({ kind: "schema_not_ready", detail: leadErr.message });
      else setState({ kind: "error", detail: leadErr.message });
      return;
    }
    if (!lead) { setState({ kind: "not_found" }); return; }
    if ((lead as Lead).assigned_to !== agentRow.id) { setState({ kind: "forbidden" }); return; }

    const { data: activities, error: actErr } = await supabase
      .from("inquiry_activities")
      .select("id, inquiry_id, actor_id, type, content, metadata, created_at")
      .eq("inquiry_id", leadId)
      .order("created_at", { ascending: false });

    if (actErr && !isMissingSchemaError(actErr)) {
      console.error("agent/leads/[id] — activities query error:", actErr);
    }

    // Site Visits (Phase 13, Part 2) — linked visit, if any. Not an error
    // condition if none exists or if the query fails on a schema that
    // predates migration 028 (isMissingSchemaError) — this summary is
    // additive, so it silently shows nothing rather than surfacing a
    // second error state on top of the lead's own.
    const { data: siteVisits, error: visitsErr } = await supabase
      .from("site_visits")
      .select("id, visit_date, visit_time_slot, status")
      .eq("inquiry_id", leadId)
      .order("visit_date", { ascending: false });

    if (visitsErr && !isMissingSchemaError(visitsErr)) {
      console.error("agent/leads/[id] — linked site_visits query error:", visitsErr);
    }

    // Deals (Phase 15/16, Part 2) — does a deal already exist for this
    // lead? Duplicate check before offering "Start Deal", per the
    // constraint against creating a second deal for the same inquiry_id
    // without asking.
    const { data: existingDeal, error: dealErr } = await supabase
      .from("deals")
      .select("id")
      .eq("inquiry_id", leadId)
      .maybeSingle();

    if (dealErr && !isMissingSchemaError(dealErr)) {
      console.error("agent/leads/[id] — linked deal query error:", dealErr);
    }

    // Call Logs (Phase 21) — additive, same "don't fail the whole page
    // over a secondary query" treatment as activities/siteVisits above.
    const { data: callLogs, error: callLogsErr } = await supabase
      .from("call_logs")
      .select("id, direction, notes, called_at")
      .eq("inquiry_id", leadId)
      .order("called_at", { ascending: false });
    if (callLogsErr) console.error("agent/leads/[id] — call_logs query error:", callLogsErr);

    setState({
      kind: "ready",
      agentId: agentRow.id,
      userId: uid,
      lead: lead as Lead,
      activities: (activities as LeadActivity[] | null) ?? [],
      siteVisits: (siteVisits as LinkedSiteVisit[] | null) ?? [],
      dealId: (existingDeal as { id: string } | null)?.id ?? null,
      callLogs: (callLogs as CallLogRow[] | null) ?? [],
    });
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(newStatus: LeadStatus) {
    if (state.kind !== "ready") return;
    setSavingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ status: newStatus, last_contacted_at: new Date().toISOString() })
      .eq("id", state.lead.id);
    setSavingStatus(false);
    if (error) {
      console.error("Status update error:", error);
      alert("Could not update status: " + error.message);
      return;
    }
    setState({ ...state, lead: { ...state.lead, status: newStatus } });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready" || !noteText.trim()) return;
    setPostingNote(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inquiry_activities")
      .insert({ inquiry_id: state.lead.id, actor_id: state.userId, type: "note", content: noteText.trim() })
      .select("id, inquiry_id, actor_id, type, content, metadata, created_at")
      .single();
    setPostingNote(false);
    if (error) {
      console.error("Add note error:", error);
      alert("Could not save note: " + error.message);
      return;
    }
    setNoteText("");
    setState({ ...state, activities: [data as LeadActivity, ...state.activities] });
  }

  function startEditingFollowUp() {
    if (state.kind !== "ready") return;
    setFollowUpInput(state.lead.next_follow_up ? isoToDatetimeLocal(state.lead.next_follow_up) : "");
    setFollowUpMessage(null);
    setEditingFollowUp(true);
  }

  function cancelEditingFollowUp() {
    setFollowUpMessage(null);
    setEditingFollowUp(false);
  }

  async function handleSaveFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    setSavingFollowUp(true);
    setFollowUpMessage(null);
    const nextValue = followUpInput ? new Date(followUpInput).toISOString() : null;
    const supabase = createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ next_follow_up: nextValue })
      .eq("id", state.lead.id);
    setSavingFollowUp(false);
    if (error) {
      console.error("Follow-up date update error:", error);
      setFollowUpMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    setState({ ...state, lead: { ...state.lead, next_follow_up: nextValue } });
    setEditingFollowUp(false);
    setFollowUpMessage({ type: "success", text: "Saved" });
    setTimeout(() => setFollowUpMessage(null), 2500);
  }

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    setLoggingCall(true);
    setCallMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        agent_profile_id: state.agentId,
        inquiry_id: state.lead.id,
        direction: callDirection,
        notes: callNotes.trim() || null,
        called_at: new Date(callAt).toISOString(),
      })
      .select("id, direction, notes, called_at")
      .single();
    setLoggingCall(false);
    if (error) {
      console.error("Log call error:", error);
      setCallMessage({ type: "error", text: "Could not log call: " + error.message });
      return;
    }
    setState({ ...state, callLogs: [data as CallLogRow, ...state.callLogs] });
    setCallNotes("");
    setCallAt(isoToDatetimeLocal(new Date().toISOString()));
    setCallMessage({ type: "success", text: "Call logged" });
    setTimeout(() => setCallMessage(null), 2500);
  }

  async function handleStartDeal() {
    if (state.kind !== "ready" || state.dealId) return;
    setStartingDeal(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deals")
      .insert({
        inquiry_id: state.lead.id,
        site_visit_id: null,
        property_id: state.lead.property_id,
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

  async function findMatches() {
    if (state.kind !== "ready") return;
    const { lead } = state;
    setMatching({ kind: "loading" });
    const supabase = createClient();

    const hasStructuredPreferences =
      lead.budget_min != null || lead.budget_max != null || lead.bhk != null ||
      lead.preferred_locality != null || lead.preferred_city != null || lead.property_type_preference != null;

    if (hasStructuredPreferences) {
      let query = supabase.from("property_listings").select(MATCH_SELECT).eq("status", "active");
      if (lead.budget_min != null) query = query.gte("price", lead.budget_min);
      if (lead.budget_max != null) query = query.lte("price", lead.budget_max);
      if (lead.bhk) query = query.eq("bedrooms", lead.bhk);
      if (lead.preferred_city) query = query.eq("city", lead.preferred_city);
      if (lead.preferred_locality) query = query.ilike("locality", `%${lead.preferred_locality}%`);
      if (lead.property_type_preference) query = query.eq("property_category", lead.property_type_preference);

      const { data, error } = await query.limit(20);
      if (error) { setMatching({ kind: "error", detail: error.message }); return; }

      // Closeness: distance from the price to the midpoint of the stated
      // budget range when both bounds are given; otherwise leave DB order
      // (there's no single stated preference point to measure distance from).
      const results = (data as MatchedProperty[]) ?? [];
      if (lead.budget_min != null && lead.budget_max != null) {
        const mid = (lead.budget_min + lead.budget_max) / 2;
        results.sort((a, b) => Math.abs(a.price - mid) - Math.abs(b.price - mid));
      }
      setMatching({ kind: "ready", mode: "structured", results });
      return;
    }

    // Fallback: no stated preference fields at all (true for every
    // pre-migration/pre-form-launch inquiry). Base similarity on the
    // property the inquiry actually referenced — same city, similar price
    // band, same bedroom count as that property. Never presented as a real
    // preference match — the UI labels this state explicitly.
    if (!lead.property_id) { setMatching({ kind: "ready", mode: "fallback", results: [] }); return; }

    const { data: refProperty, error: refErr } = await supabase
      .from("property_listings")
      .select("price, city, bedrooms")
      .eq("id", lead.property_id)
      .maybeSingle();

    if (refErr || !refProperty) {
      setMatching({ kind: "ready", mode: "fallback", results: [] });
      return;
    }

    let query = supabase.from("property_listings").select(MATCH_SELECT)
      .eq("status", "active")
      .neq("id", lead.property_id);
    if (refProperty.city) query = query.eq("city", refProperty.city);
    if (refProperty.bedrooms) query = query.eq("bedrooms", refProperty.bedrooms);
    if (refProperty.price != null) {
      query = query.gte("price", refProperty.price * 0.75).lte("price", refProperty.price * 1.25);
    }

    const { data, error } = await query.limit(20);
    if (error) { setMatching({ kind: "error", detail: error.message }); return; }

    const results = (data as MatchedProperty[]) ?? [];
    results.sort((a, b) => Math.abs(a.price - refProperty.price) - Math.abs(b.price - refProperty.price));
    setMatching({ kind: "ready", mode: "fallback", results });
  }

  async function sendToCustomer(property: MatchedProperty) {
    if (state.kind !== "ready") return;
    setSharingId(property.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inquiry_activities")
      .insert({
        inquiry_id: state.lead.id,
        actor_id: state.userId,
        type: "property_shared",
        content: `Shared property: ${property.title} (₹${property.price.toLocaleString("en-IN")})`,
        metadata: { property_id: property.id, property_slug: property.slug, property_title: property.title, price: property.price },
      })
      .select("id, inquiry_id, actor_id, type, content, metadata, created_at")
      .single();
    setSharingId(null);
    if (error) {
      console.error("Send to customer error:", error);
      alert("Could not share property: " + error.message);
      return;
    }
    setState({ ...state, activities: [data as LeadActivity, ...state.activities] });
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "lead-spin 0.8s linear infinite" }}>
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
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view this lead.</p>
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
      <Shell backHref="/agent/leads" backLabel="← All Leads">
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Lead management schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>Depends on migrations 012/013, written and verified but not yet run against this database.</p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_found") {
    return <Shell backHref="/agent/leads" backLabel="← All Leads"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Lead not found.</p></Card></Shell>;
  }
  if (state.kind === "forbidden") {
    return <Shell backHref="/agent/leads" backLabel="← All Leads"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This lead is not assigned to you.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell backHref="/agent/leads" backLabel="← All Leads"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  const { lead, activities, siteVisits, dealId, callLogs } = state;

  return (
    <Shell backHref="/agent/leads" backLabel="← All Leads">
      <div className="lead-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>{lead.inquirer_name || "Unnamed Lead"}</h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <LeadStatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>
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
            value={lead.status}
            disabled={savingStatus}
            onValueChange={v => handleStatusChange(v as LeadStatus)}
          >
            <SelectTrigger
              className="h-8 border-[rgba(255,255,255,0.15)] bg-[#111F33] text-white data-[placeholder]:text-white [&_svg]:text-white/60 focus:border-[#10C4C3] focus:ring-[#10C4C3]/20"
              style={{ fontFamily: "var(--font-body-new)", opacity: savingStatus ? 0.6 : 1 }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[rgba(255,255,255,0.15)] bg-[#111F33] text-white [&_*[role=option]>span>svg]:shrink-0 [&_*[role=option]>span>svg]:text-muted-foreground/80 [&_*[role=option]>span]:end-2 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]]:pe-8 [&_*[role=option]]:ps-2">
              {LEAD_STATUSES.map(s => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-white focus:bg-[#182B3F] focus:text-white [&_svg]:text-[#10C4C3]"
                >
                  <span className="flex items-center gap-2">
                    <StatusDot status={s} />
                    <span className="truncate">{s.replace(/_/g, " ")}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </label>
        </div>
      </div>

      <div className="lead-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <Card style={{ padding: "24px" }}>
          <Field label="Property">
            {lead.property_title ? (
              lead.property_slug ? <Link href={`/property/${lead.property_slug}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconBuilding />{lead.property_title}</Link>
                : <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconBuilding />{lead.property_title}</span>
            ) : "—"}
          </Field>
          <Field label="Email">
            {lead.inquirer_email ? <a href={`mailto:${lead.inquirer_email}`} style={{ color: "#FFFFFF", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconMail />{lead.inquirer_email}</a> : "—"}
          </Field>
          <Field label="Phone">
            {lead.inquirer_phone ? <a href={`tel:${lead.inquirer_phone}`} style={{ color: "#FFFFFF", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconPhone />{lead.inquirer_phone}</a> : "—"}
          </Field>
          <Field label="Message">{lead.message || "—"}</Field>
        </Card>

        <Card style={{ padding: "24px" }}>
          <Field label="Inquiry Type">{lead.inquiry_type || "—"}</Field>
          <Field label="Source">{lead.source || "—"}</Field>
          <Field label="Created">
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDateTime(lead.created_at)}</span>
          </Field>
          <Field label="Last Contacted">
            {lead.last_contacted_at ? <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDateTime(lead.last_contacted_at)}</span> : "—"}
          </Field>
        </Card>
      </div>

      {/* Follow-up Date (Phase 12) — view/edit/save/confirm. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: editingFollowUp ? "14px" : 0 }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}>Follow-up Date</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={followUpMessage} />
            {!editingFollowUp && (
              <button
                onClick={startEditingFollowUp}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {!editingFollowUp ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
            <span style={{ fontSize: "14px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconClock />{lead.next_follow_up ? fmtDateTime(lead.next_follow_up) : "Not set"}
            </span>
            {followUpUrgency(lead.next_follow_up) === "overdue" && (
              <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.30)" }}>Overdue</span>
            )}
            {followUpUrgency(lead.next_follow_up) === "today" && (
              <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.30)" }}>Due Today</span>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveFollowUp}>
            <input
              type="datetime-local"
              value={followUpInput}
              onChange={e => setFollowUpInput(e.target.value)}
              style={{ padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", marginBottom: "14px", colorScheme: "dark" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={savingFollowUp}
                style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: savingFollowUp ? "default" : "pointer", opacity: savingFollowUp ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {savingFollowUp ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={cancelEditingFollowUp} disabled={savingFollowUp}
                style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: savingFollowUp ? "default" : "pointer", opacity: savingFollowUp ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
              {followUpInput && (
                <button type="button" onClick={() => setFollowUpInput("")} disabled={savingFollowUp}
                  style={{ padding: "9px 20px", background: "none", border: "none", color: "#F87171", fontSize: "12px", fontWeight: 600, cursor: savingFollowUp ? "default" : "pointer", fontFamily: "var(--font-body-new)" }}>
                  Clear
                </button>
              )}
            </div>
          </form>
        )}
      </Card>

      {siteVisits.length > 0 && (
        <Card style={{ padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "14px" }}>Site Visit</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {siteVisits.map(v => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", color: "#FFFFFF" }}>{fmtDateOnly(v.visit_date)} · {v.visit_time_slot}</span>
                  <VisitStatusBadge status={v.status} />
                </div>
                <Link href={`/agent/site-visits/${v.id}`} style={{ color: "#10C4C3", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>View Site Visit →</Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: matching.kind === "idle" ? 0 : "16px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Property Matching</h3>
          <button
            onClick={findMatches}
            disabled={matching.kind === "loading"}
            style={{ padding: "9px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", cursor: matching.kind === "loading" ? "default" : "pointer", opacity: matching.kind === "loading" ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
          >
            {matching.kind === "loading" ? "Searching…" : "Find Matching Properties"}
          </button>
        </div>

        {matching.kind === "error" && (
          <p style={{ fontSize: "13px", color: "#F87171" }}>Could not search listings: {matching.detail}</p>
        )}

        {matching.kind === "ready" && (
          <>
            {matching.mode === "fallback" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "8px", marginBottom: "14px" }}>
                <span style={{ color: "#FBBF24", fontSize: "13px" }}>⚠</span>
                <span style={{ fontSize: "12px", color: "#FBBF24" }}>No stated preferences — showing similar listings based on the property this lead inquired about.</span>
              </div>
            )}
            {matching.results.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#A9B4C2" }}>No matching active listings found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {matching.results.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", flexWrap: "wrap" }}>
                    <div>
                      <Link href={`/property/${p.slug}`} style={{ color: "#10C4C3", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}>{p.title}</Link>
                      <div style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "3px" }}>
                        ₹{p.price.toLocaleString("en-IN")} · {p.bedrooms ? `${p.bedrooms} BHK` : "—"} · {p.locality ? `${p.locality}, ` : ""}{p.city ?? "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => sendToCustomer(p)}
                      disabled={sharingId === p.id}
                      style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: sharingId === p.id ? "default" : "pointer", opacity: sharingId === p.id ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
                    >
                      {sharingId === p.id ? "Sharing…" : "Send to Customer"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Log a Call (Phase 21) — call_logs, migration 046, already
          live. Minimal quick-add form + a plain list of past calls on
          this lead, same "form on top, list below" shape as the
          Activity card just below it. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Calls</h3>
          <SaveConfirmation message={callMessage} />
        </div>
        <form onSubmit={handleLogCall} style={{ marginBottom: "16px", padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {CALL_DIRECTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setCallDirection(d)}
                style={{
                  padding: "6px 16px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "capitalize",
                  background: callDirection === d ? "#10C4C3" : "rgba(255,255,255,0.06)",
                  color: callDirection === d ? "#020C1C" : "#A9B4C2",
                  border: callDirection === d ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", fontFamily: "var(--font-body-new)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <input
              type="datetime-local"
              value={callAt}
              onChange={e => setCallAt(e.target.value)}
              style={{ padding: "9px 12px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", colorScheme: "dark" }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <textarea
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", resize: "vertical" }}
            />
          </div>
          <button type="submit" disabled={loggingCall}
            style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: loggingCall ? "default" : "pointer", opacity: loggingCall ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            {loggingCall ? "Logging…" : "Log Call"}
          </button>
        </form>

        {callLogs.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#6B7686" }}>No calls logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {callLogs.map(c => (
              <div key={c.id} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10C4C3" }}>{c.direction}</span>
                  <span style={{ fontSize: "12px", color: "#A9B4C2" }}>{fmtDateTime(c.called_at)}</span>
                </div>
                {c.notes && <p style={{ fontSize: "13px", color: "#FFFFFF", marginTop: "4px" }}>{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ padding: "24px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Activity</h3>
        <form onSubmit={handleAddNote} style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note…"
            style={{ flex: 1, padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" }}
          />
          <button type="submit" disabled={postingNote || !noteText.trim()}
            style={{ padding: "10px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em", cursor: postingNote || !noteText.trim() ? "default" : "pointer", opacity: postingNote || !noteText.trim() ? 0.5 : 1, fontFamily: "var(--font-body-new)" }}>
            {postingNote ? "Saving…" : "Add Note"}
          </button>
        </form>
        {activities.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#A9B4C2" }}>No activity logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {activities.map(a => (
              <div key={a.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
                <span style={{ fontSize: "11px", color: "#6B7686" }}>{fmtDateTime(a.created_at)} · {a.type}</span>
                <p style={{ fontSize: "13px", color: "#FFFFFF", marginTop: "4px" }}>{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}

function Shell({ children, backHref = "/dashboard", backLabel = "← Dashboard" }: { children: React.ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <>
      <style>{`
        @keyframes lead-spin { to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .lead-detail-grid { grid-template-columns: 1fr !important; }
          .lead-detail-header { flex-direction: column; align-items: flex-start !important; }
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
