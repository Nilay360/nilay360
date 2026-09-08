"use client";

// Recent Activity — last 8 items merged from inquiry_activities (on
// this agent's own leads), tasks (assigned to or by self), and
// messages (sent by self), sorted by timestamp descending. No new
// table, no schema change — three existing queries merged client-side,
// same "fetch then map/merge" convention as everywhere else tonight.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type FeedKind = "lead_activity" | "task" | "message";

interface FeedItem {
  kind: FeedKind;
  id: string;
  at: string;
  text: string;
  href: string;
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const KIND_COLOR: Record<FeedKind, string> = {
  lead_activity: "#3B82F6",
  task: "#FBBF24",
  message: "#10C4C3",
};

export default function RecentActivityFeed({ agentId }: { agentId: string }) {
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      const supabase = createClient();

      const { data: myInquiries } = await supabase.from("inquiries").select("id").eq("assigned_to", agentId);
      const inquiryIds = (myInquiries as { id: string }[] | null ?? []).map(r => r.id);

      const [activitiesRes, tasksToMeRes, tasksByMeRes, messagesRes] = await Promise.all([
        inquiryIds.length > 0
          ? supabase.from("inquiry_activities").select("id, inquiry_id, type, content, created_at").in("inquiry_id", inquiryIds).order("created_at", { ascending: false }).limit(8)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("tasks").select("id, title, created_at").eq("assigned_to", agentId).order("created_at", { ascending: false }).limit(8),
        supabase.from("tasks").select("id, title, created_at").eq("assigned_by", agentId).order("created_at", { ascending: false }).limit(8),
        supabase.from("messages").select("id, conversation_id, content, created_at").eq("sender_id", agentId).order("created_at", { ascending: false }).limit(8),
      ]);

      const activities = (activitiesRes.data as { id: string; inquiry_id: string; type: string; content: string | null; created_at: string }[] | null) ?? [];
      const tasksToMe = (tasksToMeRes.data as { id: string; title: string; created_at: string }[] | null) ?? [];
      const tasksByMe = (tasksByMeRes.data as { id: string; title: string; created_at: string }[] | null) ?? [];
      const messages = (messagesRes.data as { id: string; conversation_id: string; content: string; created_at: string }[] | null) ?? [];

      // Dedup self-assigned tasks (would otherwise appear twice — once
      // from each query) by id.
      const taskById = new Map<string, { id: string; title: string; created_at: string }>();
      [...tasksToMe, ...tasksByMe].forEach(t => taskById.set(t.id, t));

      const merged: FeedItem[] = [
        ...activities.map(a => ({ kind: "lead_activity" as const, id: a.id, at: a.created_at, text: a.content ? `${a.type}: ${a.content}` : a.type, href: `/agent/leads/${a.inquiry_id}` })),
        ...[...taskById.values()].map(t => ({ kind: "task" as const, id: t.id, at: t.created_at, text: t.title, href: `/agent/tasks/${t.id}` })),
        ...messages.map(m => ({ kind: "message" as const, id: m.id, at: m.created_at, text: m.content, href: `/agent/messages/${m.conversation_id}` })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);

      if (!cancelled) setItems(merged);
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Recent Activity</h3>
      {!items ? (
        <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7686" }}>No recent activity.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map(i => (
            <Link key={`${i.kind}-${i.id}`} href={i.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 10px", borderRadius: "8px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: KIND_COLOR[i.kind], flexShrink: 0, marginTop: "5px" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "12.5px", color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.text}</div>
                  <div style={{ fontSize: "11px", color: "#6B7686" }}>{fmtRelative(i.at)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
