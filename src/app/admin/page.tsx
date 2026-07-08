"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type AdminSection = "overview" | "pending" | "approved" | "rejected" | "users" | "inquiries";

type Stats = {
  pending: number;
  active: number;
  rejected: number;
  users: number;
  inquiries: number;
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
};

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

// ── Icons ──────────────────────────────────────────────────────────────────────

function Spinner({ size = 28, pad = 80 }: { size?: number; pad?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: pad, color: "#2BA8E0" }}>
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

// ── Shared UI ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending_review: { label: "Pending",  bg: "rgba(245,158,11,0.15)",  color: "#F59E0B", border: "rgba(245,158,11,0.3)"  },
    active:         { label: "Active",   bg: "rgba(52,211,153,0.15)",  color: "#34D399", border: "rgba(52,211,153,0.3)"  },
    rejected:       { label: "Rejected", bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.3)" },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(255,255,255,0.08)", color: "#AEB4BC", border: "rgba(255,255,255,0.12)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const isAdmin = role === "admin" || role === "super_admin";
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: isAdmin ? "rgba(43,168,224,0.15)" : "rgba(255,255,255,0.06)", color: isAdmin ? "#2BA8E0" : "#AEB4BC", border: `1px solid ${isAdmin ? "rgba(43,168,224,0.3)" : "rgba(255,255,255,0.1)"}` }}>
      {role ?? "user"}
    </span>
  );
}

