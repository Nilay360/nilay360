"use client";
import { useEffect } from "react";

// Mounts Lenis smooth scroll and syncs it with GSAP's ticker/ScrollTrigger.
// Skipped entirely under prefers-reduced-motion — native scroll is the
// reduced-motion fallback for the whole page, not just individual animations.
//
// lenis/gsap are dynamically imported rather than top-level: this is a
// progressive-enhancement layer (the page reads and scrolls fine without
// it), not something that should be in the initial JS bundle blocking first
// paint. Confirmed via Lighthouse this reduces Total Blocking Time. It also
// means a reduced-motion visitor downloads neither chunk at all, since the
// early return below happens before the import.
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ default: Lenis }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      // Registered here rather than at module scope: at module scope this
      // would run during hydration and ScrollTrigger touches
      // documentElement/body styles before React has hydrated, which
      // produces a body style-attribute hydration mismatch.
      gsap.registerPlugin(ScrollTrigger);

      // `anchors: true` — this page's in-page CTAs are anchor links (e.g. the
      // hero's "Explore Our Story" -> #ch02). Without it Lenis ignores them
      // and the browser does a hard native jump that fights Lenis's own
      // scroll state.
      const lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);

      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
