"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { createClient } from "@/lib/supabase/client"
import { NOTIFICATION_SELECT, relativeTime, getUnreadNotificationCount, type NotificationRow } from "@/lib/notifications"

// Notification bell for the main navbar (Phase 12). In-app only — no
// email, no WhatsApp, per explicit scope decision.
//
// Dropdown mechanics deliberately mirror UserDropdown in Navbar.tsx
// rather than inventing new ones: createPortal + position:fixed anchored
// off the wrapper's getBoundingClientRect(), same ddFadeIn animation,
// same mousedown click-outside pattern.
//
// z-index: 10000. The navbar's own dropdowns are 999 (mega-menu) and
// 9999 (UserDropdown), with the header itself at 1000 — checked directly
// in Navbar.tsx rather than assumed. Sitting one above UserDropdown is
// what fixes the overlap bug the sidebar version had. The mobile menu
// (99999) still wins, which is correct — this bell is desktop-only, and
// a full-screen mobile menu should cover it.
const BELL_DROPDOWN_Z = 10000

// Per-type row icon — shapes reused verbatim from the agent portal nav
// (src/app/agent/layout.tsx's NAV icons) so each notification type
// reads as the same icon its own section already uses elsewhere:
// message = IconMsg (Messages nav), deal_collaborator = IconTrend
// (Deals nav), task = IconChecklist (Tasks nav), calendar_reminder =
// IconCal (Calendar nav). lead_follow_up has no existing nav icon of
// its own (the Leads nav icon is IconMsg, already claimed by
// "message" — reusing it here would make the two types
// indistinguishable at a glance), so it borrows the clock/pending
// shape used elsewhere in this codebase (e.g. admin's IconClock,
// tasks'/deals' IconClock) since "Follow-up due" is inherently a
// time-based concept — a judgment call, not an existing 1:1 mapping.
// Unknown/future type values (type is plain text, no DB constraint,
// per 042) fall back to the generic bell shape already used for the
// bell button itself.
function NotificationTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "message":
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case "deal_collaborator":
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case "task":
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>
    case "calendar_reminder":
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    case "lead_follow_up":
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    default:
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  }
}

// Reads/writes only the signed-in user's own rows, which the live
// `notif_own` RLS policy (`FOR ALL USING (user_id = auth.uid())`,
// 001_nivila_schema.sql) already permits — no schema or policy change.
export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pos, setPos] = useState({ top: 0, right: 0 })

  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const refreshUnreadCount = async () => {
    const count = await getUnreadNotificationCount(userId)
    setUnreadCount(count)
  }

  // Recent slice only — the full history lives on /notifications. The
  // badge count is fetched separately as a real `count: "exact"` query
  // (see getUnreadNotificationCount) rather than derived from this
  // 8-item slice, which would undercount anyone with 9+ unread.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8)
      if (cancelled) return
      if (error) console.error("NotificationBell — query error:", error)
      setNotifications((data as NotificationRow[] | null) ?? [])
      setLoaded(true)
    })()
    void refreshUnreadCount()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Anchor the portal to the trigger, same as UserDropdown.
  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, status: "read" } : n)))
    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ status: "read" }).eq("id", id)
    if (error) console.error("NotificationBell — mark read error:", error)
    else void refreshUnreadCount()
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => n.status === "unread").map(n => n.id)
    if (unreadIds.length === 0) return
    setNotifications(prev => prev.map(n => (n.status === "unread" ? { ...n, status: "read" } : n)))
    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ status: "read" }).in("id", unreadIds)
    if (error) console.error("NotificationBell — mark all read error:", error)
    else void refreshUnreadCount()
  }

  function handleClick(n: NotificationRow) {
    if (n.status === "unread") void markRead(n.id)
    setOpen(false)
    if (n.action_url) router.push(n.action_url)
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36,
          background: open ? "rgba(16,196,195,0.1)" : "transparent",
          border: `1px solid ${open ? "rgba(16,196,195,0.5)" : "rgba(16,196,195,0.25)"}`,
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = "rgba(16,196,195,0.5)" }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = "rgba(16,196,195,0.25)" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={unreadCount > 0 ? "#10C4C3" : "rgba(255,255,255,0.75)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 17, height: 17, padding: "0 4px",
            borderRadius: 100,
            background: "#F87171", color: "#FFFFFF",
            fontSize: 10, fontWeight: 700,
            fontFamily: "var(--font-support-new)",
            border: "1.5px solid #020C1C",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed", right: pos.right, top: pos.top,
            width: 380,
            maxHeight: 460,
            display: "flex", flexDirection: "column",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            overflow: "hidden",
            zIndex: BELL_DROPDOWN_Z,
            animation: "ddFadeIn 0.15s ease",
            fontFamily: "var(--font-body-new)",
          }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 16px",
            background: "transparent",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: "none", border: "none", color: "#10C4C3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {!loaded ? (
              <p style={{ padding: "28px 20px", fontSize: 12, color: "#A9B4C2", textAlign: "center" }}>Loading…</p>
            ) : notifications.length === 0 ? (
              <p style={{ padding: "28px 20px", fontSize: 12, color: "#6B7686", textAlign: "center" }}>No notifications yet.</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "13px 16px",
                    background: n.status === "unread" ? "rgba(16,196,195,0.06)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: n.status === "unread" ? "3px solid #10C4C3" : "3px solid transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-body-new)",
                    transition: "background 0.14s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.status === "unread" ? "rgba(16,196,195,0.06)" : "transparent" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ display: "flex", flexShrink: 0, color: "#10C4C3" }}><NotificationTypeIcon type={n.type} /></span>
                    <span style={{ fontSize: 12.5, fontWeight: n.status === "unread" ? 700 : 500, color: "#FFFFFF" }}>
                      {n.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#A9B4C2", lineHeight: 1.5, marginBottom: 4 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7686" }}>{relativeTime(n.created_at)}</div>
                </button>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            style={{
              display: "block", padding: "12px 16px", textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "#10C4C3", fontSize: 12, fontWeight: 600,
              textDecoration: "none", flexShrink: 0,
            }}
          >
            See all notifications →
          </Link>
        </div>,
        document.body
      )}
    </div>
  )
}
