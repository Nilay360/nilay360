"use client";

// Agent messaging — conversation list (Part A). Schema (034) and the
// conversation_participants UPDATE policy (035) are already live —
// this page only reads/writes them, no schema/RLS changes here.
// Structure, identity-lookup pattern, and shared building blocks
// mirror src/app/agent/deals/page.tsx exactly, per that page's own
// established conventions.
//
// No PostgREST embeds anywhere below — every cross-table lookup here
// (conversations -> participants -> agent_profiles -> profiles,
// conversations -> messages) is a separate query, results joined
// client-side via Maps. Same "fetch then map" pattern already used in
// agent/deals/page.tsx (property titles) and agent/calendar/page.tsx
// (linked entity pickers), for the same reason: this codebase has
// never verified PostgREST's embed relationship-name syntax against
// this schema, so it's deliberately avoided everywhere, not just here.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  conversation_id: string;
  agent_profile_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

// An approved agent, resolved to a display name — used by the picker
// (this page) and the participant list / sender-name lookup (thread
// page). agent_profile_id is the id everything else in this schema
// keys off; user_id is only needed to join into profiles for the name.
export interface AgentOption {
  agent_profile_id: string;
  user_id: string;
  full_name: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "schema_not_ready"; detail: string }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string };

function isMissingSchemaError(error: { code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "42P01";
}

// Resolves a set of agent_profile_ids to display names — two-step
// fetch (agent_profiles -> public_agent_contact), not an embed, per
// the file header.
//
// Deliberately queries `public_agent_contact` (migration 016), NOT
// `profiles` directly. profiles' own "public read for approved
// agents" policy (migration 017) exists only as a file in this repo —
// confirmed live, via an anon-key request (not service-role, not
// reasoning from the migration text) that `profiles` returns zero
// rows for any id under a real RLS-gated session. `public_agent_contact`
// is the mechanism actually live and GRANTed to anon/authenticated —
// confirmed working the same way — so it's what this must use. Used
// by both the picker and (via export) the thread page's participant
// list.
export async function resolveAgentNames(agentProfileIds: string[]): Promise<Map<string, AgentOption>> {
  const map = new Map<string, AgentOption>();
  if (agentProfileIds.length === 0) return map;
  const supabase = createClient();

  const { data: aps } = await supabase
    .from("agent_profiles")
    .select("id, user_id")
    .in("id", agentProfileIds);
  const apRows = (aps as { id: string; user_id: string }[] | null) ?? [];
  if (apRows.length === 0) return map;

  const userIds = apRows.map(a => a.user_id);
  const { data: contacts } = await supabase
    .from("public_agent_contact")
    .select("id, full_name")
    .in("id", userIds);
  const nameByUserId = new Map<string, string>();
  (contacts as { id: string; full_name: string | null }[] | null ?? []).forEach(c => nameByUserId.set(c.id, c.full_name ?? "Unnamed agent"));

  apRows.forEach(a => map.set(a.id, {
    agent_profile_id: a.id,
    user_id: a.user_id,
    full_name: nameByUserId.get(a.user_id) ?? "Unnamed agent",
  }));
  return map;
}

function fmtRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Shared dark-theme building blocks — duplicated locally, same
// per-page convention as leads/site-visits/deals. ──────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#10C4C3" }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "340px", lineHeight: 1.65 }}>{subtitle}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "msg-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function IconMsg() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}

// ── Conversation row — shows preview/timestamp/unread indicator ────

interface ConversationRowData {
  conversation: Conversation;
  otherAgent: AgentOption | null; // direct only
  lastMessage: Message | null;
  unread: boolean;
}

function ConversationRow({ row, selfId }: { row: ConversationRowData; selfId: string }) {
  const { conversation, otherAgent, lastMessage, unread } = row;
  const title = conversation.type === "direct"
    ? (otherAgent?.full_name ?? "Direct message")
    : (conversation.name?.trim() || "Group conversation");
  const previewPrefix = lastMessage?.sender_id === selfId ? "You: " : "";

  return (
    <Link href={`/agent/messages/${conversation.id}`} style={{ textDecoration: "none" }}>
      <Card style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: conversation.type === "group" ? "rgba(59,130,246,0.15)" : "rgba(16,196,195,0.15)",
          border: `1px solid ${conversation.type === "group" ? "rgba(59,130,246,0.3)" : "rgba(16,196,195,0.3)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: conversation.type === "group" ? "#3B82F6" : "#10C4C3",
          fontFamily: "var(--font-body-new)", fontSize: "16px", fontWeight: 600,
        }}>
          {title.trim().charAt(0).toUpperCase() || "?"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: unread ? 700 : 500, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title}
            </span>
            <span style={{ fontSize: "11px", color: unread ? "#10C4C3" : "#6B7686", flexShrink: 0 }}>
              {lastMessage ? fmtRelative(lastMessage.created_at) : fmtRelative(conversation.created_at)}
            </span>
          </div>
          <p style={{ fontSize: "12.5px", color: unread ? "#A9B4C2" : "#6B7686", fontWeight: unread ? 600 : 400, margin: "3px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lastMessage ? `${previewPrefix}${lastMessage.content}` : "No messages yet"}
          </p>
        </div>

        {unread && (
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#10C4C3", flexShrink: 0 }} />
        )}
      </Card>
    </Link>
  );
}

// ── New Conversation flow ────────────────────────────────────────

function NewConversationForm({ agentId, agents, onClose, onCreated }: {
  agentId: string;
  agents: AgentOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [kind, setKind] = useState<ConversationType>("direct");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = agents.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()));

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(kind === "direct" ? [] : prev);
      if (prev.has(id) && kind !== "direct") next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0) { setError(kind === "direct" ? "Pick an agent to message." : "Pick at least one agent."); return; }
    if (kind === "group" && !groupName.trim()) { setError("Group name is required."); return; }
    setCreating(true);
    setError(null);
    const supabase = createClient();

    // Bootstrap order matters — the RLS on conversation_participants
    // requires it exactly this way:
    //   1) create the conversation (created_by = self)
    //   2) insert the CREATOR's OWN participant row first — this is
    //      the only insert that can satisfy the policy's bootstrap
    //      Condition B (no participant rows exist yet for this brand
    //      new conversation, so Condition A can't match anyone)
    //   3) only once the creator is seated can the remaining selected
    //      participants be inserted — they now satisfy steady-state
    //      Condition A, since an existing member (the creator) exists
    // Doing 2 and 3 in the other order, or combining them into one
    // multi-row insert, would have the second/other rows fail RLS,
    // since at insert-time Postgres evaluates each row independently
    // and the creator's own row wouldn't exist yet within that same
    // statement for the others to piggyback on.
    //
    // The conversation's id is generated client-side (crypto.randomUUID())
    // and included explicitly in the insert payload — conversations.id
    // has a DEFAULT but happily accepts an explicit value too. This is
    // deliberate, not cosmetic: chaining .select().single() on the
    // insert triggers Postgres to re-read the just-inserted row via
    // INSERT ... RETURNING, which is itself subject to the
    // conversations SELECT policy — and that policy requires the
    // requester to already be a participant, which they aren't yet at
    // this exact moment (that's the next step). The INSERT's own WITH
    // CHECK passes fine; it was the automatic RETURNING re-read that
    // silently failed. Knowing the id upfront means there's nothing to
    // read back, so this problem never arises.
    const conversationId = crypto.randomUUID();
    const { error: convErr } = await supabase
      .from("conversations")
      .insert({ id: conversationId, type: kind, name: kind === "group" ? groupName.trim() : null, created_by: agentId });
    if (convErr) {
      console.error("New conversation — create error:", {
        message: convErr.message, code: convErr.code, details: convErr.details, hint: convErr.hint,
      });
      setCreating(false);
      setError("Could not start conversation: " + convErr.message);
      return;
    }

    const { error: selfErr } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: conversationId, agent_profile_id: agentId });
    if (selfErr) {
      console.error("New conversation — seat creator error:", {
        message: selfErr.message, code: selfErr.code, details: selfErr.details, hint: selfErr.hint,
      });
      setCreating(false);
      setError("Could not start conversation: " + selfErr.message);
      return;
    }

    const others = [...selected].filter(id => id !== agentId);
    if (others.length > 0) {
      const { error: othersErr } = await supabase
        .from("conversation_participants")
        .insert(others.map(id => ({ conversation_id: conversationId, agent_profile_id: id })));
      if (othersErr) {
        console.error("New conversation — add participants error:", {
          message: othersErr.message, code: othersErr.code, details: othersErr.details, hint: othersErr.hint,
        });
        setCreating(false);
        setError("Conversation created, but adding participants failed: " + othersErr.message);
        return;
      }
    }

    setCreating(false);
    onCreated(conversationId);
  }

  return (
    <Card style={{ padding: "24px", marginBottom: "20px" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>New Conversation</h3>

      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {(["direct", "group"] as const).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => { setKind(k); setSelected(new Set()); setError(null); }}
            style={{ padding: "7px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: kind === k ? 700 : 500, background: kind === k ? "#10C4C3" : "rgba(255,255,255,0.06)", color: kind === k ? "#020C1C" : "#A9B4C2", border: kind === k ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)", textTransform: "capitalize" }}
          >
            {k}
          </button>
        ))}
      </div>

      {kind === "group" && (
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Group Name</label>
          <input
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="e.g. Madhapur Team"
            style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" }}
          />
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>
          {kind === "direct" ? "Message who?" : "Add agents"}
        </label>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents by name…"
          style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" }}
        />
      </div>

      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, marginBottom: "16px" }}>
        {filtered.length === 0 ? (
          <p style={{ padding: "16px", fontSize: 12, color: "#6B7686", textAlign: "center" }}>No agents match.</p>
        ) : (
          filtered.map(a => {
            const isSel = selected.has(a.agent_profile_id);
            return (
              <button
                key={a.agent_profile_id}
                type="button"
                onClick={() => toggleSelect(a.agent_profile_id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  padding: "10px 14px", background: isSel ? "rgba(16,196,195,0.08)" : "transparent",
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                  fontFamily: "var(--font-body-new)", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, color: "#FFFFFF" }}>{a.full_name}</span>
                {isSel && <span style={{ color: "#10C4C3", fontSize: 13, fontWeight: 700 }}>✓</span>}
              </button>
            );
          })
        )}
      </div>

      {error && <p style={{ fontSize: "12px", color: "#F87171", marginBottom: "12px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button type="button" onClick={handleCreate} disabled={creating}
          style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
          {creating ? "Starting…" : "Start Conversation"}
        </button>
        <button type="button" onClick={onClose} disabled={creating}
          style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function AgentMessagesPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [rows, setRows] = useState<ConversationRowData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [showNew, setShowNew] = useState(false);

  async function loadList(agentId: string) {
    setDataLoading(true);
    const supabase = createClient();

    const { data: ownParticipation } = await supabase
      .from("conversation_participants")
      .select("id, conversation_id, agent_profile_id, joined_at, last_read_at")
      .eq("agent_profile_id", agentId);
    const ownRows = (ownParticipation as Participant[] | null) ?? [];
    const conversationIds = ownRows.map(p => p.conversation_id);

    if (conversationIds.length === 0) { setRows([]); setDataLoading(false); return; }

    const { data: convs } = await supabase
      .from("conversations")
      .select("id, type, name, created_by, created_at, updated_at")
      .in("id", conversationIds);
    const convById = new Map<string, Conversation>();
    (convs as Conversation[] | null ?? []).forEach(c => convById.set(c.id, c));

    // All participants across every conversation this agent is in —
    // needed to find "the other participant" for direct conversations.
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("id, conversation_id, agent_profile_id, joined_at, last_read_at")
      .in("conversation_id", conversationIds);
    const participantsByConv = new Map<string, Participant[]>();
    (allParticipants as Participant[] | null ?? []).forEach(p => {
      const arr = participantsByConv.get(p.conversation_id) ?? [];
      arr.push(p);
      participantsByConv.set(p.conversation_id, arr);
    });

    const otherAgentIds = new Set<string>();
    for (const conv of convById.values()) {
      if (conv.type !== "direct") continue;
      const others = (participantsByConv.get(conv.id) ?? []).filter(p => p.agent_profile_id !== agentId);
      others.forEach(o => otherAgentIds.add(o.agent_profile_id));
    }
    const nameMap = await resolveAgentNames([...otherAgentIds]);

    // Last message per conversation — fetched via a plain query (all
    // messages in these conversations, newest first) and reduced to
    // one-per-conversation client-side, not a stored "last_message"
    // field on conversations (none exists) and not a server-side
    // subquery (no exec_sql / raw-SQL path available in this project,
    // confirmed repeatedly tonight).
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    const lastMsgByConv = new Map<string, Message>();
    (msgs as Message[] | null ?? []).forEach(m => {
      if (!lastMsgByConv.has(m.conversation_id)) lastMsgByConv.set(m.conversation_id, m);
    });

    const ownParticipantByConv = new Map<string, Participant>();
    ownRows.forEach(p => ownParticipantByConv.set(p.conversation_id, p));

    const built: ConversationRowData[] = conversationIds
      .map(id => convById.get(id))
      .filter((c): c is Conversation => !!c)
      .map(conv => {
        const lastMessage = lastMsgByConv.get(conv.id) ?? null;
        const own = ownParticipantByConv.get(conv.id) ?? null;
        const unread = !!lastMessage && (!own?.last_read_at || new Date(own.last_read_at) < new Date(lastMessage.created_at));
        const otherAgent = conv.type === "direct"
          ? (() => {
              const other = (participantsByConv.get(conv.id) ?? []).find(p => p.agent_profile_id !== agentId);
              return other ? nameMap.get(other.agent_profile_id) ?? null : null;
            })()
          : null;
        return { conversation: conv, otherAgent, lastMessage, unread };
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastMessage?.created_at ?? a.conversation.created_at).getTime();
        const bTime = new Date(b.lastMessage?.created_at ?? b.conversation.created_at).getTime();
        return bTime - aTime;
      });

    setRows(built);
    setDataLoading(false);
  }

  async function loadAgentOptions(agentId: string) {
    const supabase = createClient();
    const { data: aps } = await supabase
      .from("agent_profiles")
      .select("id, user_id")
      .eq("status", "approved")
      .neq("id", agentId);
    const apRows = (aps as { id: string; user_id: string }[] | null) ?? [];
    const map = await resolveAgentNames(apRows.map(a => a.id));
    setAgents([...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

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

    if (agentErr) {
      console.error("agent/messages — agent_profiles lookup error:", agentErr);
      setState({ kind: "error", detail: agentErr.message });
      return;
    }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    try {
      await Promise.all([loadList(agentRow.id), loadAgentOptions(agentRow.id)]);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      console.error("agent/messages — load error:", err);
      if (isMissingSchemaError(error)) { setState({ kind: "schema_not_ready", detail: error.message ?? "" }); return; }
      setState({ kind: "error", detail: error.message ?? "Unknown error" });
      return;
    }

    setState({ kind: "ready", agentId: agentRow.id });
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) setState({ kind: "signed_out" });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;

  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconMsg />} title="Please sign in" subtitle="Sign in to your agent account to view messages." />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-12px", paddingBottom: "8px" }}>
            <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none" }}>Sign In →</Link>
          </div>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconMsg />} title="Agent access only" subtitle="This account has no approved agent profile — messaging is only available to approved agents." />
        </Card>
      </Shell>
    );
  }
  if (state.kind === "schema_not_ready") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Messaging schema not yet applied</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "10px" }}>This page depends on migrations <code style={{ color: "#10C4C3" }}>034_agent_messaging.sql</code> and <code style={{ color: "#10C4C3" }}>035_conversation_participants_update_policy.sql</code>.</p>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>Underlying error: {state.detail}</p>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "error") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your messages</h4>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }

  const { agentId } = state;

  return (
    <Shell>
      <div className="msg-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <SectionHeading title="Messages" subtitle="Conversations with other agents." />
        <button
          onClick={() => setShowNew(s => !s)}
          style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "#10C4C3", border: "none", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {showNew ? "Cancel" : "+ New Conversation"}
        </button>
      </div>

      {showNew && (
        <NewConversationForm
          agentId={agentId}
          agents={agents}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void loadList(agentId); }}
        />
      )}

      {dataLoading ? (
        <Card><Spinner /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={<IconMsg />} title="No conversations yet" subtitle="Start a direct message or group conversation with another agent." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map(row => <ConversationRow key={row.conversation.id} row={row} selfId={agentId} />)}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes msg-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .msg-header { flex-direction: column; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
