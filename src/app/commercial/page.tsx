"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Property {
  id: number;
  title: string;
  location: string;
  price: number;
  area: number;
  price_per_sqft: number;
  property_type: string;
  yield_percent: number;
  image_url: string | null;
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_PROPERTIES: Property[] = [
  { id: 1, title: "Grade A Office Tower", location: "HITEC City, Hyderabad", price: 45000000, area: 3200, price_per_sqft: 14063, property_type: "Office", yield_percent: 7.8, image_url: null },
  { id: 2, title: "Premium Retail Space", location: "Bandra Kurla Complex, Mumbai", price: 85000000, area: 2800, price_per_sqft: 30357, property_type: "Retail", yield_percent: 8.2, image_url: null },
  { id: 3, title: "Tech Park Office", location: "UB City, Bengaluru", price: 62000000, area: 4500, price_per_sqft: 13778, property_type: "Office", yield_percent: 7.5, image_url: null },
  { id: 4, title: "Logistics Hub", location: "NH-44, Hyderabad", price: 38000000, area: 12000, price_per_sqft: 3167, property_type: "Warehouse", yield_percent: 9.1, image_url: null },
  { id: 5, title: "Mixed-Use Complex", location: "Whitefield, Bengaluru", price: 120000000, area: 8000, price_per_sqft: 15000, property_type: "Mixed-Use", yield_percent: 8.5, image_url: null },
  { id: 6, title: "High Street Retail", location: "Connaught Place, Delhi", price: 95000000, area: 1800, price_per_sqft: 52778, property_type: "Retail", yield_percent: 8.9, image_url: null },
];

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
        background: typeColors[prop.property_type] || "#000000",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 48, opacity: 0.35 }}>
          {prop.property_type === "Office" ? "🏢"
            : prop.property_type === "Retail" ? "🏪"
            : prop.property_type === "Warehouse" ? "🏭"
            : "🏗"}
        </span>
        {/* Type badge */}
        <div style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "#2BA8E0",
          color: "#000000",
          fontFamily: "'DM Sans', sans-serif",
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
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22,
          fontWeight: 600,
          color: "#000000",
          margin: "0 0 6px",
          lineHeight: 1.25,
        }}>
          {prop.title}
        </h3>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "#888",
          margin: "0 0 16px",
        }}>
          📍 {prop.location}
        </p>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#2BA8E0",
          margin: "0 0 6px",
        }}>
          {formatINR(prop.price)}
        </p>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          color: "#aaa",
          margin: "0 0 14px",
        }}>
          {prop.area.toLocaleString("en-IN")} sq ft &nbsp;·&nbsp; ₹{prop.price_per_sqft.toLocaleString("en-IN")} / sq ft
        </p>

        {/* Yield badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(13,43,31,0.08)",
          color: "#000000",
          borderRadius: 4,
          padding: "4px 10px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          alignSelf: "flex-start",
          marginBottom: 20,
        }}>
          <span style={{ color: "#2e7d52", fontSize: 10 }}>●</span>
          {prop.yield_percent}% Avg Yield
        </div>

        <Link href={`/property/${prop.id}`} style={{
          marginTop: "auto",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "#2BA8E0",
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

export default function CommercialPage() {
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
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [budgetFilter, setBudgetFilter] = useState("All");

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
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("property_type", "Office")
          .eq("status", "active")
          .limit(6);

        if (error || !data || data.length === 0) {
          setProperties(FALLBACK_PROPERTIES);
        } else {
          setProperties(data as Property[]);
        }
      } catch {
        setProperties(FALLBACK_PROPERTIES);
      } finally {
        setLoading(false);
      }
    }
    fetchProps();
  }, []);

  // Filtered properties (client-side on fallback data)
  const filteredProperties = properties.filter((p) => {
    if (cityFilter !== "All" && !p.location.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    if (typeFilter !== "All" && p.property_type !== typeFilter) return false;
    if (budgetFilter === "Under ₹1Cr" && p.price >= 10000000) return false;
    if (budgetFilter === "₹1-5Cr" && (p.price < 10000000 || p.price > 50000000)) return false;
    if (budgetFilter === "₹5-10Cr" && (p.price < 50000000 || p.price > 100000000)) return false;
    if (budgetFilter === "Above ₹10Cr" && p.price < 100000000) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "#000000",
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #000000; }

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
          background: #2BA8E0;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2BA8E0;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
        }

        a { text-decoration: none; }

        .type-card:hover {
          box-shadow: 0 16px 48px rgba(0,0,0,0.35) !important;
          transform: translateY(-4px) !important;
        }
        .footer-link:hover { color: #000000 !important; }
        .nav-link:hover { color: #2BA8E0 !important; }
        .cta-browse:hover { opacity: 0.88; }
        .cta-talk:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        background: "#000000",
        minHeight: "60vh",
        paddingTop: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          textAlign: "center",
          padding: "80px 24px",
          maxWidth: 800,
          margin: "0 auto",
        }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "#2BA8E0",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 24,
          }}>
            Commercial Real Estate
          </p>

          {/* H1 */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 56,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            Premium Commercial Properties
            <br />
            <span style={{ fontStyle: "italic", color: "#2BA8E0" }}>
              for Forward-Thinking Businesses
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 18,
            color: "#000000",
            maxWidth: 600,
            margin: "0 auto 56px",
            lineHeight: 1.65,
            opacity: 0.88,
          }}>
            Offices, retail spaces, and industrial assets verified for quality and returns.
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
              { num: "310+", label: "Listings" },
              { num: "12", label: "Cities" },
              { num: "8.5%", label: "Avg Yield" },
            ].map((stat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{
                    width: 1,
                    height: 48,
                    background: "#2BA8E0",
                    opacity: 0.5,
                    margin: "0 40px",
                  }} />
                )}
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 32,
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}>
                    {stat.num}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#2BA8E0",
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
      <section style={{
        background: "#000000",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 40,
            fontWeight: 600,
            color: "#000000",
            marginBottom: 48,
            textAlign: "center",
          }}>
            Explore by Type
          </h2>

          <div style={{
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
                  background: "#000000",
                  border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 8,
                  padding: 40,
                  transition: "all 0.25s ease",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 20 }}>{type.icon}</div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#2BA8E0",
                  marginBottom: 8,
                }}>
                  {type.name}
                </h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "rgba(245,242,236,0.7)",
                  marginBottom: 6,
                }}>
                  {type.count}
                </p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#2BA8E0",
                  marginBottom: 24,
                }}>
                  {type.yield}
                </p>
                <Link href={type.href} style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#2BA8E0",
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
      <section style={{
        background: "#000000",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 40,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 12,
            }}>
              ROI Calculator
            </h2>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: "#2BA8E0",
            }}>
              Estimate your commercial property returns
            </p>
          </div>

          {/* Two columns */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "start",
          }}>
            {/* Inputs */}
            <div style={{
              background: "#000000",
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
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#000000",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    Property Value
                  </label>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#2BA8E0",
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
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#888" }}>₹50 L</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#888" }}>₹50 Cr</span>
                </div>
              </div>

              {/* Rental Yield */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#000000",
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    Annual Rental Yield
                  </label>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#2BA8E0",
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
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#888" }}>4%</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#888" }}>12%</span>
                </div>
              </div>

              {/* Loan % toggles */}
              <div>
                <label style={{
                  display: "block",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "#000000",
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
                        background: loanPct === pct ? "#2BA8E0" : "transparent",
                        color: loanPct === pct ? "#000000" : "#000000",
                        fontFamily: "'DM Sans', sans-serif",
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
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#2BA8E0",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}>
                    {item.label}
                  </p>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
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
                  background: "#2BA8E0",
                  color: "#000000",
                  border: "none",
                  borderRadius: 4,
                  fontFamily: "'DM Sans', sans-serif",
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
      <section style={{
        background: "#000000",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 40,
            fontWeight: 600,
            color: "#000000",
            marginBottom: 40,
            textAlign: "center",
          }}>
            Available Commercial Properties
          </h2>

          {/* Filters */}
          <div style={{
            display: "flex",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={selectStyle}
            >
              {["All", "Hyderabad", "Mumbai", "Bengaluru", "Delhi NCR", "Chennai", "Pune"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

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
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 28,
          }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={i} />)
              : filteredProperties.length > 0
                ? filteredProperties.map((p) => <PropertyCard key={p.id} prop={p} />)
                : (
                  <div style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "60px 0",
                  }}>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 28,
                      color: "#000000",
                      opacity: 0.5,
                    }}>
                      No properties match your filters.
                    </p>
                  </div>
                )}
          </div>
        </div>
      </section>

      {/* ── COMMERCIAL ADVANTAGES ────────────────────────────────────── */}
      <section style={{
        background: "#000000",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
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
                  background: "#000000",
                  borderRadius: 8,
                  padding: 32,
                  maxWidth: 240,
                  flex: "1 1 200px",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#000000",
                  marginBottom: 10,
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
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
      <section style={{
        background: "#000000",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 40,
            fontWeight: 600,
            color: "#000000",
            marginBottom: 56,
            textAlign: "center",
          }}>
            Why Lease Through Nilay 360?
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {[
              {
                num: "01",
                title: "Verified Listings Only",
                desc: "Every commercial property is RERA registered and physically verified by our team.",
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
                  background: "#000000",
                  border: "2px solid #2BA8E0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#2BA8E0",
                }}>
                  {item.num}
                </div>

                {/* Text */}
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#000000",
                    marginBottom: 10,
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
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
      <section style={{
        background: "#000000",
        padding: "80px 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
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
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16,
          color: "#000000",
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
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#000000",
              background: "#2BA8E0",
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
              fontFamily: "'DM Sans', sans-serif",
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
      <footer style={{
        background: "#05080C",
        padding: "60px 80px 0",
      }}>
        {/* Logo + tagline */}
        <div style={{ marginBottom: 48 }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 600,
            color: "#2BA8E0",
            letterSpacing: 2,
            marginBottom: 8,
          }}>
            Nilay 360 ·
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(245,242,236,0.5)",
            maxWidth: 260,
            lineHeight: 1.6,
          }}>
            Premium real estate experiences for discerning buyers and investors across India.
          </p>
        </div>

        {/* 4-column grid */}
        <div style={{
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
              ],
            },
            {
              heading: "Legal",
              links: [
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Cookie Policy", href: "/cookies" },
                { label: "RERA Guide", href: "/legal-guide" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                color: "#2BA8E0",
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
                        fontFamily: "'DM Sans', sans-serif",
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
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(245,242,236,0.4)",
          }}>
            © 2025 Nilay 360. All rights reserved.
          </p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(245,242,236,0.4)",
          }}>
            RERA compliant platform
          </p>
        </div>
      </footer>
    </>
  );
}
