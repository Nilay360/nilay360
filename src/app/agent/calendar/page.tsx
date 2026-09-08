"use client";

// Calendar (Phase 11) — aggregates three real sources into one view:
// calendar_events (this agent's own, migration 032, already live),
// site_visits (this agent's assigned visits, via visit_date), and
// inquiries with a non-null next_follow_up (this agent's assigned
// leads). Structure/identity-lookup/Card/Field/view-edit-save-confirm
// patterns mirror leads/site-visits/deals exactly — no new conventions
// invented. Modal overlay mechanics (fixed+inset+blur backdrop,
// centered card, backdrop onClick to close, stopPropagation on the
// card) mirror src/app/admin/page.tsx's AddAgentModal, the one existing
// modal pattern in this codebase, re-themed with the dark agent-page
// tokens instead of admin's light theme.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  loadAgentSchedule, eventToScheduleItem, dateKey, startOfDay, isSameDay,
  type CalendarEventRow, type ScheduleItem as CalItem, type ScheduleItemKind as ItemKind,
} from "@/lib/agentSchedule";

// ── Types ─────────────────────────────────────────────────────────

type CalEventType = "call" | "meeting" | "personal" | "other";
const CAL_EVENT_TYPES: CalEventType[] = ["call", "meeting", "personal", "other"];

interface OwnLead { id: string; inquirer_name: string | null; }
interface OwnVisit { id: string; visitor_name: string; visit_date: string; }
interface OwnDeal { id: string; stage: string; deal_price: number | null; }
interface OwnProperty { id: string; title: string; }

type LoadState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "not_an_agent" }
  | { kind: "error"; detail: string }
  | { kind: "ready"; agentId: string };

type SaveMessage = { type: "success" | "error"; text: string } | null;

const ITEM_STYLE: Record<ItemKind, { label: string; color: string; bg: string; border: string }> = {
  event:      { label: "Event",     color: "#10C4C3", bg: "rgba(16,196,195,0.15)", border: "rgba(16,196,195,0.30)" },
  site_visit: { label: "Site Visit", color: "#FBBF24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.30)" },
  follow_up:  { label: "Follow-up",  color: "#3B82F6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.30)" },
};

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "",     label: "No reminder" },
  { value: "15",   label: "15 minutes before" },
  { value: "30",   label: "30 minutes before" },
  { value: "60",   label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

// ── Helpers ───────────────────────────────────────────────────────

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayHeading(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}
function fmtMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// ── Shared building blocks — duplicated locally, same per-page
// convention as leads/site-visits/deals. ──────────────────────────

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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "cal-spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7686", textTransform: "uppercase", marginBottom: "4px" }}>{label}</p>
      <div style={{ fontSize: "14px", color: "#FFFFFF" }}>{children}</div>
    </div>
  );
}
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" };

function ItemTypeBadge({ kind }: { kind: ItemKind }) {
  const c = ITEM_STYLE[kind];
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function IconCalendar() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function IconChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>;
}
function IconChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;
}

// ── Page ──────────────────────────────────────────────────────────

