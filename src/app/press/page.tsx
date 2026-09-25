import { PageShell } from "../_components/SiteChrome";

export default function PressPage() {
  return (
    <PageShell
      eyebrow="Newsroom"
      title="Press &"
      italic="Media"
      subtitle="The latest news, announcements and media resources from Nilay 360. For interviews, data or brand assets, reach our communications team."
      badge="Coming Soon"
      bullets={[
        { t:"Media Kit", d:"Logos, brand guidelines and executive headshots for journalists and partners." },
        { t:"Market Reports", d:"Quarterly insight reports on India's premium residential and commercial markets." },
        { t:"Press Enquiries", d:"Reach our communications team at press@nilay360.com for interviews and comment." },
      ]}
    >
      <div style={{ textAlign:"center", maxWidth:600, margin:"0 auto 8px" }}>
        <h2 style={{ fontFamily:"var(--font-heading-new)", fontSize:32, fontWeight:700, color:"#FFFFFF", marginBottom:12 }}>Media Contact</h2>
        <p style={{ fontSize:15, color:"#A9B4C2", lineHeight:1.7 }}>
          For all media enquiries, please write to <a href="mailto:press@nilay360.com" style={{ color:"#10C4C3", fontWeight:600 }}>press@nilay360.com</a>.
        </p>
      </div>
    </PageShell>
  );
}
