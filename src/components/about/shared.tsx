"use client";
import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

// Real Nilay360 brand tokens (src/styles/globals.css) — not the reference's
// near-black/gold palette. No gold accent: the current design system is
// navy/teal only; gold in tailwind.config.ts is a leftover from a
// superseded theme, not part of the live brand.
export const NAVY = "#020C1C";
export const NAVY_ELEVATED = "#0A1526";
export const TEAL = "#10C4C3";
export const TEAL_BRIGHT = "#3DDAD9";

const EASE = [0.16, 1, 0.3, 1] as const;

// Scroll-reveal wrapper — Framer Motion `whileInView`, replacing the
// reference's IntersectionObserver + manual style mutation. `once` keeps it
// cheap (no re-observing after the first reveal).
export function Reveal({
  children, delay = 0, y = 24, className, style,
}: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Small uppercase eyebrow label — dash + text, matches the reference's
// per-section labels (e.g. "Origin", "The Question").
export function ChapterLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "clamp(30px, 3.6vw, 52px)" }}>
      <span style={{ width: "40px", height: "1px", background: "rgba(255,255,255,0.16)" }} />
      <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL }}>{children}</span>
    </div>
  );
}

// Frosted glass panel — the reference's card treatment, reconciled to real
// tokens. `lift` adds a gentle hover (translateY + border glow) — no 3D
// tilt/rotation, per the "no aggressive rotation" instruction for Leadership.
export function GlassCard({
  children, style, lift = false,
}: { children: ReactNode; style?: CSSProperties; lift?: boolean }) {
  return (
    <motion.div
      style={{
        position: "relative", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.09)", borderRadius: "16px",
        background: "linear-gradient(155deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        ...style,
      }}
      whileHover={lift ? { y: -6, borderColor: "rgba(16,196,195,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(16,196,195,0.12)" } : undefined}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Ambient background — drifting blurred glows + a faint grid, same visual
// language as the reference but trimmed to 2 blobs (not 5+ layered
// gradients/beams/particle fields) to keep this GPU-cheap on mobile.
export function AmbientBackground() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "clip" }}>
      <div className="ab-drift-a" style={{ position: "absolute", top: "-20vh", left: "-10vw", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(16,196,195,0.12), rgba(16,196,195,0) 66%)", filter: "blur(30px)" }} />
      <div className="ab-drift-b" style={{ position: "absolute", bottom: "-28vh", right: "-14vw", width: "66vw", height: "66vw", borderRadius: "50%", background: "radial-gradient(circle at 50% 50%, rgba(16,196,195,0.08), rgba(16,196,195,0) 66%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "110px 110px", maskImage: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.8), rgba(0,0,0,0) 74%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.8), rgba(0,0,0,0) 74%)" }} />
    </div>
  );
}

export const SECTION_PAD = "18vh clamp(20px, 6vw, 80px)";
