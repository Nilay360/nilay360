"use client";
import { Reveal, ChapterLabel, TEAL } from "./shared";

// Vanith-supplied "LOOKING AHEAD" copy — placed as this section's lede,
// ahead of the "VIEW FIRST. HOME NEXT." reprise. It's the last of the four
// missing sections; the other three (Who We Are, Why Nilay360, Our Promise)
// were placed in checkpoints 2 and 4.
const LOOKING_AHEAD = "Today, Nilay360 begins its journey in Hyderabad. Tomorrow, the vision extends across India. In the years ahead, the goal is to build one of the world's most trusted PropTech ecosystems under NIVILA Group, delivering intelligent, immersive, customer-first solutions that redefine how people experience real estate. This is only the beginning.";

export default function Closing() {
  return (
    <section id="ch11" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "clamp(26px, 3.2vw, 44px)", padding: "20vh clamp(20px, 6vw, 80px) 12vh", overflow: "clip", background: "linear-gradient(180deg, rgba(2,12,28,0) 0%, #010203 42%, #010203 100%)" }}>
      <div aria-hidden="true" style={{ position: "absolute", bottom: "-30vh", left: "50%", transform: "translateX(-50%)", width: "110vw", height: "80vh", background: "radial-gradient(ellipse at 50% 100%, rgba(16,196,195,0.11), rgba(16,196,195,0) 62%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: "680px" }}>
        <ChapterLabel>Looking Ahead</ChapterLabel>
        <Reveal>
          <p style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(17px, 1.5vw, 22px)", lineHeight: 1.7, color: "rgba(255,255,255,0.7)", textWrap: "balance" }}>{LOOKING_AHEAD}</p>
        </Reveal>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(6px, 1vw, 14px)", marginTop: "clamp(24px, 4vh, 48px)" }}>
        <Reveal>
          <h2 style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 200, fontSize: "clamp(34px, 7vw, 112px)", lineHeight: 1.0, letterSpacing: "0.02em", color: "#FFFFFF" }}>VIEW FIRST.</h2>
        </Reveal>
        <Reveal delay={0.5}>
          <h2 style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 200, fontSize: "clamp(34px, 7vw, 112px)", lineHeight: 1.0, letterSpacing: "0.02em", color: "#FFFFFF" }}>HOME NEXT.</h2>
        </Reveal>
      </div>

      <Reveal delay={0.9}>
        <img src="/brand/nilay360_logo_v2_transparent_trimmed.png" alt="Nilay360" style={{ position: "relative", height: "clamp(38px, 4.2vw, 56px)", width: "auto", display: "block" }} />
      </Reveal>
      <Reveal delay={1.1}>
        <p style={{ position: "relative", margin: 0, fontFamily: "'Cal Sans', sans-serif", fontSize: "clamp(9.5px, 0.85vw, 11px)", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>A Flagship PropTech Platform by NIVILA Group</p>
      </Reveal>
      <Reveal delay={1.3}>
        <p style={{ position: "relative", margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(18px, 2vw, 30px)", letterSpacing: "-0.01em", color: TEAL }}>Building Trust Through Technology.</p>
      </Reveal>

      {/*
        Directive left the closing CTA choice open ("let it breathe" vs real
        CTAs). Chose real CTAs, reasoning: this is a live page meant to move
        visitors into the funnel, not a pure art piece — ending the whole
        scrollytelling arc with no path forward wastes the momentum it just
        built. The reference's dead href="#" links are replaced with actual
        site routes.
      */}
      <Reveal delay={1.6}>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px", marginTop: "clamp(20px, 3vw, 40px)" }}>
          <a href="/properties" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "17px 34px", border: "1px solid transparent", borderRadius: "999px", background: TEAL, fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#020C1C", textDecoration: "none" }}>Explore Properties</a>
          <a href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "17px 34px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "999px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(14px)", fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#FFFFFF", textDecoration: "none" }}>Contact Us</a>
        </div>
      </Reveal>
    </section>
  );
}