export default function AgentCalendarPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [userId, setUserId] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [siteVisitItems, setSiteVisitItems] = useState<CalItem[]>([]);
  const [followUpItems, setFollowUpItems] = useState<CalItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [monthCursor, setMonthCursor] = useState<Date>(startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(dateKey(new Date()));

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  // Picker source lists for the Add Event form's optional links —
  // same "fetch own list, select id" pattern as Deals' Create Deal
  // property picker (assigned_agent_id), extended to the sibling
  // entities (lead/visit/deal) since no separate picker precedent
  // exists for those specifically.
  const [ownLeads, setOwnLeads] = useState<OwnLead[]>([]);
  const [ownVisits, setOwnVisits] = useState<OwnVisit[]>([]);
  const [ownDeals, setOwnDeals] = useState<OwnDeal[]>([]);
  const [ownProperties, setOwnProperties] = useState<OwnProperty[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    if (!uid) { setState({ kind: "signed_out" }); return; }
    setUserId(uid);

    const { data: agentRow, error: agentErr } = await supabase
      .from("agent_profiles").select("id").eq("user_id", uid).eq("status", "approved").maybeSingle();
    if (agentErr) { setState({ kind: "error", detail: agentErr.message }); return; }
    if (!agentRow) { setState({ kind: "not_an_agent" }); return; }

    setState({ kind: "ready", agentId: agentRow.id });
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadCalendarData = useCallback(async (agentId: string) => {
    setDataLoading(true);
    const { events, siteVisitItems, followUpItems } = await loadAgentSchedule(agentId);
    setEvents(events);
    setSiteVisitItems(siteVisitItems);
    setFollowUpItems(followUpItems);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (state.kind !== "ready") return;
    void loadCalendarData(state.agentId);

    const supabase = createClient();
    supabase.from("inquiries").select("id, inquirer_name").eq("assigned_to", state.agentId).order("created_at", { ascending: false })
      .then((res: { data: unknown }) => setOwnLeads((res.data as OwnLead[] | null) ?? []));
    supabase.from("site_visits").select("id, visitor_name, visit_date").eq("assigned_to", state.agentId).order("visit_date", { ascending: false })
      .then((res: { data: unknown }) => setOwnVisits((res.data as OwnVisit[] | null) ?? []));
    supabase.from("deals").select("id, stage, deal_price").eq("assigned_to", state.agentId).order("created_at", { ascending: false })
      .then((res: { data: unknown }) => setOwnDeals((res.data as OwnDeal[] | null) ?? []));
    supabase.from("property_listings").select("id, title").eq("assigned_agent_id", state.agentId)
      .then((res: { data: unknown }) => setOwnProperties((res.data as OwnProperty[] | null) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind === "ready" ? state.agentId : null]);

  const eventItems: CalItem[] = useMemo(() => events.map(eventToScheduleItem), [events]);

  const allItems: CalItem[] = useMemo(
    () => [...eventItems, ...siteVisitItems, ...followUpItems],
    [eventItems, siteVisitItems, followUpItems]
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of allItems) {
      const key = dateKey(item.date);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.getTime() - b.date.getTime());
    return map;
  }, [allItems]);

  function itemHref(item: CalItem): string | null {
    if (item.kind === "site_visit") return `/agent/site-visits/${item.id}`;
    if (item.kind === "follow_up") return `/agent/leads/${item.id}`;
    return null; // native events open the modal instead
  }

  if (state.kind === "loading") return <Shell><Spinner /></Shell>;
  if (state.kind === "signed_out") {
    return (
      <Shell>
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "16px" }}>Sign in to your agent account to view your calendar.</p>
          <Link href="/login" style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#020C1C", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign In →</Link>
        </Card>
      </Shell>
    );
  }
  if (state.kind === "not_an_agent") {
    return <Shell><Card style={{ padding: "48px 24px", textAlign: "center" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>This account has no approved agent profile.</p></Card></Shell>;
  }
  if (state.kind === "error") {
    return <Shell><Card style={{ padding: "32px 28px" }}><p style={{ fontSize: "14px", color: "#A9B4C2" }}>Something went wrong.</p><p style={{ fontSize: "11px", color: "#6B7686", marginTop: 8 }}>{state.detail}</p></Card></Shell>;
  }

  const agentId = state.agentId;
  const openEvent = openEventId ? events.find(e => e.id === openEventId) ?? null : null;

  return (
    <Shell>
      <div className="cal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>Calendar</h1>
          <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>Your events, site visits, and lead follow-ups in one place.</p>
        </div>
        <button
          onClick={() => setShowAddEvent(s => !s)}
          style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "#10C4C3", border: "none", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {showAddEvent ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["month", "agenda"] as const).map(m => {
            const on = viewMode === m;
            return (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{ padding: "7px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)", textTransform: "capitalize" }}
              >
                {m === "month" ? "Month Grid" : "Agenda List"}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(Object.keys(ITEM_STYLE) as ItemKind[]).map(k => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#A9B4C2" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ITEM_STYLE[k].color, display: "inline-block" }} />
              {ITEM_STYLE[k].label}
            </span>
          ))}
        </div>
      </div>

      {showAddEvent && (
        <AddEventForm
          agentId={agentId}
          ownLeads={ownLeads}
          ownVisits={ownVisits}
          ownDeals={ownDeals}
          ownProperties={ownProperties}
          onClose={() => setShowAddEvent(false)}
          onCreated={() => { setShowAddEvent(false); void loadCalendarData(agentId); }}
        />
      )}

      {dataLoading ? (
        <Card><Spinner /></Card>
      ) : viewMode === "month" ? (
        <MonthGrid
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          itemsByDay={itemsByDay}
          itemHref={itemHref}
          onOpenEvent={id => setOpenEventId(id)}
        />
      ) : (
        <AgendaList allItems={allItems} itemHref={itemHref} onOpenEvent={id => setOpenEventId(id)} />
      )}

      {openEvent && (
        <EventModal
          event={openEvent}
          ownLeads={ownLeads}
          ownVisits={ownVisits}
          ownDeals={ownDeals}
          ownProperties={ownProperties}
          onClose={() => setOpenEventId(null)}
          onSaved={updated => {
            setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)));
          }}
        />
      )}
    </Shell>
  );
}

