"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CITIES } from "@/constants";
import { optimizedImageUrl } from "@/lib/image-url";

// ── Types ──────────────────────────────────────────────────────────────────────

type AdminSection = "overview" | "pending" | "approved" | "rejected" | "users" | "inquiries" | "agents" | "reports" | "content" | "audit";

type Stats = {
  pending: number;
  active: number;
  rejected: number;
  users: number;
  inquiries: number;
  reportsOpen: number;
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
  profiles: { full_name: string | null; phone: string | null; email: string | null } | null;
  agent_service_cities: { city: string }[] | null;
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

type ReportRow = {
  id: string;
  reporter_id: string;
  entity_type: "listing" | "profile";
  entity_id: string;
  reason: string;
  details: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
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
function IconFlag()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>; }
function IconChevron(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }

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

function StatCard({ label, value, icon, accent, note }: {
  label: string; value: number | string;
  icon: React.ReactNode; accent?: "gold" | "green" | "red" | "blue"; note?: string;
}) {
  const map = {
    gold:  { bg: "rgba(16,196,195,0.12)",  color: "#10C4C3" },
    green: { bg: "rgba(52,211,153,0.12)",  color: "#34D399" },
    red:   { bg: "rgba(248,113,113,0.12)", color: "#F87171" },
    blue:  { bg: "rgba(96,165,250,0.12)",  color: "#60A5FA" },
  };
  const a = map[accent ?? "gold"];
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "22px 24px", display: "flex", alignItems: "center", gap: "18px", flex: "1 1 160px" }}>
      <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: a.color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "30px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#A9B4C2", marginTop: "2px" }}>{label}</div>
        {note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>{note}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "30px", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.2 }}>{title}</h2>
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
}) {
  const thumb = Array.isArray(listing.photo_urls) ? listing.photo_urls[0] ?? null : null;
  const label = listing.listing_type === "sale" ? "For Sale" : listing.listing_type === "rent" ? "For Rent" : (listing.listing_type ?? "");
  const loc   = [listing.locality, listing.city].filter(Boolean).join(", ");

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", overflow: "hidden", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
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
              <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.25, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
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
            {listing.slug && (
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
          style={{ padding: "6px 28px 6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: disabled ? "not-allowed" : "pointer" }}
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
        style={{ flex: "1 1 220px", minWidth: "160px", padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none" }}
      />
      <button
        onClick={() => onSave(value.trim() || null)}
        disabled={disabled || !dirty}
        style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", flexShrink: 0 }}
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
          style={{ flex: "1 1 220px", minWidth: "160px", padding: "6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none" }}
        />
        <button
          onClick={() => onSave(value.trim() || null)}
          disabled={disabled || !dirty}
          style={{ padding: "6px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", flexShrink: 0 }}
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

function SiteContentField({
  label, description, value, onSave, disabled, multiline,
}: {
  label: string; description?: string; value: string;
  onSave: (v: string) => void; disabled: boolean; multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const dirty = draft !== value;

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 22px", marginBottom: "14px" }}>
      <label style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", display: "block", marginBottom: "4px" }}>{label}</label>
      {description && <p style={{ fontSize: "11px", color: "#A9B4C2", marginBottom: "10px" }}>{description}</p>}
      <div style={{ display: "flex", gap: "10px", alignItems: multiline ? "flex-start" : "center", flexWrap: "wrap" }}>
        {multiline ? (
          <textarea
            value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)} rows={2}
            style={{ flex: "1 1 260px", minWidth: "200px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none", resize: "vertical" }}
          />
        ) : (
          <input
            type="text" value={draft} disabled={disabled} onChange={e => setDraft(e.target.value)}
            style={{ flex: "1 1 260px", minWidth: "200px", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "13px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none" }}
          />
        )}
        <button
          onClick={() => onSave(draft)}
          disabled={disabled || !dirty}
          style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: dirty ? "#10C4C3" : "rgba(255,255,255,0.06)", color: dirty ? "#020C1C" : "rgba(255,255,255,0.4)", border: "none", cursor: disabled || !dirty ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", flexShrink: 0 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

const SITE_CONTENT_FIELDS: { key: string; label: string; description: string; multiline?: boolean }[] = [
  { key: "hero_line1",     label: "Homepage Hero — Line 1",       description: "Main headline on the homepage hero." },
  { key: "hero_line2",     label: "Homepage Hero — Line 2",       description: "Italic second line under the headline." },
  { key: "hero_subtitle",  label: "Homepage Hero — Subtitle",     description: "Short line under the headline.", multiline: true },
  { key: "trust_bar_note", label: "Trust Bar Note (optional)",    description: "Short label shown near the stats strip — leave blank to hide it." },
];

function SiteContentSection({
  content, loading, disabled, onSave,
}: {
  content: Record<string, string>; loading: boolean; disabled: string | null;
  onSave: (key: string, value: string) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Site Content" subtitle="Edit commonly-changed homepage copy — changes appear immediately, no code deploy needed." />
      {SITE_CONTENT_FIELDS.map(f => (
        <SiteContentField
          key={f.key}
          label={f.label}
          description={f.description}
          multiline={f.multiline}
          value={content[f.key] ?? ""}
          disabled={disabled === f.key}
          onSave={v => onSave(f.key, v)}
        />
      ))}
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
        </div>
      )}

      {sectionLoading ? <Spinner /> : (
        <div className="admin-overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Recent activity */}
          <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", padding: "24px" }}>
            <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "18px" }}>Recent Submissions</h3>
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
          <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", padding: "24px" }}>
            <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 500, color: "#FFFFFF", marginBottom: "18px" }}>Top Cities</h3>
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
    </div>
  );
}

// ── Section: Pending Review ────────────────────────────────────────────────────

function PendingSection({
  listings, loading, inFlight, onApprove, onReject, agents, onAssignAgent, onKuulaTourUrl, onGoogleMapsUrl,
}: {
  listings: AdminListing[];
  loading: boolean;
  inFlight: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  agents: ApprovedAgentOption[];
  onAssignAgent: (id: string, agentId: string | null) => void;
  onKuulaTourUrl: (id: string, url: string | null) => void;
  onGoogleMapsUrl: (id: string, url: string | null) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Pending Review" subtitle="Oldest submissions first — approve or reject each listing." count={listings.length} />
      {listings.length === 0 ? (
        <div style={{ padding: "72px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(52,211,153,0.08)", border: "1.5px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#34D399" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", color: "#FFFFFF", marginBottom: "8px" }}>All clear</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No listings pending review.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {listings.map(l => (
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
              actions={
                <>
                  <button
                    onClick={() => onApprove(l.id)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
                  >
                    <IconApprove /> Approve
                  </button>
                  <button
                    onClick={() => onReject(l.id)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
                  >
                    <IconReject /> Reject
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Approved Listings ─────────────────────────────────────────────────

function ApprovedSection({
  listings, loading, inFlight, onUnpublish, agents, onAssignAgent, onKuulaTourUrl, onGoogleMapsUrl,
}: {
  listings: AdminListing[];
  loading: boolean;
  inFlight: string | null;
  onUnpublish: (id: string) => void;
  agents: ApprovedAgentOption[];
  onAssignAgent: (id: string, agentId: string | null) => void;
  onKuulaTourUrl: (id: string, url: string | null) => void;
  onGoogleMapsUrl: (id: string, url: string | null) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Approved Listings" subtitle="Currently live on the platform." count={listings.length} />
      {listings.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No active listings</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {listings.map(l => (
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
              actions={
                <button
                  onClick={() => {
                    if (window.confirm("Unpublish this listing? It will return to pending review.")) onUnpublish(l.id);
                  }}
                  disabled={inFlight === l.id}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
                >
                  Unpublish
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Rejected Listings ─────────────────────────────────────────────────

function RejectedSection({
  listings, loading, inFlight, onReApprove,
}: {
  listings: AdminListing[];
  loading: boolean;
  inFlight: string | null;
  onReApprove: (id: string) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Rejected Listings" subtitle="Listings that have been declined." count={listings.length} />
      {listings.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No rejected listings</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              inFlight={inFlight === l.id}
              actions={
                <button
                  onClick={() => onReApprove(l.id)}
                  disabled={inFlight === l.id}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
                >
                  <IconApprove /> Re-approve
                </button>
              }
            />
          ))}
        </div>
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
  color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outlineColor: "#10C4C3",
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
        style={{ background: "#fff", borderRadius: "20px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 12px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", padding: "28px 30px", animation: "fadeSlide 0.18s ease-out", fontFamily: "'Cal Sans', sans-serif" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "17px", fontWeight: 700, color: "#10C4C3" }}>
              {(user.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "24px", fontWeight: 600, color: "#020C1C", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                style={{ padding: "7px 14px", borderRadius: "8px", background: "rgba(16,196,195,0.1)", color: "#0B6E96", border: "1.5px solid rgba(16,196,195,0.3)", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}
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
            letterSpacing: "0.04em", fontFamily: "'Cal Sans', sans-serif", cursor: togglingActive ? "not-allowed" : "pointer",
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
              style={{ padding: "6px 28px 6px 10px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.15)", borderRadius: "7px", fontSize: "12px", fontWeight: 600, color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}
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
              style={{ flex: 1, padding: "10px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Cal Sans', sans-serif" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: "9px", background: "#F8F6F1", color: "#374151", border: "1px solid rgba(13,43,31,0.1)", fontWeight: 600, fontSize: "12px", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}
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
  users, loading, onRoleChange, onUpdateUser, onSubscriptionTierChange,
}: {
  users: UserRow[];
  loading: boolean;
  onRoleChange: (userId: string, newRole: string) => void;
  onUpdateUser: (userId: string, changes: Partial<UserRow>) => Promise<void>;
  onSubscriptionTierChange: (userId: string, newTier: string) => void;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort,       setSort]       = useState<UserSort>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  if (loading) return <Spinner />;

  const filtersActive = search.trim() !== "" || roleFilter !== "all";

  return (
    <div>
      <SectionHeading title="All Users" subtitle="Manage user roles across the platform." count={users.length} />

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            aria-label="Search users by name, phone, or email"
            style={{ flex: "1 1 240px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "13px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outlineColor: "#10C4C3" }}
          />
          <div style={{ position: "relative", flexShrink: 0 }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as UserSort)}
              aria-label="Sort users"
              style={{ padding: "10px 30px 10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outlineColor: "#10C4C3", appearance: "none", cursor: "pointer" }}
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
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, letterSpacing: "0.03em", background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", textTransform: "capitalize" as const, transition: "all 0.14s" }}
              >
                {r === "all" ? "All" : r.replace(/_/g, " ")}
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
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No users found</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF", marginBottom: "6px" }}>No users match</p>
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
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1.5px solid rgba(16,196,195,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", fontWeight: 700, color: "#10C4C3", fontFamily: "'Cal Sans', sans-serif" }}>
                {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
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
                  style={{ padding: "6px 28px 6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}
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

function InquiriesSection({
  inquiries, loading, inFlight, onDelete, onMarkSpam,
}: {
  inquiries: InquiryRow[];
  loading: boolean;
  inFlight: string | null;
  onDelete: (id: string) => void;
  onMarkSpam: (id: string) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="All Inquiries" subtitle="Platform-wide buyer inquiries." count={inquiries.length} />
      {inquiries.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No inquiries yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {inquiries.map(inq => {
            const isSpam = inq.status === "spam";
            const busy = inFlight === inq.id;
            return (
              <div key={inq.id} style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", padding: "18px 22px", opacity: busy ? 0.55 : 1, transition: "opacity 0.2s" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "18px", fontWeight: 600, color: "#FFFFFF" }}>
                      {inq.inquirer_name ?? "Anonymous"}
                    </span>
                    {inq.inquiry_type && (
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.1)" : "rgba(16,196,195,0.12)", color: inq.inquiry_type === "viewing" ? "#34D399" : "#10C4C3", border: `1px solid ${inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.25)" : "rgba(16,196,195,0.3)"}` }}>
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
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
                    >
                      Mark as Spam
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm("Permanently delete this inquiry? This cannot be undone.")) onDelete(inq.id);
                    }}
                    disabled={busy}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
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

const AGENT_STATUS_FILTERS = ["pending", "approved", "rejected"] as const;
type AgentStatusFilter = typeof AGENT_STATUS_FILTERS[number];

function AgentCard({
  app, inFlight, actions,
}: {
  app: AgentApplication;
  inFlight: boolean;
  actions: React.ReactNode;
}) {
  const cities = (app.agent_service_cities ?? []).map(c => c.city);
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "18px 22px", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <StatusBadge status={app.status === "approved" ? "active" : app.status === "pending" ? "pending_review" : "rejected"} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{fmtDate(app.created_at)}</span>
          </div>
          <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.25, marginBottom: "4px" }}>
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

      {app.license_number && (
        <div style={{ fontSize: "12px", color: "#A9B4C2", marginBottom: "8px" }}>
          License: <span style={{ color: "#FFFFFF" }}>{app.license_number}</span>
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

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        {actions}
      </div>
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
            style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}
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
  color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outlineColor: "#10C4C3",
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
        style={{ background: "#0A1526", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)", width: "100%", maxWidth: "520px", maxHeight: "88vh", overflowY: "auto", padding: "26px 28px", animation: "fadeSlide 0.18s ease-out", fontFamily: "'Cal Sans', sans-serif" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "24px", fontWeight: 600, color: "#FFFFFF" }}>Add Agent Manually</h3>
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
                    style={{ textAlign: "left", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9px", cursor: "pointer", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif" }}
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
              <button onClick={() => setSelectedUser(null)} style={{ fontSize: "11px", color: "#10C4C3", background: "none", border: "none", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Change</button>
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
              style={{ padding: "12px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "13px", letterSpacing: "0.04em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "'Cal Sans', sans-serif" }}
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
  applications, loading, inFlight, onApprove, onReject, onAddAgent,
}: {
  applications: AgentApplication[];
  loading: boolean;
  inFlight: string | null;
  onApprove: (id: string, userId: string) => void;
  onReject: (id: string) => void;
  onAddAgent: (data: {
    userId: string; licenseNumber: string; agencyName: string; bio: string;
    yearsExperience: string; cities: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [filter, setFilter] = useState<AgentStatusFilter>("pending");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = applications.filter(a => a.status === filter);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Agent Applications" subtitle="Review public applications or add agents directly." count={filtered.length} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {AGENT_STATUS_FILTERS.map(f => {
            const on = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", textTransform: "capitalize" as const }}
              >
                {f} ({applications.filter(a => a.status === f).length})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", background: "rgba(16,196,195,0.1)", color: "#10C4C3", border: "1.5px solid rgba(16,196,195,0.3)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}
        >
          + Add Agent Manually
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No {filter} applications</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map(app => (
            <AgentCard
              key={app.id}
              app={app}
              inFlight={inFlight === app.id}
              actions={
                filter === "pending" ? (
                  <>
                    <button
                      onClick={() => onApprove(app.id, app.user_id)}
                      disabled={inFlight === app.id}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#10C4C3", color: "#020C1C", border: "none", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === app.id ? 0.6 : 1 }}
                    >
                      <IconApprove /> Approve
                    </button>
                    <button
                      onClick={() => onReject(app.id)}
                      disabled={inFlight === app.id}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === app.id ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: inFlight === app.id ? 0.6 : 1 }}
                    >
                      <IconReject /> Reject
                    </button>
                  </>
                ) : null
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

// ── Section: Reports ─────────────────────────────────────────────────────────────

const REPORT_STATUS_FILTERS = ["open", "resolved", "dismissed"] as const;
type ReportStatusFilter = typeof REPORT_STATUS_FILTERS[number];

function ReportCard({
  report, listingPreview, profilePreview, busy, onDismiss, onResolve, onRejectListing, onDeactivateUser,
}: {
  report: ReportRow;
  listingPreview: ReportListingPreview | undefined;
  profilePreview: ReportProfilePreview | undefined;
  busy: boolean;
  onDismiss: () => void;
  onResolve: () => void;
  onRejectListing: () => void;
  onDeactivateUser: () => void;
}) {
  const isOpen = report.status === "open";
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", padding: "18px 22px", opacity: busy ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: report.status === "open" ? "rgba(245,158,11,0.15)" : report.status === "resolved" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)", color: report.status === "open" ? "#F59E0B" : report.status === "resolved" ? "#34D399" : "#A9B4C2", border: `1px solid ${report.status === "open" ? "rgba(245,158,11,0.3)" : report.status === "resolved" ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.12)"}` }}>
            {report.status}
          </span>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)" }}>
            {report.entity_type}
          </span>
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

      {isOpen && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={onResolve}
            disabled={busy}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#10C4C3", color: "#020C1C", border: "none", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
          >
            <IconApprove /> Resolve
          </button>
          <button
            onClick={onDismiss}
            disabled={busy}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#A9B4C2", border: "1.5px solid rgba(255,255,255,0.12)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
          >
            Dismiss
          </button>
          {report.entity_type === "listing" && listingPreview && listingPreview.status !== "rejected" && (
            <button
              onClick={() => {
                if (window.confirm("Reject this listing and resolve the report?")) onRejectListing();
              }}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
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
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Cal Sans', sans-serif", opacity: busy ? 0.6 : 1 }}
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
}) {
  const [filter, setFilter] = useState<ReportStatusFilter>("open");
  const filtered = reports.filter(r => r.status === filter);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeading title="Reports" subtitle="User-submitted reports on listings and profiles." count={filtered.length} />

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
        {REPORT_STATUS_FILTERS.map(f => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", textTransform: "capitalize" as const }}
            >
              {f} ({reports.filter(r => r.status === f).length})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No {filter} reports</p>
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
      <pre style={{ margin: 0, fontSize: "11px", lineHeight: 1.6, color: "#A9B4C2", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px 12px", overflowX: "auto", fontFamily: "'Cal Sans', sans-serif" }}>
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
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "'Cal Sans', sans-serif", flexWrap: "wrap" }}
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
            style={{ padding: "9px 28px 9px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}
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
            style={{ padding: "9px 28px 9px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}
          >
            <option value="all">All actors</option>
            {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#FFFFFF" }}>No matching audit entries</p>
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
  { id: "pending",    label: "Pending Review",     icon: <IconClock /> },
  { id: "approved",   label: "Approved Listings",  icon: <IconCheck /> },
  { id: "rejected",   label: "Rejected Listings",  icon: <IconX /> },
  { id: "agents",     label: "Agent Applications", icon: <IconBriefcase /> },
  { id: "users",      label: "All Users",          icon: <IconUsers /> },
  { id: "inquiries",  label: "All Inquiries",      icon: <IconMsg /> },
  { id: "reports",    label: "Reports",            icon: <IconFlag /> },
  { id: "content",    label: "Site Content",       icon: <IconEdit /> },
  { id: "audit",      label: "Audit Log",          icon: <IconAudit /> },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  // Keep the verifying screen up until auth resolves AND we've confirmed admin,
  // so non-admins never flash the panel before the redirect kicks in.
  // Also covers the profilePending window (user set, profile still in flight).
  const authChecking = authLoading || (!!user && profile === null) || !isAdmin;

  const [active,       setActive]       = useState<AdminSection>("overview");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [toast,        setToast]        = useState<{ ok: boolean; msg: string } | null>(null);

  const [stats,        setStats]        = useState<Stats>({ pending: 0, active: 0, rejected: 0, users: 0, inquiries: 0, reportsOpen: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [pendingListings,  setPendingListings]  = useState<AdminListing[]>([]);
  const [approvedListings, setApprovedListings] = useState<AdminListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<AdminListing[]>([]);
  const [users,            setUsers]            = useState<UserRow[]>([]);
  const [inquiries,        setInquiries]        = useState<InquiryRow[]>([]);
  const [agentApps,        setAgentApps]        = useState<AgentApplication[]>([]);
  const [approvedAgents,   setApprovedAgents]   = useState<ApprovedAgentOption[]>([]);
  const [auditLog,         setAuditLog]         = useState<AuditLogRow[]>([]);
  const [reports,          setReports]          = useState<ReportRow[]>([]);
  const [siteContent,      setSiteContent]      = useState<Record<string, string>>({});
  const [reportListingPreviews, setReportListingPreviews] = useState<Record<string, ReportListingPreview>>({});
  const [reportProfilePreviews, setReportProfilePreviews] = useState<Record<string, ReportProfilePreview>>({});

  const [pendingLoading,  setPendingLoading]  = useState(false);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [usersLoading,    setUsersLoading]    = useState(false);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [agentAppsLoading, setAgentAppsLoading] = useState(false);
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
      ] = await Promise.all([
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("inquiries").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({
        pending:   pending   ?? 0,
        active:    active    ?? 0,
        rejected:  rejected  ?? 0,
        users:     users     ?? 0,
        inquiries: inquiries ?? 0,
        reportsOpen: reportsOpen ?? 0,
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

  useEffect(() => {
    if (!isAdmin || loaded.current.has(active)) return;
    loaded.current.add(active);
    const supabase = createClient();

    if (active === "pending") {
      setPendingLoading(true);
      supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status, assigned_agent_id, kuula_tour_url, google_maps_url")
        .eq("status", "pending_review")
        .order("submitted_at", { ascending: true })
        .then((res: { data: unknown }) => {
          setPendingListings((res.data as AdminListing[] | null) ?? []);
          setPendingLoading(false);
        });
    } else if (active === "approved") {
      setApprovedLoading(true);
      supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status, assigned_agent_id, kuula_tour_url, google_maps_url")
        .eq("status", "active")
        .order("submitted_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setApprovedListings((res.data as AdminListing[] | null) ?? []);
          setApprovedLoading(false);
        });
    } else if (active === "rejected") {
      setRejectedLoading(true);
      supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status")
        .eq("status", "rejected")
        .order("submitted_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setRejectedListings((res.data as AdminListing[] | null) ?? []);
          setRejectedLoading(false);
        });
    } else if (active === "users") {
      setUsersLoading(true);
      supabase
        .from("profiles")
        .select("id, full_name, city, role, phone, email, created_at, is_verified, is_active, is_nri, whatsapp, nationality, bio, subscription_tier")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setUsers((res.data as UserRow[] | null) ?? []);
          setUsersLoading(false);
        });
    } else if (active === "inquiries") {
      setInquiriesLoading(true);
      supabase
        .from("inquiries")
        .select("id, property_title, property_slug, seller_email, inquirer_name, inquirer_email, inquirer_phone, message, inquiry_type, status, created_at")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setInquiries((res.data as InquiryRow[] | null) ?? []);
          setInquiriesLoading(false);
        });
    } else if (active === "agents") {
      setAgentAppsLoading(true);
      supabase
        .from("agent_profiles")
        .select("id, user_id, license_number, agency_name, bio, years_experience, status, created_at, profiles(full_name, phone, email), agent_service_cities(city)")
        .order("created_at", { ascending: false })
        .then((res: { data: unknown }) => {
          setAgentApps((res.data as AgentApplication[] | null) ?? []);
          setAgentAppsLoading(false);
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
        .select("key, value")
        .then((res: { data: unknown }) => {
          const rows = (res.data as { key: string; value: string }[] | null) ?? [];
          const map: Record<string, string> = {};
          rows.forEach(r => { map[r.key] = r.value; });
          setSiteContent(map);
          setContentLoading(false);
        });
    } else if (active === "reports") {
      setReportsLoading(true);
      (async () => {
        const { data } = await supabase
          .from("reports")
          .select("id, reporter_id, entity_type, entity_id, reason, details, status, created_at, resolved_at, resolved_by, profiles!reporter_id(full_name, email)")
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
    const oldValue = siteContent[key] ?? "";
    const supabase = createClient();
    const { error } = await supabase
      .from("site_content")
      .update({ value: newValue, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) {
      console.error("Admin — site content save error:", error);
      setToast({ ok: false, msg: "Save failed — please try again." });
    } else {
      void logAdminAction("update_site_content", "site_content", null, { key, value: oldValue }, { key, value: newValue });
      setSiteContent(prev => ({ ...prev, [key]: newValue }));
      setToast({ ok: true, msg: "Saved." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [siteContent, logAdminAction, user]);

  const handleListingStatus = useCallback(async (
    id: string,
    newStatus: "active" | "rejected" | "pending_review",
    fromSection: "pending" | "approved" | "rejected",
  ) => {
    setInFlight(id);
    const oldStatus = fromSection === "pending" ? "pending_review" : fromSection === "approved" ? "active" : "rejected";
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ status: newStatus }).eq("id", id);

    if (error) {
      console.error("Admin — listing status error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("update_listing_status", "property_listing", id, { status: oldStatus }, { status: newStatus });
      if (fromSection === "pending") {
        setPendingListings(prev => prev.filter(l => l.id !== id));
        setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1), ...(newStatus === "active" ? { active: s.active + 1 } : { rejected: s.rejected + 1 }) }));
        if (newStatus === "active")   loaded.current.delete("approved");
        if (newStatus === "rejected") loaded.current.delete("rejected");
      } else if (fromSection === "approved") {
        setApprovedListings(prev => prev.filter(l => l.id !== id));
        setStats(s => ({ ...s, active: Math.max(0, s.active - 1), pending: s.pending + 1 }));
        loaded.current.delete("pending");
      } else if (fromSection === "rejected") {
        setRejectedListings(prev => prev.filter(l => l.id !== id));
        setStats(s => ({ ...s, rejected: Math.max(0, s.rejected - 1), active: s.active + 1 }));
        loaded.current.delete("approved");
      }
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
  }, [logAdminAction]);

  const handleAssignAgent = useCallback(async (
    id: string,
    agentId: string | null,
    fromSection: "pending" | "approved",
  ) => {
    setInFlight(id);
    const oldAgentId = (fromSection === "pending" ? pendingListings : approvedListings).find(l => l.id === id)?.assigned_agent_id ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ assigned_agent_id: agentId }).eq("id", id);

    if (error) {
      console.error("Admin — assign agent error:", error);
      setToast({ ok: false, msg: "Assignment failed — please try again." });
    } else {
      void logAdminAction("assign_agent", "property_listing", id, { assigned_agent_id: oldAgentId }, { assigned_agent_id: agentId });
      const updater = (prev: AdminListing[]) => prev.map(l => l.id === id ? { ...l, assigned_agent_id: agentId } : l);
      if (fromSection === "pending") setPendingListings(updater);
      else setApprovedListings(updater);
      setToast({ ok: true, msg: agentId ? "Agent assigned." : "Agent unassigned." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [pendingListings, approvedListings, logAdminAction]);

  const handleKuulaTourUrl = useCallback(async (
    id: string,
    url: string | null,
    fromSection: "pending" | "approved",
  ) => {
    setInFlight(id);
    const oldUrl = (fromSection === "pending" ? pendingListings : approvedListings).find(l => l.id === id)?.kuula_tour_url ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ kuula_tour_url: url }).eq("id", id);

    if (error) {
      console.error("Admin — kuula tour url error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("update_kuula_tour_url", "property_listing", id, { kuula_tour_url: oldUrl }, { kuula_tour_url: url });
      const updater = (prev: AdminListing[]) => prev.map(l => l.id === id ? { ...l, kuula_tour_url: url } : l);
      if (fromSection === "pending") setPendingListings(updater);
      else setApprovedListings(updater);
      setToast({ ok: true, msg: url ? "360° tour URL saved." : "360° tour URL cleared." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [pendingListings, approvedListings, logAdminAction]);

  const handleGoogleMapsUrl = useCallback(async (
    id: string,
    url: string | null,
    fromSection: "pending" | "approved",
  ) => {
    setInFlight(id);
    const oldUrl = (fromSection === "pending" ? pendingListings : approvedListings).find(l => l.id === id)?.google_maps_url ?? null;
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ google_maps_url: url }).eq("id", id);

    if (error) {
      console.error("Admin — google maps url error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
      void logAdminAction("update_google_maps_url", "property_listing", id, { google_maps_url: oldUrl }, { google_maps_url: url });
      const updater = (prev: AdminListing[]) => prev.map(l => l.id === id ? { ...l, google_maps_url: url } : l);
      if (fromSection === "pending") setPendingListings(updater);
      else setApprovedListings(updater);
      setToast({ ok: true, msg: url ? "Google Maps URL saved." : "Google Maps URL cleared." });
    }
    setInFlight(null);
    setTimeout(() => setToast(null), 2500);
  }, [pendingListings, approvedListings, logAdminAction]);

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
    const preview = reportListingPreviews[report.entity_id];
    const fromSection = preview?.status === "active" ? "approved" : preview?.status === "rejected" ? "rejected" : "pending";
    await handleListingStatus(report.entity_id, "rejected", fromSection);
    await handleReportResolve(report.id, "resolved");
  }, [reportListingPreviews, handleListingStatus, handleReportResolve]);

  const handleReportDeactivateUser = useCallback(async (report: ReportRow) => {
    await handleUserUpdate(report.entity_id, { is_active: false });
    await handleReportResolve(report.id, "resolved");
  }, [handleUserUpdate, handleReportResolve]);

  const handleAgentApprove = useCallback(async (id: string, userId: string) => {
    setInFlight(id);
    const oldStatus = agentApps.find(a => a.id === id)?.status ?? null;
    const supabase = createClient();
    const { error: statusErr } = await supabase.from("agent_profiles").update({ status: "approved" }).eq("id", id);
    const { error: roleErr } = statusErr ? { error: null } : await supabase.from("profiles").update({ role: "agent" }).eq("id", userId);

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
            <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", color: "#FFFFFF", letterSpacing: "0.08em" }}>Verifying access…</span>
          </div>
          <Spinner size={26} pad={0} />
        </div>
      </>
    );
  }

  let content: React.ReactNode;
  if (active === "overview") {
    content = <OverviewSection stats={stats} loading={statsLoading} />;
  } else if (active === "pending") {
    content = (
      <PendingSection
        listings={pendingListings}
        loading={pendingLoading}
        inFlight={inFlight}
        onApprove={id => void handleListingStatus(id, "active", "pending")}
        onReject={id => void handleListingStatus(id, "rejected", "pending")}
        agents={approvedAgents}
        onAssignAgent={(id, agentId) => void handleAssignAgent(id, agentId, "pending")}
        onKuulaTourUrl={(id, url) => void handleKuulaTourUrl(id, url, "pending")}
        onGoogleMapsUrl={(id, url) => void handleGoogleMapsUrl(id, url, "pending")}
      />
    );
  } else if (active === "approved") {
    content = (
      <ApprovedSection
        listings={approvedListings}
        loading={approvedLoading}
        inFlight={inFlight}
        onUnpublish={id => void handleListingStatus(id, "pending_review", "approved")}
        agents={approvedAgents}
        onAssignAgent={(id, agentId) => void handleAssignAgent(id, agentId, "approved")}
        onKuulaTourUrl={(id, url) => void handleKuulaTourUrl(id, url, "approved")}
        onGoogleMapsUrl={(id, url) => void handleGoogleMapsUrl(id, url, "approved")}
      />
    );
  } else if (active === "rejected") {
    content = (
      <RejectedSection
        listings={rejectedListings}
        loading={rejectedLoading}
        inFlight={inFlight}
        onReApprove={id => void handleListingStatus(id, "active", "rejected")}
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
        onAddAgent={handleAddAgent}
      />
    );
  } else if (active === "users") {
    content = (
      <UsersSection
        users={users}
        loading={usersLoading}
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
      />
    );
  } else if (active === "content") {
    content = (
      <SiteContentSection
        content={siteContent}
        loading={contentLoading}
        disabled={inFlight}
        onSave={(key, value) => void handleSiteContentSave(key, value)}
      />
    );
  } else {
    content = <AuditLogSection entries={auditLog} loading={auditLoading} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cal Sans', system-ui, sans-serif; background: #020C1C; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .admin-sb-btn:hover { color: #FFFFFF !important; background: rgba(255,255,255,0.06) !important; }
        @media (max-width: 840px) {
          .admin-aside {
            position: fixed !important; top: 0 !important; bottom: 0 !important; left: 0 !important;
            z-index: 400 !important; height: 100dvh !important;
            transform: translateX(-100%) !important;
            transition: transform 0.27s cubic-bezier(.4,0,.2,1) !important;
          }
          .admin-aside.sb-open { transform: translateX(0) !important; }
          .admin-content { padding: 24px 18px 72px !important; }
          .admin-mob-bar { display: flex !important; }
          .admin-overview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "88px", right: "24px", zIndex: 999, padding: "12px 20px", borderRadius: "10px", background: toast.ok ? "rgba(16,196,195,0.9)" : "rgba(248,113,113,0.9)", color: "#020C1C", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "'Cal Sans', sans-serif", display: "flex", alignItems: "center", gap: "8px", animation: "toastIn 0.2s ease-out", backdropFilter: "blur(12px)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ minHeight: "100dvh", background: "#020C1C", display: "flex", flexDirection: "column" }}>

        {/* Mobile toggle bar */}
        <div className="admin-mob-bar" style={{ display: "none", position: "sticky", top: "64px", zIndex: 200, padding: "10px 16px", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ display: "flex", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "7px", cursor: "pointer", color: "#FFFFFF" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Admin Panel</span>
        </div>

        <div style={{ display: "flex", flex: 1, paddingTop: "64px" }}>

          {/* Sidebar */}
          <aside
            className={`admin-aside${sidebarOpen ? " sb-open" : ""}`}
            style={{ width: "260px", flexShrink: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.07)", height: "calc(100vh - 64px)", position: "sticky", top: "64px", display: "flex", flexDirection: "column", overflowY: "auto" }}
          >
            {/* Brand card */}
            <div style={{ padding: "26px 18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <div style={{ color: "#10C4C3" }}><IconShield /></div>
                <span style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "18px", fontWeight: 500, color: "#FFFFFF", letterSpacing: "0.04em" }}>Admin Panel</span>
              </div>
              <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: "100px", fontSize: "8px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, background: "rgba(16,196,195,0.12)", color: "#10C4C3", border: "1px solid rgba(16,196,195,0.25)" }}>Nilay 360</span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              {NAV.map(item => {
                const badge =
                  item.id === "pending"  ? stats.pending     :
                  item.id === "approved" ? stats.active      :
                  item.id === "rejected" ? stats.rejected    :
                  item.id === "reports"  ? stats.reportsOpen : 0;
                return (
                  <button
                    key={item.id}
                    className="admin-sb-btn"
                    onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: active === item.id ? "rgba(16,196,195,0.1)" : "transparent", border: active === item.id ? "1px solid rgba(16,196,195,0.2)" : "1px solid transparent", color: active === item.id ? "#10C4C3" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: active === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", textAlign: "left" as const, transition: "all 0.14s" }}
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
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderRadius: "8px", fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none", fontFamily: "'Cal Sans', sans-serif" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Dashboard
              </a>
              <IconOut />
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 390, backdropFilter: "blur(4px)" }} />
          )}

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