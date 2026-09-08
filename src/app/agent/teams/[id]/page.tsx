"use client";

// Agent teams (Phase 20) — detail + dashboard view. Schema/RLS (044,
// 045) are already live — this page only reads/writes teams/
// team_members, no schema/RLS changes here.
//
// Structure mirrors deals/[id] and tasks/[id]: shared building blocks
// (Card, TeamRow) imported from the sibling list page (../page). No
// client-side "is this mine" gate on load — teams' own SELECT policy
// (member, lead, or admin) already determines whether the row comes
// back at all; if it doesn't, that's not_found.
//
// Team Dashboard stats reuse the exact query shape
// src/app/dashboard/DashboardClient.tsx's useAgentOverviewStats
// already uses for openLeads/activeDeals/upcomingVisits (same
// not-in-terminal-status filters, same today-boundary for site
// visits) — the only change is `.eq("assigned_to", one_id)` becoming
// `.in("assigned_to", every_current_member_id)`. This only returns
// real cross-member data because 045 granted teammates SELECT
// visibility into each other's deals/inquiries/site_visits — without
// 045 live, these three queries would silently return 0 for anyone
// else's rows despite the .in() filter naming their ids, since RLS
// would filter them back out. Not assumed correct — see the
// completion notes for how this was actually exercised.
// Add/remove-member and picker mechanics mirror the deal detail
// page's Co-Agents card exactly (search input, <select>, resolveAgentNames).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveAgentNames, type AgentOption } from "../../messages/page";
import { Card, type TeamRow } from "../page";

interface MemberRow {
  id: string;
  agent_profile_id: string;
  created_at: string;
}

interface TeamStats {
  openLeads: number;
  activeDeals: number;
  upcomingVisits: number;
}

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
      team: TeamRow;
      members: MemberRow[];
      nameMap: Map<string, AgentOption>;
      stats: TeamStats | null;
      statsLoading: boolean;
    };

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "team-detail-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function IconInbox() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconBriefcase() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
}
function IconPin() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function IconLead() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.8 5.7 21l2.3-7.2L2 9.2h7.6L12 2z"/></svg>;
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "22px 24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: "18px", flex: "1 1 155px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#A9B4C2" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "28px", fontWeight: 600, lineHeight: 1.1, background: "linear-gradient(135deg, #FFFFFF 0%, #10C4C3 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#FFFFFF" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{label}</div>
      </div>
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

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

