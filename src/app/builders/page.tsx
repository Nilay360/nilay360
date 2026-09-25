"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── Design tokens ───────────────────────────────────────────────────────────
const DARK_GREEN = "#020C1C";
const GOLD = "#10C4C3";
const IVORY = "#020C1C";

// ─── Developer data ───────────────────────────────────────────────────────────
// No real developer/builder table exists yet — this page has no data source
// to query, so the directory is intentionally empty until one is built.
type Developer = {
  id: number; initials: string; name: string; slug: string; tagline: string;
  cities: string[]; projects: number; years: number; featured: boolean;
};

const ALL_DEVELOPERS: Developer[] = [];

const ALL_CITIES = [
  "All Cities",
  "Hyderabad",
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Chennai",
  "Pune",
];

// ─── Shimmer card ─────────────────────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: 28,
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-sweep::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          animation: shimmer 1.4s infinite;
        }
      `}</style>
      <div className="shimmer-sweep" style={{ position: "relative" }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            margin: "0 auto 16px",
          }}
        />
        <div
          style={{
            height: 20,
            borderRadius: 4,
            background: "rgba(255,255,255,0.08)",
            marginBottom: 10,
            width: "70%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
        <div
          style={{
            height: 14,
            borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            marginBottom: 10,
            width: "50%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
        <div
          style={{
            height: 14,
            borderRadius: 4,
            background: "rgba(255,255,255,0.06)",
            width: "40%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
      </div>
    </div>
  );
}

// ─── Developer Grid Card ──────────────────────────────────────────────────────
function DeveloperCard({ dev }: { dev: (typeof ALL_DEVELOPERS)[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fff" : IVORY,
        borderRadius: 8,
        padding: 28,
        textAlign: "center",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 16px 40px rgba(0,0,0,0.35)"
          : "0 2px 12px rgba(0,0,0,0.15)",
        cursor: "pointer",
      }}
    >
      {/* Initials badge */}
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: DARK_GREEN,
          border: `2px solid ${GOLD}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
          }}
        >
          {dev.initials}
        </span>
      </div>

      {/* Name */}
      <div
        style={{
          fontFamily: "var(--font-heading-new)",
          fontSize: 22,
          fontWeight: 600,
          color: DARK_GREEN,
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {dev.name}
      </div>

      {/* Cities */}
      <div
        style={{
          fontFamily: "var(--font-body-new)",
          fontSize: 12,
          color: "#888",
          marginBottom: 10,
        }}
      >
        {dev.cities.join(" · ")}
      </div>

      {/* Stats */}
      <div
        style={{
          fontFamily: "var(--font-support-new)",
          fontSize: 13,
          color: "#555",
          marginBottom: 14,
        }}
      >
        {dev.projects} Projects · {dev.years} Yrs
      </div>

      {/* Link */}
      <Link
        href={`/new-projects?developer=${dev.slug}`}
        style={{
          fontFamily: "var(--font-body-new)",
          fontSize: 13,
          fontWeight: 600,
          color: GOLD,
          textDecoration: "none",
          letterSpacing: "0.3px",
        }}
      >
        View Projects →
      </Link>
    </div>
  );
}

