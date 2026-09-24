"use client";
import React, { Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CITIES } from "@/constants";
import { optimizedImageUrl } from "@/lib/image-url";
import AgentPerformanceSection from "./AgentPerformanceSection";
import LeaderboardSection from "./LeaderboardSection";
import ListingsSubmittedOverTimeChart from "./ListingsSubmittedOverTimeChart";
import AgentApplicationsOverTimeChart from "./AgentApplicationsOverTimeChart";
import InquiriesOverTimeChart from "./InquiriesOverTimeChart";
import VideoSlide from "@/components/property/VideoSlide";

// ── Types ──────────────────────────────────────────────────────────────────────

type AdminSection = "overview" | "listings" | "users" | "inquiries" | "agents" | "capture360" | "performance" | "leaderboard" | "reports" | "content" | "contacts" | "audit";

type Stats = {
  pending: number;
  active: number;
  rejected: number;
  users: number;
  inquiries: number;
  reportsOpen: number;
  totalViews: number;
};

// Maps a property_listings.status value to its Stats bucket key —
// changes_requested/frozen intentionally have no entry (no counters for
// them exist on Stats), so bumpStats treats those as a no-op rather than
// an error.
const LISTING_STATS_KEY: Record<string, keyof Stats | undefined> = {
  pending_review: "pending",
  active: "active",
  rejected: "rejected",
};

type AdminListing = {
  id: string;
  slug: string | null;
  title: string | null;
  property_category: string | null;
  listing_type: string | null;
  city: string | null;
  locality: string | null;
  price: number | null;
  photo_urls: string[] | null;
  seller_name: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  submitted_at: string;
  status: string;
  assigned_agent_id?: string | null;
  kuula_tour_url?: string | null;
  google_maps_url?: string | null;
};

type ApprovedAgentOption = { id: string; name: string };

type UserRow = {
  id: string;
  full_name: string | null;
  city: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  is_verified: boolean | null;
  is_active: boolean | null;
  is_nri: boolean | null;
  whatsapp: string | null;
  nationality: string | null;
  bio: string | null;
  subscription_tier: string | null;
};

type InquiryRow = {
  id: string;
  property_title: string | null;
  property_slug: string | null;
  seller_email: string | null;
  inquirer_name: string | null;
  inquirer_email: string | null;
  inquirer_phone: string | null;
  message: string | null;
  inquiry_type: string | null;
  status: string | null;
  created_at: string;
  assigned_to: string | null;
  agent_profiles: { profiles: { full_name: string | null } | null } | null;
};

type RecentActivity = {
  id: string;
  title: string | null;
  status: string;
  submitted_at: string;
  city: string | null;
};

type AgentApplication = {
  id: string;
  user_id: string;
  license_number: string | null;
  agency_name: string | null;
  bio: string | null;
  years_experience: number | null;
  status: string;
  created_at: string;
  rera_number: string | null;
  oc_number: string | null;
  is_verified_badge: boolean;
  profiles: { full_name: string | null; phone: string | null; email: string | null; role: string | null } | null;
  agent_service_cities: { city: string }[] | null;
};

// Which required-but-unenforced fields this application is missing — RERA is
// expected for agent and builder alike, OC only for builder (agent_profiles
// has no agent/builder column of its own, so this reads profiles.role to
// know which), and "email" flags the synthetic phone-only placeholder
// (see verify-otp/route.ts's syntheticEmail) rather than a real address.
// Individual accounts are never checked — a missing email there is normal.
type Capture360Request = {
  id: string;
  property_id: string;
  requester_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time_slot: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Requester's own preference at request time (migration 071) —
  // distinct from scheduled_date/scheduled_time_slot above, which are
  // the admin's later-confirmed values and may differ.
  preferred_date: string | null;
  preferred_time_slot: string | null;
  // Admin-entered on decline only (migration 072).
  suggested_alternative_date_1: string | null;
  suggested_alternative_date_2: string | null;
  property_listings: { title: string | null; address: string | null; city: string | null } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

function incompleteAgentAppReasons(app: AgentApplication): string[] {
  const isBuilder = app.profiles?.role === "builder";
  const reasons: string[] = [];
  if (!app.rera_number?.trim()) reasons.push("RERA");
  if (isBuilder && !app.oc_number?.trim()) reasons.push("OC");
  if (!app.profiles?.email?.trim() || app.profiles.email.endsWith("@auth.nilay360.com")) reasons.push("email");
  return reasons;
}

// KYC Documents — same fixed 4-slot checklist as the agent's own profile
// page (src/app/dashboard/DashboardClient.tsx's KYC_DOCUMENT_SLOTS),
// duplicated here rather than cross-imported, matching this codebase's
// existing per-file convention (Card/Badge etc. are similarly duplicated
// across the leads/site-visits/deals pages instead of shared).
const KYC_DOCUMENT_TYPES: { key: string; label: string }[] = [
  { key: "pan",              label: "PAN" },
  { key: "aadhaar",          label: "Aadhaar" },
  { key: "rera_certificate", label: "RERA Certificate" },
  { key: "address_proof",    label: "Address Proof" },
];

type AgentDocumentRow = {
  agent_profile_id: string;
  document_type: string;
  file_url: string;
  created_at: string;
};

type ProfileSearchRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
};