// ── Month Grid ────────────────────────────────────────────────────

function MonthGrid({
  monthCursor, setMonthCursor, selectedDay, setSelectedDay, itemsByDay, itemHref, onOpenEvent,
}: {
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  selectedDay: string;
  setSelectedDay: (k: string) => void;
  itemsByDay: Map<string, CalItem[]>;
  itemHref: (item: CalItem) => string | null;
  onOpenEvent: (id: string) => void;
}) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay()); // back up to Sunday

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const today = startOfDay(new Date());
  const selectedItems = itemsByDay.get(selectedDay) ?? [];

  return (
    <>
      <Card style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <button onClick={() => setMonthCursor(new Date(year, month - 1, 1))} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#FFFFFF", cursor: "pointer" }}>
            <IconChevronLeft />
          </button>
          <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>{fmtMonthLabel(monthCursor)}</span>
          <button onClick={() => setMonthCursor(new Date(year, month + 1, 1))} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#FFFFFF", cursor: "pointer" }}>
            <IconChevronRight />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "6px" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B7686", padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        <div className="cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {days.map(d => {
            const key = dateKey(d);
            const inMonth = d.getMonth() === month;
            const items = itemsByDay.get(key) ?? [];
            const isToday = isSameDay(d, today);
            const isSelected = key === selectedDay;
            const kindsPresent = [...new Set(items.map(i => i.kind))];
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                style={{
                  minHeight: "58px",
                  padding: "6px 6px",
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  background: isSelected ? "rgba(16,196,195,0.14)" : "rgba(255,255,255,0.02)",
                  border: isSelected ? "1.5px solid #10C4C3" : isToday ? "1.5px solid rgba(16,196,195,0.35)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  opacity: inMonth ? 1 : 0.35,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: isToday ? 800 : 500, color: isToday ? "#10C4C3" : "#FFFFFF" }}>{d.getDate()}</span>
                {items.length > 0 && (
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "4px" }}>
                    {kindsPresent.map(k => (
                      <span key={k} style={{ width: 6, height: 6, borderRadius: "50%", background: ITEM_STYLE[k].color, display: "inline-block" }} />
                    ))}
                    {items.length > 1 && <span style={{ fontSize: "9px", color: "#6B7686", marginLeft: "2px" }}>{items.length}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <style>{`@media (max-width: 560px) { .cal-grid button { min-height: 42px !important; } }`}</style>
      </Card>

      <Card style={{ padding: "20px 24px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "14px" }}>
          {fmtDayHeading(new Date(selectedDay + "T00:00:00"))}
        </h3>
        {selectedItems.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#6B7686" }}>Nothing scheduled.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {selectedItems.map(item => (
              <DayItemRow key={`${item.kind}-${item.id}`} item={item} href={itemHref(item)} onOpenEvent={onOpenEvent} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function DayItemRow({ item, href, onOpenEvent }: { item: CalItem; href: string | null; onOpenEvent: (id: string) => void }) {
  const body = (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", cursor: "pointer" }}>
      <span style={{ fontSize: "11px", color: "#A9B4C2", minWidth: "58px" }}>{fmtTime(item.date)}</span>
      <ItemTypeBadge kind={item.kind} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "13px", color: "#FFFFFF", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        {item.subtitle && <div style={{ fontSize: "11px", color: "#6B7686" }}>{item.subtitle}</div>}
      </div>
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{body}</Link>;
  return <div onClick={() => onOpenEvent(item.id)}>{body}</div>;
}

// ── Agenda List ───────────────────────────────────────────────────

function AgendaList({ allItems, itemHref, onOpenEvent }: {
  allItems: CalItem[];
  itemHref: (item: CalItem) => string | null;
  onOpenEvent: (id: string) => void;
}) {
  const today = startOfDay(new Date());
  const upcoming = allItems.filter(i => i.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());

  const groups = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of upcoming) {
      const key = dateKey(item.date);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming.length]);

  if (upcoming.length === 0) {
    return (
      <Card>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#10C4C3" }}>
            <IconCalendar />
          </div>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>Nothing upcoming</h4>
          <p style={{ fontSize: "13px", color: "#A9B4C2", maxWidth: "340px", lineHeight: 1.65 }}>Events, site visits, and follow-ups will show up here as they're scheduled.</p>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {groups.map(([key, items]) => (
        <Card key={key} style={{ padding: "18px 22px" }}>
          <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "14px", fontWeight: 600, color: "#10C4C3", marginBottom: "12px" }}>
            {fmtDayHeading(new Date(key + "T00:00:00"))}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map(item => (
              <DayItemRow key={`${item.kind}-${item.id}`} item={item} href={itemHref(item)} onOpenEvent={onOpenEvent} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Add Event form ────────────────────────────────────────────────

function AddEventForm({ agentId, ownLeads, ownVisits, ownDeals, ownProperties, onClose, onCreated }: {
  agentId: string;
  ownLeads: OwnLead[];
  ownVisits: OwnVisit[];
  ownDeals: OwnDeal[];
  ownProperties: OwnProperty[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalEventType>("call");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [siteVisitId, setSiteVisitId] = useState("");
  const [dealId, setDealId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [reminder, setReminder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startAt) { setError("Title and start time are required."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertErr } = await supabase.from("calendar_events").insert({
      agent_profile_id: agentId,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      location: location.trim() || null,
      inquiry_id: inquiryId || null,
      site_visit_id: siteVisitId || null,
      deal_id: dealId || null,
      property_id: propertyId || null,
      reminder_minutes_before: reminder ? Number(reminder) : null,
    });
    setSaving(false);
    if (insertErr) {
      console.error("Add event error:", insertErr);
      setError("Could not create event: " + insertErr.message);
      return;
    }
    onCreated();
  }

  return (
    <Card style={{ padding: "24px", marginBottom: "20px" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Add Event</h3>
      <form onSubmit={handleSubmit}>
        <div className="cal-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call with Ravi" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Event Type</label>
            <select value={eventType} onChange={e => setEventType(e.target.value as CalEventType)} style={inputStyle}>
              {CAL_EVENT_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Start</label>
            <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>End (optional)</label>
            <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Location (optional)</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Reminder</label>
            <select value={reminder} onChange={e => setReminder(e.target.value)} style={inputStyle}>
              {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7686", marginBottom: "8px" }}>Link to (optional)</p>
        <div className="cal-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "10px", color: "#A9B4C2", marginBottom: "6px" }}>Lead</label>
            <select value={inquiryId} onChange={e => setInquiryId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {ownLeads.map(l => <option key={l.id} value={l.id}>{l.inquirer_name || "Unnamed lead"}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "10px", color: "#A9B4C2", marginBottom: "6px" }}>Site Visit</label>
            <select value={siteVisitId} onChange={e => setSiteVisitId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {ownVisits.map(v => <option key={v.id} value={v.id}>{v.visitor_name} — {v.visit_date}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "10px", color: "#A9B4C2", marginBottom: "6px" }}>Deal</label>
            <select value={dealId} onChange={e => setDealId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {ownDeals.map(d => <option key={d.id} value={d.id}>{d.deal_price != null ? `₹${d.deal_price.toLocaleString("en-IN")}` : "Deal"} ({d.stage})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "10px", color: "#A9B4C2", marginBottom: "6px" }}>Property</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {ownProperties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        </div>

        {error && <p style={{ fontSize: "12px", color: "#F87171", marginBottom: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={saving}
            style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            {saving ? "Creating…" : "Create Event"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
            Cancel
          </button>
        </div>
      </form>
      <style>{`@media (max-width: 620px) { .cal-form-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Card>
  );
}

// ── Event modal — view/edit/save/confirm, same pattern as Deals ────

function EventModal({ event, ownLeads, ownVisits, ownDeals, ownProperties, onClose, onSaved }: {
  event: CalendarEventRow;
  ownLeads: OwnLead[];
  ownVisits: OwnVisit[];
  ownDeals: OwnDeal[];
  ownProperties: OwnProperty[];
  onClose: () => void;
  onSaved: (updated: CalendarEventRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [eventType, setEventType] = useState(event.event_type);
  const [startAt, setStartAt] = useState(isoToDatetimeLocal(event.start_at));
  const [endAt, setEndAt] = useState(event.end_at ? isoToDatetimeLocal(event.end_at) : "");
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [reminder, setReminder] = useState(event.reminder_minutes_before != null ? String(event.reminder_minutes_before) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);

  const linkedLead = event.inquiry_id ? ownLeads.find(l => l.id === event.inquiry_id) : null;
  const linkedVisit = event.site_visit_id ? ownVisits.find(v => v.id === event.site_visit_id) : null;
  const linkedDeal = event.deal_id ? ownDeals.find(d => d.id === event.deal_id) : null;
  const linkedProperty = event.property_id ? ownProperties.find(p => p.id === event.property_id) : null;
  const hasLinks = event.inquiry_id || event.site_visit_id || event.deal_id || event.property_id;

  function startEditing() {
    setTitle(event.title);
    setEventType(event.event_type);
    setStartAt(isoToDatetimeLocal(event.start_at));
    setEndAt(event.end_at ? isoToDatetimeLocal(event.end_at) : "");
    setLocation(event.location ?? "");
    setDescription(event.description ?? "");
    setReminder(event.reminder_minutes_before != null ? String(event.reminder_minutes_before) : "");
    setMessage(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startAt) { setMessage({ type: "error", text: "Title and start time are required." }); return; }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const updates = {
      title: title.trim(),
      event_type: eventType,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      location: location.trim() || null,
      description: description.trim() || null,
      reminder_minutes_before: reminder ? Number(reminder) : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("calendar_events").update(updates).eq("id", event.id).select("*").single();
    setSaving(false);
    if (error) {
      console.error("Save event error:", error);
      setMessage({ type: "error", text: "Could not save: " + error.message });
      return;
    }
    onSaved(data as CalendarEventRow);
    setEditing(false);
    setMessage({ type: "success", text: "Saved" });
    setTimeout(() => setMessage(null), 2500);
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Event — ${event.title}`}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 20px 60px rgba(0,0,0,0.55)", width: "100%", maxWidth: "520px", maxHeight: "88vh", overflowY: "auto", padding: "28px", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "18px" }}>
          <div>
            <ItemTypeBadge kind="event" />
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginTop: "8px" }}>{event.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#A9B4C2", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {!editing ? (
          <>
            <Field label="Type">{event.event_type}</Field>
            <Field label="Start"><span style={{ display: "flex", alignItems: "center", gap: "6px" }}>{new Date(event.start_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></Field>
            {event.end_at && <Field label="End">{new Date(event.end_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Field>}
            <Field label="Location">{event.location || "—"}</Field>
            <Field label="Description">{event.description || "—"}</Field>
            <Field label="Reminder">{event.reminder_minutes_before != null ? (REMINDER_OPTIONS.find(o => o.value === String(event.reminder_minutes_before))?.label ?? `${event.reminder_minutes_before} min before`) : "None"}{event.reminder_minutes_before != null && event.reminder_sent && <span style={{ marginLeft: 8, fontSize: 11, color: "#6B7686" }}>(sent)</span>}</Field>

            {hasLinks && (
              <Field label="Linked">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {linkedProperty && <Link href={`/property/${linkedProperty.id}`} style={{ color: "#10C4C3", textDecoration: "none" }}>Property: {linkedProperty.title}</Link>}
                  {event.inquiry_id && <Link href={`/agent/leads/${event.inquiry_id}`} style={{ color: "#10C4C3", textDecoration: "none" }}>Lead: {linkedLead?.inquirer_name || "View Lead"} →</Link>}
                  {event.site_visit_id && <Link href={`/agent/site-visits/${event.site_visit_id}`} style={{ color: "#10C4C3", textDecoration: "none" }}>Site Visit: {linkedVisit?.visitor_name || "View"} →</Link>}
                  {event.deal_id && <Link href={`/agent/deals/${event.deal_id}`} style={{ color: "#10C4C3", textDecoration: "none" }}>Deal: {linkedDeal ? `₹${linkedDeal.deal_price?.toLocaleString("en-IN") ?? "—"}` : "View"} →</Link>}
                </div>
              </Field>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
              <SaveConfirmation message={message} />
              <button onClick={startEditing} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                Edit
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Event Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} style={inputStyle}>
                {CAL_EVENT_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Start</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>End (optional)</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Reminder</label>
              <select value={reminder} onChange={e => setReminder(e.target.value)} style={inputStyle}>
                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {message && <div style={{ marginBottom: 12 }}><SaveConfirmation message={message} /></div>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={saving}
                style={{ padding: "10px 22px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setEditing(false); setMessage(null); }} disabled={saving}
                style={{ padding: "10px 22px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes cal-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .cal-header { flex-direction: column; }
        }
      `}</style>
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
