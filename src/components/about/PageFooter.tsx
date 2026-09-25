"use client";

// Extracted from Closing.tsx so a new section (TeamPhoto) can sit between
// the closing content and the footer, while the footer stays the genuine
// last element on the page.
export default function PageFooter() {
  return (
    <section style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "16px", padding: "30px clamp(20px, 6vw, 80px) 40px", background: "#010203", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontFamily: "var(--font-support-new)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>© 2026 NIVILA Group</span>
      <span style={{ fontFamily: "var(--font-support-new)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>Hyderabad, India</span>
    </section>
  );
}
