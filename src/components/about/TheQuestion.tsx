"use client";
import { Reveal, ChapterLabel, GlassCard, TEAL } from "./shared";

const PAIN_POINTS = [
  { n: "01", label: "Endless property visits" },
  { n: "02", label: "Listings that no longer exist" },
  { n: "03", label: "Decisions made without clarity" },
];

// The reference's background image-slot for this chapter was never filled
// (confirmed empty in the design bundle's saved state) — per instruction,
// no new stock photo is sourced here either. Uses an abstract gradient/grid
// treatment instead, consistent with the rest of the page's ambient system.
export default function TheQuestion() {
  return (
    <section id="ch02" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", padding: "18vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: "-10%", background: "radial-gradient(ellipse 60% 50% at 75% 40%, rgba(16,196,195,0.10) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "84px 84px", maskImage: "linear-gradient(115deg, transparent 0%, rgba(0,0,0,0.9) 55%, rgba(0,0,0,0.5) 100%)", WebkitMaskImage: "linear-gradient(115deg, transparent 0%, rgba(0,0,0,0.9) 55%, rgba(0,0,0,0.5) 100%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "1240px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(40px, 7vw, 110px)", alignItems: "center" }}>
        <div>
          <ChapterLabel>The Question</ChapterLabel>
          <Reveal>
            <p style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(24px, 2.9vw, 46px)", lineHeight: 1.22, letterSpacing: "-0.018em", color: "#FFFFFF" }}>It should have been the start of something exciting.</p>
          </Reveal>
          <Reveal delay={0.12} style={{ marginTop: "20px" }}>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.9, color: "rgba(255,255,255,0.5)", maxWidth: "42ch" }}>Instead, hours turned into days. Days turned into weeks. Listings were outdated. Information was incomplete. Every visit demanded more time, travel and uncertainty than it should have.</p>
          </Reveal>
          <div style={{ marginTop: "clamp(34px, 4vw, 56px)", display: "flex", flexDirection: "column" }}>
            {PAIN_POINTS.map((p, i) => (
              <Reveal key={p.n} delay={0.2 + i * 0.08}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "18px", padding: "15px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: i === PAIN_POINTS.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", letterSpacing: "0.2em", color: "rgba(16,196,195,0.75)", minWidth: "42px" }}>{p.n}</span>
                  <span style={{ fontFamily: "'Cal Sans', sans-serif", fontWeight: 300, fontSize: "clamp(16px, 1.4vw, 21px)", color: "rgba(255,255,255,0.82)" }}>{p.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2} y={34}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "-14% -10%", background: "radial-gradient(circle at 50% 50%, rgba(16,196,195,0.16), rgba(16,196,195,0) 68%)", filter: "blur(24px)", pointerEvents: "none" }} />
            <GlassCard style={{ position: "relative", padding: "clamp(32px, 4vw, 58px) clamp(26px, 3.4vw, 50px)", boxShadow: "0 40px 90px rgba(0,0,0,0.45)" }}>
              <span aria-hidden="true" style={{ display: "block", fontFamily: "'Cal Sans', Georgia, serif", fontSize: "54px", lineHeight: 0.6, color: "rgba(16,196,195,0.4)" }}>&ldquo;</span>
              <p style={{ margin: "20px 0 0", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(21px, 2.1vw, 34px)", lineHeight: 1.38, letterSpacing: "-0.012em", color: "#FFFFFF" }}>Why should finding a home require so much effort, when technology can help people experience it first?</p>
              <div style={{ marginTop: "clamp(24px, 3vw, 38px)", display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ width: "30px", height: "1px", background: TEAL }} />
                <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>Early 2026 · Hyderabad</span>
              </div>
            </GlassCard>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
