"use client";
import { useParams } from "next/navigation";
import { PageShell } from "../../_components/SiteChrome";

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const title = slug ? titleize(slug) : "Article";

  return (
    <PageShell
      eyebrow="Nilay 360 Insights"
      title={title}
      subtitle="This article is being prepared by our editorial team. In the meantime, explore more from the Nilay 360 blog or browse live listings."
      badge="Article"
    >
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        <p style={{ fontSize:16, color:"#444", lineHeight:1.85, marginBottom:20 }}>
          We're putting the finishing touches on this piece. Nilay 360 Insights covers market trends,
          buying and renting guides, RERA explainers and neighbourhood deep-dives across India's
          premium property markets.
        </p>
        <p style={{ fontSize:16, color:"#444", lineHeight:1.85, marginBottom:32 }}>
          Want to be notified when new articles go live, or have a topic you'd like us to cover?
          Reach out and our team will be happy to help.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <a href="/blog" style={{ padding:"12px 26px", background:"#000000", borderRadius:8, color:"#fff", fontSize:14, fontWeight:600 }}>← All Articles</a>
          <a href="/contact" style={{ padding:"12px 26px", border:"1px solid rgba(13,43,31,0.2)", borderRadius:8, color:"#000000", fontSize:14, fontWeight:500 }}>Suggest a Topic</a>
        </div>
      </div>
    </PageShell>
  );
}
