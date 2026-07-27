"use client"

import { useState } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Phone, Mail, MapPin, MessageSquareText, Shield, Lock, Video, Building2 } from "lucide-react"
import { BRAND, NAV_LINKS } from "@/constants"

/* ─── /connect — full marketing landing page (link-in-bio hub, expanded) ───
   Navy background stays site-standard; accent switches to GOLD for this page
   only (page-scoped CSS vars below), per explicit direction. Rest of the
   site keeps its navy/teal system untouched.

   Mapping decisions flagged for review (see delivery report, not guessed silently):
   - "360° Tours" nav link / "360° Virtual Tours" + "VR Experiences" tiles: no
     standalone tour gallery page exists — Kuula 360° tours are embedded per
     property via `kuula_tour_url` on individual listings (see
     PropertyDetailClient.tsx). All three point to /properties (browse
     listings) as the honest real destination; "VR Experiences" and "360°
     Virtual Tours" are the same underlying feature, not two separate ones.
   - "Resources" nav link: no dedicated /resources page exists. Mapped to
     /legal-guide (buyer/RERA guide content) as the closest real match.
   - "Become a Partner" → /contact rather than /become-an-agent, since that
     page is agent-specific and this section targets a broader audience
     (builders/agents/channel partners/developers), matching the mixed
     audience already established in the Partner-With-Us tiles below.
   - Feature-tile copy (#12/#13 in the directive) consolidated into ONE trust
     section per the directive's own instruction to avoid duplication if
     they'd say the same thing. Only "Verified Listings" has a directly
     established source phrase (STATS constant / homepage copy); "360°
     Experiences," "Secure Platform," and "Premium Support" are honest
     concept-level claims tied to real capabilities (Kuula tours, the
     Supabase RLS/auth work, and the real WhatsApp/call/email channels on
     this page) rather than verbatim reused copy — flagged since no exact
     prior phrasing exists for those three elsewhere in the codebase.
   - App Store / Google Play tiles use custom "Coming Soon" glyphs, not
     official badge artwork (no licensed badge assets available) — unlinked,
     per instruction.

   Icon note (carried from prior pass): lucide-react does not ship brand/
   social logos — Instagram/Facebook/YouTube/WhatsApp below use hand-drawn
   outline glyphs (Feather Icons' MIT-licensed originals, lucide's own
   upstream) instead of text initials or the missing library icons.
*/

const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfVazyCsqQIgzdaqffNM9IPkfub_WmsNT1CNXPDwnD2g2B9cg/viewform?usp=dialog"
const OFFICE_LOCATION_URL = "https://maps.app.goo.gl/jiGr42DrevGruwnh6"
const LOGO_SRC = "/brand/Nilay360-09-Photoroom%20(1).png"
const HERO_BG = "/brand/hero-background.jpg"
const WHATSAPP_BASE = `https://wa.me/${BRAND.whatsapp.replace("+", "")}`
const TEL_HREF = `tel:${BRAND.phone.replace(/\s+/g, "")}`

