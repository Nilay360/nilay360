"use client";
import { Reveal, ChapterLabel, TEAL } from "./shared";

// Vanith-supplied "WHY NILAY360" copy. Placed immediately after Philosophy:
// Philosophy states the principle ("VIEW FIRST. HOME NEXT."), this states the
// convictions underneath it. The copy is five short declaratives, so it's set
// as a staggered rhythmic list rather than a paragraph.
const BELIEFS = [
  "Finding a property should never feel overwhelming.",
  "Technology should save time.",
  "Trust should never be optional.",
  "Every family deserves confidence before making life’s biggest investment.",
  "Real estate deserves a better experience.",
];

export default function WhyNilay360() {
  return (
    <section id="ch05b" style={{ position: "relative", padding: "16vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <div style={{ width: "100%", maxWidth: "1000px", margin: "0 auto" }}>
        <ChapterLabel>Why Nilay360</ChapterLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(14px, 1.8vw, 24px)" }}>
          {BELIEFS.map((line, i) => (
            <Reveal key={line} delay={i * 0.09} y={18}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(14px, 2vw, 24px)" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: "6px", height: "6px", marginTop: "0.6em", borderRadius: "50%", background: i === BELIEFS.length - 1 ? TEAL : "rgba(16,196,195,0.4)", boxShadow: i === BELIEFS.length - 1 ? `0 0 14px ${TEAL}` : "none" }} />
                <p style={{ margin: 0, fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(20px, 2.6vw, 40px)", lineHeight: 1.34, letterSpacing: "-0.016em", color: i === BELIEFS.length - 1 ? "#FFFFFF" : "rgba(255,255,255,0.78)" }}>{line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