export default function AgentTeamDetailPage() {
  const params = useParams();
  const teamId = (params?.id as string) ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<SaveMessage>(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [candidates, setCandidates] = useState<AgentOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | "">("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<SaveMessage>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadStats = useCallback(async (memberIds: string[]) => {
    const supabase = createClient();
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    // Same shape as DashboardClient's useAgentOverviewStats, .eq
    // replaced with .in across every current team member.
    const [leadsRes, dealsRes, visitsRes] = await Promise.all([
      supabase.from("inquiries").select("id", { count: "exact", head: true })
        .in("assigned_to", memberIds).not("status", "in", "(closed,lost,spam)"),
      supabase.from("deals").select("id", { count: "exact", head: true })
        .in("assigned_to", memberIds).not("stage", "in", "(closed,lost)"),
      supabase.from("site_visits").select("id", { count: "exact", head: true })
        .in("assigned_to", memberIds).gte("visit_date", todayStr),
    ]);
    if (leadsRes.error) console.error("Team dashboard — open leads count error:", leadsRes.error);
    if (dealsRes.error) console.error("Team dashboard — active deals count error:", dealsRes.error);
    if (visitsRes.error) console.error("Team dashboard — upcoming visits count error:", visitsRes.error);
    return { openLeads: leadsRes.count ?? 0, activeDeals: dealsRes.count ?? 0, upcomingVisits: visitsRes.count ?? 0 };
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: team, error: teamErr } = await supabase
      .from("teams").select("id, name, lead_agent_id, created_at").eq("id", teamId).maybeSingle();
    if (teamErr) { setState({ kind: "error", detail: teamErr.message }); return; }
    if (!team) { setState({ kind: "not_found" }); return; }

    const { data: memberRows, error: membersErr } = await supabase
      .from("team_members").select("id, agent_profile_id, created_at").eq("team_id", teamId).order("created_at", { ascending: true });
    if (membersErr) { setState({ kind: "error", detail: membersErr.message }); return; }
    const members = (memberRows as MemberRow[] | null) ?? [];

    const nameMap = await resolveAgentNames(members.map(m => m.agent_profile_id));

    setNameInput((team as TeamRow).name);
    setState({ kind: "ready", agentId: agentRow.id, team: team as TeamRow, members, nameMap, stats: null, statsLoading: true });

    const stats = await loadStats(members.map(m => m.agent_profile_id));
    setState(prev => prev.kind !== "ready" ? prev : { ...prev, stats, statsLoading: false });
  }, [teamId, loadStats]);

  useEffect(() => { load(); }, [load]);

  function startEditingName() {
    if (state.kind !== "ready") return;
    setNameInput(state.team.name);
    setNameMessage(null);
    setEditingName(true);
  }
  function cancelEditingName() {
    if (state.kind !== "ready") return;
    setNameInput(state.team.name);
    setNameMessage(null);
    setEditingName(false);
  }
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    if (!nameInput.trim()) { setNameMessage({ type: "error", text: "Team name is required." }); return; }
    setSavingName(true);
    setNameMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .update({ name: nameInput.trim(), updated_at: new Date().toISOString() })
      .eq("id", state.team.id);
    setSavingName(false);
    if (error) {
      console.error("Team rename error:", error);
      setNameMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    setState({ ...state, team: { ...state.team, name: nameInput.trim() } });
    setEditingName(false);
    setNameMessage({ type: "success", text: "Saved" });
    setTimeout(() => setNameMessage(null), 2500);
  }

  async function openAddMember() {
    if (state.kind !== "ready") return;
    setShowAddMember(true);
    setMemberMessage(null);
    const supabase = createClient();
    const existingIds = new Set(state.members.map(m => m.agent_profile_id));
    const { data: aps } = await supabase.from("agent_profiles").select("id, user_id").eq("status", "approved");
    const apRows = (aps as { id: string; user_id: string }[] | null ?? []).filter(a => !existingIds.has(a.id));
    const map = await resolveAgentNames(apRows.map(a => a.id));
    setCandidates([...map.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function handleAddMember() {
    if (state.kind !== "ready") return;
    if (!selected) { setMemberMessage({ type: "error", text: "Pick an agent to add." }); return; }
    setAddingMember(true);
    setMemberMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("team_members")
      .insert({ team_id: state.team.id, agent_profile_id: selected })
      .select("id, agent_profile_id, created_at")
      .single();
    setAddingMember(false);
    if (error) {
      console.error("Add team member error:", error);
      setMemberMessage({ type: "error", text: "Could not add member: " + error.message });
      return;
    }
    const row = data as MemberRow;
    const newMembers = [...state.members, row];
    const nameForRow = await resolveAgentNames([row.agent_profile_id]);
    const nextNameMap = new Map([...state.nameMap, ...nameForRow]);
    setState({ ...state, members: newMembers, nameMap: nextNameMap });
    setShowAddMember(false);
    setSelected("");
    setSearch("");
    setMemberMessage({ type: "success", text: "Member added" });
    setTimeout(() => setMemberMessage(null), 2500);
    // Team dashboard stats now cover one more member — refetch.
    const stats = await loadStats(newMembers.map(m => m.agent_profile_id));
    setState(prev => prev.kind !== "ready" ? prev : { ...prev, stats });
  }

  async function handleRemoveMember(member: MemberRow) {
    if (state.kind !== "ready") return;
    const name = state.nameMap.get(member.agent_profile_id)?.full_name ?? "this member";
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    setRemovingId(member.id);
    const supabase = createClient();
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);
    setRemovingId(null);
    if (error) {
      console.error("Remove team member error:", error);
      setMemberMessage({ type: "error", text: "Could not remove member: " + error.message });
      return;
    }
    const newMembers = state.members.filter(m => m.id !== member.id);
    setState({ ...state, members: newMembers });
    const stats = await loadStats(newMembers.map(m => m.agent_profile_id));
    setState(prev => prev.kind !== "ready" ? prev : { ...prev, stats });
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view this team.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile.</p></Card></Shell>;
  }
  if (state.kind === "not_found") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Team not found.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "40px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686", marginTop: "8px" }}>{state.detail}</p></Card></Shell>;
  }

  const { team, members, nameMap, stats, statsLoading, agentId } = state;
  const isLead = team.lead_agent_id === agentId;

  return (
    <Shell>
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: editingName ? "16px" : 0 }}>
          {!editingName ? (
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 700, color: "#FFFFFF" }}>{team.name}</h1>
          ) : (
            <span style={{ fontSize: "12px", color: "#A9B4C2" }}>Renaming team…</span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={nameMessage} />
            {isLead && !editingName && (
              <button onClick={startEditingName}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                Rename
              </button>
            )}
          </div>
        </div>
        {editingName && (
          <form onSubmit={handleSaveName}>
            <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ ...inputStyle, fontSize: "16px", padding: "10px 14px", marginBottom: "12px" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={savingName}
                style={{ padding: "9px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: savingName ? "default" : "pointer", opacity: savingName ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {savingName ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={cancelEditingName} disabled={savingName}
                style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: savingName ? "default" : "pointer", opacity: savingName ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Team Dashboard — aggregate stats across every current member,
          via .in("assigned_to", memberIds). Only returns real
          cross-member data because 045 granted teammates SELECT
          visibility into each other's deals/inquiries/site_visits. */}
      <Card style={{ padding: "24px", marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Team Dashboard</h3>
        {statsLoading ? (
          <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
        ) : (
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <StatTile label="Open Leads" value={stats?.openLeads ?? "—"} icon={<IconInbox />} />
            <StatTile label="Active Deals" value={stats?.activeDeals ?? "—"} icon={<IconBriefcase />} />
            <StatTile label="Upcoming Site Visits" value={stats?.upcomingVisits ?? "—"} icon={<IconPin />} />
          </div>
        )}
      </Card>

      <Card style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF" }}>Members ({members.length})</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SaveConfirmation message={memberMessage} />
            {isLead && !showAddMember && (
              <button onClick={openAddMember}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                + Add Member
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: showAddMember ? "16px" : 0 }}>
          {members.map(member => {
            const isMemberLead = member.agent_profile_id === team.lead_agent_id;
            return (
              <div key={member.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#FFFFFF" }}>
                    {member.agent_profile_id === agentId ? "You" : (nameMap.get(member.agent_profile_id)?.full_name ?? "Unnamed agent")}
                  </span>
                  {isMemberLead && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.30)" }}>
                      <IconLead />Lead
                    </span>
                  )}
                </div>
                {/* The lead's own row can't be removed via this UI — no
                    lead-transfer flow exists yet, per spec. */}
                {isLead && !isMemberLead && (
                  <button
                    onClick={() => handleRemoveMember(member)}
                    disabled={removingId === member.id}
                    style={{ padding: "6px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", color: "#F87171", fontSize: "12px", fontWeight: 600, cursor: removingId === member.id ? "default" : "pointer", opacity: removingId === member.id ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
                  >
                    {removingId === member.id ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {showAddMember && (
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
              {candidates
                .filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()))
                .map(a => <option key={a.agent_profile_id} value={a.agent_profile_id}>{a.full_name}</option>)}
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddMember} disabled={addingMember}
                style={{ padding: "8px 18px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: addingMember ? "default" : "pointer", opacity: addingMember ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {addingMember ? "Adding…" : "Add"}
              </button>
              <button onClick={() => { setShowAddMember(false); setSelected(""); setSearch(""); setMemberMessage(null); }} disabled={addingMember}
                style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: addingMember ? "default" : "pointer", opacity: addingMember ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes team-detail-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/agent/teams" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← All Teams</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
