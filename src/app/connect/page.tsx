"use client"

import { useState } from "react"
import Link from "next/link"
import { BRAND } from "@/constants"

/* ─── Link-in-bio hub page — mobile-first, single column, 44px min tap targets ───
   PLACEHOLDER CONTENT (flagged in delivery report, not yet real):
   - X (Twitter) URL — not in BRAND.social, no account confirmed yet
   - Channel Partners destination — no dedicated route exists in the app yet
   - Company Profile / Brochure downloads — no PDF assets exist yet (shown as "Coming Soon")
*/

const LOGO_SRC = "/brand/Nilay360-09-Photoroom%20(1).png"

const SOCIALS: { label: string; icon: string; href: string; placeholder?: boolean }[] = [
  { label: "Instagram", icon: "IG", href: BRAND.social.instagram },
  { label: "Facebook",  icon: "FB", href: BRAND.social.facebook },
  { label: "LinkedIn",  icon: "LI", href: BRAND.social.linkedin },
  { label: "YouTube",   icon: "YT", href: BRAND.social.youtube },
  { label: "X",         icon: "X",  href: "https://x.com/nilay360", placeholder: true },
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

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.89 9.11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.8 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
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

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

const HUB_BUTTON = "connect-btn"

export default function ConnectPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <style>{`
        .${HUB_BUTTON} {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 44px; width: 100%; padding: 14px 20px;
          border-radius: 12px; font-family: 'Cal Sans', sans-serif;
          font-size: 15px; font-weight: 600; text-decoration: none;
          transition: transform 0.15s, opacity 0.15s;
        }
        .${HUB_BUTTON}:active { transform: scale(0.98); }
        .${HUB_BUTTON}--disabled { opacity: 0.45; pointer-events: none; }
        .connect-social {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7);
          font-size: 12px; font-weight: 700; text-decoration: none;
          transition: border-color 0.15s, color 0.15s;
        }
        .connect-social:hover { border-color: #10C4C3; color: #3DDAD9; }
        .connect-faq-item { background: #0A1526; border-radius: 12px; padding: 18px 20px; cursor: pointer; }
        .connect-faq-item + .connect-faq-item { margin-top: 10px; }
      `}</style>

      <main style={{ background: "#020C1C", minHeight: "100vh", fontFamily: "'Cal Sans', sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "64px 20px 48px", display: "flex", flexDirection: "column", gap: 40 }}>

          {/* 1 — Header */}
          <header style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 24 }}>
            <img src={LOGO_SRC} alt="Nilay 360" style={{ height: 56, width: "auto", objectFit: "contain" }} />
            <p style={{ fontSize: 17, fontWeight: 600, color: "#3DDAD9", margin: 0 }}>
              View First. Home Next.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Your Gateway to Premium Real Estate
            </p>
          </header>

          {/* 2 — Visit Our Platform */}
          <Link href="/" className={HUB_BUTTON} style={{ background: "#10C4C3", color: "#020C1C" }}>
            Visit Our Platform → nilay360.com
          </Link>

          {/* 3 — Follow Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Follow Us
            </h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.placeholder ? `${s.label} (placeholder link)` : s.label}
                  className="connect-social"
                  title={s.placeholder ? `${s.label} — placeholder link` : s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </section>

          {/* 4 — Contact Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textAlign: "center" }}>
              Contact Us
            </h2>
            <a href={`tel:${BRAND.phone.replace(/\s+/g, "")}`} className={HUB_BUTTON} style={{ background: "#0A1526", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
              <IconPhone /> Call {BRAND.phone}
            </a>
            <a href={`https://wa.me/${BRAND.whatsapp.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className={HUB_BUTTON} style={{ background: "#25D366", color: "#08331d" }}>
              <IconWhatsApp /> WhatsApp Us
            </a>
            <a href={`mailto:${BRAND.email}`} className={HUB_BUTTON} style={{ background: "#0A1526", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
              <IconMail /> {BRAND.email}
            </a>
          </section>

          {/* 5 — Become a Seller */}
          <Link href="/post-property" className={HUB_BUTTON} style={{ background: "transparent", color: "#3DDAD9", border: "1.5px solid #10C4C3" }}>
            Become a Seller
          </Link>

          {/* 6 — Partner With Us */}
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", textAlign: "center" }}>
              Partner With Us
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {PARTNERS.map(p => (
                <Link
                  key={p.label}
                  href={p.href}
                  className={HUB_BUTTON}
                  style={{ background: "#0A1526", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, padding: "12px 14px" }}
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
            <button type="button" disabled className={`${HUB_BUTTON} ${HUB_BUTTON}--disabled`} style={{ background: "#0A1526", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
              Company Profile (Coming Soon)
            </button>
            <button type="button" disabled className={`${HUB_BUTTON} ${HUB_BUTTON}--disabled`} style={{ background: "#0A1526", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
              Brochure (Coming Soon)
            </button>
          </section>

          {/* 8 — FAQ */}
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconShield />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Verified Listings</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconLock />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Secure Platform</span>
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
