/* Shared Nilay 360 navbar + footer + page shell.
   Navbar and Footer here are rendered only by PageShell (secondary chrome for
   placeholder / content pages). The root layout supplies the primary chrome.
   Server component (no client state) — safe to import anywhere. */
import type { ReactNode } from "react";

const NAV = [
  ["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],
  ["Commercial","/commercial"],["Builders","/builders"],["Agents","/agents"],["Blog","/blog"],
];

const FONTS = "https://cdn.jsdelivr.net/npm/cal-sans@1.0.1/index.css";

export function Navbar() {
  return (
    <nav className="sc-nav" style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 40px", background:"rgba(0,0,0,0.96)", backdropFilter:"blur(20px)", borderBottom:"0.5px solid rgba(16,196,195,0.15)" }}>
      <a href="/" style={{ display:"flex", alignItems:"center" }}>
        <img src="/brand/Nilay360-09-Photoroom%20(1).png" alt="Nilay 360" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
      </a>
      <div style={{ display:"flex", alignItems:"center", gap:4 }} className="nv-center">
        {NAV.map(([l,h]) => (
          <a key={l} href={h} style={{ padding:"6px 14px", borderRadius:6, fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.6)" }}>{l}</a>
        ))}
      </div>
      <div className="sc-nav-actions" style={{ display:"flex", alignItems:"center", gap:10 }}>
        <a href="/saved" title="Saved" style={{ color:"rgba(255,255,255,0.6)", display:"flex", padding:6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        </a>
        <a href="/login" style={{ padding:"7px 18px", borderRadius:7, border:"0.5px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:500 }}>Sign In</a>
        <a href="/post-property" style={{ padding:"7px 20px", borderRadius:7, background:"#10C4C3", color:"#FFFFFF", fontSize:13, fontWeight:700 }}>Sell or Rent Property</a>
      </div>
    </nav>
  );
}

export function Footer() {
  const cols = [
    { heading:"Properties", links:[["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
    { heading:"Company",    links:[["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Press","/press"],["Contact","/contact"]] },
    { heading:"Tools",      links:[["EMI Calculator","/calculator"],["Investment Calc","/investment-calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]] },
    { heading:"Legal",      links:[["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["Refund Policy","/refund-policy"]] },
  ];
  return (
    <footer className="sc-footer" style={{ background:"#020C1C", padding:"56px 56px 28px", color:"rgba(255,255,255,0.55)" }}>
      <div style={{ maxWidth:1280, margin:"0 auto" }}>
        <div className="sc-footer-grid" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:40, marginBottom:48 }}>
          <div>
            <a href="/" style={{ display:"inline-block", marginBottom:12 }}>
              <img src="/brand/Nilay360-09-Photoroom%20(1).png" alt="Nilay 360" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
            </a>
            <p style={{ fontSize:13, lineHeight:1.75, maxWidth:240, marginBottom:20 }}>India&apos;s premium real estate platform connecting discerning buyers with exceptional properties.</p>
            <div style={{ display:"flex", gap:10 }}>
              {[
                { label:"Instagram", icon:"IG", href:"https://www.instagram.com/nilay360_/" },
                { label:"LinkedIn",  icon:"LI", href:"https://linkedin.com/company/nilay360" },
                { label:"Facebook",  icon:"FB", href:"https://facebook.com/nilay360" },
                { label:"YouTube",   icon:"YT", href:"https://www.youtube.com/@nilay360.digital" },
              ].map(s => (
                <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer"
                  style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.5)", textDecoration:"none" }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.heading}>
              <h4 style={{ fontSize:10, fontWeight:700, color:"#FFFFFF", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:16 }}>{col.heading}</h4>
              {col.links.map(([l,h]) => (
                <a key={l} href={h} style={{ display:"block", color:"rgba(255,255,255,0.5)", fontSize:13, marginBottom:10 }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="sc-footer-bottom" style={{ borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <p style={{ fontSize:12 }}>© {new Date().getFullYear()} Nilay 360 · All rights reserved.</p>
          <p style={{ fontSize:12 }}>All listings subject to availability. Verify with RERA before purchase.</p>
        </div>
      </div>
    </footer>
  );
}

/* Full page shell: fonts + navbar + hero + body + footer.
   `bullets` renders a feature/coming-soon list; `children` adds custom content. */
export function PageShell({
  eyebrow, title, italic, subtitle, badge = "Coming Soon", bullets, children,
}: {
  eyebrow?: string; title: string; italic?: string; subtitle?: string;
  badge?: string; bullets?: { t: string; d: string }[]; children?: ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href={FONTS} />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cal Sans',system-ui,sans-serif;background:#020C1C;color:#FFFFFF}a{text-decoration:none;color:inherit}@media(max-width:820px){.nv-center{display:none!important}}@media(max-width:768px){.sc-nav{padding:0 16px!important}.sc-nav-actions{gap:8px!important}.sc-hero{padding:90px 16px 48px!important}.sc-body{padding:32px 16px!important}.sc-bullets{grid-template-columns:1fr!important;gap:12px!important}.sc-cta-banner{padding:28px 20px!important;flex-direction:column!important;gap:16px!important}.sc-footer{padding:48px 16px 24px!important}.sc-footer-grid{grid-template-columns:1fr 1fr!important;gap:28px!important}.sc-footer-bottom{flex-direction:column!important;text-align:center!important;gap:8px!important}}@media(max-width:480px){.sc-footer-grid{grid-template-columns:1fr!important}.sc-bullets{grid-template-columns:1fr!important}}`}</style>
      <Navbar />

      {/* Hero */}
      <section className="sc-hero" style={{ background:"#050810", position:"relative", overflow:"hidden", padding:"140px 56px 72px" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 70% 60% at 70% 30%, rgba(16,196,195,0.06) 0%, transparent 65%), radial-gradient(ellipse 50% 70% at 25% 70%, rgba(16,196,195,0.03) 0%, transparent 60%)` }} />
        <div style={{ position:"relative", maxWidth:1280, margin:"0 auto" }}>
          {badge && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(16,196,195,0.1)", border:"0.5px solid rgba(16,196,195,0.3)", borderRadius:99, padding:"6px 16px", marginBottom:22 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#10C4C3", display:"inline-block" }} />
              <span style={{ fontSize:11, color:"#10C4C3", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" }}>{badge}</span>
            </div>
          )}
          {eyebrow && <div style={{ fontSize:11, color:"#10C4C3", fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:14 }}>{eyebrow}</div>}
          <h1 style={{ fontFamily:"'Cal Sans',Georgia,serif", fontSize:"clamp(40px,5vw,60px)", fontWeight:300, color:"#fff", lineHeight:1.05, letterSpacing:"-0.01em" }}>
            {title}
            {italic && <em style={{ display:"block", color:"#3DDAD9", fontStyle:"italic", fontWeight:400 }}>{italic}</em>}
          </h1>
          {subtitle && <p style={{ fontSize:16, color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginTop:18, maxWidth:560, fontWeight:300 }}>{subtitle}</p>}
        </div>
      </section>

      {/* Body */}
      <section className="sc-body" style={{ background:"#020C1C", padding:"56px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto" }}>
          {children}
          {bullets && (
            <div className="sc-bullets" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginTop: children ? 40 : 0 }}>
              {bullets.map(b => (
                <div key={b.t} style={{ border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:28, background:"#0A1526" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"rgba(16,196,195,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h3 style={{ fontFamily:"'Cal Sans',Georgia,serif", fontSize:20, fontWeight:700, color:"#FFFFFF", marginBottom:8 }}>{b.t}</h3>
                  <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.7 }}>{b.d}</p>
                </div>
              ))}
            </div>
          )}

          {/* Never dead-end: always links back */}
          <div className="sc-cta-banner" style={{ marginTop:48, padding:"36px 40px", background:"linear-gradient(135deg, #0A1526 0%, #111F33 100%)", borderRadius:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
            <div>
              <h3 style={{ fontFamily:"'Cal Sans',Georgia,serif", fontSize:24, fontWeight:600, color:"#FFFFFF", marginBottom:6 }}>Looking for something now?</h3>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.6)" }}>Browse live listings or talk to a Nilay 360 property expert.</p>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <a href="/properties" style={{ padding:"13px 28px", background:"#10C4C3", borderRadius:8, color:"#FFFFFF", fontSize:14, fontWeight:700 }}>Browse Properties</a>
              <a href="/contact" style={{ padding:"13px 28px", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"#FFFFFF", fontSize:14, fontWeight:500 }}>Contact an Expert</a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
