"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

const G = { ivory: "#000000", gold: "#2BA8E0" };

interface SavedSearch {
  id: string;
  name: string | null;
  filters: Record<string, unknown>;
  alert_email: boolean;
  created_at: string;
}

function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (filters.city && filters.city !== "all") parts.push(String(filters.city));
  if (filters.listingType && filters.listingType !== "all") parts.push(filters.listingType === "sale" ? "For Sale" : "For Rent");
  const propTypes = filters.propTypes as string[] | undefined;
  if (propTypes && propTypes.length > 0) parts.push(propTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", "));
  const bhk = filters.bhk as number[] | undefined;
  if (bhk && bhk.length > 0) parts.push(bhk.map(b => `${b}${b === 5 ? "+" : ""} BHK`).join(", "));
  if (filters.minPrice || filters.maxPrice) {
    const lo = filters.minPrice ? `₹${(Number(filters.minPrice) / 1e7).toFixed(1)}Cr` : "Any";
    const hi = filters.maxPrice ? `₹${(Number(filters.maxPrice) / 1e7).toFixed(1)}Cr` : "Any";
    parts.push(`${lo} – ${hi}`);
  }
  if (filters.furnished === true)  parts.push("Furnished");
  if (filters.furnished === false) parts.push("Unfurnished");
  if (filters.newConstruction) parts.push("New Construction");
  if (filters.reraApproved)    parts.push("RERA Approved");
  return parts.length > 0 ? parts.join(" · ") : "All properties";
}

export default function SearchesPage() {
  const [searches,  setSearches]  = useState<SavedSearch[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [email,     setEmail]     = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const userEmail = data.session?.user?.email ?? null;
      const userId    = data.session?.user?.id    ?? null;
      setEmail(userEmail);
      if (!userId) { setLoading(false); return; }
      supabase
        .from("saved_searches")
        .select("id, name, filters, alert_email, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data: rows }: { data: SavedSearch[] | null }) => {
          setSearches(rows ?? []);
          setLoading(false);
        });
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this saved search and stop alerts for it?")) return;
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (!error) setSearches(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  };

  const toggleAlert = async (id: string, current: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("saved_searches")
      .update({ alert_email: !current })
      .eq("id", id);
    if (!error) setSearches(prev => prev.map(s => s.id === id ? { ...s, alert_email: !current } : s));
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
        <p style={{ color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>Please sign in to view your saved searches.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Sign In →</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <style>{`
@media (max-width: 768px) {
  .sr-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
  .sr-card { padding: 16px !important; }
}
`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        {/* Header */}
        <div className="sr-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 600, color: "#E8EAED", margin: 0, lineHeight: 1.15 }}>
              Saved Searches
            </h1>
            <p style={{ color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              {searches.length} saved {searches.length === 1 ? "search" : "searches"} · email alerts when new listings match
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 500,
                color: "#E8EAED", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>← Dashboard</button>
            </Link>
            <Link href="/search" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#000000", background: G.gold,
                border: "none", borderRadius: 999,
                boxShadow: "0 10px 30px rgba(43,168,224,0.35)",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>+ New Search</button>
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {searches.length === 0 && (
          <div style={{
            textAlign: "center", padding: "72px 32px",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(43,168,224,0.12)", border: "1px solid rgba(43,168,224,0.25)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 18, color: G.gold,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 500, color: "#E8EAED", margin: "0 0 10px" }}>
              No saved searches yet
            </h2>
            <p style={{ fontSize: 13.5, color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif", margin: "0 auto 26px", maxWidth: 360, lineHeight: 1.65 }}>
              Search for properties, apply filters, then click "Save this search" to get email alerts when matching listings go live.
            </p>
            <Link href="/search" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "11px 28px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                color: "#000000", background: G.gold,
                boxShadow: "0 10px 30px rgba(43,168,224,0.35)", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>Browse & Save a Search</button>
            </Link>
          </div>
        )}

        {/* Search cards */}
        {searches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {searches.map(s => (
              <div key={s.id} className="sr-card" style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
                padding: "20px 24px",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name ?? "Saved Search"}
                  </p>
                  <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#AEB4BC", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                    {filterSummary(s.filters)}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
                    Saved {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Alert toggle */}
                  <button
                    onClick={() => toggleAlert(s.id, s.alert_email)}
                    title={s.alert_email ? "Alerts on — click to mute" : "Alerts off — click to enable"}
                    style={{
                      padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                      background: s.alert_email ? "rgba(43,168,224,0.15)" : "rgba(255,255,255,0.06)",
                      color: s.alert_email ? "#2BA8E0" : "#AEB4BC",
                      border: s.alert_email ? "1px solid rgba(43,168,224,0.35)" : "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.14s",
                    }}
                  >
                    {s.alert_email ? "🔔 Alerts On" : "🔕 Muted"}
                  </button>

                  {/* View results */}
                  <Link
                    href={`/search?city=${encodeURIComponent(String(s.filters.city ?? "all"))}&listingType=${encodeURIComponent(String(s.filters.listingType ?? "all"))}`}
                    style={{ textDecoration: "none" }}
                  >
                    <button style={{
                      padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500,
                      background: "rgba(255,255,255,0.06)", color: "#AEB4BC",
                      border: "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Search →
                    </button>
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    style={{
                      padding: "6px 10px", borderRadius: 100, fontSize: 11,
                      background: "rgba(248,113,113,0.08)", color: deleting === s.id ? "rgba(248,113,113,0.4)" : "#F87171",
                      border: "1px solid rgba(248,113,113,0.2)",
                      cursor: deleting === s.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {deleting === s.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
