"use client";

// Deals (Phase 15/16) — detail view. Identity lookup, LoadState shape,
// and Field/Shell building blocks still mirror
// src/app/agent/leads/[id]/page.tsx and
// src/app/agent/site-visits/[id]/page.tsx. Visual polish below (stage
// stepper, property card, view/edit/save/confirm) is scoped to Deals
// only, per instruction — leads/site-visits styling is untouched.
//
// Stage is now driven by the big interactive DealStageStepper (no
// separate header Select) — deal_price/notes/lost_reason follow a
// real view/edit/save/confirm cycle instead of an always-editable form
// with no feedback.

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Deal, DealStage, LinkedPropertyInfo } from "../page";
import { Card, DealStageStepper } from "../page";
import { resolveAgentNames, type AgentOption } from "../../messages/page";
import { optimizedImageUrl } from "@/lib/image-url";

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "not_found" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string; userId: string; deal: Deal; property: LinkedPropertyInfo | null };

type SaveMessage = { type: "success" | "error"; text: string } | null;

// Deal Documents (Phase 17, Part B). Not the fixed 4-slot KYC checklist
// from the agent profile page — a deal can have any number of
// documents of varying, often unlisted types, so this is a free list +
// a type picker with a real free-text escape hatch, not a fixed
// checklist.
interface DealDocumentRow {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

const DEAL_DOCUMENT_TYPE_OPTIONS = ["Agreement", "Booking Receipt", "Registration Certificate", "Other"];

// Call Logs (Phase 21) — call_logs table, migration 046, already live.
interface CallLogRow {
  id: string;
  direction: string;
  notes: string | null;
  called_at: string;
}

const CALL_DIRECTIONS = ["outbound", "inbound"] as const;

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Co-Agents (migration 041, already live — schema/RLS untouched here).
// A deal_collaborators row is a membership record, not a document, so
// it gets its own minimal shape rather than reusing DealDocumentRow.
interface DealCollaboratorRow {
  id: string;
  agent_profile_id: string;
  added_by: string | null;
  created_at: string;
}

function isMissingSchemaError(error: { code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPrice(price: number | null): string {
  return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
}

function IconBuilding() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>;
}
function IconInbox() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconCalendar() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
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

// Inline save-confirmation — a temporary "Saved" message next to the
// triggering action, per the constraint (toast OR inline message; this
// codebase has no existing toast system to reuse, so inline keeps this
// self-contained to Deals rather than introducing new global UI).
function SaveConfirmation({ message }: { message: SaveMessage }) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <span style={{ fontSize: "12px", fontWeight: 600, color: isError ? "#F87171" : "#4ADE80", display: "inline-flex", alignItems: "center", gap: "5px" }}>
      {isError ? "⚠" : "✓"} {message.text}
    </span>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

export default function AgentDealDetailPage() {
  const params = useParams();
  const dealId = (params?.id as string) ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [savingStage, setSavingStage] = useState(false);
  const [stageMessage, setStageMessage] = useState<SaveMessage>(null);

  const [editingFields, setEditingFields] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [lostReasonInput, setLostReasonInput] = useState("");
  const [savingFields, setSavingFields] = useState(false);
  const [fieldsMessage, setFieldsMessage] = useState<SaveMessage>(null);

  const messageTimers = useRef<{ stage?: ReturnType<typeof setTimeout>; fields?: ReturnType<typeof setTimeout> }>({});

  function flashStageMessage(msg: SaveMessage) {
    setStageMessage(msg);
    if (messageTimers.current.stage) clearTimeout(messageTimers.current.stage);
    if (msg?.type === "success") {
      messageTimers.current.stage = setTimeout(() => setStageMessage(null), 2500);
    }
  }
  function flashFieldsMessage(msg: SaveMessage) {
    setFieldsMessage(msg);
    if (messageTimers.current.fields) clearTimeout(messageTimers.current.fields);
    if (msg?.type === "success") {
      messageTimers.current.fields = setTimeout(() => setFieldsMessage(null), 2500);
    }
  }
  useEffect(() => () => {
    if (messageTimers.current.stage) clearTimeout(messageTimers.current.stage);
    if (messageTimers.current.fields) clearTimeout(messageTimers.current.fields);
  }, []);

  // Deal Documents (Phase 17, Part B).
  const [dealDocuments, setDealDocuments] = useState<DealDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocType, setNewDocType] = useState(DEAL_DOCUMENT_TYPE_OPTIONS[0]);
  const [newDocCustomType, setNewDocCustomType] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocNotes, setNewDocNotes] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docMessage, setDocMessage] = useState<SaveMessage>(null);

  // Co-Agents (Phase 18). Only ever loaded/rendered for the primary
  // agent — see the "ready" render branch below, which computes
  // isPrimaryAgent and doesn't mount the Co-Agents card at all for a
  // co-agent, per spec ("do NOT show the management section to a
  // co-agent at all").
  const [collaborators, setCollaborators] = useState<DealCollaboratorRow[]>([]);
  const [collabNameMap, setCollabNameMap] = useState<Map<string, AgentOption>>(new Map());
  const [collabLoading, setCollabLoading] = useState(true);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [collabCandidates, setCollabCandidates] = useState<AgentOption[]>([]);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSelected, setCollabSelected] = useState<string | "">("");
  const [addingCollab, setAddingCollab] = useState(false);
  const [collabMessage, setCollabMessage] = useState<SaveMessage>(null);
  const [removingCollabId, setRemovingCollabId] = useState<string | null>(null);

  // Log a Call (Phase 21) — call_logs, migration 046, already live.
  const [callLogs, setCallLogs] = useState<CallLogRow[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(true);
  const [callDirection, setCallDirection] = useState<(typeof CALL_DIRECTIONS)[number]>("outbound");
  const [callNotes, setCallNotes] = useState("");
  const [callAt, setCallAt] = useState(() => isoToDatetimeLocal(new Date().toISOString()));
  const [loggingCall, setLoggingCall] = useState(false);
  const [callMessage, setCallMessage] = useState<SaveMessage>(null);

  // Assign Task (Phase 19). Available to anyone on this deal's team —
  // primary agent or any collaborator — since 043's are_agents_connected
  // treats "same deal, either as primary or collaborator, either
  // direction" as connected. The candidate list is that same team,
  // minus the viewer themselves.
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [taskCandidates, setTaskCandidates] = useState<AgentOption[]>([]);
  const [taskAssignee, setTaskAssignee] = useState<string | "">("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [assigningTask, setAssigningTask] = useState(false);
  const [taskMessage, setTaskMessage] = useState<SaveMessage>(null);

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready" || !newDocFile) return;
    const resolvedType = newDocType === "Other" ? (newDocCustomType.trim() || "Other") : newDocType;
    setUploadingDoc(true);
    setDocMessage(null);
    try {
      const body = new FormData();
      body.append("file", newDocFile);
      const res = await fetch("/api/upload-document", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? "Upload failed");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          deal_id: state.deal.id,
          // Carried over from the deal's own record, per spec, so a
          // document attached here is also reachable via the same
          // property_id/inquiry_id joins the RLS policy (031) and other
          // pages already use.
          property_id: state.deal.property_id,
          inquiry_id: state.deal.inquiry_id,
          document_type: resolvedType,
          file_url: json.secure_url as string,
          file_name: newDocFile.name,
          mime_type: newDocFile.type || null,
          uploaded_by: state.userId,
          notes: newDocNotes.trim() || null,
        })
        .select("id, document_type, file_url, file_name, mime_type, uploaded_by, created_at")
        .single();
      if (error) throw new Error(error.message);

      setDealDocuments(prev => [data as DealDocumentRow, ...prev]);
      setDocMessage({ type: "success", text: "Document added" });
      setShowAddDoc(false);
      setNewDocType(DEAL_DOCUMENT_TYPE_OPTIONS[0]);
      setNewDocCustomType("");
      setNewDocFile(null);
      setNewDocNotes("");
      setTimeout(() => setDocMessage(null), 2500);
    } catch (err) {
      console.error("Deal document upload error:", err);
      setDocMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploadingDoc(false);
    }
  }

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("id, inquiry_id, site_visit_id, property_id, assigned_to, stage, deal_price, lost_reason, notes, created_at, updated_at")
      .eq("id", dealId)
      .maybeSingle();

    if (dealErr) {
      if (isMissingSchemaError(dealErr)) setState({ kind: "schema_not_ready", detail: dealErr.message });
      else setState({ kind: "error", detail: dealErr.message });
      return;
    }
    if (!deal) { setState({ kind: "not_found" }); return; }
    // No client-side "is this mine" check here on purpose: deals' SELECT
    // policy (extended by migration 041, already live) now returns this
    // row for the primary agent (assigned_to), any collaborator, or an
    // admin. If none of those apply, the query above already returns no
    // row and the !deal branch above has already handled it — a second,
    // narrower assigned_to-only check here would incorrectly block a
    // co-agent who has legitimate RLS-granted access. isPrimaryAgent
    // (computed at render time below) is what gates edit affordances and
    // the Co-Agents management section, not page access.

    let property: LinkedPropertyInfo | null = null;
    if ((deal as Deal).property_id) {
      const { data: prop } = await supabase
        .from("property_listings")
        .select("id, slug, title, photo_urls, locality, city")
        .eq("id", (deal as Deal).property_id!)
        .maybeSingle();
      property = (prop as LinkedPropertyInfo | null) ?? null;
    }

    const d = deal as Deal;
    setPriceInput(d.deal_price != null ? String(d.deal_price) : "");
    setNotesInput(d.notes ?? "");
    setLostReasonInput(d.lost_reason ?? "");

    setState({ kind: "ready", agentId: agentRow.id, userId: uid, deal: d, property });
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  // Deal Documents (Phase 17, Part B) — loaded once the deal itself is
  // ready, separate effect so a documents-query error never blocks the
  // rest of the page from rendering.
  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setDocsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("id, document_type, file_url, file_name, mime_type, uploaded_by, created_at")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("Deal documents query error:", error);
      setDealDocuments((data as DealDocumentRow[] | null) ?? []);
      setDocsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind === "ready", dealId]);

  // Co-Agents (Phase 18) — same "own effect after the deal is ready"
  // shape as the documents effect above, so a collaborators-query error
  // never blocks the rest of the page. Loaded regardless of
  // isPrimaryAgent (harmless — RLS itself already limits a non-primary,
  // non-admin viewer to only their own membership row, so this simply
  // comes back empty/short for a co-agent); the Co-Agents card just
  // isn't rendered for them at all, per spec.
  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setCollabLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deal_collaborators")
        .select("id, agent_profile_id, added_by, created_at")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Deal collaborators query error:", error);
        setCollaborators([]);
        setCollabLoading(false);
        return;
      }
      const rows = (data as DealCollaboratorRow[] | null) ?? [];
      setCollaborators(rows);
      const map = await resolveAgentNames(rows.map(r => r.agent_profile_id));
      if (!cancelled) setCollabNameMap(map);
      setCollabLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind === "ready", dealId]);

  // Call Logs (Phase 21) — own effect after the deal is ready, same
  // shape as the documents/collaborators effects above.
  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setCallLogsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("call_logs")
        .select("id, direction, notes, called_at")
        .eq("deal_id", dealId)
        .order("called_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("Deal call_logs query error:", error);
      setCallLogs((data as CallLogRow[] | null) ?? []);
      setCallLogsLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind === "ready", dealId]);

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
        deal_id: state.deal.id,
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
    setCallLogs(prev => [data as CallLogRow, ...prev]);
    setCallNotes("");
    setCallAt(isoToDatetimeLocal(new Date().toISOString()));
    setCallMessage({ type: "success", text: "Call logged" });
    setTimeout(() => setCallMessage(null), 2500);
  }

  // Opens the add-collaborator picker — same shape as messaging's
  // ParticipantsPanel.openAdd (src/app/agent/messages/[id]/page.tsx):
  // load all approved agents, exclude ones who don't make sense as
  // candidates, resolve display names via resolveAgentNames.
  async function openAddCollaborator() {
    if (state.kind !== "ready") return;
    setShowAddCollab(true);
    setCollabMessage(null);
    const supabase = createClient();
    // Excludes the primary agent (adding yourself as your own co-agent
    // is meaningless) and anyone already a collaborator.
    const excludeIds = new Set([state.deal.assigned_to, ...collaborators.map(c => c.agent_profile_id)]);
    const { data: aps } = await supabase
      .from("agent_profiles")
      .select("id, user_id")
      .eq("status", "approved");
    const apRows = (aps as { id: string; user_id: string }[] | null ?? []).filter(a => !excludeIds.has(a.id));
    const map = await resolveAgentNames(apRows.map(a => a.id));
    setCollabCandidates([...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function handleAddCollaborator() {
    if (state.kind !== "ready") return;
    if (!collabSelected) { setCollabMessage({ type: "error", text: "Pick an agent to add." }); return; }
    setAddingCollab(true);
    setCollabMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("deal_collaborators")
      .insert({ deal_id: state.deal.id, agent_profile_id: collabSelected, added_by: state.agentId })
      .select("id, agent_profile_id, added_by, created_at")
      .single();
    setAddingCollab(false);
    if (error) {
      console.error("Add collaborator error:", error);
      // Stay open on failure, same convention as handleSaveFields —
      // don't discard the picker's selection.
      setCollabMessage({ type: "error", text: "Could not add co-agent: " + error.message });
      return;
    }
    const row = data as DealCollaboratorRow;
    setCollaborators(prev => [...prev, row]);
    const nameForRow = await resolveAgentNames([row.agent_profile_id]);
    setCollabNameMap(prev => new Map([...prev, ...nameForRow]));
    setShowAddCollab(false);
    setCollabSelected("");
    setCollabSearch("");
    setCollabMessage({ type: "success", text: "Co-agent added" });
    setTimeout(() => setCollabMessage(null), 2500);
  }

  // Remove — window.confirm is the only confirm-dialog mechanism used
  // anywhere in this codebase (see MyListingsList.handleDeleteClick);
  // per spec these are non-destructive membership rows, so a plain
  // confirm is enough, no multi-step flow.
  async function handleRemoveCollaborator(row: DealCollaboratorRow) {
    const name = collabNameMap.get(row.agent_profile_id)?.full_name ?? "this co-agent";
    if (!window.confirm(`Remove ${name} from this deal?`)) return;
    setRemovingCollabId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from("deal_collaborators").delete().eq("id", row.id);
    setRemovingCollabId(null);
    if (error) {
      console.error("Remove collaborator error:", error);
      setCollabMessage({ type: "error", text: "Could not remove co-agent: " + error.message });
      return;
    }
    setCollaborators(prev => prev.filter(c => c.id !== row.id));
    setCollabMessage({ type: "success", text: "Co-agent removed" });
    setTimeout(() => setCollabMessage(null), 2500);
  }

  // Opens the Assign Task form. Candidates = the deal's own team
  // (assigned_to + every current collaborator) minus the viewer —
  // deliberately NOT a free-form agent search, since the picker itself
  // should only ever offer agents 043's are_agents_connected would
  // actually accept, not rely on the INSERT policy to reject a bad
  // choice after the fact.
  async function openAssignTask() {
    if (state.kind !== "ready") return;
    setShowAssignTask(true);
    setTaskMessage(null);
    const teamIds = [...new Set([state.deal.assigned_to, ...collaborators.map(c => c.agent_profile_id)])]
      .filter(id => id !== state.agentId);
    const map = await resolveAgentNames(teamIds);
    setTaskCandidates([...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function handleAssignTask(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    if (!taskAssignee) { setTaskMessage({ type: "error", text: "Pick an agent to assign the task to." }); return; }
    if (!taskTitle.trim()) { setTaskMessage({ type: "error", text: "Title is required." }); return; }
    setAssigningTask(true);
    setTaskMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .insert({
        assigned_to: taskAssignee,
        assigned_by: state.agentId,
        deal_id: state.deal.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      });
    setAssigningTask(false);
    if (error) {
      console.error("Assign task error:", error);
      setTaskMessage({ type: "error", text: "Could not assign task: " + error.message });
      return;
    }
    setShowAssignTask(false);
    setTaskAssignee("");
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskMessage({ type: "success", text: "Task assigned" });
    setTimeout(() => setTaskMessage(null), 2500);
  }

  async function handleStageChange(newStage: DealStage) {
    if (state.kind !== "ready") return;
    setSavingStage(true);
    flashStageMessage(null);
    const supabase = createClient();
    // Same DB rule this UI already enforces client-side: lost_reason can
    // only be non-null when stage = 'lost' (030's CHECK constraint). If
    // moving away from 'lost', clear it here too so the two never
    // disagree with what the fields below show.
    const clearingLostReason = newStage !== "lost" && state.deal.lost_reason != null;
    const { error } = await supabase
      .from("deals")
      .update({
        stage: newStage,
        updated_at: new Date().toISOString(),
        ...(clearingLostReason ? { lost_reason: null } : {}),
      })
      .eq("id", state.deal.id);
    setSavingStage(false);
    if (error) {
      console.error("Deal stage update error:", error);
      flashStageMessage({ type: "error", text: "Could not update stage: " + error.message });
      return;
    }
    if (clearingLostReason) setLostReasonInput("");
    flashStageMessage({ type: "success", text: "Stage updated" });
    setState({ ...state, deal: { ...state.deal, stage: newStage, lost_reason: clearingLostReason ? null : state.deal.lost_reason } });
  }

  function startEditingFields() {
    if (state.kind !== "ready") return;
    setPriceInput(state.deal.deal_price != null ? String(state.deal.deal_price) : "");
    setNotesInput(state.deal.notes ?? "");
    setLostReasonInput(state.deal.lost_reason ?? "");
    flashFieldsMessage(null);
    setEditingFields(true);
  }

  function cancelEditingFields() {
    if (state.kind !== "ready") return;
    setPriceInput(state.deal.deal_price != null ? String(state.deal.deal_price) : "");
    setNotesInput(state.deal.notes ?? "");
    setLostReasonInput(state.deal.lost_reason ?? "");
    flashFieldsMessage(null);
    setEditingFields(false);
  }

  async function handleSaveFields(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    setSavingFields(true);
    flashFieldsMessage(null);
    const supabase = createClient();
    // Enforce the same rule the DB CHECK constraint enforces — never
    // send a non-null lost_reason unless stage is actually 'lost', so a
    // stale/mistaken client state can't even reach the DB error; the UI
    // itself is the first line of feedback, per the standing constraint.
    const isLost = state.deal.stage === "lost";
    const nextPrice = priceInput.trim() ? Number(priceInput) : null;
    const nextNotes = notesInput.trim() || null;
    const nextLostReason = isLost ? (lostReasonInput.trim() || null) : null;

    const { error } = await supabase
      .from("deals")
      .update({
        deal_price: nextPrice,
        notes: nextNotes,
        lost_reason: nextLostReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.deal.id);
    setSavingFields(false);
    if (error) {
      console.error("Deal fields update error:", error);
      // Stay in edit mode on failure — per constraint, don't silently
      // revert or lose the agent's unsaved edits.
      flashFieldsMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    setState({
      ...state,
      deal: { ...state.deal, deal_price: nextPrice, notes: nextNotes, lost_reason: nextLostReason },
    });
    setEditingFields(false);
    flashFieldsMessage({ type: "success", text: "Saved" });
  }

  if (state.kind === "loading") {
    return (
      <Shell>
        <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "deal-spin 0.8s linear infinite" }}>
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
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view this deal.</p>
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
      <Shell backHref="/agent/deals" backLabel="← All Deals">
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Deals schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>Depends on migration 030_deals_table.sql.</p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_found") {
    return <Shell backHref="/agent/deals" backLabel="← All Deals"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Deal not found.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell backHref="/agent/deals" backLabel="← All Deals"><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  const { deal, property } = state;
  // Gates edit affordances (stage stepper interactivity, the Deal
  // Details Edit button) and the Co-Agents management section. RLS
  // already blocks the actual UPDATE/INSERT/DELETE at the database
  // level for a non-primary agent (deals' UPDATE policy from 030,
  // deal_collaborators' INSERT/DELETE policies from 041) — this is a
  // UI-level gate on top of that, so a co-agent never sees a control
  // that would fail anyway.
  const isPrimaryAgent = deal.assigned_to === state.agentId;
  const isLost = deal.stage === "lost";
  const thumb = property?.photo_urls?.[0];
  const address = property ? [property.locality, property.city].filter(Boolean).join(", ") : null;

  return (
    <Shell backHref="/agent/deals" backLabel="← All Deals">
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontFamily: "var(--font-support-new)", fontSize: "30px", fontWeight: 700, color: "#FFFFFF" }}>
          {fmtPrice(deal.deal_price)}
        </h1>
      </div>

      {/* Stage stepper — large, interactive. Replaces the old header
          Select entirely: this is the one control surface for stage now. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}>Stage</h3>
          <SaveConfirmation message={stageMessage} />
        </div>
        <div style={{ opacity: savingStage ? 0.6 : 1, transition: "opacity 0.15s", overflowX: "auto", paddingBottom: "4px" }}>
          {/* Omitting onSelectStage for a co-agent renders the existing
              read-only mode DealStageStepper already supports
              (interactive = !!onSelectStage) — no new component needed. */}
          <DealStageStepper stage={deal.stage} size="large" onSelectStage={isPrimaryAgent ? handleStageChange : undefined} />
        </div>
      </Card>

      {/* Property card — thumbnail + address, per spec. */}
      {property && (
        <Link href={`/property/${property.slug}`} style={{ textDecoration: "none" }}>
          <Card style={{ padding: 0, marginBottom: "20px", overflow: "hidden", cursor: "pointer" }}>
            <div className="deal-property-card" style={{ display: "flex", gap: 0 }}>
              <div style={{ width: "130px", flexShrink: 0, position: "relative", background: "#0A1526", overflow: "hidden", minHeight: "100px" }}>
                {thumb ? (
                  <img src={optimizedImageUrl(thumb, 260)} alt={property.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#10C4C3", opacity: 0.3, minHeight: "100px" }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#10C4C3" }}>{property.title}</span>
                {address && <span style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "4px" }}>{address}</span>}
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Deal Details — view/edit/save/confirm. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Deal Details</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={fieldsMessage} />
            {!editingFields && isPrimaryAgent && (
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
            <Field label="Deal Price">{fmtPrice(deal.deal_price)}</Field>
            <Field label="Notes">
              {deal.notes ? <span style={{ whiteSpace: "pre-wrap" }}>{deal.notes}</span> : <span style={{ color: "#6B7686" }}>No notes yet.</span>}
            </Field>
            {isLost && (
              <Field label="Lost Reason">
                {deal.lost_reason ? <span style={{ whiteSpace: "pre-wrap", color: "#F87171" }}>{deal.lost_reason}</span> : <span style={{ color: "#6B7686" }}>No reason recorded.</span>}
              </Field>
            )}
          </>
        ) : (
          <form onSubmit={handleSaveFields}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Deal Price</label>
              <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="e.g. 8500000" style={inputStyle} />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Notes</label>
              <textarea value={notesInput} onChange={e => setNotesInput(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            {/* lost_reason: only shown/editable when stage = 'lost' — the
                DB CHECK constraint (030) enforces this server-side too,
                but per the standing constraint that isn't the only
                feedback: the field is simply not rendered at all
                otherwise, so there is nothing to submit that could ever
                trigger that error. */}
            {isLost && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#F87171", marginBottom: "6px" }}>Lost Reason</label>
                <textarea value={lostReasonInput} onChange={e => setLostReasonInput(e.target.value)} rows={2} placeholder="Why was this deal lost?" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            )}

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

      {/* Co-Agents (Phase 18) — primary agent only, per spec: a
          co-agent never sees this section, management or otherwise.
          Mirrors messaging's ParticipantsPanel (list + "+ Add" +
          search/select picker), with a per-row Remove action since
          this is membership, not a fixed set (035's UPDATE-only
          participants model has no equivalent remove). */}
      {isPrimaryAgent && (
        <Card style={{ padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Co-Agents</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <SaveConfirmation message={collabMessage} />
              {!showAddCollab && (
                <button
                  onClick={openAddCollaborator}
                  style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                >
                  + Add Co-Agent
                </button>
              )}
            </div>
          </div>

          {collabLoading ? (
            <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
          ) : collaborators.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#6B7686", marginBottom: showAddCollab ? "16px" : 0 }}>No co-agents yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: showAddCollab ? "16px" : 0 }}>
              {collaborators.map(row => (
                <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#FFFFFF" }}>{collabNameMap.get(row.agent_profile_id)?.full_name ?? "Unnamed agent"}</span>
                  <button
                    onClick={() => handleRemoveCollaborator(row)}
                    disabled={removingCollabId === row.id}
                    style={{ padding: "6px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", color: "#F87171", fontSize: "12px", fontWeight: 600, cursor: removingCollabId === row.id ? "default" : "pointer", opacity: removingCollabId === row.id ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
                  >
                    {removingCollabId === row.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddCollab && (
            <div style={{ borderTop: collaborators.length > 0 ? "1px solid rgba(255,255,255,0.08)" : "none", paddingTop: collaborators.length > 0 ? "14px" : 0 }}>
              <input
                type="text"
                value={collabSearch}
                onChange={e => setCollabSearch(e.target.value)}
                placeholder="Search agents…"
                style={{ ...inputStyle, marginBottom: "8px" }}
              />
              <select value={collabSelected} onChange={e => setCollabSelected(e.target.value)} style={{ ...inputStyle, marginBottom: "10px", cursor: "pointer" }}>
                <option value="">Select an agent…</option>
                {collabCandidates
                  .filter(a => a.full_name.toLowerCase().includes(collabSearch.toLowerCase()))
                  .map(a => <option key={a.agent_profile_id} value={a.agent_profile_id}>{a.full_name}</option>)}
              </select>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleAddCollaborator} disabled={addingCollab}
                  style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: addingCollab ? "default" : "pointer", opacity: addingCollab ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                  {addingCollab ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => { setShowAddCollab(false); setCollabSelected(""); setCollabSearch(""); setCollabMessage(null); }} disabled={addingCollab}
                  style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: addingCollab ? "default" : "pointer", opacity: addingCollab ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Assign Task (Phase 19) — available to the whole deal team
          (primary agent or any collaborator), not just the primary
          agent, since connection (043's are_agents_connected) runs
          through the deal itself, not through who manages
          collaborators. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: showAssignTask ? "16px" : 0 }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Tasks</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={taskMessage} />
            {!showAssignTask && (
              <button
                onClick={openAssignTask}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                + Assign Task
              </button>
            )}
          </div>
        </div>

        {showAssignTask && (
          <form onSubmit={handleAssignTask}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Assign To</label>
              <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select an agent…</option>
                {taskCandidates.map(a => <option key={a.agent_profile_id} value={a.agent_profile_id}>{a.full_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Title</label>
              <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Follow up on documents" style={inputStyle} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Description (optional)</label>
              <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Due Date (optional)</label>
              <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={assigningTask}
                style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: assigningTask ? "default" : "pointer", opacity: assigningTask ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {assigningTask ? "Assigning…" : "Assign Task"}
              </button>
              <button type="button" onClick={() => { setShowAssignTask(false); setTaskMessage(null); }} disabled={assigningTask}
                style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: assigningTask ? "default" : "pointer", opacity: assigningTask ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Documents — free list + upload, distinct from the fixed 4-slot
          KYC checklist on the agent's own profile page. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Documents</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={docMessage} />
            <button
              onClick={() => setShowAddDoc(s => !s)}
              style={{ padding: "7px 16px", background: showAddDoc ? "rgba(255,255,255,0.06)" : "#10C4C3", border: showAddDoc ? "1.5px solid rgba(255,255,255,0.15)" : "none", borderRadius: "8px", color: showAddDoc ? "#FFFFFF" : "#020C1C", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
            >
              {showAddDoc ? "Cancel" : "+ Add Document"}
            </button>
          </div>
        </div>

        {showAddDoc && (
          <form onSubmit={handleAddDocument} style={{ marginBottom: "18px", padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Document Type</label>
              <select value={newDocType} onChange={e => setNewDocType(e.target.value)} style={inputStyle}>
                {DEAL_DOCUMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {newDocType === "Other" && (
                <input
                  type="text"
                  value={newDocCustomType}
                  onChange={e => setNewDocCustomType(e.target.value)}
                  placeholder="Specify document type"
                  style={{ ...inputStyle, marginTop: "8px" }}
                />
              )}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={e => setNewDocFile(e.target.files?.[0] ?? null)}
                style={{ ...inputStyle, padding: "8px 14px" }}
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Notes (optional)</label>
              <textarea value={newDocNotes} onChange={e => setNewDocNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <button type="submit" disabled={uploadingDoc || !newDocFile}
              style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: (uploadingDoc || !newDocFile) ? "default" : "pointer", opacity: (uploadingDoc || !newDocFile) ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
              {uploadingDoc ? "Uploading…" : "Upload"}
            </button>
          </form>
        )}

        {docsLoading ? (
          <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
        ) : dealDocuments.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#6B7686" }}>No documents yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dealDocuments.map(doc => (
              <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{doc.document_type}{doc.file_name ? ` — ${doc.file_name}` : ""}</div>
                  <div style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "3px" }}>
                    {fmtDate(doc.created_at)} · Uploaded by {doc.uploaded_by === state.userId ? "you" : "another user"}
                  </div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#10C4C3", fontSize: "12px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                  View / Download
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log a Call (Phase 21) — call_logs, migration 046, already
          live. Same "form on top, list below" shape as the lead
          detail page's own Calls card. */}
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
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <button type="submit" disabled={loggingCall}
            style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: loggingCall ? "default" : "pointer", opacity: loggingCall ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            {loggingCall ? "Logging…" : "Log Call"}
          </button>
        </form>

        {callLogsLoading ? (
          <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
        ) : callLogs.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#6B7686" }}>No calls logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {callLogs.map(c => (
              <div key={c.id} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#10C4C3" }}>{c.direction}</span>
                  <span style={{ fontSize: "12px", color: "#A9B4C2" }}>{fmtDate(c.called_at)}</span>
                </div>
                {c.notes && <p style={{ fontSize: "13px", color: "#FFFFFF", marginTop: "4px" }}>{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Linked Records — as already built (property/lead/site visit
          links), kept separate from the visual property card above. */}
      <Card style={{ padding: "24px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Linked Records</h3>
        <div className="deal-linked-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <Field label="Property">
            {property ? <Link href={`/property/${property.slug}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconBuilding />{property.title}</Link> : "—"}
          </Field>
          <Field label="Lead">
            {deal.inquiry_id ? <Link href={`/agent/leads/${deal.inquiry_id}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconInbox />View Lead</Link> : "—"}
          </Field>
          <Field label="Site Visit">
            {deal.site_visit_id ? <Link href={`/agent/site-visits/${deal.site_visit_id}`} style={{ color: "#10C4C3", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconCalendar />View Site Visit</Link> : "—"}
          </Field>
        </div>
        <div style={{ display: "flex", gap: "24px", marginTop: "6px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Field label="Created"><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDate(deal.created_at)}</span></Field>
          <Field label="Last Updated"><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><IconClock />{fmtDate(deal.updated_at)}</span></Field>
        </div>
      </Card>
    </Shell>
  );
}

function Shell({ children, backHref = "/dashboard", backLabel = "← Dashboard" }: { children: React.ReactNode; backHref?: string; backLabel?: string }) {
  return (
    <>
      <style>{`
        @keyframes deal-spin { to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .deal-linked-grid { grid-template-columns: 1fr !important; }
          .deal-property-card { flex-direction: column; }
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
