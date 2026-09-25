"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveStats } from "@/lib/liveStats";

// ── City directory ───────────────────────────────────────────
// Real cities Nilay 360 operates in — not fake content. Per-city listing
// counts come from a live query below; there is no fabricated avg-price,
// growth %, or "Top Pick"/"Trending" style marketing tag attached anymore.
const CITIES = [
  { slug: "hyderabad",  name: "Hyderabad",  state: "Telangana",     img: "https://images.unsplash.com/photo-1590577976322-3d2d6e2130d5?w=800&q=80" },
  { slug: "mumbai",     name: "Mumbai",     state: "Maharashtra",   img: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80" },
  { slug: "bengaluru",  name: "Bengaluru",  state: "Karnataka",     img: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80" },
  { slug: "delhi-ncr",  name: "Delhi NCR",  state: "Delhi / NCR",   img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80" },
  { slug: "chennai",    name: "Chennai",    state: "Tamil Nadu",    img: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80" },
  { slug: "pune",       name: "Pune",       state: "Maharashtra",   img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
  { slug: "kolkata",    name: "Kolkata",    state: "West Bengal",   img: "https://images.unsplash.com/photo-1558618047-f4e80bf0ab30?w=800&q=80" },
  { slug: "ahmedabad",  name: "Ahmedabad",  state: "Gujarat",       img: "https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=800&q=80" },
];

function Eyebrow({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#10C4C3", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "26px", height: "1px", background: "rgba(201,168,76,0.55)" }} />
    </div>
  );
}

export default function LocationsPage() {
  const liveStats = useLiveStats();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalListings, setTotalListings] = useState(0);
  // Distinct from "counts is empty" — an empty object during "error" must
  // never be read as "every city genuinely has zero listings" (see the
  // per-city label below, and liveStats.ts's status field for the same
  // reasoning applied to the homepage stat tiles).
  const [countsStatus, setCountsStatus] = useState<"loading" | "success" | "error">("loading");

  // Two automatic retries (0.6s, then 1.8s) before giving up — same pattern
  // as useLiveStats(), so a momentary blip here silently recovers instead of
  // showing every city as "Coming soon".
  useEffect(() => {
    let cancelled = false;
    const RETRY_DELAYS_MS = [600, 1800];

    async function attempt(n: number): Promise<void> {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("property_listings")
          .select("city")
          .eq("status", "active");
        if (error) throw error;
        const map: Record<string, number> = {};
        (data ?? []).forEach((p: { city: string | null }) => {
          const name = p.city ?? "";
          if (name) map[name] = (map[name] ?? 0) + 1;
        });
        if (!cancelled) {
          setCounts(map);
          setTotalListings((data ?? []).length);
          setCountsStatus("success");
        }
      } catch (err) {
        if (n >= RETRY_DELAYS_MS.length) {
          console.error("[LocationsPage] city counts failed after retries — showing error state, not fake zeros:", err);
          if (!cancelled) setCountsStatus("error");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[n]));
        if (!cancelled) await attempt(n + 1);
      }
    }

    attempt(0);
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .scroll-row::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .loc-pg-hero { padding: 80px 16px 48px !important; }
          .loc-pg-grid { grid-template-columns: 1fr !important; padding: 0 16px !important; gap: 16px !important; }
          .loc-pg-trending { padding: 48px 16px !important; }
          .loc-pg-scroll { gap: 12px !important; padding-bottom: 12px !important; }
          .loc-pg-market { padding: 48px 16px !important; flex-wrap: wrap !important; gap: 24px !important; justify-content: center !important; }
          .loc-pg-cta { padding: 48px 16px !important; }
          .loc-pg-footer { padding: 48px 16px 0 !important; }
          .loc-pg-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .loc-pg-grid { grid-template-columns: 1fr !important; }
          .loc-pg-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="loc-pg-hero" style={{ paddingTop: "64px", background: "#020C1C", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 70% at 85% 110%, rgba(201,168,76,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 55% at 5% -5%, rgba(45,106,79,0.24) 0%, transparent 50%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "760px", margin: "0 auto", padding: "72px 48px 80px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "24px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10C4C3" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>India-Wide Coverage</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.1, marginBottom: "18px", animation: "fadeUp 0.5s ease-out both" }}>
              Explore Properties<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Across India</em>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px", animation: "fadeUp 0.5s 0.1s ease-out both" }}>
              Premium listings in India's most sought-after cities. Verified properties, certified agents, and expert local knowledge — wherever you want to buy.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.5s 0.2s ease-out both" }}>
              {[
                ...(countsStatus === "success" ? [`${totalListings} Listings`] : []),
                `${CITIES.length} Cities`,
              ].map(p => (
                <span key={p} style={{ padding: "7px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#10C4C3", letterSpacing: "0.05em" }}>{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── CITIES GRID ────────────────────────────────────── */}
        <section style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "36px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <Eyebrow label="All Markets" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(30px, 3.8vw, 46px)", fontWeight: 400, color: "#FFFFFF" }}>
                Browse by City
              </h2>
            </div>
          </div>

          <div className="loc-pg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "22px" }}>
            {CITIES.map(city => {
              const [hover, setHover] = useState(false);
              const count = counts[city.name] ?? 0;
              return (
                <a key={city.slug} href={`/locations/${city.slug}`} style={{ textDecoration: "none", display: "block", borderRadius: "18px", overflow: "hidden", border: hover ? "2px solid #10C4C3" : "2px solid transparent", boxShadow: hover ? "0 20px 60px rgba(13,43,31,0.18)" : "0 2px 12px rgba(13,43,31,0.07)", transform: hover ? "translateY(-5px)" : "none", transition: "all 0.22s", background: "#fff" }}
                  onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                  {/* Image */}
                  <div style={{ height: "180px", position: "relative", overflow: "hidden" }}>
                    <img src={city.img} alt={city.name} style={{ width: "100%", height: "100%", objectFit: "cover", transform: hover ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.72) 0%, transparent 55%)" }} />
                    <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
                      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#020C1C", lineHeight: 1.1 }}>{city.name}</h3>
                      <p style={{ fontSize: "11px", color: "rgba(245,242,236,0.55)", marginTop: "2px" }}>{city.state}</p>
                    </div>
                  </div>
                  {/* Stats */}
                  <div style={{ padding: "18px 18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", color: "#6B7C72" }}>
                        {countsStatus !== "success" ? "—" : count > 0 ? `${count} listings` : "Coming soon"}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 14px", background: hover ? "#020C1C" : "#F8F6F1", borderRadius: "100px", fontSize: "11px", fontWeight: 700, color: hover ? "#10C4C3" : "#020C1C", letterSpacing: "0.06em", transition: "all 0.18s" }}>
                        Explore
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── MARKET OVERVIEW ────────────────────────────────── */}
        <section className="loc-pg-market" style={{ background: "#020C1C", padding: "72px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <Eyebrow label="Market Snapshot" dark />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 300, color: "#FFFFFF" }}>
                India Premium Real Estate<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Overview</em>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {[
                { value: `${totalListings}`, label: "Verified Listings", sub: "Across all cities", icon: "🏠" },
                { value: `${CITIES.length}`,  label: "Cities Covered",    sub: "And growing",       icon: "🗺" },
                liveStats.avgSalePricePerSqft !== null
                  ? { value: `₹${liveStats.avgSalePricePerSqft.toLocaleString("en-IN")}`, label: "Avg Sale Price · Hyderabad", sub: `Based on ${liveStats.avgSalePriceSampleSize} active listing${liveStats.avgSalePriceSampleSize === 1 ? "" : "s"}`, icon: "📈" }
                  : { value: "—", label: "Not enough listings yet", sub: "for a price snapshot", icon: "📈" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: "16px", padding: "32px 28px", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", marginBottom: "14px" }}>{s.icon}</div>
                  <p style={{ fontFamily: "var(--font-support-new)", fontSize: "42px", fontWeight: 600, color: "#10C4C3", lineHeight: 1, marginBottom: "8px" }}>{s.value}</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", marginBottom: "3px" }}>{s.label}</p>
                  <p style={{ fontSize: "11px", color: "rgba(245,242,236,0.35)" }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="loc-pg-cta" style={{ background: "#020C1C", padding: "80px 48px", textAlign: "center" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(30px, 4vw, 46px)", fontWeight: 400, color: "#FFFFFF", marginBottom: "14px", lineHeight: 1.2 }}>
              Can't find your city?<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>We're expanding.</em>
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.75, marginBottom: "28px" }}>
              Nilay 360 is launching in 6 new cities this year. Register your interest and be first to access listings when we go live in your city.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/contact" style={{ padding: "13px 32px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>Register Interest</a>
              <a href="/search"  style={{ padding: "13px 32px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.18)", borderRadius: "9px", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Browse All Properties</a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="loc-pg-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="loc-pg-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-support-new)", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { s: "IN", href: "https://www.instagram.com/nilay360_/" },
                    { s: "LI", href: "https://linkedin.com/company/nilay360" },
                    { s: "YT", href: "https://www.youtube.com/@nilay360.digital" },
                  ].map(({ s, href }) => (
                    <a key={s} href={href} target="_blank" rel="noopener noreferrer" aria-label={s} style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 700, textDecoration: "none" }}>{s}</a>
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
              <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.2)" }}>© 2025 Nilay 360. All rights reserved.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
