import { PageShell } from "../_components/SiteChrome";

export default function ForgotPasswordPage() {
  return (
    <PageShell
      eyebrow="Account"
      title="Reset Your"
      italic="Password"
      subtitle="Enter the email associated with your Nilay 360 account and we'll send you a secure link to set a new password."
      badge="Account Recovery"
    >
      <div style={{ maxWidth:420, margin:"0 auto" }}>
        <form action="/login" style={{ background:"#020C1C", borderRadius:16, padding:32, border:"1px solid rgba(0,0,0,0.06)" }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#020C1C", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>Email Address</label>
          <input type="email" required placeholder="you@example.com"
            style={{ width:"100%", padding:"13px 16px", borderRadius:8, border:"1px solid rgba(13,43,31,0.15)", fontSize:14, fontFamily:"var(--font-body-new)", marginBottom:18, outline:"none" }} />
          <button type="submit" style={{ width:"100%", padding:"13px", background:"#10C4C3", border:"none", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body-new)" }}>
            Send Reset Link
          </button>
          <p style={{ textAlign:"center", fontSize:13, color:"#666", marginTop:18 }}>
            Remembered it? <a href="/login" style={{ color:"#10C4C3", fontWeight:600 }}>Back to Sign In</a>
          </p>
        </form>
      </div>
    </PageShell>
  );
}
