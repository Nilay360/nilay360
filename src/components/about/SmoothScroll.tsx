"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Mounts Lenis smooth scroll and syncs it with GSAP's ticker/ScrollTrigger.
// Skipped entirely under prefers-reduced-motion — native scroll is the
// reduced-motion fallback for the whole page, not just individual animations.
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // `anchors: true` — this page's in-page CTAs are anchor links (e.g. the
    // hero's "Explore Our Story" → #ch02). Without it Lenis ignores them and
    // the browser does a hard native jump that fights Lenis's own scroll state.
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
