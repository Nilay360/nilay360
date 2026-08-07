"use client";
import { Reveal } from "./shared";

// Closing team photo — placed after Closing's main content, before the
// footer. Uses the branded version (Nilay360 logo + tagline already
// composited into the image) deliberately: at the very end of the page,
// after the full emotional arc, showing the team alongside the brand reads
// as "this is us, and this is our brand" rather than undercutting the
// founding-story moment the way the same treatment would in Origin.
export default function TeamPhoto() {
  return (
    <section id="ch12" style={{ position: "relative", padding: "0 clamp(20px, 6vw, 80px) clamp(64px, 9vh, 120px)", background: "#010203", overflow: "clip" }}>
      <Reveal y={30}>
        <div style={{ width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: "16px", overflow: "clip", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 40px 100px rgba(0,0,0,0.5)" }}>
            <img
              src="/team/founding-team-closing.webp"
              alt="The Nilay360 founding team"
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
