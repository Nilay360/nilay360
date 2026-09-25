"use client";
/* Site-wide footer, mounted once in the root layout (src/app/layout.tsx).
   Replaces the per-page footers that used to be copied into ~20 pages.

   Client component because it reads the pathname (to hide itself on app
   screens). Fixed bottom bars publish their live height as CSS variables
   (--compare-bar-height from CompareBar, --bottom-bar-offset from page-local
   bars such as /search) and the footer pads by exactly that much.
   Contacts come from site_contacts via useSiteContacts() — never import the
   server-only Supabase client here: SiteFooter renders under "use client"
   pages too (an earlier server-only import in the footer broke the Vercel build). */
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSiteContacts } from "@/hooks/useSiteContact";
import { telHref } from "@/lib/contactFormat";

// App screens and full-screen flows that must not show the footer.
// Segment match: "/agent" hides /agent/* but NOT /agents or /agent-terms.
const HIDDEN_PREFIXES = ["/admin", "/agent", "/dashboard", "/post-property"];
const HIDDEN_EXACT = ["/login", "/register", "/thank-you"];

function isHidden(pathname: string): boolean {
  if (HIDDEN_EXACT.includes(pathname)) return true;
  return HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
}

const COLUMNS: { heading: string; links: [string, string][] }[] = [
  { heading: "Properties", links: [["Buy", "/buy"], ["Rent", "/rent"], ["New Projects", "/new-projects"], ["Commercial", "/commercial"], ["Builders", "/builders"], ["Locations", "/locations"], ["Blog", "/blog"]] },
  { heading: "Company", links: [["About Us", "/about"], ["NRI Services", "/nri"], ["Careers", "/careers"], ["Press", "/press"], ["Contact", "/contact"]] },
  { heading: "Agents", links: [["Our Agents", "/agents"], ["Hyderabad Agents", "/agents?city=Hyderabad"], ["Become an Agent", "/become-an-agent"]] },
  { heading: "Tools", links: [["EMI Calculator", "/calculator"], ["Investment Calc", "/investment-calculator"], ["Compare", "/compare"], ["Search", "/search"], ["RERA Guide", "/legal-guide"], ["Safety Guide", "/safety-guide"]] },
  { heading: "Legal", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/cookies"], ["Refund Policy", "/refund-policy"], ["Agent Terms", "/agent-terms"], ["Grievance Redressal", "/grievance-redressal"]] },
];

const SOCIALS = [
  { label: "Instagram", icon: "IG", href: "https://www.instagram.com/nilay360_/" },
  { label: "LinkedIn", icon: "LI", href: "https://linkedin.com/company/nilay360" },
  { label: "Facebook", icon: "FB", href: "https://facebook.com/nilay360" },
  { label: "YouTube", icon: "YT", href: "https://www.youtube.com/@nilay360.digital" },
];

// Live contact numbers. Renders nothing while loading or on error — no
// hardcoded fallback number, by design (see useSiteContact).
function FooterContacts() {
  const contacts = useSiteContacts();
  if (contacts.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      {contacts.map(c => (
        <a key={c.contact_type} href={telHref(c.phone)} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", marginBottom: 6 }}>
          {c.label}: {c.phone}
        </a>
      ))}
      <a href="mailto:contact@nilay360.com" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
        contact@nilay360.com
      </a>
    </div>
  );
}

export default function SiteFooter() {
  const pathname = usePathname() ?? "/";
  if (isHidden(pathname)) return null;

  // Keep the last line readable above any fixed bottom bar (0px when none).
  const barPad = "var(--compare-bar-height, 0px) + var(--bottom-bar-offset, 0px)";

  return (
    <footer className="sc-footer" style={{ background: "#020C1C", padding: "56px 56px 28px", paddingBottom: `calc(28px + ${barPad})`, color: "rgba(255,255,255,0.55)", position: "relative", zIndex: 1 }}>
      <style>{`@media(max-width:768px){.sc-footer{padding:48px 16px 24px!important;padding-bottom:calc(24px + ${barPad})!important}.sc-footer-grid{grid-template-columns:1fr 1fr!important;gap:28px!important}.sc-footer-brand{grid-column:1 / -1}.sc-footer-bottom{flex-direction:column!important;text-align:center!important;gap:8px!important}}@media(max-width:480px){.sc-footer-grid{gap:24px 16px!important}}`}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="sc-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, 1fr)", gap: 32, marginBottom: 48 }}>
          <div className="sc-footer-brand">
            <Link href="/" style={{ display: "inline-block", marginBottom: 12 }}>
              <Image src="/brand/Nilay360-09-Photoroom%20(1).png" alt="Nilay 360" width={120} height={32} style={{ height: 32, width: "auto", objectFit: "contain" }} />
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.75, maxWidth: 240, marginBottom: 20, color: "rgba(255,255,255,0.55)" }}>India&apos;s premium real estate platform connecting discerning buyers with exceptional properties.</p>
            <FooterContacts />
            <div style={{ display: "flex", gap: 10 }}>
              {SOCIALS.map(s => (
                <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map(col => (
            <nav key={col.heading} aria-label={col.heading}>
              <h4 style={{ fontSize: 10, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>{col.heading}</h4>
              {col.links.map(([label, href]) => (
                <Link key={href} href={href} style={{ display: "block", color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 10, textDecoration: "none" }}>{label}</Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="sc-footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>© {new Date().getFullYear()} Nilay 360 Real Estate Technologies Pvt. Ltd. · All rights reserved.</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>All listings subject to availability. Verify with RERA before purchase.</p>
        </div>
      </div>
    </footer>
  );
}