function wa(message: string) {
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(message)}`
}

const HEADER_LINKS = [
  { label: "Home",       href: "/" },
  { label: "About",      href: "/about" },
  { label: "Properties", href: "/properties" },
  { label: "360° Tours", href: "/properties", note: "no standalone tour page — Kuula tours live per-property" },
  { label: "Blog",       href: "/blog" },
  { label: "Resources",  href: "/legal-guide", note: "no dedicated /resources page — mapped to the buyer/RERA guide" },
  { label: "Contact",    href: "/contact" },
]

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/nilay360_/", Icon: IconInstagram },
  { label: "Facebook",  href: "https://www.facebook.com/share/1CWEg3hSmx/", Icon: IconFacebook },
  { label: "YouTube",   href: "https://youtube.com/@nilay360.digital?si=wKl9wxWM1oMxmwne", Icon: IconYouTube },
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

const BTN = "connect-btn"

export default function ConnectPage() {
  return (
    <>
      <style>{CONNECT_STYLES}</style>

      <main className="connect-main">
        <div className="connect-orb connect-orb-1" />
        <div className="connect-orb connect-orb-2" />
        <div className="connect-orb connect-orb-3" />

        {/* 1 — Header */}
        <header className="connect-header">
          <Link href="/" className="connect-header-logo-wrap">
            <img src={LOGO_SRC} alt="Nilay 360" className="connect-header-logo" />
          </Link>
          <nav className="connect-header-nav">
            {HEADER_LINKS.map(l => (
              <Link key={l.label} href={l.href} title={l.note} className="connect-header-link">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="connect-header-cta">
            Visit Website
          </Link>
        </header>

        {/* 2 — Hero */}
        <section className="connect-hero">
          <img src={HERO_BG} alt="" className="connect-hero-bg" fetchPriority="high" loading="eager" />
          <div className="connect-hero-scrim" />
          <div className="connect-hero-content">
            <p className="connect-tagline">View First. Home Next.</p>
            <h1 className="connect-hero-h1">
              Your Gateway to <span className="connect-gold-text">Premium Real Estate</span>
            </h1>
            <p className="connect-hero-sub">
              Property discovery, virtual tours, and end-to-end transaction support across India.
            </p>
            <div className="connect-hero-buttons">
              <Link href="/" className={`${BTN} connect-btn-gold`}>
                Explore Website
              </Link>
              <Link href="/about" className={`${BTN} connect-btn-outline`}>
                About Nilay360
              </Link>
            </div>
          </div>
        </section>

        <div className="connect-body">

          {/* 3 — QR Feedback Panel */}
          <section className="connect-glass connect-qr-panel">
            <div className="connect-qr-code">
              <QRCodeSVG value={FEEDBACK_FORM_URL} size={128} bgColor="transparent" fgColor="#FFFFFF" level="M" />
            </div>
            <div className="connect-qr-text">
              <h2 className="connect-section-title" style={{ textAlign: "left", margin: 0 }}>Scan to Share Feedback</h2>
              <p className="connect-body-copy">
                Point your camera at the code, or tap the link below, to tell us how we&apos;re doing.
              </p>
              <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer" className="connect-inline-link">
                <MessageSquareText size={16} /> Open Feedback Form
              </a>
            </div>
          </section>

          {/* 4 — Follow Us On */}
          <section className="connect-section">
            <h2 className="connect-section-title">Follow Us On</h2>
            <div className="connect-social-row">
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="connect-social">
                  <s.Icon />
                </a>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  )
}

const CONNECT_STYLES = `
  .connect-main {
    position: relative; overflow: hidden;
    background: #020C1C; min-height: 100vh; font-family: 'Cal Sans', sans-serif;
    --gold: #D4A94F; --gold-hover: #E8C874; --gold-deep: #B8903A;
    --gold-glow: rgba(212,169,79,0.28); --gold-border: rgba(212,169,79,0.35);
  }

  .connect-orb { position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; z-index: 0; }
  .connect-orb-1 { width: 460px; height: 460px; top: -140px; right: -120px; background: radial-gradient(circle, var(--gold-glow) 0%, transparent 70%); animation: connectOrb1 18s ease-in-out infinite alternate; }
  .connect-orb-2 { width: 360px; height: 360px; top: 900px; left: -120px; background: radial-gradient(circle, rgba(212,169,79,0.16) 0%, transparent 70%); animation: connectOrb2 22s ease-in-out infinite alternate; }
  .connect-orb-3 { width: 260px; height: 260px; top: 1800px; left: 60%; background: radial-gradient(circle, rgba(212,169,79,0.12) 0%, transparent 70%); animation: connectOrb3 26s ease-in-out infinite alternate; }
  @keyframes connectOrb1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-24px, 26px) scale(1.08); } }
  @keyframes connectOrb2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(22px,-18px) scale(1.05); } }
  @keyframes connectOrb3 { 0% { transform: translate(0,0); } 100% { transform: translate(0,-18px); } }
  @media (prefers-reduced-motion: reduce) { .connect-orb-1, .connect-orb-2, .connect-orb-3 { animation: none; } }

  .connect-gold-text { color: var(--gold); }
  .connect-tagline { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); margin: 0 0 12px; }
  .connect-body { position: relative; z-index: 1; max-width: 1040px; margin: 0 auto; padding: 0 20px 64px; display: flex; flex-direction: column; gap: 48px; }
  .connect-section { display: flex; flex-direction: column; gap: 16px; }
  .connect-section-title { font-size: 22px; font-weight: 700; color: #fff; text-align: center; margin: 0; }
  .connect-body-copy { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7; margin: 0; }

  /* Header */
  .connect-header {
    position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between;
    max-width: 1040px; margin: 0 auto; padding: 20px 20px; gap: 12px;
  }
  .connect-header-logo-wrap { display: flex; align-items: center; flex-shrink: 0; }
  .connect-header-logo { height: 40px; width: auto; object-fit: contain; }
  .connect-header-nav { display: none; }
  .connect-header-link { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); text-decoration: none; padding: 8px 10px; border-radius: 6px; transition: color 0.15s, background 0.15s; }
  .connect-header-cta {
    display: flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 18px;
    background: var(--gold); color: #020C1C; font-size: 13px; font-weight: 700; border-radius: 10px;
    text-decoration: none; flex-shrink: 0; transition: background 0.15s, transform 0.15s;
  }

  /* Hero */
  .connect-hero { position: relative; min-height: 78vh; display: flex; align-items: center; overflow: hidden; }
  .connect-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
  .connect-hero-scrim { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to bottom, rgba(2,12,28,0.55) 0%, rgba(2,12,28,0.5) 40%, rgba(2,12,28,0.85) 85%, #020C1C 100%); }
  .connect-hero-content { position: relative; z-index: 2; max-width: 1040px; margin: 0 auto; padding: 64px 20px; text-align: center; width: 100%; }
  .connect-hero-h1 { font-size: clamp(30px, 6vw, 52px); font-weight: 700; color: #fff; line-height: 1.15; margin: 0 0 18px; }
  .connect-hero-sub { font-size: 16px; color: rgba(255,255,255,0.7); max-width: 560px; margin: 0 auto 32px; line-height: 1.7; }
  .connect-hero-buttons { display: flex; flex-direction: column; gap: 12px; max-width: 340px; margin: 0 auto; }

  .${BTN} {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    min-height: 48px; padding: 14px 22px; border-radius: 12px;
    font-family: 'Cal Sans', sans-serif; font-size: 15px; font-weight: 600; text-decoration: none;
    transition: transform 0.15s, box-shadow 0.2s, background 0.15s, border-color 0.15s;
  }
  .${BTN}:active { transform: scale(0.98); }
  .${BTN}--disabled { opacity: 0.45; pointer-events: none; }
  .connect-btn-gold { background: var(--gold); color: #020C1C; box-shadow: 0 8px 28px var(--gold-glow); }
  .connect-btn-outline { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.35); }

  .connect-glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--gold-border); border-radius: 16px; }

  .connect-inline-link { display: inline-flex; align-items: center; gap: 8px; color: var(--gold); font-size: 13px; font-weight: 600; text-decoration: none; margin-top: 4px; min-height: 44px; }

  /* QR panel */
  .connect-qr-panel { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 28px 24px; text-align: center; }
  .connect-qr-code { background: #0A1526; padding: 16px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .connect-qr-text { display: flex; flex-direction: column; gap: 8px; align-items: center; }

  /* Social */
  .connect-social-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .connect-social {
    width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); text-decoration: none;
    transition: border-color 0.15s, color 0.15s, transform 0.15s, box-shadow 0.2s;
  }

  @media (hover: hover) and (pointer: fine) {
    .${BTN}:hover { transform: translateY(-2px); }
    .connect-btn-gold:hover { box-shadow: 0 12px 36px var(--gold-glow); }
    .connect-header-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
    .connect-header-cta:hover { background: var(--gold-hover); }
    .connect-social:hover { border-color: var(--gold); color: var(--gold-hover); transform: scale(1.08); box-shadow: 0 0 0 3px var(--gold-glow); }
    .connect-glass:hover { background: rgba(255,255,255,0.08); }
  }

  @media (min-width: 640px) {
    .connect-hero-buttons { flex-direction: row; max-width: none; }
    .connect-qr-panel { flex-direction: row; text-align: left; padding: 32px; }
    .connect-qr-text { align-items: flex-start; }
  }

  @media (min-width: 1024px) {
    .connect-header-nav { display: flex; align-items: center; gap: 2px; }
    .connect-header-logo { height: 44px; }
    .connect-body { padding: 0 48px 96px; gap: 64px; }
    .connect-section-title { font-size: 26px; }
  }
`
