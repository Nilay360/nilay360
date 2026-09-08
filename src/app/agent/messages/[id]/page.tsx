"use client";

// Agent messaging — thread view (Part B). Schema (034) and the
// conversation_participants UPDATE policy (035) are already live —
// this page only reads/writes them, no schema/RLS changes here.
// Structure mirrors src/app/agent/deals/[id]/page.tsx: shared
// types/Card imported from the sibling list page (../page), own local
// Shell with a back-link to the list instead of the dashboard.
//
// Polling, not realtime: every 7s while the tab is visible, plus an
// immediate refetch on window focus — the simplest reasonable
// approach for v1, no Supabase Realtime subscription wired up, per
// explicit instruction that neither is required tonight.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Participant, Message, AgentOption } from "../page";
import { Card, resolveAgentNames } from "../page";

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "not_found" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string };

const POLL_MS = 7000;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}
function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "thread-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

// ── Participants panel — view list, add new (group only) ───────────

function ParticipantsPanel({
  conversationId, participants, nameMap, selfId, isGroup, onAdded,
}: {
  conversationId: string;
  participants: Participant[];
  nameMap: Map<string, AgentOption>;
  selfId: string;
  isGroup: boolean;
  onAdded: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [candidates, setCandidates] = useState<AgentOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openAdd() {
    setAdding(true);
    setError(null);
    const supabase = createClient();
    const existingIds = new Set(participants.map(p => p.agent_profile_id));
    const { data: aps } = await supabase
      .from("agent_profiles")
      .select("id, user_id")
      .eq("status", "approved");
    const apRows = (aps as { id: string; user_id: string }[] | null ?? []).filter(a => !existingIds.has(a.id));
    const map = await resolveAgentNames(apRows.map(a => a.id));
    setCandidates([...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function handleAdd() {
    if (!selected) { setError("Pick an agent to add."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // Steady-state INSERT path (RLS Condition A) — the requesting
    // agent (self) is already a participant of this conversation, so
    // no bootstrap logic is needed here, unlike the creator's own
    // first-participant insert on the New Conversation flow.
    const { error: err } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: conversationId, agent_profile_id: selected });
    setSaving(false);
    if (err) {
      console.error("Add participant error:", err);
      setError("Could not add participant: " + err.message);
      return;
    }
    setAdding(false);
    setSelected("");
    onAdded();
  }

  const filtered = candidates.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card style={{ padding: "20px 22px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
          Participants ({participants.length})
        </h3>
        {isGroup && !adding && (
          <button onClick={openAdd} style={{ background: "none", border: "none", color: "#10C4C3", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
            + Add
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: adding ? "16px" : 0 }}>
        {participants.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: p.agent_profile_id === selfId ? "#10C4C3" : "#A9B4C2" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
            {p.agent_profile_id === selfId ? "You" : (nameMap.get(p.agent_profile_id)?.full_name ?? "Unnamed agent")}
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents…"
            style={{ ...inputStyle, marginBottom: "8px" }}
          />
          <select value={selected} onChange={e => setSelected(e.target.value)} style={{ ...inputStyle, marginBottom: "10px", cursor: "pointer" }}>
            <option value="">Select an agent…</option>
            {filtered.map(a => <option key={a.agent_profile_id} value={a.agent_profile_id}>{a.full_name}</option>)}
          </select>
          {error && <p style={{ fontSize: 12, color: "#F87171", marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={saving}
              style={{ padding: "8px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => { setAdding(false); setError(null); }} disabled={saving}
              style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Assign Task panel (Phase 19) ────────────────────────────────────
//
// Conversations have no deal_id/inquiry_id/property_id column at all
// (confirmed live — conversations is just id, type, name, created_by,
// created_at, updated_at) — so unlike the deal-detail page, a
// conversation-originated task has nothing to auto-link to, and 043's
// tasks table requires at least one of deal_id/inquiry_id/property_id.
// Resolved by explicit user decision: a required "Link to" deal
// picker, scoped to the assigner's OWN deals (assigned_to = the
// current agent) — same source query as /agent/deals' own list, not a
// new query shape. The picker is NOT scoped to deals shared with the
// recipient — 043's are_agents_connected only needs the assigner and
// assignee to be connected via the conversation itself (already true,
// since both are participants here), not via the specific deal the
// task happens to be filed under.
function AssignTaskPanel({
  selfId, otherParticipants, nameMap, onDone,
}: {
  selfId: string;
  otherParticipants: Participant[];
  nameMap: Map<string, AgentOption>;
  onDone: () => void;
}) {
  const [myDeals, setMyDeals] = useState<{ id: string; label: string }[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [assignee, setAssignee] = useState<string | "">(otherParticipants.length === 1 ? otherParticipants[0].agent_profile_id : "");
  const [dealId, setDealId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDealsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("deals")
        .select("id, property_id, deal_price, created_at")
        .eq("assigned_to", selfId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data as { id: string; property_id: string | null; deal_price: number | null; created_at: string }[] | null) ?? [];
      const propertyIds = [...new Set(rows.map(d => d.property_id).filter((id): id is string => !!id))];
      const propertyMap = new Map<string, string>();
      if (propertyIds.length > 0) {
        const { data: props } = await supabase.from("property_listings").select("id, title").in("id", propertyIds);
        (props as { id: string; title: string }[] | null ?? []).forEach(p => propertyMap.set(p.id, p.title));
      }
      if (cancelled) return;
      setMyDeals(rows.map(d => ({
        id: d.id,
        label: d.property_id && propertyMap.has(d.property_id)
          ? propertyMap.get(d.property_id)!
          : `${d.deal_price != null ? `₹${d.deal_price.toLocaleString("en-IN")}` : "Untitled deal"} — ${new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
      })));
      setDealsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selfId]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignee) { setMessage({ type: "error", text: "Pick an agent to assign the task to." }); return; }
    if (!title.trim()) { setMessage({ type: "error", text: "Title is required." }); return; }
    if (!dealId) { setMessage({ type: "error", text: "Pick a deal to link this task to." }); return; }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .insert({
        assigned_to: assignee,
        assigned_by: selfId,
        deal_id: dealId,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
    setSaving(false);
    if (error) {
      console.error("Assign task error:", error);
      setMessage({ type: "error", text: "Could not assign task: " + error.message });
      return;
    }
    setMessage({ type: "success", text: "Task assigned" });
    setTitle("");
    setDescription("");
    setDueDate("");
    setTimeout(onDone, 900);
  }

  return (
    <Card style={{ padding: "20px 22px", marginBottom: "16px" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginBottom: "14px" }}>Assign Task</h3>
      <form onSubmit={handleAssign}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Assign To</label>
          <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Select an agent…</option>
            {otherParticipants.map(p => (
              <option key={p.agent_profile_id} value={p.agent_profile_id}>{nameMap.get(p.agent_profile_id)?.full_name ?? "Unnamed agent"}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Link To Deal</label>
          {dealsLoading ? (
            <p style={{ fontSize: "12px", color: "#6B7686" }}>Loading your deals…</p>
          ) : myDeals.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#6B7686" }}>You have no deals to link this task to yet.</p>
          ) : (
            <select value={dealId} onChange={e => setDealId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select a deal…</option>
              {myDeals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow up on documents" style={inputStyle} />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "5px" }}>Due Date (optional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
        </div>
        {message && <p style={{ fontSize: 12, color: message.type === "error" ? "#F87171" : "#4ADE80", marginBottom: 10 }}>{message.type === "error" ? "⚠ " : "✓ "}{message.text}</p>}
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" disabled={saving || myDeals.length === 0}
            style={{ padding: "8px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: (saving || myDeals.length === 0) ? "default" : "pointer", opacity: (saving || myDeals.length === 0) ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            {saving ? "Assigning…" : "Assign Task"}
          </button>
          <button type="button" onClick={onDone} disabled={saving}
            style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ConversationThreadPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, AgentOption>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);

  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const agentIdRef = useRef<string | null>(null);

  const markRead = useCallback(async (agentId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("agent_profile_id", agentId);
    if (error) console.error("Thread — mark read error:", error);
  }, [conversationId]);

  const refetchMessages = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[] | null) ?? []);
  }, [conversationId]);

  const loadThread = useCallback(async (agentId: string) => {
    const supabase = createClient();

    // Confirm participation explicitly (rather than relying only on
    // RLS silently returning empty) so a clear "not found or not
    // yours" state can be shown instead of a blank thread.
    const { data: own } = await supabase
      .from("conversation_participants")
      .select("id, conversation_id, agent_profile_id, joined_at, last_read_at")
      .eq("conversation_id", conversationId)
      .eq("agent_profile_id", agentId)
      .maybeSingle();
    if (!own) { setState({ kind: "not_found" }); return; }

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, type, name, created_by, created_at, updated_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) { setState({ kind: "not_found" }); return; }
    setConversation(conv as Conversation);

    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("id, conversation_id, agent_profile_id, joined_at, last_read_at")
      .eq("conversation_id", conversationId)
      .order("joined_at", { ascending: true });
    const partRows = (allParticipants as Participant[] | null) ?? [];
    setParticipants(partRows);

    const others = partRows.filter(p => p.agent_profile_id !== agentId).map(p => p.agent_profile_id);
    const names = await resolveAgentNames(others);
    setNameMap(names);

    await refetchMessages();
    void markRead(agentId);
    setState({ kind: "ready", agentId });
  }, [conversationId, refetchMessages, markRead]);

  async function load() {
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

    agentIdRef.current = agentRow.id;
    await loadThread(agentRow.id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Poll for new messages every 7s while the thread is open, plus an
  // immediate refetch whenever the tab regains focus — simplest
  // reasonable approach for v1, no realtime subscription.
  useEffect(() => {
    if (state.kind !== "ready") return;
    const interval = setInterval(() => {
      void refetchMessages();
      void markRead(state.agentId);
    }, POLL_MS);
    const onFocus = () => { void refetchMessages(); void markRead(state.agentId); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [state, refetchMessages, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    const text = composerText.trim();
    if (!text) return;
    setSending(true);
    setSendError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: state.agentId, content: text });
    setSending(false);
    if (error) {
      console.error("Send message error:", error);
      setSendError("Could not send: " + error.message);
      return;
    }
    setComposerText("");
    await refetchMessages();
    // Bump own last_read_at too — otherwise the message list would
    // show this conversation as "unread" to the very person who just
    // sent its newest message, since last_read_at only updates on
    // thread load/poll, not on send.
    void markRead(state.agentId);
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Sign in to your agent account to view this conversation.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile.</p></Card></Shell>;
  }
  if (state.kind === "not_found") {
    return <Shell><Card style={{ padding: "48px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Conversation not found, or you're not a participant.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686", marginTop: 8 }}>{state.detail}</p></Card></Shell>;
  }

  if (!conversation) return <Shell><Spinner /></Shell>;
  const { agentId } = state;
  const isGroup = conversation.type === "group";
  const otherParticipant = !isGroup ? participants.find(p => p.agent_profile_id !== agentId) : null;
  const title = isGroup
    ? (conversation.name?.trim() || `Group (${participants.length} members)`)
    : (otherParticipant ? (nameMap.get(otherParticipant.agent_profile_id)?.full_name ?? "Direct message") : "Direct message");

  // Group consecutive messages under a day heading, same "group by day"
  // pattern the calendar page's agenda list already uses.
  let lastDay = "";

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", fontWeight: 500, color: "#FFFFFF" }}>{title}</h1>
          <p style={{ fontSize: "12px", color: "#A9B4C2", marginTop: 3 }}>{isGroup ? `${participants.length} participants` : "Direct message"}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAssignTask(s => !s)}
            style={{ padding: "9px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            {showAssignTask ? "Hide Assign Task" : "+ Assign Task"}
          </button>
          <button
            onClick={() => setShowParticipants(s => !s)}
            style={{ padding: "9px 18px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            {showParticipants ? "Hide Participants" : "Participants"}
          </button>
        </div>
      </div>

      {showAssignTask && (
        <AssignTaskPanel
          selfId={agentId}
          otherParticipants={participants.filter(p => p.agent_profile_id !== agentId)}
          nameMap={nameMap}
          onDone={() => setShowAssignTask(false)}
        />
      )}

      {showParticipants && (
        <ParticipantsPanel
          conversationId={conversationId}
          participants={participants}
          nameMap={nameMap}
          selfId={agentId}
          isGroup={isGroup}
          onAdded={() => void loadThread(agentId)}
        />
      )}

      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "60vh", minHeight: 420 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
          {messages.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#6B7686", textAlign: "center", padding: "40px 0" }}>No messages yet — say hello.</p>
          ) : (
            messages.map(m => {
              const isSelf = m.sender_id === agentId;
              const senderName = isSelf ? "You" : (m.sender_id ? (nameMap.get(m.sender_id)?.full_name ?? "Unknown agent") : "Removed agent");
              const key = dateKey(m.created_at);
              const showDayHeading = key !== lastDay;
              lastDay = key;
              return (
                <div key={m.id}>
                  {showDayHeading && (
                    <div style={{ textAlign: "center", margin: "14px 0" }}>
                      <span style={{ fontSize: "10px", color: "#6B7686", background: "rgba(255,255,255,0.05)", padding: "3px 12px", borderRadius: "999px" }}>
                        {fmtDayHeading(m.created_at)}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", marginBottom: "10px" }}>
                    {isGroup && !isSelf && (
                      <span style={{ fontSize: "10.5px", color: "#6B7686", marginBottom: "3px", marginLeft: "4px" }}>{senderName}</span>
                    )}
                    <div style={{
                      maxWidth: "72%", padding: "9px 14px", borderRadius: isSelf ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                      background: isSelf ? "#10C4C3" : "rgba(255,255,255,0.07)",
                      color: isSelf ? "#020C1C" : "#FFFFFF",
                      fontSize: "13.5px", lineHeight: 1.5, wordBreak: "break-word",
                    }}>
                      {m.content}
                    </div>
                    <span style={{ fontSize: "10px", color: "#6B7686", marginTop: "3px" }}>{fmtTime(m.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: "10px", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            type="text"
            value={composerText}
            onChange={e => setComposerText(e.target.value)}
            placeholder="Type a message…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" disabled={sending || !composerText.trim()}
            style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, cursor: sending ? "default" : "pointer", opacity: sending || !composerText.trim() ? 0.6 : 1, fontFamily: "var(--font-body-new)", flexShrink: 0 }}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      </Card>
      {sendError && <p style={{ fontSize: "12px", color: "#F87171", marginTop: "10px" }}>{sendError}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes thread-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/agent/messages" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← All Messages</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
