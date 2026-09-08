"use client";

// Agent tasks (Phase 19) — detail view. Schema, RLS, and both triggers
// (043) are already live — this page only reads/writes the table, no
// schema/RLS/trigger changes here. This is also the page 043's
// notify_task_assigned trigger already points at ('/agent/tasks/' ||
// task id) — that action_url was a placeholder when 043 was drafted
// since no UI existed yet; it needs no change now, this page just
// needs to exist at that route.
//
// Structure mirrors src/app/agent/deals/[id]/page.tsx: shared
// building blocks (Card, TaskStatusBadge, TaskStatusControl,
// LinkedEntities, types, fmtDate) imported from the sibling list page
// (../page), same relationship as deals/[id] <-> deals/page and
// messages/[id] <-> messages/page. No client-side "is this mine"
// gate on load — same reasoning as deals/[id]: tasks' own SELECT
// policy (assignee, assigner, or admin) already determines whether
// the row comes back at all; if it doesn't, that's not_found, not a
// separate forbidden state.
//
// Viewer-role UI split, per spec: an assignee who is NOT also the
// assigner and NOT admin sees only the quick status control (via the
// same TaskStatusControl the list page uses) — no edit affordances,
// since 043's enforce_task_update_columns trigger would reject
// anything else from them anyway. The assigner (or admin) sees full
// edit (title/description/due_date/deal link) plus Delete, with
// status shown read-only — same UI-level choice already made on the
// list page (the trigger technically permits the assigner to change
// status too, but this UI deliberately doesn't offer that control
// there, so it doesn't here either, for consistency). An edge case —
// a task where assigned_to === assigned_by (self-assigned; technically
// possible, are_agents_connected(x, x) is trivially true for anyone
// who owns/collaborates on at least one deal) — resolves to the
// assigner branch (full edit), matching the spec's phrasing pairing
// "assigner (or admin)" as the more-capable branch.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveAgentNames } from "../../messages/page";
import {
  Card, TaskStatusBadge, TaskStatusControl, LinkedEntities, fmtDate, fmtPrice, inputStyle,
  type TaskRow, type LinkedDealInfo, type LinkedLeadInfo, type LinkedPropertyInfo,
} from "../page";

type SaveMessage = { type: "success" | "error"; text: string } | null;

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "not_found" }
  | { kind: "error"; detail: string }
  | {
      kind: "ready";
      agentId: string;
      canEdit: boolean; // isAssigner || isAdmin
      task: TaskRow;
      assignerName: string;
      assigneeName: string;
      dealMap: Map<string, LinkedDealInfo>;
      leadMap: Map<string, LinkedLeadInfo>;
      propertyMap: Map<string, LinkedPropertyInfo>;
      myDeals: { id: string; label: string }[];
    };

function IconChecklist() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>;
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

function SaveConfirmation({ message }: { message: SaveMessage }) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <span style={{ fontSize: "12px", fontWeight: 600, color: isError ? "#F87171" : "#4ADE80", display: "inline-flex", alignItems: "center", gap: "5px" }}>
      {isError ? "⚠" : "✓"} {message.text}
    </span>
  );
}

