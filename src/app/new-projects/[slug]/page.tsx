"use client";
import { useParams } from "next/navigation";
import { PageShell } from "../../_components/SiteChrome";

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const looksNumeric = /^\d+$/.test(slug);
  const title = slug && !looksNumeric ? titleize(slug) : "New Project";

  return (
    <PageShell
      eyebrow="New Launch"
      title={title}
      subtitle="Full project details — floor plans, pricing, amenities and RERA status — are being added. Register your interest and a Nilay 360 expert will share the latest brochure."
      badge="Under Construction"
      bullets={[
        { t:"RERA Approved", d:"Verified registration so you can invest with complete confidence." },
        { t:"Flexible Plans", d:"Configurations and payment schedules to suit every kind of buyer." },
        { t:"Prime Location", d:"Hand-picked developments in the city's most sought-after micro-markets." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:600, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#000000", marginBottom:14 }}>Register your interest</h2>
        <p style={{ fontSize:15, color:"#666", lineHeight:1.7, marginBottom:24 }}>
          Be the first to receive floor plans, pricing and launch offers for this project.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/contact" style={{ padding:"13px 30px", background:"#2BA8E0", borderRadius:8, color:"#000000", fontSize:14, fontWeight:700 }}>Request Details</a>
          <a href="/new-projects" style={{ padding:"13px 30px", border:"1px solid rgba(13,43,31,0.2)", borderRadius:8, color:"#000000", fontSize:14, fontWeight:500 }}>← All New Projects</a>
        </div>
      </div>
    </PageShell>
  );
}
