"use client";

import { useState } from "react";
import Link from "next/link";

export interface Listing {
  id: string;
  title: string | null;
  city: string | null;
  locality?: string | null;
  property_category: string | null;
  listing_type: string | null;
  price: number | null;
  status: string;
  submitted_at: string;
  slug: string | null;
  photo_urls?: string[] | null;
  /** Populated by the caller with a single batched query against
   *  capture_360_requests (one query for all listings, not per-row) —
   *  the status of this listing's most recent pending/scheduled request,
   *  if any. Absent/undefined means "not checked" (button still shows);
   *  explicitly 'pending' or 'scheduled' hides the Request 360° Capture
   *  button to avoid duplicate requests. */
  capture_request_status?: string | null;
}

interface Props {
  listings: Listing[];
  onDelete?: (id: string) => Promise<void>;
  compact?: boolean;
  /** Hides Delete — for viewers who don't own the listing (e.g. an assigned
   *  agent). Also hides Edit unless `canEdit` is explicitly set, preserving
   *  every existing caller's current behavior (readOnly = neither shown). */
  readOnly?: boolean;
  /** Independently controls Edit visibility. Defaults to `!readOnly`.
   *  Pass explicitly when Edit and Delete need to differ — e.g. an assigned
   *  agent can Edit their assigned listing but not Delete it directly. */
  canEdit?: boolean;
  /** Renders a "Request Deletion" action per listing when provided — the
   *  assigned-agent path to removal, since agents don't get direct Delete. */
  onRequestDeletion?: (listing: Listing) => void;
  /** Renders a "Request 360° Capture" action per listing when provided.
   *  Hidden per-listing when capture_request_status is already 'pending'
   *  or 'scheduled' — avoids duplicate requests without this component
   *  needing to query capture_360_requests itself. */
  onRequestCapture?: (listing: Listing) => void;
  /** Renders a "View Inquiries" action per listing when provided. What
   *  clicking it actually does (navigate where, filtered how) is entirely
   *  the caller's decision — this component stays presentational and
   *  doesn't import routing itself, since it's also used from contexts
   *  (the agent portal's Assigned Listings tab) with no inquiries view
   *  to send an agent to. */
  onViewInquiries?: (listing: Listing) => void;
}

const COMMERCIAL = ["office", "retail", "warehouse"];

const STATUS_COLORS: Record<string, { text: string; bg: string; label: string }> = {
  active:         { text: "#10C4C3", bg: "rgba(16,196,195,0.15)",  label: "Active"         },
  pending_review: { text: "#A9B4C2", bg: "rgba(255,255,255,0.10)", label: "Pending Review" },
  pending:        { text: "#A9B4C2", bg: "rgba(255,255,255,0.10)", label: "Pending"         },
  rejected:       { text: "#F87171", bg: "rgba(248,113,113,0.15)", label: "Rejected"        },
  inactive:       { text: "#A9B4C2", bg: "rgba(255,255,255,0.10)", label: "Inactive"        },
  sold:           { text: "#C4B5FD", bg: "rgba(139,92,246,0.15)",  label: "Sold"            },
};

function fmtPrice(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Pill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: "100px", fontSize: "11px",
      fontWeight: active ? 700 : 500, letterSpacing: "0.03em",
      background: active ? "#10C4C3" : "rgba(255,255,255,0.06)",
      color: active ? "#020C1C" : "#A9B4C2",
      border: active ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)",
      cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.14s",
    }}>
      {label}
    </button>
  );
}

