"use client"

import { useState } from "react"
import Link from "next/link"
import { Phone, Mail, MapPin, MessageSquareText, Shield, Lock } from "lucide-react"
import { BRAND } from "@/constants"

/* ─── Link-in-bio hub page ───
   Mobile (default, unchanged from prior verified pass): single column, 44px min tap targets.
   Desktop (1024px+): additive grid layout via CSS classes below — see connect-*-grid rules.

   Icon note: lucide-react does not ship brand/social logos (Instagram, Facebook, YouTube,
   WhatsApp, X, etc. were removed from the library upstream for trademark reasons — confirmed
   against the installed v1.21.0 package, it's not a project-specific gap). Generic UI icons
   (Phone, Mail, MapPin, Feedback, Shield, Lock) below are real lucide-react imports as
   requested; the three social glyphs and WhatsApp use hand-drawn outline paths in the same
   stroke style as lucide (Instagram/Facebook/YouTube borrowed from Feather Icons, lucide's
   own MIT-licensed upstream project) instead of text initials.

   Remaining placeholder / intentionally-omitted content (flagged in delivery report):
   - Channel Partners destination — no dedicated route exists in the app yet
   - Company Profile / Brochure downloads — no PDF assets exist yet (shown as "Coming Soon")
   - LinkedIn — no confirmed URL, omitted rather than guessed
   - Book Consultation / Calendly — no link provided, section omitted entirely
*/

const LOGO_SRC = "/brand/Nilay360-09-Photoroom%20(1).png"
const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfVazyCsqQIgzdaqffNM9IPkfub_WmsNT1CNXPDwnD2g2B9cg/viewform?usp=dialog"
const OFFICE_LOCATION_URL = "https://maps.app.goo.gl/jiGr42DrevGruwnh6"

// Real, page-specific URLs — some differ from the shared BRAND.social constants
// (kept local to /connect rather than editing the shared constants file).
const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/nilay360_/", Icon: IconInstagram },
  { label: "Facebook",  href: "https://www.facebook.com/share/1CWEg3hSmx/", Icon: IconFacebook },
  { label: "YouTube",   href: "https://youtube.com/@nilay360.digital?si=wKl9wxWM1oMxmwne", Icon: IconYouTube },
]

const PARTNERS: { label: string; href: string; placeholder?: boolean }[] = [
  { label: "Builders",         href: "/builders" },
  { label: "Agents",           href: "/become-an-agent" },
  { label: "Channel Partners", href: "/contact", placeholder: true },
  { label: "Developers",       href: "/builders" },
]

const FAQS = [
  {
    question: "What is Nilay 360?",
    answer: "Nilay 360 is a technology-powered real estate platform offering property discovery, virtual tours, and end-to-end transaction support across India.",
  },
  {
    question: "Is it free to browse and save properties?",
    answer: "Yes — browsing listings, saving properties, and contacting our team is free for buyers and renters.",
  },
  {
    question: "How do I list my property?",
    answer: "Tap “Become a Seller” above, or visit /post-property, and follow the guided listing flow.",
  },
  {
    question: "Are listings verified?",
    answer: "Every listing on Nilay 360 goes through a verification check before it goes live on the platform.",
  },
]

function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.855L0 24l6.335-1.517A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.988-1.364l-.358-.214-3.716.89.927-3.63-.234-.372A9.797 9.797 0 012.182 12C2.182 6.564 6.564 2.182 12 2.182c5.436 0 9.818 4.382 9.818 9.818 0 5.436-4.382 9.818-9.818 9.818z" />
    </svg>
  )
}

const HUB_BUTTON = "connect-btn"

