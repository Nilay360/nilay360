"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { SavedSearchesList } from "@/components/dashboard/SavedSearchesList";
import { MyListingsList, type Listing as MLLListing } from "@/components/dashboard/MyListingsList";
import { CITIES } from "@/constants";
import { optimizedImageUrl } from "@/lib/image-url";
import { loadAgentSchedule, eventToScheduleItem, isSameDay } from "@/lib/agentSchedule";
import AgentDrawerChrome from "@/components/agent/AgentDrawerChrome";
import { VisitStatusBadge } from "../agent/site-visits/page";
import LeadsOverTimeChart from "./agent-overview/LeadsOverTimeChart";
import DealsClosedChart from "./agent-overview/DealsClosedChart";
import PerformanceTrendChart from "./agent-overview/PerformanceTrendChart";
import ActiveDealsTable from "./agent-overview/ActiveDealsTable";
import LeadsByCityRanked from "./agent-overview/LeadsByCityRanked";
import CondensedCalendar from "./agent-overview/CondensedCalendar";
import RecentActivityFeed from "./agent-overview/RecentActivityFeed";
import { getUnreadNotificationCount } from "@/lib/notifications";
import SavedSearchesOverTimeChart from "./buyer-overview/SavedSearchesOverTimeChart";
import InquiriesReceivedChart from "./buyer-overview/InquiriesReceivedChart";
import MyListingsTable from "./buyer-overview/MyListingsTable";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "listings"
  | "assigned"
  | "saved"
  | "searches"
  | "profile"
  | "inquiries"
  | "appointments"
  | "settings";

const VALID_TABS: Tab[] = ["overview", "listings", "assigned", "saved", "searches", "profile", "inquiries", "appointments", "settings"];

type Props = {
  email: string;
  userId: string;
  fullName?: string;
  accountType?: string;
};

type Listing = {
  id: string;
  slug: string | null;
  title: string | null;
  property_category: string | null;
  listing_type: string | null;
  city: string | null;
  locality: string | null;
  price: number | null;
  status: string;
  submitted_at: string;
  photo_urls?: string[] | null;
  view_count?: number | null;
};

// One batched query for all of a caller's listings' view events, not a
// per-row fetch — property_view_events' own RLS (066) already restricts
// this to rows the signed-in owner/assigned agent is allowed to see, so
// counting the returned rows client-side is safe by construction.
async function withViewCounts<T extends { id: string }>(
  supabase: ReturnType<typeof createClient>,
  listings: T[],
): Promise<(T & { view_count: number })[]> {
  if (listings.length === 0) return [];
  const { data: viewEvents } = await supabase
    .from("property_view_events")
    .select("property_id")
    .in("property_id", listings.map(l => l.id)) as { data: { property_id: string }[] | null };
  const viewCountByProperty = new Map<string, number>();
  for (const row of viewEvents ?? []) {
    viewCountByProperty.set(row.property_id, (viewCountByProperty.get(row.property_id) ?? 0) + 1);
  }
  return listings.map(l => ({ ...l, view_count: viewCountByProperty.get(l.id) ?? 0 }));
}

type AgentProfileData = {
  id:               string;
  license_number:   string | null;
  agency_name:      string | null;
  bio:              string | null;
  years_experience: number | null;
  cities:           string[];
  leaderboard_opt_out: boolean;
  rera_number:      string | null;
};

type SaveRow = {
  id: string;
  property_id: string | null;
  property_data: Record<string, unknown> | null;
  created_at: string;
};

type SavedItem = SaveRow;

type Inquiry = {
  id: string;
  property_id: string | null;
  property_slug: string | null;
  property_title: string | null;
  seller_email: string | null;
  inquirer_name: string | null;
  inquirer_email: string | null;
  inquirer_phone: string | null;
  message: string | null;
  inquiry_type: string | null;
  status: string | null;
  created_at: string;
};

