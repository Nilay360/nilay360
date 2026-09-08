import { PageShell } from "../_components/SiteChrome";

export default function SavedPage() {
  return (
    <PageShell
      eyebrow="Your Wishlist"
      title="Saved"
      italic="Properties"
      subtitle="Every property you save is kept here so you can compare, revisit and share your shortlist anytime — across all your devices."
      badge="Sign In to Sync"
      bullets={[
        { t:"One-tap Save", d:"Tap the heart on any listing to add it to your wishlist instantly." },
        { t:"Compare Shortlist", d:"Send saved homes straight to the compare tool to weigh them side-by-side." },
        { t:"Synced Everywhere", d:"Sign in and your saved properties follow you across web and mobile." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:600, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"var(--font-heading-new)", fontSize:32, fontWeight:700, color:"#020C1C", marginBottom:14 }}>No saved properties yet</h2>
        <p style={{ fontSize:15, color:"#666", lineHeight:1.7, marginBottom:24 }}>
          Sign in to see your wishlist, or start browsing and tap the heart on homes you love.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="/login" style={{ padding:"13px 30px", background:"#10C4C3", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:700 }}>Sign In</a>
          <a href="/properties" style={{ padding:"13px 30px", border:"1px solid rgba(13,43,31,0.2)", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:500 }}>Browse Properties</a>
        </div>
      </div>
    </PageShell>
  );
}
