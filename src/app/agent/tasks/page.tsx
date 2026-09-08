"use client";

// Agent tasks (Phase 19) — list view. Schema, RLS, and both triggers
// (043) are already live — this page only reads/writes the table, no
// schema/RLS/trigger changes here.
//
// Structure, identity-lookup pattern, and shared building blocks
// mirror src/app/agent/deals/page.tsx exactly: two sections on one
// page ("Assigned to Me" / "Assigned by Me") is the same structural
// approach as Deals' main-list + "Shared With Me" split. No PostgREST
// embeds — every cross-table lookup (assigned_to/assigned_by ->
// agent_profiles -> profiles via resolveAgentNames, deal_id -> deals
// -> property_listings, inquiry_id -> inquiries, property_id ->
// property_listings) is a separate query, joined client-side via Maps,
// same "fetch then map" convention as every other list page tonight.
//
// tasks.status is plain text with a 'pending' default, not a Postgres
// enum (confirmed live) — the three-value vocabulary below (pending /
// in_progress / done) is this UI's own judgment call, not a schema
// constraint. Any other string a future path might write still
// renders via the same unknown-value fallback pattern DealStageBadge
// already uses, rather than crashing on an unrecognized status.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resolveAgentNames, type AgentOption } from "../messages/page";

export type TaskStatus = "pending" | "in_progress" | "done";
export const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "done"];

