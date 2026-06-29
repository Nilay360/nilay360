"use client";

import Link from "next/link";

const G = { dark: "#000000", gold: "#2BA8E0", ivory: "#000000", mid: "#0B0D10" };

export default function SearchesPage() {
  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <style>{`
@media (max-width: 768px) {
  .sr-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
  .sr-card { padding: 32px 16px !important; margin: 0 16px !important; }
}
`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        <div className="sr-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 600, color: G.dark, margin: 0, lineHeight: 1.15 }}>
              Recent Searches
            </h1>
            <p style={{ color: "rgba(13,43,31,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              Save searches to get alerts on new matching properties.
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

        <div className="sr-card" style={{
          background: "#ffffff", borderRadius: 14,
          border: "1px solid rgba(13,43,31,0.07)",
          boxShadow: "0 2px 12px rgba(13,43,31,0.04)",
          padding: "72px 32px", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(201,168,76,0.08)",
            border: "1px solid rgba(201,168,76,0.2)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18, color: G.gold,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 24, fontWeight: 500, color: G.dark,
            margin: "0 0 10px",
          }}>
            Recent Searches coming soon
          </h2>
          <p style={{
            fontSize: 13.5, color: "rgba(13,43,31,0.55)",
            fontFamily: "'DM Sans', sans-serif",
            margin: "0 auto 26px", maxWidth: 360, lineHeight: 1.65,
          }}>
            Soon you'll be able to save searches and receive instant alerts when new
            properties match your criteria.
          </p>
          <Link href="/properties" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "11px 28px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, letterSpacing: "0.05em",
              color: G.ivory, background: G.dark,
              border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Browse Properties
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}
