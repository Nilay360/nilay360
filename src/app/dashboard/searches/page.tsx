"use client";

import Link from "next/link";
import { SavedSearchesList } from "@/components/dashboard/SavedSearchesList";

export default function SearchesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#020C1C", paddingTop: 64 }}>
      <style>{`
@media (max-width: 768px) {
  .sr-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
}
`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        <div className="sr-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: 34, fontWeight: 600, color: "#FFFFFF", margin: 0, lineHeight: 1.15 }}>
              Saved Searches
            </h1>
            <p style={{ color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              Save searches to get email alerts on new matching properties.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 500,
                color: "#FFFFFF", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                cursor: "pointer", fontFamily: "'Cal Sans', sans-serif",
              }}>← Dashboard</button>
            </Link>
            <Link href="/search" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#020C1C", background: "#10C4C3",
                border: "none", borderRadius: 999,
                boxShadow: "0 10px 30px rgba(16,196,195,0.35)",
                cursor: "pointer", fontFamily: "'Cal Sans', sans-serif",
              }}>+ New Search</button>
            </Link>
          </div>
        </div>

        <SavedSearchesList />

      </div>
    </div>
  );
}
