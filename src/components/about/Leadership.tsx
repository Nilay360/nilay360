"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal, ChapterLabel, TEAL } from "./shared";

type Leader = {
  name: string;
  role: string;
  tagline: string;
  bio: React.ReactNode;
  photo: string;
};

// Real names, roles, bios and portraits — all from the approved design
// reference and the extracted design-bundle image data. Nothing invented.
const LEADERS: Leader[] = [
  {
    name: "Ramana Murthy Akula",
    role: "Founder & Managing Director",
    tagline: "Building tomorrow, starting today",
    photo: "/team/ramana-murthy-akula.webp",
    bio: <>A visionary leader who believes that the best solutions are born from real experiences. With a passion for operational excellence and customer-first thinking, he is committed to building meaningful experiences where trust, simplicity, and innovation come together to redefine the future of real estate.</>,
  },
  {
    name: "Nithya Sekhar Neelam",
    role: "Co-Founder",
    tagline: "Inspired to Build. Committed to Lead.",
    photo: "/team/nithya-sekhar-neelam.webp",
    bio: <>An entrepreneur driven by innovation and purposeful leadership, Nithya Sekhar Neelam brings a vision for building technology that creates real-world impact. Alongside serving as the <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>Founder &amp; CEO of Hustle Hive</strong>, he contributes strategic direction, business insight, and a forward-thinking approach that helps shape the future of <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>NIVILA Group</strong> and <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>NILAY360</strong>.</>,
  },
  {
    name: "Chandra Sekhar Neelam",
    role: "CEO & CFO",
    tagline: "Driven by vision, grounded in execution",
    photo: "/team/chandra-sekhar-neelam.webp",
    bio: <>He holds both the strategy and the discipline behind it — deciding where NIVILA invests, and making sure every city we enter is done properly rather than quickly. A strategic leader focused on building sustainable businesses through thoughtful leadership and financial excellence. Alongside serving as the <strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>Chief Financial Officer of Hustle Hive</strong>, he drives NILAY360&rsquo;s long-term growth with clarity, discipline, and purpose.</>,
  },
  {
    name: "Vanith Kandre",
    role: "Head of Technology",
    tagline: "Makes “view first” technically real.",
    photo: "/team/vanith-kandre.webp",
    bio: <>The architect behind NILAY360&rsquo;s digital experience, transforming bold ideas into scalable technology. With a passion for innovation, user experience, and modern engineering, he leads the platform&rsquo;s technological vision, ensuring every interaction is seamless, intelligent, and built for the future.<br /><br /><strong style={{ fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>Engineers experiences, not just software.</strong></>,
  },
];

// Social profile URLs have not been supplied yet (Vanith: "I'll give the
// redirect links after a time"). Rendered as NON-INTERACTIVE placeholders
// rather than href="#" — a "#" link would scroll the page to the top when
// clicked (and with Lenis `anchors: true`, animate there), which is a broken
// affordance. Swap these spans for <a href="..."> once the URLs arrive.
const SOCIALS = ["Instagram", "LinkedIn", "X"] as const;

function SocialPlaceholders({ name }: { name: string }) {
  return (
    <div style={{ display: "flex", gap: "10px" }} aria-label={`Social profiles for ${name} — coming soon`}>
      {SOCIALS.map(net => (
        <span
          key={net}
          title={`${net} profile coming soon`}
          style={{ display: "grid", placeItems: "center", width: "38px", height: "38px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.32)", cursor: "default", fontFamily: "'Cal Sans', sans-serif", fontWeight: 500, fontSize: "13px" }}
        >
          {net === "Instagram" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none" /></svg>
          ) : net === "LinkedIn" ? "in" : "X"}
        </span>
      ))}
    </div>
  );
}

function Portrait({ leader, float }: { leader: Leader; float: boolean }) {
  return (
    <motion.div
      style={{ position: "relative", padding: "clamp(10px, 1.1vw, 16px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "16px", background: "linear-gradient(155deg, rgba(255,255,255,0.05), rgba(255,255,255,0.012))", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
      whileHover={{ y: -6, borderColor: "rgba(16,196,195,0.4)", boxShadow: "0 30px 70px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,196,195,0.12), 0 0 60px rgba(16,196,195,0.1)" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: "11px", overflow: "clip" }}
        animate={float ? { y: [-5, 5, -5] } : undefined}
        transition={float ? { duration: 12, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <img
          src={leader.photo}
          alt={`${leader.name} — ${leader.role}, Nilay360`}
          loading="lazy"
          decoding="async"
          /* Sources are taller than the 4/5 frame, so cover crops top/bottom.
             Biased upward to keep faces safely inside the crop. */
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function Leadership() {
  const reduce = useReducedMotion();

  return (
    <section id="ch09" style={{ position: "relative", padding: "16vh clamp(20px, 6vw, 80px)", overflow: "clip" }}>
      <style>{`
        .ab-lead-row { display: grid; grid-template-columns: 1fr; gap: clamp(28px, 4vw, 84px); align-items: center; padding: clamp(40px, 6vw, 96px) 0; border-top: 1px solid rgba(255,255,255,0.08); }
        .ab-lead-row:last-child { border-bottom: 1px solid rgba(255,255,255,0.08); }
        .ab-lead-portrait { grid-row: 1; }
        .ab-lead-body { grid-row: 2; }
        @media (min-width: 860px) {
          /* Equal tracks, not the earlier 0.85fr/1.15fr split — that asymmetry
             meant the portrait rendered at a different pixel width depending on
             which column the flip put it in (measured: 425px vs 585px CSS width
             at 1280px viewport), which upscaled two of the four portraits
             noticeably harder than the other two. Equal fr units guarantee the
             portrait is the same width in both grid-column positions. */
          .ab-lead-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
          /* Portrait always first in the DOM (so mobile stacks photo-above-text
             consistently); desktop alternates sides purely with grid placement. */
          .ab-lead-portrait { grid-row: 1; grid-column: 1; }
          .ab-lead-body { grid-row: 1; grid-column: 2; }
          .ab-lead-row--flip .ab-lead-portrait { grid-column: 2; }
          .ab-lead-row--flip .ab-lead-body { grid-column: 1; }
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: "1240px", margin: "0 auto" }}>
        <ChapterLabel>The People</ChapterLabel>
        <Reveal>
          <h2 style={{ margin: "0 0 clamp(40px, 5vw, 80px)", maxWidth: "22ch", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(30px, 4.4vw, 70px)", lineHeight: 1.06, letterSpacing: "-0.026em", color: "#FFFFFF" }}>Four people. One shared purpose.</h2>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {LEADERS.map((leader, i) => (
            <div key={leader.name} className={`ab-lead-row${i % 2 === 1 ? " ab-lead-row--flip" : ""}`}>
              <Reveal className="ab-lead-portrait" y={30}>
                <Portrait leader={leader} float={!reduce} />
              </Reveal>

              <div className="ab-lead-body">
                <Reveal delay={0.08} y={16}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "clamp(16px, 2vw, 26px)" }}>
                    <span style={{ width: "34px", height: "1px", background: "rgba(255,255,255,0.16)" }} />
                    <span style={{ fontFamily: "'Cal Sans', sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: TEAL }}>{leader.role}</span>
                  </div>
                </Reveal>
                <Reveal delay={0.14} y={24}>
                  <h3 style={{ margin: "0 0 clamp(14px, 1.8vw, 22px)", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(26px, 3.2vw, 50px)", lineHeight: 1.06, letterSpacing: "-0.024em", color: "#FFFFFF" }}>{leader.name}</h3>
                </Reveal>
                <Reveal delay={0.2} y={20}>
                  <p style={{ margin: "0 0 clamp(18px, 2.2vw, 28px)", maxWidth: "44ch", fontFamily: "'Cal Sans', Georgia, serif", fontWeight: 300, fontSize: "clamp(17px, 1.5vw, 23px)", lineHeight: 1.5, letterSpacing: "-0.008em", color: "rgba(255,255,255,0.9)" }}>{leader.tagline}</p>
                </Reveal>
                <Reveal delay={0.26} y={20}>
                  <p style={{ margin: "0 0 clamp(24px, 3vw, 38px)", maxWidth: "50ch", fontSize: "clamp(14.5px, 1.1vw, 17px)", lineHeight: 1.9, color: "rgba(255,255,255,0.52)" }}>{leader.bio}</p>
                </Reveal>
                <Reveal delay={0.32} y={14}>
                  <SocialPlaceholders name={leader.name} />
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
