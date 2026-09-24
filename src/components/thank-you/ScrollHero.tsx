"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

interface ScrollHeroProps {
  listingCount: number;
  whatsappHref?: string;
}

// Ports the reference bundle's scroll-scrubbed sequence 1:1 (same 3400px
// wrap height, same seg()/lerp() breakpoints, same rAF-throttled scroll/
// mousemove/resize handling) — only the fabricated content changes:
// the "New matches" ring is cut entirely, the phone mockup shows a real
// enquiry-status screen instead of a fake Saved Searches app, and the
// two badges/side panel carry real or already-stated copy.
const STEPS = ["Enquiry Sent", "Under Review", "Team Contact"] as const;
const CURRENT_STEP_INDEX = 1;

function seg(start: number, end: number, t: number) {
  return Math.max(0, Math.min(1, (t - start) / (end - start)));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

export default function ScrollHero({ listingCount, whatsappHref }: ScrollHeroProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const badge1Ref = useRef<HTMLDivElement>(null);
  const badge2Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const state = useRef({
    vw: 0,
    vh: 0,
    tiltX: 0,
    tiltY: 0,
    mouseClientX: 0,
    mouseClientY: 0,
    raf: 0,
  });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion fallback: no scroll-jack, no scrub, no mouse-tracked
    // tilt/sheen, no tall 3400px scroll container — plain style mutation
    // collapses the whole sequence into a normal static stacked layout with
    // everything immediately visible. No listeners attached, no rAF loop.
    if (reduce) {
      const wrapEl = wrapRef.current;
      const stageEl = stageRef.current;
      const introEl = introRef.current;
      const cardEl = cardRef.current;
      const gridEl = gridRef.current;
      if (wrapEl) wrapEl.style.height = "auto";
      if (stageEl) {
        stageEl.style.position = "static";
        stageEl.style.height = "auto";
        stageEl.style.overflow = "visible";
        stageEl.style.perspective = "none";
      }
      if (introEl) {
        introEl.style.position = "static";
        introEl.style.opacity = "1";
        introEl.style.transform = "none";
        introEl.style.filter = "none";
        introEl.style.padding = "64px 24px 40px";
      }
      if (cardEl) {
        cardEl.style.position = "static";
        cardEl.style.opacity = "1";
        cardEl.style.transform = "none";
        cardEl.style.width = "100%";
        cardEl.style.height = "auto";
        cardEl.style.maxWidth = "960px";
        cardEl.style.margin = "0 auto 40px";
      }
      if (sheenRef.current) sheenRef.current.style.background = "none";
      if (gridEl) {
        gridEl.style.position = "static";
        gridEl.style.display = "flex";
        gridEl.style.flexDirection = "column";
        gridEl.style.alignItems = "center";
        gridEl.style.textAlign = "center";
        gridEl.style.gap = "32px";
        gridEl.style.padding = "40px 24px";
        gridEl.style.height = "auto";
      }
      [leftRef, rightRef, phoneRef, badge1Ref, badge2Ref].forEach((ref) => {
        const el = ref.current;
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "none";
        el.style.position = "static";
      });
      if (ctaRef.current) {
        const ctaEl = ctaRef.current;
        ctaEl.style.position = "static";
        ctaEl.style.opacity = "1";
        ctaEl.style.transform = "none";
        ctaEl.style.filter = "none";
        ctaEl.style.pointerEvents = "auto";
        ctaEl.style.padding = "0 24px 64px";
      }
      return;
    }

    const s = state.current;
    s.vw = window.innerWidth;
    s.vh = window.innerHeight;

    const scheduleRender = () => {
      if (s.raf) return;
      s.raf = requestAnimationFrame(() => {
        s.raf = 0;
        render();
      });
    };

    const onScroll = () => scheduleRender();
    const onMouse = (e: MouseEvent) => {
      s.mouseClientX = e.clientX;
      s.mouseClientY = e.clientY;
      s.tiltX = (e.clientX / window.innerWidth - 0.5) * 2;
      s.tiltY = (e.clientY / window.innerHeight - 0.5) * 2;
      scheduleRender();
    };
    const onResize = () => {
      s.vw = window.innerWidth;
      s.vh = window.innerHeight;
      scheduleRender();
    };

    function render() {
      const wrapEl = wrapRef.current;
      if (!wrapEl) return;
      const rect = wrapEl.getBoundingClientRect();
      const vh = s.vh;
      const vw = s.vw;
      const total = rect.height - vh;
      let p = total > 0 ? -rect.top / total : 0;
      p = clamp01(p);

      const introEl = introRef.current;
      if (introEl) {
        const t = seg(0, 0.26, p);
        introEl.style.opacity = String(1 - t);
        introEl.style.transform = `translateY(${lerp(0, -36, t)}px) scale(${lerp(1, 0.94, t)})`;
        introEl.style.filter = `blur(${lerp(0, 6, t)}px)`;
      }

      const growT = seg(0.12, 0.42, p);
      const cardEl = cardRef.current;
      if (cardEl) {
        const w = lerp(560, vw, growT);
        const h = lerp(360, vh, growT);
        cardEl.style.width = w + "px";
        cardEl.style.height = h + "px";
        cardEl.style.left = (vw - w) / 2 + "px";
        cardEl.style.top = (vh - h) / 2 + "px";
        cardEl.style.opacity = String(clamp01(seg(0.1, 0.2, p)));
        cardEl.style.transform = `rotateX(${lerp(8, 0, growT)}deg)`;
        cardEl.style.borderRadius = lerp(28, 0, seg(0.3, 0.42, p)) + "px";
      }

      if (sheenRef.current && cardEl) {
        const cr = cardEl.getBoundingClientRect();
        const relX = s.mouseClientX - cr.left;
        const relY = s.mouseClientY - cr.top;
        sheenRef.current.style.background = `radial-gradient(650px circle at ${relX}px ${relY}px, rgba(16,196,195,0.12), transparent 45%)`;
      }

      const contentT = seg(0.4, 0.55, p);
      const fadeOutT = seg(0.8, 0.9, p);

      if (leftRef.current) {
        leftRef.current.style.opacity = String(contentT * (1 - fadeOutT));
        leftRef.current.style.transform = `translateX(${lerp(-30, 0, contentT)}px)`;
      }
      if (rightRef.current) {
        rightRef.current.style.opacity = String(contentT * (1 - fadeOutT));
        rightRef.current.style.transform = `translateX(${lerp(30, 0, contentT)}px)`;
      }
      if (phoneRef.current) {
        const baseScale = lerp(0.9, 1, contentT);
        const baseY = lerp(30, 0, contentT);
        const tiltInRange = p > 0.42 && p < 0.86;
        const rx = tiltInRange ? s.tiltY * -6 : 0;
        const ry = tiltInRange ? s.tiltX * 6 : 0;
        phoneRef.current.style.opacity = String(contentT * (1 - fadeOutT));
        phoneRef.current.style.transform = `translateY(${baseY}px) scale(${baseScale}) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }

      const b1 = seg(0.5, 0.62, p);
      const b2 = seg(0.58, 0.7, p);
      if (badge1Ref.current) {
        badge1Ref.current.style.opacity = String(b1 * (1 - fadeOutT));
        badge1Ref.current.style.transform = `translateY(${lerp(20, 0, b1)}px)`;
      }
      if (badge2Ref.current) {
        badge2Ref.current.style.opacity = String(b2 * (1 - fadeOutT));
        badge2Ref.current.style.transform = `translateY(${lerp(20, 0, b2)}px)`;
      }

      const ctaT = seg(0.86, 1, p);
      if (ctaRef.current) {
        ctaRef.current.style.opacity = String(ctaT);
        ctaRef.current.style.transform = `translateY(${lerp(24, 0, ctaT)}px)`;
        ctaRef.current.style.filter = `blur(${lerp(8, 0, ctaT)}px)`;
        ctaRef.current.style.pointerEvents = ctaT > 0.5 ? "auto" : "none";
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    render();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      if (s.raf) cancelAnimationFrame(s.raf);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{ height: "3400px", position: "relative" }}>
      <div ref={stageRef} style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", perspective: "1600px" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(to right, rgba(16,196,195,0.08) 0px, rgba(16,196,195,0.08) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(rgba(16,196,195,0.08) 0px, rgba(16,196,195,0.08) 1px, transparent 1px, transparent 64px)",
            pointerEvents: "none",
          }}
        />

        {/* Intro */}
        <div
          ref={introRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <span className="sr-only" role="status">
            Your enquiry was submitted successfully.
          </span>
          <img src="/brand/Nilay360-09-Photoroom%20(1).png" alt="Nilay360" style={{ width: "56px", height: "auto", marginBottom: "26px" }} />
          <div style={{ position: "relative", width: "140px", height: "140px", marginBottom: "26px" }} aria-hidden="true">
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(16,196,195,0.2)" }} />
            <div className="ty-hero-orbit" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px dashed #10C4C3", opacity: 0.55, animation: "n360spin 14s linear infinite" }}>
              <div style={{ position: "absolute", width: "7px", height: "7px", borderRadius: "50%", background: "#10C4C3", top: "-3.5px", left: "50%", transform: "translateX(-50%)", boxShadow: "0 0 12px 2px rgba(16,196,195,0.8)" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: "#10C4C3", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 8px rgba(16,196,195,0.12), 0 0 40px rgba(16,196,195,0.35)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    className="ty-hero-check-path"
                    d="M5 13l4 4L19 7"
                    stroke="#020C1C"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="28"
                    style={{ animation: "drawCheck 0.6s ease 0.3s 1 both" }}
                  />
                </svg>
              </div>
            </div>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#10C4C3", margin: "0 0 14px" }}>
            Enquiry Received
          </p>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontWeight: 700, fontSize: "clamp(28px, 4.5vw, 40px)", lineHeight: 1.15, color: "#FFFFFF", margin: "0 0 14px", maxWidth: "16ch" }}>
            Thank you! We&apos;ve got your details.
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#C9D3E0", maxWidth: "420px", margin: 0 }}>
            Our team will get in touch shortly to help you take the next step.
          </p>
        </div>

        {/* Growing card */}
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            background: "linear-gradient(160deg, #0E2140 0%, #020C1C 100%)",
            borderRadius: "28px",
            opacity: 0,
            overflow: "hidden",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,196,195,0.12), 0 0 90px rgba(16,196,195,0.12)",
            width: "560px",
            height: "360px",
            left: "-280px",
            top: "-180px",
            transform: "rotateX(8deg)",
          }}
        >
          <div ref={sheenRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          <div ref={gridRef} style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "48px", padding: "0 64px", maxWidth: "1360px", margin: "0 auto", height: "100%" }}>
            <div ref={leftRef} style={{ opacity: 0, transform: "translateX(-30px)" }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-heading-new)", fontSize: "clamp(36px, 5.5vw, 68px)", fontWeight: 700, letterSpacing: "-0.01em", color: "#FFFFFF", lineHeight: 1.05 }}>
                NILAY<span style={{ color: "#10C4C3" }}>360</span>
              </h2>
              <p style={{ margin: "14px 0 0", fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9D3E0", opacity: 0.6 }}>
                View First, Home Next
              </p>
            </div>

            {/* Real enquiry-status device mockup — replaces the fabricated Saved Searches app screen */}
            <div ref={phoneRef} style={{ position: "relative", width: "250px", height: "520px", flex: "0 0 auto" }}>
              <div style={{ width: "250px", height: "520px", background: "#050C18", borderRadius: "38px", border: "2px solid rgba(16,196,195,0.25)", position: "relative", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ position: "absolute", inset: "8px", background: "#020C1C", borderRadius: "30px", display: "flex", flexDirection: "column", padding: "24px 18px", overflow: "hidden" }}>
                  <span style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#10C4C3", fontWeight: 700 }}>Today</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, marginTop: "3px", color: "#FFFFFF" }}>Enquiry Status</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "24px" }}>
                    {STEPS.map((step, i) => {
                      const done = i <= CURRENT_STEP_INDEX;
                      const current = i === CURRENT_STEP_INDEX;
                      return (
                        <div key={step} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              flex: "0 0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: done ? "#10C4C3" : "transparent",
                              border: done ? "none" : "1.5px solid rgba(16,196,195,0.4)",
                            }}
                          >
                            {done && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#020C1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span style={{ fontSize: "12px", color: current ? "#FFFFFF" : "#C9D3E0", fontWeight: current ? 700 : 400 }}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: "auto", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "11px", color: "#FFFFFF" }}>We&apos;ll reach out within 24 hours</span>
                  </div>
                </div>
              </div>

              <div ref={badge1Ref} style={{ position: "absolute", top: "26px", left: "-150px", background: "rgba(16,32,56,0.55)", backdropFilter: "blur(16px)", border: "1px solid rgba(16,196,195,0.25)", borderRadius: "16px", padding: "12px 16px", opacity: 0, width: "150px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", transform: "translateY(20px)" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#10C4C3" }}>{listingCount}+</div>
                <div style={{ fontSize: "11px", color: "#C9D3E0", opacity: 0.8 }}>Verified listings</div>
              </div>
              <div ref={badge2Ref} style={{ position: "absolute", bottom: "46px", right: "-160px", background: "rgba(16,32,56,0.55)", backdropFilter: "blur(16px)", border: "1px solid rgba(16,196,195,0.25)", borderRadius: "16px", padding: "12px 16px", opacity: 0, width: "160px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", transform: "translateY(20px)" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#10C4C3" }}>24 hrs</div>
                <div style={{ fontSize: "11px", color: "#C9D3E0", opacity: 0.8 }}>Avg. agent response</div>
              </div>
            </div>

            <div ref={rightRef} style={{ opacity: 0, transform: "translateX(30px)" }}>
              <p style={{ fontSize: "17px", lineHeight: 1.6, color: "#C9D3E0", margin: 0, maxWidth: "36ch" }}>
                Every enquiry is personally reviewed by our team — real listings, verified by real people.
              </p>
            </div>
          </div>

          {/* End-of-scroll CTA overlay */}
          <div
            ref={ctaRef}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              pointerEvents: "none",
              textAlign: "center",
              transform: "translateY(24px)",
              filter: "blur(8px)",
            }}
          >
            <div style={{ maxWidth: "560px", padding: "0 24px" }}>
              <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-heading-new)", fontSize: "clamp(30px, 4vw, 44px)", color: "#FFFFFF" }}>
                You&apos;re all set.
              </h2>
              <p style={{ margin: "0 0 26px", color: "#C9D3E0", fontSize: "16px", lineHeight: 1.6 }}>
                We&apos;ll reach out within 24 hours — meanwhile, take a look at listings matching your search.
              </p>
              <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/properties"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#10C4C3", color: "#020C1C", fontWeight: 600, fontSize: "15px", textDecoration: "none", padding: "14px 28px", borderRadius: "999px", boxShadow: "0 8px 24px rgba(16,196,195,0.25)" }}
                >
                  Browse more properties
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#020C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", color: "#10C4C3", fontWeight: 600, fontSize: "15px", textDecoration: "none", padding: "14px 28px", borderRadius: "999px", border: "1.5px solid #10C4C3" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
