"use client";
import { useCompare, COMPARE_MAX } from "@/context/CompareContext";

const G = { dark: "#000000", gold: "#2BA8E0" };

// Floating bottom bar showing properties staged for comparison.
// Hidden when nothing is selected. Mounted globally in the root layout.
export default function CompareBar() {
  const { items, count, remove, clear } = useCompare();
  if (count === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 250, background: G.dark, borderTop: "1px solid rgba(201,168,76,0.3)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.6)", whiteSpace: "nowrap" }}>
          Comparing <strong style={{ color: G.gold }}>{count}</strong> / {COMPARE_MAX}
        </span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {items.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px 5px 5px", background: "rgba(245,242,236,0.06)", borderRadius: "8px", border: "1px solid rgba(245,242,236,0.12)" }}>
              <img src={p.image || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=80&q=80`} alt="" style={{ width: "30px", height: "30px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#000000", maxWidth: "140px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
              <span onClick={() => remove(p.id)} role="button" aria-label="Remove from comparison" style={{ color: "rgba(245,242,236,0.45)", cursor: "pointer", fontSize: "15px", fontWeight: 700, lineHeight: 1, padding: "0 2px" }}>×</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={clear} style={{ padding: "9px 16px", background: "transparent", border: "1px solid rgba(245,242,236,0.2)", borderRadius: "8px", color: "rgba(245,242,236,0.6)", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear all</button>
        <a href="/compare" style={{ padding: "9px 22px", background: G.gold, border: "none", borderRadius: "8px", color: G.dark, fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
          Compare ({count}) →
        </a>
      </div>
    </div>
  );
}
