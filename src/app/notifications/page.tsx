"use client";

// Full notifications history (Phase 12). In-app only — no email, no
// WhatsApp, per explicit scope decision.
//
// Shell/Card/EmptyState/Spinner visual language matches the agent pages
// (leads/site-visits/deals), and the query uses the same shared
// NOTIFICATION_SELECT + relativeTime helpers as the navbar bell so the
// two surfaces can't drift apart. Reads/writes only the signed-in user's
// own rows — the live `notif_own` RLS policy already permits both, no
// schema or policy change.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_SELECT, relativeTime, type NotificationRow } from "@/lib/notifications";

const PAGE_SIZE = 25;

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; userId: string };

type Filter = "all" | "unread";

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "notif-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function IconBell() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}

// Per-type row icon — same shapes/reasoning as NotificationBell.tsx's
// NotificationTypeIcon (duplicated locally per this codebase's
// per-file icon convention rather than a shared module). Reuses the
// existing IconBell shape above as the fallback for unknown/future
// type values (type is plain text, no DB constraint, per 042).
function NotificationTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "message":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "deal_collaborator":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case "task":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>;
    case "calendar_reminder":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "lead_follow_up":
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    default:
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Resolve session first — this page is not agent-gated (any signed-in
  // user can view their own notifications; today only agents receive
  // any, but gating on role here would be a lie about who owns the data).
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = session?.user?.id ?? null;
      if (!uid) { setState({ kind: "signed_out" }); return; }
      setState({ kind: "ready", userId: uid });
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) setState({ kind: "signed_out" });
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const fetchPage = useCallback(async (userId: string, currentFilter: Filter, offset: number) => {
    const supabase = createClient();
    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      // Fetch one extra to detect whether another page exists, rather
      // than issuing a separate count query.
      .range(offset, offset + PAGE_SIZE);
    if (currentFilter === "unread") query = query.eq("status", "unread");
    return query;
  }, []);

  // Initial load + refetch whenever the filter changes.
  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    (async () => {
      setListLoading(true);
      const { data, error } = await fetchPage(state.userId, filter, 0);
      if (cancelled) return;
      if (error) {
        console.error("Notifications — query error:", error);
        setListLoading(false);
        return;
      }
      const rows = (data as NotificationRow[] | null) ?? [];
      setHasMore(rows.length > PAGE_SIZE);
      setNotifications(rows.slice(0, PAGE_SIZE));
      setListLoading(false);
    })();
    return () => { cancelled = true; };
  }, [state, filter, fetchPage]);

  async function loadMore() {
    if (state.kind !== "ready" || loadingMore) return;
    setLoadingMore(true);
    const { data, error } = await fetchPage(state.userId, filter, notifications.length);
    setLoadingMore(false);
    if (error) {
      console.error("Notifications — load more error:", error);
      return;
    }
    const rows = (data as NotificationRow[] | null) ?? [];
    setHasMore(rows.length > PAGE_SIZE);
    setNotifications(prev => [...prev, ...rows.slice(0, PAGE_SIZE)]);
  }

  async function markRead(id: string) {
    setNotifications(prev =>
      filter === "unread"
        // In the unread-only view, marking read removes it from the list —
        // leaving it visible would contradict the active filter.
        ? prev.filter(n => n.id !== id)
        : prev.map(n => (n.id === id ? { ...n, status: "read" } : n))
    );
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ status: "read" }).eq("id", id);
    if (error) console.error("Notifications — mark read error:", error);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => n.status === "unread").map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev =>
      filter === "unread" ? [] : prev.map(n => (n.status === "unread" ? { ...n, status: "read" } : n))
    );
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ status: "read" }).in("id", unreadIds);
    if (error) console.error("Notifications — mark all read error:", error);
  }

  function handleClick(n: NotificationRow) {
    if (n.status === "unread") void markRead(n.id);
    if (n.action_url) router.push(n.action_url);
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;

  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Please sign in to view your notifications.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "error") {
    return (
      <Shell>
        <Card style={{ padding: "32px 28px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", color: "#FFFFFF", marginBottom: "10px" }}>Something went wrong</h4>
          <p style={{ fontSize: "11px", color: "#6B7686" }}>{state.detail}</p>
        </Card>
      </Shell>
    );
  }

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <Shell>
      <div className="notif-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Notifications</h1>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>
            {filter === "unread" ? "Showing unread only." : "All your notifications, newest first."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ padding: "10px 20px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["all", "unread"] as Filter[]).map(f => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "7px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {listLoading ? (
        <Card><Spinner /></Card>
      ) : notifications.length === 0 ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#10C4C3" }}>
              <IconBell />
            </div>
            <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>
              {filter === "unread" ? "Nothing unread" : "No notifications yet"}
            </h4>
            <p style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "340px", lineHeight: 1.65 }}>
              {filter === "unread" ? "You're all caught up." : "Follow-up reminders and other alerts will appear here."}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.map(n => (
              <Card
                key={n.id}
                style={{
                  padding: "16px 20px",
                  cursor: n.action_url ? "pointer" : "default",
                  borderLeft: n.status === "unread" ? "3px solid #10C4C3" : "3px solid transparent",
                  background: n.status === "unread" ? "rgba(16,196,195,0.06)" : "rgba(255,255,255,0.05)",
                }}
              >
                <div onClick={() => handleClick(n)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", flexShrink: 0, color: "#10C4C3" }}><NotificationTypeIcon type={n.type} /></span>
                      <span style={{ fontSize: "14px", fontWeight: n.status === "unread" ? 700 : 500, color: "#FFFFFF" }}>{n.title}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.6, marginBottom: "6px" }}>{n.body}</div>
                    <div style={{ fontSize: "11px", color: "#6B7686" }}>{relativeTime(n.created_at)}</div>
                  </div>
                  {n.status === "unread" && (
                    <button
                      onClick={e => { e.stopPropagation(); void markRead(n.id); }}
                      style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{ padding: "11px 28px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes notif-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .notif-header { flex-direction: column; }
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#020C1C", padding: "104px 24px 60px", fontFamily: "var(--font-body-new)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <p style={{ marginBottom: 20 }}>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>← Dashboard</Link>
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
