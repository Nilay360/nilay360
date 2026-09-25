import { PageShell } from "../_components/SiteChrome";

export default function AgentRegisterPage() {
  return (
    <PageShell
      eyebrow="Grow With Us"
      title="Join Nilay 360 as an"
      italic="Agent Partner"
      subtitle="Become part of India's premium real estate network. Get qualified leads, a powerful dashboard and the Nilay 360 brand behind every deal."
      badge="Applications Open"
      bullets={[
        { t:"Qualified Leads", d:"Receive high-intent buyer and tenant enquiries in your city every week." },
        { t:"Agent Dashboard", d:"Manage listings, leads and client conversations from one elegant workspace." },
        { t:"Training & Support", d:"Onboarding, certification and a dedicated partner success team to help you close." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:600, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"var(--font-heading-new)", fontSize:32, fontWeight:700, color:"#FFFFFF", marginBottom:14 }}>Start your application</h2>
        <p style={{ fontSize:15, color:"#A9B4C2", lineHeight:1.7, marginBottom:24 }}>
          Create an account to begin onboarding, or explore the agent network to see who's already on board.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/register" style={{ padding:"13px 30px", background:"#10C4C3", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:700 }}>Apply Now</a>
          <a href="/agents" style={{ padding:"13px 30px", border:"1px solid rgba(13,43,31,0.2)", borderRadius:8, color:"#FFFFFF", fontSize:14, fontWeight:500 }}>View Agent Network</a>
        </div>
      </div>
    </PageShell>
  );
}
