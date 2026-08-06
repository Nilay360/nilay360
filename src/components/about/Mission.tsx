"use client";
import { Reveal, TEAL } from "./shared";

// In the design reference this section was nested INSIDE the Values
// <section> tag — an editing artifact from the design tool, not intentional.
// Normalised here to its own top-level section, per the build directive.
export default function Mission() {
  return (
    <section id="ch07" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(16,196,195,0.08), rgba(16,196,195,0) 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: "1000px" }}>
        <Reveal y={12}>
          <span style={{ display: "block", marginBottom: "clamp(30px, 4vh, 52px)", fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>Our Mission</span>
        </Reveal>

        <Reveal delay={0.12} y={32}>
          <p style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(26px, 4.2vw, 68px)", lineHeight: 1.16, letterSpacing: "-0.024em", color: "#FFFFFF", textWrap: "balance" }}>
            To make finding a home feel effortless — transparent, intuitive, and worthy of the decision it carries.
          </p>
        </Reveal>

        <Reveal delay={0.5}>
          <span aria-hidden="true" style={{ display: "block", margin: "clamp(40px, 6vh, 76px) auto 0", width: "1px", height: "clamp(48px, 7vh, 84px)", background: `linear-gradient(180deg, ${TEAL}, rgba(16,196,195,0))` }} />
        </Reveal>
      </div>
    </section>
  );
}