// ─── Featured Developer Card ──────────────────────────────────────────────────
function FeaturedCard({ dev }: { dev: (typeof ALL_DEVELOPERS)[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px solid ${GOLD}`,
        borderRadius: 12,
        background: hovered ? "#fffdf7" : "#fff",
        padding: 40,
        display: "flex",
        gap: 32,
        alignItems: "flex-start",
        transition: "box-shadow 0.25s ease, background 0.25s ease",
        boxShadow: hovered
          ? "0 12px 36px rgba(201,168,76,0.18)"
          : "0 2px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: 80,
          height: 80,
          minWidth: 80,
          borderRadius: "50%",
          background: DARK_GREEN,
          border: `2px solid ${GOLD}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 28,
            fontWeight: 700,
            color: GOLD,
          }}
        >
          {dev.initials}
        </span>
      </div>

      {/* Text area */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 32,
            fontWeight: 600,
            color: DARK_GREEN,
            marginBottom: 4,
            lineHeight: 1.15,
          }}
        >
          {dev.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 15,
            color: "#777",
            marginBottom: 16,
          }}
        >
          {dev.tagline}
        </div>

        {/* City badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {dev.cities.map((city) => (
            <span
              key={city}
              style={{
                border: `1px solid ${GOLD}`,
                color: DARK_GREEN,
                fontFamily: "var(--font-support-new)",
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 20,
                letterSpacing: "0.3px",
              }}
            >
              {city}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: 13,
            color: "#555",
            marginBottom: 20,
          }}
        >
          {dev.projects} Projects &nbsp;|&nbsp; {dev.years} Years
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            href={`/new-projects?developer=${dev.slug}`}
            style={{
              display: "inline-block",
              background: GOLD,
              color: DARK_GREEN,
              fontFamily: "var(--font-body-new)",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 24px",
              borderRadius: 4,
              textDecoration: "none",
              letterSpacing: "0.4px",
            }}
          >
            View Projects →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BuildersPage() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [sortBy, setSortBy] = useState("Most Projects");
  const [gridLoading, setGridLoading] = useState(true);
  const [navScrolled, setNavScrolled] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _supabase = createClient(); // initialise client (available for future data fetching)

  // Simulate async grid load
  useEffect(() => {
    const t = setTimeout(() => setGridLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Scroll listener for nav
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Client-side filtering
  const filtered = ALL_DEVELOPERS.filter((dev) => {
    const matchSearch =
      search.trim() === "" ||
      dev.name.toLowerCase().includes(search.toLowerCase());
    const matchCity =
      cityFilter === "All Cities" ||
      dev.cities.some((c) =>
        c.toLowerCase().includes(cityFilter.toLowerCase())
      );
    return matchSearch && matchCity;
  }).sort((a, b) => {
    if (sortBy === "Most Projects") return b.projects - a.projects;
    if (sortBy === "Newest") return a.years - b.years;
    if (sortBy === "Oldest") return b.years - a.years;
    if (sortBy === "Alphabetical") return a.name.localeCompare(b.name);
    return 0;
  });

  const featuredDevs = ALL_DEVELOPERS.filter((d) => d.featured);

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-body-new)",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: "12px 20px",
    outline: "none",
    color: "#333",
    background: "#fff",
  };

  const selectStyle: React.CSSProperties = {
    fontFamily: "var(--font-body-new)",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: "12px 16px",
    outline: "none",
    color: "#333",
    background: "#fff",
    cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    paddingRight: 36,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23555' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "10px",
  };

  return (
    <>
      {/* ── Global font import ── */}
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: ${IVORY}; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeInUp 0.7s ease forwards; }
        .fade-in-delay { animation: fadeInUp 0.7s ease 0.15s forwards; opacity: 0; }
        .fade-in-delay-2 { animation: fadeInUp 0.7s ease 0.3s forwards; opacity: 0; }

        @keyframes pulse-gold {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        .shimmer-card { animation: pulse-gold 1.6s ease-in-out infinite; }

        .nav-link {
          font-family: var(--font-body-new);
          font-size: 14px;
          color: rgba(255,255,255,0.85);
          text-decoration: none;
          letter-spacing: 0.5px;
          transition: color 0.2s;
        }
        .nav-link:hover { color: ${GOLD}; }

        .step-card:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 28px;
          right: -50%;
          width: 100%;
          border-top: 2px dashed ${GOLD};
          opacity: 0.4;
        }
        @media (max-width: 768px) {
          .bd-nav { padding: 0 16px !important; }
          .bd-nav-links { display: none !important; }
          .bd-hero { padding: 80px 16px 56px !important; }
          .bd-hero-stats { gap: 24px !important; flex-wrap: wrap !important; justify-content: center !important; }
          .bd-search { padding: 32px 16px !important; }
          .bd-search-input { width: 100% !important; }
          .bd-filter-row { flex-wrap: wrap !important; gap: 10px !important; }
          .bd-filter-row select { flex: 1 1 calc(50% - 5px) !important; }
          .bd-featured { padding: 0 16px 56px !important; }
          .bd-all { padding: 56px 16px !important; }
          .bd-dev-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .bd-verify { padding: 56px 16px !important; }
          .bd-steps { flex-direction: column !important; gap: 24px !important; }
          .bd-partner { padding: 56px 16px !important; }
          .bd-cta { padding: 56px 16px !important; }
          .bd-footer-grid { padding: 48px 16px 0 !important; grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .bd-footer-bottom { padding: 24px 16px 32px !important; flex-direction: column !important; text-align: center !important; gap: 8px !important; }
        }
        @media (max-width: 480px) {
          .bd-dev-grid { grid-template-columns: 1fr !important; }
          .bd-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 68,
          background: navScrolled
            ? "rgba(5,8,12,0.97)"
            : "rgba(5,8,12,0.90)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: navScrolled
            ? "1px solid rgba(201,168,76,0.2)"
            : "1px solid transparent",
          transition: "border-color 0.3s, background 0.3s",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}
        className="bd-nav"
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            textDecoration: "none",
            letterSpacing: "1px",
          }}
        >
          Nilay 360 ·
        </Link>

        {/* Center nav links */}
        <div className="bd-nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/buy" className="nav-link">Buy</Link>
          <Link href="/rent" className="nav-link">Rent</Link>
          <Link href="/new-projects" className="nav-link">New Projects</Link>
          <Link href="/agents" className="nav-link">Agents</Link>
          <Link href="/contact" className="nav-link">Contact</Link>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link
            href="/login"
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 14,
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            style={{
              display: "inline-block",
              background: GOLD,
              color: DARK_GREEN,
              fontFamily: "var(--font-body-new)",
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 18px",
              borderRadius: 4,
              textDecoration: "none",
              letterSpacing: "0.3px",
            }}
          >
            List Property
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════ */}
      <section
        className="bd-hero"
        style={{
          background: DARK_GREEN,
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "120px 40px 80px",
        }}
      >
        {/* Eyebrow */}
        <div
          className="fade-in"
          style={{
            fontFamily: "var(--font-support-new)",
            fontSize: 12,
            fontWeight: 600,
            color: GOLD,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Trusted Partners
        </div>

        {/* H1 */}
        <h1
          className="fade-in-delay"
          style={{
            fontFamily: "var(--font-heading-new)",
            fontSize: 56,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.15,
            marginBottom: 24,
            maxWidth: 760,
          }}
        >
          India&apos;s Premier Developers
          <br />
          <span style={{ fontStyle: "italic", color: GOLD }}>
            on One Platform
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="fade-in-delay-2"
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 18,
            color: "#FFFFFF",
            opacity: 0.85,
            maxWidth: 600,
            lineHeight: 1.7,
            marginBottom: 60,
          }}
        >
          Discover verified builders with proven track records and RERA-compliant
          projects.
        </p>

        {/* Status note — honest placeholder while the developer network is still empty */}
        <p
          className="fade-in-delay-2"
          style={{
            fontFamily: "var(--font-body-new)",
            fontSize: 14,
            color: "rgba(245,242,236,0.55)",
          }}
        >
          We're onboarding our first developer partners — check back soon.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. SEARCH + FILTER BAR
      ══════════════════════════════════════════════════════ */}
      <section
        className="bd-search"
        style={{
          background: IVORY,
          padding: "48px 40px",
          borderBottom: "1px solid rgba(13,43,31,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Search */}
          <input
            type="text"
            placeholder="Search developers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bd-search-input" style={{ ...inputStyle, width: 300 }}
          />

          <div className="bd-filter-row" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* City filter */}
            <div style={{ position: "relative" }}>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={selectStyle}
              >
                {ALL_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div style={{ position: "relative" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={selectStyle}
              >
                {["Most Projects", "Newest", "Oldest", "Alphabetical"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Result count */}
          <div
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 14,
              color: "#888",
            }}
          >
            Showing <strong style={{ color: "#333" }}>{filtered.length}</strong>{" "}
            developer{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. FEATURED DEVELOPERS
      ══════════════════════════════════════════════════════ */}
      {featuredDevs.length > 0 && (
      <section className="bd-featured" style={{ background: IVORY, padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 40,
              fontWeight: 600,
              color: DARK_GREEN,
              marginBottom: 36,
              paddingTop: 16,
            }}
          >
            Featured Developers
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {featuredDevs.map((dev) => (
              <FeaturedCard key={dev.id} dev={dev} />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════════════
          4. ALL DEVELOPERS GRID
      ══════════════════════════════════════════════════════ */}
      <section
        className="bd-all"
        style={{
          background: DARK_GREEN,
          padding: "80px 40px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 40,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 40,
            }}
          >
            All Verified Developers
          </h2>

          {gridLoading ? (
            <div
              className="bd-dev-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 24,
              }}
            >
              {[...Array(6)].map((_, i) => (
                <ShimmerCard key={i} />
              ))}
            </div>
          ) : (
            <div
              className="bd-dev-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 24,
              }}
            >
              {filtered.map((dev) => (
                <DeveloperCard key={dev.id} dev={dev} />
              ))}
              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: "60px 0",
                    fontFamily: "var(--font-heading-new)",
                    fontSize: 16,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {ALL_DEVELOPERS.length === 0 ? "No developers listed yet." : "No developers found matching your criteria."}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. VERIFICATION PROCESS
      ══════════════════════════════════════════════════════ */}
      <section className="bd-verify" style={{ background: IVORY, padding: "80px 40px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 40,
              fontWeight: 600,
              color: "#FFFFFF",
              marginBottom: 16,
            }}
          >
            How We Verify Developers
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 16,
              color: "#A9B4C2",
              marginBottom: 64,
              maxWidth: 660,
              margin: "0 auto 64px",
              lineHeight: 1.7,
            }}
          >
            Nilay 360&apos;s 4-step due diligence process ensures every listed developer
            meets our standards.
          </p>

          {/* Steps row */}
          <div
            className="bd-steps"
            style={{
              display: "flex",
              gap: 0,
              alignItems: "flex-start",
              position: "relative",
            }}
          >
            {/* Connecting line */}
            <div
              style={{
                position: "absolute",
                top: 28,
                left: "12.5%",
                right: "12.5%",
                height: 2,
                borderTop: `2px dashed ${GOLD}`,
                opacity: 0.4,
                zIndex: 0,
              }}
            />

            {[
              {
                step: 1,
                icon: "📋",
                title: "Registration Check",
                desc: "MCA21 & ROC verification",
              },
              {
                step: 2,
                icon: "🏛",
                title: "Project RERA",
                desc: "All active projects verified with state RERA",
              },
              {
                step: 3,
                icon: "💼",
                title: "Financial Health",
                desc: "Balance sheet & debt analysis",
              },
              {
                step: 4,
                icon: "⭐",
                title: "Track Record",
                desc: "Delivery timeline & quality audit",
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "0 16px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {/* Number circle */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: DARK_GREEN,
                    border: `2px solid ${GOLD}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-support-new)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: GOLD,
                    }}
                  >
                    {step}
                  </span>
                </div>

                {/* Icon */}
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: "var(--font-heading-new)",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    marginBottom: 8,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </div>

                {/* Desc */}
                <div
                  style={{
                    fontFamily: "var(--font-body-new)",
                    fontSize: 13,
                    color: "#888",
                    lineHeight: 1.6,
                    maxWidth: 180,
                    margin: "0 auto",
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. BECOME A PARTNER
      ══════════════════════════════════════════════════════ */}
      <section
        className="bd-partner"
        style={{
          background: DARK_GREEN,
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 44,
              fontWeight: 600,
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            List Your Projects on Nilay 360
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 16,
              color: GOLD,
              marginBottom: 40,
              lineHeight: 1.6,
            }}
          >
            Be among the first developers reaching serious buyers across India.
          </p>

          {/* Benefits */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 44,
              textAlign: "left",
              maxWidth: 420,
              margin: "0 auto 44px",
            }}
          >
            {[
              "Direct access to buyers actively searching on Nilay 360",
              "Dedicated relationship manager",
              "RERA-compliant listing support",
            ].map((benefit) => (
              <div
                key={benefit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: GOLD,
                    color: DARK_GREEN,
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body-new)",
                    fontSize: 15,
                    color: "rgba(245,242,236,0.9)",
                  }}
                >
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Link
              href="/contact"
              style={{
                display: "inline-block",
                background: GOLD,
                color: DARK_GREEN,
                fontFamily: "var(--font-body-new)",
                fontSize: 15,
                fontWeight: 700,
                padding: "16px 40px",
                borderRadius: 4,
                textDecoration: "none",
                letterSpacing: "0.5px",
              }}
            >
              Register as Developer
            </Link>
            <Link
              href="/login"
              style={{
                fontFamily: "var(--font-body-new)",
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
              }}
            >
              Already a partner? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. CTA SECTION
      ══════════════════════════════════════════════════════ */}
      <section
        className="bd-cta"
        style={{
          background: IVORY,
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-heading-new)",
              fontSize: 44,
              fontWeight: 600,
              color: "#FFFFFF",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            Find Your Dream Home with Nilay 360
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body-new)",
              fontSize: 17,
              color: "#A9B4C2",
              marginBottom: 40,
              lineHeight: 1.7,
            }}
          >
            Browse projects from India&apos;s leading developers.
          </p>
          <div
            style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link
              href="/new-projects"
              style={{
                display: "inline-block",
                background: DARK_GREEN,
                color: "#FFFFFF",
                fontFamily: "var(--font-body-new)",
                fontSize: 14,
                fontWeight: 600,
                padding: "14px 32px",
                borderRadius: 4,
                textDecoration: "none",
                letterSpacing: "0.4px",
              }}
            >
              Browse New Projects
            </Link>
            <Link
              href="/contact"
              style={{
                display: "inline-block",
                border: `2px solid ${GOLD}`,
                color: GOLD,
                background: "transparent",
                fontFamily: "var(--font-body-new)",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 32px",
                borderRadius: 4,
                textDecoration: "none",
                letterSpacing: "0.4px",
              }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          8. FOOTER
      ══════════════════════════════════════════════════════ */}
    </>
  );
}
