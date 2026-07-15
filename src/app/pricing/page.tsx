"use client";
import { BRAND } from "@/constants";

// ── Card wrapper — same treatment as the property detail page's Card ──
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "24px", padding: "40px 36px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)", ...style }}>
      {children}
    </div>
  );
}

function CheckItem({ label, comingSoon }: { label: string; comingSoon?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 0" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><polyline points="20 6 9 17 4 12" /></svg>
      <span style={{ fontSize: "14px", color: "#AEB4BC", lineHeight: 1.5 }}>
        {label}
        {comingSoon && (
          <span style={{ marginLeft: "8px", display: "inline-block", padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
            Coming Soon
          </span>
        )}
      </span>
    </div>
  );
}

export default function PricingPage() {
  const whatsappHref = `https://wa.me/${BRAND.whatsapp.replace(/\+/g, "")}?text=${encodeURIComponent("Hi, I'd like to request an upgrade to Nilay 360 Premium.")}`;

  return (
    <div style={{ background: "#000000", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "72px 24px 96px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.15, marginBottom: "14px" }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: "15px", color: "#AEB4BC", maxWidth: "520px", margin: "0 auto" }}>
            Browse and inquire for free. Upgrade to Premium for immersive 360° property tours and more, coming soon.
          </p>
        </div>

        {/* Comparison grid */}
        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Free tier */}
          <Card>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#AEB4BC", marginBottom: "8px" }}>Free</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "34px", fontWeight: 600, color: "#E8EAED" }}>₹0</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>Forever</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginBottom: "28px" }}>
              <CheckItem label="Browse all property listings" />
              <CheckItem label="Save properties to your dashboard" />
              <CheckItem label="Submit inquiries to sellers and agents" />
              <CheckItem label="Apply to become a verified agent" />
            </div>
            <a
              href="/properties"
              style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "9px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", color: "#E8EAED", border: "1.5px solid rgba(255,255,255,0.15)", background: "transparent", textDecoration: "none" }}
            >
              Browse Properties
            </a>
          </Card>

          {/* Premium tier */}
          <Card style={{ border: "1.5px solid rgba(43,168,224,0.4)", boxShadow: "0 4px 32px rgba(43,168,224,0.12)" }}>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2BA8E0" }}>Premium</span>
                <span style={{ padding: "2px 8px", borderRadius: "100px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(43,168,224,0.15)", color: "#2BA8E0", border: "1px solid rgba(43,168,224,0.3)" }}>
                  Best Value
                </span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "34px", fontWeight: 600, color: "#E8EAED" }}>Contact Us</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>Custom pricing — reach out to upgrade</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginBottom: "28px" }}>
              <CheckItem label="Everything in Free" />
              <CheckItem label="360° Virtual Tours unlocked on every listing" />
              <CheckItem label="Priority listing visibility" comingSoon />
              <CheckItem label="Early access to new project launches" comingSoon />
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "9px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", color: "#000000", background: "#2BA8E0", border: "none", textDecoration: "none" }}
            >
              Request Upgrade
            </a>
          </Card>
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "32px" }}>
          Online payments aren't live yet — tap Request Upgrade and our team will activate Premium on your account directly.
        </p>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
