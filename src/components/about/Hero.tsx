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
      <Particles />
      <motion.div
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(26px, 3.4vw, 46px)", maxWidth: "1180px", perspective: 1400, rotateX: tilt.rotateX, rotateY: tilt.rotateY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.img
            src="/brand/nilay360_icon_only_dark-bg.png"
            alt="Nilay360"
            animate={{ y: [-9, 9, -9] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            style={{ height: "200px", width: "auto", display: "block", filter: `drop-shadow(0 18px 60px rgba(16,196,195,0.34))` }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: 0, fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(38px, 6.8vw, 108px)", lineHeight: 1.04, letterSpacing: "-0.026em", color: "#FFFFFF" }}
        >
          The Future of Real Estate<br />Begins Here.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", alignItems: "center", gap: "clamp(14px, 2vw, 26px)" }}
        >
          <span style={{ fontFamily: "'Cal Sans', sans-serif", fontWeight: 300, fontSize: "clamp(14px, 1.4vw, 20px)", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>View First</span>
          <span style={{ width: "26px", height: "1px", background: TEAL, opacity: 0.6 }} />
          <span style={{ fontFamily: "'Cal Sans', sans-serif", fontWeight: 300, fontSize: "clamp(14px, 1.4vw, 20px)", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Home Next</span>
        </motion.div>

        <motion.a
          href="#ch02"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ borderColor: "rgba(16,196,195,0.5)", background: "rgba(16,196,195,0.12)" }}
          style={{ position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: "14px", marginTop: "clamp(6px, 1.5vw, 18px)", padding: "16px 32px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "999px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase", color: "#FFFFFF", textDecoration: "none" }}
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
        <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "9px", letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)" }}>Scroll</span>
        <span style={{ display: "block", width: "1px", height: "42px", background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0))" }} />
      </motion.div>
    </section>
  );
}
