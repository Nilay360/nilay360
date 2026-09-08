"use client";
import { Reveal, ChapterLabel, GlassCard, TEAL } from "./shared";

const VALUES = [
  { n: "01", title: "Trust", desc: "Honest information, always. Nothing shown that we would not stand behind." },
  { n: "02", title: "Innovation", desc: "Technology applied where it removes real effort — never for novelty." },
  { n: "03", title: "Transparency", desc: "Complete detail, up front. No surprises late in a decision this large." },
  { n: "04", title: "Customer First", desc: "Every decision measured against one question: does this help the person searching?" },
  { n: "05", title: "Excellence", desc: "The same standard in Hyderabad as in every city that follows." },
];

// Vanith-supplied "OUR PROMISE" copy — placed as the closing statement of
// this section, immediately under the five values. Values are the
// commitments; the Promise is what they add up to for the person searching.
const PROMISE = "Every property we showcase, every technology we develop, every experience we design, every innovation we introduce — all serve one purpose: making finding your next home effortless.";

export default function Values() {
  return (
    <section id="ch10" style={{ position: "relative", padding: "16vh clamp(20px, 6vw, 80px) 18vh", overflow: "clip" }}>
      <div style={{ width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>What We Stand On</ChapterLabel>
        <Reveal>
          <h2 style={{ margin: "0 0 clamp(48px, 6vw, 88px)", maxWidth: "20ch", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(30px, 4.4vw, 72px)", lineHeight: 1.06, letterSpacing: "-0.026em", color: "#FFFFFF" }}>Five commitments we do not negotiate.</h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "clamp(16px, 1.8vw, 26px)", marginBottom: "clamp(56px, 7vw, 96px)" }}>
          {VALUES.map((v, i) => {
            const last = i === VALUES.length - 1;
            return (
              <Reveal key={v.n} delay={i * 0.08} y={26}>
                <GlassCard
                  lift
                  style={{
                    padding: "clamp(26px, 2.6vw, 36px) clamp(22px, 2.2vw, 30px) clamp(34px, 3.4vw, 46px)",
                    border: last ? `1px solid ${TEAL}33` : "1px solid rgba(255,255,255,0.09)",
                    background: last ? `linear-gradient(160deg, ${TEAL}13, rgba(255,255,255,0.01))` : "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
                  }}
                >
                  <span style={{ display: "block", fontFamily: "var(--font-support-new)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.24em", color: last ? TEAL : "rgba(16,196,195,0.75)" }}>{v.n}</span>
                  <h3 style={{ margin: "clamp(34px, 4vw, 54px) 0 0", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(21px, 2vw, 30px)", letterSpacing: "-0.012em", color: "#FFFFFF" }}>{v.title}</h3>
                  <p style={{ margin: "14px 0 0", fontSize: "14.5px", lineHeight: 1.8, color: "rgba(255,255,255,0.48)" }}>{v.desc}</p>
                </GlassCard>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2} y={20}>
          <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center", paddingTop: "clamp(40px, 5vw, 64px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ display: "block", marginBottom: "18px", fontFamily: "var(--font-support-new)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>Our Promise</span>
            <p style={{ margin: 0, fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(19px, 2.1vw, 30px)", lineHeight: 1.5, letterSpacing: "-0.012em", color: "rgba(255,255,255,0.92)", textWrap: "balance" }}>{PROMISE}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