export function MyListingsList({ listings, onDelete, compact = false, readOnly = false, canEdit, onRequestDeletion, onRequestCapture, onViewInquiries }: Props) {
  const showEdit = canEdit ?? !readOnly;
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  const filtered = listings.filter(l => {
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      if (!(
        l.title?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        (l.locality ?? "").toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
      )) return false;
    }
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (typeFilter !== "all") {
      if (typeFilter === "commercial") {
        if (!COMMERCIAL.includes(l.property_category ?? "")) return false;
      } else {
        if (l.property_category !== typeFilter) return false;
      }
    }
    return true;
  });

  const handleDeleteClick = async (id: string, title: string | null | undefined) => {
    if (!onDelete) return;
    if (!window.confirm(`Delete "${title ?? "this listing"}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: compact ? "32px 0" : "80px 0", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body-new)" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ opacity: 0.35, marginBottom: 16 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p style={{ fontSize: compact ? 14 : 16, margin: "0 0 12px" }}>
          {readOnly ? "No listings assigned yet." : "No listings yet."}
        </p>
        {!readOnly && (
          <Link href="/post-property" style={{ color: "#10C4C3", fontWeight: 600, fontFamily: "var(--font-body-new)", textDecoration: "none" }}>
            List your first property →
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
.mll-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1); will-change: transform; }
.mll-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.4), 0 0 0 1px rgba(16,196,195,0.18); }
@media (max-width: 640px) {
  .mll-card-inner { flex-direction: column !important; }
  .mll-thumb { width: 100% !important; min-height: 140px !important; }
  .mll-actions { flex-wrap: wrap !important; }
}
`}</style>

      {/* Search + filter pills */}
      <div style={{ marginBottom: compact ? 16 : 24 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, city, or status…"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: compact ? "9px 14px" : "11px 16px",
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(255,255,255,0.22)",
            borderRadius: 10, fontSize: 13, color: "#FFFFFF",
            fontFamily: "var(--font-body-new)", outline: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-support-new)", marginRight: 2, flexShrink: 0 }}>Status</span>
          {(["all", "active", "pending_review", "rejected"] as const).map(v => (
            <Pill key={v} active={statusFilter === v} onClick={() => setStatusFilter(v)}
              label={v === "all" ? "All" : v === "pending_review" ? "Pending Review" : v.charAt(0).toUpperCase() + v.slice(1)} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-support-new)", marginRight: 2, flexShrink: 0 }}>Type</span>
          {(["all", "apartment", "villa", "plot", "penthouse", "townhouse", "commercial"] as const).map(v => (
            <Pill key={v} active={typeFilter === v} onClick={() => setTypeFilter(v)}
              label={v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)} />
          ))}
        </div>

        {(search.trim() !== "" || statusFilter !== "all" || typeFilter !== "all") && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body-new)", margin: "10px 0 0" }}>
            Showing {filtered.length} of {listings.length} {listings.length === 1 ? "listing" : "listings"}
          </p>
        )}
      </div>

      {/* No-match state */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: compact ? "28px 16px" : "60px 24px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: compact ? 18 : 22, color: "#FFFFFF", margin: "0 0 6px" }}>
            No listings match
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body-new)", margin: 0 }}>
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Cards */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 14 }}>
          {filtered.map(l => {
            const sc         = STATUS_COLORS[l.status] ?? { text: "#A9B4C2", bg: "rgba(255,255,255,0.10)", label: l.status };
            const thumb      = l.photo_urls?.[0] ?? null;
            const isDeleting = deletingId === l.id;

            return (
              <div key={l.id} className="mll-card" style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                borderRadius: compact ? 12 : 16,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}>
                <div className="mll-card-inner" style={{ display: "flex" }}>

                  {/* Photo — non-compact only */}
                  {!compact && (
                    <div className="mll-thumb" style={{
                      width: 152, minHeight: 110, flexShrink: 0,
                      background: thumb
                        ? `url(${thumb}) center/cover no-repeat`
                        : "linear-gradient(135deg, #0A1526 0%, #000 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {!thumb && (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(16,196,195,0.35)" strokeWidth="1.5">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ flex: 1, padding: compact ? "14px 16px" : "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: compact ? 0 : 180 }}>
                      {compact ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: sc.text, background: sc.bg, borderRadius: 4, padding: "2px 6px", fontFamily: "var(--font-support-new)" }}>
                              {sc.label}
                            </span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-body-new)" }}>
                              {fmtDate(l.submitted_at)}
                            </span>
                          </div>
                          <p style={{ fontFamily: "var(--font-heading-new)", fontSize: 16, fontWeight: 600, color: "#FFFFFF", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {l.title ?? `${l.property_category ?? "Property"} in ${l.city ?? "—"}`}
                          </p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#A9B4C2" }}>
                            {l.property_category && <span style={{ textTransform: "capitalize" }}>{l.property_category}</span>}
                            {(l.locality || l.city) && <span>{[l.locality, l.city].filter(Boolean).join(", ")}</span>}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: sc.text, background: sc.bg, borderRadius: 4, padding: "2px 8px", fontFamily: "var(--font-support-new)" }}>
                              {sc.label}
                            </span>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-support-new)" }}>
                              {[l.property_category, l.listing_type].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 19, fontWeight: 600, color: "#FFFFFF", margin: "0 0 4px", lineHeight: 1.2 }}>
                            {l.title ?? "Untitled"}
                          </h3>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: "#A9B4C2", fontFamily: "var(--font-support-new)" }}>{l.city ?? "—"}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-support-new)" }}>
                              {l.price != null ? fmtPrice(l.price) : "Price on request"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body-new)", marginTop: 4 }}>
                            Listed {fmtDate(l.submitted_at)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mll-actions" style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      {compact && l.price != null && (
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-support-new)", marginRight: 4 }}>
                          {fmtPrice(l.price)}
                        </span>
                      )}
                      {l.status === "active" && l.slug && (
                        <Link href={`/properties/${l.slug}`} style={{ textDecoration: "none" }}>
                          <button style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 12 : 13, fontWeight: 500,
                            color: "#FFFFFF", background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7,
                            cursor: "pointer", fontFamily: "var(--font-body-new)",
                          }}>View</button>
                        </Link>
                      )}
                      {showEdit && (
                        <Link href={`/post-property/edit/${l.id}`} style={{ textDecoration: "none" }}>
                          <button style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 12 : 13, fontWeight: 600,
                            color: "#020C1C", background: "#10C4C3",
                            boxShadow: "0 8px 24px rgba(16,196,195,0.3)",
                            border: "none", borderRadius: 7, cursor: "pointer",
                            fontFamily: "var(--font-body-new)",
                          }}>Edit</button>
                        </Link>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => handleDeleteClick(l.id, l.title)}
                          disabled={isDeleting}
                          style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 12 : 13, fontWeight: 500,
                            color: isDeleting ? "rgba(255,255,255,0.35)" : "#F87171",
                            background: "rgba(248,113,113,0.10)",
                            border: `1px solid ${isDeleting ? "rgba(255,255,255,0.15)" : "rgba(248,113,113,0.30)"}`,
                            borderRadius: 7, cursor: isDeleting ? "not-allowed" : "pointer",
                            fontFamily: "var(--font-body-new)", transition: "border-color 0.15s, color 0.15s",
                          }}
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      )}
                      {onRequestDeletion && (
                        <button
                          onClick={() => onRequestDeletion(l)}
                          style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 12 : 13, fontWeight: 500,
                            color: "#FBBF24",
                            background: "rgba(251,191,36,0.10)",
                            border: "1px solid rgba(251,191,36,0.30)",
                            borderRadius: 7, cursor: "pointer",
                            fontFamily: "var(--font-body-new)",
                          }}
                        >
                          Request Deletion
                        </button>
                      )}
                      {onViewInquiries && (
                        <button
                          onClick={() => onViewInquiries(l)}
                          style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 12 : 13, fontWeight: 500,
                            color: "#FFFFFF",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 7, cursor: "pointer",
                            fontFamily: "var(--font-body-new)",
                          }}
                        >
                          View Inquiries
                        </button>
                      )}
                      {onRequestCapture && (
                        l.capture_request_status === "pending" ? (
                          <span style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 11 : 12, fontWeight: 600,
                            color: "#F59E0B",
                            background: "rgba(245,158,11,0.10)",
                            border: "1px solid rgba(245,158,11,0.30)",
                            borderRadius: 7,
                            fontFamily: "var(--font-body-new)",
                          }}>
                            360° Request Pending
                          </span>
                        ) : l.capture_request_status === "scheduled" ? (
                          <span style={{
                            padding: compact ? "5px 10px" : "7px 14px",
                            fontSize: compact ? 11 : 12, fontWeight: 600,
                            color: "#10C4C3",
                            background: "rgba(16,196,195,0.10)",
                            border: "1px solid rgba(16,196,195,0.30)",
                            borderRadius: 7,
                            fontFamily: "var(--font-body-new)",
                          }}>
                            360° Capture Scheduled
                          </span>
                        ) : (
                          <button
                            onClick={() => onRequestCapture(l)}
                            style={{
                              padding: compact ? "5px 10px" : "7px 14px",
                              fontSize: compact ? 12 : 13, fontWeight: 500,
                              color: "#10C4C3",
                              background: "rgba(16,196,195,0.10)",
                              border: "1px solid rgba(16,196,195,0.30)",
                              borderRadius: 7, cursor: "pointer",
                              fontFamily: "var(--font-body-new)",
                            }}
                          >
                            Request 360° Capture
                          </button>
                        )
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
