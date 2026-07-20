import React from "react"
import Link from "next/link"
import { BRAND, CITIES, NAV_LINKS } from "@/constants"

const footerLinks = {
  "Quick Links": NAV_LINKS,
  "Property Types": [
    { label: "Apartments",   href: "/properties?type=apartment" },
    { label: "Villas",       href: "/properties?type=villa"     },
    { label: "Plots / Land", href: "/properties?type=plot"      },
    { label: "Penthouses",   href: "/properties?type=penthouse" },
    { label: "Commercial",   href: "/commercial"                },
    { label: "New Projects", href: "/new-projects"              },
  ],
  "Company": [
    { label: "About Us",     href: "/about"       },
    { label: "Our Agents",   href: "/agents"      },
    { label: "Developers",   href: "/builders"    },
    { label: "Blog",         href: "/blog"        },
    { label: "Contact Us",   href: "/contact"     },
    { label: "NRI Services", href: "/nri"         },
  ],
  "Legal": [
    { label: "Privacy Policy",  href: "/privacy" },
    { label: "Terms of Service",href: "/terms"   },
    { label: "Cookie Policy",   href: "/cookies" },
    { label: "RERA Information",href: "/legal-guide" },
  ],
}

export function Footer() {
  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .footer-grid {
          grid-template-columns: 1fr 1fr !important;
          gap: 32px !important;
        }
        .footer-brand {
          grid-column: 1 / -1 !important;
        }
      }
      @media (max-width: 480px) {
        .footer-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
    <footer className="bg-[#020C1C] text-white">
      {/* Main footer */}
      <div className="nilay360-container py-14">
        <div className="footer-grid" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:32, width:"100%", maxWidth:"100%", boxSizing:"border-box"}}>

          {/* Brand column */}
          <div className="lg:col-span-2 footer-brand">
            <div className="font-body text-[22px] font-semibold tracking-[0.14em] mb-1">
              Nilay 360<span className="text-[#10C4C3] ml-1">·</span>
            </div>
            <p className="text-[12px] text-[#10C4C3] tracking-[0.1em] mb-4">
              YOUR TRUST. OUR PROMISE.
            </p>
            <p className="text-[13px] text-white/55 leading-relaxed mb-6 max-w-[260px]">
              India&apos;s premium real estate platform for discerning buyers, NRI investors, and luxury developers.
            </p>

            {/* Contact */}
            <div className="flex flex-col gap-2 text-[12px] text-white/50 mb-6">
              <span>📍 {BRAND.address}</span>
              <span>📞 {BRAND.phone}</span>
              <a href={`mailto:${BRAND.email}`} className="hover:text-[#3DDAD9] transition-colors">
                ✉️ {BRAND.email}
              </a>
            </div>

            {/* Social */}
            <div className="flex gap-3">
              {[
                { href: BRAND.social.instagram, label: "Instagram", icon: "IG" },
                { href: BRAND.social.linkedin,  label: "LinkedIn",  icon: "LI" },
                { href: BRAND.social.facebook,  label: "Facebook",  icon: "FB" },
                { href: BRAND.social.youtube,   label: "YouTube",   icon: "YT" },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-[10px] font-bold text-white/50 hover:border-[#10C4C3] hover:text-[#3DDAD9] transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-[11px] font-semibold text-[#10C4C3] tracking-[0.08em] uppercase mb-4">
                {heading}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/65 hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cities */}
        <div className="mt-12 pt-8 border-t border-white/8">
          <p className="text-[10px] font-semibold text-[#10C4C3] tracking-[0.1em] uppercase mb-3">
            Cities We Serve
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CITIES.map(city => (
              <Link
                key={city}
                href={`/locations/${city.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[12px] text-white/60 hover:text-[#3DDAD9] transition-colors"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="nilay360-container flex flex-col sm:flex-row items-center justify-between py-4 gap-3">
          <p className="text-[12px] text-white/35">
            © {new Date().getFullYear()} Nilay 360. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-[12px] text-white/35">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10C4C3] animate-pulse" />
            All systems operational
          </div>
          <p className="text-[12px] text-white/35">
            RERA Compliant Platform · India
          </p>
        </div>
      </div>
    </footer>
    </>
  )
}
