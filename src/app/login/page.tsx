"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { openAuthModal } = useAuth();

  // The auth UI now lives in a global overlay modal. Visiting /login directly
  // redirects home and opens the modal; the full page below remains as a
  // no-JS fallback.
  useEffect(() => {
    openAuthModal("signin");
    router.replace("/");
  }, [openAuthModal, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("email not confirmed") || msg.includes("wrong")) {
          setError("Invalid email or password. Please try again.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
      } else {
        // Query profiles table for the user's role and redirect accordingly.
        // Falls back to /dashboard if the query fails (e.g. RLS policy issues).
        let destination = "/dashboard";
        try {
          const userId = signInData.user?.id;
          if (userId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", userId)
              .single();
            if (profile?.role === "agent") destination = "/dashboard/agent";
            else if (profile?.role === "admin" || profile?.role === "super_admin") destination = "/dashboard/admin";
          }
        } catch {
          // Swallow — fall through to default /dashboard
        }
        router.push(destination);
      }
    } catch (error) {
      console.log(error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }

        .auth-root {
          display: flex; min-height: 100vh;
        }

        /* ── LEFT PANEL ── */
        .auth-left {
          flex: 0 0 42%;
          background: #020C1C;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
          position: relative; overflow: hidden;
        }
        .auth-left::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 110%, rgba(201,168,76,0.13) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 90% -10%, rgba(45,106,79,0.35) 0%, transparent 55%);
          pointer-events: none;
        }
        .auth-left-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .auth-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; position: relative; z-index: 2;
        }
        .auth-logo-text {
          font-family: var(--font-support-new);
          font-size: 18px; font-weight: 600;
          color: #fff; letter-spacing: 0.2em;
        }
        .auth-logo-dot { color: #10C4C3; font-size: 22px; line-height: 1; }

        .auth-left-body {
          position: relative; z-index: 2; flex: 1;
          display: flex; flex-direction: column;
          justify-content: center; padding: 48px 0 32px;
        }
        .auth-left-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 20px;
        }
        .auth-left-eyebrow-line {
          width: 28px; height: 1px; background: #10C4C3;
        }
        .auth-left-eyebrow-text {
          font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
          color: #10C4C3; text-transform: uppercase;
        }
        .auth-left-heading {
          font-family: var(--font-heading-new);
          font-size: clamp(36px, 4vw, 52px);
          font-weight: 300; line-height: 1.12;
          color: #020C1C; margin-bottom: 20px;
        }
        .auth-left-heading em {
          font-style: italic; color: #10C4C3; font-weight: 300;
        }
        .auth-left-sub {
          font-size: 14px; font-weight: 400; line-height: 1.7;
          color: rgba(245,242,236,0.55); max-width: 320px;
          margin-bottom: 44px;
        }
        .auth-left-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, #10C4C3, transparent);
          margin-bottom: 28px;
        }
        .auth-quote {
          border-left: 2px solid rgba(201,168,76,0.35);
          padding-left: 20px;
        }
        .auth-quote-text {
          font-family: var(--font-heading-new);
          font-size: 17px; font-style: italic; font-weight: 300;
          line-height: 1.65; color: rgba(245,242,236,0.65);
        }
        .auth-quote-author {
          margin-top: 10px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.12em;
          color: rgba(201,168,76,0.7); text-transform: uppercase;
        }

        .auth-left-footer {
          position: relative; z-index: 2;
        }
        .auth-trust-badges {
          display: flex; gap: 20px; flex-wrap: wrap;
        }
        .auth-trust-badge {
          display: flex; align-items: center; gap: 6px;
        }
        .auth-trust-badge-icon {
          width: 18px; height: 18px;
          background: rgba(201,168,76,0.15);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; color: #10C4C3;
        }
        .auth-trust-badge-label {
          font-size: 11px; font-weight: 500;
          color: rgba(245,242,236,0.4); letter-spacing: 0.04em;
        }

        /* ── RIGHT PANEL ── */
        .auth-right {
          flex: 1;
          background: #020C1C;
          display: flex; align-items: center; justify-content: center;
          padding: 52px 48px;
          position: relative;
        }
        .auth-right::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 50% at 80% 20%, rgba(201,168,76,0.06) 0%, transparent 60%);
          pointer-events: none;
        }

        .auth-form-card {
          width: 100%; max-width: 440px;
          position: relative; z-index: 2;
        }

        .auth-form-header {
          margin-bottom: 36px;
        }
        .auth-form-title {
          font-family: var(--font-heading-new);
          font-size: 36px; font-weight: 500; line-height: 1.1;
          color: #020C1C; margin-bottom: 8px;
        }
        .auth-form-subtitle {
          font-size: 14px; color: #6B7C72; font-weight: 400;
        }
        .auth-form-subtitle a {
          color: #10C4C3; text-decoration: none; font-weight: 500;
        }
        .auth-form-subtitle a:hover { text-decoration: underline; }

        .auth-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(13,43,31,0.12), transparent);
          margin: 28px 0;
        }

        .form-group { margin-bottom: 18px; }
        .form-label {
          display: block; margin-bottom: 7px;
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
          color: #020C1C; text-transform: uppercase;
        }
        .form-input-wrap { position: relative; }
        .form-input {
          width: 100%; padding: 13px 16px;
          background: #fff;
          border: 1.5px solid rgba(13,43,31,0.15);
          border-radius: 8px;
          font-family: var(--font-body-new);
          font-size: 14px; font-weight: 400; color: #020C1C;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .form-input::placeholder { color: #aab5ae; }
        .form-input:focus {
          border-color: #10C4C3;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }
        .form-input-icon {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          color: #aab5ae; cursor: pointer; font-size: 16px;
          transition: color 0.15s;
        }
        .form-input-icon:hover { color: #10C4C3; }
        .form-input-pw { padding-right: 44px; }

        .form-row-between {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; flex-wrap: wrap; gap: 8px;
        }
        .form-check-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #6B7C72; cursor: pointer;
        }
        .form-check-label input[type="checkbox"] {
          width: 15px; height: 15px; accent-color: #10C4C3; cursor: pointer;
        }
        .forgot-link {
          font-size: 13px; color: #10C4C3; text-decoration: none; font-weight: 500;
        }
        .forgot-link:hover { text-decoration: underline; }

        .btn-gold {
          width: 100%; padding: 14px 24px;
          background: #10C4C3; border: none; border-radius: 8px;
          font-family: var(--font-body-new);
          font-size: 14px; font-weight: 600; letter-spacing: 0.06em;
          color: #020C1C; cursor: pointer;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
          text-transform: uppercase;
        }
        .btn-gold:hover {
          background: #3DDAD9;
          box-shadow: 0 4px 20px rgba(201,168,76,0.35);
          transform: translateY(-1px);
        }
        .btn-gold:active { transform: translateY(0); }

        .auth-or {
          display: flex; align-items: center; gap: 12px;
          margin: 22px 0;
        }
        .auth-or-line { flex: 1; height: 1px; background: rgba(13,43,31,0.12); }
        .auth-or-text { font-size: 11px; color: #aab5ae; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }

        .btn-social {
          width: 100%; padding: 12px 24px;
          background: #fff; border: 1.5px solid rgba(13,43,31,0.15);
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-family: var(--font-body-new);
          font-size: 14px; font-weight: 500; color: #020C1C;
          transition: border-color 0.18s, box-shadow 0.18s;
          margin-bottom: 12px;
        }
        .btn-social:hover {
          border-color: rgba(13,43,31,0.3);
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }
        .btn-social-icon { width: 18px; height: 18px; flex-shrink: 0; }

        .btn-otp {
          width: 100%; padding: 12px 24px;
          background: transparent;
          border: 1.5px solid rgba(13,43,31,0.15);
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-family: var(--font-body-new);
          font-size: 14px; font-weight: 500; color: #6B7C72;
          transition: border-color 0.18s, color 0.18s;
        }
        .btn-otp:hover { border-color: #10C4C3; color: #10C4C3; }

        /* ── RESPONSIVE ── */
        @media (max-width: 860px) {
          .auth-root { flex-direction: column; }
          .auth-left { flex: 0 0 auto; padding: 36px 32px 40px; min-height: auto; }
          .auth-left-body { padding: 28px 0 0; }
          .auth-right { padding: 40px 24px; }
          .auth-quote { display: none; }
          .auth-left-heading { font-size: 38px; }
        }
        @media (max-width: 480px) {
          .auth-left { padding: 28px 20px 32px; }
          .auth-right { padding: 32px 16px; }
          .auth-left-heading { font-size: 32px; }
          .form-row-between { flex-direction: column; align-items: flex-start; }
          .auth-left-sub { display: none; }
          .auth-left-divider { display: none; }
          .auth-trust-badges { display: none; }
        }
      `}</style>

      <div className="auth-root">

        {/* ── LEFT PANEL ── */}
        <div className="auth-left">
          <div className="auth-left-grid" />

          <a href="/" className="auth-logo">
            <span className="auth-logo-text">Nilay 360</span>
            <span className="auth-logo-dot">·</span>
          </a>

          <div className="auth-left-body">
            <div className="auth-left-eyebrow">
              <div className="auth-left-eyebrow-line" />
              <span className="auth-left-eyebrow-text">Premium Real Estate</span>
            </div>

            <h1 className="auth-left-heading">
              Where Trust Meets<br /><em>Luxury Living</em>
            </h1>

            <p className="auth-left-sub">
              Access India&apos;s finest curated properties, verified listings, and concierge-grade service — all in one platform.
            </p>

            <div className="auth-left-divider" />

            <blockquote className="auth-quote">
              <p className="auth-quote-text">
                &ldquo;The home you deserve is not just a place to live — it is the story of who you have become.&rdquo;
              </p>
              <p className="auth-quote-author">— Nilay 360 Philosophy</p>
            </blockquote>
          </div>

          <div className="auth-left-footer">
            <div className="auth-trust-badges">
              {[
                { icon: "✓", label: "Verified Listings" },
                { icon: "★", label: "Trusted Agents" },
                { icon: "⬡", label: "Concierge Service" },
              ].map((b) => (
                <div key={b.label} className="auth-trust-badge">
                  <div className="auth-trust-badge-icon">{b.icon}</div>
                  <span className="auth-trust-badge-label">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right">
          <div className="auth-form-card">

            <div className="auth-form-header">
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-subtitle">
                Don&apos;t have an account?{" "}
                <a href="/register">Create one free</a>
              </p>
            </div>

            {error && (
              <div style={{
                marginBottom: "18px", padding: "12px 16px",
                background: "rgba(229,62,62,0.08)", border: "1.5px solid rgba(229,62,62,0.25)",
                borderRadius: "8px", fontSize: "13px", color: "#C53030", lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn}>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <div className="form-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    autoComplete="email"
                    style={emailFocus ? { borderColor: '#10C4C3', boxShadow: '0 0 0 3px rgba(201,168,76,0.12)' } : {}}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div className="form-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="form-input form-input-pw"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                    autoComplete="current-password"
                    style={passwordFocus ? { borderColor: '#10C4C3', boxShadow: '0 0 0 3px rgba(201,168,76,0.12)' } : {}}
                  />
                  <button
                    type="button"
                    className="form-input-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="form-row-between">
                <label className="form-check-label">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="/forgot-password" className="forgot-link">Forgot password?</a>
              </div>

              {/* Sign In */}
              <button type="submit" className="btn-gold" disabled={loading}
                style={loading ? { opacity: 0.7, cursor: "not-allowed" } : undefined}>
                {loading ? "Signing In…" : "Sign In"}
              </button>

            </form>

            <div className="auth-or">
              <div className="auth-or-line" />
              <span className="auth-or-text">or continue with</span>
              <div className="auth-or-line" />
            </div>

            {/* Google OAuth */}
            <button type="button" className="btn-social">
              <svg className="btn-social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* OTP */}
            <button type="button" className="btn-otp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Sign in with Phone OTP
            </button>

          </div>
        </div>

      </div>
    </>
  );
}
