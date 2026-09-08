"use client";
import { Reveal, ChapterLabel, TEAL } from "./shared";

// The reference's photo for this section (a rendered interior) had the
// current Nilay360 logo baked into the image itself — a compositing
// artifact, not a usable photo. Rather than source a new stock photo, this
// uses an abstract architectural-line treatment built from the page's own
// gradient/grid system — distinct from The Question's treatment so the two
// non-photographic sections don't read as identical.
function OriginMark() {
  return (
    <div style={{ position: "relative", aspectRatio: "4 / 5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", overflow: "hidden", background: "linear-gradient(155deg, #0A1526 0%, #020C1C 60%, #050709 100%)", boxShadow: "0 50px 110px rgba(0,0,0,0.55)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "38px 38px" }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 70%, rgba(16,196,195,0.22), rgba(16,196,195,0) 60%)" }} />
      <svg viewBox="0 0 200 250" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} preserveAspectRatio="none">
        <path d="M0 250 L0 140 L60 90 L140 90 L200 140 L200 250" fill="none" stroke="rgba(16,196,195,0.4)" strokeWidth="1" />
        <path d="M30 250 L30 160 L100 110 L170 160 L170 250" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="100" y1="110" x2="100" y2="250" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,12,28,0.1), rgba(2,12,28,0.6))" }} />
    </div>
  );
}

export default function Origin() {
  return (
    <section id="ch03" style={{ position: "relative", padding: "18vh clamp(20px, 6vw, 80px) 16vh", overflow: "clip" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>Origin</ChapterLabel>
        <Reveal>
          <h2 style={{ margin: "0 0 clamp(44px, 5.5vw, 90px)", maxWidth: "20ch", fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(30px, 4.4vw, 72px)", lineHeight: 1.06, letterSpacing: "-0.026em", color: "#FFFFFF" }}>Born from a real experience, not a business idea.</h2>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "clamp(40px, 6vw, 96px)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(22px, 2.4vw, 32px)" }}>
            <Reveal delay={0.06}>
              <p style={{ margin: 0, fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.95, color: "rgba(255,255,255,0.56)" }}>In early 2026, during a corporate relocation, one of our founders and their family faced the challenge millions of people meet every year — finding the right home.</p>
            </Reveal>
            <Reveal delay={0.14}>
              <p style={{ margin: 0, fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.95, color: "rgba(255,255,255,0.56)" }}>Despite the number of platforms available, the process remained complicated and inefficient. Eventually, with the support of trusted friends, the family found the right place to call home. But one question remained.</p>
            </Reveal>
            <Reveal delay={0.22}>
              <p style={{ margin: 0, fontSize: "clamp(15px, 1.15vw, 18px)", lineHeight: 1.95, color: "rgba(255,255,255,0.56)" }}>That question sparked a larger vision. Soon after, four individuals came together with a shared purpose: to build technology that solves real-world problems through innovation, simplicity and trust.</p>
            </Reveal>
            <Reveal delay={0.3}>
              <p style={{ margin: 0, paddingLeft: "clamp(18px, 2vw, 28px)", borderLeft: `1px solid ${TEAL}80`, fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(19px, 1.9vw, 28px)", lineHeight: 1.44, letterSpacing: "-0.008em", color: "rgba(255,255,255,0.94)" }}>In May 2026 they founded NIVILA Group. The first product born from that vision became NILAY360.</p>
            </Reveal>
          </div>

          <Reveal delay={0.18} y={34}>
            <div>
              <OriginMark />
              <p style={{ margin: "16px 0 0", fontFamily: "var(--font-support-new)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: TEAL }}>A home should be felt before it is found</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
