import { PageShell } from "../../_components/SiteChrome";

export default function AuthErrorPage() {
  return (
    <PageShell
      eyebrow="Account"
      title="Sign-In"
      italic="Failed"
      subtitle="Something went wrong completing your sign-in. This can happen if the link expired or was already used — please head back and try again."
      badge="Sign-In Error"
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: "#020C1C", borderRadius: 16, padding: 32, border: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#A9B4C2", fontFamily: "var(--font-body-new)", lineHeight: 1.6, marginBottom: 24 }}>
            We couldn&apos;t complete sign-in. No changes were made to your account.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block", width: "100%", padding: "13px",
              background: "#10C4C3", borderRadius: 8, color: "#020C1C",
              fontSize: 14, fontWeight: 700, fontFamily: "var(--font-body-new)",
              textDecoration: "none", boxSizing: "border-box",
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    </PageShell>
  );
}
