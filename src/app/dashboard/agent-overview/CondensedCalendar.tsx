"use client";

// Condensed calendar — reuses /agent/calendar's own data source
// (loadAgentSchedule, the shared three-source definition: calendar_
// events + assigned site_visits + inquiries with a follow-up date) via
// src/lib/agentSchedule.ts, the same lib DashboardClient.tsx's own
// "Today's Schedule" stat already imports.
//
// Judgment call, flagged rather than silently decided: "condensed
// form" is built here as a short upcoming-agenda list (next 6 items
// from today forward), not a full month grid — a real month-grid
// calendar is /agent/calendar's own job, and reimplementing that grid
// here would duplicate a whole page's worth of UI for a pilot
// dashboard tile. This is the simplest reasonable read of "condensed",
// not a full second calendar widget.

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAgentSchedule, eventToScheduleItem, isSameDay, type ScheduleItem } from "@/lib/agentSchedule";

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const KIND_COLOR: Record<ScheduleItem["kind"], string> = {
  event: "#10C4C3",
  site_visit: "#FBBF24",
  follow_up: "#3B82F6",
};
const KIND_LABEL: Record<ScheduleItem["kind"], string> = {
  event: "Event",
  site_visit: "Site Visit",
  follow_up: "Follow-up",
};

export default function CondensedCalendar({ agentId }: { agentId: string }) {
  const [items, setItems] = useState<ScheduleItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      const scheduleData = await loadAgentSchedule(agentId);
      const all = [
        ...scheduleData.events.map(eventToScheduleItem),
        ...scheduleData.siteVisitItems,
        ...scheduleData.followUpItems,
      ];
      const today = new Date();
      const upcoming = all
        .filter(i => i.date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 6);
      if (!cancelled) setItems(upcoming);
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  const today = new Date();

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}>Upcoming</h3>
        <Link href="/agent/calendar" style={{ fontSize: "12px", color: "#10C4C3", textDecoration: "none", fontWeight: 600 }}>Full Calendar →</Link>
      </div>
      {!items ? (
        <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7686" }}>Nothing scheduled.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map(i => (
            <div key={`${i.kind}-${i.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", background: isSameDay(i.date, today) ? "rgba(16,196,195,0.08)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: KIND_COLOR[i.kind], flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "12.5px", color: "#FFFFFF", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</div>
                  <div style={{ fontSize: "11px", color: "#6B7686" }}>{KIND_LABEL[i.kind]} · {fmtDay(i.date)}{i.subtitle ? ` · ${i.subtitle}` : ""}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