type ProfileData = {
  full_name:    string | null;
  city:         string | null;
  phone:        string | null;
  bio:          string | null;
  avatar_url:   string | null;
  whatsapp:     string | null;
  date_of_birth: string | null;
  gender:       string | null;
  nationality:  string | null;
  is_nri:       boolean | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(email: string, name?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatPrice(price: number | null, listingType?: string | null): string {
  if (price == null) return "—";
  if (listingType === "rent") {
    if (price >= 100_000) return `₹${(price / 100_000).toFixed(1)}L/mo`;
    return `₹${(price / 1_000).toFixed(0)}K/mo`;
  }
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `₹${(price / 100_000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function calcCompletion(p: ProfileData | null): number {
  if (!p) return 0;
  const strFields = [p.full_name, p.city, p.phone, p.bio, p.whatsapp, p.gender, p.nationality];
  const filled = strFields.filter(v => v && v.trim() !== "").length
    + (p.date_of_birth ? 1 : 0);
  return Math.round((filled / 8) * 100);
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconHome()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconList()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconHeart()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function IconSearch()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconUser()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconMsg()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconCal()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconGear()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IconOut()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconBuilding() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>; }
function IconTrash()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function IconEdit()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function IconPin()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconAlert()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IconBriefcase(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function IconTrend()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function IconBell()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
// Sidebar nav icons for the new agent-only links (Phase 23) — same
// shapes already used elsewhere in this codebase for these exact
// features, resized to this sidebar's 15x15 convention, not invented:
// IconTeam from src/app/agent/teams/page.tsx, IconChecklist from
// src/app/agent/tasks/page.tsx, IconChart from src/app/admin/page.tsx
// (already 15x15 there). My Leads/Site Visits/Deals/Calendar/Messages
// all reuse icons already defined above in this same file
// (IconMsg/IconPin/IconTrend/IconCal) — no new definitions needed for
// those. Note: IconMsg is the same speech-bubble path this codebase
// already uses for BOTH "Leads" (leads/page.tsx names it IconInbox)
// and "Messages" (messages/page.tsx's own IconMsg) — there is no
// separate icon for these two concepts anywhere in the codebase to
// reuse instead, so both sidebar rows below intentionally share it.
function IconTeam()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconChecklist() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h6"/></svg>; }
function IconChart()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>; }
// Leaderboard (Phase 25) — no precedent icon exists anywhere in this
// codebase for this concept (unlike Leads/Messages/Deals/etc., which
// all reuse an icon already used elsewhere for that same feature), so
// this is a genuinely new small icon rather than an awkward reuse of
// an already-claimed one (e.g. IconTrend/IconChart, both already
// standing for Deals/Analytics).
function IconAward()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/></svg>; }

// ── Sidebar nav ────────────────────────────────────────────────────────────────
// Buyer/seller nav is unchanged. Agents get a distinct, shorter nav — per
// directive, buyer-only items (Saved Properties, Recent Searches, My Listings,
// My Inquiries, Appointments) are hidden since an agent doesn't own listings or
// browse as a buyer in this phase. Flagged as a judgment call, not a fixed rule.

// Shared shape for both sidebar nav lists (Phase 23). `id` selects an
// internal Tab (existing behavior, unchanged); `href` is new — a
// plain external route link, for the agent-only full-feature links
// added below. Both fields are optional on one shared type rather
// than a discriminated union so the buyer/seller NAV array below
// doesn't need any of its existing object literals rewritten — it
// only ever populates `id`, never `href`, so its rendering and
// behavior are completely unchanged.
interface SidebarNavItem {
  id?: Tab;
  href?: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: SidebarNavItem[] = [
  { id: "overview",     label: "Overview",        icon: <IconHome /> },
  { id: "listings",     label: "My Listings",      icon: <IconList /> },
  { id: "saved",        label: "Saved Properties", icon: <IconHeart /> },
  { id: "searches",     label: "Recent Searches",  icon: <IconSearch /> },
  { id: "profile",      label: "Profile",          icon: <IconUser /> },
  { id: "inquiries",    label: "My Inquiries",     icon: <IconMsg /> },
  { id: "appointments", label: "Appointments",     icon: <IconCal /> },
  { id: "settings",     label: "Settings",         icon: <IconGear /> },
];

// Agent-only. Overview stays the internal tab it always was; the 8
// new entries below it are real page links (Phase 22/23's standalone
// agent-portal routes), not internal tabs — that's the whole point,
// this sidebar is now full navigation, not just a shortcut to other
// tabs within this same shell. Assigned Listings/Profile relabeled to
// match Quick Actions' existing wording for the same destinations
// ("View Assigned Listings" / "Edit Profile") — same internal tabs,
// same icons, label text only.
const NAV_AGENT: SidebarNavItem[] = [
  { id: "overview",  label: "Overview",             icon: <IconHome /> },
  { href: "/agent/leads",       label: "My Leads",     icon: <IconMsg /> },
  { href: "/agent/site-visits", label: "Site Visits",  icon: <IconPin /> },
  { href: "/agent/deals",       label: "Deals",        icon: <IconTrend /> },
  { href: "/agent/calendar",    label: "Calendar",     icon: <IconCal /> },
  { href: "/agent/messages",    label: "Messages",     icon: <IconMsg /> },
  { href: "/agent/tasks",       label: "Tasks",        icon: <IconChecklist /> },
  { href: "/agent/teams",       label: "Teams",        icon: <IconTeam /> },
  { href: "/agent/analytics",   label: "Analytics",    icon: <IconChart /> },
  { href: "/agent/leaderboard", label: "Leaderboard",  icon: <IconAward /> },
  // "My Listings" (listings this agent personally posted, property_listings.
  // user_id/seller_email) vs. "Assigned Listings" (assigned_agent_id, set only
  // by an admin — confirmed the only write site in the whole codebase is
  // admin/page.tsx's handleAssignAgent) are deliberately kept as two separate
  // tabs: different relationships to a listing, and a self-posted listing an
  // admin later assigns back to its own creator can legitimately appear in
  // both — that's correct, not a duplicate to dedupe.
  { id: "listings",  label: "My Listings",            icon: <IconBuilding /> },
  { id: "assigned",  label: "View Assigned Listings", icon: <IconBriefcase /> },
  { id: "profile",   label: "Edit Profile",           icon: <IconUser /> },
  { id: "settings",  label: "Settings",               icon: <IconGear /> },
];

function CityMultiSelect({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const toggle = (city: string) => {
    onChange(selected.includes(city) ? selected.filter(c => c !== city) : [...selected, city]);
  };
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {CITIES.map(city => {
        const on = selected.includes(city);
        return (
          <button
            type="button"
            key={city}
            onClick={() => toggle(city)}
            style={{ padding: "7px 15px", borderRadius: "100px", fontSize: "12px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)" }}
          >
            {city}
          </button>
        );
      })}
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", ...style }}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "32px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "5px" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, cta, ctaHref }: {
  icon: React.ReactNode; title: string; subtitle: string; cta?: string; ctaHref?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#10C4C3" }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 500, color: "#FFFFFF", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "13px", color: "#A9B4C2", marginBottom: "22px", maxWidth: "310px", lineHeight: 1.65 }}>{subtitle}</p>
      {cta && ctaHref && (
        <a href={ctaHref} style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: "999px", color: "#000", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>{cta}</a>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#10C4C3" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending_review: { label: "Pending Review", bg: "rgba(255,255,255,0.10)",  color: "#A9B4C2", border: "rgba(255,255,255,0.18)"  },
    active:         { label: "Active",          bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)"  },
    rejected:       { label: "Rejected",        bg: "rgba(248,113,113,0.15)",  color: "#F87171", border: "rgba(248,113,113,0.30)"   },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function StatCard({ label, value, accent, icon, href }: {
  label: string; value: string | number; accent?: boolean; icon: React.ReactNode;
  /** Optional — when present, the whole card navigates there on click.
   *  Cards without it (the two pre-existing ones) render exactly as before. */
  href?: string;
}) {
  const body = (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "22px 24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: "18px", flex: "1 1 155px", cursor: href ? "pointer" : undefined }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: accent ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent ? "#10C4C3" : "#A9B4C2" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "28px", fontWeight: 600, lineHeight: 1.1, background: "linear-gradient(135deg, #FFFFFF 0%, #10C4C3 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#FFFFFF" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{label}</div>
      </div>
    </div>
  );
  if (!href) return body;
  return <a href={href} style={{ textDecoration: "none", flex: "1 1 155px" }}>{body}</a>;
}

function FormField({ label, type = "text", value, onChange, readOnly, placeholder }: {
  label: string; type?: string; value: string;
  onChange?: (v: string) => void; readOnly?: boolean; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "7px" }}>{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", background: readOnly ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", color: readOnly ? "rgba(255,255,255,0.45)" : "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", boxSizing: "border-box", cursor: readOnly ? "not-allowed" : "text" }}
      />
    </div>
  );
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ email, fullName, listings, savedItems, profile, userId }: {
  email: string;
  fullName?: string;
  listings: Listing[];
  savedItems: SavedItem[];
  profile: ProfileData | null;
  userId: string;
}) {
  const name         = fullName || email.split("@")[0];
  const activeCount  = listings.filter(l => l.status === "active").length;
  const pendingCount = listings.filter(l => l.status === "pending_review").length;
  const completion   = calcCompletion(profile);

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "38px", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "6px" }}>
          Welcome back, <em style={{ fontStyle: "italic", color: "#10C4C3" }}>{name}</em>
        </h1>
        <p style={{ fontSize: "14px", color: "#A9B4C2" }}>Here&apos;s an overview of your activity on Nilay 360.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "28px" }}>
        <StatCard label="Total Listings"     value={listings.length}   accent icon={<IconList />} />
        <StatCard label="Active Listings"    value={activeCount}              icon={<IconBuilding />} />
        <StatCard label="Saved Properties"   value={savedItems.length} accent icon={<IconHeart />} />
        <StatCard label="Profile Completion" value={`${completion}%`}        icon={<IconUser />} />
      </div>

      {/* Profile completion bar */}
      <Card style={{ padding: "20px 24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Profile Completion</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: completion === 100 ? "#4ADE80" : "#10C4C3" }}>{completion}%</span>
        </div>
        <div style={{ height: "6px", background: "rgba(255,255,255,0.10)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${completion}%`, background: completion === 100 ? "#4ADE80" : "#10C4C3", borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
        {completion < 100 && (
          <p style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "8px" }}>
            Complete your profile to improve visibility.{" "}
            <button
              style={{ background: "none", border: "none", color: "#10C4C3", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)", padding: 0, textDecoration: "underline" }}
              onClick={() => {
                const el = document.querySelector("[data-tab='profile']") as HTMLButtonElement | null;
                el?.click();
              }}
            >
              Edit Profile →
            </button>
          </p>
        )}
      </Card>

      {/* Pending warning */}
      {pendingCount > 0 && (
        <Card style={{ padding: "16px 22px", marginBottom: "20px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <IconAlert />
            <span style={{ fontSize: "13px", color: "#FBBF24", fontWeight: 500 }}>
              {pendingCount} listing{pendingCount !== 1 ? "s" : ""} pending admin review
            </span>
          </div>
        </Card>
      )}

      {/* Charts + tables (Phase 27) — same ChartCard/table patterns
          already built for the agent dashboard, applied here with a
          buyer/seller-appropriate filter. No new fetch for "My
          Listings" — it reuses the `listings` prop already loaded by
          loadBuyerSeller() for the KPI cards above. */}
      <div className="buyer-overview-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <SavedSearchesOverTimeChart userId={userId} />
        <InquiriesReceivedChart email={email} />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <MyListingsTable listings={listings} />
      </div>

      {/* Quick actions */}
      <Card style={{ padding: "28px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "18px" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a href="/properties"    style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "#10C4C3", color: "#FFFFFF", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>Browse Properties</a>
          <a href="/post-property" style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF" }}>List Your Property</a>
          <a href="/calculator"    style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF" }}>Calculate EMI</a>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 1b: Agent Overview ────────────────────────────────────────────────────

// Phase 7 — real numbers for the four new stat cards below, plus the
// unread-notification count. Self-contained (own useEffect) rather than
// threading through the top-level component's existing agent data-load,
// since none of these counts are needed by any other tab. assigned_to /
// assigned_agent_id columns everywhere here reference agent_profiles.id
// (agentProfileId), the same identity already used by /agent/leads,
// /agent/site-visits, /agent/deals, and /agent/calendar.
interface AgentOverviewStats {
  openLeads: number;
  upcomingVisits: number;
  activeDeals: number;
  todaySchedule: number;
  unreadNotifications: number;
}

function useAgentOverviewStats(agentProfileId: string | null, userId: string): { stats: AgentOverviewStats | null; loading: boolean } {
  const [stats, setStats]     = useState<AgentOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentProfileId) { setLoading(false); return; }
    let cancelled = false;
    const supabase = createClient();

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const today = new Date();

    (async () => {
      setLoading(true);

      const [leadsRes, visitsRes, dealsRes, scheduleData, unreadCount] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true })
          .eq("assigned_to", agentProfileId).not("status", "in", "(closed,lost,spam)"),
        supabase.from("site_visits").select("id", { count: "exact", head: true })
          .eq("assigned_to", agentProfileId).gte("visit_date", todayStr),
        supabase.from("deals").select("id", { count: "exact", head: true })
          .eq("assigned_to", agentProfileId).not("stage", "in", "(closed,lost)"),
        loadAgentSchedule(agentProfileId),
        getUnreadNotificationCount(userId),
      ]);

      if (cancelled) return;

      if (leadsRes.error)  console.error("AgentOverviewTab — open leads count error:", leadsRes.error);
      if (visitsRes.error) console.error("AgentOverviewTab — upcoming visits count error:", visitsRes.error);
      if (dealsRes.error)  console.error("AgentOverviewTab — active deals count error:", dealsRes.error);

      // Same three-source definition as /agent/calendar, filtered to items
      // falling on today specifically.
      const allScheduleItems = [
        ...scheduleData.events.map(eventToScheduleItem),
        ...scheduleData.siteVisitItems,
        ...scheduleData.followUpItems,
      ];
      const todayCount = allScheduleItems.filter(i => isSameDay(i.date, today)).length;

      setStats({
        openLeads: leadsRes.count ?? 0,
        upcomingVisits: visitsRes.count ?? 0,
        activeDeals: dealsRes.count ?? 0,
        todaySchedule: todayCount,
        unreadNotifications: unreadCount,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [agentProfileId, userId]);

  return { stats, loading };
}

function AgentOverviewTab({ fullName, email, assignedListings, agentProfileId, userId }: {
  fullName?: string;
  email: string;
  assignedListings: Listing[];
  agentProfileId: string | null;
  userId: string;
}) {
  const name        = fullName || email.split("@")[0];
  const activeCount = assignedListings.filter(l => l.status === "active").length;
  const { stats }   = useAgentOverviewStats(agentProfileId, userId);

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "38px", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "6px" }}>
          Welcome back, <em style={{ fontStyle: "italic", color: "#10C4C3" }}>{name}</em>
        </h1>
        <p style={{ fontSize: "14px", color: "#A9B4C2" }}>Here&apos;s an overview of your assigned listings.</p>
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "28px" }}>
        <StatCard label="Assigned Listings"     value={assignedListings.length}          accent icon={<IconBriefcase />} />
        <StatCard label="Active"                value={activeCount}                             icon={<IconBuilding />} />
        <StatCard label="Open Leads"            value={stats?.openLeads ?? "—"}                 icon={<IconMsg />}       href="/agent/leads" />
        <StatCard label="Upcoming Site Visits"  value={stats?.upcomingVisits ?? "—"}            icon={<IconPin />}       href="/agent/site-visits" />
        <StatCard label="Active Deals"          value={stats?.activeDeals ?? "—"}               icon={<IconTrend />}     href="/agent/deals" />
        <StatCard label="Today's Schedule"      value={stats?.todaySchedule ?? "—"}             icon={<IconCal />}       href="/agent/calendar" />
        <StatCard label="Notifications"         value={stats?.unreadNotifications ?? "—"}        icon={<IconBell />}      href="/notifications" />
      </div>

      <Card style={{ padding: "28px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "18px" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href="/agent/leads"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "#10C4C3", color: "#FFFFFF", boxShadow: "0 10px 30px rgba(30,167,255,.35)", fontFamily: "var(--font-body-new)" }}
          >
            My Leads
          </a>
          <a
            href="/agent/site-visits"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Site Visits
          </a>
          <a
            href="/agent/deals"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Deals
          </a>
          <a
            href="/agent/calendar"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Calendar
          </a>
          <a
            href="/agent/messages"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Messages
          </a>
          <a
            href="/agent/tasks"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Tasks
          </a>
          <a
            href="/agent/teams"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Teams
          </a>
          <a
            href="/agent/analytics"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Analytics
          </a>
          <a
            href="/agent/leaderboard"
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
          >
            Leaderboard
          </a>
          <button
            onClick={() => { const el = document.querySelector("[data-tab='assigned']") as HTMLButtonElement | null; el?.click(); }}
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            View Assigned Listings
          </button>
          <button
            onClick={() => { const el = document.querySelector("[data-tab='profile']") as HTMLButtonElement | null; el?.click(); }}
            style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#FFFFFF", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Edit Profile
          </button>
        </div>
      </Card>

      {/* Phase 22 re-skin content — charts/table/activity, all scoped
          to this agent's own data. Guarded on agentProfileId since
          every query below needs it; nothing renders until it's
          loaded (same pattern useAgentOverviewStats already uses). */}
      {agentProfileId && (
        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="agent-overview-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <LeadsOverTimeChart agentId={agentProfileId} />
            <DealsClosedChart agentId={agentProfileId} />
          </div>

          <PerformanceTrendChart agentId={agentProfileId} />

          <ActiveDealsTable agentId={agentProfileId} />

          <div className="agent-overview-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <LeadsByCityRanked agentId={agentProfileId} />
            <CondensedCalendar agentId={agentProfileId} />
          </div>

          <RecentActivityFeed agentId={agentProfileId} />
        </div>
      )}
    </div>
  );
}

// ── Tab 2: My Listings ────────────────────────────────────────────────────────

function ListingsTab({ listings, loading, onDelete, onViewInquiries }: {
  listings: Listing[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onViewInquiries: (listing: MLLListing) => void;
}) {
  if (loading) return <Spinner />;

  return <MyListingsList listings={listings} onDelete={onDelete} onViewInquiries={onViewInquiries} compact />;
}

// ── Tab: Assigned Listings (agent — can Edit, cannot Delete directly) ──────────
//
// readOnly stays true (Delete hidden — agents don't get direct deletion,
// per explicit instruction: removal goes through the request flow below,
// not straight to the seller-facing Delete). canEdit is explicitly set
// true so the same Edit button sellers use (-> /post-property/edit/[id])
// becomes available here too, now that 033 grants the assigned agent real
// UPDATE access via RLS.

function AssignedListingsTab({ listings, loading, userId }: { listings: Listing[]; loading: boolean; userId: string }) {
  const [deletionTarget, setDeletionTarget] = useState<MLLListing | null>(null);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Assigned Listings" subtitle="Properties assigned to you by the Nilay 360 team." />
      <MyListingsList
        listings={listings}
        compact
        readOnly
        canEdit
        onRequestDeletion={listing => setDeletionTarget(listing)}
      />
      {deletionTarget && (
        <RequestDeletionModal
          listing={deletionTarget}
          userId={userId}
          onClose={() => setDeletionTarget(null)}
        />
      )}
    </div>
  );
}

// Deletion-request modal — mechanics mirror src/components/shared/ReportButton.tsx
// (the closest existing precedent: fixed-overlay modal, backdrop-click to
// close, reason + optional details, a "submitted" success state), re-themed
// dark to match this dashboard instead of ReportButton's light public-page
// theme. Inserts into the same `reports` table ReportButton uses, tagged via
// request_type (migration 033) rather than a separate table/mechanism.
function RequestDeletionModal({ listing, userId, onClose }: { listing: MLLListing; userId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    // reporter_id references profiles.id (same FK ReportButton.tsx already
    // uses) — the agent's own account id, not agent_profiles.id, which
    // would violate the FK (it points at a different table entirely).
    const { error: err } = await supabase.from("reports").insert({
      reporter_id: userId,
      entity_type: "listing",
      entity_id: listing.id,
      reason: reason.trim(),
      details: details.trim() || null,
      request_type: "deletion_request",
    });
    setSubmitting(false);
    if (err) { setError("Failed to submit — please try again."); return; }
    setSubmitted(true);
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Request deletion — ${listing.title ?? "listing"}`}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 20px 60px rgba(0,0,0,0.55)", width: "100%", maxWidth: "420px", padding: "26px 28px", fontFamily: "var(--font-body-new)" }}
      >
        {submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>✅</div>
            <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF", marginBottom: "8px" }}>Deletion request submitted</p>
            <p style={{ fontSize: "12px", color: "#A9B4C2", lineHeight: 1.7, marginBottom: "18px" }}>Our team will review this shortly.</p>
            <button onClick={onClose} style={{ padding: "10px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF" }}>Request Deletion</h3>
              <button onClick={onClose} aria-label="Close" style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#A9B4C2" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "18px" }}>{listing.title ?? "This listing"}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Why should this listing be removed?"
                  style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: "6px" }}>Details (optional)</label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Anything that will help our team review this…"
                  style={{ width: "100%", padding: "10px 14px", background: "#111F33", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: "13px", outline: "none", resize: "vertical" }}
                />
              </div>
              {error && <div style={{ fontSize: "12px", color: "#F87171" }}>{error}</div>}
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                style={{ padding: "12px", background: "#10C4C3", border: "none", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Agent Profile ────────────────────────────────────────────────────────

// KYC Documents (Phase 17). Fixed 4-slot checklist, per spec — not a
// free-form document list like the Deals feature's. Keys match the
// document_type values this feature writes; labels are just display
// text.
const KYC_DOCUMENT_SLOTS: { key: string; label: string }[] = [
  { key: "pan",               label: "PAN" },
  { key: "aadhaar",           label: "Aadhaar" },
  { key: "rera_certificate",  label: "RERA Certificate" },
  { key: "address_proof",     label: "Address Proof" },
];

interface AgentDocumentRow {
  id: string;
  document_type: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
}

function fmtDocDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function AgentProfileTab({ email, userId, agentProfile, loading, onSave }: {
  email: string;
  userId: string;
  agentProfile: AgentProfileData | null;
  loading: boolean;
  onSave: (updates: Omit<AgentProfileData, "id">) => Promise<boolean>;
}) {
  const [licenseNumber,   setLicenseNumber]   = useState("");
  const [reraNumber,      setReraNumber]      = useState("");
  const [agencyName,      setAgencyName]      = useState("");
  const [bio,              setBio]            = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [cities,           setCities]         = useState<string[]>([]);
  // Leaderboard (Phase 25) — UI state is the positive framing
  // ("participating"), storage is the negated column
  // (leaderboard_opt_out) — inverted at the two boundaries (sync
  // effect below, handleSave) rather than showing a
  // double-negative "opt out of opting out" checkbox to the agent.
  const [participating, setParticipating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState<{ ok: boolean; msg: string } | null>(null);

  // KYC documents — loaded once agentProfile.id is known. No approval-
  // status check anywhere here, client-side or in the query, matching
  // the RLS policy (031), which also has no status gate for an agent's
  // own documents — deliberate, since KYC is often submitted as part of
  // becoming approved.
  const [documents, setDocuments] = useState<AgentDocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [slotMessages, setSlotMessages] = useState<Record<string, { type: "success" | "error"; text: string } | null>>({});
  const fileInputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!agentProfile?.id) { setDocsLoading(false); return; }
    let cancelled = false;
    (async () => {
      setDocsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("id, document_type, file_url, file_name, mime_type, created_at")
        .eq("agent_profile_id", agentProfile.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.error("KYC documents query error:", error);
      setDocuments((data as AgentDocumentRow[] | null) ?? []);
      setDocsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agentProfile?.id]);

  function flashSlotMessage(slotKey: string, msg: { type: "success" | "error"; text: string } | null) {
    setSlotMessages(prev => ({ ...prev, [slotKey]: msg }));
    if (msg?.type === "success") {
      setTimeout(() => setSlotMessages(prev => ({ ...prev, [slotKey]: null })), 2500);
    }
  }

  async function handleUploadDocument(slotKey: string, file: File) {
    if (!agentProfile?.id) return;
    setUploadingSlot(slotKey);
    flashSlotMessage(slotKey, null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload-document", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? "Upload failed");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          agent_profile_id: agentProfile.id,
          document_type: slotKey,
          file_url: json.secure_url as string,
          file_name: file.name,
          mime_type: file.type || null,
          uploaded_by: userId,
        })
        .select("id, document_type, file_url, file_name, mime_type, created_at")
        .single();
      if (error) throw new Error(error.message);

      setDocuments(prev => [data as AgentDocumentRow, ...prev]);
      flashSlotMessage(slotKey, { type: "success", text: "Uploaded" });
    } catch (err) {
      console.error("KYC document upload error:", err);
      flashSlotMessage(slotKey, { type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploadingSlot(null);
    }
  }

  useEffect(() => {
    if (!agentProfile) return;
    setLicenseNumber(agentProfile.license_number ?? "");
    setReraNumber(agentProfile.rera_number ?? "");
    setAgencyName(agentProfile.agency_name ?? "");
    setBio(agentProfile.bio ?? "");
    setYearsExperience(agentProfile.years_experience != null ? String(agentProfile.years_experience) : "");
    setCities(agentProfile.cities);
    setParticipating(!agentProfile.leaderboard_opt_out);
  }, [agentProfile]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    const ok = await onSave({
      license_number:   licenseNumber.trim() || null,
      agency_name:      agencyName.trim()    || null,
      bio:              bio.trim()           || null,
      years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
      cities,
      leaderboard_opt_out: !participating,
      rera_number:      reraNumber.trim()    || null,
    });
    setSaving(false);
    setToast(ok ? { ok: true, msg: "Profile saved successfully" } : { ok: false, msg: "Save failed. Please try again." });
    if (ok) setTimeout(() => setToast(null), 3000);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 88, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 16, background: "rgba(18,21,25,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${toast.ok ? "rgba(16,196,195,0.30)" : "rgba(248,113,113,0.30)"}`, color: toast.ok ? "#FFFFFF" : "#F87171", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <SectionHeading title="Agent Profile" subtitle="This information is visible to admins and, once public profiles ship, to buyers." />
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: 999, color: "#000", fontSize: 13, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: saving ? 0.7 : 1, flexShrink: 0, boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Agent Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          <FormField label="License Number"  value={licenseNumber}   onChange={setLicenseNumber} placeholder="Broker/agent license number" />
          <FormField label="RERA Number"     value={reraNumber}      onChange={setReraNumber}    placeholder="e.g. TS/RERA/AGT/2024/001234" />
          <FormField label="Agency Name"     value={agencyName}      onChange={setAgencyName}    placeholder="Your agency (if any)" />
          <FormField label="Years of Experience" type="number" value={yearsExperience} onChange={setYearsExperience} />
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#A9B4C2", marginBottom: "7px" }}>Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical", boxSizing: "border-box", minHeight: 80 }}
            />
          </div>
        </div>
      </Card>

      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Service Cities</h3>
        <CityMultiSelect selected={cities} onChange={setCities} />
      </Card>

      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Account Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Email Address", email, () => {}, { readOnly: true })}
        </div>
      </Card>

      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Leaderboard</h3>
        <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={participating}
            onChange={e => setParticipating(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#10C4C3", cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px", color: "#FFFFFF" }}>Show me on the team leaderboard</span>
        </label>
        <p style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "8px", marginLeft: "30px" }}>
          Unchecking this hides you from other agents' leaderboard view entirely — admins can still see your numbers in their own comparison view either way.
        </p>
      </Card>

      <Card style={{ padding: "28px 32px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 6, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>KYC Documents</h3>
        <p style={{ fontSize: 13, color: "#A9B4C2", margin: "12px 0 18px" }}>
          Upload these to complete your agent verification. Not required for approval, but the sooner they&apos;re on file the sooner our team can review them.
        </p>
        {docsLoading ? <Spinner /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {KYC_DOCUMENT_SLOTS.map(slot => {
              const current = documents.find(d => d.document_type === slot.key); // documents is created_at desc, so first match is most recent
              const isUploading = uploadingSlot === slot.key;
              const message = slotMessages[slot.key];
              return (
                <div key={slot.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", marginBottom: "3px" }}>{slot.label}</div>
                    {current ? (
                      <div style={{ fontSize: "12px", color: "#A9B4C2" }}>{current.file_name ?? "Uploaded file"} · {fmtDocDate(current.created_at)}</div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#6B7686" }}>Not uploaded yet</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {message && (
                      <span style={{ fontSize: "12px", fontWeight: 600, color: message.type === "error" ? "#F87171" : "#4ADE80", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        {message.type === "error" ? "⚠" : "✓"} {message.text}
                      </span>
                    )}
                    <input
                      ref={el => { fileInputs.current[slot.key] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadDocument(slot.key, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputs.current[slot.key]?.click()}
                      disabled={isUploading}
                      style={{ padding: "8px 18px", background: current ? "rgba(255,255,255,0.06)" : "#10C4C3", border: current ? "1.5px solid rgba(255,255,255,0.15)" : "none", borderRadius: "8px", color: current ? "#FFFFFF" : "#020C1C", fontSize: "12px", fontWeight: 700, cursor: isUploading ? "default" : "pointer", opacity: isUploading ? 0.6 : 1, fontFamily: "var(--font-body-new)", whiteSpace: "nowrap" }}
                    >
                      {isUploading ? "Uploading…" : current ? "Replace" : "Upload"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab 3: Saved Properties ───────────────────────────────────────────────────

function SavedTab({ savedItems, loading, onRemove }: {
  savedItems: SavedItem[];
  loading: boolean;
  onRemove: (saveId: string) => void;
}) {
  if (loading) return <Spinner />;

  const count = savedItems.length;

  return (
    <div>
      <SectionHeading
        title="Saved Properties"
        subtitle={count ? `${count} saved propert${count !== 1 ? "ies" : "y"}` : undefined}
      />

      {count === 0 ? (
        <Card>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
            title="No saved properties yet"
            subtitle="Browse our premium listings and tap the heart icon to save properties you love."
            cta="Browse Properties"
            ctaHref="/properties"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {savedItems.map(item => {
            const pd = item.property_data;
            const title    = pd && typeof pd.title    === "string" ? pd.title    : null;
            const city     = pd && typeof pd.city     === "string" ? pd.city     : null;
            const price    = pd && typeof pd.price    === "number" ? pd.price    : null;
            const propType = pd && typeof pd.property_type === "string" ? pd.property_type : null;
            const image    = pd && typeof pd.image    === "string" ? pd.image    : null;
            return (
              <Card key={item.id} style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "16px", flex: 1, minWidth: 0 }}>
                    {image && (
                      <img src={optimizedImageUrl(image, 160)} alt={title ?? "Property"} loading="lazy" style={{ width: "80px", height: "64px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {propType && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "capitalize", background: "rgba(255,255,255,0.05)", color: "#A9B4C2", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "6px" }}>
                          {propType}
                        </span>
                      )}
                      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title ?? `Property ID: ${item.property_id ?? "—"}`}
                      </h3>
                      {city && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#A9B4C2" }}>
                          <IconPin />{city}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>Saved {formatDate(item.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
                    {price != null && (
                      <div style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF" }}>
                        {formatPrice(price, null)}
                      </div>
                    )}
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "12px", color: "#F87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: "7px", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                    >
                      <IconTrash /> Remove
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Profile ────────────────────────────────────────────────────────────

type ProfileForm = {
  full_name: string; city: string; phone: string; bio: string;
  whatsapp: string; date_of_birth: string; gender: string;
  nationality: string; is_nri: boolean;
};

function pField(label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; readOnly?: boolean }) {
  const ro = opts?.readOnly;
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#A9B4C2", marginBottom: 7 }}>{label}</label>
      <input
        type={opts?.type ?? "text"}
        value={value}
        readOnly={ro}
        placeholder={opts?.placeholder}
        onChange={e => !ro && onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", background: ro ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: ro ? "rgba(255,255,255,0.45)" : "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", boxSizing: "border-box" as const, cursor: ro ? "not-allowed" : "text" }}
      />
    </div>
  );
}

function pSelect(label: string, value: string, onChange: (v: string) => void, options: {value: string; label: string}[], placeholder?: string) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#A9B4C2", marginBottom: 7 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: value ? "#FFFFFF" : "rgba(255,255,255,0.45)", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: "pointer" }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 10 }}>▼</span>
      </div>
    </div>
  );
}

function ProfileTab({ email, userId, profile, loading, onSave }: {
  email: string;
  userId: string;
  profile: ProfileData | null;
  loading: boolean;
  onSave: (updates: ProfileData) => Promise<boolean>;
}) {
  const [form, setForm] = useState<ProfileForm>({
    full_name: "", city: "", phone: "", bio: "",
    whatsapp: "", date_of_birth: "", gender: "", nationality: "", is_nri: false,
  });
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name:     profile.full_name    ?? "",
      city:          profile.city         ?? "",
      phone:         profile.phone        ?? "",
      bio:           profile.bio          ?? "",
      whatsapp:      profile.whatsapp     ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      gender:        profile.gender       ?? "",
      nationality:   profile.nationality  ?? "",
      is_nri:        profile.is_nri       ?? false,
    });
  }, [profile]);

  const set = (field: keyof ProfileForm) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const completion = calcCompletion({
    full_name:     form.full_name    || null,
    city:          form.city         || null,
    phone:         form.phone        || null,
    bio:           form.bio          || null,
    avatar_url:    profile?.avatar_url  ?? null,
    whatsapp:      form.whatsapp     || null,
    date_of_birth: form.date_of_birth || null,
    gender:        form.gender       || null,
    nationality:   form.nationality  || null,
    is_nri:        form.is_nri,
  });

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    const ok = await onSave({
      full_name:    form.full_name.trim()    || null,
      city:         form.city.trim()         || null,
      phone:        form.phone.trim()        || null,
      bio:          form.bio.trim()          || null,
      avatar_url:   profile?.avatar_url      ?? null,
      whatsapp:     form.whatsapp.trim()     || null,
      date_of_birth: form.date_of_birth      || null,
      gender:       form.gender              || null,
      nationality:  form.nationality.trim()  || null,
      is_nri:       form.is_nri,
    });
    setSaving(false);
    setToast(ok ? { ok: true, msg: "Profile saved successfully" } : { ok: false, msg: "Save failed. Please try again." });
    if (ok) setTimeout(() => setToast(null), 3000);
  };

  if (loading) return <Spinner />;

  const displayName = form.full_name.trim() || email.split("@")[0];
  const avatarSrc   = profile?.avatar_url;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 88, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 16, background: "rgba(18,21,25,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${toast.ok ? "rgba(16,196,195,0.30)" : "rgba(248,113,113,0.30)"}`, color: toast.ok ? "#FFFFFF" : "#F87171", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <SectionHeading title="My Profile" subtitle="Manage your personal information and account preferences." />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "11px 28px", background: "#10C4C3", borderRadius: 999, color: "#000", fontSize: 13, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: saving ? 0.7 : 1, flexShrink: 0, boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Avatar + completion header */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarSrc ? "transparent" : "rgba(16,196,195,0.12)", border: "2.5px solid rgba(16,196,195,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {avatarSrc
              ? <img src={optimizedImageUrl(avatarSrc, 160)} alt={displayName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 28, fontWeight: 700, color: "#10C4C3", fontFamily: "var(--font-body-new)" }}>{displayName[0].toUpperCase()}</span>
            }
          </div>
          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: "var(--font-heading-new)", fontSize: 24, fontWeight: 600, color: "#FFFFFF" }}>{displayName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontSize: 13, color: "#A9B4C2" }}>{email}</span>
            </div>
          </div>
          {/* Completion */}
          <div style={{ minWidth: 160, flex: "0 0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF" }}>Profile Completion</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: completion === 100 ? "#4ADE80" : "#10C4C3" }}>{completion}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.10)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completion}%`, background: completion === 100 ? "#4ADE80" : "#10C4C3", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 5 }}>{8 - Math.round(completion / 100 * 8)} field{8 - Math.round(completion / 100 * 8) !== 1 ? "s" : ""} remaining</div>
          </div>
        </div>
      </Card>

      {/* Main info */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Personal Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Full Name",    form.full_name, set("full_name") as (v: string) => void, { placeholder: "Your full name" })}
          {pField("Phone Number", form.phone,     set("phone")     as (v: string) => void, { type: "tel", placeholder: "+91 98765 43210" })}
          {pField("City",         form.city,      set("city")      as (v: string) => void, { placeholder: "e.g. Hyderabad" })}
          {pField("WhatsApp",     form.whatsapp,  set("whatsapp")  as (v: string) => void, { type: "tel", placeholder: "+91 98765 43210" })}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: 7 }}>Bio</label>
            <textarea
              value={form.bio}
              placeholder="A short bio about yourself"
              onChange={e => set("bio")(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical", boxSizing: "border-box", minHeight: 80 }}
            />
          </div>
        </div>
      </Card>

      {/* Additional info */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Additional Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Date of Birth", form.date_of_birth, set("date_of_birth") as (v: string) => void, { type: "date" })}
          {pSelect("Gender", form.gender, set("gender") as (v: string) => void,
            [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }],
            "Select gender"
          )}
          {pField("Nationality",  form.nationality,  set("nationality")  as (v: string) => void, { placeholder: "e.g. Indian" })}
          {/* NRI toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A9B4C2", marginBottom: 12 }}>NRI Status</label>
            <button
              type="button"
              onClick={() => set("is_nri")(!form.is_nri)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: form.is_nri ? "rgba(16,196,195,0.10)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${form.is_nri ? "rgba(16,196,195,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-body-new)", width: "100%", textAlign: "left" as const }}
            >
              <div style={{ width: 36, height: 20, borderRadius: 10, background: form.is_nri ? "#10C4C3" : "rgba(255,255,255,0.15)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: form.is_nri ? 19 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: form.is_nri ? 600 : 400, color: form.is_nri ? "#10C4C3" : "#A9B4C2" }}>
                {form.is_nri ? "NRI — Non-Resident Indian" : "Resident Indian"}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Read-only account info */}
      <Card style={{ padding: "28px 32px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Account Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Email Address", email,                    () => {}, { readOnly: true })}
          {pField("Account ID",    userId.slice(0, 8) + "…", () => {}, { readOnly: true })}
        </div>
      </Card>
    </div>
  );
}

function SearchesTab() {
  return <SavedSearchesList />;
}

function InquiryTypeBadge({ type }: { type: string | null }) {
  const isViewing = type === "viewing";
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: isViewing ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.10)", color: isViewing ? "#10C4C3" : "#A9B4C2", border: `1px solid ${isViewing ? "rgba(16,196,195,0.30)" : "rgba(255,255,255,0.18)"}` }}>
      {isViewing ? "Viewing" : "Callback"}
    </span>
  );
}

function InquiryStatusBadge({ status }: { status: string | null }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    new:      { label: "New",       bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
    contacted:{ label: "Contacted", bg: "rgba(74,222,128,0.15)",   color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
    closed:   { label: "Closed",    bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
  };
  const c = cfg[status ?? ""] ?? { label: status ?? "—", bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

const STATUS_PILLS: { value: string; label: string; activeStyle: React.CSSProperties; inactiveStyle: React.CSSProperties }[] = [
  {
    value: "new",
    label: "New",
    activeStyle:   { background: "#10C4C3", color: "#000", borderColor: "#10C4C3" },
    inactiveStyle: { background: "transparent", color: "#10C4C3", borderColor: "rgba(16,196,195,0.4)" },
  },
  {
    value: "contacted",
    label: "Contacted",
    activeStyle:   { background: "#4ADE80", color: "#000", borderColor: "#4ADE80" },
    inactiveStyle: { background: "transparent", color: "#4ADE80", borderColor: "rgba(74,222,128,0.4)" },
  },
  {
    value: "closed",
    label: "Closed",
    activeStyle:   { background: "#A9B4C2", color: "#000", borderColor: "#A9B4C2" },
    inactiveStyle: { background: "transparent", color: "#A9B4C2", borderColor: "rgba(255,255,255,0.25)" },
  },
];

function InquiriesTab({
  inquiries,
  loading,
  onStatusChange,
  properties,
  filterPropertyId,
  onFilterChange,
}: {
  inquiries: Inquiry[];
  loading: boolean;
  onStatusChange: (inquiryId: string, newStatus: string) => Promise<void>;
  properties: Listing[];
  filterPropertyId: string | null;
  onFilterChange: (propertyId: string | null) => void;
}) {
  if (loading) return <Spinner />;

  // Filtered client-side against the already-fetched full inquiries list —
  // this seller's own inquiry volume never justifies a second round-trip
  // to Supabase just to narrow by property_id.
  const visibleInquiries = filterPropertyId
    ? inquiries.filter(i => i.property_id === filterPropertyId)
    : inquiries;
  const count = visibleInquiries.length;
  const filteredProperty = filterPropertyId ? properties.find(p => p.id === filterPropertyId) : null;

  return (
    <div>
      <SectionHeading
        title="Inquiries"
        subtitle={count ? `${count} inquir${count !== 1 ? "ies" : "y"} received on your listings` : "Inquiries from interested buyers."}
      />

      {/* Property filter — deep-linkable via ?property=, and manually
          selectable here too, per explicit spec. */}
      {properties.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
          <select
            value={filterPropertyId ?? "all"}
            onChange={e => onFilterChange(e.target.value === "all" ? null : e.target.value)}
            style={{
              padding: "9px 14px", borderRadius: "8px", fontSize: "13px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF", fontFamily: "var(--font-body-new)", cursor: "pointer",
            }}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.title ?? "Untitled listing"}</option>
            ))}
          </select>

          {filteredProperty && (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", background: "rgba(16,196,195,0.1)", border: "1px solid rgba(16,196,195,0.25)", borderRadius: "100px", fontSize: "12px", color: "#10C4C3" }}>
              Showing inquiries for: <strong>{filteredProperty.title ?? "this listing"}</strong>
              <button
                onClick={() => onFilterChange(null)}
                aria-label="Clear property filter"
                style={{ background: "none", border: "none", color: "#10C4C3", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: 0, fontWeight: 700 }}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {count === 0 ? (
        <Card>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            title="No inquiries yet"
            subtitle="When buyers contact you about your listings, their requests will appear here."
            cta="View My Listings"
            ctaHref="/properties"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {visibleInquiries.map(inq => (
            <Card key={inq.id} style={{ padding: "20px 24px" }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#FFFFFF" }}>
                    {inq.inquirer_name ?? "Anonymous"}
                  </span>
                  <InquiryTypeBadge type={inq.inquiry_type} />
                  <InquiryStatusBadge status={inq.status} />
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{formatDate(inq.created_at)}</span>
              </div>

              {/* Property */}
              {inq.property_title && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "13px", color: "#A9B4C2" }}>
                  <IconBuilding />
                  {inq.property_slug
                    ? <a href={`/property/${inq.property_slug}`} style={{ color: "#FFFFFF", fontWeight: 500, textDecoration: "none" }}>{inq.property_title}</a>
                    : <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{inq.property_title}</span>}
                </div>
              )}

              {/* Contact row */}
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: inq.message ? "12px" : "14px" }}>
                {inq.inquirer_phone && (
                  <a href={`tel:${inq.inquirer_phone}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {inq.inquirer_phone}
                  </a>
                )}
                {inq.inquirer_email && (
                  <a href={`mailto:${inq.inquirer_email}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#A9B4C2", textDecoration: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                    {inq.inquirer_email}
                  </a>
                )}
              </div>

              {/* Message */}
              {inq.message && (
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#A9B4C2", lineHeight: 1.6, borderLeft: "3px solid rgba(16,196,195,0.5)", marginBottom: "14px" }}>
                  {inq.message}
                </div>
              )}

              {/* Status control */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Status:</span>
                {STATUS_PILLS.map(pill => {
                  const isActive = (inq.status ?? "new") === pill.value;
                  return (
                    <button
                      key={pill.value}
                      disabled={isActive}
                      onClick={() => { void onStatusChange(inq.id, pill.value); }}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "100px",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        border: "1.5px solid",
                        cursor: isActive ? "default" : "pointer",
                        fontFamily: "var(--font-support-new)",
                        transition: "all 0.15s",
                        ...(isActive ? pill.activeStyle : pill.inactiveStyle),
                      }}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// My Appointments (Phase 26) — site_visits where visitor_user_id =
// self (048, live). Reuses VisitStatusBadge from the agent-side
// site-visits list (src/app/agent/site-visits/page.tsx) rather than
// redefining status colors a third time — same cross-route module-
// import pattern already used elsewhere tonight (e.g. tasks/[id]
// importing from messages/page). Rows booked before 048, or booked
// signed-out, have visitor_user_id = null and correctly never appear
// here — not a bug, per 048's own header.
interface MyVisitRow {
  id: string;
  property_slug: string | null;
  property_title: string | null;
  visit_date: string;
  visit_time_slot: string;
  status: string;
}

function AppointmentsTab({ userId }: { userId: string }) {
  const [visits, setVisits] = useState<MyVisitRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("site_visits")
        .select("id, property_slug, property_title, visit_date, visit_time_slot, status")
        .eq("visitor_user_id", userId)
        .order("visit_date", { ascending: false });
      if (error) console.error("Dashboard — my site visits query error:", error);
      if (!cancelled) setVisits((data as MyVisitRow[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (visits === null) return <Spinner />;

  return (
    <div>
      <SectionHeading title="My Appointments" subtitle="Upcoming and past property viewings." />
      {visits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            title="No appointments scheduled"
            subtitle="Book a viewing from any property page and it'll appear here with all the details."
            cta="Browse Properties"
            ctaHref="/properties"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {visits.map(v => (
            <Card key={v.id} style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                {v.property_slug ? (
                  <a href={`/property/${v.property_slug}`} style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF", textDecoration: "none" }}>
                    {v.property_title ?? "Property"}
                  </a>
                ) : (
                  <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#FFFFFF" }}>{v.property_title ?? "Property"}</span>
                )}
                <VisitStatusBadge status={v.status} />
              </div>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#A9B4C2" }}>
                <span>{formatDate(v.visit_date)}</span>
                <span>{v.visit_time_slot}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ email, fullName }: { email: string; fullName?: string }) {
  const [name,      setName]      = useState(fullName || "");
  const [phone,     setPhone]     = useState("");
  const [cities,    setCities]    = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [curPw,     setCurPw]     = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confPw,    setConfPw]    = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved,      setPwSaved]      = useState(false);
  const [deleteMode,   setDeleteMode]   = useState(false);

  return (
    <div>
      <SectionHeading title="Account Settings" subtitle="Manage your preferences and security." />

      <Card style={{ padding: "32px", marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Preferences</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 24px" }}>
          <FormField label="Full Name"        value={name}      onChange={setName}      placeholder="Your full name" />
          <FormField label="Email Address"    value={email}     readOnly />
          <FormField label="Phone Number"     value={phone}     onChange={setPhone}     placeholder="+91 98765 43210" type="tel" />
          <FormField label="Preferred Cities" value={cities}    onChange={setCities}    placeholder="e.g. Hyderabad, Mumbai" />
          <FormField label="Budget Min (₹)"   value={budgetMin} onChange={setBudgetMin} placeholder="e.g. 5000000"  type="number" />
          <FormField label="Budget Max (₹)"   value={budgetMax} onChange={setBudgetMax} placeholder="e.g. 20000000" type="number" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
          <button
            onClick={() => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2600); }}
            style={{ padding: "11px 30px", background: "#10C4C3", border: "none", borderRadius: "999px", color: "#000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
          >Save Changes</button>
          {profileSaved && <span style={{ fontSize: "13px", color: "#10C4C3", fontWeight: 500 }}>✓ Changes saved</span>}
        </div>
      </Card>

      <Card style={{ padding: "32px", marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Change Password</h3>
        <div style={{ maxWidth: "440px" }}>
          <FormField label="Current Password"     type="password" value={curPw}  onChange={setCurPw}  placeholder="Enter current password" />
          <FormField label="New Password"         type="password" value={newPw}  onChange={setNewPw}  placeholder="At least 8 characters" />
          <FormField label="Confirm New Password" type="password" value={confPw} onChange={setConfPw} placeholder="Repeat new password" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
          <button
            onClick={() => { setPwSaved(true); setCurPw(""); setNewPw(""); setConfPw(""); setTimeout(() => setPwSaved(false), 2600); }}
            style={{ padding: "11px 28px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >Update Password</button>
          {pwSaved && <span style={{ fontSize: "13px", color: "#10C4C3", fontWeight: 500 }}>✓ Password updated</span>}
        </div>
      </Card>

      <Card style={{ padding: "32px", border: "1px solid rgba(248,113,113,0.25)" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: "#F87171", marginBottom: "10px" }}>Danger Zone</h3>
        <p style={{ fontSize: "13px", color: "#A9B4C2", marginBottom: "20px", lineHeight: 1.65 }}>
          Permanently delete your Nilay 360 account. All saved properties, inquiries, and preferences will be removed. This cannot be undone.
        </p>
        {!deleteMode ? (
          <button onClick={() => setDeleteMode(true)} style={{ padding: "10px 22px", background: "rgba(248,113,113,0.10)", border: "1.5px solid rgba(248,113,113,0.4)", borderRadius: "8px", color: "#F87171", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Delete Account</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F87171" }}>Are you absolutely sure?</span>
            <button style={{ padding: "9px 20px", background: "#B91C1C", border: "none", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Yes, Delete My Account</button>
            <button onClick={() => setDeleteMode(false)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#A9B4C2", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Cancel</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardClient({ email, userId, fullName, accountType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: authProfile, loading: authLoading } = useAuth();
  const isAgent = authProfile?.role === "agent" || authProfile?.role === "builder";

  const [active,      setActive]      = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inquiryPropertyFilter, setInquiryPropertyFilter] = useState<string | null>(null);

  // Deep-link support for "View Inquiries" (MyListingsList) — reads
  // ?tab=&property= on mount and whenever the query changes (e.g.
  // clicking a second "View Inquiries" button while already on this
  // page navigates client-side without remounting).
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && VALID_TABS.includes(tabParam as Tab)) {
      setActive(tabParam as Tab);
    }
    const propertyParam = searchParams?.get("property");
    if (propertyParam) setInquiryPropertyFilter(propertyParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Escape closes the sidebar drawer whenever it's open — additive,
  // non-visual, and only acts when sidebarOpen is already true, so it
  // changes nothing about the buyer/seller shell's layout or styling
  // (their drawer only ever opens below 800px, same as before; it can
  // now also be dismissed with Escape, not just outside-click).
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  // Data (buyer/seller)
  const [listings,         setListings]         = useState<Listing[]>([]);
  const [savedItems,       setSavedItems]       = useState<SavedItem[]>([]);
  const [inquiries,        setInquiries]        = useState<Inquiry[]>([]);
  const [profile,          setProfile]          = useState<ProfileData | null>(null);
  const [dataLoading,      setDataLoading]       = useState(true);
  const [hasSavedTable,    setHasSavedTable]    = useState(true);

  // Data (agent)
  const [agentProfile,     setAgentProfile]     = useState<AgentProfileData | null>(null);
  const [assignedListings, setAssignedListings] = useState<Listing[]>([]);

  // Wait on role resolution before fetching — avoids firing the wrong branch's
  // queries on first render (profile.role isn't known until AuthContext resolves).
  useEffect(() => {
    if (authLoading) return;
    const supabase = createClient();
    let cancelled = false;

    const loadAgent = async () => {
      const { data: apRow, error: apErr } = await supabase
        .from("agent_profiles")
        .select("id, license_number, agency_name, bio, years_experience, leaderboard_opt_out, rera_number, agent_service_cities(city)")
        .eq("user_id", userId)
        .maybeSingle();
      if (apErr) console.error("Dashboard — agent_profiles query error:", apErr);
      if (cancelled) return;

      if (apRow) {
        const cities = ((apRow.agent_service_cities as { city: string }[] | null) ?? []).map(c => c.city);
        setAgentProfile({
          id: apRow.id,
          license_number: apRow.license_number,
          agency_name: apRow.agency_name,
          bio: apRow.bio,
          years_experience: apRow.years_experience,
          cities,
          leaderboard_opt_out: apRow.leaderboard_opt_out,
          rera_number: apRow.rera_number,
        });

        const { data: listData, error: listErr } = await supabase
          .from("property_listings")
          .select("id, slug, title, property_category, listing_type, city, locality, price, status, submitted_at, photo_urls")
          .eq("assigned_agent_id", apRow.id)
          .order("submitted_at", { ascending: false });
        if (listErr) console.error("Dashboard — assigned listings query error:", listErr);
        const assignedBase = (listData as Listing[] | null) ?? [];
        if (!cancelled) setAssignedListings(await withViewCounts(supabase, assignedBase));
      }

      // ── My Listings (this agent's own posted listings) ──────────
      // Same query shape loadBuyerSeller() uses for a seller's own listings —
      // deliberately NOT calling loadBuyerSeller() itself, which also loads
      // Saved Properties, seller-received Inquiries, and the buyer/seller
      // Profile shape, none of which apply to (or are even rendered for) an
      // agent session. assigned_agent_id is unrelated to this: it's only
      // ever set later by an admin (admin/page.tsx's handleAssignAgent), so
      // an agent's own posted listing has assigned_agent_id = NULL until/
      // unless an admin separately assigns it — including possibly back to
      // this same agent, in which case it correctly appears in both tabs.
      const ownListingsFilter = `seller_email.eq.${email},user_id.eq.${userId}`;
      const { data: ownListData, error: ownListErr } = await supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, status, submitted_at, photo_urls")
        .or(ownListingsFilter)
        .order("submitted_at", { ascending: false });
      if (ownListErr) console.error("Dashboard — agent's own listings query error:", ownListErr);
      const ownListingsBase = (ownListData as Listing[] | null) ?? [];
      if (!cancelled) setListings(await withViewCounts(supabase, ownListingsBase));

      if (!cancelled) setDataLoading(false);
    };

    const loadBuyerSeller = async () => {
      // ── My Listings ──────────────────────────────────────────
      const listingsFilter = `seller_email.eq.${email},user_id.eq.${userId}`;
      const { data: listData, error: listErr } = await supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, status, submitted_at")
        .or(listingsFilter)
        .order("submitted_at", { ascending: false });
      if (listErr) console.error("Dashboard — property_listings query error:", listErr);
      const listingsBase = (listData as Listing[] | null) ?? [];
      if (!cancelled) setListings(await withViewCounts(supabase, listingsBase));

      // ── Saved Properties ──────────────────────────────────────
      const { data: saveData, error: saveErr } = await supabase
        .from("saved_properties")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (saveErr && (saveErr.message?.includes("does not exist") || saveErr.code === "42P01")) {
          console.error("Dashboard — saved_properties table missing:", saveErr);
          setHasSavedTable(false);
        } else {
          if (saveErr) console.error("Dashboard — saved_properties query error:", saveErr);
          if (!cancelled) setSavedItems((saveData as SaveRow[] | null) ?? []);
        }
      }

      // ── Inquiries (received as seller) ────────────────────────
      const { data: inqData, error: inqErr } = await supabase
        .from("inquiries")
        .select("*")
        .eq("seller_email", email)
        .order("created_at", { ascending: false });
      if (inqErr) console.error("Dashboard — inquiries query error:", inqErr);
      if (!cancelled) setInquiries((inqData as Inquiry[] | null) ?? []);

      // ── Profile ───────────────────────────────────────────────
      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("full_name, city, phone, bio, avatar_url, whatsapp, date_of_birth, gender, nationality, is_nri")
        .eq("id", userId)
        .maybeSingle();
      if (profErr) console.error("Dashboard — profile query error:", profErr);
      if (!cancelled && profData) setProfile(profData as ProfileData);

      if (!cancelled) setDataLoading(false);
    };

    if (isAgent) void loadAgent(); else void loadBuyerSeller();
    return () => { cancelled = true; };
  }, [email, userId, isAgent, authLoading]);

  const deleteListing = useCallback(async (listingId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").delete().eq("id", listingId);
    if (error) console.error("Dashboard — delete listing error:", error);
    else setListings(prev => prev.filter(l => l.id !== listingId));
  }, []);

  // Remove a saved property
  const removeSave = useCallback(async (saveId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("saved_properties").delete().eq("id", saveId);
    if (error) console.error("Dashboard — remove save error:", error);
    else setSavedItems(prev => prev.filter(s => s.id !== saveId));
  }, []);

  // Update inquiry status with optimistic UI
  const updateInquiryStatus = useCallback(async (inquiryId: string, newStatus: string): Promise<void> => {
    const prev = inquiries.find(i => i.id === inquiryId)?.status ?? null;
    setInquiries(list => list.map(i => i.id === inquiryId ? { ...i, status: newStatus } : i));
    const supabase = createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ status: newStatus })
      .eq("id", inquiryId);
    if (error) {
      console.error("Dashboard — inquiry status update error:", error);
      setInquiries(list => list.map(i => i.id === inquiryId ? { ...i, status: prev } : i));
    }
  }, [inquiries]);

  // Upsert profile and update local state
  const updateProfile = useCallback(async (updates: ProfileData): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id:            userId,
        full_name:     updates.full_name,
        city:          updates.city,
        phone:         updates.phone,
        bio:           updates.bio,
        whatsapp:      updates.whatsapp,
        date_of_birth: updates.date_of_birth || null,
        gender:        updates.gender,
        nationality:   updates.nationality,
        is_nri:        updates.is_nri,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "id" });
    if (error) console.error("Dashboard — profile upsert error:", error);
    else setProfile(updates);
    return !error;
  }, [userId]);

  // Upsert agent_profiles + replace agent_service_cities, update local state
  const updateAgentProfile = useCallback(async (updates: Omit<AgentProfileData, "id">): Promise<boolean> => {
    if (!agentProfile) return false;
    const supabase = createClient();
    const { error: apErr } = await supabase
      .from("agent_profiles")
      .update({
        license_number:   updates.license_number,
        agency_name:      updates.agency_name,
        bio:               updates.bio,
        years_experience: updates.years_experience,
        leaderboard_opt_out: updates.leaderboard_opt_out,
        rera_number:      updates.rera_number,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", agentProfile.id);
    if (apErr) {
      console.error("Dashboard — agent_profiles update error:", apErr);
      return false;
    }

    // Replace service cities wholesale — simplest correct approach for a small set.
    const { error: delErr } = await supabase.from("agent_service_cities").delete().eq("agent_id", agentProfile.id);
    if (delErr) console.error("Dashboard — agent_service_cities delete error:", delErr);
    if (updates.cities.length > 0) {
      const { error: insErr } = await supabase
        .from("agent_service_cities")
        .insert(updates.cities.map(city => ({ agent_id: agentProfile.id, city })));
      if (insErr) console.error("Dashboard — agent_service_cities insert error:", insErr);
    }

    setAgentProfile({ ...agentProfile, ...updates });
    return true;
  }, [agentProfile]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Block the shell until role is known — prevents a buyer-nav flash before
  // flipping to the agent nav (all hooks above have already run, so this
  // early return is safe).
  if (authLoading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#020C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  const name = fullName || email.split("@")[0];
  const type = isAgent ? "Agent" : (accountType || "Individual");

  const content: Record<Tab, React.ReactNode> = {
    overview:     isAgent
      ? <AgentOverviewTab fullName={fullName} email={email} assignedListings={assignedListings} agentProfileId={agentProfile?.id ?? null} userId={userId} />
      : <OverviewTab      email={email} fullName={fullName} listings={listings} savedItems={savedItems} profile={profile} userId={userId} />,
    listings:     <ListingsTab     listings={listings} loading={dataLoading} onDelete={deleteListing} onViewInquiries={listing => router.push(isAgent ? `/agent/leads?property=${listing.id}` : `/dashboard?tab=inquiries&property=${listing.id}`)} />,
    assigned:     <AssignedListingsTab listings={assignedListings} loading={dataLoading} userId={userId} />,
    saved:        <SavedTab        savedItems={savedItems} loading={dataLoading} onRemove={removeSave} />,
    searches:     <SearchesTab />,
    profile:      isAgent
      ? <AgentProfileTab email={email} userId={userId} agentProfile={agentProfile} loading={dataLoading} onSave={updateAgentProfile} />
      : <ProfileTab      email={email} userId={userId} profile={profile} loading={dataLoading} onSave={updateProfile} />,
    inquiries:    <InquiriesTab    inquiries={inquiries} loading={dataLoading} onStatusChange={updateInquiryStatus} properties={listings} filterPropertyId={inquiryPropertyFilter} onFilterChange={setInquiryPropertyFilter} />,
    appointments: <AppointmentsTab userId={userId} />,
    settings:     <SettingsTab     email={email} fullName={fullName} />,
  };

  // Agent branch (Phase 24) — the drawer/toggle-bar/overlay mechanics
  // now live in the shared AgentDrawerChrome component (also used by
  // src/app/agent/layout.tsx for every other /agent/* page), not
  // inlined here. Behavior is unchanged from before the extraction:
  // same NAV_AGENT list, same tab-switching via active/setActive, same
  // fade-in on tab change (contentKey={active}).
  if (isAgent) {
    return (
      <>
        <style>{`
          @media (max-width: 900px) {
            .agent-overview-2col { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <AgentDrawerChrome
          nav={NAV_AGENT}
          activeId={active}
          onActivate={id => setActive(id)}
          userName={name}
          userEmail={email}
          userType={type}
          onSignOut={handleSignOut}
          contentKey={active}
        >
          {content[active]}
        </AgentDrawerChrome>
      </>
    );
  }

  // Buyer/seller branch — untouched, same markup as before this
  // refactor (does not use AgentDrawerChrome; its own drawer only
  // ever activates below 800px, a different behavior than the
  // agent-only always-on drawer, so it keeps its own independent
  // implementation rather than being forced through the same shared
  // component).
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: rgba(16,196,195,0.55) !important; box-shadow: 0 0 0 3px rgba(16,196,195,0.07) !important; }
        .dash-sb-btn:hover { color: rgba(255,255,255,0.9) !important; }
        @media (max-width: 800px) {
          .dash-aside {
            position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important;
            z-index: 400 !important; height: 100dvh !important;
            transform: translateX(-100%) !important;
            transition: transform 0.27s cubic-bezier(.4,0,.2,1) !important;
          }
          .dash-aside.sb-open { transform: translateX(0) !important; }
          .dash-content { padding: 24px 18px 72px !important; }
          .mob-bar { display: flex !important; }
        }
        @media (max-width: 900px) {
          .buyer-overview-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100dvh", background: "#020C1C", display: "flex", flexDirection: "column" }}>

        {/* Mobile toggle bar */}
        <div className="mob-bar" style={{ display: "none", position: "sticky", top: "64px", zIndex: 200, padding: "10px 16px", background: "#020C1C", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(16,196,195,0.1)", flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ display: "flex", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "7px", cursor: "pointer", color: "#fff" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Dashboard</span>
        </div>

        <div style={{ display: "flex", flex: 1, paddingTop: "64px" }}>

          {/* Sidebar */}
          <aside
            className={`dash-aside${sidebarOpen ? " sb-open" : ""}`}
            style={{ width: "260px", flexShrink: 0, background: "#0A1526", borderRight: "1px solid rgba(255,255,255,0.07)", height: "calc(100vh - 64px)", position: "sticky", top: "64px", display: "flex", flexDirection: "column", overflowY: "auto" }}
          >
            {/* User card */}
            <div style={{ padding: "26px 18px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(16,196,195,0.16)", border: "2px solid rgba(16,196,195,0.32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#10C4C3", letterSpacing: "0.06em", marginBottom: "12px" }}>
                {initials(email, fullName)}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginBottom: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", background: type === "Agent" ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.10)", color: type === "Agent" ? "#10C4C3" : "#A9B4C2", border: `1px solid ${type === "Agent" ? "rgba(16,196,195,0.30)" : "rgba(255,255,255,0.18)"}` }}>
                {type}
              </span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              {NAV.map(item => (
                <button
                  key={item.id}
                  data-tab={item.id}
                  className="dash-sb-btn"
                  onClick={() => { setActive(item.id!); setSidebarOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: active === item.id ? "rgba(16,196,195,0.11)" : "transparent", border: active === item.id ? "1px solid rgba(16,196,195,0.18)" : "1px solid transparent", color: active === item.id ? "#10C4C3" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: active === item.id ? 600 : 400, cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left", transition: "all 0.14s" }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Sign out */}
            <div style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={handleSignOut}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(239,68,68,0.14)", color: "rgba(252,165,165,0.75)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left", transition: "all 0.14s" }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(239,68,68,0.14)"; b.style.color = "#FCA5A5"; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(248,113,113,0.12)"; b.style.color = "rgba(252,165,165,0.75)"; }}
              >
                <IconOut /> Sign Out
              </button>
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 390, backdropFilter: "blur(2px)" }} />
          )}

          {/* Content */}
          <main
            className="dash-content"
            key={active}
            style={{ flex: 1, minWidth: 0, padding: "36px 40px 80px", animation: "fadeSlide 0.22s ease-out" }}
          >
            {content[active]}
          </main>
        </div>
      </div>
    </>
  );
}
