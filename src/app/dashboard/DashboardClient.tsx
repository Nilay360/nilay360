"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "listings"
  | "saved"
  | "searches"
  | "profile"
  | "inquiries"
  | "appointments"
  | "settings";

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

type SavedSearch = {
  id: string;
  search_query: string | null;
  filters: Record<string, unknown>;
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
function IconPin()      { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconAlert()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }

// ── Sidebar nav ────────────────────────────────────────────────────────────────

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",     label: "Overview",        icon: <IconHome /> },
  { id: "listings",     label: "My Listings",      icon: <IconList /> },
  { id: "saved",        label: "Saved Properties", icon: <IconHeart /> },
  { id: "searches",     label: "Recent Searches",  icon: <IconSearch /> },
  { id: "profile",      label: "Profile",          icon: <IconUser /> },
  { id: "inquiries",    label: "My Inquiries",     icon: <IconMsg /> },
  { id: "appointments", label: "Appointments",     icon: <IconCal /> },
  { id: "settings",     label: "Settings",         icon: <IconGear /> },
];

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
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 500, color: "#E8EAED", lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "13px", color: "#AEB4BC", marginTop: "5px" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, cta, ctaHref }: {
  icon: React.ReactNode; title: string; subtitle: string; cta?: string; ctaHref?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(43,168,224,0.12)", border: "1px solid rgba(43,168,224,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px", color: "#2BA8E0" }}>
        {icon}
      </div>
      <h4 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, color: "#E8EAED", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "13px", color: "#AEB4BC", marginBottom: "22px", maxWidth: "310px", lineHeight: 1.65 }}>{subtitle}</p>
      {cta && ctaHref && (
        <a href={ctaHref} style={{ padding: "11px 28px", background: "#2BA8E0", borderRadius: "999px", color: "#000", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>{cta}</a>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#2BA8E0" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending_review: { label: "Pending Review", bg: "rgba(255,255,255,0.10)",  color: "#AEB4BC", border: "rgba(255,255,255,0.18)"  },
    active:         { label: "Active",          bg: "rgba(43,168,224,0.15)", color: "#2BA8E0", border: "rgba(43,168,224,0.30)"  },
    rejected:       { label: "Rejected",        bg: "rgba(248,113,113,0.15)",  color: "#F87171", border: "rgba(248,113,113,0.30)"   },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(255,255,255,0.10)", color: "#AEB4BC", border: "rgba(255,255,255,0.18)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function StatCard({ label, value, accent, icon }: {
  label: string; value: string | number; accent?: boolean; icon: React.ReactNode;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "22px 24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: "18px", flex: "1 1 155px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: accent ? "rgba(43,168,224,0.15)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: accent ? "#2BA8E0" : "#AEB4BC" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 600, lineHeight: 1.1, background: "linear-gradient(135deg, #E8EAED 0%, #2BA8E0 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#E8EAED" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{label}</div>
      </div>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange, readOnly, placeholder }: {
  label: string; type?: string; value: string;
  onChange?: (v: string) => void; readOnly?: boolean; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEB4BC", marginBottom: "7px" }}>{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", background: readOnly ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", color: readOnly ? "rgba(255,255,255,0.45)" : "#FFFFFF", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", cursor: readOnly ? "not-allowed" : "text" }}
      />
    </div>
  );
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ email, fullName, listings, savedItems, profile }: {
  email: string;
  fullName?: string;
  listings: Listing[];
  savedItems: SavedItem[];
  profile: ProfileData | null;
}) {
  const name         = fullName || email.split("@")[0];
  const activeCount  = listings.filter(l => l.status === "active").length;
  const pendingCount = listings.filter(l => l.status === "pending_review").length;
  const completion   = calcCompletion(profile);

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "38px", fontWeight: 400, color: "#E8EAED", lineHeight: 1.2, marginBottom: "6px" }}>
          Welcome back, <em style={{ fontStyle: "italic", color: "#2BA8E0" }}>{name}</em>
        </h1>
        <p style={{ fontSize: "14px", color: "#AEB4BC" }}>Here&apos;s an overview of your activity on Nilay 360.</p>
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
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#E8EAED" }}>Profile Completion</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: completion === 100 ? "#4ADE80" : "#2BA8E0" }}>{completion}%</span>
        </div>
        <div style={{ height: "6px", background: "rgba(255,255,255,0.10)", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${completion}%`, background: completion === 100 ? "#4ADE80" : "#2BA8E0", borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
        {completion < 100 && (
          <p style={{ fontSize: "12px", color: "#AEB4BC", marginTop: "8px" }}>
            Complete your profile to improve visibility.{" "}
            <button
              style={{ background: "none", border: "none", color: "#2BA8E0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0, textDecoration: "underline" }}
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

      {/* Quick actions */}
      <Card style={{ padding: "28px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#E8EAED", marginBottom: "18px" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a href="/properties"    style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "#2BA8E0", color: "#E8EAED", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>Browse Properties</a>
          <a href="/post-property" style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#E8EAED" }}>List Your Property</a>
          <a href="/calculator"    style={{ padding: "12px 24px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textDecoration: "none", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#E8EAED" }}>Calculate EMI</a>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 2: My Listings ────────────────────────────────────────────────────────

function ListingsTab({ listings, loading, onDelete }: {
  listings: Listing[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  if (loading) return <Spinner />;

  const filtered = search.trim() === ""
    ? listings
    : listings.filter(l => {
        const q = search.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.locality?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q)
        );
      });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <SectionHeading
          title="My Listings"
          subtitle={listings.length ? `${listings.length} listing${listings.length !== 1 ? "s" : ""} submitted` : undefined}
        />
        <a href="/post-property" style={{ padding: "10px 20px", background: "#2BA8E0", borderRadius: "999px", color: "#000", fontSize: "13px", fontWeight: 700, textDecoration: "none", flexShrink: 0, boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}>
          + List Property
        </a>
      </div>

      {listings.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, city, or status…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.22)",
              borderRadius: "10px", fontSize: "13px", color: "#E8EAED",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          {search.trim() !== "" && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", margin: "8px 0 0" }}>
              Showing {filtered.length} of {listings.length} {listings.length === 1 ? "listing" : "listings"}
            </p>
          )}
        </div>
      )}

      {listings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>}
            title="No listings yet"
            subtitle="Post your first property listing to reach thousands of qualified buyers on Nilay 360."
            cta="Post a Property"
            ctaHref="/post-property"
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED", margin: "0 0 6px" }}>No listings match</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Try a different title, city, or status.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map(l => (
            <Card key={l.id} style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                {/* Left: info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <StatusBadge status={l.status} />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{formatDate(l.submitted_at)}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#E8EAED", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.title ?? `${l.property_category ?? "Property"} in ${l.city ?? "—"}`}
                  </h3>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "#AEB4BC" }}>
                    {l.property_category && <span style={{ textTransform: "capitalize" }}>{l.property_category}</span>}
                    <span style={{ textTransform: "capitalize" }}>
                      {l.listing_type === "sale" ? "For Sale" : l.listing_type === "rent" ? "For Rent" : (l.listing_type ?? "—")}
                    </span>
                    {(l.locality || l.city) && (
                      <span>{[l.locality, l.city].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Right: price + actions */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#E8EAED" }}>
                    {formatPrice(l.price, l.listing_type)}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {l.status === "active" && l.slug && (
                      <a
                        href={`/property/${l.slug}`}
                        style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 500, color: "#E8EAED", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "7px", textDecoration: "none" }}
                      >
                        View
                      </a>
                    )}
                    <a
                      href={`/post-property/edit/${l.id}`}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "12px", fontWeight: 500, color: "#E8EAED", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "7px", textDecoration: "none" }}
                    >
                      <IconEdit /> Edit
                    </a>
                    <button
                      onClick={() => onDelete(l.id)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "12px", color: "#F87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: "7px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <IconTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
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
                      <img src={image} alt={title ?? "Property"} style={{ width: "80px", height: "64px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {propType && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "capitalize", background: "rgba(255,255,255,0.05)", color: "#AEB4BC", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "6px" }}>
                          {propType}
                        </span>
                      )}
                      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#E8EAED", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title ?? `Property ID: ${item.property_id ?? "—"}`}
                      </h3>
                      {city && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#AEB4BC" }}>
                          <IconPin />{city}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>Saved {formatDate(item.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
                    {price != null && (
                      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#E8EAED" }}>
                        {formatPrice(price, null)}
                      </div>
                    )}
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", fontSize: "12px", color: "#F87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: "7px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
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
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#AEB4BC", marginBottom: 7 }}>{label}</label>
      <input
        type={opts?.type ?? "text"}
        value={value}
        readOnly={ro}
        placeholder={opts?.placeholder}
        onChange={e => !ro && onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", background: ro ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: ro ? "rgba(255,255,255,0.45)" : "#FFFFFF", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" as const, cursor: ro ? "not-allowed" : "text" }}
      />
    </div>
  );
}

function pSelect(label: string, value: string, onChange: (v: string) => void, options: {value: string; label: string}[], placeholder?: string) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#AEB4BC", marginBottom: 7 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "11px 36px 11px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: value ? "#FFFFFF" : "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}>
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
        <div style={{ position: "fixed", top: 88, right: 24, zIndex: 500, padding: "12px 20px", borderRadius: 16, background: "rgba(18,21,25,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${toast.ok ? "rgba(43,168,224,0.30)" : "rgba(248,113,113,0.30)"}`, color: toast.ok ? "#E8EAED" : "#F87171", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.18)", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <SectionHeading title="My Profile" subtitle="Manage your personal information and account preferences." />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "11px 28px", background: "#2BA8E0", borderRadius: 999, color: "#000", fontSize: 13, fontWeight: 700, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1, flexShrink: 0, boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Avatar + completion header */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarSrc ? "transparent" : "rgba(43,168,224,0.12)", border: "2.5px solid rgba(43,168,224,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {avatarSrc
              ? <img src={avatarSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 28, fontWeight: 700, color: "#2BA8E0", fontFamily: "'DM Sans', sans-serif" }}>{displayName[0].toUpperCase()}</span>
            }
          </div>
          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, color: "#E8EAED" }}>{displayName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontSize: 13, color: "#AEB4BC" }}>{email}</span>
            </div>
          </div>
          {/* Completion */}
          <div style={{ minWidth: 160, flex: "0 0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#E8EAED" }}>Profile Completion</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: completion === 100 ? "#4ADE80" : "#2BA8E0" }}>{completion}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.10)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completion}%`, background: completion === 100 ? "#4ADE80" : "#2BA8E0", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 5 }}>{8 - Math.round(completion / 100 * 8)} field{8 - Math.round(completion / 100 * 8) !== 1 ? "s" : ""} remaining</div>
          </div>
        </div>
      </Card>

      {/* Main info */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#E8EAED", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Personal Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Full Name",    form.full_name, set("full_name") as (v: string) => void, { placeholder: "Your full name" })}
          {pField("Phone Number", form.phone,     set("phone")     as (v: string) => void, { type: "tel", placeholder: "+91 98765 43210" })}
          {pField("City",         form.city,      set("city")      as (v: string) => void, { placeholder: "e.g. Hyderabad" })}
          {pField("WhatsApp",     form.whatsapp,  set("whatsapp")  as (v: string) => void, { type: "tel", placeholder: "+91 98765 43210" })}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEB4BC", marginBottom: 7 }}>Bio</label>
            <textarea
              value={form.bio}
              placeholder="A short bio about yourself"
              onChange={e => set("bio")(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 14, color: "#FFFFFF", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box", minHeight: 80 }}
            />
          </div>
        </div>
      </Card>

      {/* Additional info */}
      <Card style={{ padding: "28px 32px", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#E8EAED", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Additional Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Date of Birth", form.date_of_birth, set("date_of_birth") as (v: string) => void, { type: "date" })}
          {pSelect("Gender", form.gender, set("gender") as (v: string) => void,
            [{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }],
            "Select gender"
          )}
          {pField("Nationality",  form.nationality,  set("nationality")  as (v: string) => void, { placeholder: "e.g. Indian" })}
          {/* NRI toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEB4BC", marginBottom: 12 }}>NRI Status</label>
            <button
              type="button"
              onClick={() => set("is_nri")(!form.is_nri)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: form.is_nri ? "rgba(43,168,224,0.10)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${form.is_nri ? "rgba(43,168,224,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%", textAlign: "left" as const }}
            >
              <div style={{ width: 36, height: 20, borderRadius: 10, background: form.is_nri ? "#2BA8E0" : "rgba(255,255,255,0.15)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: form.is_nri ? 19 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: form.is_nri ? 600 : 400, color: form.is_nri ? "#2BA8E0" : "#AEB4BC" }}>
                {form.is_nri ? "NRI — Non-Resident Indian" : "Resident Indian"}
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Read-only account info */}
      <Card style={{ padding: "28px 32px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#E8EAED", marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Account Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 28px" }}>
          {pField("Email Address", email,                    () => {}, { readOnly: true })}
          {pField("Account ID",    userId.slice(0, 8) + "…", () => {}, { readOnly: true })}
        </div>
      </Card>
    </div>
  );
}

// ── Saved search helpers ──────────────────────────────────────────────────────

function fmtBudgetShort(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  return `₹${(v / 100_000).toFixed(0)}L`;
}

function buildSearchSummary(f: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof f.listingType === "string" && f.listingType !== "all")
    parts.push(f.listingType === "sale" ? "Sale" : "Rent");
  const types = Array.isArray(f.propTypes) ? (f.propTypes as string[]) : [];
  if (types.length > 0) parts.push(types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join("/"));
  if (typeof f.city === "string" && f.city !== "all") parts.push(f.city);
  const beds = Array.isArray(f.bhk) ? (f.bhk as number[]) : [];
  if (beds.length > 0) parts.push(beds.map((b: number) => `${b}${b >= 5 ? "+" : ""} BHK`).join("/"));
  const mn = typeof f.minPrice === "string" && f.minPrice ? Number(f.minPrice) : null;
  const mx = typeof f.maxPrice === "string" && f.maxPrice ? Number(f.maxPrice) : null;
  if (mn != null || mx != null)
    parts.push(`${mn != null ? fmtBudgetShort(mn) : "Any"} – ${mx != null ? fmtBudgetShort(mx) : "Any"}`);
  return parts.length > 0 ? parts.join(" · ") : "All Properties";
}

const SEARCH_BUDGET_PRESETS: Record<string, [number, number]> = {
  "Under 50L":  [0,          5_000_000],
  "50L – 1Cr":   [5_000_000,  10_000_000],
  "1 – 2 Cr":    [10_000_000, 20_000_000],
  "2 – 5 Cr":    [20_000_000, 50_000_000],
  "5 Cr+":      [50_000_000, 999_999_999],
};

function buildSearchUrl(f: Record<string, unknown>, q: string | null): string {
  const p = new URLSearchParams();
  if (typeof f.city === "string" && f.city !== "all") p.set("city", f.city);
  if (typeof f.listingType === "string" && f.listingType !== "all") p.set("listing", f.listingType);
  const types = Array.isArray(f.propTypes) ? (f.propTypes as string[]) : [];
  if (types.length === 1) p.set("type", types[0]);
  const beds = Array.isArray(f.bhk) ? (f.bhk as number[]) : [];
  if (beds.length === 1) p.set("beds", String(beds[0]));
  const mn = typeof f.minPrice === "string" && f.minPrice ? Number(f.minPrice) : 0;
  const mx = typeof f.maxPrice === "string" && f.maxPrice ? Number(f.maxPrice) : 0;
  for (const [label, [pMn, pMx]] of Object.entries(SEARCH_BUDGET_PRESETS)) {
    if (pMn === mn && pMx === mx) { p.set("budget", label); break; }
  }
  if (q) p.set("q", q);
  return `/search${p.toString() ? "?" + p.toString() : ""}`;
}

// ── Tab 4: Saved Searches ─────────────────────────────────────────────────────

function SearchesTab({ loading, searches, onDelete }: {
  loading: boolean;
  searches: SavedSearch[];
  onDelete: (id: string) => void;
}) {
  if (loading) return <Spinner />;
  const count = searches.length;
  return (
    <div>
      <SectionHeading
        title="Saved Searches"
        subtitle={count ? `${count} saved search${count !== 1 ? "es" : ""}` : "Save searches from the search page to revisit them here."}
      />

      {count === 0 ? (
        <Card>
          <EmptyState
            icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
            title="No saved searches yet"
            subtitle="Use the 'Save Search' button on the search page to save your filters and revisit them here."
            cta="Go to Search"
            ctaHref="/search"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {searches.map(s => {
            const f = s.filters ?? {};
            const summary = buildSearchSummary(f);
            const url = buildSearchUrl(f, s.search_query);
            return (
              <Card key={s.id} style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {s.search_query && (
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#E8EAED", marginBottom: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.search_query}
                      </p>
                    )}
                    <p style={{ fontSize: "13px", color: "#AEB4BC", marginBottom: "8px" }}>{summary}</p>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>Saved {formatDate(s.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
                    <a
                      href={url}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, color: "#000", background: "#2BA8E0", borderRadius: "999px", textDecoration: "none", letterSpacing: "0.04em", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Run Search
                    </a>
                    <button
                      onClick={() => onDelete(s.id)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", fontSize: "12px", color: "#F87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: "8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <IconTrash /> Delete
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

function InquiryTypeBadge({ type }: { type: string | null }) {
  const isViewing = type === "viewing";
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: isViewing ? "rgba(43,168,224,0.15)" : "rgba(255,255,255,0.10)", color: isViewing ? "#2BA8E0" : "#AEB4BC", border: `1px solid ${isViewing ? "rgba(43,168,224,0.30)" : "rgba(255,255,255,0.18)"}` }}>
      {isViewing ? "Viewing" : "Callback"}
    </span>
  );
}

function InquiryStatusBadge({ status }: { status: string | null }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    new:      { label: "New",       bg: "rgba(43,168,224,0.15)", color: "#2BA8E0", border: "rgba(43,168,224,0.30)" },
    contacted:{ label: "Contacted", bg: "rgba(74,222,128,0.15)",   color: "#4ADE80", border: "rgba(74,222,128,0.30)" },
    closed:   { label: "Closed",    bg: "rgba(255,255,255,0.10)", color: "#AEB4BC", border: "rgba(255,255,255,0.18)" },
  };
  const c = cfg[status ?? ""] ?? { label: status ?? "—", bg: "rgba(255,255,255,0.10)", color: "#AEB4BC", border: "rgba(255,255,255,0.18)" };
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
    activeStyle:   { background: "#2BA8E0", color: "#000", borderColor: "#2BA8E0" },
    inactiveStyle: { background: "transparent", color: "#2BA8E0", borderColor: "rgba(43,168,224,0.4)" },
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
    activeStyle:   { background: "#AEB4BC", color: "#000", borderColor: "#AEB4BC" },
    inactiveStyle: { background: "transparent", color: "#AEB4BC", borderColor: "rgba(255,255,255,0.25)" },
  },
];

function InquiriesTab({
  inquiries,
  loading,
  onStatusChange,
}: {
  inquiries: Inquiry[];
  loading: boolean;
  onStatusChange: (inquiryId: string, newStatus: string) => Promise<void>;
}) {
  if (loading) return <Spinner />;
  const count = inquiries.length;

  return (
    <div>
      <SectionHeading
        title="Inquiries"
        subtitle={count ? `${count} inquir${count !== 1 ? "ies" : "y"} received on your listings` : "Inquiries from interested buyers."}
      />

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
          {inquiries.map(inq => (
            <Card key={inq.id} style={{ padding: "20px 24px" }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#E8EAED" }}>
                    {inq.inquirer_name ?? "Anonymous"}
                  </span>
                  <InquiryTypeBadge type={inq.inquiry_type} />
                  <InquiryStatusBadge status={inq.status} />
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{formatDate(inq.created_at)}</span>
              </div>

              {/* Property */}
              {inq.property_title && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "13px", color: "#AEB4BC" }}>
                  <IconBuilding />
                  {inq.property_slug
                    ? <a href={`/property/${inq.property_slug}`} style={{ color: "#E8EAED", fontWeight: 500, textDecoration: "none" }}>{inq.property_title}</a>
                    : <span style={{ color: "#E8EAED", fontWeight: 500 }}>{inq.property_title}</span>}
                </div>
              )}

              {/* Contact row */}
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: inq.message ? "12px" : "14px" }}>
                {inq.inquirer_phone && (
                  <a href={`tel:${inq.inquirer_phone}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#AEB4BC", textDecoration: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {inq.inquirer_phone}
                  </a>
                )}
                {inq.inquirer_email && (
                  <a href={`mailto:${inq.inquirer_email}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#AEB4BC", textDecoration: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                    {inq.inquirer_email}
                  </a>
                )}
              </div>

              {/* Message */}
              {inq.message && (
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#AEB4BC", lineHeight: 1.6, borderLeft: "3px solid rgba(43,168,224,0.5)", marginBottom: "14px" }}>
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
                        fontFamily: "'DM Sans', sans-serif",
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

function AppointmentsTab() {
  return (
    <div>
      <SectionHeading title="My Appointments" subtitle="Upcoming and past property viewings." />
      <Card>
        <EmptyState
          icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          title="No appointments scheduled"
          subtitle="Book a viewing from any property page and it'll appear here with all the details."
          cta="Browse Properties"
          ctaHref="/properties"
        />
      </Card>
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
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#E8EAED", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Preferences</h3>
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
            style={{ padding: "11px 30px", background: "#2BA8E0", border: "none", borderRadius: "999px", color: "#000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 10px 30px rgba(30,167,255,.35)" }}
          >Save Changes</button>
          {profileSaved && <span style={{ fontSize: "13px", color: "#2BA8E0", fontWeight: 500 }}>✓ Changes saved</span>}
        </div>
      </Card>

      <Card style={{ padding: "32px", marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#E8EAED", marginBottom: "22px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Change Password</h3>
        <div style={{ maxWidth: "440px" }}>
          <FormField label="Current Password"     type="password" value={curPw}  onChange={setCurPw}  placeholder="Enter current password" />
          <FormField label="New Password"         type="password" value={newPw}  onChange={setNewPw}  placeholder="At least 8 characters" />
          <FormField label="Confirm New Password" type="password" value={confPw} onChange={setConfPw} placeholder="Repeat new password" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
          <button
            onClick={() => { setPwSaved(true); setCurPw(""); setNewPw(""); setConfPw(""); setTimeout(() => setPwSaved(false), 2600); }}
            style={{ padding: "11px 28px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#E8EAED", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >Update Password</button>
          {pwSaved && <span style={{ fontSize: "13px", color: "#2BA8E0", fontWeight: 500 }}>✓ Password updated</span>}
        </div>
      </Card>

      <Card style={{ padding: "32px", border: "1px solid rgba(248,113,113,0.25)" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#F87171", marginBottom: "10px" }}>Danger Zone</h3>
        <p style={{ fontSize: "13px", color: "#AEB4BC", marginBottom: "20px", lineHeight: 1.65 }}>
          Permanently delete your Nilay 360 account. All saved properties, inquiries, and preferences will be removed. This cannot be undone.
        </p>
        {!deleteMode ? (
          <button onClick={() => setDeleteMode(true)} style={{ padding: "10px 22px", background: "rgba(248,113,113,0.10)", border: "1.5px solid rgba(248,113,113,0.4)", borderRadius: "8px", color: "#F87171", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Delete Account</button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F87171" }}>Are you absolutely sure?</span>
            <button style={{ padding: "9px 20px", background: "#B91C1C", border: "none", borderRadius: "8px", color: "#FFFFFF", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Yes, Delete My Account</button>
            <button onClick={() => setDeleteMode(false)} style={{ padding: "9px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#AEB4BC", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardClient({ email, userId, fullName, accountType }: Props) {
  const router = useRouter();
  const [active,      setActive]      = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [listings,         setListings]         = useState<Listing[]>([]);
  const [savedItems,       setSavedItems]       = useState<SavedItem[]>([]);
  const [inquiries,        setInquiries]        = useState<Inquiry[]>([]);
  const [profile,          setProfile]          = useState<ProfileData | null>(null);
  const [dataLoading,      setDataLoading]       = useState(true);
  const [hasSavedTable,    setHasSavedTable]    = useState(true);
  const [hasSearchesTable, setHasSearchesTable] = useState(false);
  const [savedSearches,    setSavedSearches]    = useState<SavedSearch[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      // ── My Listings ──────────────────────────────────────────
      const listingsFilter = `seller_email.eq.${email},user_id.eq.${userId}`;
      const { data: listData, error: listErr } = await supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, status, submitted_at")
        .or(listingsFilter)
        .order("submitted_at", { ascending: false });
      if (listErr) console.error("Dashboard — property_listings query error:", listErr);
      if (!cancelled) setListings((listData as Listing[] | null) ?? []);

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

      // ── Saved Searches ────────────────────────────────────────
      const { data: searchData, error: searchErr } = await supabase
        .from("property_searches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!cancelled && !searchErr) {
        setHasSearchesTable(true);
        setSavedSearches((searchData as SavedSearch[] | null) ?? []);
      }

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

    load();
    return () => { cancelled = true; };
  }, [email, userId]);

  // Delete a listing with confirmation dialog
  const deleteListing = useCallback(async (listingId: string) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
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

  // Delete a saved search with optimistic removal
  const deleteSearch = useCallback(async (searchId: string) => {
    const prev = savedSearches;
    setSavedSearches(list => list.filter(s => s.id !== searchId));
    const supabase = createClient();
    const { error } = await supabase.from("property_searches").delete().eq("id", searchId);
    if (error) {
      console.error("Dashboard — delete search error:", error);
      setSavedSearches(prev);
    }
  }, [savedSearches]);

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const name = fullName || email.split("@")[0];
  const type = accountType || "Individual";

  const content: Record<Tab, React.ReactNode> = {
    overview:     <OverviewTab     email={email} fullName={fullName} listings={listings} savedItems={savedItems} profile={profile} />,
    listings:     <ListingsTab     listings={listings} loading={dataLoading} onDelete={deleteListing} />,
    saved:        <SavedTab        savedItems={savedItems} loading={dataLoading} onRemove={removeSave} />,
    searches:     <SearchesTab     loading={dataLoading} searches={savedSearches} onDelete={deleteSearch} />,
    profile:      <ProfileTab      email={email} userId={userId} profile={profile} loading={dataLoading} onSave={updateProfile} />,
    inquiries:    <InquiriesTab    inquiries={inquiries} loading={dataLoading} onStatusChange={updateInquiryStatus} />,
    appointments: <AppointmentsTab />,
    settings:     <SettingsTab     email={email} fullName={fullName} />,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: rgba(43,168,224,0.55) !important; box-shadow: 0 0 0 3px rgba(43,168,224,0.07) !important; }
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
      `}</style>

      <div style={{ minHeight: "100dvh", background: "#000000", display: "flex", flexDirection: "column" }}>

        {/* Mobile toggle bar */}
        <div className="mob-bar" style={{ display: "none", position: "sticky", top: "64px", zIndex: 200, padding: "10px 16px", background: "#000000", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(43,168,224,0.1)", flexShrink: 0 }}>
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
            style={{ width: "260px", flexShrink: 0, background: "#0B0D10", borderRight: "1px solid rgba(255,255,255,0.07)", height: "calc(100vh - 64px)", position: "sticky", top: "64px", display: "flex", flexDirection: "column", overflowY: "auto" }}
          >
            {/* User card */}
            <div style={{ padding: "26px 18px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(43,168,224,0.16)", border: "2px solid rgba(43,168,224,0.32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#2BA8E0", letterSpacing: "0.06em", marginBottom: "12px" }}>
                {initials(email, fullName)}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#E8EAED", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginBottom: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", background: type === "Agent" ? "rgba(43,168,224,0.15)" : "rgba(255,255,255,0.10)", color: type === "Agent" ? "#2BA8E0" : "#AEB4BC", border: `1px solid ${type === "Agent" ? "rgba(43,168,224,0.30)" : "rgba(255,255,255,0.18)"}` }}>
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
                  onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: active === item.id ? "rgba(43,168,224,0.11)" : "transparent", border: active === item.id ? "1px solid rgba(43,168,224,0.18)" : "1px solid transparent", color: active === item.id ? "#2BA8E0" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: active === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.14s" }}
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
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(239,68,68,0.14)", color: "rgba(252,165,165,0.75)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.14s" }}
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
