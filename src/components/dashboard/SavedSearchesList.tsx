"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface SavedSearch {
  id: string;
  name: string | null;
  filters: Record<string, unknown>;
  alert_email: boolean;
  created_at: string;
}

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

const BUDGET_PRESETS: Record<string, [number, number]> = {
  "Under 50L": [0,          5_000_000],
  "50L – 1Cr": [5_000_000,  10_000_000],
  "1 – 2 Cr":  [10_000_000, 20_000_000],
  "2 – 5 Cr":  [20_000_000, 50_000_000],
  "5 Cr+":     [50_000_000, 999_999_999],
};

function buildSearchUrl(f: Record<string, unknown>, name: string | null): string {
  const p = new URLSearchParams();
  if (typeof f.city === "string" && f.city !== "all") p.set("city", f.city);
  if (typeof f.listingType === "string" && f.listingType !== "all") p.set("listing", f.listingType);
  const types = Array.isArray(f.propTypes) ? (f.propTypes as string[]) : [];
  if (types.length === 1) p.set("type", types[0]);
  const beds = Array.isArray(f.bhk) ? (f.bhk as number[]) : [];
  if (beds.length === 1) p.set("beds", String(beds[0]));
  const mn = typeof f.minPrice === "string" && f.minPrice ? Number(f.minPrice) : 0;
  const mx = typeof f.maxPrice === "string" && f.maxPrice ? Number(f.maxPrice) : 0;
  for (const [label, [pMn, pMx]] of Object.entries(BUDGET_PRESETS)) {
    if (pMn === mn && pMx === mx) { p.set("budget", label); break; }
  }
  if (name) p.set("q", name);
  return `/search${p.toString() ? "?" + p.toString() : ""}`;
}

export function SavedSearchesList() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [isAuthed, setIsAuthed] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const userId = data.session?.user?.id ?? null;
      if (!userId) { setIsAuthed(false); setLoading(false); return; }
      supabase
        .from("saved_searches")
        .select("id, name, filters, alert_email, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data: rows, error }: { data: SavedSearch[] | null; error: unknown }) => {
          if (error) console.error("SavedSearchesList query error:", error);
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
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <span style={{ color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p style={{ color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", fontSize: 15, margin: "0 0 12px" }}>
          Please sign in to view your saved searches.
        </p>
        <Link href="/login" style={{ color: "#10C4C3", fontWeight: 600, fontFamily: "'Cal Sans', sans-serif", textDecoration: "none" }}>
          Sign In →
        </Link>
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "72px 32px",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.25)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18, color: "#10C4C3",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: 24, fontWeight: 500, color: "#FFFFFF", margin: "0 0 10px" }}>
          No saved searches yet
        </h2>
        <p style={{ fontSize: 13.5, color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", margin: "0 auto 26px", maxWidth: 360, lineHeight: 1.65 }}>
          Search for properties, apply filters, then click "Save this search" to get email alerts when matching listings go live.
        </p>
        <Link href="/search" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "11px 28px", borderRadius: 999, fontSize: 13, fontWeight: 600,
            color: "#020C1C", background: "#10C4C3",
            boxShadow: "0 10px 30px rgba(16,196,195,0.35)", border: "none", cursor: "pointer",
            fontFamily: "'Cal Sans', sans-serif",
          }}>Browse & Save a Search</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {searches.map(s => {
        const summary = buildSearchSummary(s.filters ?? {});
        const url     = buildSearchUrl(s.filters ?? {}, s.name);
        return (
          <div key={s.id} style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
            padding: "20px 24px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
            flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.name ?? "Saved Search"}
              </p>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", lineHeight: 1.5 }}>
                {summary}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Cal Sans', sans-serif" }}>
                Saved {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              <button
                onClick={() => toggleAlert(s.id, s.alert_email)}
                title={s.alert_email ? "Alerts on — click to mute" : "Alerts off — click to enable"}
                style={{
                  padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                  background: s.alert_email ? "rgba(16,196,195,0.15)" : "rgba(255,255,255,0.06)",
                  color: s.alert_email ? "#10C4C3" : "#A9B4C2",
                  border: s.alert_email ? "1px solid rgba(16,196,195,0.35)" : "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", transition: "all 0.14s",
                }}
              >
                {s.alert_email ? "🔔 Alerts On" : "🔕 Muted"}
              </button>

              <Link href={url} style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500,
                  background: "rgba(255,255,255,0.06)", color: "#A9B4C2",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer", fontFamily: "'Cal Sans', sans-serif",
                }}>Search →</button>
              </Link>

              <button
                onClick={() => handleDelete(s.id)}
                disabled={deleting === s.id}
                style={{
                  padding: "6px 10px", borderRadius: 100, fontSize: 11,
                  background: "rgba(248,113,113,0.08)",
                  color: deleting === s.id ? "rgba(248,113,113,0.4)" : "#F87171",
                  border: "1px solid rgba(248,113,113,0.2)",
                  cursor: deleting === s.id ? "not-allowed" : "pointer",
                  fontFamily: "'Cal Sans', sans-serif",
                }}
              >
                {deleting === s.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
