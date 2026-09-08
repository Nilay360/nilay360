"use client";

// Shared chrome for every /agent/* page (Phase 24) — wraps leads,
// site-visits, deals, calendar, messages, tasks, teams, analytics,
// and any future page added under this route, with the same drawer
// AgentDrawerChrome already provides to /dashboard's agent branch.
//
// /dashboard is NOT under /agent/* (it's a sibling top-level route,
// src/app/dashboard/) — confirmed by checking the actual folder
// structure before assuming, per instruction. This layout therefore
// has no effect on /dashboard at all; DashboardClient.tsx keeps its
// own use of AgentDrawerChrome independently (see that file).
//
// This layout does its own lightweight identity check (the same
// session -> agent_profiles(status='approved') pattern every /agent/*
// page already repeats independently) to decide whether to render the
// chrome at all — nothing upstream (no middleware/proxy.ts entry for
// /agent/*, confirmed by inspection) already gates this route, and
// this layout doesn't change that: while checking, or if the visitor
// turns out not to be a confirmed agent, it renders `children` only,
// with no chrome at all — the individual page's own existing signed-
// out/not-an-agent message still shows, just without a stray agent
// drawer wrapped around it. This layout only ever decides whether to
// ADD chrome, never whether the page itself may render — that
// decision stays exactly where it already lived, in each page's own
// component.
//
// Nav: all entries are plain route links (href), not internal tabs —
// there's no tab state outside /dashboard itself for an id-based item
// to switch. Per explicit instruction, "Overview" / "View Assigned
// Listings" / "Edit Profile" / "Settings" are kept as four separate
// rows even though all four currently point at the same /dashboard
// URL (leaving room for future deep-linking into specific dashboard
// tabs), rather than collapsed into one row.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AgentDrawerChrome, { type AgentDrawerNavItem } from "@/components/agent/AgentDrawerChrome";

// Icons — same shapes already used elsewhere in this codebase for
// these exact features (DashboardClient.tsx's own NAV_AGENT icons),
// duplicated locally per this codebase's per-file icon convention
// rather than pulled from a shared icons module that doesn't exist.
function IconHome()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconMsg()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconPin()       { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconTrend()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function IconCal()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconChecklist() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>; }
function IconTeam()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChart()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>; }
function IconAward()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/></svg>; }
function IconBriefcase() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function IconUser()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconGear()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

const NAV: AgentDrawerNavItem[] = [
  { href: "/dashboard",         label: "Overview",               icon: <IconHome /> },
  { href: "/agent/leads",       label: "My Leads",               icon: <IconMsg /> },
  { href: "/agent/site-visits", label: "Site Visits",            icon: <IconPin /> },
  { href: "/agent/deals",       label: "Deals",                  icon: <IconTrend /> },
  { href: "/agent/calendar",    label: "Calendar",               icon: <IconCal /> },
  { href: "/agent/messages",    label: "Messages",               icon: <IconMsg /> },
  { href: "/agent/tasks",       label: "Tasks",                  icon: <IconChecklist /> },
  { href: "/agent/teams",       label: "Teams",                  icon: <IconTeam /> },
  { href: "/agent/analytics",   label: "Analytics",              icon: <IconChart /> },
  { href: "/agent/leaderboard", label: "Leaderboard",            icon: <IconAward /> },
  { href: "/dashboard",         label: "View Assigned Listings",  icon: <IconBriefcase /> },
  { href: "/dashboard",         label: "Edit Profile",            icon: <IconUser /> },
  { href: "/dashboard",         label: "Settings",                icon: <IconGear /> },
];

type CheckState =
  | { kind: "checking" }
  | { kind: "not_agent" }
  | { kind: "ready"; name: string; email: string };

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<CheckState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!uid) { if (!cancelled) setState({ kind: "not_agent" }); return; }

      const { data: agentRow } = await supabase
        .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
      if (!agentRow) { if (!cancelled) setState({ kind: "not_agent" }); return; }

      const { data: profileRow } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      if (cancelled) return;
      setState({
        kind: "ready",
        name: profileRow?.full_name || session.user.email?.split("@")[0] || "Agent",
        email: session.user.email ?? "",
      });
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (state.kind !== "ready") {
    return <>{children}</>;
  }

  return (
    <AgentDrawerChrome
      nav={NAV}
      activeHref={pathname}
      userName={state.name}
      userEmail={state.email}
      userType="Agent"
      onSignOut={handleSignOut}
    >
      {children}
    </AgentDrawerChrome>
  );
}
