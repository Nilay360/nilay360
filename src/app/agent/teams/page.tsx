"use client";

// Agent teams (Phase 20) — list view. Schema, RLS (044/045) are
// already live — this page only reads/writes teams/team_members, no
// schema/RLS changes here.
//
// Structure, identity-lookup pattern, and shared building blocks
// mirror src/app/agent/deals/page.tsx exactly. No PostgREST embeds —
// team_members -> teams -> agent_profiles -> profiles (via
// resolveAgentNames) is three separate queries joined client-side via
// Maps, same "fetch then map" convention as every list page tonight.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resolveAgentNames, type AgentOption } from "../messages/page";

export interface TeamRow {
  id: string;
  name: string;
  lead_agent_id: string;
  created_at: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "error"; detail: string }
  | {
      kind: "ready";
      agentId: string;
      teams: TeamRow[];
      memberCounts: Map<string, number>;
      nameMap: Map<string, AgentOption>;
    };

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "teams-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function IconTeam() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconLead() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.8 5.7 21l2.3-7.2L2 9.2h7.6L12 2z"/></svg>;
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

export default function AgentTeamsPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    const { data: myMemberships, error: memErr } = await supabase
      .from("team_members").select("team_id").eq("agent_profile_id", agentRow.id);
    if (memErr) { setState({ kind: "error", detail: memErr.message }); return; }
    const teamIds = [...new Set((myMemberships as { team_id: string }[] | null ?? []).map(m => m.team_id))];

    let teams: TeamRow[] = [];
    if (teamIds.length > 0) {
      const { data: teamRows, error: teamsErr } = await supabase
        .from("teams").select("id, name, lead_agent_id, created_at").in("id", teamIds).order("created_at", { ascending: false });
      if (teamsErr) { setState({ kind: "error", detail: teamsErr.message }); return; }
      teams = (teamRows as TeamRow[] | null) ?? [];
    }

    // Member counts — one query for every member row across all of the
    // viewer's teams, counted client-side per team_id. There's no
    // lightweight "count grouped by team_id" via PostgREST without a
    // separate query per team, so this fetches all rows once and
    // reduces, same "fetch then map" spirit as everywhere else.
    const memberCounts = new Map<string, number>();
    if (teamIds.length > 0) {
      const { data: allMembers } = await supabase
        .from("team_members").select("team_id").in("team_id", teamIds);
      (allMembers as { team_id: string }[] | null ?? []).forEach(m => {
        memberCounts.set(m.team_id, (memberCounts.get(m.team_id) ?? 0) + 1);
      });
    }

    const nameMap = await resolveAgentNames([...new Set(teams.map(t => t.lead_agent_id))]);

    setState({ kind: "ready", agentId: agentRow.id, teams, memberCounts, nameMap });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "ready") return;
    if (!newName.trim()) { setCreateError("Team name is required."); return; }
    setCreating(true);
    setCreateError(null);
    const supabase = createClient();

    // Order matters — the teams row must exist before the first
    // team_members insert, since team_members' INSERT policy calls
    // is_team_lead(team_id, ...), which reads teams by id. Not a
    // client-side workaround for an RLS gap — 044's header confirms
    // is_team_lead is SECURITY DEFINER precisely so this ordinary
    // "create the parent row, then the membership row" sequence just
    // works, but the ORDER of the two statements still has to be
    // this way round; a combined/parallel insert could race.
    const { data: newTeam, error: teamErr } = await supabase
      .from("teams")
      .insert({ name: newName.trim(), lead_agent_id: state.agentId, created_by: state.agentId })
      .select("id, name, lead_agent_id, created_at")
      .single();
    if (teamErr) {
      console.error("Create team error:", teamErr);
      setCreating(false);
      setCreateError("Could not create team: " + teamErr.message);
      return;
    }

    const { error: memberErr } = await supabase
      .from("team_members")
      .insert({ team_id: newTeam.id, agent_profile_id: state.agentId });
    setCreating(false);
    if (memberErr) {
      console.error("Seat team creator error:", memberErr);
      // The team row exists even though seating its first member
      // failed — surfaced as an error rather than silently dropped,
      // but not rolled back client-side (no multi-statement
      // transaction available from here). The team is still visible
      // to the lead via teams' own SELECT policy (is_team_lead), so
      // it's reachable to retry adding the membership row later.
      setCreateError("Team created, but could not seat you as a member: " + memberErr.message);
      return;
    }

    setShowCreate(false);
    setNewName("");
    setState({
      ...state,
      teams: [newTeam as TeamRow, ...state.teams],
      memberCounts: new Map(state.memberCounts).set(newTeam.id, 1),
    });
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px" }}>
          <EmptyState icon={<IconTeam />} title="Please sign in" subtitle="Sign in to your agent account to view your teams." />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "-12px", paddingBottom: "8px" }}>
            <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none" }}>Sign In →</Link>
          </div>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px" }}><EmptyState icon={<IconTeam />} title="Agent access only" subtitle="This account has no approved agent profile — teams are only available to approved agents." /></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong loading your teams</h4><p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p></Card></Shell>;
  }

  const { agentId, teams, memberCounts, nameMap } = state;

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Teams ({teams.length})</h1>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>Teams you belong to, as lead or member.</p>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "#10C4C3", border: "none", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {showCreate ? "Cancel" : "+ Create Team"}
        </button>
      </div>

      {showCreate && (
        <Card style={{ padding: "24px", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Create Team</h3>
          <form onSubmit={handleCreateTeam}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Team Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. South Mumbai Sales" style={inputStyle} />
            </div>
            {createError && <p style={{ fontSize: "12px", color: "#F87171", marginBottom: "12px" }}>{createError}</p>}
            <button type="submit" disabled={creating}
              style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.04em", cursor: creating ? "default" : "pointer", opacity: creating ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
              {creating ? "Creating…" : "Create Team"}
            </button>
          </form>
        </Card>
      )}

      {teams.length === 0 ? (
        <Card>
          <EmptyState icon={<IconTeam />} title="No teams yet" subtitle="Create a team, or wait to be added to one by its lead." />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {teams.map(team => {
            const isLead = team.lead_agent_id === agentId;
            const leadName = isLead ? "You" : (nameMap.get(team.lead_agent_id)?.full_name ?? "Unknown agent");
            const count = memberCounts.get(team.id) ?? 0;
            return (
              <Link key={team.id} href={`/agent/teams/${team.id}`} style={{ textDecoration: "none" }}>
                <Card style={{ padding: "20px 24px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>{team.name}</span>
                        {isLead && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.30)" }}>
                            <IconLead />Lead
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "6px" }}>
                        Lead: {leadName} · {count} member{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes teams-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "80px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
