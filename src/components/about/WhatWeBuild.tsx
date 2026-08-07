"use client";
import { Reveal, ChapterLabel, TEAL } from "./shared";

const AVAILABLE_NOW = [
  "Property Buying",
  "Property Selling",
  "Rental Listings",
  "Verified Property Information",
  "Smart Property Search",
  "Responsive Mobile Experience",
];

const ON_THE_HORIZON = [
  "360° Virtual Property Tours",
  "Virtual Reality Viewing",
  "AI Property Recommendations",
  "Interactive Floor Plans",
  "Smart Property Comparison",
  "Drone Property Showcase",
  "Property Analytics",
];

function FeatureList({ items, muted }: { items: string[]; muted: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, i) => (
        <Reveal key={item} delay={0.06 + i * 0.05} y={12}>
          <div style={{
            padding: "17px 0",
            borderTop: `1px solid ${muted ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.08)"}`,
            borderBottom: i === items.length - 1 ? `1px solid ${muted ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.08)"}` : "none",
            fontFamily: "'Cal Sans', sans-serif", fontWeight: 300,
            fontSize: "clamp(16px, 1.45vw, 22px)",
            color: muted ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.9)",
          }}>{item}</div>
        </Reveal>
      ))}
    </div>
  );
}

export default function WhatWeBuild() {
  return (
    <section id="ch06" style={{ position: "relative", padding: "18vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <div style={{ width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>The Platform</ChapterLabel>

        <Reveal>
          <h2 style={{ margin: "0 0 clamp(26px, 3vw, 40px)", maxWidth: "24ch", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(30px, 4.4vw, 72px)", lineHeight: 1.06, letterSpacing: "-0.026em", color: "#FFFFFF" }}>An immersive property experience, before you ever visit.</h2>
        </Reveal>

        {/* Vanith-supplied "WHO WE ARE" copy — placed here as the platform
            section's lede, since it defines what Nilay360 is before the
            feature lists say what it does. */}
        <Reveal delay={0.1}>
          <p style={{ margin: "0 0 clamp(48px, 6vw, 92px)", maxWidth: "68ch", fontSize: "clamp(15px, 1.2vw, 19px)", lineHeight: 1.9, color: "rgba(255,255,255,0.55)" }}>
            Nilay360 is more than a property portal — it is a technology company building smarter real estate experiences through immersive technology, verified information, intuitive design and customer-first thinking, helping people make confident property decisions. Every feature exists to make property discovery effortless.
          </p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(40px, 5.5vw, 88px)" }}>
          <div>
            <Reveal y={14}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "26px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: TEAL, boxShadow: `0 0 14px ${TEAL}` }} />
                <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>Available Now</span>
              </div>
            </Reveal>
            <FeatureList items={AVAILABLE_NOW} muted={false} />
          </div>

          <div>
            <Reveal y={14} delay={0.08}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "26px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", border: "1px solid rgba(16,196,195,0.6)" }} />
                <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>On The Horizon</span>
              </div>
            </Reveal>
            <FeatureList items={ON_THE_HORIZON} muted />
          </div>
        </div>
      </div>
    </section>
  );
}
