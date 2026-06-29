"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface SaveRow {
  id: string;
  property_id: string | null;
  created_at: string;
}

interface PropertyDetail {
  id: string;
  slug: string | null;
  title: string | null;
  type: string | null;
  listing_type: string | null;
  price: number | null;
  city: string | null;
  neighbourhood: string | null;
  bedrooms: number | null;
  images: string[] | null;
}

interface SavedItem extends SaveRow {
  detail: PropertyDetail | null;
}

const G = { dark: "#000000", gold: "#2BA8E0", ivory: "#000000", mid: "#0B0D10" };

function fmtPrice(price: number | null, listingType?: string | null): string {
  if (price == null) return "—";
  if (listingType === "rent") {
    if (price >= 100_000) return `₹${(price / 100_000).toFixed(1)}L/mo`;
    return `₹${(price / 1_000).toFixed(0)}K/mo`;
  }
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `₹${(price / 100_000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedPropertiesPage() {
  const [items, setItems]     = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);

        if (!uid) { setLoading(false); return; }

        const { data: saves, error: savesErr } = await supabase
          .from("saved_properties")
          .select("id, property_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });

        if (savesErr) {
          console.error("Saved page — saved_properties query error:", savesErr);
          if (!cancelled) { setItems([]); setLoading(false); }
          return;
        }

        const rows = (saves as SaveRow[] | null) ?? [];
        const ids  = rows.map(r => r.property_id).filter((v): v is string => v !== null);

        const propMap: Record<string, PropertyDetail> = {};
        if (ids.length > 0) {
          const { data: props, error: propsErr } = await supabase
            .from("properties")
            .select("id, slug, title, type, listing_type, price, city, neighbourhood, bedrooms, images")
            .in("id", ids);
          if (propsErr) {
            console.error("Saved page — properties join error:", propsErr);
          } else if (props) {
            (props as PropertyDetail[]).forEach(p => { propMap[p.id] = p; });
          }
        }

        if (!cancelled) {
          setItems(rows.map(s => ({ ...s, detail: s.property_id ? (propMap[s.property_id] ?? null) : null })));
          setLoading(false);
        }
      } catch (e) {
        console.error("Saved page — fatal load error:", e);
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) {
        setUserId(null);
        setItems([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const handleUnsave = async (saveId: string) => {
    setRemoving(saveId);
    const supabase = createClient();
    const { error } = await supabase.from("saved_properties").delete().eq("id", saveId);
    if (error) {
      console.error("Unsave error:", error);
      alert("Could not remove. Please try again.");
    } else {
      setItems(prev => prev.filter(i => i.id !== saveId));
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: G.dark, fontFamily: "'DM Sans', sans-serif", fontSize: 14, opacity: 0.5 }}>Loading saved properties…</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: G.dark, fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>Please sign in to view your saved properties.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Sign In →</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <style>{`
@media (max-width: 768px) {
  .sv-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
  .sv-card { flex-direction: column !important; }
  .sv-thumb { width: 100% !important; height: 180px !important; flex-shrink: unset !important; }
  .sv-body { padding: 12px 16px !important; }
  .sv-actions { flex-direction: row !important; flex-wrap: wrap !important; padding: 12px 16px !important; gap: 8px !important; border-top: 1px solid rgba(255,255,255,0.06) !important; }
  .sv-actions a, .sv-actions button { flex: 1 1 calc(50% - 4px) !important; justify-content: center !important; }
}
@media (max-width: 480px) {
  .sv-actions a, .sv-actions button { flex: 1 1 100% !important; }
}
`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        <div className="sv-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 600, color: G.dark, margin: 0, lineHeight: 1.15 }}>
              Saved Properties
            </h1>
            <p style={{ color: "rgba(13,43,31,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              {items.length} {items.length === 1 ? "property" : "properties"} saved
            </p>
          </div>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              color: G.dark, background: "transparent",
              border: "1px solid rgba(13,43,31,0.2)", borderRadius: 8,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>
              ← Dashboard
            </button>
          </Link>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(13,43,31,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.35, marginBottom: 16 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <p style={{ fontSize: 16, margin: "0 0 12px" }}>No saved properties yet.</p>
            <Link href="/properties" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
              Browse properties →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map(item => {
              const d = item.detail;
              const thumb = d?.images?.[0] ?? null;

              return (
                <div key={item.id} className="sv-card" style={{
                  background: "#ffffff", borderRadius: 12,
                  border: "1px solid rgba(13,43,31,0.09)",
                  boxShadow: "0 2px 12px rgba(13,43,31,0.05)",
                  overflow: "hidden", display: "flex",
                }}>
                  <div className="sv-thumb" style={{
                    width: 152, minHeight: 110, flexShrink: 0,
                    background: thumb ? `url(${thumb}) center/cover no-repeat`
                                      : `linear-gradient(135deg, ${G.mid} 0%, ${G.dark} 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!thumb && (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    )}
                  </div>

                  <div className="sv-body" style={{ flex: 1, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    {d ? (
                      <>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              color: d.listing_type === "rent" ? "#065F46" : "#92400E",
                              background: d.listing_type === "rent" ? "rgba(16,185,129,0.1)" : "rgba(201,168,76,0.12)",
                              borderRadius: 4, padding: "2px 8px",
                              fontFamily: "'DM Sans', sans-serif",
                            }}>
                              {d.listing_type === "rent" ? "For Rent" : "For Sale"}
                            </span>
                            {d.type && (
                              <span style={{ fontSize: 12, color: "rgba(13,43,31,0.5)", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize" }}>
                                {d.type}
                              </span>
                            )}
                          </div>
                          <h3 style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontSize: 19, fontWeight: 600, color: G.dark,
                            margin: "0 0 4px", lineHeight: 1.2,
                          }}>
                            {d.title ?? "Untitled property"}
                          </h3>
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: "rgba(13,43,31,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                              {[d.neighbourhood, d.city].filter(Boolean).join(", ") || "—"}
                            </span>
                            {d.bedrooms != null && (
                              <span style={{ fontSize: 13, color: "rgba(13,43,31,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                                {d.bedrooms} BHK
                              </span>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 600, color: G.dark, fontFamily: "'DM Sans', sans-serif" }}>
                              {fmtPrice(d.price, d.listing_type)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(13,43,31,0.35)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                            Saved {fmtDate(item.created_at)}
                          </div>
                        </div>

                        <div className="sv-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          {d.slug && (
                            <Link href={`/properties/${d.slug}`} style={{ textDecoration: "none" }}>
                              <button style={{
                                padding: "7px 14px", fontSize: 13, fontWeight: 500,
                                color: "#ffffff", background: G.dark,
                                border: "none", borderRadius: 7, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif",
                              }}>
                                View
                              </button>
                            </Link>
                          )}
                          <button
                            onClick={() => handleUnsave(item.id)}
                            disabled={removing === item.id}
                            style={{
                              padding: "7px 14px", fontSize: 13, fontWeight: 500,
                              color: removing === item.id ? "#aaa" : "#e05555",
                              background: "transparent",
                              border: `1px solid ${removing === item.id ? "rgba(170,170,170,0.3)" : "rgba(224,85,85,0.25)"}`,
                              borderRadius: 7, cursor: removing === item.id ? "not-allowed" : "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {removing === item.id ? "…" : "Unsave"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: 13, color: "rgba(13,43,31,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                            Property no longer available
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(13,43,31,0.4)", fontFamily: "monospace", marginTop: 4 }}>
                            ID: {item.property_id ?? "—"}
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(13,43,31,0.35)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                            Saved {fmtDate(item.created_at)}
                          </div>
                        </div>
                        <div className="sv-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => handleUnsave(item.id)}
                            disabled={removing === item.id}
                            style={{
                              padding: "7px 14px", fontSize: 13, fontWeight: 500,
                              color: removing === item.id ? "#aaa" : "#e05555",
                              background: "transparent",
                              border: `1px solid ${removing === item.id ? "rgba(170,170,170,0.3)" : "rgba(224,85,85,0.25)"}`,
                              borderRadius: 7, cursor: removing === item.id ? "not-allowed" : "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {removing === item.id ? "…" : "Remove"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
