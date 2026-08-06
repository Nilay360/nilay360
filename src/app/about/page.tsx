"use client";
import SmoothScroll from "@/components/about/SmoothScroll";
import { AmbientBackground } from "@/components/about/shared";
import Hero from "@/components/about/Hero";
import TheQuestion from "@/components/about/TheQuestion";
import Origin from "@/components/about/Origin";
import NivilaGroup from "@/components/about/NivilaGroup";
import Philosophy from "@/components/about/Philosophy";
import WhyNilay360 from "@/components/about/WhyNilay360";
import WhatWeBuild from "@/components/about/WhatWeBuild";
import Mission from "@/components/about/Mission";
import Hyderabad from "@/components/about/Hyderabad";
import Leadership from "@/components/about/Leadership";
import Values from "@/components/about/Values";
import Closing from "@/components/about/Closing";

// IMPORTANT: the Philosophy section (checkpoint 2) pins via `position:
// sticky`. Any ancestor here that sets `overflow` (or `overflow-x`) to
// `hidden` — including just one axis — implicitly turns the other axis into
// a scroll container too, which silently breaks that sticky pin. Use
// `overflow: clip` everywhere on this page instead; never `hidden`.
export default function AboutPage() {
  return (
    <>
      <style>{`
        html, body { overflow-x: clip !important; background: #020C1C; }
        @keyframes ab-rise { 0% { transform: translate3d(0,10vh,0); opacity: 0; } 12% { opacity: 0.7; } 82% { opacity: 0.45; } 100% { transform: translate3d(0,-100vh,0); opacity: 0; } }
        @keyframes ab-drift-a { 0%,100% { transform: translate3d(-6vw,-4vh,0) scale(1); } 50% { transform: translate3d(8vw,6vh,0) scale(1.16); } }
        @keyframes ab-drift-b { 0%,100% { transform: translate3d(7vw,5vh,0) scale(1.08); } 50% { transform: translate3d(-8vw,-6vh,0) scale(0.94); } }
        .ab-particle { animation: ab-rise linear infinite; }
        .ab-drift-a { animation: ab-drift-a 34s ease-in-out infinite; }
        .ab-drift-b { animation: ab-drift-b 46s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ab-particle, .ab-drift-a, .ab-drift-b { animation: none !important; }
        }
      `}</style>
      <div style={{ position: "relative", background: "#020C1C", color: "#FFFFFF", overflow: "clip" }}>
        <SmoothScroll />
        <AmbientBackground />
        <main style={{ position: "relative", zIndex: 10, paddingTop: "64px" }}>
          <Hero />
          <TheQuestion />
          <Origin />
          <NivilaGroup />
          <Philosophy />
          <WhyNilay360 />
          <WhatWeBuild />
          <Mission />
          <Hyderabad />
          <Leadership />
          <Values />
          <Closing />
        </main>
      </div>
    </>
  );
}
