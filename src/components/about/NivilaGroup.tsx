"use client";
import { Reveal, ChapterLabel, GlassCard, TEAL } from "./shared";

export default function NivilaGroup() {
  return (
    <section id="ch04" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", padding: "18vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <div style={{ width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>The Parent</ChapterLabel>

        <Reveal>
          <h2 style={{ margin: "0 0 clamp(20px, 2.4vw, 34px)", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(36px, 6vw, 96px)", lineHeight: 1.0, letterSpacing: "-0.03em", color: "#FFFFFF" }}>NIVILA Group</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ margin: "0 0 clamp(52px, 6vw, 90px)", maxWidth: "62ch", fontSize: "clamp(15px, 1.2vw, 19px)", lineHeight: 1.9, color: "rgba(255,255,255,0.55)" }}>A technology-driven innovation company, founded in May 2026. We do not build technology for its own sake — we exist to simplify everyday experiences through thoughtful design, intelligent engineering and customer-first innovation.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(20px, 2.2vw, 30px)" }}>
          <Reveal delay={0.16} y={26}>
            <GlassCard lift style={{ height: "100%", padding: "clamp(28px, 3vw, 44px)" }}>
              <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.26em", textTransform: "uppercase", color: TEAL }}>Mission</span>
              <p style={{ margin: "22px 0 0", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(18px, 1.7vw, 26px)", lineHeight: 1.48, letterSpacing: "-0.008em", color: "rgba(255,255,255,0.92)" }}>To create intelligent digital platforms that simplify life, build trust and improve everyday experiences through technology.</p>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.26} y={26}>
            <GlassCard lift style={{ height: "100%", padding: "clamp(28px, 3vw, 44px)" }}>
              <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>Vision</span>
              <p style={{ margin: "22px 0 0", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(18px, 1.7vw, 26px)", lineHeight: 1.48, letterSpacing: "-0.008em", color: "rgba(255,255,255,0.92)" }}>To become one of India&rsquo;s leading innovation groups, building world-class products that create meaningful impact across industries.</p>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.36} y={26}>
            <GlassCard lift style={{ height: "100%", padding: "clamp(28px, 3vw, 44px)", border: "1px solid rgba(16,196,195,0.2)", background: "linear-gradient(155deg, rgba(16,196,195,0.1), rgba(255,255,255,0.012))" }}>
              <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Flagship Venture</span>
              <img src="/nilay_logo_final.png" alt="Nilay360" style={{ margin: "26px 0 0", height: "clamp(34px, 3.4vw, 46px)", width: "auto", display: "block" }} />
              <p style={{ margin: "22px 0 0", fontSize: "clamp(14px, 1.05vw, 16px)", lineHeight: 1.85, color: "rgba(255,255,255,0.52)" }}>Our first product. A next-generation PropTech platform — with further ventures to follow across the NIVILA ecosystem.</p>
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
