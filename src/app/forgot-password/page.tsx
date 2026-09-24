"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "../_components/SiteChrome";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    // redirectTo lands on the existing OAuth callback route, which already
    // exchanges a Supabase auth code for a session — the same mechanism
    // this app uses for Google sign-in. There is no dedicated "set a new
    // password" page yet, so this establishes a signed-in session on
    // success but does not yet prompt the user to choose a new password;
    // that follow-up screen is a separate, not-yet-built piece of work.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (resetError) {
      setError(resetError.message || "Could not send reset link. Please try again.");
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <PageShell
      eyebrow="Account"
      title="Reset Your"
      italic="Password"
      subtitle="Enter the email associated with your Nilay 360 account and we'll send you a secure link to set a new password."
      badge="Account Recovery"
    >
      <div style={{ maxWidth:420, margin:"0 auto" }}>
        {status === "sent" ? (
          <div style={{ background:"#020C1C", borderRadius:16, padding:32, border:"1px solid rgba(0,0,0,0.06)", textAlign:"center" }}>
            <p style={{ fontSize:15, fontWeight:600, color:"#10C4C3", marginBottom:8 }}>Check your inbox</p>
            <p style={{ fontSize:13, color:"#666", lineHeight:1.6 }}>
              If an account exists for {email}, we&apos;ve sent a link to reset your password.
            </p>
            <p style={{ textAlign:"center", fontSize:13, color:"#666", marginTop:18 }}>
              <a href="/login" style={{ color:"#10C4C3", fontWeight:600 }}>Back to Sign In</a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background:"#020C1C", borderRadius:16, padding:32, border:"1px solid rgba(0,0,0,0.06)" }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#020C1C", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:8 }}>Email Address</label>
            <input
              type="email" required placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:"100%", padding:"13px 16px", borderRadius:8, border:"1px solid rgba(13,43,31,0.15)", fontSize:14, fontFamily:"var(--font-body-new)", marginBottom:18, outline:"none" }} />
            {error && (
              <p style={{ fontSize:13, color:"#DC2626", marginBottom:14 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              style={{ width:"100%", padding:"13px", background:"#10C4C3", border:"none", borderRadius:8, color:"#020C1C", fontSize:14, fontWeight:700, cursor: status === "sending" ? "not-allowed" : "pointer", opacity: status === "sending" ? 0.65 : 1, fontFamily:"var(--font-body-new)" }}>
              {status === "sending" ? "Sending…" : "Send Reset Link"}
            </button>
            <p style={{ textAlign:"center", fontSize:13, color:"#666", marginTop:18 }}>
              Remembered it? <a href="/login" style={{ color:"#10C4C3", fontWeight:600 }}>Back to Sign In</a>
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}
