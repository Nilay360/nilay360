"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { optimizedImageUrl } from "@/lib/image-url";
import { useLiveStats } from "@/lib/liveStats";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  slug: string;
  title: string;
  location: string;
  price: number;
  area: number;
  price_per_sqft: number;
  property_type: string;
  image_url: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatINRFull(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function calcEMI(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Shimmer card ─────────────────────────────────────────────────────────────

function ShimmerCard() {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-block {
          background: linear-gradient(90deg, #e0dbd0 25%, #f0ece4 50%, #e0dbd0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
      `}</style>
      <div className="shimmer-block" style={{ height: 200 }} />
      <div style={{ padding: "20px 24px 24px" }}>
        <div className="shimmer-block" style={{ height: 20, width: "70%", marginBottom: 12 }} />
        <div className="shimmer-block" style={{ height: 14, width: "50%", marginBottom: 20 }} />
        <div className="shimmer-block" style={{ height: 28, width: "45%", marginBottom: 12 }} />
        <div className="shimmer-block" style={{ height: 14, width: "60%", marginBottom: 16 }} />
        <div className="shimmer-block" style={{ height: 16, width: "30%" }} />
      </div>
    </div>
  );
}

// ─── Property card ────────────────────────────────────────────────────────────

function PropertyCard({ prop }: { prop: Property }) {
  const [hovered, setHovered] = useState(false);

  const typeColors: Record<string, string> = {
    Office: "#1a4731",
    Retail: "#4a1a2e",
    Warehouse: "#1a2d47",
    "Mixed-Use": "#2d1a47",
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: hovered
          ? "0 12px 40px rgba(0,0,0,0.18)"
          : "0 2px 16px rgba(0,0,0,0.08)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.25s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image / placeholder */}
      <div style={{
        height: 200,
        background: typeColors[prop.property_type] || "#020C1C",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {prop.image_url ? (
          <img
            src={optimizedImageUrl(prop.image_url, 500)}
            alt={prop.title}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 48, opacity: 0.35 }}>
            {prop.property_type === "Office" ? "🏢"
              : prop.property_type === "Retail" ? "🏪"
              : prop.property_type === "Warehouse" ? "🏭"
              : "🏗"}
          </span>
        )}
        {/* Type badge */}
        <div style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "#10C4C3",
          color: "#020C1C",
          fontFamily: "var(--font-support-new)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          padding: "4px 10px",
          borderRadius: 4,
          textTransform: "uppercase",
        }}>
          {prop.property_type}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          fontFamily: "var(--font-heading-new)",
          fontSize: 22,
          fontWeight: 600,
          color: "#020C1C",
          margin: "0 0 6px",
          lineHeight: 1.25,
        }}>
          {prop.title}
        </h3>
        <p style={{
          fontFamily: "var(--font-body-new)",
          fontSize: 13,
          color: "#888",
          margin: "0 0 16px",
        }}>
          📍 {prop.location}
        </p>

        <p style={{
          fontFamily: "var(--font-support-new)",
          fontSize: 24,
          fontWeight: 600,
          color: "#10C4C3",
          margin: "0 0 6px",
        }}>
          {formatINR(prop.price)}
        </p>

        <p style={{
          fontFamily: "var(--font-support-new)",
          fontSize: 12,
          color: "#aaa",
          margin: "0 0 14px",
        }}>
          {prop.area.toLocaleString("en-IN")} sq ft &nbsp;·&nbsp; ₹{prop.price_per_sqft.toLocaleString("en-IN")} / sq ft
        </p>

        <Link href={`/property/${prop.slug}`} style={{
          marginTop: "auto",
          fontFamily: "var(--font-body-new)",
          fontSize: 13,
          color: "#10C4C3",
          textDecoration: "none",
          fontWeight: 500,
          letterSpacing: 0.3,
        }}>
          View Details →
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function CommercialPageInner() {
  const searchParams = useSearchParams();
  const liveStats = useLiveStats();

  // ROI Calculator state
  const [propValue, setPropValue] = useState(50000000);
  const [rentalYield, setRentalYield] = useState(8);
  const [loanPct, setLoanPct] = useState(0);

  // Derived ROI
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [emi, setEmi] = useState(0);
  const [netAnnual, setNetAnnual] = useState(0);
  const [netYield, setNetYield] = useState(0);

  // Listings state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [cityNotAvailable, setCityNotAvailable] = useState(false);

  // Commercial listings are Hyderabad-only. A non-Hyderabad city reached via
  // URL flips an honest "not available" flag instead of a silent empty view.
  useEffect(() => {
    const city = searchParams.get("city");
    if (city && city.toLowerCase() !== "hyderabad") {
      setCityNotAvailable(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ROI calculation
  useEffect(() => {
    const annual = propValue * (rentalYield / 100);
    const monthly = annual / 12;
    const loanAmount = propValue * (loanPct / 100);
    const emiVal = calcEMI(loanAmount, 9, 20);
    const emiAnnual = emiVal * 12;
    const net = annual - emiAnnual;
    const yld = (net / propValue) * 100;

    setMonthlyRent(monthly);
    setAnnualIncome(annual);
    setEmi(emiVal);
    setNetAnnual(net);
    setNetYield(yld);
  }, [propValue, rentalYield, loanPct]);

  // Fetch properties
  useEffect(() => {
    async function fetchProps() {
      setLoading(true);
      try {
        const supabase = createClient();
        // Listings live in property_listings (seller-submitted) — the old
        // `properties` seed/catalog table this used to query is empty.
        const { data, error } = await supabase
          .from("property_listings")
          .select("*")
          .eq("listing_type", "commercial")
          .eq("status", "active")
          .limit(6);

        if (error || !data) {
          setProperties([]);
        } else {
          // Commercial listings are Hyderabad-only — enforced here, not just hidden in the UI.
          setProperties(
            data
              .filter((p: any) => typeof p.city === "string" && p.city.toLowerCase().includes("hyderabad"))
              .map((p: any): Property => {
                const area = Number(p.built_up_area) || 0;
                const price = Number(p.price) || 0;
                return {
                  id: String(p.id ?? ""),
                  slug: typeof p.slug === "string" ? p.slug : String(p.id ?? ""),
                  title: typeof p.title === "string" ? p.title : "Untitled Property",
                  location: [p.locality, p.city].filter(Boolean).join(", "),
                  price,
                  area,
                  price_per_sqft: area > 0 ? Math.round(price / area) : 0,
                  property_type: typeof p.property_category === "string"
                    ? p.property_category.charAt(0).toUpperCase() + p.property_category.slice(1)
                    : "Office",
                  image_url: Array.isArray(p.photo_urls) ? p.photo_urls[0] ?? null : null,
                };
              })
          );
        }
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProps();
  }, []);

  // Filtered properties (client-side on fallback data)
  const filteredProperties = properties.filter((p) => {
    if (typeFilter !== "All" && p.property_type !== typeFilter) return false;
    if (budgetFilter === "Under ₹1Cr" && p.price >= 10000000) return false;
    if (budgetFilter === "₹1-5Cr" && (p.price < 10000000 || p.price > 50000000)) return false;
    if (budgetFilter === "₹5-10Cr" && (p.price < 50000000 || p.price > 100000000)) return false;
    if (budgetFilter === "Above ₹10Cr" && p.price < 100000000) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    fontFamily: "var(--font-body-new)",
    fontSize: 14,
    color: "#020C1C",
    background: "#fff",
    border: "1px solid rgba(13,43,31,0.2)",
    borderRadius: 6,
    padding: "10px 16px",
    cursor: "pointer",
    outline: "none",
    minWidth: 160,
  };

  return (
    <>
      {/* ── Google Fonts ─────────────────────────────────────────────── */}
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; }

        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #e0dbd0 25%, #f0ece4 50%, #e0dbd0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(201,168,76,0.3);
          outline: none;
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #10C4C3;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #10C4C3;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
        }

        a { text-decoration: none; }

        @media (max-width: 768px) {
          .cm-hero { padding: 80px 0 0 !important; }
          .cm-hero-inner { padding: 48px 16px !important; }
          .cm-types { padding: 48px 16px !important; }
          .cm-types-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .cm-roi { padding: 48px 16px !important; }
          .cm-roi-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .cm-listings { padding: 48px 16px !important; }
          .cm-filters { flex-wrap: wrap !important; gap: 10px !important; }
          .cm-filters select { width: 100% !important; }
          .cm-grid { grid-template-columns: 1fr !important; }
          .cm-advantages { padding: 48px 16px !important; }
          .cm-why { padding: 48px 16px !important; }
          .cm-cta { padding: 56px 16px !important; }
          .cm-footer { padding: 48px 16px 0 !important; }
          .cm-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .cm-footer-grid { grid-template-columns: 1fr !important; }
        }

        .type-card:hover {
          box-shadow: 0 16px 48px rgba(0,0,0,0.35) !important;
          transform: translateY(-4px) !important;
        }
        .footer-link:hover { color: #020C1C !important; }
        .nav-link:hover { color: #10C4C3 !important; }
        .cta-browse:hover { opacity: 0.88; }
        .cta-talk:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="cm-hero" style={{
        background: "#020C1C",
        minHeight: "60vh",
        paddingTop: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div className="cm-hero-inner" style={{
          textAlign: "center",
          padding: "80px 24px",
          maxWidth: 800,
          margin: "0 auto",
        }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: "var(--font-support-new)",
            fontSize: 12,
            color: "#10C4C3",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 24,
          }}>
            Commercial Real Estate
          </p>

          {/* H1 */}
          <h1 style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 56,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            Premium Commercial Properties
            <br />
            <span style={{ fontStyle: "italic", color: "#10C4C3" }}>
              for Forward-Thinking Businesses
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 18,
            color: "#020C1C",
            maxWidth: 600,
            margin: "0 auto 56px",
            lineHeight: 1.65,
            opacity: 0.88,
          }}>
            Offices, retail spaces, and industrial assets across India's growth corridors.
          </p>

          {/* Stats */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            flexWrap: "wrap",
          }}>
            {[
              { num: String(liveStats.listingsByType.commercial), label: "Listings" },
              { num: String(liveStats.cities), label: liveStats.cities === 1 ? "City" : "Cities" },
              { num: "8.5%", label: "Avg Yield" },
            ].map((stat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{
                    width: 1,
                    height: 48,
                    background: "#10C4C3",
                    opacity: 0.5,
                    margin: "0 40px",
                  }} />
                )}
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 32,
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>
                    {stat.num}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 12,
                    color: "#10C4C3",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMERCIAL TYPES ─────────────────────────────────────────── */}
      <section className="cm-types" style={{
        background: "#020C1C",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 40,
            fontWeight: 600,
            color: "#020C1C",
            marginBottom: 48,
            textAlign: "center",
          }}>
            Explore by Type
          </h2>

          <div className="cm-types-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}>
            {[
              { icon: "🏢", name: "Office Space", count: "142 Listings", yield: "7.2% Avg Yield", href: "/search?type=office" },
              { icon: "🏪", name: "Retail Space", count: "89 Listings", yield: "8.1% Avg Yield", href: "/search?type=retail" },
              { icon: "🏭", name: "Warehouse / Industrial", count: "54 Listings", yield: "9.3% Avg Yield", href: "/search?type=warehouse" },
              { icon: "🏗", name: "Mixed-Use Development", count: "25 Listings", yield: "8.7% Avg Yield", href: "/search?type=mixed-use" },
            ].map((type) => (
              <div
                key={type.name}
                className="type-card"
                style={{
                  background: "#020C1C",
                  border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 8,
                  padding: 40,
                  transition: "all 0.25s ease",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 20 }}>{type.icon}</div>
                <h3 style={{
                  fontFamily: "var(--font-heading-new)",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#10C4C3",
                  marginBottom: 8,
                }}>
                  {type.name}
                </h3>
                <p style={{
                  fontFamily: "var(--font-support-new)",
                  fontSize: 14,
                  color: "rgba(245,242,236,0.7)",
                  marginBottom: 6,
                }}>
                  {type.count}
                </p>
                <p style={{
                  fontFamily: "var(--font-support-new)",
                  fontSize: 14,
                  color: "#10C4C3",
                  marginBottom: 24,
                }}>
                  {type.yield}
                </p>
                <Link href={type.href} style={{
                  fontFamily: "var(--font-body-new)",
                  fontSize: 13,
                  color: "#10C4C3",
                  fontWeight: 500,
                  letterSpacing: 0.3,
                }}>
                  Browse →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ───────────────────────────────────────────── */}
      <section className="cm-roi" style={{
        background: "#020C1C",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 40,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 12,
            }}>
              ROI Calculator
            </h2>
            <p style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 16,
              color: "#10C4C3",
            }}>
              Estimate your commercial property returns
            </p>
          </div>

          {/* Two columns */}
          <div className="cm-roi-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "start",
          }}>
            {/* Inputs */}
            <div style={{
              background: "#020C1C",
              borderRadius: 8,
              padding: 40,
            }}>
              {/* Property Value */}
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}>
                  <label style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 12,
                    color: "#020C1C",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    Property Value
                  </label>
                  <span style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#10C4C3",
                  }}>
                    {formatINR(propValue)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5000000}
                  max={500000000}
                  step={500000}
                  value={propValue}
                  onChange={(e) => setPropValue(Number(e.target.value))}
                />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}>
                  <span style={{ fontFamily: "var(--font-body-new)", fontSize: 11, color: "#888" }}>₹50 L</span>
                  <span style={{ fontFamily: "var(--font-body-new)", fontSize: 11, color: "#888" }}>₹50 Cr</span>
                </div>
              </div>

              {/* Rental Yield */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 12,
                    color: "#020C1C",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    Annual Rental Yield
                  </label>
                  <span style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#10C4C3",
                  }}>
                    {rentalYield}%
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={12}
                  step={0.5}
                  value={rentalYield}
                  onChange={(e) => setRentalYield(Number(e.target.value))}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontFamily: "var(--font-body-new)", fontSize: 11, color: "#888" }}>4%</span>
                  <span style={{ fontFamily: "var(--font-body-new)", fontSize: 11, color: "#888" }}>12%</span>
                </div>
              </div>

              {/* Loan % toggles */}
              <div>
                <label style={{
                  display: "block",
                  fontFamily: "var(--font-support-new)",
                  fontSize: 12,
                  color: "#020C1C",
                  fontWeight: 600,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}>
                  Loan %
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[0, 40, 60, 80].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setLoanPct(pct)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        border: "1px solid rgba(201,168,76,0.4)",
                        borderRadius: 4,
                        background: loanPct === pct ? "#10C4C3" : "transparent",
                        color: loanPct === pct ? "#020C1C" : "#020C1C",
                        fontFamily: "var(--font-body-new)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div style={{
              background: "#0a2218",
              border: "1px solid rgba(201,168,76,0.4)",
              borderRadius: 8,
              padding: 40,
            }}>
              {[
                { label: "Monthly Rent", value: formatINRFull(monthlyRent) },
                { label: "Annual Income", value: formatINRFull(annualIncome) },
                { label: "Loan EMI / Month", value: loanPct === 0 ? "No Loan" : formatINRFull(emi) },
                { label: "Net Annual Income", value: formatINRFull(netAnnual) },
                { label: "Net Yield", value: `${netYield.toFixed(2)}%` },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: i < 4 ? 28 : 0,
                    paddingBottom: i < 4 ? 28 : 0,
                    borderBottom: i < 4 ? "1px solid rgba(201,168,76,0.12)" : "none",
                  }}
                >
                  <p style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 12,
                    color: "#10C4C3",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}>
                    {item.label}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-support-new)",
                    fontSize: 32,
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1,
                  }}>
                    {item.value}
                  </p>
                </div>
              ))}

              <button
                style={{
                  marginTop: 32,
                  width: "100%",
                  padding: "14px 0",
                  background: "#10C4C3",
                  color: "#020C1C",
                  border: "none",
                  borderRadius: 4,
                  fontFamily: "var(--font-body-new)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 1,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Calculate Returns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTERS + LISTINGS ───────────────────────────────────────── */}
      <section className="cm-listings" style={{
        background: "#020C1C",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 40,
            fontWeight: 600,
            color: "#020C1C",
            marginBottom: 40,
            textAlign: "center",
          }}>
            Available Commercial Properties
          </h2>

          {/* Filters */}
          <div className="cm-filters" style={{
            display: "flex",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 6,
              background: "rgba(16,196,195,0.08)", border: "1px solid rgba(16,196,195,0.25)",
              color: "#10C4C3", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-support-new)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Hyderabad
            </span>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={selectStyle}
            >
              {["All", "Office", "Retail", "Warehouse", "Mixed-Use"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              style={selectStyle}
            >
              {["All", "Under ₹1Cr", "₹1-5Cr", "₹5-10Cr", "Above ₹10Cr"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Grid */}
          <div className="cm-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 28,
          }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)
              : cityNotAvailable
                ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0" }}>
                    <p style={{ fontFamily: "var(--font-heading-new)", fontSize: 28, color: "#020C1C", marginBottom: 8 }}>
                      Currently only available in Hyderabad
                    </p>
                    <p style={{ fontSize: 14, color: "#020C1C", opacity: 0.5 }}>
                      We're not listing commercial properties in other cities yet.
                    </p>
                  </div>
                )
                : filteredProperties.length > 0
                ? filteredProperties.map((p) => <PropertyCard key={p.id} prop={p} />)
                : (
                  <div style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "60px 0",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-heading-new)",
                      fontSize: 28,
                      color: "#020C1C",
                      opacity: 0.5,
                    }}>
                      {properties.length === 0 ? "No commercial properties listed yet." : "No properties match your filters."}
                    </p>
                  </div>
                )}
          </div>
        </div>
      </section>

      {/* ── COMMERCIAL ADVANTAGES ────────────────────────────────────── */}
      <section className="cm-advantages" style={{
        background: "#020C1C",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 40,
            fontWeight: 600,
            color: "#fff",
            textAlign: "center",
            marginBottom: 56,
          }}>
            Why Invest in Commercial Real Estate?
          </h2>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
          }}>
            {[
              { icon: "📈", title: "Stable Returns", desc: "7–9% yield on quality assets" },
              { icon: "🤝", title: "Long-Term Tenants", desc: "3–9 year lease agreements" },
              { icon: "🔧", title: "Lower Maintenance", desc: "Tenants handle fit-outs" },
              { icon: "💰", title: "Tax Benefits", desc: "Depreciation & GST input credit" },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#020C1C",
                  borderRadius: 8,
                  padding: 32,
                  maxWidth: 240,
                  flex: "1 1 200px",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{
                  fontFamily: "var(--font-heading-new)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#020C1C",
                  marginBottom: 10,
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontFamily: "var(--font-body-new)",
                  fontSize: 14,
                  color: "#555",
                  lineHeight: 1.6,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY LEASE THROUGH Nilay 360 ─────────────────────────────────── */}
      <section className="cm-why" style={{
        background: "#020C1C",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 40,
            fontWeight: 600,
            color: "#020C1C",
            marginBottom: 56,
            textAlign: "center",
          }}>
            Why Lease Through Nilay 360?
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {[
              {
                num: "01",
                title: "Admin-Reviewed Listings",
                desc: "Every commercial listing goes through admin review before it goes live.",
              },
              {
                num: "02",
                title: "Dedicated Commercial Advisors",
                desc: "Our specialists have 10+ years in commercial leasing and investment grade properties.",
              },
              {
                num: "03",
                title: "End-to-End Transaction Support",
                desc: "From due diligence to registration — we manage the entire process.",
              },
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 32,
                }}
              >
                {/* Number badge */}
                <div style={{
                  flexShrink: 0,
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "#020C1C",
                  border: "2px solid #10C4C3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-support-new)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#10C4C3",
                }}>
                  {item.num}
                </div>

                {/* Text */}
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{
                    fontFamily: "var(--font-heading-new)",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#020C1C",
                    marginBottom: 10,
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontFamily: "var(--font-body-new)",
                    fontSize: 16,
                    color: "#555",
                    lineHeight: 1.7,
                    maxWidth: 640,
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────────── */}
      <section className="cm-cta" style={{
        background: "#020C1C",
        padding: "80px 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--font-heading-new)",
          fontSize: 44,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 16,
          maxWidth: 700,
          margin: "0 auto 16px",
        }}>
          Ready to Invest in Commercial Property?
        </h2>
        <p style={{
          fontFamily: "var(--font-body-new)",
          fontSize: 16,
          color: "#020C1C",
          opacity: 0.8,
          marginBottom: 40,
        }}>
          Talk to our commercial real estate experts today.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/commercial"
            className="cta-browse"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 14,
              fontWeight: 600,
              color: "#020C1C",
              background: "#10C4C3",
              padding: "14px 32px",
              borderRadius: 4,
              textDecoration: "none",
              letterSpacing: 0.5,
              transition: "opacity 0.2s",
            }}
          >
            Browse Listings
          </Link>
          <Link
            href="/contact"
            className="cta-talk"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "transparent",
              border: "1px solid #fff",
              padding: "14px 32px",
              borderRadius: 4,
              textDecoration: "none",
              letterSpacing: 0.5,
              transition: "background 0.2s",
            }}
          >
            Talk to an Expert
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="cm-footer" style={{
        background: "#05080C",
        padding: "60px 80px 0",
      }}>
        {/* Logo + tagline */}
        <div style={{ marginBottom: 48 }}>
          <p style={{
            fontFamily: "var(--font-support-new)",
            fontSize: 24,
            fontWeight: 600,
            color: "#10C4C3",
            letterSpacing: 2,
            marginBottom: 8,
          }}>
            Nilay 360 ·
          </p>
          <p style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 13,
            color: "rgba(245,242,236,0.5)",
            maxWidth: 260,
            lineHeight: 1.6,
          }}>
            Premium real estate experiences for discerning buyers and investors across India.
          </p>
        </div>

        {/* 4-column grid */}
        <div className="cm-footer-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 40,
          marginBottom: 48,
        }}>
          {[
            {
              heading: "Properties",
              links: [
                { label: "Buy", href: "/buy" },
                { label: "Rent", href: "/rent" },
                { label: "New Projects", href: "/new-projects" },
                { label: "Commercial", href: "/commercial" },
                { label: "Builders", href: "/builders" },
                { label: "Blog", href: "/blog" },
              ],
            },
            {
              heading: "Company",
              links: [
                { label: "About Us", href: "/about" },
                { label: "Our Agents", href: "/agents" },
                { label: "NRI Services", href: "/nri" },
                { label: "Careers", href: "/careers" },
                { label: "Contact", href: "/contact" },
              ],
            },
            {
              heading: "Tools",
              links: [
                { label: "EMI Calculator", href: "/calculator" },
                { label: "Compare", href: "/compare" },
                { label: "Search", href: "/search" },
                { label: "RERA Guide", href: "/legal-guide" },
                { label: "Safety Guide", href: "/safety-guide" },
              ],
            },
            {
              heading: "Legal",
              links: [
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Cookie Policy", href: "/cookies" },
                { label: "RERA Guide", href: "/legal-guide" },
                { label: "Agent Terms", href: "/agent-terms" },
                { label: "Grievance Redressal", href: "/grievance-redressal" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p style={{
                fontFamily: "var(--font-support-new)",
                fontSize: 11,
                color: "#10C4C3",
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 20,
              }}>
                {col.heading}
              </p>
              <ul style={{ listStyle: "none" }}>
                {col.links.map((link) => (
                  <li key={link.href} style={{ marginBottom: 12 }}>
                    <Link
                      href={link.href}
                      className="footer-link"
                      style={{
                        fontFamily: "var(--font-body-new)",
                        fontSize: 14,
                        color: "rgba(245,242,236,0.6)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "24px 0 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <p style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 13,
            color: "rgba(245,242,236,0.4)",
          }}>
            © 2025 Nilay 360. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

export default function CommercialPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#020C1C" }} />}>
      <CommercialPageInner />
    </Suspense>
  );
}
