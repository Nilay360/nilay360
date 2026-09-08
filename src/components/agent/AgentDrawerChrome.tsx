"use client";

// Shared agent-portal drawer chrome (Phase 24) — single source of
// truth for the sidebar/toggle-bar/overlay mechanics built and fixed
// tonight, used by both /dashboard (DashboardClient.tsx, agent
// branch) and src/app/agent/layout.tsx (every other /agent/* page).
// Extracted specifically so the two bugs found and fixed tonight
// can't reappear via copy-drift between two independent
// implementations:
//   1. .dash-aside.agent-drawer needs !important on every property —
//      the <aside> element's own inline style sets position:"sticky",
//      and a plain (non-!important) class rule can never override an
//      inline style regardless of selector specificity. Without
//      !important, position silently stays "sticky" forever and this
//      never becomes a real off-canvas overlay (confirmed via an
//      isolated CSS reproduction during debugging).
//   2. The toggle bar's z-index (410) must be HIGHER than the open
//      drawer's z-index (400) — found via testing that with the
//      drawer above the toggle bar, a second click on "Menu" hit the
//      open drawer's own background instead of the button underneath
//      it, since both occupy the same top-left screen region.
//
// Generic over TId (the id-based item type, e.g. DashboardClient's
// own Tab union) so id-based (internal tab-switch) and href-based
// (real route link) nav items can be mixed in one list, matching what
// /dashboard's own nav already needs — layout.tsx's nav is all-href,
// so it just uses the default `string` and never sets activeId/
// onActivate at all.

import { useEffect, useState } from "react";
import Link from "next/link";

export interface AgentDrawerNavItem<TId extends string = string> {
  id?: TId;
  href?: string;
  label: string;
  icon: React.ReactNode;
}

interface AgentDrawerChromeProps<TId extends string = string> {
  nav: AgentDrawerNavItem<TId>[];
  /** Highlights the row whose `id` matches — for callers with real tab state (DashboardClient). */
  activeId?: TId;
  /** Highlights the row whose `href` matches — for callers with no tab state, just routes (the /agent/* layout). */
  activeHref?: string;
  /** Required when `nav` contains any id-based items; ignored otherwise. */
  onActivate?: (id: TId) => void;
  userName: string;
  userEmail: string;
  /** Badge text next to the user's name — e.g. "Agent". */
  userType: string;
  onSignOut: () => void;
  /** Forces a remount + fade-in of the content area on change — pass
   *  the active tab id for callers with tab state (DashboardClient);
   *  omit for route-based callers (the /agent/* layout), where actual
   *  navigation already handles this. */
  contentKey?: string;
  children: React.ReactNode;
}

function initials(email: string, name?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function IconMenu() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
}
function IconOut() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

export default function AgentDrawerChrome<TId extends string = string>({
  nav, activeId, activeHref, onActivate, userName, userEmail, userType, onSignOut, contentKey, children,
}: AgentDrawerChromeProps<TId>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Escape closes the drawer whenever it's open.
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <>
      <style>{`
        @keyframes agent-drawer-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .dash-sb-btn:hover { color: rgba(255,255,255,0.9) !important; }
        /* !important throughout — see file header, point 1. */
        .dash-aside.agent-drawer {
          position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important;
          z-index: 400 !important; height: 100dvh !important;
          transform: translateX(-100%) !important;
          transition: transform 0.27s cubic-bezier(.4,0,.2,1) !important;
        }
        .dash-aside.agent-drawer.sb-open { transform: translateX(0) !important; }
        @media (max-width: 800px) {
          .dash-content { padding: 24px 18px 72px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100dvh", background: "#020C1C", display: "flex", flexDirection: "column", fontFamily: "var(--font-body-new)" }}>
        {/* Toggle bar — z-index 410, deliberately higher than the
            drawer's 400. See file header, point 2. */}
        <div style={{ display: "flex", position: "sticky", top: "64px", zIndex: 410, padding: "10px 16px", background: "#020C1C", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(16,196,195,0.1)", flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle menu"
            style={{ display: "flex", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "7px", cursor: "pointer", color: "#fff" }}
          >
            <IconMenu />
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Menu</span>
        </div>

        <div style={{ display: "flex", flex: 1, paddingTop: "64px" }}>
          {/* Sidebar */}
          <aside
            className={`dash-aside agent-drawer${sidebarOpen ? " sb-open" : ""}`}
            style={{ width: "260px", flexShrink: 0, background: "#0A1526", borderRight: "1px solid rgba(255,255,255,0.07)", height: "calc(100vh - 64px)", position: "sticky", top: "64px", display: "flex", flexDirection: "column", overflowY: "auto" }}
          >
            {/* User card */}
            <div style={{ padding: "26px 18px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(16,196,195,0.16)", border: "2px solid rgba(16,196,195,0.32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#10C4C3", letterSpacing: "0.06em", marginBottom: "12px" }}>
                {initials(userEmail, userName)}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginBottom: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", background: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.30)" }}>
                {userType}
              </span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              {nav.map((item, i) => {
                const isActive = (activeId !== undefined && item.id === activeId) || (activeHref !== undefined && item.href === activeHref);
                const navItemStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: isActive ? "rgba(16,196,195,0.11)" : "transparent", border: isActive ? "1px solid rgba(16,196,195,0.18)" : "1px solid transparent", color: isActive ? "#10C4C3" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: isActive ? 600 : 400, fontFamily: "var(--font-body-new)", textAlign: "left", transition: "all 0.14s" };

                if (item.href) {
                  return (
                    <Link
                      key={`${item.href}-${i}`}
                      href={item.href}
                      className="dash-sb-btn"
                      onClick={() => setSidebarOpen(false)}
                      style={{ ...navItemStyle, textDecoration: "none", cursor: "pointer" }}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    data-tab={item.id}
                    className="dash-sb-btn"
                    onClick={() => { onActivate?.(item.id as TId); setSidebarOpen(false); }}
                    style={{ ...navItemStyle, cursor: "pointer" }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Sign out */}
            <div style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={onSignOut}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(239,68,68,0.14)", color: "rgba(252,165,165,0.75)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left", transition: "all 0.14s" }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(239,68,68,0.14)"; b.style.color = "#FCA5A5"; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(248,113,113,0.12)"; b.style.color = "rgba(252,165,165,0.75)"; }}
              >
                <IconOut /> Sign Out
              </button>
            </div>
          </aside>

          {/* Overlay */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 390, backdropFilter: "blur(2px)" }} />
          )}

          {/* Content */}
          <main key={contentKey} className="dash-content" style={{ flex: 1, minWidth: 0, padding: "36px 40px 80px", animation: "agent-drawer-fade 0.22s ease-out" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
