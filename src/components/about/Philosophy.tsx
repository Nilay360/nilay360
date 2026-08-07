"use client";
import { useEffect, useRef } from "react";
import { TEAL } from "./shared";

// The signature moment: "VIEW FIRST." opens out and recedes into blur while
// "HOME NEXT." arrives from depth to replace it, scrubbed to scroll position.
//
// Pinning is done with `position: sticky` on the inner stage rather than
// ScrollTrigger's `pin: true` — sticky doesn't inject a pin-spacer or apply
// its own transforms, so it can't fight Lenis for control of the scroll
// position. ScrollTrigger is used only to scrub the text animation.
//
// NOTE: this depends on NO ancestor setting `overflow: hidden` (on either
// axis) — that silently makes the ancestor a scroll container and kills the
// sticky pin. The page uses `overflow: clip` everywhere for this reason.
//
// gsap/ScrollTrigger are dynamically imported (not top-level) so their
// weight isn't in the page's initial JS bundle — they're a progressive
// enhancement for a below-the-fold section, not needed for first paint.
// Confirmed via Lighthouse this reduces Total Blocking Time; the
// reduced-motion branch below needs no GSAP at all, so it skips the import
// entirely in that case.
export default function Philosophy() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLHeadingElement>(null);
  const bRef = useRef<HTMLHeadingElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const words = wordsRef.current;
    const a = aRef.current;
    const b = bRef.current;
    if (!section || !words || !a || !b) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion fallback: no scrub, no morph, no tall scroll container,
    // no GSAP import at all — plain style mutation is enough here.
    if (reduce) {
      section.style.height = "auto";
      words.style.display = "flex";
      words.style.flexDirection = "column";
      words.style.gap = "8px";
      [a, b].forEach(el => {
        el.style.opacity = "1";
        el.style.filter = "blur(0px)";
        el.style.letterSpacing = "0.02em";
        el.style.transform = "";
      });
      return;
    }

    let cancelled = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      // Registered inside the effect (post-hydration), not at module scope —
      // ScrollTrigger touches root element styles, and doing that before
      // React hydrates produces a body style-attribute hydration mismatch.
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });

        // VIEW FIRST — letter-spacing opens through the first half...
        tl.fromTo(a,
          { letterSpacing: "0em" },
          { letterSpacing: "0.15em", ease: "none", duration: 0.44 }, 0)
          // ...then it blurs, lifts and pushes toward the viewer as it leaves.
          .to(a,
            { opacity: 0, filter: "blur(15px)", y: -30, z: 420, rotateX: -14, ease: "none", duration: 0.14 }, 0.42)
          // HOME NEXT — arrives out of depth, blur and wide tracking resolving.
          .fromTo(b,
            { opacity: 0, filter: "blur(16px)", letterSpacing: "0.3em", y: 20, z: -520, rotateX: 12 },
            { opacity: 1, filter: "blur(0px)", letterSpacing: "0.02em", y: 0, z: 0, rotateX: 0, ease: "none", duration: 0.28 }, 0.58);

        if (glowRef.current) {
          tl.fromTo(glowRef.current,
            { xPercent: -8, yPercent: 6, scale: 1 },
            { xPercent: 8, yPercent: -6, scale: 1.12, ease: "none", duration: 1 }, 0);
        }
      }, section);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  const wordStyle: React.CSSProperties = {
    gridArea: "1 / 1", margin: 0, textAlign: "center",
    fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300,
    fontSize: "clamp(38px, 10vw, 176px)", lineHeight: 0.98,
    color: "#FFFFFF", whiteSpace: "nowrap",
    textShadow: "0 2px 0 rgba(0,0,0,0.35), 0 40px 90px rgba(0,0,0,0.6), 0 0 90px rgba(16,196,195,0.14)",
  };

  return (
    <section id="ch05" ref={sectionRef} style={{ position: "relative", height: "220vh" }}>
      <div ref={stageRef} style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "clip", padding: "0 clamp(16px, 4vw, 60px)", perspective: "1400px" }}>
        <div ref={glowRef} aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", width: "120vw", height: "90vh", transform: "translate(-50%, -50%)", background: "radial-gradient(circle at 50% 50%, rgba(16,196,195,0.15), rgba(16,196,195,0.05) 38%, rgba(2,12,28,0) 62%)", filter: "blur(20px)", pointerEvents: "none" }} />

        <span style={{ position: "relative", marginBottom: "clamp(28px, 4vh, 56px)", fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>Our Philosophy</span>

        <div ref={wordsRef} style={{ position: "relative", width: "100%", display: "grid", placeItems: "center", transformStyle: "preserve-3d" }}>
          <h2 ref={aRef} style={wordStyle}>VIEW FIRST.</h2>
          <h2 ref={bRef} style={{ ...wordStyle, opacity: 0 }}>HOME NEXT.</h2>
        </div>

        <p style={{ position: "relative", margin: "clamp(30px, 5vh, 62px) 0 0", maxWidth: "46ch", textAlign: "center", fontSize: "clamp(14px, 1.05vw, 17px)", lineHeight: 1.9, color: "rgba(255,255,255,0.55)" }}>
          Experience the space before you spend a weekend driving to it. Decide with clarity, not with guesswork.
        </p>
        <span aria-hidden="true" style={{ position: "relative", marginTop: "clamp(24px, 4vh, 44px)", width: "1px", height: "clamp(36px, 6vh, 64px)", background: `linear-gradient(180deg, ${TEAL}, rgba(16,196,195,0))` }} />
      </div>
    </section>
  );
}
