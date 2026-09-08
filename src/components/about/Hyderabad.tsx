"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, ChapterLabel, TEAL } from "./shared";

// Stylised, non-geographic map — a CSS/DOM composition, not an embedded map
// tile. Positions carried over from the approved design reference.
const CITIES = [
  { name: "Delhi NCR", left: "30%", top: "20%" },
  { name: "Mumbai", left: "17%", top: "63%" },
  { name: "Pune", left: "26%", top: "55%" },
  { name: "Bengaluru", left: "38%", top: "79%" },
  { name: "Chennai", left: "50%", top: "88%" },
];

const HOME = { left: "44%", top: "62%" };

// Real dates from the design reference's own timeline — May 2026 founding
// through the Aug 2026 launch, then forward-looking.
const TIMELINE = [
  { when: "MAY 2026", what: "NIVILA Group founded", accent: true },
  { when: "JUN 2026", what: "Research & planning", accent: false },
  { when: "JUL 2026", what: "Design & development", accent: false },
  { when: "AUG 2026", what: "NILAY360 launch", accent: true },
  { when: "NEXT", what: "Expansion across India", accent: false },
];

function PulseRings() {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${TEAL}` }} />;
  }
  return (
    <>
      {[0, 1.2].map(delay => (
        <motion.span
          key={delay}
          aria-hidden="true"
          initial={{ scale: 1, opacity: 0.55 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 3.6, repeat: Infinity, delay, ease: "easeOut" }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${TEAL}` }}
        />
      ))}
    </>
  );
}

export default function Hyderabad() {
  return (
    <section id="ch08" style={{ position: "relative", padding: "16vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <style>{`
        .ab-tl { display: grid; grid-template-columns: 1fr; border-top: 1px solid rgba(255,255,255,0.1); }
        .ab-tl-cell { padding: clamp(24px, 3vw, 40px) 0; border-top: 1px solid rgba(255,255,255,0.07); }
        .ab-tl-cell:first-child { border-top: none; }
        @media (min-width: 760px) {
          .ab-tl { grid-template-columns: repeat(5, 1fr); }
          .ab-tl-cell { padding: clamp(26px, 3vw, 40px) clamp(14px, 1.6vw, 24px); border-top: none; border-right: 1px solid rgba(255,255,255,0.07); }
          .ab-tl-cell:first-child { padding-left: 0; }
          .ab-tl-cell:last-child { border-right: none; padding-right: 0; }
        }
      `}</style>

      <div style={{ position: "relative", width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>Chapter One</ChapterLabel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(40px, 6vw, 96px)", alignItems: "center", marginBottom: "clamp(70px, 9vw, 130px)" }}>
          <div>
            <Reveal>
              <h2 style={{ margin: "0 0 clamp(24px, 3vw, 40px)", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(32px, 5vw, 84px)", lineHeight: 1.02, letterSpacing: "-0.03em", color: "#FFFFFF" }}>Hyderabad.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ margin: "0 0 22px", maxWidth: "46ch", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(18px, 1.75vw, 27px)", lineHeight: 1.5, letterSpacing: "-0.008em", color: "rgba(255,255,255,0.9)" }}>This is where our story began.</p>
            </Reveal>
            <Reveal delay={0.18}>
              <p style={{ margin: 0, maxWidth: "48ch", fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.9, color: "rgba(255,255,255,0.54)" }}>It is where our founders lived the frustration that inspired NILAY360. Before expanding across India, we want to solve the problem completely in the city that inspired us — and carry that standard everywhere else.</p>
            </Reveal>
          </div>

          <Reveal delay={0.14} y={34}>
            <div>
              <div style={{ position: "relative", aspectRatio: "16 / 11", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "clip", background: "#080B0F", boxShadow: "0 50px 110px rgba(0,0,0,0.55)" }}>
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
                <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${HOME.left} ${HOME.top}, rgba(16,196,195,0.2), rgba(16,196,195,0) 58%)` }} />

                {/* Phase-one cities — present but deliberately quiet. */}
                {CITIES.map(c => (
                  <span key={c.name} style={{ position: "absolute", left: c.left, top: c.top, fontFamily: "var(--font-support-new)", fontSize: "9.5px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>· {c.name}</span>
                ))}

                {/* Hyderabad — the anchor point. */}
                <div style={{ position: "absolute", left: HOME.left, top: HOME.top, width: "10px", height: "10px", margin: "-5px 0 0 -5px" }}>
                  <PulseRings />
                  <span style={{ position: "absolute", inset: "2.5px", borderRadius: "50%", background: TEAL, boxShadow: `0 0 20px ${TEAL}` }} />
                </div>
                <span style={{ position: "absolute", left: HOME.left, top: HOME.top, margin: "16px 0 0 -4px", fontFamily: "var(--font-support-new)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FFFFFF", whiteSpace: "nowrap" }}>Hyderabad</span>
              </div>
              <p style={{ margin: "16px 0 0", fontFamily: "var(--font-support-new)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: TEAL }}>Full service in Hyderabad · rentals in phase-one cities</p>
            </div>
          </Reveal>
        </div>

        <div className="ab-tl">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.when} delay={i * 0.09} y={20} className="ab-tl-cell">
              <span style={{ display: "block", fontFamily: "var(--font-support-new)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.22em", color: t.accent ? TEAL : "rgba(255,255,255,0.38)" }}>{t.when}</span>
              <span style={{ display: "block", marginTop: "14px", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(16px, 1.35vw, 21px)", lineHeight: 1.35, color: t.accent ? "#FFFFFF" : "rgba(255,255,255,0.88)" }}>{t.what}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