export default function AgentTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = (params?.id as string) ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const [editingFields, setEditingFields] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [dealIdInput, setDealIdInput] = useState("");
  const [savingFields, setSavingFields] = useState(false);
  const [fieldsMessage, setFieldsMessage] = useState<SaveMessage>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("id, assigned_to, assigned_by, title, description, status, due_date, completed_at, inquiry_id, deal_id, property_id, created_at, updated_at")
      .eq("id", taskId)
      .maybeSingle();
    if (taskErr) { setState({ kind: "error", detail: taskErr.message }); return; }
    if (!task) { setState({ kind: "not_found" }); return; }
    const t = task as TaskRow;

    // Admin check — profiles.role, the same check used on /admin
    // (RoleBadge/isAdmin there: role === "admin" || role === "super_admin").
    // Not a shared hook — every agent page tonight independently
    // re-does its own identity lookups rather than relying on one.
    const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    const isAdmin = profileRow?.role === "admin" || profileRow?.role === "super_admin";
    const isAssigner = t.assigned_by === agentRow.id;
    const isAssignee = t.assigned_to === agentRow.id;
    const canEdit = isAssigner || isAdmin;

    if (!isAssignee && !isAssigner && !isAdmin) {
      // RLS already made this row visible, so this shouldn't happen —
      // fail closed on the UI side too rather than guess which branch
      // to render for a role this page doesn't recognize.
      setState({ kind: "not_found" });
      return;
    }

    const nameMap = await resolveAgentNames([t.assigned_by, t.assigned_to].filter((id): id is string => !!id));
    const assignerName = t.assigned_by ? (nameMap.get(t.assigned_by)?.full_name ?? "Unknown agent") : "Unknown";
    const assigneeName = nameMap.get(t.assigned_to)?.full_name ?? "Unknown agent";

    // Linked-entity resolution — same "fetch then map" per type as the
    // list page, just for this one task's single link(s).
    const dealMap = new Map<string, LinkedDealInfo>();
    const leadMap = new Map<string, LinkedLeadInfo>();
    const propertyMap = new Map<string, LinkedPropertyInfo>();
    if (t.deal_id) {
      const { data: dealRow } = await supabase.from("deals").select("id, property_id, deal_price").eq("id", t.deal_id).maybeSingle();
      if (dealRow) dealMap.set(dealRow.id, dealRow as LinkedDealInfo);
    }
    if (t.inquiry_id) {
      const { data: leadRow } = await supabase.from("inquiries").select("id, inquirer_name").eq("id", t.inquiry_id).maybeSingle();
      if (leadRow) leadMap.set(leadRow.id, leadRow as LinkedLeadInfo);
    }
    const directPropertyId = t.property_id;
    const dealPropertyId = [...dealMap.values()][0]?.property_id ?? null;
    const propertyIds = [directPropertyId, dealPropertyId].filter((id): id is string => !!id);
    if (propertyIds.length > 0) {
      const { data: propRows } = await supabase.from("property_listings").select("id, slug, title").in("id", [...new Set(propertyIds)]);
      (propRows as LinkedPropertyInfo[] | null ?? []).forEach(p => propertyMap.set(p.id, p));
    }

    // Only needed for the edit form's deal picker — same query the
    // list page's openEdit and the conversation-thread Assign Task
    // panel both already use.
    let myDeals: { id: string; label: string }[] = [];
    if (canEdit) {
      const { data: myDealRows } = await supabase
        .from("deals")
        .select("id, property_id, deal_price, created_at")
        .eq("assigned_to", agentRow.id)
        .order("created_at", { ascending: false });
      const rows = (myDealRows as { id: string; property_id: string | null; deal_price: number | null; created_at: string }[] | null) ?? [];
      const extraPropertyIds = [...new Set(rows.map(d => d.property_id).filter((id): id is string => !!id).filter(id => !propertyMap.has(id)))];
      if (extraPropertyIds.length > 0) {
        const { data: extraProps } = await supabase.from("property_listings").select("id, slug, title").in("id", extraPropertyIds);
        (extraProps as LinkedPropertyInfo[] | null ?? []).forEach(p => propertyMap.set(p.id, p));
      }
      myDeals = rows.map(d => {
        const property = d.property_id ? propertyMap.get(d.property_id) : undefined;
        return { id: d.id, label: property ? property.title : `${fmtPrice(d.deal_price)} — ${fmtDate(d.created_at)}` };
      });
    }

    setTitleInput(t.title);
    setDescriptionInput(t.description ?? "");
    setDueDateInput(t.due_date ? t.due_date.slice(0, 10) : "");
    setDealIdInput(t.deal_id ?? "");

    setState({ kind: "ready", agentId: agentRow.id, canEdit, task: t, assignerName, assigneeName, dealMap, leadMap, propertyMap, myDeals });
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  function handleStatusUpdated(patch: { status: string; completed_at: string | null }) {
    setState(prev => prev.kind !== "ready" ? prev : { ...prev, task: { ...prev.task, ...patch } });
  }

  function startEditingFields() {
    if (state.kind !== "ready") return;
    setTitleInput(state.task.title);
    setDescriptionInput(state.task.description ?? "");
    setDueDateInput(state.task.due_date ? state.task.due_date.slice(0, 10) : "");
    setDealIdInput(state.task.deal_id ?? "");
    setFieldsMessage(null);
    setEditingFields(true);
  }

  function cancelEditingFields() {
    if (state.kind !== "ready") return;
    setTitleInput(state.task.title);
    setDescriptionInput(state.task.description ?? "");
    setDueDateInput(state.task.due_date ? state.task.due_date.slice(0, 10) : "");
    setDealIdInput(state.task.deal_id ?? "");
    setFieldsMessage(null);
    setEditingFields(false);
  }

  async function handleSaveFields(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    if (!titleInput.trim()) { setFieldsMessage({ type: "error", text: "Title is required." }); return; }
    // A task must stay linked to something (043's CHECK constraint).
    // This edit form only ever offers a deal picker — if the task
    // isn't already inquiry- or property-linked, deal_id can't be
    // cleared to empty here. Same guard as the list page's edit form.
    if (!dealIdInput && !state.task.inquiry_id && !state.task.property_id) {
      setFieldsMessage({ type: "error", text: "A task must stay linked to a deal." });
      return;
    }
    setSavingFields(true);
    setFieldsMessage(null);
    const supabase = createClient();
    const nextDueDate = dueDateInput ? new Date(dueDateInput).toISOString() : null;
    const nextDealId = dealIdInput || state.task.deal_id;
    const { error } = await supabase
      .from("tasks")
      .update({
        title: titleInput.trim(),
        description: descriptionInput.trim() || null,
        due_date: nextDueDate,
        ...(nextDealId ? { deal_id: nextDealId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.task.id);
    setSavingFields(false);
    if (error) {
      console.error("Task edit error:", error);
      setFieldsMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    setState({
      ...state,
      task: { ...state.task, title: titleInput.trim(), description: descriptionInput.trim() || null, due_date: nextDueDate, deal_id: nextDealId },
    });
    setEditingFields(false);
    setFieldsMessage({ type: "success", text: "Saved" });
    setTimeout(() => setFieldsMessage(null), 2500);
  }

  async function handleDelete() {
    if (state.kind !== "ready") return;
    if (!window.confirm(`Delete task "${state.task.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", state.task.id);
    setDeleting(false);
    if (error) {
      console.error("Task delete error:", error);
      setDeleteError("Could not delete: " + error.message);
      return;
    }
    router.push("/agent/tasks");
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "task-detail-spin 0.8s linear infinite" }}>
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
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view this task.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile.</p></Card></Shell>;
  }
  if (state.kind === "not_found") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><EmptyIcon /><p style={{ fontSize: "14px", color: "#A9B4C2", marginTop: "12px" }}>Task not found.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686", marginTop: "8px" }}>{state.detail}</p></Card></Shell>;
  }

  const { task, canEdit, assignerName, assigneeName, dealMap, leadMap, propertyMap, myDeals } = state;

  return (
    <Shell>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 700, color: "#FFFFFF" }}>{task.title}</h1>
      </div>

      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: !editingFields ? "16px" : 0 }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Task Details</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={fieldsMessage} />
            {canEdit && !editingFields && (
              <button
                onClick={startEditingFields}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {!editingFields ? (
          <>
            <Field label="Status">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <TaskStatusBadge status={task.status} />
                {task.completed_at && <span style={{ fontSize: "12px", color: "#A9B4C2" }}>Completed {fmtDate(task.completed_at)}</span>}
              </div>
            </Field>
            <Field label="Description">
              {task.description ? <span style={{ whiteSpace: "pre-wrap" }}>{task.description}</span> : <span style={{ color: "#6B7686" }}>No description.</span>}
            </Field>
            <Field label="Linked To">
              <LinkedEntities task={task} deals={dealMap} leads={leadMap} properties={propertyMap} />
            </Field>
            <div style={{ display: "flex", gap: "24px", marginTop: "6px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <Field label="Due Date"><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{task.due_date ? fmtDate(task.due_date) : "—"}</span></Field>
              <Field label="Created"><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDate(task.created_at)}</span></Field>
            </div>
            <div style={{ display: "flex", gap: "24px", marginTop: "6px" }}>
              <Field label="Assigned By">{assignerName}</Field>
              <Field label="Assigned To">{assigneeName}</Field>
            </div>
          </>
        ) : (
          <form onSubmit={handleSaveFields}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Title</label>
              <input type="text" value={titleInput} onChange={e => setTitleInput(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Description</label>
              <textarea value={descriptionInput} onChange={e => setDescriptionInput(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Due Date</label>
              <input type="date" value={dueDateInput} onChange={e => setDueDateInput(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Linked Deal</label>
              {task.deal_id || myDeals.length > 0 ? (
                <select value={dealIdInput} onChange={e => setDealIdInput(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select a deal…</option>
                  {myDeals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              ) : (
                <p style={{ fontSize: "12px", color: "#6B7686" }}>Linked to a lead or property — not editable here.</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={savingFields}
                style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", cursor: savingFields ? "default" : "pointer", opacity: savingFields ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {savingFields ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" onClick={cancelEditingFields} disabled={savingFields}
                style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: savingFields ? "default" : "pointer", opacity: savingFields ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Quick status control — assignee-only capability. Shown
          whenever the viewer is the assignee, regardless of canEdit —
          covers the self-assigned edge case (assignee AND assigner)
          too, since there's no reason to hide it from someone who's
          also the assigner. */}
      {task.assigned_to === state.agentId && (
        <Card style={{ padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Update Status</h3>
          <TaskStatusControl task={task} onUpdated={handleStatusUpdated} />
        </Card>
      )}

      {canEdit && (
        <Card style={{ padding: "24px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "14px" }}>Danger Zone</h3>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: "9px 20px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", color: "#F87171", fontSize: "12px", fontWeight: 600, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            {deleting ? "Deleting…" : "Delete Task"}
          </button>
          {deleteError && <p style={{ fontSize: "12px", color: "#F87171", marginTop: "10px" }}>{deleteError}</p>}
        </Card>
      )}
    </Shell>
  );
}

function EmptyIcon() {
  return (
    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#10C4C3" }}>
      <IconChecklist />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes task-detail-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/agent/tasks" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← All Tasks</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