export interface TaskRow {
  id: string;
  assigned_to: string;
  assigned_by: string | null;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  inquiry_id: string | null;
  deal_id: string | null;
  property_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedDealInfo {
  id: string;
  property_id: string | null;
  deal_price: number | null;
}
export interface LinkedLeadInfo {
  id: string;
  inquirer_name: string;
}
export interface LinkedPropertyInfo {
  id: string;
  slug: string;
  title: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "error"; detail: string }
  | {
      kind: "ready";
      agentId: string;
      assignedToMe: TaskRow[];
      assignedByMe: TaskRow[];
      nameMap: Map<string, AgentOption>;
      deals: Map<string, LinkedDealInfo>;
      leads: Map<string, LinkedLeadInfo>;
      properties: Map<string, LinkedPropertyInfo>;
    };

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtPrice(price: number | null): string {
  return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
}

// ── Shared dark-theme building blocks — duplicated locally, same
// per-page convention as deals/page.tsx and messages/page.tsx.
// Exported so /agent/tasks/[id] (the detail page) reuses these
// exactly, same relationship as deals/page.tsx <-> deals/[id]/page.tsx
// and messages/page.tsx <-> messages/[id]/page.tsx. ──────

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "4px" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", color: "#10C4C3" }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "6px" }}>{title}</h4>
      <p style={{ fontSize: "12.5px", color: "#A9B4C2", maxWidth: "320px", lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "tasks-spin 0.8s linear infinite" }}>
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

export const TASK_STATUS_STYLE: Record<TaskStatus, { label: string; bg: string; color: string; border: string }> = {
  pending:     { label: "Pending",     bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
  in_progress: { label: "In Progress", bg: "rgba(16,196,195,0.15)",  color: "#10C4C3", border: "rgba(16,196,195,0.30)"  },
  done:        { label: "Done",        bg: "rgba(74,222,128,0.15)",  color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const c = TASK_STATUS_STYLE[status as TaskStatus] ?? { label: status, bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return <Badge label={c.label} bg={c.bg} color={c.color} border={c.border} />;
}

function IconChecklist() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>;
}
function IconBuilding() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconInbox() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconBriefcase() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
function IconCalendar() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}

export const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

// Resolves and renders whichever of deal_id/inquiry_id/property_id is
// set on a task — a task can in principle have more than one set (the
// CHECK constraint only requires "at least one"), so all that are
// present render, not just the first found.
export function LinkedEntities({ task, deals, leads, properties }: {
  task: TaskRow;
  deals: Map<string, LinkedDealInfo>;
  leads: Map<string, LinkedLeadInfo>;
  properties: Map<string, LinkedPropertyInfo>;
}) {
  const parts: React.ReactNode[] = [];
  if (task.deal_id) {
    const deal = deals.get(task.deal_id);
    const property = deal?.property_id ? properties.get(deal.property_id) : undefined;
    parts.push(
      <Link key="deal" href={`/agent/deals/${task.deal_id}`} style={{ color: "#10C4C3", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <IconBriefcase />{property ? property.title : deal ? fmtPrice(deal.deal_price) : "Deal"}
      </Link>
    );
  }
  if (task.inquiry_id) {
    const lead = leads.get(task.inquiry_id);
    parts.push(
      <Link key="lead" href={`/agent/leads/${task.inquiry_id}`} style={{ color: "#10C4C3", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <IconInbox />{lead ? lead.inquirer_name : "Lead"}
      </Link>
    );
  }
  if (task.property_id) {
    const property = properties.get(task.property_id);
    parts.push(
      property
        ? <Link key="property" href={`/property/${property.slug}`} style={{ color: "#10C4C3", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}><IconBuilding />{property.title}</Link>
        : <span key="property" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><IconBuilding />Property</span>
    );
  }
  if (parts.length === 0) return <span style={{ color: "#6B7686" }}>—</span>;
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px" }}>{parts}</div>;
}

// Quick status control — the ONE thing an assignee (not the assigner,
// not admin) may change on a task, matching exactly what 043's
// enforce_task_update_columns trigger permits: status and completed_at,
// nothing else. Self-contained (owns its own saving/error state, does
// its own write) so both the list page and the detail page can mount
// it identically rather than each re-implementing the same three
// lines of update logic. onUpdated hands the caller the new
// {status, completed_at} to merge into whatever shape its own state
// happens to be — this component doesn't know or care about that shape.
export function TaskStatusControl({ task, onUpdated }: {
  task: TaskRow;
  onUpdated: (patch: { status: string; completed_at: string | null }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStatus: TaskStatus) {
    if (task.status === newStatus) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // updated_at isn't part of the trigger's column restriction (no
    // trigger auto-bumps it), so it's stamped here directly, same as
    // every other write in this app.
    const completedAt = newStatus === "done" ? new Date().toISOString() : null;
    const { error: err } = await supabase
      .from("tasks")
      .update({ status: newStatus, completed_at: completedAt, updated_at: new Date().toISOString() })
      .eq("id", task.id);
    setSaving(false);
    if (err) {
      console.error("Task status update error:", err);
      setError(err.message);
      return;
    }
    onUpdated({ status: newStatus, completed_at: completedAt });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {TASK_STATUSES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => handleChange(s)}
            disabled={saving || task.status === s}
            style={{
              padding: "5px 14px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em",
              background: task.status === s ? TASK_STATUS_STYLE[s].bg : "rgba(255,255,255,0.04)",
              color: task.status === s ? TASK_STATUS_STYLE[s].color : "#6B7686",
              border: `1.5px solid ${task.status === s ? TASK_STATUS_STYLE[s].border : "rgba(255,255,255,0.12)"}`,
              cursor: (saving || task.status === s) ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
              fontFamily: "var(--font-body-new)",
            }}
          >
            {TASK_STATUS_STYLE[s].label}
          </button>
        ))}
      </div>
      {error && <p style={{ fontSize: "11px", color: "#F87171", marginTop: "8px" }}>⚠ {error}</p>}
    </div>
  );
}

export default function AgentTasksPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDealId, setEditDealId] = useState("");
  const [myDeals, setMyDeals] = useState<{ id: string; label: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", uid)
      .eq("status", "approved")
      .maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const cols = "id, assigned_to, assigned_by, title, description, status, due_date, completed_at, inquiry_id, deal_id, property_id, created_at, updated_at";
    const [{ data: toMe, error: toMeErr }, { data: byMe, error: byMeErr }] = await Promise.all([
      supabase.from("tasks").select(cols).eq("assigned_to", agentRow.id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("tasks").select(cols).eq("assigned_by", agentRow.id).order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    if (toMeErr || byMeErr) {
      console.error("agent/tasks — tasks query error:", toMeErr ?? byMeErr);
      setState({ kind: "error", detail: (toMeErr ?? byMeErr)!.message });
      return;
    }
    const assignedToMe = (toMe as TaskRow[] | null) ?? [];
    const assignedByMe = (byMe as TaskRow[] | null) ?? [];

    // Names: assigners (for the "to me" list) + assignees (for the "by
    // me" list), one resolveAgentNames call, same function messaging
    // uses for the exact same "id -> display name" problem.
    const agentIdsToResolve = [...new Set([
      ...assignedToMe.map(t => t.assigned_by).filter((id): id is string => !!id),
      ...assignedByMe.map(t => t.assigned_to),
    ])];
    const nameMap = await resolveAgentNames(agentIdsToResolve);

    // Linked-entity resolution — "fetch then map" per type, same
    // convention as every other list page tonight.
    const allTasks = [...assignedToMe, ...assignedByMe];
    const dealIds = [...new Set(allTasks.map(t => t.deal_id).filter((id): id is string => !!id))];
    const inquiryIds = [...new Set(allTasks.map(t => t.inquiry_id).filter((id): id is string => !!id))];
    const directPropertyIds = allTasks.map(t => t.property_id).filter((id): id is string => !!id);

    const deals = new Map<string, LinkedDealInfo>();
    if (dealIds.length > 0) {
      const { data: dealRows } = await supabase.from("deals").select("id, property_id, deal_price").in("id", dealIds);
      (dealRows as LinkedDealInfo[] | null ?? []).forEach(d => deals.set(d.id, d));
    }
    const leads = new Map<string, LinkedLeadInfo>();
    if (inquiryIds.length > 0) {
      const { data: leadRows } = await supabase.from("inquiries").select("id, inquirer_name").in("id", inquiryIds);
      (leadRows as LinkedLeadInfo[] | null ?? []).forEach(l => leads.set(l.id, l));
    }
    const propertyIds = [...new Set([
      ...directPropertyIds,
      ...[...deals.values()].map(d => d.property_id).filter((id): id is string => !!id),
    ])];
    const properties = new Map<string, LinkedPropertyInfo>();
    if (propertyIds.length > 0) {
      const { data: propRows } = await supabase.from("property_listings").select("id, slug, title").in("id", propertyIds);
      (propRows as LinkedPropertyInfo[] | null ?? []).forEach(p => properties.set(p.id, p));
    }

    setState({ kind: "ready", agentId: agentRow.id, assignedToMe, assignedByMe, nameMap, deals, leads, properties });
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleStatusUpdated(task: TaskRow, patch: { status: string; completed_at: string | null }) {
    setState(prev => prev.kind !== "ready" ? prev : {
      ...prev,
      assignedToMe: prev.assignedToMe.map(t => t.id === task.id ? { ...t, ...patch } : t),
    });
  }

  async function openEdit(task: TaskRow) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    setEditDealId(task.deal_id ?? "");
    setEditMessage(null);
    if (state.kind === "ready") {
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select("id, property_id, deal_price, created_at")
        .eq("assigned_to", state.agentId)
        .order("created_at", { ascending: false });
      const rows = (data as { id: string; property_id: string | null; deal_price: number | null; created_at: string }[] | null) ?? [];
      setMyDeals(rows.map(d => {
        const property = d.property_id ? state.properties.get(d.property_id) : undefined;
        return { id: d.id, label: property ? property.title : `${fmtPrice(d.deal_price)} — ${fmtDate(d.created_at)}` };
      }));
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMessage(null);
  }

  async function handleSaveEdit(task: TaskRow, e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) { setEditMessage({ type: "error", text: "Title is required." }); return; }
    // A task must stay linked to something (043's CHECK constraint).
    // This edit form only ever offers a deal picker (see header on the
    // deal-detail and conversation-thread creation flows — both only
    // ever set deal_id), so if the task isn't already inquiry- or
    // property-linked, deal_id can't be cleared to empty here.
    if (!editDealId && !task.inquiry_id && !task.property_id) {
      setEditMessage({ type: "error", text: "A task must stay linked to a deal." });
      return;
    }
    setSavingEdit(true);
    setEditMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        // Only touched when the task is deal-linked in the first place
        // (or being newly deal-linked) — an inquiry-/property-linked
        // task (never produced by this build's own creation flows, but
        // handled defensively) keeps its existing link untouched since
        // there's no picker for those link types here.
        ...(editDealId || task.deal_id ? { deal_id: editDealId || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);
    setSavingEdit(false);
    if (error) {
      console.error("Task edit error:", error);
      setEditMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    setState(prev => prev.kind !== "ready" ? prev : {
      ...prev,
      assignedByMe: prev.assignedByMe.map(t => t.id === task.id ? {
        ...t,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
        deal_id: (editDealId || task.deal_id) ? (editDealId || null) : t.deal_id,
      } : t),
    });
    setEditingId(null);
  }

  async function handleDelete(task: TaskRow) {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setDeletingId(task.id);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeletingId(null);
    if (error) {
      console.error("Task delete error:", error);
      setEditMessage({ type: "error", text: "Could not delete: " + error.message });
      return;
    }
    setState(prev => prev.kind !== "ready" ? prev : { ...prev, assignedByMe: prev.assignedByMe.filter(t => t.id !== task.id) });
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconChecklist />} title="Please sign in" subtitle="Sign in to your agent account to view your tasks." />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-8px", paddingBottom: "8px" }}>
            <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none" }}>Sign In →</Link>
          </div>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px" }}><EmptyState icon={<IconChecklist />} title="Agent access only" subtitle="This account has no approved agent profile — tasks are only available to approved agents." /></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your tasks</h4><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  const { assignedToMe, assignedByMe, nameMap, deals, leads, properties } = state;

  return (
    <Shell>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Tasks</h1>
      </div>

      <SectionHeading title={`Assigned to Me (${assignedToMe.length})`} subtitle="Tasks someone else assigned to you." />
      {assignedToMe.length === 0 ? (
        <Card style={{ marginBottom: "32px" }}>
          <EmptyState icon={<IconChecklist />} title="No tasks assigned to you" subtitle="Tasks assigned to you from a deal or a conversation will show up here." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {assignedToMe.map(task => (
            <Card key={task.id} style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                <Link href={`/agent/tasks/${task.id}`} style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#10C4C3", textDecoration: "none" }}>{task.title}</Link>
                <TaskStatusBadge status={task.status} />
              </div>
              {task.description && <p style={{ fontSize: "12.5px", color: "#A9B4C2", marginBottom: "10px", whiteSpace: "pre-wrap" }}>{task.description}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", marginBottom: "12px", fontSize: "12px", color: "#A9B4C2" }}>
                <LinkedEntities task={task} deals={deals} leads={leads} properties={properties} />
                {task.due_date && <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><IconCalendar />{fmtDate(task.due_date)}</span>}
                <span>Assigned by {task.assigned_by ? (nameMap.get(task.assigned_by)?.full_name ?? "Unknown agent") : "Unknown"}</span>
              </div>

              {/* Quick status control — status/completed_at only, matching
                  exactly what 043's trigger permits an assignee to change.
                  No title/description/due_date/link editing offered here
                  at all, since the trigger would reject it. Same shared
                  component the detail page uses. */}
              <TaskStatusControl task={task} onUpdated={patch => handleStatusUpdated(task, patch)} />
            </Card>
          ))}
        </div>
      )}

      <SectionHeading title={`Assigned by Me (${assignedByMe.length})`} subtitle="Tasks you've assigned to other agents." />
      {assignedByMe.length === 0 ? (
        <Card>
          <EmptyState icon={<IconChecklist />} title="No tasks assigned by you" subtitle="Assign a task from a deal or a conversation to see it here." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {assignedByMe.map(task => (
            <Card key={task.id} style={{ padding: "18px 20px" }}>
              {editingId === task.id ? (
                <form onSubmit={e => handleSaveEdit(task, e)}>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Title</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Description</label>
                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Due Date</label>
                    <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Linked Deal</label>
                    {task.deal_id || myDeals.length > 0 ? (
                      <select value={editDealId} onChange={e => setEditDealId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="">Select a deal…</option>
                        {myDeals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    ) : (
                      <p style={{ fontSize: "12px", color: "#6B7686" }}>Linked to a lead or property — not editable here.</p>
                    )}
                  </div>
                  {editMessage && <p style={{ fontSize: "12px", color: editMessage.type === "error" ? "#F87171" : "#4ADE80", marginBottom: "10px" }}>{editMessage.type === "error" ? "⚠ " : "✓ "}{editMessage.text}</p>}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="submit" disabled={savingEdit}
                      style={{ padding: "8px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: savingEdit ? "default" : "pointer", opacity: savingEdit ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                      {savingEdit ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEdit} disabled={savingEdit}
                      style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: savingEdit ? "default" : "pointer", opacity: savingEdit ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <Link href={`/agent/tasks/${task.id}`} style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#10C4C3", textDecoration: "none" }}>{task.title}</Link>
                    {/* Read-only here — only the assignee can change status (043's RLS/trigger). */}
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {task.description && <p style={{ fontSize: "12.5px", color: "#A9B4C2", marginBottom: "10px", whiteSpace: "pre-wrap" }}>{task.description}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", marginBottom: "14px", fontSize: "12px", color: "#A9B4C2" }}>
                    <LinkedEntities task={task} deals={deals} leads={leads} properties={properties} />
                    {task.due_date && <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><IconCalendar />{fmtDate(task.due_date)}</span>}
                    <span>Assigned to {nameMap.get(task.assigned_to)?.full_name ?? "Unknown agent"}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => openEdit(task)}
                      style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(task)} disabled={deletingId === task.id}
                      style={{ padding: "7px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", color: "#F87171", fontSize: "12px", fontWeight: 600, cursor: deletingId === task.id ? "default" : "pointer", opacity: deletingId === task.id ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                      {deletingId === task.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes tasks-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
