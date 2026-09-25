"use client";

import { PageShell } from "../_components/SiteChrome";
import { useLiveStats } from "@/lib/liveStats";

export default function CareersPage() {
  const liveStats = useLiveStats();
  const agents = liveStats.agents;
  const cities = liveStats.cities;
  return (
    <PageShell
      eyebrow="Join Us"
      title="Careers at"
      italic="Nilay 360"
      subtitle="We're building India's premium real estate platform. If you care about craft, transparency and customers — we'd love to talk."
      badge="We're Hiring"
      bullets={[
        { t:"Engineering", d:"Build the platform powering thousands of property journeys. React, Next.js, Supabase." },
        { t:"Sales & Agents", d:`Join our network of ${agents} agent${agents === 1 ? "" : "s"}${cities === 1 && liveStats.cityNames[0] ? ` in ${liveStats.cityNames[0]}` : ` across ${cities} cities`}. Uncapped earning.` },
        { t:"Marketing & Growth", d:"Tell the Nilay 360 story to millions of home buyers and investors nationwide." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:640, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"var(--font-heading-new)", fontSize:32, fontWeight:700, color:"#FFFFFF", marginBottom:12 }}>Open Roles</h2>
        <p style={{ fontSize:15, color:"#A9B4C2", lineHeight:1.7 }}>
          We don't have public openings listed just yet — but we're always looking for exceptional people.
          Email your CV to <a href="mailto:careers@nilay360.com" style={{ color:"#10C4C3", fontWeight:600 }}>careers@nilay360.com</a> and we'll reach out when a role fits.
        </p>
      </div>
    </PageShell>
  );
}
