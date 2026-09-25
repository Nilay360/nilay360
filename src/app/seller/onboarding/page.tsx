import { PageShell } from "../../_components/SiteChrome";

export default function SellerOnboardingPage() {
  return (
    <PageShell
      eyebrow="Seller Onboarding"
      title="List Your First"
      italic="Property in 4 Steps"
      subtitle="Welcome to Nilay 360. Here's how to go from account to live listing — most sellers finish in under ten minutes."
      badge="Getting Started"
      bullets={[
        { t:"1 · Create Account", d:"Sign up with your email or phone. Verify to unlock the seller dashboard." },
        { t:"2 · Add Property Details", d:"Enter location, type, size, pricing and amenities. Add high-quality photos." },
        { t:"3 · RERA Details", d:"If your property has RERA registration, let us know — we'll add it to your listing." },
        { t:"4 · Publish & Get Leads", d:"Go live and start receiving enquiries from serious buyers and tenants." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:600, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"var(--font-heading-new)", fontSize:32, fontWeight:700, color:"#FFFFFF", marginBottom:14 }}>Begin onboarding</h2>
        <p style={{ fontSize:15, color:"#A9B4C2", lineHeight:1.7, marginBottom:24 }}>
          Create your account or head to the dashboard to publish your first listing.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/register" style={{ padding:"13px 30px", background:"#10C4C3", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:700 }}>Create Account</a>
          <a href="/post-property" style={{ padding:"13px 30px", border:"1px solid rgba(13,43,31,0.2)", borderRadius:8, color:"#FFFFFF", fontSize:14, fontWeight:500 }}>Post a Property</a>
        </div>
      </div>
    </PageShell>
  );
}