export default function ConnectPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <style>{`
        .connect-main { position: relative; overflow: hidden; }

        /* Background depth — pure CSS glow orbs, no WebGL/canvas */
        .connect-orb { position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; z-index: 0; }
        .connect-orb-1 { width: 420px; height: 420px; top: -140px; right: -120px; background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%); animation: connectOrb1 18s ease-in-out infinite alternate; }
        .connect-orb-2 { width: 340px; height: 340px; bottom: -100px; left: -110px; background: radial-gradient(circle, rgba(61,218,217,0.16) 0%, transparent 70%); animation: connectOrb2 22s ease-in-out infinite alternate; }
        .connect-orb-3 { width: 240px; height: 240px; top: 45%; left: 50%; background: radial-gradient(circle, rgba(16,196,195,0.12) 0%, transparent 70%); animation: connectOrb3 26s ease-in-out infinite alternate; }
        @keyframes connectOrb1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-24px, 26px) scale(1.08); } }
        @keyframes connectOrb2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(22px,-18px) scale(1.05); } }
        @keyframes connectOrb3 { 0% { transform: translate(-50%,0); } 100% { transform: translate(-50%,-18px); } }
        @media (prefers-reduced-motion: reduce) {
          .connect-orb-1, .connect-orb-2, .connect-orb-3 { animation: none; }
        }

        .connect-shell { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 64px 20px 48px; display: flex; flex-direction: column; gap: 40px; }

        .connect-logo { height: 84px; width: auto; object-fit: contain; filter: drop-shadow(0 0 22px var(--accent-glow)); }
        .connect-tagline { font-size: 17px; font-weight: 600; color: #3DDAD9; margin: 0; }
        .connect-subtitle { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

        .${HUB_BUTTON} {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 44px; width: 100%; padding: 14px 20px;
          border-radius: 12px; font-family: 'Cal Sans', sans-serif;
          font-size: 15px; font-weight: 600; text-decoration: none;
          transition: transform 0.15s, opacity 0.15s, box-shadow 0.2s, background 0.15s, border-color 0.15s;
        }
        .${HUB_BUTTON}:active { transform: scale(0.98); }
        .${HUB_BUTTON}--disabled { opacity: 0.45; pointer-events: none; }
        .connect-cta-primary { box-shadow: 0 8px 28px var(--accent-glow); }
        .connect-cta-solo { }

        .connect-glass {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-accent);
        }

        .connect-social {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
          text-decoration: none; transition: border-color 0.15s, color 0.15s, transform 0.15s, box-shadow 0.2s;
        }

        .connect-contact-grid { display: flex; flex-direction: column; gap: 10px; }
        .connect-partner-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .connect-download-grid { display: flex; flex-direction: column; gap: 10px; }
        .connect-trust-icons { display: flex; flex-direction: column; gap: 12px; }

        .connect-faq-item { background: #0A1526; border-radius: 12px; padding: 18px 20px; cursor: pointer; }
        .connect-faq-item + .connect-faq-item { margin-top: 10px; }

        @media (hover: hover) and (pointer: fine) {
          .${HUB_BUTTON}:hover { transform: translateY(-2px); }
          .connect-cta-primary:hover { box-shadow: 0 12px 36px var(--accent-glow); }
          .connect-glass:hover { background: rgba(255,255,255,0.09); border-color: var(--accent); box-shadow: 0 8px 24px var(--accent-glow); }
          .connect-social:hover { border-color: #10C4C3; color: #3DDAD9; transform: scale(1.08); box-shadow: 0 0 0 3px var(--accent-glow); }
        }

        /* ── Desktop (1024px+) — additive layout only, mobile rules above are untouched ── */
        @media (min-width: 1024px) {
          .connect-shell { max-width: 1040px; padding: 96px 48px 96px; gap: 56px; }
          .connect-logo { height: 140px; }
          .connect-tagline { font-size: 26px; }
          .connect-subtitle { font-size: 16px; }
          .connect-cta-solo { max-width: 420px; margin: 0 auto; }
          .connect-social { width: 48px; height: 48px; }
          .connect-contact-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .connect-partner-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .connect-download-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .connect-faq-wrap { max-width: 720px; margin: 0 auto; width: 100%; }
          .connect-trust-icons { flex-direction: row; gap: 32px; }
        }
      `}</style>

      <main className="connect-main" style={{ background: "#020C1C", minHeight: "100vh", fontFamily: "'Cal Sans', sans-serif" }}>
        <div className="connect-orb connect-orb-1" />
        <div className="connect-orb connect-orb-2" />
        <div className="connect-orb connect-orb-3" />

        <div className="connect-shell">

          {/* 1 — Header */}
          <header style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 24 }}>
            <img src={LOGO_SRC} alt="Nilay 360" className="connect-logo" />
            <p className="connect-tagline">View First. Home Next.</p>
            <p className="connect-subtitle">Your Gateway to Premium Real Estate</p>
          </header>

          {/* 2 — Visit Our Platform */}
          <Link href="/" className={`${HUB_BUTTON} connect-cta-primary connect-cta-solo`} style={{ background: "#10C4C3", color: "#020C1C" }}>
            Visit Our Platform → nilay360.com
          </Link>

          {/* 3 — Follow Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Follow Us
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="connect-social" title={s.label}>
                  <s.Icon />
                </a>
              ))}
            </div>
          </section>

          {/* 4 — Contact Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textAlign: "center" }}>
              Contact Us
            </h2>
            <div className="connect-contact-grid">
              <a href={`tel:${BRAND.phone.replace(/\s+/g, "")}`} className={`${HUB_BUTTON} connect-glass`} style={{ color: "#fff" }}>
                <Phone size={18} /> Call {BRAND.phone}
              </a>
              <a href={`https://wa.me/${BRAND.whatsapp.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className={HUB_BUTTON} style={{ background: "#25D366", color: "#08331d" }}>
                <IconWhatsApp /> WhatsApp Us
              </a>
              <a href={`mailto:${BRAND.email}`} className={`${HUB_BUTTON} connect-glass`} style={{ color: "#fff" }}>
                <Mail size={18} /> {BRAND.email}
              </a>
              <a href={OFFICE_LOCATION_URL} target="_blank" rel="noopener noreferrer" className={`${HUB_BUTTON} connect-glass`} style={{ color: "#fff" }}>
                <MapPin size={18} /> Office Location
              </a>
            </div>
          </section>

          {/* 5 — Become a Seller */}
          <Link href="/post-property" className={`${HUB_BUTTON} connect-cta-solo`} style={{ background: "transparent", color: "#3DDAD9", border: "1.5px solid #10C4C3" }}>
            Become a Seller
          </Link>

          {/* 6 — Partner With Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textAlign: "center" }}>
              Partner With Us
            </h2>
            <div className="connect-partner-grid">
              {PARTNERS.map(p => (
                <Link
                  key={p.label}
                  href={p.href}
                  className={`${HUB_BUTTON} connect-glass`}
                  style={{ color: "#fff", fontSize: 13, padding: "12px 14px" }}
                  title={p.placeholder ? `${p.label} — no dedicated page yet, routed to Contact` : undefined}
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </section>

          {/* 7 — Download */}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textAlign: "center" }}>
              Download
            </h2>
            <div className="connect-download-grid">
              <button type="button" disabled className={`${HUB_BUTTON} ${HUB_BUTTON}--disabled connect-glass`} style={{ color: "#fff" }}>
                Company Profile (Coming Soon)
              </button>
              <button type="button" disabled className={`${HUB_BUTTON} ${HUB_BUTTON}--disabled connect-glass`} style={{ color: "#fff" }}>
                Brochure (Coming Soon)
              </button>
            </div>
          </section>

          {/* 8 — FAQ */}
          <section className="connect-faq-wrap" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 10px", textAlign: "center" }}>
              FAQ
            </h2>
            {FAQS.map((faq, i) => (
              <div
                key={faq.question}
                className="connect-faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                role="button"
                tabIndex={0}
                aria-expanded={openFaq === i}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOpenFaq(openFaq === i ? null : i)
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 44 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{faq.question}</span>
                  <span style={{ fontSize: 20, color: "#10C4C3", flexShrink: 0, lineHeight: 1 }}>
                    {openFaq === i ? "−" : "+"}
                  </span>
                </div>
                {openFaq === i && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginTop: 12 }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* 9 — Trust */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12, background: "#0A1526", borderRadius: 14, padding: "20px 18px" }}>
            <div className="connect-trust-icons">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={22} color="#10C4C3" />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Verified Listings</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Lock size={22} color="#10C4C3" />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Secure Platform</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4 }}>
              <Link href="/privacy" style={{ fontSize: 12, color: "#3DDAD9", minHeight: 44, display: "flex", alignItems: "center" }}>
                Privacy Policy
              </Link>
              <Link href="/terms" style={{ fontSize: 12, color: "#3DDAD9", minHeight: 44, display: "flex", alignItems: "center" }}>
                Terms of Service
              </Link>
            </div>
          </section>

          {/* Feedback */}
          <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer" className={`${HUB_BUTTON} connect-cta-solo`} style={{ background: "transparent", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <MessageSquareText size={18} /> Share Feedback
          </a>

          {/* 10 — Footer */}
          <footer style={{ textAlign: "center", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              © {new Date().getFullYear()} Nilay 360
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              View First. Home Next.
            </p>
          </footer>

        </div>
      </main>
    </>
  )
}
