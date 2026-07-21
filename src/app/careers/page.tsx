import { PageShell } from "../_components/SiteChrome";

export default function CareersPage() {
  return (
    <PageShell
      eyebrow="Join Us"
      title="Careers at"
      italic="Nilay 360"
      subtitle="We're building India's most trusted premium real estate platform. If you care about craft, transparency and customers — we'd love to talk."
      badge="We're Hiring"
      bullets={[
        { t:"Engineering", d:"Build the platform powering thousands of property journeys. React, Next.js, Supabase." },
        { t:"Sales & Agents", d:"Join our network of 500+ certified agents across 14 cities. Uncapped earning." },
        { t:"Marketing & Growth", d:"Tell the Nilay 360 story to millions of home buyers and investors nationwide." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:640, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"'Cal Sans',Georgia,serif", fontSize:32, fontWeight:700, color:"#020C1C", marginBottom:12 }}>Open Roles</h2>
        <p style={{ fontSize:15, color:"#666", lineHeight:1.7 }}>
          We don't have public openings listed just yet — but we're always looking for exceptional people.
          Email your CV to <a href="mailto:careers@nilay360.com" style={{ color:"#10C4C3", fontWeight:600 }}>careers@nilay360.com</a> and we'll reach out when a role fits.
        </p>
      </div>
    </PageShell>
  );
}
