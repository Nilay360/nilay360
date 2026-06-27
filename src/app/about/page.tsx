"use client";
import { useState, useEffect, useRef } from "react";

// ── Counter animation hook ────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ── Intersection observer hook ────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Stat counter item ─────────────────────────────────────────
function StatItem({ target, suffix, prefix, label, inView }: { target: number; suffix?: string; prefix?: string; label: string; inView: boolean }) {
  const count = useCountUp(target, 1800, inView);
  return (
    <div style={{ textAlign: "center", flex: "1 1 0", padding: "0 16px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(40px, 5vw, 60px)", fontWeight: 600, color: "#2BA8E0", lineHeight: 1, marginBottom: "8px" }}>
        {prefix}{count.toLocaleString("en-IN")}{suffix}
      </div>
      <div style={{ fontSize: "13px", color: "rgba(245,242,236,0.5)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function AboutPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { ref: statsRef, inView: statsInView } = useInView(0.3);

  const TEAM = [
    { initials: "VK", name: "Vanith K", role: "Founder & CEO", bio: "A serial entrepreneur with 12+ years in Indian real estate, Vanith founded Nilay 360 to bring transparency and trust to premium property transactions across India.", color: "#2BA8E0" },
    { initials: "AR", name: "Ankit Rao", role: "Head of Technology", bio: "Ex-Google engineer with a passion for proptech. Ankit leads Nilay 360's engineering team, building the infrastructure that powers India's fastest growing real estate platform.", color: "#4A90D9" },
    { initials: "SN", name: "Swapna Nair", role: "Head of Operations", bio: "Former McKinsey consultant, Swapna oversees Nilay 360's operations across all cities — ensuring every listing, every agent, and every transaction meets our gold standard.", color: "#7C3AED" },
    { initials: "RK", name: "Rohan Kumar", role: "Head of Agent Relations", bio: "With a decade of real estate brokerage experience, Rohan builds Nilay 360's network of verified agents and ensures every professional on our platform is truly the best in their city.", color: "#059669" },
  ];

  const FEATURES = [
    { icon: "✓", title: "Verified Listings Only", desc: "Every property on Nilay 360 is manually verified by our ground team — no ghost listings, no misleading photos, no incorrect prices." },
    { icon: "⚖", title: "RERA Certified Agents", desc: "All agents on Nilay 360 are RERA registered and background-checked. You deal only with licensed professionals who answer to regulation." },
    { icon: "📋", title: "Legal Due Diligence", desc: "Our in-house legal team reviews title documents, encumbrance certificates, and builder credentials before any listing goes live." },
    { icon: "✈", title: "NRI Concierge Service", desc: "Dedicated NRI advisors handle everything remotely — from virtual tours and POA assistance to repatriation and FEMA compliance." },
    { icon: "📊", title: "Market Intelligence", desc: "Real-time micro-market data, price history, rental yield analysis, and neighbourhood insights — so you always buy with confidence." },
    { icon: "💬", title: "WhatsApp Native", desc: "Connect with agents, receive alerts, and schedule visits directly on WhatsApp. Premium real estate, zero friction." },
  ];

  const AWARDS = [
    { icon: "🏛", label: "RERA Compliant Platform", sub: "All 13 RERA jurisdictions" },
    { icon: "🏆", label: "Best PropTech Startup", sub: "India PropTech Awards 2025" },
    { icon: "✅", label: "ISO 27001 Certified", sub: "Data security & privacy" },
    { icon: "⭐", label: "Google Verified Business", sub: "4.9 / 5 · 2,400+ reviews" },
  ];

  const TESTIMONIALS = [
    { quote: "Nilay 360 made buying our first home in Jubilee Hills a genuinely pleasant experience. Our advisor knew every lane and helped us avoid two developers with pending litigations. Couldn't have done it without them.", name: "Priya & Karthik M.", role: "Home buyers, Jubilee Hills", initials: "PK" },
    { quote: "As an NRI buying from Dubai, I was nervous about the process. Nilay 360 assigned a dedicated advisor who handled everything — virtual tours, legal checks, POA, even interior referrals. Completely seamless.", name: "Suresh Nambiar", role: "NRI buyer, Gachibowli Villa", initials: "SN" },
    { quote: "I've worked with several portals as a seller. Nilay 360 is the only one where I felt my listing was being handled with the same care I give it. Serious buyers only, no time-wasters.", name: "Meera Agarwal", role: "Property owner, Banjara Hills", initials: "MA" },
  ];

  const TIMELINE = [
    { year: "2024", label: "Nilay 360 Founded", detail: "Launched in Hyderabad with a mission to bring integrity to premium real estate." },
    { year: "2024", label: "First 100 Listings", detail: "Achieved 100 verified premium listings within 90 days of launch." },
    { year: "2025", label: "5 City Expansion", detail: "Expanded to Mumbai, Bengaluru, Chennai, and Pune with dedicated city teams." },
    { year: "2025", label: "500+ Agents", detail: "Built India's most trusted network of RERA-certified premium agents." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
        @media (max-width: 768px) {
          .ab-hero { padding: 56px 16px 64px !important; }
          .ab-story { padding: 56px 16px !important; }
          .ab-story-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ab-mission { padding: 56px 16px !important; }
          .ab-mission-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .ab-why { padding: 56px 16px !important; }
          .ab-why-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .ab-stats { padding: 56px 16px !important; flex-wrap: wrap !important; gap: 24px !important; }
          .ab-team { padding: 56px 16px !important; }
          .ab-team-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .ab-awards { padding: 48px 16px !important; }
          .ab-awards-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .ab-testimonials { padding: 56px 16px !important; }
          .ab-testimonials-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .ab-cta { padding: 56px 16px !important; }
          .ab-footer { padding: 48px 16px 0 !important; }
          .ab-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .ab-why-grid { grid-template-columns: 1fr !important; }
          .ab-team-grid { grid-template-columns: 1fr !important; }
          .ab-awards-grid { grid-template-columns: 1fr !important; }
          .ab-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000" }}>

        {/* ── 1. HERO ─────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#000000", minHeight: "520px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          {/* Grid pattern */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
          {/* Radial glows */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 70% at 90% 110%, rgba(201,168,76,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 55% at 5% 0%, rgba(45,106,79,0.25) 0%, transparent 50%)" }} />
          <div className="ab-hero" style={{ position: "relative", zIndex: 2, maxWidth: "900px", margin: "0 auto", padding: "80px 48px 90px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "28px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#2BA8E0", boxShadow: "0 0 6px rgba(201,168,76,0.6)" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#2BA8E0", textTransform: "uppercase" }}>About Nilay 360</span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(36px, 5.5vw, 66px)", fontWeight: 300, color: "#000000", lineHeight: 1.12, marginBottom: "18px", animation: "fadeUp 0.6s ease-out both" }}>
              India's Most Trusted<br />Premium Real Estate Platform
            </h1>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(20px, 2.5vw, 28px)", fontStyle: "italic", fontWeight: 400, color: "#2BA8E0", marginBottom: "22px", animation: "fadeUp 0.6s 0.1s ease-out both" }}>
              "Your Trust. Our Promise."
            </p>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.55)", lineHeight: 1.8, maxWidth: "600px", margin: "0 auto 36px", animation: "fadeUp 0.6s 0.2s ease-out both" }}>
              Nilay 360 was built on a conviction that India's premium property buyers deserve more — more transparency, more expertise, and more integrity than the market has historically provided.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s ease-out both" }}>
              {["Est. 2024", "Hyderabad, India"].map(pill => (
                <span key={pill} style={{ padding: "8px 20px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "#2BA8E0", letterSpacing: "0.08em" }}>{pill}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. COMPANY STORY ────────────────────────────────── */}
        <section className="ab-story" style={{ background: "#000000", padding: "100px 48px" }}>
          <div className="ab-story-grid" style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            {/* Text */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                <div style={{ width: "32px", height: "1.5px", background: "#2BA8E0" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Our Story</span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px, 4vw, 52px)", fontWeight: 400, color: "#000000", lineHeight: 1.15, marginBottom: "28px" }}>
                Born From a<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Simple Belief</em>
              </h2>
              <p style={{ fontSize: "15px", color: "#4B5563", lineHeight: 1.8, marginBottom: "18px" }}>
                Nilay 360 was founded in 2024 with a straightforward conviction: India's most discerning property buyers deserved a platform that matched their standards. The existing market — fragmented, opaque, riddled with unverified listings and unqualified agents — was failing them.
              </p>
              <p style={{ fontSize: "15px", color: "#4B5563", lineHeight: 1.8, marginBottom: "18px" }}>
                Starting in Hyderabad, we built from first principles. Every listing manually verified. Every agent background-checked and RERA-certified. Every piece of market data sourced from real transactions. Within three months we had 100 listings — and a waitlist of agents who wanted to join a platform that actually cared about quality.
              </p>
              <p style={{ fontSize: "15px", color: "#4B5563", lineHeight: 1.8, marginBottom: "40px" }}>
                Today Nilay 360 operates across 14 cities, has facilitated over ₹18,000 crore in property transactions, and has become the benchmark for what premium real estate looks like in India. We're just getting started.
              </p>
              {/* Timeline */}
              <div style={{ borderLeft: "2px solid rgba(201,168,76,0.3)", paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "0" }}>
                {TIMELINE.map((t, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: i < TIMELINE.length - 1 ? "24px" : "0" }}>
                    <div style={{ position: "absolute", left: "-32px", top: "4px", width: "12px", height: "12px", borderRadius: "50%", background: "#2BA8E0", border: "2.5px solid #000000", boxShadow: "0 0 0 2px rgba(201,168,76,0.3)" }} />
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#2BA8E0", letterSpacing: "0.05em", whiteSpace: "nowrap", marginTop: "2px", minWidth: "36px" }}>{t.year}</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#000000", marginBottom: "2px" }}>{t.label}</div>
                        <div style={{ fontSize: "12px", color: "#6B7C72", lineHeight: 1.55 }}>{t.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Image placeholder */}
            <div style={{ position: "relative" }}>
              <div style={{ borderRadius: "20px", overflow: "hidden", aspectRatio: "4/5", position: "relative", boxShadow: "0 32px 80px rgba(13,43,31,0.18)" }}>
                <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80" alt="Nilay 360 office" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,43,31,0.6) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: "28px", left: "28px", right: "28px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, color: "#000000", lineHeight: 1.3 }}>
                    "Premium real estate deserves a premium experience — from first search to final signature."
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "rgba(245,242,236,0.5)" }}>— Vanith K, Founder & CEO</div>
                </div>
              </div>
              {/* Floating badge */}
              <div style={{ position: "absolute", top: "28px", right: "-20px", background: "#2BA8E0", borderRadius: "14px", padding: "18px 22px", textAlign: "center", boxShadow: "0 12px 40px rgba(201,168,76,0.35)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 600, color: "#000000", lineHeight: 1 }}>14</div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#000000", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "4px" }}>Cities</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. MISSION & VISION ─────────────────────────────── */}
        <section className="ab-mission" style={{ background: "#000000", padding: "100px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Purpose & Direction</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 300, color: "#000000", lineHeight: 1.15 }}>
                Why We Exist
              </h2>
            </div>
            <div className="ab-mission-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {[
                {
                  label: "Our Mission", sub: "What We Do Today",
                  icon: "◎",
                  text: "To simplify India's premium property market by connecting serious buyers with verified listings, certified agents, and independent legal guidance — removing uncertainty at every step of the transaction.",
                  accent: "#2BA8E0",
                },
                {
                  label: "Our Vision", sub: "Where We're Going",
                  icon: "◈",
                  text: "To become the most trusted real estate platform in India — the name every premium buyer, NRI investor, and luxury developer thinks of first when quality, integrity, and expertise matter most.",
                  accent: "rgba(201,168,76,0.6)",
                },
              ].map(card => (
                <div key={card.label} style={{ background: "rgba(245,242,236,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "20px", padding: "44px 40px" }}>
                  <div style={{ fontSize: "28px", color: card.accent, marginBottom: "20px" }}>{card.icon}</div>
                  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(201,168,76,0.55)", textTransform: "uppercase", marginBottom: "8px" }}>{card.label}</div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 500, color: "#000000", marginBottom: "18px", lineHeight: 1.2 }}>{card.sub}</h3>
                  <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.55)", lineHeight: 1.8 }}>{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. WHY CHOOSE Nilay 360 ────────────────────────────── */}
        <section className="ab-why" style={{ background: "#000000", padding: "100px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>The Nilay 360 Difference</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#000000", lineHeight: 1.15 }}>
                Why Discerning Buyers<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Choose Nilay 360</em>
              </h2>
            </div>
            <div className="ab-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {FEATURES.map((f, i) => {
                const [hover, setHover] = useState(false);
                return (
                  <div key={i}
                    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                    style={{ background: hover ? "#000000" : "#fff", border: "1px solid rgba(13,43,31,0.08)", borderRadius: "16px", padding: "34px 30px", transition: "all 0.25s", cursor: "default", boxShadow: hover ? "0 24px 60px rgba(13,43,31,0.18)" : "0 1px 6px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "translateY(0)" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: hover ? "rgba(201,168,76,0.15)" : "rgba(13,43,31,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", marginBottom: "20px", transition: "background 0.25s" }}>{f.icon}</div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: hover ? "#000000" : "#000000", marginBottom: "10px", transition: "color 0.25s" }}>{f.title}</h3>
                    <p style={{ fontSize: "13px", color: hover ? "rgba(245,242,236,0.55)" : "#6B7C72", lineHeight: 1.75, transition: "color 0.25s" }}>{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 5. STATS ────────────────────────────────────────── */}
        <section className="ab-stats" style={{ background: "#000000", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(45,106,79,0.2) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div ref={statsRef} style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(30px, 3.5vw, 46px)", fontWeight: 300, color: "#000000" }}>
                The Numbers Behind<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Our Promise</em>
              </h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "48px 0" }}>
              <StatItem target={2400}   suffix="+"          label="Verified Properties" inView={statsInView} />
              <div style={{ width: "1px", background: "rgba(201,168,76,0.15)", margin: "0 8px" }} />
              <StatItem target={500}    suffix="+"          label="Certified Agents"    inView={statsInView} />
              <div style={{ width: "1px", background: "rgba(201,168,76,0.15)", margin: "0 8px" }} />
              <StatItem target={14}                         label="Cities"              inView={statsInView} />
              <div style={{ width: "1px", background: "rgba(201,168,76,0.15)", margin: "0 8px" }} />
              <StatItem target={98}     suffix="%"          label="Client Satisfaction" inView={statsInView} />
              <div style={{ width: "1px", background: "rgba(201,168,76,0.15)", margin: "0 8px" }} />
              <StatItem target={18000}  suffix="Cr" prefix="₹" label="Deals Facilitated" inView={statsInView} />
            </div>
          </div>
        </section>

        {/* ── 6. LEADERSHIP TEAM ──────────────────────────────── */}
        <section className="ab-team" style={{ background: "#000000", padding: "100px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>The People Behind Nilay 360</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#000000", lineHeight: 1.15 }}>
                Leadership Team
              </h2>
              <p style={{ fontSize: "15px", color: "#6B7C72", marginTop: "14px", maxWidth: "500px", margin: "14px auto 0", lineHeight: 1.7 }}>
                Experienced operators, technologists, and real estate professionals united by a single standard: excellence.
              </p>
            </div>
            <div className="ab-team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
              {TEAM.map((m, i) => {
                const [hover, setHover] = useState(false);
                return (
                  <div key={i}
                    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                    style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "36px 24px 28px", textAlign: "center", boxShadow: hover ? "0 20px 50px rgba(13,43,31,0.1)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-5px)" : "translateY(0)", transition: "all 0.25s" }}>
                    <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}22, ${m.color}44)`, border: `2px solid ${m.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 600, color: m.color, margin: "0 auto 18px", letterSpacing: "0.05em", transition: "all 0.25s", ...(hover ? { background: `linear-gradient(135deg, ${m.color}44, ${m.color}66)`, transform: "scale(1.06)" } : {}) }}>{m.initials}</div>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#000000", marginBottom: "4px" }}>{m.name}</h3>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#2BA8E0", textTransform: "uppercase", marginBottom: "14px" }}>{m.role}</p>
                    <p style={{ fontSize: "12.5px", color: "#6B7C72", lineHeight: 1.7 }}>{m.bio}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 7. AWARDS & CERTIFICATIONS ──────────────────────── */}
        <section className="ab-awards" style={{ background: "#fff", padding: "80px 48px", borderTop: "1px solid rgba(13,43,31,0.06)", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Recognition & Trust</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: "#000000" }}>
                Awards & Certifications
              </h2>
            </div>
            <div className="ab-awards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
              {AWARDS.map((a, i) => (
                <div key={i} style={{ background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", marginBottom: "14px", filter: "grayscale(0)" }}>{a.icon}</div>
                  <h4 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 600, color: "#000000", marginBottom: "6px", lineHeight: 1.25 }}>{a.label}</h4>
                  <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{a.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. TESTIMONIALS ─────────────────────────────────── */}
        <section className="ab-testimonials" style={{ background: "#000000", padding: "100px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Client Stories</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(30px, 3.8vw, 48px)", fontWeight: 400, color: "#000000" }}>
                Trusted by Thousands
              </h2>
            </div>
            <div className="ab-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "36px 32px" }}>
                  <div style={{ fontSize: "36px", fontFamily: "Georgia, serif", color: "#2BA8E0", lineHeight: 0.9, marginBottom: "18px", opacity: 0.7 }}>"</div>
                  <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.8, fontStyle: "italic", marginBottom: "24px" }}>{t.quote}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.4))", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#2BA8E0", flexShrink: 0 }}>{t.initials}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. CTA ──────────────────────────────────────────── */}
        <section className="ab-cta" style={{ background: "#000000", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 120%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px, 5vw, 58px)", fontWeight: 300, color: "#000000", lineHeight: 1.15, marginBottom: "16px" }}>
              Join Thousands of<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Satisfied Clients</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px" }}>
              Whether you're buying, selling, investing, or renting — Nilay 360 gives you the expertise, the data, and the integrity to make the right decision with complete confidence.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/properties" style={{ padding: "14px 36px", background: "#2BA8E0", border: "none", borderRadius: "9px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Browse Properties
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="mailto:hello@nilay360.com" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Contact Us
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="ab-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="ab-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#2BA8E0" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's most trusted premium real estate platform. Verified listings, certified agents, independent legal guidance.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["IN", "LI", "TW", "YT"].map(s => (
                    <div key={s} style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 700, cursor: "pointer" }}>{s}</div>
                  ))}
                </div>
              </div>
              {[
                { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
                { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
                { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]] },
                { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"]] },
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
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", color: "rgba(201,168,76,0.5)" }}>RERA COMPLIANT</span>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: "4px", color: "rgba(245,242,236,0.25)" }}>ISO 27001</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
