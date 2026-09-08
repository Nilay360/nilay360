"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TEAL } from "./shared";

// Mouse-reactive tilt on the logo/headline group — spring-smoothed, capped to
// a subtle range (matches the reference's `data-tilt` effect, minus the raw
// per-frame style mutation). Disabled under prefers-reduced-motion.
function useTilt(strength = 10) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [strength * 0.5, -strength * 0.5]), { stiffness: 60, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-strength, strength]), { stiffness: 60, damping: 20 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX / window.innerWidth - 0.5);
      y.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return { rotateX: rx, rotateY: ry };
}

function Particles() {
  const [dots, setDots] = useState<{ left: number; delay: number; dur: number; gold: boolean }[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setDots(Array.from({ length: 22 }, () => ({
      left: Math.random() * 100,
      delay: -Math.random() * 20,
      dur: 16 + Math.random() * 16,
      gold: Math.random() < 0.15,
    })));
  }, []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "clip", pointerEvents: "none" }}>
      {dots.map((d, i) => (
        <span key={i} className="ab-particle" style={{
          position: "absolute", left: `${d.left}%`, bottom: "-6vh", width: "2.4px", height: "2.4px",
          borderRadius: "50%", background: d.gold ? "rgba(255,255,255,0.7)" : "rgba(16,196,195,0.6)",
          animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s`,
        }} />
      ))}
    </div>
  );
}

export default function Hero() {
  const tilt = useTilt(9);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <section id="ch01" ref={ref} style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20vh clamp(20px, 6vw, 80px) 14vh", overflow: "clip" }}>
      {/*
        Entrance reveals below are CSS keyframes, not Framer Motion
        initial/animate. Framer Motion renders its `initial` state during SSR
        too — the hero logo (this page's actual LCP element, confirmed via
        Lighthouse) would ship the server HTML at opacity:0 and stay invisible
        until React hydrates AND Framer Motion's effect fires, which is gated
        behind the whole JS bundle (gsap+framer-motion+lenis) finishing
        execution. That measured as a 2.77s LCP render delay. CSS keyframe
        animations run on the compositor from first paint, independent of
        hydration — the infinite float/tilt/particle loops stay on Framer
        Motion since those don't affect first-paint visibility.
      */}
      <style>{`
        @keyframes ab-hero-in { from { opacity: 0; transform: translateY(var(--rise, 20px)) scale(var(--zoom, 1)); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ab-hero-reveal { opacity: 0; animation: ab-hero-in 1s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ab-hero-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <Particles />
      <motion.div
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(26px, 3.4vw, 46px)", maxWidth: "1180px", perspective: 1400, rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
      >
        <div className="ab-hero-reveal" style={{ animationDelay: "0s", "--rise": "22px", "--zoom": "0.96" } as React.CSSProperties}>
          <motion.img
            src="/brand/nilay360_logo_v2_transparent_trimmed.png"
            alt="Nilay360"
            animate={{ y: [-9, 9, -9] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            style={{ height: "170px", width: "auto", display: "block", filter: `drop-shadow(0 18px 60px rgba(16,196,195,0.34))` }}
          />
        </div>

        <h1
          className="ab-hero-reveal"
          style={{ animationDelay: "0.15s", margin: 0, fontFamily: "var(--font-heading-new)", fontWeight: 300, fontSize: "clamp(38px, 6.8vw, 108px)", lineHeight: 1.04, letterSpacing: "-0.026em", color: "#FFFFFF" }}
        >
          The Future of Real Estate<br />Begins Here.
        </h1>

        <div
          className="ab-hero-reveal"
          style={{ animationDelay: "0.45s", display: "flex", alignItems: "center", gap: "clamp(14px, 2vw, 26px)" }}
        >
          <span style={{ fontFamily: "var(--font-support-new)", fontWeight: 300, fontSize: "clamp(14px, 1.4vw, 20px)", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>View First</span>
          <span style={{ width: "26px", height: "1px", background: TEAL, opacity: 0.6 }} />
          <span style={{ fontFamily: "var(--font-support-new)", fontWeight: 300, fontSize: "clamp(14px, 1.4vw, 20px)", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Home Next</span>
        </div>

        <motion.a
          href="#ch02"
          className="ab-hero-reveal"
          style={{ animationDelay: "0.65s", position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: "14px", marginTop: "clamp(6px, 1.5vw, 18px)", padding: "16px 32px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "999px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", fontFamily: "var(--font-support-new)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "#FFFFFF", textDecoration: "none" }}
          whileHover={{ borderColor: "rgba(16,196,195,0.5)", background: "rgba(16,196,195,0.12)" }}
        >
          Explore Our Story
          <span aria-hidden="true" style={{ display: "block", width: "20px", height: "1px", background: TEAL }} />
        </motion.a>
      </motion.div>

      <motion.div
        aria-hidden="true"
        animate={{ y: [0, 9, 0], opacity: [0.3, 0.75, 0.3] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", bottom: "5vh", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}
      >
        <span style={{ fontFamily: "var(--font-support-new)", fontSize: "9px", letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>Scroll</span>
        <span style={{ display: "block", width: "1px", height: "42px", background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0))" }} />
      </motion.div>
    </section>
  );
}
