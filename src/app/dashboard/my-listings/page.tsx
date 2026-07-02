"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface Listing {
  id: string;
  title: string | null;
  city: string | null;
  property_category: string | null;
  listing_type: string | null;
  price: number | null;
  status: string;
  submitted_at: string;
  slug: string | null;
  images: string[] | null;
}

const G = { dark: "#000000", gold: "#2BA8E0", ivory: "#000000", mid: "#0B0D10" };

function fmtPrice(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const userEmail = data.session?.user?.email ?? null;
      setEmail(userEmail);
      if (!userEmail) { setLoading(false); return; }
      supabase
        .from("property_listings")
        .select("id, title, city, property_category, listing_type, price, status, submitted_at, slug, images")
        .eq("seller_email", userEmail)
        .order("submitted_at", { ascending: false })
        .then(({ data: rows }: { data: Listing[] | null }) => {
          setListings(rows ?? []);
          setLoading(false);
        });
    });
  }, []);

  const handleDelete = async (id: string, title: string | null | undefined) => {
    const label = title ?? "this listing";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").delete().eq("id", id);
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== id));
    } else {
      alert("Failed to delete. Please try again.");
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  if (!email) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>Please sign in to view your listings.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Sign In →</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <style>{`
.ml-card { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1); will-change: transform; }
.ml-card:hover { transform: translateY(-8px); box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(43,168,224,0.22); }
@media (max-width: 768px) {
  .ml-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
  .ml-card { flex-direction: column !important; }
  .ml-thumb { width: 100% !important; height: 180px !important; flex-shrink: unset !important; }
  .ml-body { padding: 12px 16px !important; }
  .ml-actions { flex-direction: row !important; flex-wrap: wrap !important; padding: 12px 16px !important; gap: 8px !important; border-top: 1px solid rgba(255,255,255,0.06) !important; }
  .ml-actions a, .ml-actions button { flex: 1 1 calc(50% - 4px) !important; justify-content: center !important; }
}
@media (max-width: 480px) {
  .ml-actions a, .ml-actions button { flex: 1 1 100% !important; }
}
`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        {/* Header */}
        <div className="ml-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 34, fontWeight: 600, color: "#E8EAED",
              margin: 0, lineHeight: 1.15,
            }}>
              My Listings
            </h1>
            <p style={{ color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              {listings.length} {listings.length === 1 ? "property" : "properties"} · {email}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 500,
                color: "#E8EAED", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                ← Dashboard
              </button>
            </Link>
            <Link href="/post-property" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#000000", background: G.gold,
                border: "none", borderRadius: 999,
                boxShadow: "0 10px 30px rgba(30,167,255,.35)",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                + New Listing
              </button>
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {listings.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif",
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ opacity: 0.35, marginBottom: 16 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p style={{ fontSize: 16, margin: "0 0 12px" }}>No listings yet.</p>
            <Link href="/post-property" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
              List your first property →
            </Link>
          </div>
        )}

        {/* Listing cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {listings.map(listing => {
            const thumb = listing.images?.[0] ?? null;
            const statusColors: Record<string, { text: string; bg: string; label: string }> = {
              active:         { text: "#2BA8E0", bg: "rgba(43,168,224,0.15)",   label: "Active"          },
              pending_review: { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)",   label: "Pending Review"  },
              pending:        { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)",   label: "Pending"         },
              rejected:       { text: "#F87171", bg: "rgba(248,113,113,0.15)",    label: "Rejected"        },
              inactive:       { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: "Inactive"        },
              sold:           { text: "#C4B5FD", bg: "rgba(139,92,246,0.15)",  label: "Sold"            },
            };
            const sc = statusColors[listing.status] ?? { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: listing.status };

            return (
              <div
                key={listing.id}
                className="ml-card"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                {/* Thumbnail */}
                <div className="ml-thumb" style={{
                  width: 152, minHeight: 110, flexShrink: 0,
                  background: thumb
                    ? `url(${thumb}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${G.mid} 0%, ${G.dark} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {!thumb && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(43,168,224,0.35)" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  )}
                </div>

                {/* Body */}
                <div className="ml-body" style={{ flex: 1, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.07em", color: sc.text, background: sc.bg,
                        borderRadius: 4, padding: "2px 8px",
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {sc.label}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif" }}>
                        {[listing.property_category, listing.listing_type].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 19, fontWeight: 600, color: "#E8EAED",
                      margin: "0 0 4px", lineHeight: 1.2,
                    }}>
                      {listing.title ?? "Untitled"}
                    </h3>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif" }}>
                        {listing.city ?? "—"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EAED", fontFamily: "'DM Sans', sans-serif" }}>
                        {listing.price != null ? fmtPrice(listing.price) : "Price on request"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                      Listed {fmtDate(listing.submitted_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {listing.status === "active" && listing.slug && (
                      <Link href={`/properties/${listing.slug}`} style={{ textDecoration: "none" }}>
                        <button style={{
                          padding: "7px 14px", fontSize: 13, fontWeight: 500,
                          color: "#E8EAED", background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 7, cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}>
                          View
                        </button>
                      </Link>
                    )}
                    <Link href={`/post-property/edit/${listing.id}`} style={{ textDecoration: "none" }}>
                      <button style={{
                        padding: "7px 14px", fontSize: 13, fontWeight: 600,
                        color: "#000000", background: G.gold,
                        boxShadow: "0 10px 30px rgba(30,167,255,.35)",
                        border: "none", borderRadius: 7, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(listing.id, listing.title ?? "this listing")}
                      disabled={deleting === listing.id}
                      style={{
                        padding: "7px 14px", fontSize: 13, fontWeight: 500,
                        color: deleting === listing.id ? "rgba(255,255,255,0.45)" : "#F87171",
                        background: "rgba(248,113,113,0.10)",
                        border: `1px solid ${deleting === listing.id ? "rgba(255,255,255,0.20)" : "rgba(248,113,113,0.30)"}`,
                        borderRadius: 7, cursor: deleting === listing.id ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "border-color 0.15s, color 0.15s",
                      }}
                    >
                      {deleting === listing.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