function StatCard({ label, value, icon, accent, note }: {
  label: string; value: number | string;
  icon: React.ReactNode; accent?: "gold" | "green" | "red" | "blue"; note?: string;
}) {
  const map = {
    gold:  { bg: "rgba(43,168,224,0.12)",  color: "#2BA8E0" },
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
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 600, color: "#E8EAED", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#AEB4BC", marginTop: "2px" }}>{label}</div>
        {note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>{note}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 500, color: "#E8EAED", lineHeight: 1.2 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "13px", color: "#AEB4BC", marginTop: "4px" }}>{subtitle}</p>}
      </div>
      {count != null && count > 0 && (
        <span style={{ padding: "5px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: "rgba(43,168,224,0.12)", color: "#2BA8E0", border: "1px solid rgba(43,168,224,0.25)", flexShrink: 0 }}>
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
}: {
  listing: AdminListing;
  actions: React.ReactNode;
  inFlight: boolean;
}) {
  const thumb = Array.isArray(listing.photo_urls) ? listing.photo_urls[0] ?? null : null;
  const label = listing.listing_type === "sale" ? "For Sale" : listing.listing_type === "rent" ? "For Rent" : (listing.listing_type ?? "");
  const loc   = [listing.locality, listing.city].filter(Boolean).join(", ");

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", overflow: "hidden", opacity: inFlight ? 0.55 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* Thumbnail */}
        <div style={{ width: "150px", flexShrink: 0, position: "relative", background: "#0B0D10", overflow: "hidden", minHeight: "140px" }}>
          {thumb ? (
            <img src={thumb} alt={listing.title ?? "Property"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#2BA8E0", opacity: 0.3, minHeight: "140px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}
          <div style={{ position: "absolute", top: "8px", left: "8px", padding: "2px 8px", borderRadius: "100px", fontSize: "8px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: listing.listing_type === "rent" ? "rgba(52,211,153,0.85)" : "rgba(43,168,224,0.85)", color: "#000000" }}>
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
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#E8EAED", lineHeight: 1.25, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {listing.title ?? `${listing.property_category ?? "Property"} in ${listing.city ?? "—"}`}
              </h3>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#AEB4BC", flexWrap: "wrap", alignItems: "center" }}>
                {listing.property_category && <span style={{ textTransform: "capitalize" as const }}>{listing.property_category}</span>}
                {loc && (
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {loc}
                  </span>
                )}
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "15px", fontWeight: 600, color: "#E8EAED" }}>
                  {fmtPrice(listing.price, listing.listing_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Seller row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: "12px" }}>
            {listing.seller_name && (
              <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#AEB4BC", fontWeight: 500 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {listing.seller_name}
              </span>
            )}
            {listing.seller_email && (
              <a href={`mailto:${listing.seller_email}`} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#AEB4BC", textDecoration: "none" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                {listing.seller_email}
              </a>
            )}
            {listing.seller_phone && (
              <a href={`tel:${listing.seller_phone}`} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#AEB4BC", textDecoration: "none" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {listing.seller_phone}
              </a>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {listing.slug && (
              
                href={`/property/${listing.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, color: "#E8EAED", border: "1.5px solid rgba(255,255,255,0.15)", background: "transparent", textDecoration: "none", letterSpacing: "0.04em" }}
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
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 500, color: "#E8EAED", marginBottom: "18px" }}>Recent Submissions</h3>
            {recent.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No listings yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recent.map(r => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#E8EAED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 500, color: "#E8EAED", marginBottom: "18px" }}>Top Cities</h3>
            {cityBreakdown.length === 0 ? (
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No data yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {cityBreakdown.map((c, i) => {
                  const max = cityBreakdown[0].count;
                  return (
                    <div key={c.city}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "13px", color: i === 0 ? "#E8EAED" : "#AEB4BC", fontWeight: i === 0 ? 600 : 400 }}>{c.city}</span>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{c.count}</span>
                      </div>
                      <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(c.count / max) * 100}%`, background: i === 0 ? "#2BA8E0" : "rgba(43,168,224,0.35)", borderRadius: "3px" }} />
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
  listings, loading, inFlight, onApprove, onReject,
}: {
  listings: AdminListing[];
  loading: boolean;
  inFlight: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
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
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", color: "#E8EAED", marginBottom: "8px" }}>All clear</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>No listings pending review.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              inFlight={inFlight === l.id}
              actions={
                <>
                  <button
                    onClick={() => onApprove(l.id)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "#2BA8E0", color: "#000000", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
                  >
                    <IconApprove /> Approve
                  </button>
                  <button
                    onClick={() => onReject(l.id)}
                    disabled={inFlight === l.id}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1.5px solid rgba(248,113,113,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
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
  listings, loading, inFlight, onUnpublish,
}: {
  listings: AdminListing[];
  loading: boolean;
  inFlight: string | null;
  onUnpublish: (id: string) => void;
}) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="Approved Listings" subtitle="Currently live on the platform." count={listings.length} />
      {listings.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED" }}>No active listings</p>
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
                  onClick={() => {
                    if (window.confirm("Unpublish this listing? It will return to pending review.")) onUnpublish(l.id);
                  }}
                  disabled={inFlight === l.id}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1.5px solid rgba(245,158,11,0.3)", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
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
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED" }}>No rejected listings</p>
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
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "7px", fontSize: "11px", fontWeight: 700, background: "#2BA8E0", color: "#000000", border: "none", cursor: inFlight === l.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: inFlight === l.id ? 0.6 : 1 }}
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

function UserDetailModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9CA3AF", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#374151" }}>{value ?? "—"}</div>
    </div>
  );

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
        style={{ background: "#fff", borderRadius: "20px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 12px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", padding: "28px 30px", animation: "fadeSlide 0.18s ease-out", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "17px", fontWeight: 700, color: "#2BA8E0" }}>
              {(user.full_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 600, color: "#000000", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.full_name ?? "—"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                <RoleBadge role={user.role} />
                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: user.is_verified ? "rgba(45,106,79,0.1)" : "rgba(107,114,128,0.1)", color: user.is_verified ? "#065F46" : "#374151", border: `1px solid ${user.is_verified ? "rgba(45,106,79,0.3)" : "rgba(107,114,128,0.2)"}` }}>
                  {user.is_verified ? "Verified" : "Unverified"}
                </span>
                {user.is_active === false && (
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
          <button
            onClick={onClose}
            aria-label="Close user details"
            style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151", flexShrink: 0 }}
          >
            <IconX />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.07)" }}>
          {field("Email", user.email ? <a href={`mailto:${user.email}`} style={{ color: "#374151" }}>{user.email}</a> : null)}
          {field("Phone", user.phone)}
          {field("WhatsApp", user.whatsapp)}
          {field("City", user.city)}
          {field("Nationality", user.nationality)}
          {field("Joined", fmtDate(user.created_at))}
          {field("Role", user.role ?? "buyer")}
        </div>

        {user.bio && (
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
  users, loading, onRoleChange,
}: {
  users: UserRow[];
  loading: boolean;
  onRoleChange: (userId: string, newRole: string) => void;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort,       setSort]       = useState<UserSort>("newest");
  const [selected,   setSelected]   = useState<UserRow | null>(null);

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
            style={{ flex: "1 1 240px", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "13px", color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", outlineColor: "#2BA8E0" }}
          />
          <div style={{ position: "relative", flexShrink: 0 }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as UserSort)}
              aria-label="Sort users"
              style={{ padding: "10px 30px 10px 12px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "12px", color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", outlineColor: "#2BA8E0", appearance: "none", cursor: "pointer" }}
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
                style={{ padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: on ? 700 : 500, letterSpacing: "0.03em", background: on ? "#2BA8E0" : "rgba(255,255,255,0.06)", color: on ? "#000000" : "#AEB4BC", border: on ? "1.5px solid #2BA8E0" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize" as const, transition: "all 0.14s" }}
              >
                {r === "all" ? "All" : r.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
        {filtersActive && (
          <div style={{ fontSize: "12px", color: "#AEB4BC" }}>
            {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {users.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED" }}>No users found</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED", marginBottom: "6px" }}>No users match</p>
          <p style={{ fontSize: "13px", color: "#AEB4BC" }}>Try adjusting the search or role filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(u => (
            <div
              key={u.id}
              onClick={() => setSelected(u)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(u); } }}
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", cursor: "pointer" }}
            >
              {/* Avatar */}
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(43,168,224,0.12)", border: "1.5px solid rgba(43,168,224,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", fontWeight: 700, color: "#2BA8E0", fontFamily: "'DM Sans', sans-serif" }}>
                {(u.full_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#E8EAED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  style={{ padding: "6px 28px 6px 10px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "7px", fontSize: "12px", color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", outline: "none", appearance: "none", cursor: "pointer" }}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r} style={{ background: "#0B0D10", color: "#E8EAED" }}>{r}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.45)", fontSize: 9 }}>▼</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Section: All Inquiries ─────────────────────────────────────────────────────

function InquiriesSection({ inquiries, loading }: { inquiries: InquiryRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  return (
    <div>
      <SectionHeading title="All Inquiries" subtitle="Platform-wide buyer inquiries." count={inquiries.length} />
      {inquiries.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#E8EAED" }}>No inquiries yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {inquiries.map(inq => (
            <div key={inq.id} style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", padding: "18px 22px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 600, color: "#E8EAED" }}>
                    {inq.inquirer_name ?? "Anonymous"}
                  </span>
                  {inq.inquiry_type && (
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.1)" : "rgba(43,168,224,0.12)", color: inq.inquiry_type === "viewing" ? "#34D399" : "#2BA8E0", border: `1px solid ${inq.inquiry_type === "viewing" ? "rgba(52,211,153,0.25)" : "rgba(43,168,224,0.3)"}` }}>
                      {inq.inquiry_type}
                    </span>
                  )}
                  {inq.status && (
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.07)", color: "#AEB4BC", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {inq.status}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{fmtDate(inq.created_at)}</span>
              </div>
              {/* Property */}
              {inq.property_title && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "12px", color: "#AEB4BC" }}>
                  <IconBuilding />
                  {inq.property_slug
                    ? <a href={`/property/${inq.property_slug}`} style={{ color: "#E8EAED", fontWeight: 500, textDecoration: "none" }}>{inq.property_title}</a>
                    : <span style={{ color: "#E8EAED", fontWeight: 500 }}>{inq.property_title}</span>
                  }
                  {inq.seller_email && <span style={{ color: "rgba(255,255,255,0.45)" }}>→ {inq.seller_email}</span>}
                </div>
              )}
              {/* Contact */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: inq.message ? "10px" : 0, fontSize: "12px" }}>
                {inq.inquirer_phone && <a href={`tel:${inq.inquirer_phone}`} style={{ color: "#AEB4BC", textDecoration: "none" }}>{inq.inquirer_phone}</a>}
                {inq.inquirer_email && <a href={`mailto:${inq.inquirer_email}`} style={{ color: "#AEB4BC", textDecoration: "none" }}>{inq.inquirer_email}</a>}
              </div>
              {/* Message */}
              {inq.message && (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#AEB4BC", lineHeight: 1.6, borderLeft: "3px solid rgba(43,168,224,0.4)" }}>
                  {inq.message}
                </div>
              )}
            </div>
          ))}
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
  { id: "users",      label: "All Users",          icon: <IconUsers /> },
  { id: "inquiries",  label: "All Inquiries",      icon: <IconMsg /> },
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

  const [stats,        setStats]        = useState<Stats>({ pending: 0, active: 0, rejected: 0, users: 0, inquiries: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [pendingListings,  setPendingListings]  = useState<AdminListing[]>([]);
  const [approvedListings, setApprovedListings] = useState<AdminListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<AdminListing[]>([]);
  const [users,            setUsers]            = useState<UserRow[]>([]);
  const [inquiries,        setInquiries]        = useState<InquiryRow[]>([]);

  const [pendingLoading,  setPendingLoading]  = useState(false);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [usersLoading,    setUsersLoading]    = useState(false);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

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
      ] = await Promise.all([
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("inquiries").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        pending:   pending   ?? 0,
        active:    active    ?? 0,
        rejected:  rejected  ?? 0,
        users:     users     ?? 0,
        inquiries: inquiries ?? 0,
      });
      setStatsLoading(false);
    }
    void loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || loaded.current.has(active)) return;
    loaded.current.add(active);
    const supabase = createClient();

    if (active === "pending") {
      setPendingLoading(true);
      supabase
        .from("property_listings")
        .select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status")
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
        .select("id, slug, title, property_category, listing_type, city, locality, price, photo_urls, seller_name, seller_email, seller_phone, submitted_at, status")
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
        .select("id, full_name, city, role, phone, email, created_at, is_verified, is_active, is_nri, whatsapp, nationality, bio")
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
    }
  }, [active, isAdmin]);

  const handleListingStatus = useCallback(async (
    id: string,
    newStatus: "active" | "rejected" | "pending_review",
    fromSection: "pending" | "approved" | "rejected",
  ) => {
    setInFlight(id);
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").update({ status: newStatus }).eq("id", id);

    if (error) {
      console.error("Admin — listing status error:", error);
      setToast({ ok: false, msg: "Update failed — please try again." });
    } else {
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
  }, []);

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
      setToast({ ok: true, msg: `Role updated to ${newRole}.` });
      setTimeout(() => setToast(null), 2500);
    }
  }, [users]);

  if (authChecking) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "#2BA8E0" }}><IconShield /></div>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", color: "#E8EAED", letterSpacing: "0.08em" }}>Verifying access…</span>
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
      />
    );
  } else if (active === "approved") {
    content = (
      <ApprovedSection
        listings={approvedListings}
        loading={approvedLoading}
        inFlight={inFlight}
        onUnpublish={id => void handleListingStatus(id, "pending_review", "approved")}
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
  } else if (active === "users") {
    content = (
      <UsersSection
        users={users}
        loading={usersLoading}
        onRoleChange={(uid, role) => void handleUserRole(uid, role)}
      />
    );
  } else {
    content = <InquiriesSection inquiries={inquiries} loading={inquiriesLoading} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .admin-sb-btn:hover { color: #E8EAED !important; background: rgba(255,255,255,0.06) !important; }
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
        <div style={{ position: "fixed", top: "88px", right: "24px", zIndex: 999, padding: "12px 20px", borderRadius: "10px", background: toast.ok ? "rgba(43,168,224,0.9)" : "rgba(248,113,113,0.9)", color: "#000000", fontSize: "13px", fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "8px", animation: "toastIn 0.2s ease-out", backdropFilter: "blur(12px)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <div style={{ minHeight: "100dvh", background: "#000000", display: "flex", flexDirection: "column" }}>

        {/* Mobile toggle bar */}
        <div className="admin-mob-bar" style={{ display: "none", position: "sticky", top: "64px", zIndex: 200, padding: "10px 16px", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ display: "flex", width: "34px", height: "34px", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "7px", cursor: "pointer", color: "#E8EAED" }}
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
                <div style={{ color: "#2BA8E0" }}><IconShield /></div>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 500, color: "#E8EAED", letterSpacing: "0.04em" }}>Admin Panel</span>
              </div>
              <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: "100px", fontSize: "8px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, background: "rgba(43,168,224,0.12)", color: "#2BA8E0", border: "1px solid rgba(43,168,224,0.25)" }}>Nilay 360</span>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              {NAV.map(item => {
                const badge =
                  item.id === "pending"  ? stats.pending  :
                  item.id === "approved" ? stats.active   :
                  item.id === "rejected" ? stats.rejected : 0;
                return (
                  <button
                    key={item.id}
                    className="admin-sb-btn"
                    onClick={() => { setActive(item.id); setSidebarOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "11px", padding: "10px 14px", borderRadius: "9px", marginBottom: "3px", background: active === item.id ? "rgba(43,168,224,0.1)" : "transparent", border: active === item.id ? "1px solid rgba(43,168,224,0.2)" : "1px solid transparent", color: active === item.id ? "#2BA8E0" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: active === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" as const, transition: "all 0.14s" }}
                  >
                    {item.icon}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badge > 0 && (
                      <span style={{ padding: "1px 7px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, background: active === item.id ? "rgba(43,168,224,0.2)" : "rgba(43,168,224,0.08)", color: "#2BA8E0", border: "1px solid rgba(43,168,224,0.2)" }}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer links */}
            <div style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: "4px" }}>
              
                href="/dashboard"
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderRadius: "8px", fontSize: "12px", color: "rgba(255,255,255,0.4)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}
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