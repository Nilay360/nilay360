"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompare, type CompareItem } from "@/context/CompareContext";
import { optimizedImageUrl } from "@/lib/image-url";

// ── Types ─────────────────────────────────────────────────────
type Property = {
  id: string;
  slug: string;
  title: string;
  price: number;
  listing_type: "sale" | "rent";
  property_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  floor_number: number | null;
  total_floors: number | null;
  parking_spaces: number | null;
  year_built: number | null;
  is_furnished: boolean | null;
  amenities: string[];
  address: string | null;
  images: string[];
  city?: string;
  neighbourhood?: string;
  featured_image?: string | null;
};

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count.
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"];

// ── Helpers ───────────────────────────────────────────────────
function fmtINR(val: number | null, compact = false): string {
  if (val === null || val === undefined) return "—";
  if (compact) {
    if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)} Cr`;
    if (val >= 1_00_000)    return `₹${(val / 1_00_000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }
  return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function calcEMI(price: number): number {
  const p = price * 0.8; // 20% down
  const r = 8.5 / 100 / 12;
  const n = 20 * 12;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcTotalInterest(price: number): number {
  const p = price * 0.8;
  const emi = calcEMI(price);
  return emi * 20 * 12 - p;
}

function pricePerSqft(p: Property): number | null {
  if (!p.area_sqft || !p.price) return null;
  return Math.round(p.price / p.area_sqft);
}

// ── Tick / Cross icons ────────────────────────────────────────
const Tick = () => (
  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(5,150,105,0.12)", border: "1.5px solid rgba(5,150,105,0.3)" }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  </span>
);
const Cross = () => (
  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(220,38,38,0.08)", border: "1.5px solid rgba(220,38,38,0.2)" }}>
    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  </span>
);

// ── Property card in selector ─────────────────────────────────
function SelectorSlot({
  property, allProperties, searchQuery, setSearchQuery, onSelect, onRemove, loading,
}: {
  property: Property | null;
  allProperties: Property[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSelect: (p: Property) => void;
  onRemove: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() =>
    allProperties.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.city ?? "").toLowerCase().includes(searchQuery.toLowerCase())),
    [allProperties, searchQuery]);

  if (property) {
    const img = property.featured_image || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80`;
    return (
      <div style={{ flex: 1, minWidth: 0, border: "2px solid #10C4C3", borderRadius: "16px", overflow: "hidden", background: "#fff", boxShadow: "0 4px 20px rgba(201,168,76,0.15)" }}>
        <div style={{ position: "relative", height: "180px", overflow: "hidden" }}>
          <img src={optimizedImageUrl(img, 500)} alt={property.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.7) 0%, transparent 50%)" }} />
          <button onClick={onRemove} style={{ position: "absolute", top: "10px", right: "10px", width: "28px", height: "28px", borderRadius: "50%", background: "rgba(220,38,38,0.85)", border: "none", color: "#fff", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, backdropFilter: "blur(4px)" }}>×</button>
          <span style={{ position: "absolute", bottom: "10px", left: "10px", padding: "3px 10px", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "#10C4C3", color: "#020C1C" }}>{property.listing_type === "sale" ? "For Sale" : "For Rent"}</span>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 600, color: "#020C1C", marginBottom: "4px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{property.title}</h3>
          <p style={{ fontSize: "11px", color: "#6B7C72", marginBottom: "8px" }}>{property.neighbourhood}, {property.city}</p>
          <p style={{ fontFamily: "var(--font-support-new)", fontSize: "20px", fontWeight: 600, color: "#10C4C3" }}>{fmtINR(property.price, true)}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ width: "100%", minHeight: "280px", border: "2px dashed rgba(13,43,31,0.18)", borderRadius: "16px", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.18s", fontFamily: "var(--font-body-new)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#10C4C3"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.03)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(13,43,31,0.18)"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: "#10C4C3" }}>+</div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#020C1C" }}>Add Property</p>
          <p style={{ fontSize: "12px", color: "#9CA3AF" }}>Search and select a property</p>
        </button>
      ) : (
        <div style={{ border: "2px solid rgba(201,168,76,0.3)", borderRadius: "16px", background: "#fff", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
            <input autoFocus type="text" placeholder="Search properties…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-body-new)", outline: "none", color: "#020C1C" }} />
          </div>
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {loading ? (
              <p style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#9CA3AF" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#9CA3AF" }}>No properties found</p>
            ) : filtered.map(p => (
              <button key={p.id} onClick={() => { onSelect(p); setOpen(false); setSearchQuery(""); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(13,43,31,0.05)", cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#F8F6F1"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                <img src={optimizedImageUrl(p.featured_image, 100) || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=100&q=80`} alt="" loading="lazy" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#020C1C", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                  <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{p.city} · {fmtINR(p.price, true)}</p>
                </div>
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
            <button onClick={() => { setOpen(false); setSearchQuery(""); }} style={{ fontSize: "12px", color: "#9CA3AF", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comparison table row ──────────────────────────────────────
function CmpRow({ label, values, type = "text", highlight = false }: {
  label: string;
  values: (string | number | boolean | null | React.ReactNode)[];
  type?: "text" | "price" | "best-low" | "best-high" | "bool" | "amenity";
  highlight?: boolean;
}) {
  // Determine which column "wins" for numeric comparisons
  const winIdx = useMemo(() => {
    if (type === "best-low") {
      const nums = values.map(v => typeof v === "number" ? v : null);
      const valid = nums.filter(n => n !== null) as number[];
      if (valid.length < 2) return -1;
      const min = Math.min(...valid);
      return nums.findIndex(n => n === min);
    }
    if (type === "best-high") {
      const nums = values.map(v => typeof v === "number" ? v : null);
      const valid = nums.filter(n => n !== null) as number[];
      if (valid.length < 2) return -1;
      const max = Math.max(...valid);
      return nums.findIndex(n => n === max);
    }
    return -1;
  }, [values, type]);

  return (
    <tr style={{ borderBottom: "1px solid rgba(13,43,31,0.05)", background: highlight ? "rgba(201,168,76,0.03)" : "transparent" }}>
      <td style={{ padding: "13px 16px", fontSize: "12px", fontWeight: 600, color: "#6B7C72", whiteSpace: "nowrap", minWidth: "160px", position: "sticky", left: 0, background: highlight ? "#FDFAF5" : "#fff", zIndex: 1, borderRight: "1px solid rgba(13,43,31,0.06)" }}>{label}</td>
      {values.map((val, i) => {
        const isWin = winIdx === i;
        let display: React.ReactNode = "—";
        if (val !== null && val !== undefined) {
          if (type === "bool") display = val ? <Tick /> : <Cross />;
          else if (type === "amenity") display = val ? <Tick /> : <Cross />;
          else if (type === "price") display = <span style={{ fontFamily: "var(--font-support-new)", fontSize: "16px", fontWeight: 600, color: "#10C4C3" }}>{fmtINR(val as number, true)}</span>;
          else display = String(val);
        }
        return (
          <td key={i} style={{ padding: "13px 16px", fontSize: "13px", color: "#374151", textAlign: "center", background: isWin ? "rgba(201,168,76,0.06)" : "transparent", fontWeight: isWin ? 700 : 400, position: "relative" }}>
            {isWin && type !== "text" && <span style={{ position: "absolute", top: "4px", right: "6px", fontSize: "8px" }}>🏆</span>}
            {display}
          </td>
        );
      })}
    </tr>
  );
}

// ── Section header row ────────────────────────────────────────
function SectionRow({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr style={{ background: "#F8F6F1" }}>
      <td colSpan={colCount + 1} style={{ padding: "10px 16px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.16em", color: "#10C4C3", textTransform: "uppercase", borderBottom: "1px solid rgba(13,43,31,0.06)", borderTop: "1px solid rgba(13,43,31,0.06)" }}>{label}</td>
    </tr>
  );
}

// ── Mini property card ────────────────────────────────────────
function MiniCard({ p }: { p: Property }) {
  const [hover, setHover] = useState(false);
  const img = p.featured_image || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80`;
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 16px 48px rgba(13,43,31,0.12)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none", transition: "all 0.2s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ height: "180px", overflow: "hidden" }}>
        <img src={optimizedImageUrl(img, 500)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.3s" }} />
      </div>
      <div style={{ padding: "16px 18px" }}>
        <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", color: "#10C4C3", textTransform: "uppercase", marginBottom: "5px" }}>{p.property_type} · {p.city}</p>
        <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "17px", fontWeight: 600, color: "#020C1C", marginBottom: "8px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</h4>
        <p style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#10C4C3" }}>{fmtINR(p.price, true)}</p>
      </div>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ComparePage() {
  const [allProps, setAllProps]       = useState<Property[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<(Property | null)[]>([null, null, null]);
  const [searches, setSearches]       = useState(["", "", ""]);
  const [saved, setSaved]             = useState(false);
  const [copied, setCopied]           = useState(false);
  const [similarProps, setSimilarProps] = useState<Property[]>([]);
  const { items: compareItems } = useCompare();

  // Prefill the comparison slots from the global compare selection (the
  // floating CompareBar drives this). Items carry their own data, so no fetch.
  useEffect(() => {
    if (compareItems.length === 0) return;
    const mapped: Property[] = compareItems.map((it: CompareItem) => ({
      ...it,
      images: it.image ? [it.image] : [],
      featured_image: it.image,
    }));
    setSelected([mapped[0] ?? null, mapped[1] ?? null, mapped[2] ?? null]);
  }, [compareItems]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("properties")
          .select(`*, city:cities(name), neighbourhood:neighbourhoods(name)`)
          .eq("status", "active")
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false })
          .limit(30);
        if (data && data.length > 0) {
          const mapped: Property[] = data.map((p: any) => ({
            ...p,
            city: p.city?.name ?? p.city,
            neighbourhood: p.neighbourhood?.name ?? p.neighbourhood,
            images: p.images ?? [],
            amenities: p.amenities ?? [],
            featured_image: p.images?.[0] ?? null,
          }));
          setAllProps(mapped);
          setSimilarProps(mapped.slice(0, 3));
        } else {
          setAllProps([]);
          setSimilarProps([]);
        }
      } catch {
        setAllProps([]);
        setSimilarProps([]);
      } finally {
        setLoading(false);
      }
    }
    // Load saved selection from localStorage
    try {
      const saved = localStorage.getItem("nilay360_compare");
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        // We'll restore after data loads
        (window as any).__savedCompareIds = ids;
      }
    } catch {}
    load();
  }, []);

  // Restore saved selection after data loads
  useEffect(() => {
    if (allProps.length === 0) return;
    const ids: string[] | undefined = (window as any).__savedCompareIds;
    if (!ids) return;
    const restored = ids.map((id: string) => allProps.find(p => p.id === id) ?? null);
    if (restored.some(p => p !== null)) {
      setSelected([restored[0] ?? null, restored[1] ?? null, restored[2] ?? null]);
      delete (window as any).__savedCompareIds;
    }
  }, [allProps]);

  const active = selected.filter(Boolean) as Property[];
  const activeCount = active.length;

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    active.forEach(p => p.amenities.forEach(a => set.add(a)));
    return Array.from(set).sort();
  }, [active]);

  // Verdict: score each property on 5 criteria
  const verdict = useMemo(() => {
    if (active.length < 2) return null;
    const scores = active.map(p => {
      let s = 0;
      const pps = pricePerSqft(p);
      if (pps !== null) {
        const minPps = Math.min(...active.map(x => pricePerSqft(x) ?? Infinity));
        if (pps === minPps) s += 2;
      }
      if (p.amenities.length === Math.max(...active.map(x => x.amenities.length))) s += 2;
      if (p.area_sqft && p.area_sqft === Math.max(...active.map(x => x.area_sqft ?? 0))) s += 1;
      return s;
    });
    const maxScore = Math.max(...scores);
    return scores.map((s, i) => ({ score: s, isBest: s === maxScore }));
  }, [active]);

  const setPropertyAt = useCallback((idx: number, p: Property) => {
    setSelected(prev => { const n = [...prev]; n[idx] = p; return n; });
  }, []);
  const removeAt = useCallback((idx: number) => {
    setSelected(prev => { const n = [...prev]; n[idx] = null; return n; });
  }, []);
  const setSearchAt = useCallback((idx: number, v: string) => {
    setSearches(prev => { const n = [...prev]; n[idx] = v; return n; });
  }, []);

  function saveComparison() {
    const ids = selected.map(p => p?.id ?? null);
    localStorage.setItem("nilay360_compare", JSON.stringify(ids));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function shareComparison() {
    const ids = active.map(p => p.id).join(",");
    const url = `${window.location.origin}/compare?ids=${ids}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Restore from URL params
  useEffect(() => {
    if (allProps.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids")?.split(",");
    if (!ids) return;
    const restored = ids.map(id => allProps.find(p => p.id === id) ?? null);
    if (restored.some(p => p !== null)) {
      setSelected([restored[0] ?? null, restored[1] ?? null, restored[2] ?? null]);
    }
  }, [allProps]);

  const colCount = activeCount || 3;
  const pad = (vals: any[]) => {
    while (vals.length < 3) vals.push(null);
    return vals.slice(0, 3).filter((_, i) => selected[i] !== null || i < colCount);
  };

  const vals = (fn: (p: Property) => any) =>
    selected.filter(Boolean).map(p => fn(p as Property));

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        table { border-collapse: collapse; }
        @media (max-width: 768px) {
          .cp-nav { padding: 0 16px !important; }
          .cp-nav-links { display: none !important; }
          .cp-selector { flex-direction: column !important; gap: 12px !important; padding: 24px 16px !important; }
          .cp-table { overflow-x: auto !important; padding: 0 16px !important; }
          .cp-similar { grid-template-columns: 1fr !important; padding: 0 16px !important; }
          .cp-footer { padding: 48px 16px 0 !important; }
          .cp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .cp-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#020C1C", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 65% at 85% 110%, rgba(201,168,76,0.09) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "720px", margin: "0 auto", padding: "64px 48px 72px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "22px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10C4C3" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>Side-by-Side</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(42px, 6vw, 68px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.1, marginBottom: "16px", animation: "fadeUp 0.5s ease-out both" }}>
              Compare<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Properties</em>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Select up to 3 properties for a detailed side-by-side comparison. Every spec, every feature.
            </p>
          </div>
        </section>

        {/* ── PROPERTY SELECTOR ──────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "52px 48px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 500, color: "#020C1C" }}>Select Properties</h2>
              <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>Choose up to 3 properties to compare</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveComparison} style={{ padding: "9px 20px", background: saved ? "rgba(5,150,105,0.1)" : "#fff", border: `1.5px solid ${saved ? "rgba(5,150,105,0.3)" : "rgba(13,43,31,0.15)"}`, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: saved ? "#059669" : "#020C1C", cursor: "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: "7px", letterSpacing: "0.06em", transition: "all 0.2s" }}>
                {saved ? "✓ Saved!" : "💾 Save"}
              </button>
              <button onClick={shareComparison} disabled={activeCount < 2} style={{ padding: "9px 20px", background: copied ? "rgba(201,168,76,0.1)" : "#fff", border: `1.5px solid ${copied ? "rgba(201,168,76,0.35)" : "rgba(13,43,31,0.15)"}`, borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: copied ? "#10C4C3" : "#020C1C", cursor: activeCount < 2 ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: "7px", opacity: activeCount < 2 ? 0.45 : 1, letterSpacing: "0.06em", transition: "all 0.2s" }}>
                {copied ? "✓ Copied!" : "🔗 Share"}
              </button>
            </div>
          </div>
          <div className="cp-selector" style={{ display: "flex", gap: "18px" }}>
            {[0, 1, 2].map(i => (
              <SelectorSlot key={i}
                property={selected[i]}
                allProperties={allProps.filter(p => !selected.includes(p))}
                searchQuery={searches[i]}
                setSearchQuery={v => setSearchAt(i, v)}
                onSelect={p => setPropertyAt(i, p)}
                onRemove={() => removeAt(i)}
                loading={loading}
              />
            ))}
          </div>
        </section>

        {/* ── COMPARISON TABLE ───────────────────────────────── */}
        {activeCount >= 2 && (
          <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 48px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "24px", height: "1.5px", background: "#10C4C3" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>Side-by-Side</span>
                </div>
                <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 500, color: "#020C1C" }}>Detailed Comparison</h2>
              </div>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>🏆 = best value in category</span>
            </div>

            <div className="cp-table" style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid rgba(13,43,31,0.08)", boxShadow: "0 2px 16px rgba(13,43,31,0.05)" }}>
              <table style={{ width: "100%", background: "#fff" }}>
                {/* Header */}
                <thead>
                  <tr style={{ background: "#F8F6F1", borderBottom: "2px solid rgba(13,43,31,0.08)" }}>
                    <th style={{ padding: "14px 16px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#9CA3AF", textTransform: "uppercase", textAlign: "left", minWidth: "160px", position: "sticky", left: 0, background: "#F8F6F1", zIndex: 2, borderRight: "1px solid rgba(13,43,31,0.06)" }}>Feature</th>
                    {active.map((p, i) => (
                      <th key={p.id} style={{ padding: "14px 16px", textAlign: "center", minWidth: "200px" }}>
                        <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "15px", fontWeight: 600, color: "#020C1C", marginBottom: "2px", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</p>
                        <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{p.city}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <SectionRow label="Basic Information" colCount={activeCount} />
                  <CmpRow label="Price" values={vals(p => p.price)} type="price" />
                  <CmpRow label="Price / sqft" values={vals(p => pricePerSqft(p) ? fmtINR(pricePerSqft(p)!, true) + "/sqft" : "—")} type="text" />
                  <CmpRow label="Property Type" values={vals(p => p.property_type)} />
                  <CmpRow label="Listing Type" values={vals(p => p.listing_type === "sale" ? "For Sale" : "For Rent")} />
                  <CmpRow label="Status" values={vals(p => p.status?.charAt(0).toUpperCase() + p.status.slice(1))} />

                  <SectionRow label="Specifications" colCount={activeCount} />
                  <CmpRow label={active.every(p => COMMERCIAL_CATEGORIES.includes(p.property_type)) ? "Rooms / Cabins" : "Bedrooms"} values={vals(p => p.bedrooms ?? "—")}           type="best-high" />
                  <CmpRow label={active.every(p => COMMERCIAL_CATEGORIES.includes(p.property_type)) ? "Washrooms" : "Bathrooms"} values={vals(p => p.bathrooms ?? "—")}          type="best-high" />
                  <CmpRow label="Area (sqft)"    values={vals(p => p.area_sqft ? p.area_sqft.toLocaleString("en-IN") + " sqft" : "—")} />
                  <CmpRow label="Floor"          values={vals(p => p.floor_number != null ? `${p.floor_number} / ${p.total_floors ?? "?"}` : "—")} />
                  <CmpRow label="Parking"        values={vals(p => p.parking_spaces ?? "—")}     type="best-high" />
                  <CmpRow label="Year Built"     values={vals(p => p.year_built ?? "—")}         type="best-high" />
                  <CmpRow label="Furnished"      values={vals(p => p.is_furnished)}              type="bool" />

                  <SectionRow label="Location" colCount={activeCount} />
                  <CmpRow label="City"           values={vals(p => p.city ?? "—")} />
                  <CmpRow label="Neighbourhood"  values={vals(p => p.neighbourhood ?? "—")} />
                  <CmpRow label="Address"        values={vals(p => p.address ?? "—")} />

                  <SectionRow label="Financial Estimates (20% down · 8.5% · 20yr)" colCount={activeCount} />
                  <CmpRow label="Monthly EMI"    values={vals(p => p.listing_type === "sale" ? fmtINR(Math.round(calcEMI(p.price)), true) + "/mo" : "N/A")} type="best-low" />
                  <CmpRow label="Total Interest" values={vals(p => p.listing_type === "sale" ? fmtINR(Math.round(calcTotalInterest(p.price)), true) : "N/A")} type="best-low" />
                  <CmpRow label="Price / sqft"   values={vals(p => pricePerSqft(p) !== null ? `₹${pricePerSqft(p)!.toLocaleString("en-IN")}` : "—")} type="best-low" />

                  {allAmenities.length > 0 && (
                    <>
                      <SectionRow label="Amenities" colCount={activeCount} />
                      {allAmenities.map(amenity => (
                        <CmpRow key={amenity} label={amenity}
                          values={vals(p => p.amenities.includes(amenity))}
                          type="amenity" />
                      ))}
                    </>
                  )}

                  {/* Verdict row */}
                  {verdict && (
                    <>
                      <SectionRow label="Overall Verdict" colCount={activeCount} />
                      <tr style={{ background: "rgba(201,168,76,0.04)", borderTop: "2px solid rgba(201,168,76,0.15)" }}>
                        <td style={{ padding: "18px 16px", fontSize: "12px", fontWeight: 700, color: "#020C1C", position: "sticky", left: 0, background: "rgba(201,168,76,0.04)", zIndex: 1, borderRight: "1px solid rgba(13,43,31,0.06)" }}>Best Value</td>
                        {verdict.map((v, i) => (
                          <td key={i} style={{ padding: "18px 16px", textAlign: "center" }}>
                            {v.isBest ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "24px" }}>🏆</span>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#10C4C3", letterSpacing: "0.08em" }}>TOP PICK</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty state prompt */}
        {activeCount < 2 && (
          <div style={{ maxWidth: "520px", margin: "40px auto 0", padding: "0 48px", textAlign: "center" }}>
            <div style={{ padding: "40px", background: "#fff", borderRadius: "16px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <div style={{ fontSize: "40px", marginBottom: "14px", opacity: 0.3 }}>⚖</div>
              <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 500, color: "#020C1C", marginBottom: "8px" }}>Select at least 2 properties</h3>
              <p style={{ fontSize: "13px", color: "#6B7C72", lineHeight: 1.7 }}>Use the slots above to pick properties you'd like to compare side by side.</p>
            </div>
          </div>
        )}

        {/* ── SIMILAR PROPERTIES ─────────────────────────────── */}
        {similarProps.length > 0 && (
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <div style={{ width: "24px", height: "1.5px", background: "#10C4C3" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>Discover More</span>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 500, color: "#020C1C" }}>You Might Also Like</h2>
            </div>
            <a href="/properties" style={{ fontSize: "13px", fontWeight: 600, color: "#020C1C", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
              View All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </a>
          </div>
          <div className="cp-similar" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {similarProps.map(p => <MiniCard key={p.id} p={p} />)}
          </div>
        </section>
        )}

        {/* ── CTA BANNER ─────────────────────────────────────── */}
        <section style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.15, marginBottom: "16px" }}>
              Found Your<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Perfect Match?</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px" }}>
              Our advisors can arrange viewings for all three properties on the same day. Make the right call with confidence.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/contact" style={{ padding: "14px 36px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Schedule Viewings
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="/properties" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Browse More
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="cp-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="cp-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["IG", "IN", "TW", "YT"].map(s => (
                    <div key={s} style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 700 }}>{s}</div>
                  ))}
                </div>
              </div>
              {[
                { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
                { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
                { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"],["Safety Guide","/safety-guide"]] },
                { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"],["Agent Terms","/agent-terms"],["Grievance Redressal","/grievance-redressal"]] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginBottom: "18px" }}>{col.heading}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {col.links.map(([l,h]) => <a key={l} href={h} style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", flexWrap: "wrap", gap: "12px" }}>
              <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.2)" }}>© 2025 Nilay 360. All rights reserved. Registered in India.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