type AuditLogRow = {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type SiteContentRow = { key: string; value: string; updated_at: string };

const CONTACT_TYPES = ["general", "customer_care", "sales", "capture_team"] as const;
const CONTACT_TYPE_LABELS: Record<string, string> = {
  general: "General",
  customer_care: "Customer Care",
  sales: "Sales",
  capture_team: "360° Capture Team",
};
type SiteContactRow = {
  contact_type: string;
  label: string;
  phone: string;
  whatsapp: string | null;
  is_active: boolean;
  updated_at: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  entity_type: "listing" | "profile";
  entity_id: string;
  reason: string;
  details: string | null;
  // Migration 051 widened this from 3 values to 6 (schema CHECK
  // constraint updated, live). 'acknowledged' | 'frozen' | 'under_review'
  // map to the compliance brief's Acknowledged/Frozen/Under Review
  // states; 'open'/'resolved'/'dismissed' are unchanged.
  status: "open" | "acknowledged" | "frozen" | "under_review" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  // Migration 033. Nullable, free text (no CHECK, matching document_type/
  // event_type's precedent) — 'deletion_request' is the one real value in
  // use so far, from the agent-side Request Deletion flow. Anything else
  // (including null) renders as a general report, unchanged.
  request_type: string | null;
  // Migration 051. Plain, nullable, admin-set-manually — no trigger
  // computes these. Only sla_acknowledge_due_at is currently stamped
  // (by the Acknowledge action, now() + 48h); sla_resolve_due_at has
  // no writer yet, displayed if a value is ever set some other way.
  sla_acknowledge_due_at: string | null;
  sla_resolve_due_at: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

type ReportListingPreview = { id: string; slug: string | null; title: string | null; status: string | null };
type ReportProfilePreview = { id: string; full_name: string | null; email: string | null; is_active: boolean | null };

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null, listingType: string | null): string {
  if (v == null) return "—";
  if (listingType === "rent") {
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L/mo`;
    return `₹${Math.round(v / 1_000)}K/mo`;
  }
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Presence thresholds — approximated from last_sign_in_at, not live presence.
const PRESENCE_ONLINE_MS = 15 * 60 * 1000;       // green: signed in within 15 min
const PRESENCE_TODAY_MS  = 24 * 60 * 60 * 1000;  // orange: signed in within 24 hours

function fmtRelativeTime(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function Spinner({ size = 28, pad = 80 }: { size?: number; pad?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: pad, color: "#10C4C3" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function IconShield()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconHome()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconClock()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconCheck()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function IconX()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IconUsers()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconMsg()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconArrow()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>; }
function IconApprove() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function IconReject()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IconOut()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconBuilding(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>; }
function IconBriefcase(){ return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function IconAudit()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>; }
function IconEdit()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>; }
function IconChart()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>; }
function IconAward()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/></svg>; }
function IconCamera() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function IconFlag()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>; }
function IconChevron(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }
function IconPhone()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }

// ── Shared UI ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending_review: { label: "Pending",  bg: "rgba(245,158,11,0.15)",  color: "#F59E0B", border: "rgba(245,158,11,0.3)"  },
    active:         { label: "Active",   bg: "rgba(52,211,153,0.15)",  color: "#34D399", border: "rgba(52,211,153,0.3)"  },
    rejected:       { label: "Rejected", bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.3)" },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(255,255,255,0.08)", color: "#A9B4C2", border: "rgba(255,255,255,0.12)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const isAdmin = role === "admin" || role === "super_admin";
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: isAdmin ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.06)", color: isAdmin ? "#10C4C3" : "#A9B4C2", border: `1px solid ${isAdmin ? "rgba(16,196,195,0.3)" : "rgba(255,255,255,0.1)"}` }}>
      {role ?? "user"}
    </span>
  );
}

function PresenceDot({ lastSignIn, now }: { lastSignIn: string | null | undefined; now: number }) {
  let color = "#6B7280"; // gray
  let title = "Never signed in";
  if (lastSignIn) {
    const diffMs = now - new Date(lastSignIn).getTime();
    const relative = fmtRelativeTime(lastSignIn, now);
    if (diffMs <= PRESENCE_ONLINE_MS) {
      color = "#34D399"; // green
      title = `Online now (active ${relative})`;
    } else if (diffMs <= PRESENCE_TODAY_MS) {
      color = "#F59E0B"; // orange
      title = `Active ${relative}`;
    } else {
      title = `Last active ${relative}`;
    }
  }
  return (
    <span
      title={title}
      aria-label={title}
      style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: color, border: "1.5px solid rgba(2,12,28,0.8)", boxShadow: `0 0 0 1px ${color}55`, flexShrink: 0 }}
    />
  );
}

function StatCard({ label, value, icon, accent, note }: {
  label: string; value: number | string;
  icon: React.ReactNode; accent?: "gold" | "green" | "red" | "blue"; note?: string;
}) {
  // "gold" is a naming fossil — its actual color has always been teal
  // (#10C4C3), matching the agent portal's primary accent, not gold.
  // Left as-is here per instruction: renaming the variant key would
  // mean touching every call site that passes accent="gold", a
  // bigger, separate refactor from this token-value alignment pass.
  const map = {
    gold:  { bg: "rgba(16,196,195,0.12)",  color: "#10C4C3" },
    green: { bg: "rgba(74,222,128,0.12)",  color: "#4ADE80" },
    red:   { bg: "rgba(248,113,113,0.12)", color: "#F87171" },
    blue:  { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
  };
  const a = map[accent ?? "gold"];
  // Icon-chip size (44x44/radius 10), the value's white→teal gradient-
  // text treatment, and the label's uppercase/tracked styling below
  // all now match the agent portal's StatCard (src/app/dashboard/
  // DashboardClient.tsx) exactly — Part 1 polish, admin's own
  // semantic 4-color accent map (icon chip only) is unchanged, since
  // collapsing it to the agent side's plain boolean accent would lose
  // real information (Pending/Active/Rejected/etc. are visually
  // distinct here on purpose).
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "22px 24px", display: "flex", alignItems: "center", gap: "18px", flex: "1 1 160px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: a.color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "28px", fontWeight: 600, lineHeight: 1.1, background: "linear-gradient(135deg, #FFFFFF 0%, #10C4C3 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#FFFFFF" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{label}</div>
        {note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>{note}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "4px" }}>{subtitle}</p>}
      </div>
      {count != null && count > 0 && (
        <span style={{ padding: "5px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)", flexShrink: 0 }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Listing Card (reused across approved/rejected/pending) ─────────────────────

function ListingCard({
  listing,
  actions,
  inFlight,
  assignControl,
  kuulaTourControl,
  googleMapsUrlControl,
  previewControl,
}: {
  listing: AdminListing;
  actions: React.ReactNode;
  inFlight: boolean;
  /** Optional slot for an "Assign Agent" control — only Pending/Approved sections supply this. */
  assignControl?: React.ReactNode;
  /** Optional slot for the Kuula 360° tour URL control — only Pending/Approved sections supply this. */
  kuulaTourControl?: React.ReactNode;
  /** Optional slot for the Google Maps URL control — only Pending/Approved sections supply this. */
  googleMapsUrlControl?: React.ReactNode;
  /** Optional replacement for the "View Full →" public-page link — Pending
   * supplies this instead, since /property/[slug] 404s for non-active
   * listings (no admin bypass on that route, by design — see
   * AdminListingFullPreview). When supplied, the public-page link is
   * omitted entirely rather than shown alongside it. */
  previewControl?: React.ReactNode;
}) {
  const thumb = Array.isArray(listing.photo_urls) ? listing.photo_urls[0] ?? null : null;
  const label = listing.listing_type === "sale" ? "For Sale" : listing.listing_type === "rent" ? "For Rent" : (listing.listing_type ?? "");
  const loc   = [listing.locality, listing.city].filter(Boolean).join(", ");

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", overflow: "hidden", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* Thumbnail */}
        <div style={{ width: "150px", flexShrink: 0, position: "relative", background: "#0A1526", overflow: "hidden", minHeight: "140px" }}>
          {thumb ? (
            <img src={optimizedImageUrl(thumb, 300)} alt={listing.title ?? "Property"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#10C4C3", opacity: 0.3, minHeight: "140px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}
          <div style={{ position: "absolute", top: "8px", left: "8px", padding: "2px 8px", borderRadius: "100px", fontSize: "8px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: listing.listing_type === "rent" ? "rgba(52,211,153,0.85)" : "rgba(16,196,195,0.85)", color: "#020C1C" }}>
            {label}
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <StatusBadge status={listing.status} />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{fmtDate(listing.submitted_at)}</span>
              </div>
              <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.25, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {listing.title ?? `${listing.property_category ?? "Property"} in ${listing.city ?? "—"}`}
              </h3>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#A9B4C2", flexWrap: "wrap", alignItems: "center" }}>
                {listing.property_category && <span style={{ textTransform: "capitalize" as const }}>{listing.property_category}</span>}
                {loc && (
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {loc}
                  </span>
                )}
                <span style={{ fontFamily: "var(--font-support-new)", fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
                  {fmtPrice(listing.price, listing.listing_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Seller row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px" }}>
            {listing.seller_name && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#A9B4C2", fontWeight: 500 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {listing.seller_name}
              </span>
            )}
            {listing.seller_email && (
              <a href={`mailto:${listing.seller_email}`} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#A9B4C2", textDecoration: "none" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                {listing.seller_email}
              </a>
            )}
            {listing.seller_phone && (
              <a href={`tel:${listing.seller_phone}`} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#A9B4C2", textDecoration: "none" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {listing.seller_phone}
              </a>
            )}
          </div>

          {assignControl && (
            <div style={{ display: "flex", alignItems: "center" }}>{assignControl}</div>
          )}

          {kuulaTourControl && (
            <div style={{ display: "flex", alignItems: "center" }}>{kuulaTourControl}</div>
          )}

          {googleMapsUrlControl && (
            <div style={{ display: "flex", alignItems: "center" }}>{googleMapsUrlControl}</div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {previewControl ? previewControl : listing.slug && (
              <a
                href={`/property/${listing.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.15)", background: "transparent", textDecoration: "none", letterSpacing: "0.04em" }}
              >
                View Full <IconArrow />
              </a>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Assign Agent control (Pending/Approved only) ────────────────────────────────

function AssignAgentControl({
  currentAgentId, agents, onAssign, disabled,
}: {
  currentAgentId: string | null | undefined;
  agents: ApprovedAgentOption[];
  onAssign: (agentId: string | null) => void;
  disabled: boolean;
}) {
  const currentName = agents.find(a => a.id === currentAgentId)?.name;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
        {currentAgentId
          ? <>Assigned to: <strong style={{ color: "#FFFFFF", fontWeight: 600 }}>{currentName ?? "Unknown agent"}</strong></>
          : "Not assigned to an agent"}
      </span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <select
          value={currentAgentId ?? ""}
          disabled={disabled}
          onChange={e => onAssign(e.target.value || null)}
          style={{ padding: "6px 28px 6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: disabled ? "not-allowed" : "pointer" }}
        >
          <option value="" style={{ background: "#0A1526", color: "#FFFFFF" }}>Unassigned</option>
          {agents.map(a => (
            <option key={a.id} value={a.id} style={{ background: "#0A1526", color: "#FFFFFF" }}>{a.name}</option>
          ))}
        </select>
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
      </div>
    </div>
  );
}

// ── Kuula 360° Tour control (Pending/Approved only) ─────────────────────────────

function KuulaTourControl({
  currentUrl, onSave, disabled,
}: {
  currentUrl: string | null | undefined;
  onSave: (url: string | null) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(currentUrl ?? "");
  const dirty = value.trim() !== (currentUrl ?? "");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>360° Tour URL:</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => setValue(e.target.value)}
        placeholder="https://kuula.co/share/..."
        style={{ flex: "1 1 220px", minWidth: "160px", padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }}
      />
      <button
        onClick={() => onSave(value.trim() || null)}
        disabled={disabled || !dirty}
        style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", flexShrink: 0 }}
      >
        Save
      </button>
    </div>
  );
}

// ── Google Maps URL control (Pending/Approved only) ─────────────────────────────

function GoogleMapsUrlControl({
  currentUrl, onSave, disabled,
}: {
  currentUrl: string | null | undefined;
  onSave: (url: string | null) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(currentUrl ?? "");
  const dirty = value.trim() !== (currentUrl ?? "");
  const looksLikeEmbed = value.trim() === "" || value.includes("google.com/maps/embed");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>Google Maps Embed URL:</span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={e => setValue(e.target.value)}
          placeholder="https://www.google.com/maps/embed?pb=... (Share → Embed a map)"
          style={{ flex: "1 1 220px", minWidth: "160px", padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }}
        />
        <button
          onClick={() => onSave(value.trim() || null)}
          disabled={disabled || !dirty}
          style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", flexShrink: 0 }}
        >
          Save
        </button>
      </div>
      {!looksLikeEmbed && (
        <span style={{ fontSize: "11px", color: "#F59E0B", paddingLeft: "2px" }}>
          ⚠ This doesn't look like an embed link — regular Share/place links won't display (Google blocks them from being framed). Open the location on Google Maps, click Share → &quot;Embed a map&quot;, and paste that URL instead.
        </span>
      )}
    </div>
  );
}

// ── Section: Site Content ──────────────────────────────────────────────────────

function SiteContentRowEditor({
  row, disabled, onSave, onDelete,
}: {
  row: SiteContentRow; disabled: boolean;
  onSave: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}) {
  const [draft, setDraft] = useState(row.value);
  useEffect(() => { setDraft(row.value); }, [row.value]);
  const dirty = draft !== row.value;

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 22px", marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "10px", flexWrap: "wrap" }}>
        <code style={{ fontSize: "12px", fontWeight: 700, color: "#10C4C3", background: "rgba(16,196,195,0.1)", padding: "3px 9px", borderRadius: "6px" }}>{row.key}</code>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
          Updated {new Date(row.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <textarea
          value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} rows={2}
          style={{ flex: "1 1 260px", minWidth: "200px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => onSave(row.key, draft)}
            disabled={disabled || !dirty}
            style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Save
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete key "${row.key}"? Any page reading it will fall back to its hardcoded default.`)) onDelete(row.key); }}
            disabled={disabled}
            style={{ padding: "9px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SiteContentAddForm({
  disabled, existingKeys, onAdd,
}: {
  disabled: boolean; existingKeys: string[];
  onAdd: (key: string, value: string) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const normalized = key.trim().toLowerCase().replace(/\s+/g, "_");
  const duplicate = normalized !== "" && existingKeys.includes(normalized);
  const canAdd = normalized !== "" && value.trim() !== "" && !duplicate;

  return (
    <div style={{ background: "rgba(16,196,195,0.05)", border: "1.5px dashed rgba(16,196,195,0.3)", borderRadius: "14px", padding: "18px 20px", marginBottom: "20px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Add New Key</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-start" }}>
        <input
          type="text" placeholder="key_name (e.g. about_hero_title)" value={key} disabled={disabled}
          onChange={e => setKey(e.target.value)}
          style={{ flex: "0 1 220px", minWidth: "180px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }}
        />
        <textarea
          placeholder="Value" value={value} disabled={disabled} rows={2}
          onChange={e => setValue(e.target.value)}
          style={{ flex: "1 1 260px", minWidth: "200px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", resize: "vertical" }}
        />
        <button
          onClick={() => { onAdd(normalized, value.trim()); setKey(""); setValue(""); }}
          disabled={disabled || !canAdd}
          style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: canAdd ? "#10C4C3" : "rgba(255,255,255,0.06)", color: canAdd ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !canAdd ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", flexShrink: 0 }}
        >
          Add
        </button>
      </div>
      {duplicate && <p style={{ fontSize: "11px", color: "#F59E0B", marginTop: "8px" }}>A key with this name already exists.</p>}
    </div>
  );
}

function SiteContentSection({
  rows, loading, disabled, onSave, onAdd, onDelete,
}: {
  rows: SiteContentRow[]; loading: boolean; disabled: string | null;
  onSave: (key: string, value: string) => void;
  onAdd: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Site Content" subtitle="Edit any site copy stored in the content table — changes appear immediately, no code deploy needed." count={rows.length} />
      <SiteContentAddForm disabled={disabled !== null} existingKeys={rows.map(r => r.key)} onAdd={onAdd} />
      {rows.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No content keys yet</p>
        </div>
      ) : (
        rows.map(row => (
          <SiteContentRowEditor
            key={row.key}
            row={row}
            disabled={disabled === row.key}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

// ── Section: Contact Numbers ─────────────────────────────────────────────────
// site_contacts (075) — replaces the phone number 7075792497, which was
// previously hardcoded independently in 9 places across 6 files (plus 3
// places reading src/constants/index.ts's now-removed BRAND.phone/
// BRAND.whatsapp). One row per real contact purpose (general/customer_care/
// sales/capture_team — contact_type is the table's PRIMARY KEY, so this is
// edit-in-place per type, same as SiteContentRowEditor above, not a free
// list). Only 'general' is seeded by migration 075; the other three types
// exist as real, addable options here, not fabricated placeholder rows.

function ContactRowEditor({
  row, disabled, onSave, onToggleActive,
}: {
  row: SiteContactRow; disabled: boolean;
  onSave: (contactType: string, label: string, phone: string, whatsapp: string) => void;
  onToggleActive: (contactType: string, isActive: boolean) => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [phone, setPhone] = useState(row.phone);
  const [whatsapp, setWhatsapp] = useState(row.whatsapp ?? "");
  // No resync effect: ContactsSection keys this editor on the saved values,
  // so a saved change remounts it with fresh state.
  const dirty = label !== row.label || phone !== row.phone || whatsapp !== (row.whatsapp ?? "");

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 22px", marginBottom: "14px", opacity: row.is_active ? 1 : 0.55 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <code style={{ fontSize: "12px", fontWeight: 700, color: "#10C4C3", background: "rgba(16,196,195,0.1)", padding: "3px 9px", borderRadius: "6px" }}>{CONTACT_TYPE_LABELS[row.contact_type] ?? row.contact_type}</code>
          {!row.is_active && <span style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Hidden from site</span>}
        </div>
        <button
          onClick={() => onToggleActive(row.contact_type, !row.is_active)}
          disabled={disabled}
          style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: row.is_active ? "rgba(255,255,255,0.06)" : "rgba(16,196,195,0.12)", color: row.is_active ? "#A9B4C2" : "#10C4C3", border: row.is_active ? "1.5px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(16,196,195,0.35)", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)" }}
        >
          {row.is_active ? "Hide from site" : "Show on site"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "5px" }}>Label</label>
          <input value={label} disabled={disabled} onChange={e => setLabel(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "5px" }}>Phone (e.g. +91 70933 36360)</label>
          <input value={phone} disabled={disabled} onChange={e => setPhone(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "5px" }}>WhatsApp (optional, same format)</label>
          <input value={whatsapp} disabled={disabled} onChange={e => setWhatsapp(e.target.value)} placeholder="Same as phone if blank"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        </div>
      </div>
      <button
        onClick={() => onSave(row.contact_type, label.trim(), phone.trim(), whatsapp.trim())}
        disabled={disabled || !dirty || !label.trim() || !phone.trim()}
        style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)" }}
      >
        Save
      </button>
    </div>
  );
}

function ContactAddForm({
  disabled, existingTypes, onAdd,
}: {
  disabled: boolean; existingTypes: string[];
  onAdd: (contactType: string, label: string, phone: string, whatsapp: string) => void;
}) {
  // existingTypes is a fresh array every render, so memoize on its contents.
  const existingKey = existingTypes.join(",");
  const available = useMemo(
    () => CONTACT_TYPES.filter(t => !existingKey.split(",").includes(t)),
    [existingKey],
  );
  const [selectedType, setContactType] = useState<string>(available[0] ?? "");
  // Derived during render instead of corrected in an effect: if the selected
  // type was just added (no longer available), fall back to the first one left.
  const contactType = (available as readonly string[]).includes(selectedType) ? selectedType : (available[0] ?? "");
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const canAdd = contactType !== "" && label.trim() !== "" && phone.trim() !== "";

  if (available.length === 0) return null;

  return (
    <div style={{ background: "rgba(16,196,195,0.05)", border: "1.5px dashed rgba(16,196,195,0.3)", borderRadius: "14px", padding: "18px 20px", marginBottom: "20px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Add Contact Type</p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <select value={contactType} disabled={disabled} onChange={e => setContactType(e.target.value)}
          style={{ padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }}>
          {available.map(t => <option key={t} value={t} style={{ background: "#0A1526" }}>{CONTACT_TYPE_LABELS[t]}</option>)}
        </select>
        <input placeholder="Label" value={label} disabled={disabled} onChange={e => setLabel(e.target.value)}
          style={{ flex: "0 1 160px", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        <input placeholder="+91 XXXXX XXXXX" value={phone} disabled={disabled} onChange={e => setPhone(e.target.value)}
          style={{ flex: "0 1 160px", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        <input placeholder="WhatsApp (optional)" value={whatsapp} disabled={disabled} onChange={e => setWhatsapp(e.target.value)}
          style={{ flex: "0 1 160px", padding: "9px 11px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none" }} />
        <button
          onClick={() => { onAdd(contactType, label.trim(), phone.trim(), whatsapp.trim()); setLabel(""); setPhone(""); setWhatsapp(""); }}
          disabled={disabled || !canAdd}
          style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: canAdd ? "#10C4C3" : "rgba(255,255,255,0.06)", color: canAdd ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !canAdd ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ContactsSection({
  rows, loading, disabled, onSave, onAdd, onToggleActive,
}: {
  rows: SiteContactRow[]; loading: boolean; disabled: string | null;
  onSave: (contactType: string, label: string, phone: string, whatsapp: string) => void;
  onAdd: (contactType: string, label: string, phone: string, whatsapp: string) => void;
  onToggleActive: (contactType: string, isActive: boolean) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Contact Numbers" subtitle="The phone/WhatsApp numbers shown across the public site — changes appear immediately, no code deploy needed." count={rows.length} />
      <ContactAddForm disabled={disabled !== null} existingTypes={rows.map(r => r.contact_type)} onAdd={onAdd} />
      {rows.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No contact numbers yet</p>
        </div>
      ) : (
        rows.map(row => (
          <ContactRowEditor
            key={`${row.contact_type}|${row.label}|${row.phone}|${row.whatsapp ?? ""}`}
            row={row}
            disabled={disabled === row.contact_type}
            onSave={onSave}
            onToggleActive={onToggleActive}
          />
        ))
      )}
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────────────────────────────

function OverviewSection({ stats, loading }: { stats: Stats; loading: boolean }) {
  const [recent,       setRecent]       = useState<RecentActivity[]>([]);
  const [cityBreakdown, setCityBreakdown] = useState<{ city: string; count: number }[]>([]);
  const [sectionLoading, setSectionLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: recentData }, { data: cityData }] = await Promise.all([
        supabase
          .from("property_listings")
          .select("id, title, status, submitted_at, city")
          .order("submitted_at", { ascending: false })
          .limit(5),
        supabase
          .from("property_listings")
          .select("city")
          .not("city", "is", null),
      ]);

      setRecent((recentData as RecentActivity[] | null) ?? []);

      if (cityData) {
        const counts: Record<string, number> = {};
        for (const row of cityData as { city: string | null }[]) {
          if (row.city) counts[row.city] = (counts[row.city] ?? 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([city, count]) => ({ city, count }));
        setCityBreakdown(sorted);
      }
      setSectionLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <SectionHeading title="Overview" subtitle="Platform summary at a glance." />

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ flex: "1 1 160px", height: "90px", borderRadius: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
          <StatCard label="Pending Review"   value={stats.pending}   icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} accent="gold" note="Awaiting action" />
          <StatCard label="Active Listings"  value={stats.active}    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>} accent="green" />
          <StatCard label="Rejected"         value={stats.rejected}  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>} accent="red" />
          <StatCard label="Total Users"      value={stats.users}     icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} accent="blue" />
          <StatCard label="Total Inquiries"  value={stats.inquiries} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} accent="blue" />
          <StatCard label="Total Property Views" value={stats.totalViews} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} accent="gold" note="Across all listings" />
        </div>
      )}

      {sectionLoading ? <Spinner /> : (
        <div className="admin-overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Recent activity */}
          <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "24px" }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "18px" }}>Recent Submissions</h3>
            {recent.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No listings yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recent.map(r => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.title ?? r.city ?? "Untitled"}
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{fmtDate(r.submitted_at)}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* City breakdown */}
          <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "24px" }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "18px" }}>Top Cities</h3>
            {cityBreakdown.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {cityBreakdown.map((c, i) => {
                  const max = cityBreakdown[0].count;
                  return (
                    <div key={c.city}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "13px", color: i === 0 ? "#FFFFFF" : "#A9B4C2", fontWeight: i === 0 ? 600 : 400 }}>{c.city}</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{c.count}</span>
                      </div>
                      <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(c.count / max) * 100}%`, background: i === 0 ? "#10C4C3" : "rgba(16,196,195,0.35)", borderRadius: "3px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend charts */}
      <div className="admin-overview-charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "20px" }}>
        <ListingsSubmittedOverTimeChart />
        <AgentApplicationsOverTimeChart />
        <InquiriesOverTimeChart />
      </div>
    </div>
  );
}

// ── Unpublish modal — reason dropdown + note, replacing the old bare
// window.confirm(). Same dark modal-overlay pattern as
// Capture360ScheduleModal (fixed inset:0 scrim, centered card,
// Escape-to-close, backdrop-click-to-close) — reused, not reinvented.
// Reason values match property_listings.unpublish_reason's CHECK
// constraint (067_unpublish_reason_and_history.sql) exactly.
const UNPUBLISH_REASONS = [
  { value: "deal_closed",     label: "Deal Closed" },
  { value: "expired",         label: "Expired" },
  { value: "owner_requested", label: "Owner Requested" },
  { value: "admin_review",    label: "Admin Review" },
  { value: "other",           label: "Other" },
] as const;

function UnpublishListingModal({
  listing, onConfirm, onCancel,
}: {
  listing: AdminListing;
  onConfirm: (reason: string, note: string | null) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string>(UNPUBLISH_REASONS[0].value);
  const [note, setNote] = useState("");
  // Note is required only when "Other" is picked — every other reason is
  // already self-explanatory enough to stand alone.
  const noteRequired = reason === "other";
  const canConfirm = !noteRequired || note.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Unpublish listing"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF" }}>Unpublish Listing</h3>
          <button onClick={onCancel} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF" }}>
            <IconX />
          </button>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>{listing.title ?? "Untitled listing"}</p>
          <p style={{ fontSize: "12px", color: "#A9B4C2" }}>Will return to Pending Review.</p>
        </div>

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Reason</label>
        <select
          value={reason} onChange={e => setReason(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)", marginBottom: "16px" }}
        >
          {UNPUBLISH_REASONS.map(r => <option key={r.value} value={r.value} style={{ background: "#0A1526", color: "#FFFFFF" }}>{r.label}</option>)}
        </select>

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>
          Note {noteRequired ? "(required)" : "(optional)"}
        </label>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={3}
          placeholder={noteRequired ? "Please describe the reason…" : "Optional context…"}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "12px", fontFamily: "var(--font-body-new)", resize: "vertical", marginBottom: "18px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { if (canConfirm) onConfirm(reason, note.trim() || null); }}
            disabled={!canConfirm}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "#F59E0B", color: "#020C1C", border: "none", cursor: !canConfirm ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: !canConfirm ? 0.6 : 1 }}
          >
            Confirm Unpublish
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "11px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Request Changes modal — same shell as UnpublishListingModal above, but
// a single free-text note instead of a fixed-vocabulary reason dropdown:
// there's no CHECK-constrained reason list for this transition (migration
// 074 only adds changes_requested_note, no vocabulary), so the note itself
// IS the whole message, always required — there's no fallback reason label
// to fall back on if it's left blank.
function RequestChangesModal({
  listing, onConfirm, onCancel,
}: {
  listing: AdminListing;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const canConfirm = note.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Request changes"
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF" }}>Request Changes</h3>
          <button onClick={onCancel} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF" }}>
            <IconX />
          </button>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>{listing.title ?? "Untitled listing"}</p>
          <p style={{ fontSize: "12px", color: "#A9B4C2" }}>Stays in Pending Review. Submitter is notified with your note.</p>
        </div>

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>
          Note (required)
        </label>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={4}
          placeholder="e.g. Photos are unclear, please reupload. Please add RERA number."
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "12px", fontFamily: "var(--font-body-new)", resize: "vertical", marginBottom: "18px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { if (canConfirm) onConfirm(note.trim()); }}
            disabled={!canConfirm}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "#F59E0B", color: "#020C1C", border: "none", cursor: !canConfirm ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: !canConfirm ? 0.6 : 1 }}
          >
            Send to Submitter
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "11px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Full-listing preview modal for Pending Review — built to solve the
// /property/[slug] 404 problem for unapproved listings (that public route's
// PropertyDetailClient gates on status === 'active' with no admin bypass,
// deliberately left untouched; see this feature's investigation). Renders
// admin-side, standalone, without navigating to the public route at all.
// A purpose-built simple gallery here (not the public page's full hero/
// lightbox JSX) since this is a review tool, not the buyer-facing page.
type FloorPlanRow = { id: string; image_url: string; label: string | null };

function fmtINR(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function AdminListingFullPreview({
  listing, row, floorPlans, loading, inFlight, onClose, onApprove, onReject, onRequestChanges,
}: {
  listing: AdminListing;
  row: Record<string, unknown> | null;
  floorPlans: FloorPlanRow[];
  loading: boolean;
  inFlight: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}) {
  const photos = listing.photo_urls ?? [];
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = (key: string): string | null => (row && typeof row[key] === "string" && (row[key] as string).trim()) ? (row[key] as string) : null;
  const n = (key: string): number | null => (row && typeof row[key] === "number") ? (row[key] as number) : null;
  const b = (key: string): boolean => Boolean(row?.[key]);
  const isRent = listing.listing_type === "rent";
  const videoAssetId = s("video_asset_id");
  const videoReady = row?.video_asset_status === "ready" && videoAssetId;
  const amenities = row && Array.isArray(row.amenities) ? (row.amenities as string[]) : [];

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Preview listing"
      style={{ position: "fixed", inset: 0, zIndex: 550, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "780px", padding: "26px 28px 22px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)", marginBottom: "24px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF", marginBottom: "4px" }}>{listing.title ?? "Untitled listing"}</h3>
            <p style={{ fontSize: "12px", color: "#A9B4C2" }}>{[listing.locality, listing.city].filter(Boolean).join(", ") || "—"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF", flexShrink: 0 }}>
            <IconX />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0" }}><Spinner /></div>
        ) : (
          <>
            {/* Gallery — main image + thumbnail strip, local activeImg state only. */}
            {photos.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <div style={{ borderRadius: "12px", overflow: "hidden", height: "320px", background: "#000" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optimizedImageUrl(photos[activeImg], 900)} alt={listing.title ?? "Listing photo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                {photos.length > 1 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", overflowX: "auto" }}>
                    {photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url + i}
                        src={optimizedImageUrl(url, 160)}
                        alt=""
                        onClick={() => setActiveImg(i)}
                        style={{ width: "72px", height: "56px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", flexShrink: 0, border: i === activeImg ? "2px solid #10C4C3" : "2px solid transparent" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video — same VideoSlide component the public page uses, reused
                standalone with no coupling to PropertyDetailClient. */}
            {videoReady && (
              <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "18px" }}>
                <VideoSlide videoAssetId={videoAssetId} thumbnailUrl={photos[0] ?? null} title={listing.title ?? "Listing"} height="320px" />
              </div>
            )}

            {/* Floor plans */}
            {floorPlans.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "8px" }}>Floor Plans</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {floorPlans.map(fp => (
                    <div key={fp.id} style={{ width: "140px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={optimizedImageUrl(fp.image_url, 280)} alt={fp.label ?? "Floor plan"} style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                      {fp.label && <p style={{ fontSize: "11px", color: "#A9B4C2", marginTop: "4px" }}>{fp.label}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price + core specs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "18px" }}>
              <Spec label={isRent ? "Monthly Rent" : "Price"} value={fmtINR(listing.price)} />
              <Spec label="Category" value={listing.property_category ?? "—"} />
              <Spec label={isRent ? "Security Deposit" : "Built-up Area"} value={isRent ? fmtINR(n("security_deposit")) : (n("built_up_area") != null ? `${n("built_up_area")!.toLocaleString("en-IN")} sqft` : "—")} />
              <Spec label="Bedrooms" value={n("bedrooms") != null ? String(n("bedrooms")) : "—"} />
              <Spec label="Bathrooms" value={n("bathrooms") != null ? String(n("bathrooms")) : "—"} />
              <Spec label="Facing" value={s("facing") ?? "—"} />
              <Spec label="Furnishing" value={s("furnishing") ?? "—"} />
              {isRent && <Spec label="Maintenance" value={n("maintenance_charge") != null ? fmtINR(n("maintenance_charge")) : "—"} />}
            </div>

            {/* Brokerage + RERA + listed-by */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "18px" }}>
              <Spec label="Listed By" value={s("listed_by") ? s("listed_by")!.charAt(0).toUpperCase() + s("listed_by")!.slice(1) : "—"} />
              <Spec label="RERA Number" value={s("rera_number") ?? "—"} />
              <Spec
                label="Brokerage"
                value={
                  b("show_brokerage_details") && s("brokerage_mode") && n("brokerage_value") != null
                    ? (s("brokerage_mode") === "days_rent" ? `${n("brokerage_value")} days' rent`
                      : s("brokerage_mode") === "months_rent" ? `${n("brokerage_value")} months' rent`
                      : s("brokerage_mode") === "percentage" ? `${n("brokerage_value")}%`
                      : fmtINR(n("brokerage_value")))
                    : "Not disclosed"
                }
              />
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "8px" }}>Amenities</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {amenities.map(a => (
                    <span key={a} style={{ fontSize: "11px", padding: "5px 12px", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.3)", borderRadius: "100px", color: "#10C4C3" }}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights / description */}
            {s("highlights") && (
              <div style={{ marginBottom: "18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "8px" }}>Highlights</p>
                <p style={{ fontSize: "13px", color: "#E5E9F0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s("highlights")}</p>
              </div>
            )}

            {/* Seller contact */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "22px" }}>
              <Spec label="Submitted By" value={listing.seller_name ?? "—"} />
              <Spec label="Email" value={listing.seller_email ?? "—"} />
              <Spec label="Phone" value={listing.seller_phone ?? "—"} />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button onClick={onApprove} disabled={inFlight} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1.5px solid rgba(16,196,195,0.35)", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}>
                <IconApprove /> Approve
              </button>
              <button onClick={onReject} disabled={inFlight} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1.5px solid rgba(239,68,68,0.3)", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}>
                <IconReject /> Reject
              </button>
              <button onClick={onRequestChanges} disabled={inFlight} style={{ padding: "10px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}>
                Request Changes
              </button>
              <a
                href={`/post-property/edit/${listing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: "10px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(255,255,255,0.06)", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.15)", textDecoration: "none", fontFamily: "var(--font-body-new)", display: "inline-flex", alignItems: "center" }}
              >
                Edit as Admin ↗
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "3px" }}>{label}</p>
      <p style={{ fontSize: "13px", color: "#FFFFFF" }}>{value}</p>
    </div>
  );
}

// ── Section: Listings (unified) ─────────────────────────────────────────────────
// Replaces the former Pending Review / Approved Listings / Rejected Listings
// sidebar entries: those were nothing but .eq("status", X) on the exact same
// property_listings table, same AdminListing type, same ListingCard — three
// screens with no structural difference. Consolidated here into one list with
// a real status filter, which also closes a live gap the three-way split had:
// 'frozen' (report-freeze workflow) and 'changes_requested' (this session's
// Request Changes flow) listings belonged to none of the three old sections
// and were invisible in the sidebar entirely. Confirmed via a live
// `select status, count(*) group by status` before committing to this shape
// (2026-09-19): real values in production data are pending_review, active,
// rejected, changes_requested — no sold/rented/expired/flagged ever existed.
// frozen is included below despite 0 live rows today because it's a real,
// reachable status via handleReportFreezeListing.
const LISTING_STATUS_FILTERS = [
  { value: "pending_review",    label: "Pending Review" },
  { value: "active",            label: "Active" },
  { value: "rejected",          label: "Rejected" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "frozen",            label: "Frozen" },
] as const;

const LISTING_STATUS_QUERY_COLUMNS =
  "id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status, assigned_agent_id, kuula_tour_url, google_maps_url";

function ListingsSection({
  listings, loading, statusFilter, onStatusFilterChange, inFlight, agents,
  onApprove, onReject, onRequestChanges, onUnpublish, onReApprove,
  onAssignAgent, onKuulaTourUrl, onGoogleMapsUrl,
}: {
  listings: AdminListing[];
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  inFlight: string | null;
  agents: ApprovedAgentOption[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestChanges: (id: string, note: string) => void;
  onUnpublish: (id: string, reason: string, note: string | null) => void;
  onReApprove: (id: string) => void;
  onAssignAgent: (id: string, agentId: string | null) => void;
  onKuulaTourUrl: (id: string, url: string | null) => void;
  onGoogleMapsUrl: (id: string, url: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(statusFilter === "pending_review" ? "asc" : "desc");
  const [unpublishTarget, setUnpublishTarget] = useState<AdminListing | null>(null);
  const [requestChangesTarget, setRequestChangesTarget] = useState<AdminListing | null>(null);

  // On-demand full-row fetch for the preview modal — AdminListing's own
  // column set is deliberately limited (main list query), so pricing/
  // brokerage/amenity/video fields are fetched fresh only when a listing
  // is actually opened, not bloating the list query for every row.
  const [previewListing, setPreviewListing] = useState<AdminListing | null>(null);
  const [previewRow, setPreviewRow] = useState<Record<string, unknown> | null>(null);
  const [previewFloorPlans, setPreviewFloorPlans] = useState<FloorPlanRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = useCallback(async (l: AdminListing) => {
    setPreviewListing(l);
    setPreviewLoading(true);
    setPreviewRow(null);
    setPreviewFloorPlans([]);
    const supabase = createClient();
    const [{ data: row }, { data: floorPlans }] = await Promise.all([
      supabase.from("property_listings").select("*").eq("id", l.id).maybeSingle(),
      supabase.from("property_floor_plans").select("id, image_url, label").eq("property_id", l.id).order("display_order"),
    ]);
    setPreviewRow(row ?? null);
    setPreviewFloorPlans(floorPlans ?? []);
    setPreviewLoading(false);
  }, []);

  // Client-side search (title/city/locality/seller name/agent name) and
  // sort-by-listed-date on top of the server-filtered-by-status list — no
  // extra round trip for either, since `listings` is already the full set
  // for the current status filter.
  const displayedListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const agentNameById = new Map(agents.map(a => [a.id, a.name.toLowerCase()]));
    const filtered = q
      ? listings.filter(l => {
          const agentName = l.assigned_agent_id ? agentNameById.get(l.assigned_agent_id) ?? "" : "";
          return [l.title, l.city, l.locality, l.seller_name, agentName].some(v => v?.toLowerCase().includes(q));
        })
      : listings;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [listings, search, sortDir, agents]);

  const emptyLabel = LISTING_STATUS_FILTERS.find(f => f.value === statusFilter)?.label ?? "listings";

  return (
    <div>
      <SectionHeading title="Listings" subtitle="All submissions, filterable by status." count={listings.length} />

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {LISTING_STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => onStatusFilterChange(f.value)}
            style={{
              padding: "8px 16px", borderRadius: "100px", fontSize: "12px", fontWeight: 600,
              fontFamily: "var(--font-body-new)", cursor: "pointer",
              background: statusFilter === f.value ? "#10C4C3" : "rgba(255,255,255,0.06)",
              color: statusFilter === f.value ? "#020C1C" : "#A9B4C2",
              border: statusFilter === f.value ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title, city, locality, seller, or agent…"
          style={{ flex: 1, minWidth: "220px", boxSizing: "border-box", padding: "10px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)" }}
        />
        <button
          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          style={{ padding: "10px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.15)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-body-new)", whiteSpace: "nowrap" }}
        >
          Listed Date: {sortDir === "asc" ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : displayedListings.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>
            {search.trim() ? "No listings match your search" : `No ${emptyLabel.toLowerCase()} listings`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {displayedListings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              inFlight={inFlight === l.id}
              assignControl={
                <AssignAgentControl
                  currentAgentId={l.assigned_agent_id}
                  agents={agents}
                  disabled={inFlight === l.id}
                  onAssign={agentId => onAssignAgent(l.id, agentId)}
                />
              }
              kuulaTourControl={
                <KuulaTourControl
                  currentUrl={l.kuula_tour_url}
                  disabled={inFlight === l.id}
                  onSave={url => onKuulaTourUrl(l.id, url)}
                />
              }
              googleMapsUrlControl={
                <GoogleMapsUrlControl
                  currentUrl={l.google_maps_url}
                  disabled={inFlight === l.id}
                  onSave={url => onGoogleMapsUrl(l.id, url)}
                />
              }
              previewControl={
                <button
                  onClick={() => void openPreview(l)}
                  disabled={inFlight === l.id}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.15)", background: "transparent", cursor: inFlight === l.id ? "not-allowed" : "pointer", letterSpacing: "0.04em", fontFamily: "var(--font-body-new)" }}
                >
                  Preview <IconArrow />
                </button>
              }
              actions={
                l.status === "pending_review" ? (
                  <>
                    <button
                      onClick={() => onApprove(l.id)}
                      disabled={inFlight === l.id}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === l.id ? 0.6 : 1 }}
                    >
                      <IconApprove /> Approve
                    </button>
                    <button
                      onClick={() => onReject(l.id)}
                      disabled={inFlight === l.id}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === l.id ? 0.6 : 1 }}
                    >
                      <IconReject /> Reject
                    </button>
                    <button
                      onClick={() => setRequestChangesTarget(l)}
                      disabled={inFlight === l.id}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === l.id ? 0.6 : 1 }}
                    >
                      Request Changes
                    </button>
                  </>
                ) : l.status === "active" ? (
                  <button
                    onClick={() => setUnpublishTarget(l)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === l.id ? 0.6 : 1 }}
                  >
                    Unpublish
                  </button>
                ) : l.status === "rejected" ? (
                  <button
                    onClick={() => onReApprove(l.id)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === l.id ? 0.6 : 1 }}
                  >
                    <IconApprove /> Re-approve
                  </button>
                ) : null
                // changes_requested / frozen: no direct action here by design.
                // changes_requested is waiting on the submitter (Preview shows
                // the note); frozen stays Reports-section-only (unfreeze lives
                // in handleReportUnfreezeListing, tied to the report that froze
                // it) — not duplicated here to avoid two paths to the same
                // action drifting out of sync.
              }
            />
          ))}
        </div>
      )}

      {previewListing && (
        <AdminListingFullPreview
          listing={previewListing}
          row={previewRow}
          floorPlans={previewFloorPlans}
          loading={previewLoading}
          inFlight={inFlight === previewListing.id}
          onClose={() => setPreviewListing(null)}
          onApprove={() => { onApprove(previewListing.id); setPreviewListing(null); }}
          onReject={() => { onReject(previewListing.id); setPreviewListing(null); }}
          onRequestChanges={() => { setRequestChangesTarget(previewListing); setPreviewListing(null); }}
        />
      )}

      {requestChangesTarget && (
        <RequestChangesModal
          listing={requestChangesTarget}
          onConfirm={note => { onRequestChanges(requestChangesTarget.id, note); setRequestChangesTarget(null); }}
          onCancel={() => setRequestChangesTarget(null)}
        />
      )}

      {unpublishTarget && (
        <UnpublishListingModal
          listing={unpublishTarget}
          onConfirm={(reason, note) => {
            onUnpublish(unpublishTarget.id, reason, note);
            setUnpublishTarget(null);
          }}
          onCancel={() => setUnpublishTarget(null)}
        />
      )}
    </div>
  );
}

// ── Section: All Users ─────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  "buyer", "seller", "agent", "agency", "moderator",
  "content_manager", "support", "finance_manager", "sales_manager", "admin",
];

const ROLE_FILTER_OPTIONS = [
  "buyer", "seller", "agent", "agency", "moderator",
  "content_manager", "support", "finance_manager", "sales_manager", "admin", "super_admin",
];

type UserSort = "newest" | "oldest" | "name_az" | "name_za";

const USER_SORT_LABELS: Record<UserSort, string> = {
  newest:  "Joined — newest first",
  oldest:  "Joined — oldest first",
  name_az: "Name — A to Z",
  name_za: "Name — Z to A",
};

type UserEditableFields = Pick<UserRow, "full_name" | "city" | "phone" | "email" | "is_verified">;

const userModalInputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "#F8F6F1",
  border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "7px", fontSize: "13px",
  color: "#020C1C", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3",
};

function UserDetailModal({ user, onClose, onSave, onSubscriptionTierChange }: {
  user: UserRow;
  onClose: () => void;
  onSave: (userId: string, changes: Partial<UserRow>) => Promise<void>;
  onSubscriptionTierChange: (userId: string, newTier: string) => void;
}) {
  const [editing,        setEditing]        = useState(false);
  const [draft,          setDraft]          = useState<UserEditableFields>({
    full_name: user.full_name, city: user.city, phone: user.phone, email: user.email, is_verified: user.is_verified,
  });
  const [saving,         setSaving]         = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startEditing = () => {
    setDraft({ full_name: user.full_name, city: user.city, phone: user.phone, email: user.email, is_verified: user.is_verified });
    setEditing(true);
  };

  const handleSave = async () => {
    const changes: Partial<UserRow> = {};
    (Object.keys(draft) as (keyof UserEditableFields)[]).forEach(key => {
      if (draft[key] !== user[key]) (changes as Record<string, unknown>)[key] = draft[key];
    });
    if (Object.keys(changes).length === 0) { setEditing(false); return; }
    setSaving(true);
    await onSave(user.id, changes);
    setSaving(false);
    setEditing(false);
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    await onSave(user.id, { is_active: !(user.is_active ?? true) });
    setTogglingActive(false);
  };

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#374151" }}>{value ?? "—"}</div>
    </div>
  );

  const editField = (label: string, key: keyof Omit<UserEditableFields, "is_verified">) => (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: "3px" }}>{label}</div>
      <input
        type="text"
        value={draft[key] ?? ""}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value || null }))}
        style={userModalInputStyle}
      />
    </div>
  );

  const isActive = user.is_active !== false;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`User details — ${user.full_name ?? "Unnamed user"}`}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.48)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "20px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 12px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", padding: "28px 30px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "17px", fontWeight: 700, color: "#10C4C3" }}>
              {(user.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", fontWeight: 600, color: "#020C1C", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.full_name ?? "—"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                <RoleBadge role={user.role} />
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: user.is_verified ? "rgba(45,106,79,0.1)" : "rgba(107,114,128,0.1)", color: user.is_verified ? "#065F46" : "#374151", border: `1px solid ${user.is_verified ? "rgba(45,106,79,0.3)" : "rgba(107,114,128,0.2)"}` }}>
                  {user.is_verified ? "Verified" : "Unverified"}
                </span>
                {!isActive && (
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(239,68,68,0.1)", color: "#B91C1C", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Inactive
                  </span>
                )}
                {user.is_nri && (
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(59,130,246,0.1)", color: "#1D4ED8", border: "1px solid rgba(59,130,246,0.25)" }}>
                    NRI
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {!editing && (
              <button
                onClick={startEditing}
                style={{ padding: "7px 14px", borderRadius: "8px", background: "rgba(16,196,195,0.1)", color: "#0B6E96", border: "1.5px solid rgba(16,196,195,0.3)", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)" }}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close user details"
              style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151", flexShrink: 0 }}
            >
              <IconX />
            </button>
          </div>
        </div>

        {/* Deactivate/Reactivate — prominent, not buried in the edit form */}
        <button
          onClick={() => void handleToggleActive()}
          disabled={togglingActive}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "10px", borderRadius: "9px", marginBottom: "18px", fontSize: "12px", fontWeight: 700,
            letterSpacing: "0.04em", fontFamily: "var(--font-body-new)", cursor: togglingActive ? "not-allowed" : "pointer",
            opacity: togglingActive ? 0.6 : 1,
            background: isActive ? "rgba(239,68,68,0.08)" : "rgba(52,211,153,0.1)",
            color: isActive ? "#B91C1C" : "#065F46",
            border: `1.5px solid ${isActive ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.35)"}`,
          }}
        >
          {togglingActive ? "Updating…" : isActive ? "Deactivate Account" : "Reactivate Account"}
        </button>

        {/* Subscription tier */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "18px", padding: "10px 14px", background: "#F8F6F1", borderRadius: "9px", border: "1px solid rgba(13,43,31,0.07)" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#374151" }}>Subscription Tier</span>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <select
              value={user.subscription_tier ?? "free"}
              onChange={e => onSubscriptionTierChange(user.id, e.target.value)}
              style={{ padding: "6px 28px 6px 10px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.15)", borderRadius: "7px", fontSize: "12px", fontWeight: 600, color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: "pointer" }}
            >
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(0,0,0,0.4)", fontSize: 9 }}>▼</span>
          </div>
        </div>

        {/* Fields */}
        {editing ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.07)" }}>
            {editField("Full Name", "full_name")}
            {editField("Email", "email")}
            {editField("Phone", "phone")}
            {editField("City", "city")}
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#374151", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={draft.is_verified ?? false}
                onChange={e => setDraft(d => ({ ...d, is_verified: e.target.checked }))}
              />
              Verified
            </label>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.07)" }}>
            {field("Email", user.email ? <a href={`mailto:${user.email}`} style={{ color: "#374151" }}>{user.email}</a> : null)}
            {field("Phone", user.phone)}
            {field("WhatsApp", user.whatsapp)}
            {field("City", user.city)}
            {field("Nationality", user.nationality)}
            {field("Joined", fmtDate(user.created_at))}
            {field("Role", user.role ?? "buyer")}
          </div>
        )}

        {editing && (
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: "9px", background: "#F8F6F1", color: "#374151", border: "1px solid rgba(13,43,31,0.1)", fontWeight: 600, fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
            >
              Cancel
            </button>
          </div>
        )}

        {!editing && user.bio && (
          <div style={{ marginTop: "18px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: "5px" }}>Bio</div>
            <div style={{ background: "#F8F6F1", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#374151", lineHeight: 1.6 }}>{user.bio}</div>
          </div>
        )}

      </div>
    </div>
  );
}

function UsersSection({
  users, loading, activeUsers, activeUsersLoading, lastSignIns, onRoleChange, onUpdateUser, onSubscriptionTierChange,
}: {
  users: UserRow[];
  loading: boolean;
  activeUsers: number | null;
  activeUsersLoading: boolean;
  lastSignIns: Record<string, string | null>;
  onRoleChange: (userId: string, newRole: string) => void;
  onUpdateUser: (userId: string, changes: Partial<UserRow>) => Promise<void>;
  onSubscriptionTierChange: (userId: string, newTier: string) => void;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort,       setSort]       = useState<UserSort>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const selected = users.find(u => u.id === selectedId) ?? null;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter(u =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") list = list.filter(u => (u.role ?? "buyer") === roleFilter);
    const sorted = [...list];
    if (sort === "newest")  sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    if (sort === "oldest")  sorted.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
    if (sort === "name_az") sorted.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    if (sort === "name_za") sorted.sort((a, b) => (b.full_name ?? "").localeCompare(a.full_name ?? ""));
    return sorted;
  }, [users, search, roleFilter, sort]);

  const roleCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      const r = u.role ?? "buyer";
      counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [users]);

  if (loading) return <Spinner />;

  const filtersActive = search.trim() !== "" || roleFilter !== "all";

  return (
    <div>
      <SectionHeading title="All Users" subtitle="Manage user roles across the platform." count={users.length} />

      {/* Summary stats */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
        <StatCard
          label="Total Users"
          value={users.length}
          accent="blue"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Active Users"
          value={activeUsersLoading ? "…" : activeUsers ?? "—"}
          accent="green"
          note="Signed in within 30 days"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            aria-label="Search users by name, phone, or email"
            style={{ flex: "1 1 240px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3" }}
          />
          <div style={{ position: "relative", flexShrink: 0 }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as UserSort)}
              aria-label="Sort users"
              style={{ padding: "10px 30px 10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3", appearance: "none", cursor: "pointer" }}
            >
              {(Object.keys(USER_SORT_LABELS) as UserSort[]).map(k => (
                <option key={k} value={k}>{USER_SORT_LABELS[k]}</option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
          </div>
        </div>
        {/* Role filter pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["all", ...ROLE_FILTER_OPTIONS].map(r => {
            const on = roleFilter === r;
            const count = r === "all" ? users.length : (roleCounts[r] ?? 0);
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, letterSpacing: "0.03em", background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" as const, transition: "all 0.14s" }}
              >
                {r === "all" ? "All" : r.replace(/_/g, " ")} ({count})
              </button>
            );
          })}
        </div>
        {filtersActive && (
          <div style={{ fontSize: "12px", color: "#A9B4C2" }}>
            {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {users.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No users found</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF", marginBottom: "6px" }}>No users match</p>
          <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Try adjusting the search or role filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(u => (
            <div
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(u.id); } }}
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", cursor: "pointer" }}
            >
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1.5px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#10C4C3", fontFamily: "var(--font-body-new)" }}>
                  {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ position: "absolute", right: "-2px", bottom: "-2px" }}>
                  <PresenceDot lastSignIn={lastSignIns[u.id]} now={now} />
                </div>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.full_name ?? "—"}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px" }}>
                  {u.city && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{u.city}</span>}
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>Joined {u.created_at ? fmtDate(u.created_at) : "—"}</span>
                </div>
              </div>
              <RoleBadge role={u.role} />
              {/* Role dropdown */}
              <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <select
                  value={u.role ?? "buyer"}
                  onChange={e => onRoleChange(u.id, e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  style={{ padding: "6px 28px 6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r} style={{ background: "#0A1526", color: "#FFFFFF" }}>{r}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelectedId(null)}
          onSave={onUpdateUser}
          onSubscriptionTierChange={onSubscriptionTierChange}
        />
      )}
    </div>
  );
}

// ── Section: All Inquiries ─────────────────────────────────────────────────────

const INQUIRY_STATUS_FILTERS = ["all", "new", "contacted", "closed", "spam"] as const;
type InquiryStatusFilter = typeof INQUIRY_STATUS_FILTERS[number];

type InquirySort = "newest" | "oldest";

const INQUIRY_SORT_LABELS: Record<InquirySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

function InquiriesSection({
  inquiries, loading, inFlight, onDelete, onMarkSpam,
}: {
  inquiries: InquiryRow[];
  loading: boolean;
  inFlight: string | null;
  onDelete: (id: string) => void;
  onMarkSpam: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InquirySort>("newest");

  const filtered = React.useMemo(() => {
    let list = inquiries;
    if (statusFilter !== "all") list = list.filter(inq => (inq.status ?? "new") === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(inq =>
        (inq.inquirer_name ?? "").toLowerCase().includes(q) ||
        (inq.inquirer_email ?? "").toLowerCase().includes(q) ||
        (inq.inquirer_phone ?? "").toLowerCase().includes(q) ||
        (inq.property_title ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    if (sort === "oldest") sorted.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
    return sorted;
  }, [inquiries, statusFilter, search, sort]);

  if (loading) return <Spinner />;

  const filtersActive = search.trim() !== "" || statusFilter !== "all";

  return (
    <div>
      <SectionHeading title="All Inquiries" subtitle="Platform-wide buyer inquiries." count={inquiries.length} />

      {/* Search + sort */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or property…"
          aria-label="Search inquiries by name, email, phone, or property"
          style={{ flex: "1 1 240px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "13px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3" }}
        />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as InquirySort)}
            aria-label="Sort inquiries"
            style={{ padding: "10px 30px 10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3", appearance: "none", cursor: "pointer" }}
          >
            {(Object.keys(INQUIRY_SORT_LABELS) as InquirySort[]).map(k => (
              <option key={k} value={k}>{INQUIRY_SORT_LABELS[k]}</option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
        {INQUIRY_STATUS_FILTERS.map(f => {
          const on = statusFilter === f;
          const count = f === "all" ? inquiries.length : inquiries.filter(inq => (inq.status ?? "new") === f).length;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, letterSpacing: "0.03em", background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" as const, transition: "all 0.14s" }}
            >
              {f === "all" ? "All" : f} ({count})
            </button>
          );
        })}
      </div>
      {filtersActive && (
        <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "12px" }}>
          {filtered.length} of {inquiries.length} inquiries
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>
            {search.trim() !== "" ? "No inquiries match" : `No ${statusFilter === "all" ? "inquiries" : `${statusFilter} inquiries`} yet`}
          </p>
          {search.trim() !== "" && <p style={{ fontSize: "13px", color: "#A9B4C2", marginTop: "6px" }}>Try adjusting the search or status filter.</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(inq => {
            const isSpam = inq.status === "spam";
            const busy = inFlight === inq.id;
            return (
              <div key={inq.id} style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", padding: "18px 22px", opacity: busy ? 0.55 : 1, transition: "opacity 0.2s" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#FFFFFF" }}>
                      {inq.inquirer_name ?? "Anonymous"}
                    </span>
                    {inq.inquiry_type && (
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.1)" : inq.inquiry_type === "agent_contact" ? "rgba(245,158,11,0.12)" : "rgba(16,196,195,0.12)", color: inq.inquiry_type === "viewing" ? "#34D399" : inq.inquiry_type === "agent_contact" ? "#F59E0B" : "#10C4C3", border: `1px solid ${inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.25)" : inq.inquiry_type === "agent_contact" ? "rgba(245,158,11,0.3)" : "rgba(16,196,195,0.3)"}` }}>
                        {inq.inquiry_type}
                      </span>
                    )}
                    {inq.status && (
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: isSpam ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.07)", color: isSpam ? "#F87171" : "#A9B4C2", border: `1px solid ${isSpam ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                        {inq.status}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{fmtDate(inq.created_at)}</span>
                </div>
                {/* Property */}
                {inq.property_title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "12px", color: "#A9B4C2" }}>
                    <IconBuilding />
                    {inq.property_slug
                      ? <a href={`/property/${inq.property_slug}`} style={{ color: "#FFFFFF", fontWeight: 500, textDecoration: "none" }}>{inq.property_title}</a>
                      : <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{inq.property_title}</span>
                    }
                    {inq.seller_email && <span style={{ color: "rgba(255,255,255,0.45)" }}>→ {inq.seller_email}</span>}
                  </div>
                )}
                {/* Assigned agent — only meaningful for agent_contact rows
                    today (property inquiries get assigned later, by an
                    admin), but shown for any row that has it set. */}
                {inq.assigned_to && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "12px", color: "#A9B4C2" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>Contacted:</span>
                    <span style={{ color: "#FFFFFF", fontWeight: 500 }}>
                      {inq.agent_profiles?.profiles?.full_name ?? "Unnamed agent"}
                    </span>
                  </div>
                )}
                {/* Contact */}
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: inq.message ? "10px" : 0, fontSize: "12px" }}>
                  {inq.inquirer_phone && <a href={`tel:${inq.inquirer_phone}`} style={{ color: "#A9B4C2", textDecoration: "none" }}>{inq.inquirer_phone}</a>}
                  {inq.inquirer_email && <a href={`mailto:${inq.inquirer_email}`} style={{ color: "#A9B4C2", textDecoration: "none" }}>{inq.inquirer_email}</a>}
                </div>
                {/* Message */}
                {inq.message && (
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#A9B4C2", lineHeight: 1.6, borderLeft: "3px solid rgba(16,196,195,0.4)", marginBottom: "12px" }}>
                    {inq.message}
                  </div>
                )}
                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {!isSpam && (
                    <button
                      onClick={() => onMarkSpam(inq.id)}
                      disabled={busy}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
                    >
                      Mark as Spam
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm("Permanently delete this inquiry? This cannot be undone.")) onDelete(inq.id);
                    }}
                    disabled={busy}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
                  >
                    <IconReject /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section: Agent Applications ─────────────────────────────────────────────────

const AGENT_STATUS_FILTERS = ["pending", "approved", "rejected", "incomplete"] as const;
type AgentStatusFilter = typeof AGENT_STATUS_FILTERS[number];

function AgentCard({
  app, inFlight, actions, documents, listings, leadCount, expanded, onToggleExpand,
}: {
  app: AgentApplication;
  inFlight: boolean;
  actions: React.ReactNode;
  documents: AgentDocumentRow[];
  listings: AdminListing[];
  leadCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const cities = (app.agent_service_cities ?? []).map(c => c.city);
  const missing = incompleteAgentAppReasons(app);
  const activeListingsCount = listings.filter(l => l.status === "active").length;
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "18px 22px", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <StatusBadge status={app.status === "approved" ? "active" : app.status === "pending" ? "pending_review" : "rejected"} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{fmtDate(app.created_at)}</span>
            {missing.length > 0 && (
              <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
                ⚠ Missing {missing.join("/")}
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.25, marginBottom: "4px" }}>
            {app.profiles?.full_name ?? "Unnamed applicant"}
          </h3>
          <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#A9B4C2", flexWrap: "wrap" }}>
            {app.profiles?.phone && <a href={`tel:${app.profiles.phone}`} style={{ color: "#A9B4C2", textDecoration: "none" }}>{app.profiles.phone}</a>}
            {app.profiles?.email && <a href={`mailto:${app.profiles.email}`} style={{ color: "#A9B4C2", textDecoration: "none" }}>{app.profiles.email}</a>}
            {app.agency_name && <span>{app.agency_name}</span>}
            {app.years_experience != null && <span>{app.years_experience} yrs experience</span>}
          </div>
        </div>
      </div>

      {/* Stats — computed from property_listings.assigned_agent_id and
          inquiries.assigned_to (both existing FKs), passed down already
          grouped by AgentsSection. Shown regardless of application
          status: an approved agent's ongoing activity is exactly what
          this is for, not just pending-application review context. */}
      <div style={{ display: "flex", gap: "18px", marginBottom: "10px", fontSize: "12px", color: "#A9B4C2" }}>
        <span><strong style={{ color: "#FFFFFF" }}>{listings.length}</strong> Listings</span>
        <span><strong style={{ color: "#FFFFFF" }}>{activeListingsCount}</strong> Active</span>
        <span><strong style={{ color: "#FFFFFF" }}>{leadCount}</strong> Leads</span>
      </div>

      {app.license_number && (
        <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "8px" }}>
          License: <span style={{ color: "#FFFFFF" }}>{app.license_number}</span>
        </div>
      )}

      {app.rera_number && (
        <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "8px" }}>
          RERA: <span style={{ color: "#FFFFFF" }}>{app.rera_number}</span>
        </div>
      )}

      {cities.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
          {cities.map(c => (
            <span key={c} style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 600, background: "rgba(16,196,195,0.1)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)" }}>{c}</span>
          ))}
        </div>
      )}

      {app.bio && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#A9B4C2", lineHeight: 1.6, borderLeft: "3px solid rgba(16,196,195,0.4)", marginBottom: "8px" }}>
          {app.bio}
        </div>
      )}

      {/* KYC Documents — visibility only, no bearing on approve/reject.
          Same 4-item checklist as the agent's own profile page. */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>KYC Documents</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {KYC_DOCUMENT_TYPES.map(slot => {
            // documents is created_at desc for this agent, so the first
            // match per type is the most recent — same logic as the
            // agent's own profile page.
            const doc = documents.find(d => d.document_type === slot.key);
            return (
              <div key={slot.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                <span style={{ color: "#A9B4C2" }}>{slot.label}</span>
                {doc ? (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#4ADE80", textDecoration: "none", fontWeight: 600 }}>
                    ✓ Uploaded ({fmtDate(doc.created_at)})
                  </a>
                ) : (
                  <span style={{ color: "#6B7686" }}>Not uploaded</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        {actions}
        {listings.length > 0 && (
          <button
            onClick={onToggleExpand}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.06)", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.15)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            {expanded ? "Hide Properties" : `View Properties (${listings.length})`}
          </button>
        )}
      </div>

      {/* Drill-down — reuses the same ListingCard already used by the
          Pending/Approved/Rejected sections, rather than a second
          listing-row component. Read-only here (View link only): this
          is a browse view of the agent's properties, not a place to
          change listing status — that already exists in the Listings-
          scoped sections. */}
      {expanded && listings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              inFlight={false}
              actions={
                l.slug ? (
                  <a
                    href={`/property/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "rgba(16,196,195,0.1)", color: "#10C4C3", border: "1.5px solid rgba(16,196,195,0.3)", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
                  >
                    View Listing
                  </a>
                ) : <></>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CityMultiSelect({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const toggle = (city: string) => {
    onChange(selected.includes(city) ? selected.filter(c => c !== city) : [...selected, city]);
  };
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {CITIES.map(city => {
        const on = selected.includes(city);
        return (
          <button
            type="button"
            key={city}
            onClick={() => toggle(city)}
            style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)" }}
          >
            {city}
          </button>
        );
      })}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "13px",
  color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase" as const, color: "#A9B4C2", marginBottom: "6px",
};

function AddAgentModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: {
    userId: string; licenseNumber: string; agencyName: string; bio: string;
    yearsExperience: string; cities: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileSearchRow | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const id = setTimeout(() => {
      supabase
        .from("profiles")
        .select("id, full_name, phone, email, role")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8)
        .then((res: { data: unknown }) => {
          setResults((res.data as ProfileSearchRow[] | null) ?? []);
          setSearching(false);
        });
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const handleSubmit = async () => {
    if (!selectedUser) { setError("Select a user first."); return; }
    setSubmitting(true);
    setError(null);
    const res = await onSubmit({ userId: selectedUser.id, licenseNumber, agencyName, bio, yearsExperience, cities });
    setSubmitting(false);
    if (!res.ok) setError(res.error ?? "Failed to add agent.");
    else onClose();
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add agent manually"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "520px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "24px", fontWeight: 600, color: "#FFFFFF" }}>Add Agent Manually</h3>
          <button onClick={onClose} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF" }}>
            <IconX />
          </button>
        </div>

        {!selectedUser ? (
          <div>
            <label style={labelStyle}>Search user by name, phone, or email</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Start typing…"
              style={inputStyle}
              autoFocus
            />
            {searching && <div style={{ marginTop: "10px" }}><Spinner size={20} pad={10} /></div>}
            {!searching && results.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedUser(r)}
                    style={{ textAlign: "left", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9px", cursor: "pointer", color: "#FFFFFF", fontFamily: "var(--font-body-new)" }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{r.full_name ?? "—"}</div>
                    <div style={{ fontSize: "11px", color: "#A9B4C2" }}>{[r.phone, r.email].filter(Boolean).join(" · ")} {r.role && `· ${r.role}`}</div>
                  </button>
                ))}
              </div>
            )}
            {!searching && search.trim().length >= 2 && results.length === 0 && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#A9B4C2" }}>No matching users.</div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(16,196,195,0.08)", border: "1px solid rgba(16,196,195,0.2)", borderRadius: "9px" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#FFFFFF" }}>{selectedUser.full_name ?? "—"}</div>
                <div style={{ fontSize: "11px", color: "#A9B4C2" }}>{[selectedUser.phone, selectedUser.email].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ fontSize: "11px", color: "#10C4C3", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Change</button>
            </div>

            <div>
              <label style={labelStyle}>License Number</label>
              <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Agency Name</label>
              <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Years of Experience</label>
              <input type="number" min="0" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
            </div>
            <div>
              <label style={labelStyle}>Service Cities</label>
              <CityMultiSelect selected={cities} onChange={setCities} />
            </div>

            {error && <div style={{ fontSize: "12px", color: "#F87171" }}>{error}</div>}

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{ padding: "12px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "13px", letterSpacing: "0.04em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
            >
              {submitting ? "Adding…" : "Add Agent"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentsSection({
  applications, loading, inFlight, onApprove, onReject, onToggleBadge, onAddAgent, documentsByProfile,
  listingsForStats, leadsForStats,
}: {
  applications: AgentApplication[];
  loading: boolean;
  inFlight: string | null;
  onApprove: (id: string, userId: string) => void;
  onReject: (id: string) => void;
  onToggleBadge: (id: string, currentValue: boolean) => void;
  onAddAgent: (data: {
    userId: string; licenseNumber: string; agencyName: string; bio: string;
    yearsExperience: string; cities: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  documentsByProfile: Record<string, AgentDocumentRow[]>;
  // Total/active listings and leads counts per agent — grouped here
  // (not passed pre-aggregated) so AgentCard's "View Properties"
  // drill-down can reuse the same per-agent listings array the counts
  // were derived from, rather than fetching it a second time.
  listingsForStats: AdminListing[];
  leadsForStats: { assigned_to: string | null }[];
}) {
  const [filter, setFilter] = useState<AgentStatusFilter>("pending");
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // "incomplete" is a derived flag, not a status value — an application can
  // be pending/approved/rejected AND incomplete at the same time, so this
  // filters across all statuses rather than narrowing to one.
  const countFor = (f: AgentStatusFilter) =>
    f === "incomplete"
      ? applications.filter(a => incompleteAgentAppReasons(a).length > 0).length
      : applications.filter(a => a.status === f).length;

  const statusFiltered = filter === "incomplete"
    ? applications.filter(a => incompleteAgentAppReasons(a).length > 0)
    : applications.filter(a => a.status === filter);

  // Search narrows within whichever status tab is active — by agent
  // name (profiles.full_name) or agency name, case-insensitive.
  const q = search.trim().toLowerCase();
  const filtered = q
    ? statusFiltered.filter(a =>
        (a.profiles?.full_name ?? "").toLowerCase().includes(q) ||
        (a.agency_name ?? "").toLowerCase().includes(q)
      )
    : statusFiltered;

  // Grouped once per render from the raw arrays passed down — assigned_
  // agent_id / assigned_to are both existing FKs to agent_profiles.id
  // (property_listings: migration 011; inquiries: migration 014), no
  // new columns needed.
  const listingsByAgent = React.useMemo(() => {
    const map: Record<string, AdminListing[]> = {};
    for (const l of listingsForStats) {
      if (!l.assigned_agent_id) continue;
      (map[l.assigned_agent_id] ??= []).push(l);
    }
    return map;
  }, [listingsForStats]);

  const leadCountByAgent = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const lead of leadsForStats) {
      if (!lead.assigned_to) continue;
      map[lead.assigned_to] = (map[lead.assigned_to] ?? 0) + 1;
    }
    return map;
  }, [leadsForStats]);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Agents" subtitle="Review public applications, add agents directly, and track established agents' listings and leads." count={filtered.length} />

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by agent or agency name…"
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "9px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)", marginBottom: "14px" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {AGENT_STATUS_FILTERS.map(f => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" as const }}
              >
                {f} ({countFor(f)})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", background: "rgba(16,196,195,0.1)", color: "#10C4C3", border: "1.5px solid rgba(16,196,195,0.3)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
        >
          + Add Agent Manually
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No {filter} applications</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map(app => (
            <AgentCard
              key={app.id}
              app={app}
              inFlight={inFlight === app.id}
              documents={documentsByProfile[app.id] ?? []}
              listings={listingsByAgent[app.id] ?? []}
              leadCount={leadCountByAgent[app.id] ?? 0}
              expanded={expandedAgentId === app.id}
              onToggleExpand={() => setExpandedAgentId(prev => prev === app.id ? null : app.id)}
              actions={
                <>
                  {filter === "pending" && (
                    <>
                      <button
                        onClick={() => onApprove(app.id, app.user_id)}
                        disabled={inFlight === app.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === app.id ? 0.6 : 1 }}
                      >
                        <IconApprove /> Approve
                      </button>
                      <button
                        onClick={() => onReject(app.id)}
                        disabled={inFlight === app.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === app.id ? 0.6 : 1 }}
                      >
                        <IconReject /> Reject
                      </button>
                    </>
                  )}
                  {/* Badge toggle — independent of Approve/Reject's pending-tab
                      gate; visible on any tab as long as the agent is
                      currently approved (badging an unapproved application
                      makes no sense — they aren't public yet). */}
                  {app.status === "approved" && (
                    <button
                      onClick={() => onToggleBadge(app.id, app.is_verified_badge)}
                      disabled={inFlight === app.id}
                      style={app.is_verified_badge ? {
                        display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === app.id ? 0.6 : 1,
                      } : {
                        display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(16,196,195,0.1)", color: "#10C4C3", border: "1.5px solid rgba(16,196,195,0.3)", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight === app.id ? 0.6 : 1,
                      }}
                    >
                      {app.is_verified_badge ? <><IconReject /> Revoke Badge</> : <><IconApprove /> Grant Badge</>}
                    </button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onSubmit={onAddAgent}
        />
      )}
    </div>
  );
}

// ── Section: 360° Capture Requests ──────────────────────────────────────────────
// Structurally modeled on AgentsSection: status filter tabs + per-card action
// buttons, same visual language (Pill-less tab buttons, same badge/button
// styling conventions used throughout this file).

const CAPTURE_360_STATUS_FILTERS = ["pending", "scheduled", "completed", "declined"] as const;
type Capture360StatusFilter = typeof CAPTURE_360_STATUS_FILTERS[number];

const CAPTURE_360_TIME_SLOTS = ["Morning (9 AM – 12 PM)", "Afternoon (12 – 4 PM)", "Evening (4 – 7 PM)"] as const;
// Maps preferred_time_slot's strict enum ('morning'/'afternoon'/
// 'evening', migration 071's CHECK constraint) to the matching full
// option string above — scheduled_time_slot itself is free text with
// no CHECK, so these are two different vocabularies for "time slot"
// and a direct value comparison between them would never match.
const PREFERRED_SLOT_TO_SCHEDULE_OPTION: Record<string, string> = {
  morning: CAPTURE_360_TIME_SLOTS[0],
  afternoon: CAPTURE_360_TIME_SLOTS[1],
  evening: CAPTURE_360_TIME_SLOTS[2],
};

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

// ── Schedule modal — repeats context, pill-picker time slots with a free-text
// fallback, and a confirmation summary line so the admin sees exactly what
// they're about to commit to before submitting. Same dark modal-overlay
// pattern already used by AddAgentModal in this file (fixed inset:0 scrim,
// centered card, Escape-to-close, backdrop-click-to-close).
function Capture360ScheduleModal({
  req, submitting, onConfirm, onCancel,
}: {
  req: Capture360Request;
  submitting: boolean;
  onConfirm: (date: string, slot: string, notes: string) => void;
  onCancel: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  // Pre-filled from the requester's own preference (071), still fully
  // editable — the admin can confirm as-is or pick something different
  // before submitting. Falls back to today's defaults when no
  // preference was given, exactly as before this change.
  const [date, setDate] = useState(req.preferred_date ?? "");
  const [slotChoice, setSlotChoice] = useState<string>(
    (req.preferred_time_slot && PREFERRED_SLOT_TO_SCHEDULE_OPTION[req.preferred_time_slot]) || CAPTURE_360_TIME_SLOTS[0]
  );
  const [customSlot, setCustomSlot] = useState("");
  const [notes, setNotes] = useState("");
  const usingCustom = slotChoice === "other";
  const finalSlot = usingCustom ? customSlot.trim() : slotChoice;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule 360° capture"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF" }}>Schedule Capture</h3>
          <button onClick={onCancel} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF" }}>
            <IconX />
          </button>
        </div>

        {/* Context repeated so the admin isn't scheduling blind */}
        <div style={{ marginBottom: "18px" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>{req.property_listings?.title ?? "Untitled listing"}</p>
          {(req.property_listings?.address || req.property_listings?.city) && (
            <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "4px" }}>
              {[req.property_listings?.address, req.property_listings?.city].filter(Boolean).join(", ")}
            </p>
          )}
          <p style={{ fontSize: "12px", color: "#6B7686" }}>
            {[req.profiles?.full_name, req.profiles?.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Date</label>
        <input
          type="date" value={date} min={todayStr} onChange={e => setDate(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)", marginBottom: "16px" }}
        />

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Time slot</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
          {CAPTURE_360_TIME_SLOTS.map(s => (
            <button key={s} onClick={() => setSlotChoice(s)}
              style={{ padding: "6px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: slotChoice === s ? 700 : 500, background: slotChoice === s ? "#10C4C3" : "rgba(255,255,255,0.06)", color: slotChoice === s ? "#020C1C" : "#A9B4C2", border: slotChoice === s ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
            >
              {s}
            </button>
          ))}
          <button onClick={() => setSlotChoice("other")}
            style={{ padding: "6px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: usingCustom ? 700 : 500, background: usingCustom ? "#10C4C3" : "rgba(255,255,255,0.06)", color: usingCustom ? "#020C1C" : "#A9B4C2", border: usingCustom ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Other
          </button>
        </div>
        {usingCustom && (
          <input
            type="text" value={customSlot} onChange={e => setCustomSlot(e.target.value)} placeholder="e.g. 10:00 AM – 12:00 PM"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "12px", fontFamily: "var(--font-body-new)", marginBottom: "16px" }}
          />
        )}

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px", marginTop: usingCustom ? 0 : "10px" }}>Notes for the requester (optional)</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "12px", fontFamily: "var(--font-body-new)", resize: "vertical", marginBottom: "16px" }}
        />

        {date && (
          <div style={{ padding: "11px 14px", background: "rgba(16,196,195,0.08)", border: "1px solid rgba(16,196,195,0.25)", borderRadius: "8px", fontSize: "12px", color: "#A9B4C2", marginBottom: "18px" }}>
            Scheduling for <strong style={{ color: "#FFFFFF" }}>{req.property_listings?.title ?? "this listing"}</strong> on <strong style={{ color: "#10C4C3" }}>{date}</strong>{finalSlot ? <>, <strong style={{ color: "#10C4C3" }}>{finalSlot}</strong></> : ""}.
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { if (date) onConfirm(date, finalSlot, notes); }}
            disabled={!date || submitting}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: !date || submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: !date || submitting ? 0.6 : 1 }}
          >
            {submitting ? "Scheduling…" : "Confirm Schedule"}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "11px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Decline modal — replaces the previous window.prompt() reason
// capture. Same modal shell/interaction pattern as
// Capture360ScheduleModal (fixed inset:0 scrim, centered card,
// Escape-to-close, backdrop-click-to-close) for consistency. Notes are
// still free text (unchanged, "reason, as today"); the two alternative
// dates are structured date inputs (migration 072), not free text —
// per explicit scope, so notify-capture-requester can format them
// cleanly rather than parsing them back out of a sentence.
function Capture360DeclineModal({
  req, submitting, onConfirm, onCancel,
}: {
  req: Capture360Request;
  submitting: boolean;
  onConfirm: (notes: string, altDate1: string, altDate2: string) => void;
  onCancel: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [notes, setNotes] = useState("");
  const [altDate1, setAltDate1] = useState("");
  const [altDate2, setAltDate2] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Decline 360° capture request"
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "var(--font-body-new)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#FFFFFF" }}>Decline Request</h3>
          <button onClick={onCancel} aria-label="Close" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFFFFF" }}>
            <IconX />
          </button>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>{req.property_listings?.title ?? "Untitled listing"}</p>
          <p style={{ fontSize: "12px", color: "#6B7686" }}>
            {[req.profiles?.full_name, req.profiles?.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Reason for declining (optional, shown to the requester)</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "12px", fontFamily: "var(--font-body-new)", resize: "vertical", marginBottom: "16px" }}
        />

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Suggest alternative date 1 (optional)</label>
        <input
          type="date" value={altDate1} min={todayStr} onChange={e => setAltDate1(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)", marginBottom: "14px" }}
        />

        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#6B7686", marginBottom: "6px" }}>Suggest alternative date 2 (optional)</label>
        <input
          type="date" value={altDate2} min={todayStr} onChange={e => setAltDate2(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: "13px", fontFamily: "var(--font-body-new)", marginBottom: "18px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => onConfirm(notes, altDate1, altDate2)}
            disabled={submitting}
            style={{ flex: 1, padding: "11px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.35)", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Declining…" : "Confirm Decline"}
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "11px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Capture360Card({
  req, inFlight, onScheduleClick, onDeclineClick, onComplete,
}: {
  req: Capture360Request;
  inFlight: boolean;
  onScheduleClick: () => void;
  onDeclineClick: () => void;
  onComplete: () => void;
}) {
  const statusColors: Record<string, { text: string; bg: string; border: string }> = {
    pending:   { text: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
    scheduled: { text: "#10C4C3", bg: "rgba(16,196,195,0.12)",  border: "rgba(16,196,195,0.3)"   },
    completed: { text: "#34D399", bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.25)"  },
    declined:  { text: "#F87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.3)"  },
  };
  const sc = statusColors[req.status] ?? statusColors.pending;

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "20px 24px", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.25 }}>
          {req.property_listings?.title ?? "Untitled listing"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          <span style={{ padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
            {req.status}
          </span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{fmtDate(req.created_at)}</span>
        </div>
      </div>

      {(req.property_listings?.address || req.property_listings?.city) && (
        <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "8px" }}>
          {[req.property_listings?.address, req.property_listings?.city].filter(Boolean).join(", ")}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#A9B4C2", flexWrap: "wrap", marginBottom: "12px" }}>
        <IconUsers />
        {req.profiles?.full_name && <span>{req.profiles.full_name}</span>}
        {req.profiles?.phone && <a href={`tel:${req.profiles.phone}`} style={{ color: "#A9B4C2", textDecoration: "none" }}>· {req.profiles.phone}</a>}
      </div>

      {/* Requester's own preference (071) — distinct from the admin's
          confirmed scheduled_date/scheduled_time_slot badge below, shown
          regardless of status since it's useful context throughout the
          request's lifecycle, not just while pending. */}
      {req.preferred_date && (
        <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "8px" }}>
          Requested: {fmtDate(req.preferred_date)}
          {req.preferred_time_slot ? `, ${req.preferred_time_slot.charAt(0).toUpperCase()}${req.preferred_time_slot.slice(1)}` : ""}
        </p>
      )}

      {req.status === "scheduled" && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "rgba(16,196,195,0.1)", border: "1px solid rgba(16,196,195,0.25)", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#10C4C3", marginBottom: "10px" }}>
          <IconClock /> {req.scheduled_date ?? "—"}{req.scheduled_time_slot ? ` · ${req.scheduled_time_slot}` : ""}
        </div>
      )}
      {req.admin_notes && (
        <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "10px", fontStyle: "italic" }}>
          Note: {req.admin_notes}
        </p>
      )}
      {(req.suggested_alternative_date_1 || req.suggested_alternative_date_2) && (
        <p style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "10px" }}>
          Suggested alternatives: {[req.suggested_alternative_date_1, req.suggested_alternative_date_2].filter(Boolean).map(d => fmtDate(d as string)).join(", ")}
        </p>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {req.status === "pending" && (
          <>
            <button
              onClick={onScheduleClick}
              disabled={inFlight}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}
            >
              <IconApprove /> Schedule
            </button>
            <button
              onClick={onDeclineClick}
              disabled={inFlight}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}
            >
              <IconReject /> Decline
            </button>
          </>
        )}
        {req.status === "scheduled" && (
          <button
            onClick={onComplete}
            disabled={inFlight}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: inFlight ? 0.6 : 1 }}
          >
            <IconApprove /> Mark Completed
          </button>
        )}
      </div>
    </div>
  );
}

function Capture360Section({
  requests, loading, inFlight, onSchedule, onDecline, onComplete,
}: {
  requests: Capture360Request[];
  loading: boolean;
  inFlight: string | null;
  onSchedule: (req: Capture360Request, date: string, slot: string, notes: string) => void;
  onDecline: (req: Capture360Request, notes: string, altDate1: string, altDate2: string) => void;
  onComplete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Capture360StatusFilter>("pending");
  const [schedulingReq, setSchedulingReq] = useState<Capture360Request | null>(null);
  const [decliningReq, setDecliningReq] = useState<Capture360Request | null>(null);
  const filtered = requests.filter(r => r.status === filter);

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const scheduledThisWeek = requests.filter(r => {
    if (r.status !== "scheduled") return false;
    const d = daysFromNow(r.scheduled_date);
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const now = new Date();
  const completedThisMonth = requests.filter(r => {
    if (r.status !== "completed") return false;
    const d = new Date(r.updated_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const declinedCount = requests.filter(r => r.status === "declined").length;

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="360° Capture Requests" subtitle="Review and schedule professional 360° captures requested by sellers and agents." count={filtered.length} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Pending"               value={pendingCount}       icon={<IconClock />}  accent="gold" />
        <StatCard label="Scheduled This Week"    value={scheduledThisWeek} icon={<IconCamera />} accent="blue" note="Next 7 days" />
        <StatCard label="Completed This Month"   value={completedThisMonth} icon={<IconCheck />}  accent="green" />
        <StatCard label="Declined"               value={declinedCount}      icon={<IconX />}      accent="red" />
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
        {CAPTURE_360_STATUS_FILTERS.map(f => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" as const }}
            >
              {f} ({requests.filter(r => r.status === f).length})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No {filter} requests</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map(req => (
            <Capture360Card
              key={req.id}
              req={req}
              inFlight={inFlight === req.id}
              onScheduleClick={() => setSchedulingReq(req)}
              onDeclineClick={() => setDecliningReq(req)}
              onComplete={() => onComplete(req.id)}
            />
          ))}
        </div>
      )}

      {schedulingReq && (
        <Capture360ScheduleModal
          req={schedulingReq}
          submitting={inFlight === schedulingReq.id}
          onConfirm={(date, slot, notes) => {
            onSchedule(schedulingReq, date, slot, notes);
            setSchedulingReq(null);
          }}
          onCancel={() => setSchedulingReq(null)}
        />
      )}

      {decliningReq && (
        <Capture360DeclineModal
          req={decliningReq}
          submitting={inFlight === decliningReq.id}
          onConfirm={(notes, altDate1, altDate2) => {
            onDecline(decliningReq, notes, altDate1, altDate2);
            setDecliningReq(null);
          }}
          onCancel={() => setDecliningReq(null)}
        />
      )}
    </div>
  );
}

// ── Section: Reports ─────────────────────────────────────────────────────────────

// Order matches the compliance brief's flow: Received(open) ->
// Acknowledged -> Frozen -> Under Review -> Resolved/Rejected
// (resolved/dismissed). The original three tabs' position, label, and
// count-badge behavior are unchanged — only three tabs were inserted.
const REPORT_STATUS_FILTERS = ["open", "acknowledged", "frozen", "under_review", "resolved", "dismissed"] as const;
type ReportStatusFilter = typeof REPORT_STATUS_FILTERS[number];

// Badge colors for the new statuses — reusing the codebase's existing
// blue accent (StatCard's "blue": #3B82F6, admin/page.tsx:299) for
// Acknowledged, plus two new cool-toned colors (sky/violet) so all six
// statuses stay visually distinct without touching the pill shape/
// typography pattern already established for open/resolved/dismissed.
const REPORT_STATUS_BADGE: Record<ReportRow["status"], { bg: string; color: string; border: string }> = {
  open:          { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B", border: "rgba(245,158,11,0.3)" },
  acknowledged:  { bg: "rgba(59,130,246,0.15)",   color: "#3B82F6", border: "rgba(59,130,246,0.3)" },
  frozen:        { bg: "rgba(56,189,248,0.15)",   color: "#38BDF8", border: "rgba(56,189,248,0.3)" },
  under_review:  { bg: "rgba(167,139,250,0.15)",  color: "#A78BFA", border: "rgba(167,139,250,0.3)" },
  resolved:      { bg: "rgba(52,211,153,0.15)",   color: "#34D399", border: "rgba(52,211,153,0.3)" },
  dismissed:     { bg: "rgba(255,255,255,0.08)",  color: "#A9B4C2", border: "rgba(255,255,255,0.12)" },
};

function ReportCard({
  report, listingPreview, profilePreview, busy,
  onDismiss, onResolve, onRejectListing, onDeactivateUser,
  onAcknowledge, onMoveUnderReview, onFreezeListing, onUnfreezeListing,
}: {
  report: ReportRow;
  listingPreview: ReportListingPreview | undefined;
  profilePreview: ReportProfilePreview | undefined;
  busy: boolean;
  onDismiss: () => void;
  onResolve: () => void;
  onRejectListing: () => void;
  onDeactivateUser: () => void;
  onAcknowledge: () => void;
  onMoveUnderReview: () => void;
  onFreezeListing: () => void;
  onUnfreezeListing: () => void;
}) {
  const isOpen = report.status === "open";
  // "Actionable" broadens the old isOpen-only gate so a report doesn't
  // become a dead end once it leaves 'open' — Resolve/Dismiss/Reject
  // Listing/Deactivate User keep doing exactly what they did before
  // (same transitions, same confirms, same audit log calls); they're
  // now also reachable from the three new intermediate statuses, not
  // just from 'open'.
  const isActionable = report.status !== "resolved" && report.status !== "dismissed";
  const isListingFrozen = listingPreview?.status === "frozen";
  const badge = REPORT_STATUS_BADGE[report.status];
  const now = Date.now();
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "18px 22px", opacity: busy ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            {report.status.replace("_", " ")}
          </span>
          {isListingFrozen && report.entity_type === "listing" && (
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(56,189,248,0.12)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.25)" }}>
              Listing Frozen
            </span>
          )}
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)" }}>
            {report.entity_type}
          </span>
          {report.request_type === "deletion_request" && (
            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.30)" }}>
              Deletion Request
            </span>
          )}
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#FFFFFF" }}>{report.reason}</span>
        </div>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{fmtDateTime(report.created_at)}</span>
      </div>

      {/* Reported entity preview */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "12px", color: "#A9B4C2" }}>
        {report.entity_type === "listing" ? (
          listingPreview?.slug ? (
            <a href={`/property/${listingPreview.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#FFFFFF", fontWeight: 500, textDecoration: "none" }}>
              {listingPreview.title ?? "View listing"} <IconArrow />
            </a>
          ) : (
            <span>{listingPreview?.title ?? "Listing unavailable (may have been deleted)"}</span>
          )
        ) : (
          <span style={{ color: "#FFFFFF", fontWeight: 500 }}>
            {profilePreview?.full_name ?? profilePreview?.email ?? "Profile unavailable"}
            {profilePreview?.is_active === false && <span style={{ color: "#F87171", fontWeight: 700 }}> · Inactive</span>}
          </span>
        )}
      </div>

      {/* Reporter */}
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: report.details ? "8px" : "12px" }}>
        Reported by <span style={{ color: "#A9B4C2", fontWeight: 600 }}>{report.profiles?.full_name ?? report.profiles?.email ?? "Unknown user"}</span>
      </div>

      {report.details && (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#A9B4C2", lineHeight: 1.6, borderLeft: "3px solid rgba(16,196,195,0.4)", marginBottom: "12px" }}>
          {report.details}
        </div>
      )}

      {!isOpen && report.resolved_at && (
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>
          {report.status === "resolved" ? "Resolved" : "Dismissed"} {fmtDateTime(report.resolved_at)}
        </div>
      )}

      {(report.sla_acknowledge_due_at || report.sla_resolve_due_at) && (
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px", marginBottom: "10px" }}>
          {report.sla_acknowledge_due_at && (() => {
            const overdue = isActionable && new Date(report.sla_acknowledge_due_at).getTime() < now;
            return (
              <span style={{ color: overdue ? "#F87171" : "rgba(255,255,255,0.45)", fontWeight: overdue ? 700 : 400 }}>
                Acknowledge SLA: {fmtDateTime(report.sla_acknowledge_due_at)}{overdue ? " · Overdue" : ""}
              </span>
            );
          })()}
          {report.sla_resolve_due_at && (() => {
            const overdue = isActionable && new Date(report.sla_resolve_due_at).getTime() < now;
            return (
              <span style={{ color: overdue ? "#F87171" : "rgba(255,255,255,0.45)", fontWeight: overdue ? 700 : 400 }}>
                Resolve SLA: {fmtDateTime(report.sla_resolve_due_at)}{overdue ? " · Overdue" : ""}
              </span>
            );
          })()}
        </div>
      )}

      {isActionable && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {report.status === "open" && (
            <button
              onClick={onAcknowledge}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "1.5px solid rgba(59,130,246,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
            >
              Acknowledge
            </button>
          )}
          {report.status !== "under_review" && (
            <button
              onClick={onMoveUnderReview}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1.5px solid rgba(167,139,250,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
            >
              Move to Under Review
            </button>
          )}
          {report.entity_type === "listing" && (
            isListingFrozen ? (
              <button
                onClick={() => {
                  if (window.confirm("Unfreeze this listing and restore it to active?")) onUnfreezeListing();
                }}
                disabled={busy}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#38BDF8", color: "#020C1C", border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
              >
                Unfreeze
              </button>
            ) : listingPreview && (
              <button
                onClick={() => {
                  // Deliberately distinct from "Reject Listing" below:
                  // freeze is reversible (Unfreeze restores 'active'),
                  // reject is not undoable from this panel.
                  if (window.confirm("Freeze this listing (hide it from public view, reversible) and mark the report Frozen?")) onFreezeListing();
                }}
                disabled={busy}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(56,189,248,0.12)", color: "#38BDF8", border: "1.5px solid rgba(56,189,248,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
              >
                Freeze Listing
              </button>
            )
          )}
          <button
            onClick={onResolve}
            disabled={busy}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#10C4C3", color: "#020C1C", border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
          >
            <IconApprove /> Resolve
          </button>
          <button
            onClick={onDismiss}
            disabled={busy}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
          >
            Dismiss
          </button>
          {report.entity_type === "listing" && listingPreview && listingPreview.status !== "rejected" && (
            <button
              onClick={() => {
                if (window.confirm("Reject this listing and resolve the report?")) onRejectListing();
              }}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
            >
              <IconReject /> Reject Listing
            </button>
          )}
          {report.entity_type === "profile" && profilePreview && profilePreview.is_active !== false && (
            <button
              onClick={() => {
                if (window.confirm("Deactivate this user's account and resolve the report?")) onDeactivateUser();
              }}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", opacity: busy ? 0.6 : 1 }}
            >
              Deactivate User
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReportsSection({
  reports, loading, inFlight, listingPreviews, profilePreviews,
  onDismiss, onResolve, onRejectListing, onDeactivateUser,
  onAcknowledge, onMoveUnderReview, onFreezeListing, onUnfreezeListing,
}: {
  reports: ReportRow[];
  loading: boolean;
  inFlight: string | null;
  listingPreviews: Record<string, ReportListingPreview>;
  profilePreviews: Record<string, ReportProfilePreview>;
  onDismiss: (id: string) => void;
  onResolve: (id: string) => void;
  onRejectListing: (report: ReportRow) => void;
  onDeactivateUser: (report: ReportRow) => void;
  onAcknowledge: (id: string) => void;
  onMoveUnderReview: (id: string) => void;
  onFreezeListing: (report: ReportRow) => void;
  onUnfreezeListing: (report: ReportRow) => void;
}) {
  const [filter, setFilter] = useState<ReportStatusFilter>("open");
  // Secondary, additive filter — doesn't touch the existing status tabs.
  // "Deletion Requests" narrows to request_type = 'deletion_request'
  // (migration 033); "All Types" (default) shows everything, general
  // reports and deletion requests together, distinguished only by the
  // ReportCard tag.
  const [typeFilter, setTypeFilter] = useState<"all" | "deletion_request">("all");
  const filtered = reports.filter(r => r.status === filter && (typeFilter === "all" || r.request_type === typeFilter));

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Reports" subtitle="User-submitted reports on listings and profiles." count={filtered.length} />

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        {REPORT_STATUS_FILTERS.map(f => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-support-new)", textTransform: "capitalize" as const }}
            >
              {f.replace("_", " ")} ({reports.filter(r => r.status === f).length})
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
        {([["all", "All Types"], ["deletion_request", "Deletion Requests"]] as const).map(([v, label]) => {
          const on = typeFilter === v;
          return (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "10px", fontWeight: on ? 700 : 500, background: on ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.04)", color: on ? "#FBBF24" : "#6B7686", border: on ? "1.5px solid rgba(251,191,36,0.35)" : "1px solid rgba(255,255,255,0.10)", cursor: "pointer", fontFamily: "var(--font-support-new)" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No {filter} reports</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              listingPreview={listingPreviews[r.entity_id]}
              profilePreview={profilePreviews[r.entity_id]}
              busy={inFlight === r.id || inFlight === r.entity_id}
              onDismiss={() => onDismiss(r.id)}
              onResolve={() => onResolve(r.id)}
              onRejectListing={() => onRejectListing(r)}
              onDeactivateUser={() => onDeactivateUser(r)}
              onAcknowledge={() => onAcknowledge(r.id)}
              onMoveUnderReview={() => onMoveUnderReview(r.id)}
              onFreezeListing={() => onFreezeListing(r)}
              onUnfreezeListing={() => onUnfreezeListing(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Audit Log ──────────────────────────────────────────────────────────

const AUDIT_ENTITY_TYPES = ["property_listing", "profile", "agent_profile"] as const;

function DiffBlock({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  return (
    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.45)", marginBottom: "6px" }}>{label}</div>
      <pre style={{ margin: 0, fontSize: "11px", lineHeight: 1.6, color: "#A9B4C2", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px 12px", overflowX: "auto", fontFamily: "var(--font-body-new)" }}>
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}

function AuditLogRow_({ entry }: { entry: AuditLogRow }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "var(--font-body-new)", flexWrap: "wrap" }}
      >
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{fmtDateTime(entry.created_at)}</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", flexShrink: 0 }}>{entry.profiles?.full_name ?? entry.profiles?.email ?? "Unknown admin"}</span>
        <span style={{ padding: "2px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)", flexShrink: 0 }}>
          {entry.action}
        </span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{entry.entity_type}</span>
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <IconChevron />
        </span>
      </button>
      {open && (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "0 18px 16px" }}>
          <DiffBlock label="Before" data={entry.before_data} />
          <DiffBlock label="After" data={entry.after_data} />
        </div>
      )}
    </div>
  );
}

function AuditLogSection({ entries, loading }: { entries: AuditLogRow[]; loading: boolean }) {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actorFilter,  setActorFilter]  = useState<string>("all");

  const actors = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.actor_id, e.profiles?.full_name ?? e.profiles?.email ?? "Unknown admin");
    return Array.from(map.entries());
  }, [entries]);

  const filtered = entries.filter(e =>
    (entityFilter === "all" || e.entity_type === entityFilter) &&
    (actorFilter === "all" || e.actor_id === actorFilter)
  );

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Audit Log" subtitle="Every admin write action, in reverse-chronological order." count={filtered.length} />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            aria-label="Filter by entity type"
            style={{ padding: "9px 28px 9px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: "pointer" }}
          >
            <option value="all">All entity types</option>
            {AUDIT_ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            aria-label="Filter by actor"
            style={{ padding: "9px 28px 9px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "var(--font-body-new)", outline: "none", appearance: "none", cursor: "pointer" }}
          >
            <option value="all">All actors</option>
            {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", color: "#FFFFFF" }}>No matching audit entries</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(e => <AuditLogRow_ key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Sidebar nav ────────────────────────────────────────────────────────────────

const NAV: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",          icon: <IconHome /> },
  { id: "listings",   label: "Listings",          icon: <IconClock /> },
  { id: "agents",     label: "Agents",              icon: <IconBriefcase /> },
  { id: "capture360", label: "360° Requests",      icon: <IconCamera /> },
  { id: "users",      label: "All Users",          icon: <IconUsers /> },
  { id: "inquiries",  label: "All Inquiries",      icon: <IconMsg /> },
  { id: "performance", label: "Agent Performance", icon: <IconChart /> },
  { id: "leaderboard", label: "Leaderboard",        icon: <IconAward /> },
  { id: "reports",    label: "Reports",            icon: <IconFlag /> },
  { id: "content",    label: "Site Content",       icon: <IconEdit /> },
  { id: "contacts",   label: "Contact Numbers",    icon: <IconPhone /> },
  { id: "audit",      label: "Audit Log",          icon: <IconAudit /> },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AdminPageInner />
    </Suspense>
  );
}

// useSearchParams() (needed to read ?section= for notification deep-links)
// requires a Suspense boundary around any usage during static export — the
// wrapper above exists solely for that; all actual page logic stays here.
function AdminPageInner() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  // Keep the verifying screen up until auth resolves AND we've confirmed admin,
  // so non-admins never flash the panel before the redirect kicks in.
  // Also covers the profilePending window (user set, profile still in flight).
  const authChecking = authLoading || (!!user && profile === null) || !isAdmin;

  const searchParams = useSearchParams();
  const VALID_SECTIONS = NAV.map(n => n.id);
  const sectionFromQuery = (): AdminSection => {
    const section = searchParams?.get("section");
    return section && (VALID_SECTIONS as string[]).includes(section) ? (section as AdminSection) : "overview";
  };
  const [active,       setActive]       = useState<AdminSection>(sectionFromQuery);

  // Keeps `active` in sync with ?section= after the initial mount too —
  // e.g. clicking a second notification's action_url (/admin?section=...)
  // while already on this page navigates client-side without remounting,
  // so the state initializer above alone wouldn't catch the change.
  useEffect(() => {
    const section = searchParams?.get("section");
    if (section && (VALID_SECTIONS as string[]).includes(section)) {
      setActive(section as AdminSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [toast,        setToast]        = useState<{ ok: boolean; msg: string } | null>(null);

  const [stats,        setStats]        = useState<Stats>({ pending: 0, active: 0, rejected: 0, users: 0, inquiries: 0, reportsOpen: 0, totalViews: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [listings,          setListings]          = useState<AdminListing[]>([]);
  const [listingsStatusFilter, setListingsStatusFilter] = useState<string>("pending_review");
  const [users,            setUsers]            = useState<UserRow[]>([]);
  const [inquiries,        setInquiries]        = useState<InquiryRow[]>([]);
  const [agentApps,        setAgentApps]        = useState<AgentApplication[]>([]);
  // Per-agent stats source data — see the "agents" tab's fetch branch
  // below for why these are separate, minimal fetches rather than
  // reusing the (lazy, tab-scoped) `listings`/`inquiries` state.
  const [agentListingsForStats, setAgentListingsForStats] = useState<AdminListing[]>([]);
  const [agentLeadsForStats,    setAgentLeadsForStats]    = useState<{ assigned_to: string | null }[]>([]);
  const [capture360Requests, setCapture360Requests] = useState<Capture360Request[]>([]);
  const [agentDocsByProfile, setAgentDocsByProfile] = useState<Record<string, AgentDocumentRow[]>>({});
  const [approvedAgents,   setApprovedAgents]   = useState<ApprovedAgentOption[]>([]);
  const [auditLog,         setAuditLog]         = useState<AuditLogRow[]>([]);
  const [reports,          setReports]          = useState<ReportRow[]>([]);
  const [siteContentRows,  setSiteContentRows]  = useState<SiteContentRow[]>([]);
  const [contactRows,      setContactRows]      = useState<SiteContactRow[]>([]);
  const [contactsLoading,  setContactsLoading]  = useState(false);
  const [reportListingPreviews, setReportListingPreviews] = useState<Record<string, ReportListingPreview>>({});
  const [reportProfilePreviews, setReportProfilePreviews] = useState<Record<string, ReportProfilePreview>>({});

  const [listingsLoading, setListingsLoading] = useState(false);
  const [usersLoading,    setUsersLoading]    = useState(false);
  const [activeUsers,        setActiveUsers]        = useState<number | null>(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [lastSignIns,        setLastSignIns]        = useState<Record<string, string | null>>({});
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [agentAppsLoading, setAgentAppsLoading] = useState(false);
  const [capture360Loading, setCapture360Loading] = useState(false);
  const [auditLoading,     setAuditLoading]     = useState(false);
  const [reportsLoading,   setReportsLoading]   = useState(false);
  const [contentLoading,   setContentLoading]   = useState(false);

  const [inFlight, setInFlight] = useState<string | null>(null);

  const loaded = useRef(new Set<AdminSection>());

  // ── Auth guard ────────────────────────────────────────────────────────────────
  // Session + profile (incl. role) come from AuthContext — no duplicate query.
  // Once auth has resolved, redirect anyone who isn't an admin.
  //
  // profilePending: after MSG91 sign-in the router navigates without a reload,
  // so AuthContext already has authLoading=false from the previous page. The
  // onAuthStateChange handler sets user synchronously but defers the profile
  // fetch via setTimeout(0). Without this guard we'd redirect before the
  // profile arrives and conclude the admin is a non-admin.
  //
  // profileTimedOut: if the profile fetch fails or stalls for >5 s, release the
  // hold so the redirect fires rather than hanging indefinitely.
  const profilePending = !!user && profile === null;
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (!profilePending) {
      setProfileTimedOut(false);
      return;
    }
    const id = setTimeout(() => setProfileTimedOut(true), 5000);
    return () => clearTimeout(id);
  }, [profilePending]);


  useEffect(() => {
    if (authLoading) return;
    if (profilePending && !profileTimedOut) return;
    if (!user || !isAdmin) router.replace("/");
  }, [authLoading, profilePending, profileTimedOut, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    async function loadStats() {
      const supabase = createClient();
      const [
        { count: pending },
        { count: active },
        { count: rejected },
        { count: users },
        { count: inquiries },
        { count: reportsOpen },
        { count: totalViews },
      ] = await Promise.all([
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("inquiries").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        // is_admin() bypasses property_view_events' owner/agent-scoped RLS
        // (066), so this plain head-count genuinely spans every listing —
        // exactly the site-wide total this stat is meant to show.
        supabase.from("property_view_events").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        pending:   pending   ?? 0,
        active:    active    ?? 0,
        rejected:  rejected  ?? 0,
        users:     users     ?? 0,
        inquiries: inquiries ?? 0,
        reportsOpen: reportsOpen ?? 0,
        totalViews: totalViews ?? 0,
      });
      setStatsLoading(false);
    }
    void loadStats();
  }, [isAdmin]);

  // Approved agents — loaded once, passed down to Pending/Approved sections
  // for the "Assign Agent" control, rather than re-fetched per card.
  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    supabase
      .from("agent_profiles")
      .select("id, profiles(full_name)")
      .eq("status", "approved")
      .then((res: { data: unknown }) => {
        const rows = (res.data as { id: string; profiles: { full_name: string | null } | null }[] | null) ?? [];
        setApprovedAgents(rows.map(r => ({ id: r.id, name: r.profiles?.full_name ?? "Unnamed agent" })));
      });
  }, [isAdmin]);

  // Listings — kept OUTSIDE the loaded.current cache-gated effect below on
  // purpose: that cache fetches a tab once and never again, but this tab's
  // status filter can change while the tab stays open, and each filter
  // change needs its own fetch. Rejected's query used to select a reduced
  // column set (no assigned_agent_id/kuula_tour_url/google_maps_url) back
  // when it was a separate, action-less section — now that all statuses
  // share one AdminListing shape and one ListingCard, every status gets the
  // full column set.
  useEffect(() => {
    if (!isAdmin || active !== "listings") return;
    setListingsLoading(true);
    const supabase = createClient();
    supabase
      .from("property_listings")
      .select(LISTING_STATUS_QUERY_COLUMNS)
      .eq("status", listingsStatusFilter)
      .order("submitted_at", { ascending: listingsStatusFilter === "pending_review" })
      .then((res: { data: unknown }) => {
        setListings((res.data as AdminListing[] | null) ?? []);
        setListingsLoading(false);
      });
  }, [isAdmin, active, listingsStatusFilter]);

  useEffect(() => {
    if (!isAdmin || loaded.current.has(active)) return;
    loaded.current.add(active);
    const supabase = createClient();

    if (active === "users") {
      setUsersLoading(true);
      supabase
        .from("profiles")
        .select("id, full_name, city, role, phone, email, created_at, is_verified, is_active, is_nri, whatsapp, nationality, bio, subscription_tier")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setUsers((res.data as UserRow[] | null) ?? []);
          setUsersLoading(false);
        });
      setActiveUsersLoading(true);
      fetch("/api/admin/user-activity")
        .then(res => res.ok ? res.json() : null)
        .then((data: { activeUserCount: number; lastSignIns: Record<string, string | null> } | null) => {
          setActiveUsers(data?.activeUserCount ?? null);
          setLastSignIns(data?.lastSignIns ?? {});
          setActiveUsersLoading(false);
        })
        .catch(() => setActiveUsersLoading(false));
    } else if (active === "inquiries") {
      setInquiriesLoading(true);
      supabase
        .from("inquiries")
        .select("id, property_title, property_slug, seller_email, inquirer_name, inquirer_email, inquirer_phone, message, inquiry_type, status, created_at, assigned_to, agent_profiles(profiles(full_name))")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setInquiries((res.data as InquiryRow[] | null) ?? []);
          setInquiriesLoading(false);
        });
    } else if (active === "agents") {
      setAgentAppsLoading(true);
      supabase
        .from("agent_profiles")
        .select("id, user_id, license_number, agency_name, bio, years_experience, status, created_at, rera_number, oc_number, is_verified_badge, profiles(full_name, phone, email, role), agent_service_cities(city)")
        .order("created_at", { ascending: false })
        .then(async (res: { data: unknown }) => {
          const apps = (res.data as AgentApplication[] | null) ?? [];
          setAgentApps(apps);
          setAgentAppsLoading(false);

          // Per-agent stats (listings/active-listings/leads counts) —
          // two lightweight, minimal-column fetches scoped to this tab's
          // activation, computed client-side by grouping on
          // assigned_agent_id / assigned_to (both existing FKs to
          // agent_profiles.id — confirmed via migrations 011 and 014
          // respectively, no new columns needed). Independent of the
          // "inquiries" tab's own InquiryRow-typed state, which is only
          // ever loaded when that tab has actually been visited.
          const [{ data: listingsForStats }, { data: leadsForStats }] = await Promise.all([
            supabase.from("property_listings").select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status, assigned_agent_id, kuula_tour_url, google_maps_url"),
            supabase.from("inquiries").select("assigned_to"),
          ]);
          setAgentListingsForStats((listingsForStats as AdminListing[] | null) ?? []);
          setAgentLeadsForStats((leadsForStats as { assigned_to: string | null }[] | null) ?? []);

          // KYC documents — batched second query keyed by agent_profile_id,
          // same "fetch then map" pattern already used elsewhere in this
          // codebase (e.g. approvedAgents above) rather than a nested
          // embed or a per-card fetch. Visibility only — does not affect
          // approve/reject logic.
          const profileIds = apps.map(a => a.id);
          if (profileIds.length === 0) { setAgentDocsByProfile({}); return; }
          const { data: docs } = await supabase
            .from("documents")
            .select("agent_profile_id, document_type, file_url, created_at")
            .in("agent_profile_id", profileIds)
            .in("document_type", KYC_DOCUMENT_TYPES.map(t => t.key))
            .order("created_at", { ascending: false });
          const grouped: Record<string, AgentDocumentRow[]> = {};
          ((docs as AgentDocumentRow[] | null) ?? []).forEach(d => {
            (grouped[d.agent_profile_id] ??= []).push(d);
          });
          setAgentDocsByProfile(grouped);
        });
    } else if (active === "capture360") {
      setCapture360Loading(true);
      supabase
        .from("capture_360_requests")
        .select("id, property_id, requester_id, status, scheduled_date, scheduled_time_slot, admin_notes, created_at, updated_at, preferred_date, preferred_time_slot, suggested_alternative_date_1, suggested_alternative_date_2, property_listings(title, address, city), profiles(full_name, phone)")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setCapture360Requests((res.data as Capture360Request[] | null) ?? []);
          setCapture360Loading(false);
        });
    } else if (active === "audit") {
      setAuditLoading(true);
      supabase
        .from("admin_audit_log")
        .select("id, actor_id, action, entity_type, entity_id, before_data, after_data, created_at, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(300)
        .then((res: { data: unknown }) => {
          setAuditLog((res.data as AuditLogRow[] | null) ?? []);
          setAuditLoading(false);
        });
    } else if (active === "content") {
      setContentLoading(true);
      supabase
        .from("site_content")
        .select("key, value, updated_at")
        .order("key", { ascending: true })
        .then((res: { data: unknown }) => {
          setSiteContentRows((res.data as SiteContentRow[] | null) ?? []);
          setContentLoading(false);
        });
    } else if (active === "contacts") {
      setContactsLoading(true);
      supabase
        .from("site_contacts")
        .select("contact_type, label, phone, whatsapp, is_active, updated_at")
        .order("contact_type", { ascending: true })
        .then((res: { data: unknown }) => {
          setContactRows((res.data as SiteContactRow[] | null) ?? []);
          setContactsLoading(false);
        });
    } else if (active === "reports") {
      setReportsLoading(true);
      (async () => {
        const { data } = await supabase
          .from("reports")
          .select("id, reporter_id, entity_type, entity_id, reason, details, status, created_at, resolved_at, resolved_by, request_type, sla_acknowledge_due_at, sla_resolve_due_at, profiles!reporter_id(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(300);
        const rows = (data as ReportRow[] | null) ?? [];
        setReports(rows);

        const listingIds = Array.from(new Set(rows.filter(r => r.entity_type === "listing").map(r => r.entity_id)));
        const profileIds = Array.from(new Set(rows.filter(r => r.entity_type === "profile").map(r => r.entity_id)));

        if (listingIds.length > 0) {
          const { data: listings } = await supabase.from("property_listings").select("id, slug, title, status").in("id", listingIds);
          const map: Record<string, ReportListingPreview> = {};
          for (const l of (listings as ReportListingPreview[] | null) ?? []) map[l.id] = l;
          setReportListingPreviews(map);
        }
        if (profileIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name, email, is_active").in("id", profileIds);
          const map: Record<string, ReportProfilePreview> = {};
          for (const p of (profs as ReportProfilePreview[] | null) ?? []) map[p.id] = p;
          setReportProfilePreviews(map);
        }
        setReportsLoading(false);
      })();
    }
  }, [active, isAdmin]);

  const logAdminAction = useCallback(async (
    action: string,
    entityType: string,
    entityId: string | null,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ) => {
    const supabase = createClient();
    const { error } = await supabase.rpc("log_admin_action", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_before: before,
      p_after: after,
    });
    if (error) console.error("Admin — audit log write failed:", error);
  }, []);

  const handleSiteContentSave = useCallback(async (key: string, newValue: string) => {
    setInFlight(key);
    const oldValue = siteContentRows.find(r => r.key === key)?.value ?? "";
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("site_content")
      .update({ value: newValue, updated_by: user?.id ?? null, updated_at: nowIso })
      .eq("key", key);

    if (error) {
      console.error("Admin — site content save error:", error);
      setToast({ ok: false, msg: "Save failed — please try again." });
    } else {
      void logAdminAction("update_site_content", "site_content", null, { key, value: oldValue }, { key, value: newValue });
      setSiteContentRows(prev => prev.map(r => r.key === key ? { ...r, value: newValue, updated_at: nowIso } : r));
      setToast({ ok: true, msg: "Saved." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [siteContentRows, logAdminAction, user]);

  const handleSiteContentAdd = useCallback(async (key: string, value: string) => {
    setInFlight(key);
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("site_content")
      .insert({ key, value, updated_by: user?.id ?? null });

    if (error) {
      console.error("Admin — site content add error:", error);
      setToast({ ok: false, msg: error.code === "23505" ? "That key already exists." : "Add failed — please try again." });
    } else {
      void logAdminAction("create_site_content", "site_content", null, null, { key, value });
      setSiteContentRows(prev => [...prev, { key, value, updated_at: nowIso }].sort((a, b) => a.key.localeCompare(b.key)));
      setToast({ ok: true, msg: "Key added." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [logAdminAction, user]);

  const handleSiteContentDelete = useCallback(async (key: string) => {
    setInFlight(key);
    const oldValue = siteContentRows.find(r => r.key === key)?.value ?? "";
    const supabase = createClient();
    const { error } = await supabase.from("site_content").delete().eq("key", key);

    if (error) {
      console.error("Admin — site content delete error:", error);
      setToast({ ok: false, msg: "Delete failed — please try again." });
    } else {
      void logAdminAction("delete_site_content", "site_content", null, { key, value: oldValue }, null);
      setSiteContentRows(prev => prev.filter(r => r.key !== key));
      setToast({ ok: true, msg: "Key deleted." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [siteContentRows, logAdminAction, user]);

  const handleContactSave = useCallback(async (contactType: string, label: string, phone: string, whatsapp: string) => {
    setInFlight(contactType);
    const oldRow = contactRows.find(r => r.contact_type === contactType);
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    // whatsapp is optional in the form but the column allows null — an
    // empty string means "same as phone" from the admin's point of view,
    // not "no WhatsApp at all", so it's never stored as "".
    const whatsappValue = whatsapp || null;
    const { error } = await supabase
      .from("site_contacts")
      .update({ label, phone, whatsapp: whatsappValue, updated_by: user?.id ?? null, updated_at: nowIso })
      .eq("contact_type", contactType);

    if (error) {
      console.error("Admin — contact save error:", error);
      setToast({ ok: false, msg: "Save failed — please try again." });
    } else {
      void logAdminAction(
        "update_site_contact", "site_contact", null,
        oldRow ? { contact_type: contactType, label: oldRow.label, phone: oldRow.phone, whatsapp: oldRow.whatsapp } : null,
        { contact_type: contactType, label, phone, whatsapp: whatsappValue },
      );
      setContactRows(prev => prev.map(r => r.contact_type === contactType ? { ...r, label, phone, whatsapp: whatsappValue, updated_at: nowIso } : r));
      setToast({ ok: true, msg: "Saved." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [contactRows, logAdminAction, user]);

  const handleContactAdd = useCallback(async (contactType: string, label: string, phone: string, whatsapp: string) => {
    setInFlight(contactType);
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const whatsappValue = whatsapp || null;
    const { error } = await supabase
      .from("site_contacts")
      .insert({ contact_type: contactType, label, phone, whatsapp: whatsappValue, updated_by: user?.id ?? null });

    if (error) {
      console.error("Admin — contact add error:", error);
      setToast({ ok: false, msg: error.code === "23505" ? "That contact type already exists." : "Add failed — please try again." });
    } else {
      void logAdminAction("create_site_contact", "site_contact", null, null, { contact_type: contactType, label, phone, whatsapp: whatsappValue });
      setContactRows(prev => [...prev, { contact_type: contactType, label, phone, whatsapp: whatsappValue, is_active: true, updated_at: nowIso }].sort((a, b) => a.contact_type.localeCompare(b.contact_type)));
      setToast({ ok: true, msg: "Contact added." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [logAdminAction, user]);

  const handleContactToggleActive = useCallback(async (contactType: string, isActive: boolean) => {
    setInFlight(contactType);
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("site_contacts")
      .update({ is_active: isActive, updated_by: user?.id ?? null, updated_at: nowIso })
      .eq("contact_type", contactType);

    if (error) {
      console.error("Admin — contact visibility toggle error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("toggle_site_contact_active", "site_contact", null, { contact_type: contactType, is_active: !isActive }, { contact_type: contactType, is_active: isActive });
      setContactRows(prev => prev.map(r => r.contact_type === contactType ? { ...r, is_active: isActive, updated_at: nowIso } : r));
      setToast({ ok: true, msg: isActive ? "Now shown on site." : "Hidden from site." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [logAdminAction, user]);

  // bumpStats — Stats only tracks pending/active/rejected buckets (no
  // changes_requested/frozen counters were asked for), so a transition
  // into or out of either of those two is simply a no-op on stats rather
  // than an error; every listing-status handler below routes through this
  // instead of hand-rolling its own +1/-1 pair per transition.
  const bumpStats = useCallback((prev: Stats, oldStatus: string | null, newStatus: string): Stats => {
    let next = prev;
    const oldKey = oldStatus ? LISTING_STATS_KEY[oldStatus] : undefined;
    const newKey = LISTING_STATS_KEY[newStatus];
    if (oldKey) next = { ...next, [oldKey]: Math.max(0, (next[oldKey] as number) - 1) };
    if (newKey) next = { ...next, [newKey]: (next[newKey] as number) + 1 };
    return next;
  }, []);

  // Every listing in `listings` shares the same status (it's a server-side
  // .eq("status", listingsStatusFilter) fetch — see the dedicated effect
  // above), so any status change always moves the item out of the
  // currently-viewed filter; removing it from `listings` is therefore
  // always correct, never a "should this stay in place?" branch.
  const handleListingStatus = useCallback(async (id: string, newStatus: string) => {
    setInFlight(id);
    const oldStatus = listings.find(l => l.id === id)?.status ?? null;
    const supabase = createClient();
    // .select() + row-count check — same pattern already applied to
    // handleDeclineCapture and the post-property edit page tonight.
    // Without it, an RLS mismatch (or a stale/bad id) would match zero
    // rows, report no error, and this code would proceed exactly as if
    // it succeeded — silently no-op'ing an Approve/Reject click.
    const { data: updatedRows, error } = await supabase
      .from("property_listings")
      .update({ status: newStatus })
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Admin — listing status error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else if (!updatedRows || updatedRows.length === 0) {
      console.error("Admin — listing status update matched zero rows. id:", id, "attempted status:", newStatus);
      setToast({ ok: false, msg: "Update did not apply — no matching listing found. Please refresh and try again." });
    } else {
      void logAdminAction("update_listing_status", "property_listing", id, { status: oldStatus }, { status: newStatus });
      setListings(prev => prev.filter(l => l.id !== id));
      setStats(s => bumpStats(s, oldStatus, newStatus));
      const msgs: Record<string, string> = {
        active: "Listing approved and live.",
        rejected: "Listing rejected.",
        pending_review: "Listing unpublished — returned to review.",
      };
      setToast({ ok: true, msg: msgs[newStatus] ?? "Updated." });
      if (newStatus === "active") {
        fetch("/api/check-saved-search-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: id }),
        }).catch(() => {});
      }
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [listings, bumpStats, logAdminAction]);

  // Request Changes — a pending-only transition, deliberately not routed
  // through log_listing_status_change() (067): that RPC validates
  // p_new_status against a fixed set that doesn't include
  // 'changes_requested' (see migration 074's comment). Same plain
  // .update() + logAdminAction() shape as handleListingStatus above,
  // its closest sibling, plus a row-count check from the start (not a
  // later fix, unlike handleListingStatus).
  const handleRequestChanges = useCallback(async (id: string, note: string) => {
    setInFlight(id);
    const supabase = createClient();
    const { data: updatedRows, error } = await supabase
      .from("property_listings")
      .update({ status: "changes_requested", changes_requested_note: note || null })
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Admin — request changes error:", error);
      setToast({ ok: false, msg: "Could not request changes — please try again." });
    } else if (!updatedRows || updatedRows.length === 0) {
      console.error("Admin — request changes matched zero rows. id:", id);
      setToast({ ok: false, msg: "Update did not apply — no matching listing found. Please refresh and try again." });
    } else {
      void logAdminAction("request_listing_changes", "property_listing", id, { status: "pending_review" }, { status: "changes_requested", note });
      setListings(prev => prev.filter(l => l.id !== id));
      setStats(s => bumpStats(s, "pending_review", "changes_requested"));
      setToast({ ok: true, msg: "Changes requested — submitter notified." });
      fetch("/api/notify-listing-changes-requested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, note }),
      }).catch(err => console.error("[Admin] Changes-requested notification failed:", err));
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [bumpStats, logAdminAction]);

  // Unpublish, specifically — replaces the old window.confirm ->
  // handleListingStatus(id, "pending_review", "approved") path. Calls
  // log_listing_status_change() (067_unpublish_reason_and_history.sql)
  // instead of a plain .update(): that RPC does the status update AND the
  // listing_status_history insert atomically in one transaction, so this
  // never also calls handleListingStatus's own .update() for this action
  // — doing both would be redundant and could race. Approve/Reject/
  // Re-approve are untouched and keep using handleListingStatus exactly
  // as before.
  const handleUnpublishWithReason = useCallback(async (id: string, reason: string, note: string | null) => {
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("log_listing_status_change", {
      p_property_id: id,
      p_new_status: "pending_review",
      p_reason: reason,
      p_note: note,
    });

    if (error) {
      console.error("Admin — unpublish (log_listing_status_change) error:", error);
      const msg = error.message?.includes("not authorized")
        ? "You're not authorized to unpublish this listing."
        : error.message?.includes("invalid new_status")
        ? "Invalid status transition."
        : error.message?.includes("listing not found")
        ? "Listing not found — it may have been deleted."
        : "Unpublish failed — please try again.";
      setToast({ ok: false, msg });
    } else {
      // Still recorded in admin_audit_log too, same as every other admin
      // mutation in this file — listing_status_history is the richer,
      // reason/note-carrying record specific to this workflow, not a
      // replacement for the general cross-entity audit trail.
      void logAdminAction("update_listing_status", "property_listing", id, { status: "active" }, { status: "pending_review", reason, note });
      setListings(prev => prev.filter(l => l.id !== id));
      setStats(s => bumpStats(s, "active", "pending_review"));
      setToast({ ok: true, msg: "Listing unpublished — returned to review." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [bumpStats, logAdminAction]);

  const handleAssignAgent = useCallback(async (id: string, agentId: string | null) => {
    setInFlight(id);
    const oldAgentId = listings.find(l => l.id === id)?.assigned_agent_id ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ assigned_agent_id: agentId }).eq("id", id);

    if (error) {
      console.error("Admin — assign agent error:", error);
      setToast({ ok: false, msg: "Assignment failed — please try again." });
    } else {
      void logAdminAction("assign_agent", "property_listing", id, { assigned_agent_id: oldAgentId }, { assigned_agent_id: agentId });
      setListings(prev => prev.map(l => l.id === id ? { ...l, assigned_agent_id: agentId } : l));
      setToast({ ok: true, msg: agentId ? "Agent assigned." : "Agent unassigned." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [listings, logAdminAction]);

  const handleKuulaTourUrl = useCallback(async (id: string, url: string | null) => {
    setInFlight(id);
    const oldUrl = listings.find(l => l.id === id)?.kuula_tour_url ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ kuula_tour_url: url }).eq("id", id);

    if (error) {
      console.error("Admin — kuula tour url error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("update_kuula_tour_url", "property_listing", id, { kuula_tour_url: oldUrl }, { kuula_tour_url: url });
      setListings(prev => prev.map(l => l.id === id ? { ...l, kuula_tour_url: url } : l));
      setToast({ ok: true, msg: url ? "360° tour URL saved." : "360° tour URL cleared." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [listings, logAdminAction]);

  const handleGoogleMapsUrl = useCallback(async (id: string, url: string | null) => {
    setInFlight(id);
    const oldUrl = listings.find(l => l.id === id)?.google_maps_url ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ google_maps_url: url }).eq("id", id);

    if (error) {
      console.error("Admin — google maps url error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("update_google_maps_url", "property_listing", id, { google_maps_url: oldUrl }, { google_maps_url: url });
      setListings(prev => prev.map(l => l.id === id ? { ...l, google_maps_url: url } : l));
      setToast({ ok: true, msg: url ? "Google Maps URL saved." : "Google Maps URL cleared." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [listings, logAdminAction]);

  const handleUserRole = useCallback(async (userId: string, newRole: string) => {
    const prev = users.find(u => u.id === userId)?.role ?? null;
    setUsers(list => list.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      console.error("Admin — role update error:", error);
      setUsers(list => list.map(u => u.id === userId ? { ...u, role: prev } : u));
      setToast({ ok: false, msg: "Role update failed." });
    } else {
      void logAdminAction("update_user_role", "profile", userId, { role: prev }, { role: newRole });
      setToast({ ok: true, msg: `Role updated to ${newRole}.` });
      setTimeout(() => setToast(null), 2500);
    }
  }, [users, logAdminAction]);

  const handleSubscriptionTier = useCallback(async (userId: string, newTier: string) => {
    const prev = users.find(u => u.id === userId)?.subscription_tier ?? "free";
    setUsers(list => list.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ subscription_tier: newTier }).eq("id", userId);
    if (error) {
      console.error("Admin — subscription tier update error:", error);
      setUsers(list => list.map(u => u.id === userId ? { ...u, subscription_tier: prev } : u));
      setToast({ ok: false, msg: "Subscription tier update failed." });
    } else {
      void logAdminAction("update_subscription_tier", "profile", userId, { subscription_tier: prev }, { subscription_tier: newTier });
      setToast({ ok: true, msg: `Subscription tier updated to ${newTier}.` });
      setTimeout(() => setToast(null), 2500);
    }
  }, [users, logAdminAction]);

  const handleUserUpdate = useCallback(async (userId: string, changes: Partial<UserRow>) => {
    const supabase = createClient();
    const keys = Object.keys(changes) as (keyof UserRow)[];

    // Callers outside the Users tab (e.g. the Reports "Deactivate User"
    // shortcut) may target a user who was never loaded into local `users`
    // state — fetch the current row rather than silently no-op-ing.
    let before: Partial<UserRow>;
    const localUser = users.find(u => u.id === userId);
    if (localUser) {
      before = Object.fromEntries(keys.map(k => [k, localUser[k]])) as Partial<UserRow>;
    } else {
      const { data: row, error: fetchErr } = await supabase
        .from("profiles")
        .select(keys.join(", "))
        .eq("id", userId)
        .single();
      if (fetchErr || !row) {
        console.error("Admin — user update: could not load current row:", fetchErr);
        setToast({ ok: false, msg: "Update failed — user not found." });
        setTimeout(() => setToast(null), 2500);
        return;
      }
      before = row as Partial<UserRow>;
    }

    setUsers(list => list.map(u => u.id === userId ? { ...u, ...changes } : u));
    const { error } = await supabase.from("profiles").update(changes).eq("id", userId);

    if (error) {
      console.error("Admin — user update error:", error);
      setUsers(list => list.map(u => u.id === userId ? { ...u, ...before } : u));
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction(
        "update_user_profile", "profile", userId,
        before as Record<string, unknown>, changes as Record<string, unknown>,
      );
      setToast({ ok: true, msg: "User updated." });
      setTimeout(() => setToast(null), 2500);
    }
  }, [users, logAdminAction]);

  const handleInquiryDelete = useCallback(async (id: string) => {
    const target = inquiries.find(i => i.id === id) ?? null;
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").delete().eq("id", id);

    if (error) {
      console.error("Admin — inquiry delete error:", error);
      setToast({ ok: false, msg: "Delete failed — please try again." });
    } else {
      void logAdminAction("delete_inquiry", "inquiry", id, target ? {
        property_title: target.property_title,
        seller_email: target.seller_email,
        inquirer_name: target.inquirer_name,
        inquirer_email: target.inquirer_email,
        inquirer_phone: target.inquirer_phone,
        message: target.message,
        inquiry_type: target.inquiry_type,
        status: target.status,
      } : null, null);
      setInquiries(prev => prev.filter(i => i.id !== id));
      setStats(s => ({ ...s, inquiries: Math.max(0, s.inquiries - 1) }));
      setToast({ ok: true, msg: "Inquiry deleted." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [inquiries, logAdminAction]);

  const handleInquirySpam = useCallback(async (id: string) => {
    const oldStatus = inquiries.find(i => i.id === id)?.status ?? null;
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").update({ status: "spam" }).eq("id", id);

    if (error) {
      console.error("Admin — inquiry spam error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("mark_inquiry_spam", "inquiry", id, { status: oldStatus }, { status: "spam" });
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: "spam" } : i));
      setToast({ ok: true, msg: "Marked as spam." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [inquiries, logAdminAction]);

  const handleReportResolve = useCallback(async (id: string, newStatus: "resolved" | "dismissed") => {
    const report = reports.find(r => r.id === id);
    if (!report || !user) return;
    setInFlight(id);
    const supabase = createClient();
    const resolvedAt = new Date().toISOString();
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus, resolved_at: resolvedAt, resolved_by: user.id })
      .eq("id", id);

    if (error) {
      console.error("Admin — report resolve error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction(
        newStatus === "resolved" ? "resolve_report" : "dismiss_report",
        "report", id, { status: report.status }, { status: newStatus },
      );
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, resolved_at: resolvedAt, resolved_by: user.id } : r));
      setStats(s => report.status === "open" ? { ...s, reportsOpen: Math.max(0, s.reportsOpen - 1) } : s);
      setToast({ ok: true, msg: newStatus === "resolved" ? "Report resolved." : "Report dismissed." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [reports, user, logAdminAction]);

  const handleReportRejectListing = useCallback(async (report: ReportRow) => {
    // handleListingStatus derives its own "before" status from the currently
    // loaded Listings tab (`listings`); a report-driven reject can target a
    // listing that tab isn't showing right now (report.entity_id isn't
    // necessarily in view), in which case it degrades gracefully to a null
    // "before" value in the audit log rather than a wrong one. reportListingPreviews'
    // own status (used elsewhere on this card) isn't threaded through for
    // that reason — passing a value handleListingStatus's signature no
    // longer accepts would be dead code, not a real fix.
    await handleListingStatus(report.entity_id, "rejected");
    await handleReportResolve(report.id, "resolved");
  }, [handleListingStatus, handleReportResolve]);

  const handleReportDeactivateUser = useCallback(async (report: ReportRow) => {
    await handleUserUpdate(report.entity_id, { is_active: false });
    await handleReportResolve(report.id, "resolved");
  }, [handleUserUpdate, handleReportResolve]);

  // ── Migration 051 — grievance queue extension ──────────────────────────
  // Acknowledge stamps sla_acknowledge_due_at automatically (rather than
  // via an admin-facing checkbox) so the 48-hour commitment published in
  // /grievance-redressal is met every time this action is used, with no
  // chance of an admin forgetting to set it.
  const handleReportAcknowledge = useCallback(async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    setInFlight(id);
    const supabase = createClient();
    const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("reports")
      .update({ status: "acknowledged", sla_acknowledge_due_at: dueAt })
      .eq("id", id);

    if (error) {
      console.error("Admin — report acknowledge error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("acknowledge_report", "report", id, { status: report.status }, { status: "acknowledged", sla_acknowledge_due_at: dueAt });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "acknowledged", sla_acknowledge_due_at: dueAt } : r));
      setStats(s => report.status === "open" ? { ...s, reportsOpen: Math.max(0, s.reportsOpen - 1) } : s);
      setToast({ ok: true, msg: "Report acknowledged — SLA due in 48 hours." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [reports, logAdminAction]);

  const handleReportMoveUnderReview = useCallback(async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase.from("reports").update({ status: "under_review" }).eq("id", id);

    if (error) {
      console.error("Admin — report move-under-review error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("move_report_under_review", "report", id, { status: report.status }, { status: "under_review" });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "under_review" } : r));
      setStats(s => report.status === "open" ? { ...s, reportsOpen: Math.max(0, s.reportsOpen - 1) } : s);
      setToast({ ok: true, msg: "Moved to Under Review." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [reports, logAdminAction]);

  // Freeze is intentionally separate from handleListingStatus — that
  // function owns the pending/approved/rejected bucket bookkeeping for
  // the Pending/Approved/Rejected sections, none of which has a
  // 'frozen' bucket. Freezing only invalidates those sections' caches
  // (loaded.current) so they refetch with the live status next visit,
  // same mechanism handleListingStatus itself uses. Two audit log
  // entries are written — one for the listing, one for the report —
  // matching the existing Reject Listing precedent (handleListingStatus
  // + handleReportResolve, each logging separately).
  const handleReportFreezeListing = useCallback(async (report: ReportRow) => {
    setInFlight(report.entity_id);
    const supabase = createClient();
    const oldListingStatus = reportListingPreviews[report.entity_id]?.status ?? null;
    const { error: listingErr } = await supabase
      .from("property_listings")
      .update({ status: "frozen" })
      .eq("id", report.entity_id);

    if (listingErr) {
      console.error("Admin — freeze listing error:", listingErr);
      setToast({ ok: false, msg: "Freeze failed — please try again." });
      setInFlight(null);
      setTimeout(() => setToast(null), 2500);
      return;
    }
    void logAdminAction("freeze_listing", "property_listing", report.entity_id, { status: oldListingStatus }, { status: "frozen" });
    setReportListingPreviews(prev => ({
      ...prev,
      [report.entity_id]: { ...prev[report.entity_id], id: report.entity_id, status: "frozen" },
    }));
    // No loaded.current invalidation needed here — the Listings tab's
    // dedicated fetch effect re-runs every time that tab activates (it's
    // deliberately outside the loaded.current cache, since its status
    // filter can also change within the same tab visit), so it always
    // picks up this freeze on next visit without help from here.

    const oldReportStatus = report.status;
    const { error: reportErr } = await supabase.from("reports").update({ status: "frozen" }).eq("id", report.id);
    if (reportErr) {
      console.error("Admin — freeze report status error:", reportErr);
      setToast({ ok: false, msg: "Listing frozen, but the report status update failed." });
    } else {
      void logAdminAction("freeze_report", "report", report.id, { status: oldReportStatus }, { status: "frozen" });
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "frozen" } : r));
      setStats(s => oldReportStatus === "open" ? { ...s, reportsOpen: Math.max(0, s.reportsOpen - 1) } : s);
      setToast({ ok: true, msg: "Listing frozen and report marked Frozen." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [reportListingPreviews, logAdminAction]);

  // The reversibility this whole feature exists for — restores the
  // listing to 'active' only. Deliberately does not also change the
  // report's own status: the admin still moves the report through
  // Resolve/Dismiss/Under Review themselves once satisfied.
  const handleReportUnfreezeListing = useCallback(async (report: ReportRow) => {
    setInFlight(report.entity_id);
    const supabase = createClient();
    const { error } = await supabase
      .from("property_listings")
      .update({ status: "active" })
      .eq("id", report.entity_id);

    if (error) {
      console.error("Admin — unfreeze listing error:", error);
      setToast({ ok: false, msg: "Unfreeze failed — please try again." });
    } else {
      void logAdminAction("unfreeze_listing", "property_listing", report.entity_id, { status: "frozen" }, { status: "active" });
      setReportListingPreviews(prev => ({
        ...prev,
        [report.entity_id]: { ...prev[report.entity_id], id: report.entity_id, status: "active" },
      }));
      setToast({ ok: true, msg: "Listing unfrozen and restored to active." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [logAdminAction]);

  const handleAgentApprove = useCallback(async (id: string, userId: string) => {
    setInFlight(id);
    const oldStatus = agentApps.find(a => a.id === id)?.status ?? null;
    const supabase = createClient();
    const { error: statusErr } = await supabase.from("agent_profiles").update({ status: "approved" }).eq("id", id);

    // agent_profiles has no column recording whether this application was
    // originally an Agent or Builder registration — but a user who
    // self-registered via AuthModal already has the correct profiles.role
    // ('agent' or 'builder') set at signup time (verify-otp/route.ts).
    // Blindly overwriting to 'agent' here would silently convert an
    // approved Builder back into an Agent. Only default to 'agent' when
    // the current role is neither — the become-an-agent.tsx path, where an
    // existing buyer applies later and has no Builder equivalent, so their
    // role is still 'buyer' at this point.
    let roleErr: { message: string } | null = null;
    if (!statusErr) {
      const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      const alreadyCorrect = currentProfile?.role === "agent" || currentProfile?.role === "builder";
      if (!alreadyCorrect) {
        ({ error: roleErr } = await supabase.from("profiles").update({ role: "agent" }).eq("id", userId));
      }
    }

    if (statusErr || roleErr) {
      console.error("Admin — agent approve error:", statusErr ?? roleErr);
      setToast({ ok: false, msg: "Approval failed — please try again." });
    } else {
      void logAdminAction("approve_agent_application", "agent_profile", id, { status: oldStatus }, { status: "approved" });
      setAgentApps(prev => prev.map(a => a.id === id ? { ...a, status: "approved" } : a));
      setToast({ ok: true, msg: "Agent approved." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [agentApps, logAdminAction]);

  const handleAgentToggleBadge = useCallback(async (id: string, currentValue: boolean) => {
    setInFlight(id);
    const nextValue = !currentValue;
    const supabase = createClient();
    const { error } = await supabase.from("agent_profiles").update({ is_verified_badge: nextValue }).eq("id", id);

    if (error) {
      console.error("Admin — agent badge toggle error:", error);
      setToast({ ok: false, msg: "Could not update badge — please try again." });
    } else {
      void logAdminAction(
        nextValue ? "grant_verified_badge" : "revoke_verified_badge",
        "agent_profile", id,
        { is_verified_badge: currentValue }, { is_verified_badge: nextValue }
      );
      setAgentApps(prev => prev.map(a => a.id === id ? { ...a, is_verified_badge: nextValue } : a));
      setToast({ ok: true, msg: nextValue ? "Verified badge granted." : "Verified badge revoked." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [logAdminAction]);

  const handleScheduleCapture = useCallback(async (
    req: Capture360Request, scheduledDate: string, scheduledTimeSlot: string, adminNotes: string
  ) => {
    setInFlight(req.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("capture_360_requests")
      .update({
        status: "scheduled",
        scheduled_date: scheduledDate,
        scheduled_time_slot: scheduledTimeSlot || null,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    if (error) {
      console.error("Admin — capture 360 schedule error:", error);
      setToast({ ok: false, msg: "Could not schedule — please try again." });
    } else {
      void logAdminAction("schedule_capture_360", "capture_360_request", req.id, { status: req.status }, { status: "scheduled", scheduled_date: scheduledDate, scheduled_time_slot: scheduledTimeSlot });
      setCapture360Requests(prev => prev.map(r => r.id === req.id ? { ...r, status: "scheduled", scheduled_date: scheduledDate, scheduled_time_slot: scheduledTimeSlot || null, admin_notes: adminNotes || null } : r));
      setToast({ ok: true, msg: "Capture scheduled." });
      fetch("/api/notify-capture-requester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: req.requester_id,
          status: "scheduled",
          propertyTitle: req.property_listings?.title,
          scheduledDate, scheduledTimeSlot, adminNotes,
        }),
      }).catch(err => console.error("[Capture360] Requester notification failed:", err));
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [logAdminAction]);

  const handleDeclineCapture = useCallback(async (
    req: Capture360Request, adminNotes: string, altDate1: string, altDate2: string
  ) => {
    setInFlight(req.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("capture_360_requests")
      .update({
        status: "declined",
        admin_notes: adminNotes || null,
        suggested_alternative_date_1: altDate1 || null,
        suggested_alternative_date_2: altDate2 || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    if (error) {
      console.error("Admin — capture 360 decline error:", error);
      setToast({ ok: false, msg: "Could not decline — please try again." });
    } else {
      void logAdminAction("decline_capture_360", "capture_360_request", req.id, { status: req.status }, { status: "declined" });
      setCapture360Requests(prev => prev.map(r => r.id === req.id
        ? { ...r, status: "declined", admin_notes: adminNotes || null, suggested_alternative_date_1: altDate1 || null, suggested_alternative_date_2: altDate2 || null }
        : r));
      setToast({ ok: true, msg: "Request declined." });
      fetch("/api/notify-capture-requester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: req.requester_id,
          status: "declined",
          propertyTitle: req.property_listings?.title,
          adminNotes,
          suggestedAlternativeDate1: altDate1 || null,
          suggestedAlternativeDate2: altDate2 || null,
        }),
      }).catch(err => console.error("[Capture360] Requester notification failed:", err));
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [logAdminAction]);

  const handleCompleteCapture = useCallback(async (id: string) => {
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("capture_360_requests")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Admin — capture 360 complete error:", error);
      setToast({ ok: false, msg: "Could not mark completed — please try again." });
    } else {
      void logAdminAction("complete_capture_360", "capture_360_request", id, { status: "scheduled" }, { status: "completed" });
      setCapture360Requests(prev => prev.map(r => r.id === id ? { ...r, status: "completed", updated_at: new Date().toISOString() } : r));
      setToast({ ok: true, msg: "Marked completed." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [logAdminAction]);

  const handleAgentReject = useCallback(async (id: string) => {
    setInFlight(id);
    const oldStatus = agentApps.find(a => a.id === id)?.status ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("agent_profiles").update({ status: "rejected" }).eq("id", id);

    if (error) {
      console.error("Admin — agent reject error:", error);
      setToast({ ok: false, msg: "Rejection failed — please try again." });
    } else {
      void logAdminAction("reject_agent_application", "agent_profile", id, { status: oldStatus }, { status: "rejected" });
      setAgentApps(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" } : a));
      setToast({ ok: true, msg: "Agent application rejected." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 3000);
  }, [agentApps, logAdminAction]);

  const handleAddAgent = useCallback(async (data: {
    userId: string; licenseNumber: string; agencyName: string; bio: string;
    yearsExperience: string; cities: string[];
  }): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient();
    const { data: inserted, error: insertErr } = await supabase
      .from("agent_profiles")
      .insert({
        user_id: data.userId,
        license_number: data.licenseNumber || null,
        agency_name: data.agencyName || null,
        bio: data.bio || null,
        years_experience: data.yearsExperience ? parseInt(data.yearsExperience, 10) : null,
        status: "approved",
      })
      .select("id, user_id, license_number, agency_name, bio, years_experience, status, created_at, profiles(full_name, phone, email)")
      .single();

    if (insertErr || !inserted) {
      console.error("Admin — add agent error:", insertErr);
      const msg = insertErr?.code === "23505"
        ? "This user is already an agent or has an existing application."
        : "Failed to add agent — please try again.";
      return { ok: false, error: msg };
    }

    if (data.cities.length > 0) {
      const { error: citiesErr } = await supabase
        .from("agent_service_cities")
        .insert(data.cities.map(city => ({ agent_id: inserted.id, city })));
      if (citiesErr) console.error("Admin — add agent cities error:", citiesErr);
    }

    const { error: roleErr } = await supabase.from("profiles").update({ role: "agent" }).eq("id", data.userId);
    if (roleErr) console.error("Admin — add agent role update error:", roleErr);

    void logAdminAction("add_agent", "agent_profile", inserted.id, null, {
      user_id: data.userId,
      license_number: data.licenseNumber || null,
      agency_name: data.agencyName || null,
      status: "approved",
      cities: data.cities,
    });

    setAgentApps(prev => [
      { ...inserted, agent_service_cities: data.cities.map(city => ({ city })) } as AgentApplication,
      ...prev,
    ]);
    setToast({ ok: true, msg: "Agent added." });
    setTimeout(() => setToast(null), 3000);
    return { ok: true };
  }, [logAdminAction]);

  if (authChecking) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ minHeight: "100vh", background: "#020C1C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#10C4C3" }}><IconShield /></div>
            <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", color: "#FFFFFF", letterSpacing: "0.08em" }}>Verifying access…</span>
          </div>
          <Spinner size={26} pad={0} />
        </div>
      </>
    );
  }

  let content: React.ReactNode;
  if (active === "overview") {
    content = <OverviewSection stats={stats} loading={statsLoading} />;
  } else if (active === "listings") {
    content = (
      <ListingsSection
        listings={listings}
        loading={listingsLoading}
        statusFilter={listingsStatusFilter}
        onStatusFilterChange={setListingsStatusFilter}
        inFlight={inFlight}
        agents={approvedAgents}
        onApprove={id => void handleListingStatus(id, "active")}
        onReject={id => void handleListingStatus(id, "rejected")}
        onRequestChanges={(id, note) => void handleRequestChanges(id, note)}
        onUnpublish={(id, reason, note) => void handleUnpublishWithReason(id, reason, note)}
        onReApprove={id => void handleListingStatus(id, "active")}
        onAssignAgent={(id, agentId) => void handleAssignAgent(id, agentId)}
        onKuulaTourUrl={(id, url) => void handleKuulaTourUrl(id, url)}
        onGoogleMapsUrl={(id, url) => void handleGoogleMapsUrl(id, url)}
      />
    );
  } else if (active === "agents") {
    content = (
      <AgentsSection
        applications={agentApps}
        loading={agentAppsLoading}
        inFlight={inFlight}
        onApprove={(id, userId) => void handleAgentApprove(id, userId)}
        onReject={id => void handleAgentReject(id)}
        onToggleBadge={(id, current) => void handleAgentToggleBadge(id, current)}
        onAddAgent={handleAddAgent}
        documentsByProfile={agentDocsByProfile}
        listingsForStats={agentListingsForStats}
        leadsForStats={agentLeadsForStats}
      />
    );
  } else if (active === "capture360") {
    content = (
      <Capture360Section
        requests={capture360Requests}
        loading={capture360Loading}
        inFlight={inFlight}
        onSchedule={(req, date, slot, notes) => void handleScheduleCapture(req, date, slot, notes)}
        onDecline={(req, notes, altDate1, altDate2) => void handleDeclineCapture(req, notes, altDate1, altDate2)}
        onComplete={id => void handleCompleteCapture(id)}
      />
    );
  } else if (active === "users") {
    content = (
      <UsersSection
        users={users}
        loading={usersLoading}
        activeUsers={activeUsers}
        activeUsersLoading={activeUsersLoading}
        lastSignIns={lastSignIns}
        onRoleChange={(uid, role) => void handleUserRole(uid, role)}
        onUpdateUser={handleUserUpdate}
        onSubscriptionTierChange={(uid, tier) => void handleSubscriptionTier(uid, tier)}
      />
    );
  } else if (active === "inquiries") {
    content = (
      <InquiriesSection
        inquiries={inquiries}
        loading={inquiriesLoading}
        inFlight={inFlight}
        onDelete={id => void handleInquiryDelete(id)}
        onMarkSpam={id => void handleInquirySpam(id)}
      />
    );
  } else if (active === "performance") {
    // Self-fetching — see AgentPerformanceSection.tsx header for why
    // this section doesn't go through the central per-section
    // useEffect/state every other section above uses.
    content = <AgentPerformanceSection />;
  } else if (active === "leaderboard") {
    // Self-fetching — same reasoning as AgentPerformanceSection.tsx.
    content = <LeaderboardSection />;
  } else if (active === "reports") {
    content = (
      <ReportsSection
        reports={reports}
        loading={reportsLoading}
        inFlight={inFlight}
        listingPreviews={reportListingPreviews}
        profilePreviews={reportProfilePreviews}
        onDismiss={id => void handleReportResolve(id, "dismissed")}
        onResolve={id => void handleReportResolve(id, "resolved")}
        onRejectListing={report => void handleReportRejectListing(report)}
        onDeactivateUser={report => void handleReportDeactivateUser(report)}
        onAcknowledge={id => void handleReportAcknowledge(id)}
        onMoveUnderReview={id => void handleReportMoveUnderReview(id)}
        onFreezeListing={report => void handleReportFreezeListing(report)}
        onUnfreezeListing={report => void handleReportUnfreezeListing(report)}
      />
    );
  } else if (active === "content") {
    content = (
      <SiteContentSection
        rows={siteContentRows}
        loading={contentLoading}
        disabled={inFlight}
        onSave={(key, value) => void handleSiteContentSave(key, value)}
        onAdd={(key, value) => void handleSiteContentAdd(key, value)}
        onDelete={key => void handleSiteContentDelete(key)}
      />
    );
  } else if (active === "contacts") {
    content = (
      <ContactsSection
        rows={contactRows}
        loading={contactsLoading}
        disabled={inFlight}
        onSave={(contactType, label, phone, whatsapp) => void handleContactSave(contactType, label, phone, whatsapp)}
        onAdd={(contactType, label, phone, whatsapp) => void handleContactAdd(contactType, label, phone, whatsapp)}
        onToggleActive={(contactType, isActive) => void handleContactToggleActive(contactType, isActive)}
      />
    );
  } else {
    content = <AuditLogSection entries={auditLog} loading={auditLoading} />;
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .admin-sb-btn:hover { color: #FFFFFF !important; background: rgba(255,255,255,0.06) !important; }
        @media (max-width: 840px) {
          .admin-content { padding: 24px 18px 72px !important; }
          .admin-overview-grid { grid-template-columns: 1fr !important; }
          .admin-overview-charts-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1200px) and (min-width: 841px) {
          .admin-overview-charts-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "88px", right: "24px", zIndex: 999, padding: "12px 20px", borderRadius: "10px", background: toast.ok ? "rgba(16,196,195,0.9)" : "rgba(248,113,113,0.9)", color: "#020C1C", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: "8px", animation: "toastIn 0.2s ease-out", backdropFilter: "blur(12px)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ minHeight: "100dvh", background: "#020C1C", display: "flex", flexDirection: "column" }}>

        {/* Persistent sidebar toggle — part of the shell around every
            section, so it stays visible/functional regardless of which
            NAV item is active. */}
        <div className="admin-toggle-bar" style={{ display: "flex", position: "sticky", top: "64px", zIndex: 200, padding: "10px 16px", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
            style={{ display: "flex", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "7px", cursor: "pointer", color: "#FFFFFF" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Admin Panel</span>
        </div>

        <div style={{ display: "flex", flex: 1, paddingTop: "64px" }}>

          {/* Sidebar — occupies its own space when open (pushes the
              content area) rather than floating over it; collapses to
              zero width when closed. Inner content is a fixed 260px
              wrapper so it doesn't reflow/wrap mid-transition. */}
          <aside
            style={{ width: sidebarOpen ? "260px" : "0px", flexShrink: 0, overflow: "hidden", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: sidebarOpen ? "1px solid rgba(255,255,255,0.07)" : "none", height: "calc(100vh - 64px)", position: "sticky", top: "64px", transition: "width 0.25s cubic-bezier(.4,0,.2,1), border-color 0.25s" }}
          >
            <div style={{ width: "260px", height: "100%", display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {/* Brand card */}
              <div style={{ padding: "26px 18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ color: "#10C4C3" }}><IconShield /></div>
                  <span style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", letterSpacing: "0.04em" }}>Admin Panel</span>
                </div>
                <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: "100px", fontSize: "8px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)" }}>Nilay 360</span>
              </div>

              {/* Nav */}
              <nav style={{ flex: 1, padding: "12px 10px" }}>
                {NAV.map(item => {
                  const badge =
                    item.id === "listings"  ? stats.pending     :
                    item.id === "users"     ? stats.users       :
                    item.id === "inquiries" ? stats.inquiries   :
                    item.id === "reports"   ? stats.reportsOpen : 0;
                  return (
                    <button
                      key={item.id}
                      className="admin-sb-btn"
                      onClick={() => setActive(item.id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: active === item.id ? "rgba(16,196,195,0.1)" : "transparent", border: active === item.id ? "1px solid rgba(16,196,195,0.2)" : "1px solid transparent", color: active === item.id ? "#10C4C3" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: active === item.id ? 600 : 400, cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left" as const, transition: "all 0.14s" }}
                    >
                      {item.icon}
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {badge > 0 && (
                        <span style={{ padding: "1px 7px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, background: active === item.id ? "rgba(16,196,195,0.2)" : "rgba(16,196,195,0.08)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.2)" }}>
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Footer links */}
              <div style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <a
                  href="/dashboard"
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderRadius: "8px", fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none", fontFamily: "var(--font-body-new)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to Dashboard
                </a>
                <IconOut />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main
            className="admin-content"
            key={active}
            style={{ flex: 1, minWidth: 0, padding: "36px 40px 80px", animation: "fadeSlide 0.22s ease-out" }}
          >
            {content}
          </main>
        </div>
      </div>
    </>
  );
}