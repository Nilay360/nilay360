"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth, type AuthMode } from "@/context/AuthContext";

/*
 * Nilay 360 AuthModal — full-screen overlay with two modes (signin / register).
 *
 * Google OAuth: the "Continue with Google" button is wired to
 * supabase.auth.signInWithOAuth, but it only fires when
 *   NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
 * is set in .env.local — which should only be done AFTER the Google Client ID
 * has been configured in the Supabase Auth dashboard. Until then the button
 * renders but shows a friendly "not configured yet" message instead of failing.
 */

const GOOGLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

const CITIES = ["Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Pune", "Chennai", "Others"];

type AccountType = "individual" | "agent";

const GOLD = "#10C4C3";
const GREEN = "#0A1526";
const CARD_BG = "#0a0a0a";

// ─── Small shared bits ─────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function BackArrow({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Go back" className="am-back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      margin: "0 0 16px", padding: "11px 14px",
      background: "rgba(229,62,62,0.10)", border: "1px solid rgba(229,62,62,0.3)",
      borderRadius: 8, fontSize: 13, color: "#FF8A8A", lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}

// ─── OTP boxes (shared by both flows) ───────────────────────────────────────────

function OtpBoxes({
  value, onChange, disabled,
}: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (idx: number, digit: string) => {
    const next = [...value];
    next[idx] = digit;
    onChange(next);
  };

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(idx, digit);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 20 }}>
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className="am-otp-box"
        />
      ))}
    </div>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────────

export default function AuthModal() {
  const { isModalOpen, mode, closeAuthModal, refreshAuth } = useAuth();

  if (!isModalOpen) return null;
  return <AuthModalInner mode={mode} onClose={closeAuthModal} refreshAuth={refreshAuth} />;
}

function AuthModalInner({
  mode: initialMode, onClose, refreshAuth,
}: { mode: AuthMode; onClose: () => void; refreshAuth: () => Promise<void> }) {
  const [tab, setTab] = useState<AuthMode>(initialMode);

  // shared
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // sign-in flow
  const [siStep, setSiStep]   = useState<1 | 2 | 3>(1);
  const [siPhone, setSiPhone] = useState("");
  const [siOtp, setSiOtp]     = useState<string[]>(["", "", "", "", "", ""]);

  // register flow
  const [reStep, setReStep]   = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [reForm, setReForm] = useState({
    full_name: "", phone: "", email: "", city: CITIES[0], rera: "", agency: "",
  });
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [reOtp, setReOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [agentPending, setAgentPending] = useState(false);
  const [reSuccess, setReSuccess] = useState(false);

  // resend countdown (shared between both OTP screens)
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(30);
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current !== null) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current !== null) clearInterval(timerRef.current); }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const switchTab = (next: AuthMode) => {
    setTab(next);
    setError(null);
  };

  // ── Google OAuth ──
  async function handleGoogle() {
    setError(null);
    if (!GOOGLE_OAUTH_ENABLED) {
      setError("Google sign-in isn't configured yet. Please use your phone number for now.");
      return;
    }
    try {
      const supabase = createClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) setError(oauthErr.message);
      // On success the browser redirects to Google — nothing more to do here.
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
    }
  }

  // ── OTP helpers ──
  const cleanPhone = (raw: string) => raw.replace(/\D/g, "").slice(0, 10);

  async function sendOtp(phone10: string): Promise<boolean> {
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone10 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send OTP. Please try again.");
        return false;
      }
      return true;
    } catch {
      setError("Network error. Please check your connection and try again.");
      return false;
    }
  }

  // ── SIGN IN: step 1 → send OTP ──
  async function handleSiSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (siPhone.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    setLoading(true);
    const ok = await sendOtp(siPhone);
    setLoading(false);
    if (ok) { setSiOtp(["", "", "", "", "", ""]); setSiStep(2); startCountdown(); }
  }

  // ── SIGN IN: step 2 → verify ──
  async function handleSiVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = siOtp.join("");
    if (token.length !== 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true);
    try {
      // Verify OTP with MSG91 and receive a session token from the server
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: siPhone, otp: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired code. Please try again.");
        setLoading(false);
        return;
      }

      // Exchange the server-issued token_hash for a real Supabase session
      const supabase = createClient();
      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: data.type,
      });
      if (sessionErr) {
        setError("Something went wrong completing sign-in. Please try again.");
        setLoading(false);
        return;
      }

      await refreshAuth();
      setLoading(false);
      setSiStep(3);
      window.setTimeout(() => { onClose(); }, 1400);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ── REGISTER: step 2 → send OTP ──
  async function handleReSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reForm.full_name.trim()) { setError("Please enter your full name."); return; }
    if (reForm.phone.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reForm.email)) { setError("Please enter a valid email address."); return; }
    if (accountType === "agent" && !reForm.rera.trim()) {
      setError("RERA Registration Number is required for agent accounts.");
      return;
    }
    setLoading(true);
    const ok = await sendOtp(reForm.phone);
    setLoading(false);
    if (!ok) return;
    setReOtp(["", "", "", "", "", ""]);
    setReStep(3);
    startCountdown();
  }

  // ── REGISTER: step 3 → verify + create profile ──
  async function handleReVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = reOtp.join("");
    if (token.length !== 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true);
    try {
      // Verify OTP with MSG91; server creates user + profile and returns session token
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone:        reForm.phone,
          otp:          token,
          email:        reForm.email,
          full_name:    reForm.full_name,
          account_type: accountType,
          city:         reForm.city,
          whatsapp:     whatsappOptIn,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired code. Please try again.");
        setLoading(false);
        return;
      }

      // Exchange the server-issued token_hash for a real Supabase session
      const supabase = createClient();
      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: data.type,
      });
      if (sessionErr) {
        setError("Something went wrong completing sign-in. Please try again.");
        setLoading(false);
        return;
      }

      // Notify admin for agent applications (non-blocking)
      if (accountType === "agent") {
        try {
          await fetch("/api/notify-admin-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name:   reForm.full_name,
              phone:  "+91" + reForm.phone,
              email:  reForm.email,
              rera:   reForm.rera,
              agency: reForm.agency,
              city:   reForm.city,
            }),
          });
        } catch (err) {
          console.error("Admin notification failed:", err);
        }
      }

      await refreshAuth();
      setAgentPending(accountType === "agent");
      setLoading(false);
      setReStep(3);
      setReSuccess(true);
      window.setTimeout(() => { onClose(); }, accountType === "agent" ? 2600 : 1600);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError(null);
    const phone10 = tab === "signin" ? siPhone : reForm.phone;
    setLoading(true);
    const ok = await sendOtp(phone10);
    setLoading(false);
    if (ok) startCountdown();
  }

  // ─── render helpers ───
  const phoneMasked = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;

  return (
    <>
      <style>{styles}</style>
      <div className="am-overlay" onMouseDown={onClose}>
        <div
          className="am-card"
          role="dialog"
          aria-modal="true"
          aria-label={tab === "signin" ? "Sign in to Nilay 360" : "Create your Nilay 360 account"}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button type="button" className="am-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Brand */}
          <div className="am-brand">
            <img src="/brand/nilay360_logo_horizontal_dark-bg.png" alt="Nilay 360" style={{ height: 36, width: "auto", objectFit: "contain" }} />
          </div>

          {/* Tabs */}
          <div className="am-tabs">
            <button
              type="button"
              className={`am-tab${tab === "signin" ? " sel" : ""}`}
              onClick={() => switchTab("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`am-tab${tab === "register" ? " sel" : ""}`}
              onClick={() => switchTab("register")}
            >
              Register
            </button>
          </div>

          <div className="am-body">
            {error && <ErrorBox message={error} />}

            {/* ════════ SIGN IN ════════ */}
            {tab === "signin" && siStep === 1 && (
              <form onSubmit={handleSiSendOtp} className="am-step">
                <h2 className="am-title">Welcome back</h2>
                <p className="am-sub">Sign in with your mobile number to continue.</p>

                <label className="am-label" htmlFor="si-phone">Mobile Number</label>
                <div className="am-phone-wrap">
                  <span className="am-phone-prefix">+91</span>
                  <input
                    id="si-phone" type="tel" inputMode="numeric" autoComplete="tel"
                    className="am-input am-input-phone" placeholder="98765 43210"
                    value={siPhone} onChange={(e) => setSiPhone(cleanPhone(e.target.value))}
                  />
                </div>

                <button type="submit" className="am-btn-gold" disabled={loading}>
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>

                <Divider />

                <button type="button" className="am-btn-google" onClick={handleGoogle}>
                  <GoogleIcon /> Continue with Google
                </button>
              </form>
            )}

            {tab === "signin" && siStep === 2 && (
              <form onSubmit={handleSiVerify} className="am-step">
                <BackArrow onClick={() => { setSiStep(1); setError(null); }} />
                <h2 className="am-title">Verify your number</h2>
                <p className="am-sub">Enter the 6-digit code sent to {phoneMasked(siPhone)}.</p>

                <OtpBoxes value={siOtp} onChange={setSiOtp} disabled={loading} />

                <button type="submit" className="am-btn-gold" disabled={loading}>
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>

                <ResendRow countdown={countdown} onResend={handleResend} />
              </form>
            )}

            {tab === "signin" && siStep === 3 && (
              <SuccessState title="You're in!" message="Signing you in…" />
            )}

            {/* ════════ REGISTER ════════ */}
            {tab === "register" && reStep === 1 && (
              <div className="am-step">
                <h2 className="am-title">Create your account</h2>
                <p className="am-sub">First, tell us who you are.</p>

                <RoleCard
                  selected={accountType === "individual"}
                  onSelect={() => setAccountType("individual")}
                  title="Individual"
                  perk="3 Free Listings"
                  desc="Buy, rent or sell property"
                />
                <RoleCard
                  selected={accountType === "agent"}
                  onSelect={() => setAccountType("agent")}
                  title="Agent / Broker"
                  perk="Unlimited Listings"
                  desc="Manage listings & clients"
                  badge="Free Forever"
                />

                <button type="button" className="am-btn-gold" style={{ marginTop: 8 }} onClick={() => { setError(null); setReStep(2); }}>
                  Continue
                </button>

                <Divider />
                <button type="button" className="am-btn-google" onClick={handleGoogle}>
                  <GoogleIcon /> Continue with Google
                </button>
              </div>
            )}

            {tab === "register" && reStep === 2 && (
              <form onSubmit={handleReSendOtp} className="am-step">
                <BackArrow onClick={() => { setReStep(1); setError(null); }} />
                <h2 className="am-title">Your details</h2>
                <p className="am-sub">
                  Registering as{" "}
                  <strong style={{ color: GOLD }}>{accountType === "agent" ? "Agent / Broker" : "Individual"}</strong>.
                </p>

                <label className="am-label" htmlFor="re-name">Full Name</label>
                <input
                  id="re-name" type="text" autoComplete="name" className="am-input"
                  placeholder="Your full name"
                  value={reForm.full_name} onChange={(e) => setReForm((f) => ({ ...f, full_name: e.target.value }))}
                />

                <label className="am-label" htmlFor="re-phone">Mobile Number</label>
                <div className="am-phone-wrap">
                  <span className="am-phone-prefix">+91</span>
                  <input
                    id="re-phone" type="tel" inputMode="numeric" autoComplete="tel"
                    className="am-input am-input-phone" placeholder="98765 43210"
                    value={reForm.phone} onChange={(e) => setReForm((f) => ({ ...f, phone: cleanPhone(e.target.value) }))}
                  />
                </div>

                <label className="am-label" htmlFor="re-email">Email Address</label>
                <input
                  id="re-email" type="email" autoComplete="email" className="am-input"
                  placeholder="you@example.com"
                  value={reForm.email} onChange={(e) => setReForm((f) => ({ ...f, email: e.target.value }))}
                />

                <label className="am-label" htmlFor="re-city">City</label>
                <select
                  id="re-city" className="am-input am-select"
                  value={reForm.city} onChange={(e) => setReForm((f) => ({ ...f, city: e.target.value }))}
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                {accountType === "agent" && (
                  <>
                    <label className="am-label" htmlFor="re-rera">
                      RERA Registration No. <span style={{ color: "#E57373" }}>*</span>
                    </label>
                    <input
                      id="re-rera" type="text" className="am-input"
                      placeholder="e.g. A51800012345"
                      value={reForm.rera} onChange={(e) => setReForm((f) => ({ ...f, rera: e.target.value }))}
                    />
                    <label className="am-label" htmlFor="re-agency">
                      Agency Name <span className="am-optional">(optional)</span>
                    </label>
                    <input
                      id="re-agency" type="text" className="am-input"
                      placeholder="Your agency or firm"
                      value={reForm.agency} onChange={(e) => setReForm((f) => ({ ...f, agency: e.target.value }))}
                    />
                  </>
                )}

                <label className="am-check">
                  <input
                    type="checkbox" checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  />
                  <span>Send me property updates on WhatsApp</span>
                </label>

                <button type="submit" className="am-btn-gold" disabled={loading}>
                  {loading ? "Sending OTP…" : "Send OTP to verify mobile"}
                </button>
              </form>
            )}

            {tab === "register" && reStep === 3 && !reSuccess && (
              <form onSubmit={handleReVerify} className="am-step">
                <BackArrow onClick={() => { setReStep(2); setError(null); }} />
                <h2 className="am-title">Verify your number</h2>
                <p className="am-sub">Enter the 6-digit code sent to {phoneMasked(reForm.phone)}.</p>

                <OtpBoxes value={reOtp} onChange={setReOtp} disabled={loading} />

                <button type="submit" className="am-btn-gold" disabled={loading}>
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>

                <ResendRow countdown={countdown} onResend={handleResend} />
              </form>
            )}

            {tab === "register" && reStep === 3 && reSuccess && (
              <SuccessState
                title={agentPending ? "Application received" : "Welcome to Nilay 360!"}
                message={agentPending
                  ? "Your agent application is under review. We'll notify you once approved."
                  : "Your account is ready. Redirecting…"}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="am-or">
      <span className="am-or-line" />
      <span className="am-or-text">or</span>
      <span className="am-or-line" />
    </div>
  );
}

function ResendRow({ countdown, onResend }: { countdown: number; onResend: () => void }) {
  return (
    <p className="am-resend">
      Didn&apos;t get the code?{" "}
      {countdown > 0 ? (
        <span className="am-resend-wait">Resend in {countdown}s</span>
      ) : (
        <button type="button" className="am-resend-link" onClick={onResend}>Resend OTP</button>
      )}
    </p>
  );
}

function RoleCard({
  selected, onSelect, title, perk, desc, badge,
}: {
  selected: boolean; onSelect: () => void;
  title: string; perk: string; desc: string; badge?: string;
}) {
  return (
    <button type="button" className={`am-role${selected ? " sel" : ""}`} onClick={onSelect}>
      <span className="am-role-radio"><span className="am-role-radio-dot" /></span>
      <span className="am-role-main">
        <span className="am-role-top">
          <span className="am-role-title">{title}</span>
          {badge && <span className="am-role-badge">{badge}</span>}
        </span>
        <span className="am-role-perk">{perk}</span>
        <span className="am-role-desc">{desc}</span>
      </span>
    </button>
  );
}

function SuccessState({ title, message }: { title: string; message: string }) {
  return (
    <div className="am-success">
      <div className="am-success-check">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className="am-title" style={{ marginTop: 18 }}>{title}</h2>
      <p className="am-sub" style={{ marginBottom: 0 }}>{message}</p>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = `
  @keyframes amOverlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes amCardIn { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes amStepIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes amPop { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }

  .am-overlay {
    position: fixed; inset: 0; z-index: 5000;
    background: rgba(5,12,9,0.72);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: amOverlayIn 0.2s ease;
    font-family: 'Cal Sans', system-ui, sans-serif;
  }
  .am-card {
    position: relative;
    width: 100%; max-width: min(480px, 95vw);
    max-height: 90vh;
    overflow-y: auto;
    background: ${CARD_BG};
    border: 1px solid rgba(201,168,76,0.32);
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.05);
    padding: clamp(20px, 5vw, 40px);
    animation: amCardIn 0.26s cubic-bezier(0.16,1,0.3,1);
  }
  .am-close {
    position: absolute; top: 16px; right: 16px;
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: rgba(245,242,236,0.55); cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .am-close:hover { color: ${GOLD}; background: rgba(201,168,76,0.1); }

  .am-brand { display: flex; align-items: center; margin-bottom: 18px; }

  .am-tabs {
    display: flex; gap: 4px; padding: 4px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px; margin-bottom: 24px;
  }
  .am-tab {
    flex: 1; padding: 9px 0; border: none; cursor: pointer;
    background: transparent; border-radius: 7px;
    font-family: 'Cal Sans', sans-serif; font-size: 13px; font-weight: 600;
    letter-spacing: 0.04em; color: rgba(245,242,236,0.5);
    transition: background 0.18s, color 0.18s;
  }
  .am-tab.sel { background: ${GOLD}; color: #0a0a0a; }

  .am-body { position: relative; }
  .am-step { animation: amStepIn 0.22s ease; }

  .am-title {
    font-family: 'Cal Sans', Georgia, serif;
    font-size: 30px; font-weight: 500; line-height: 1.1;
    color: #FFFFFF; margin: 0 0 6px;
  }
  .am-sub { font-size: 13.5px; color: rgba(245,242,236,0.55); line-height: 1.55; margin: 0 0 22px; }

  .am-label {
    display: block; margin: 0 0 7px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    color: rgba(245,242,236,0.7); text-transform: uppercase;
  }
  .am-label + .am-label, .am-input + .am-label, .am-select + .am-label, .am-phone-wrap + .am-label { margin-top: 16px; }
  .am-optional { font-weight: 400; letter-spacing: 0; text-transform: none; color: rgba(245,242,236,0.35); font-size: 10.5px; }

  .am-input {
    width: 100%; padding: 12px 14px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 9px;
    font-family: 'Cal Sans', sans-serif; font-size: 14px; color: #F5F2EC;
    outline: none; transition: border-color 0.18s, box-shadow 0.18s;
    -webkit-appearance: none;
  }
  .am-input::placeholder { color: rgba(245,242,236,0.3); }
  .am-input:focus { border-color: ${GOLD}; box-shadow: 0 0 0 3px rgba(201,168,76,0.14); }
  .am-select { cursor: pointer; }
  .am-select option { background: #0a0a0a; color: #F5F2EC; }

  .am-phone-wrap { position: relative; display: flex; align-items: center; }
  .am-phone-prefix {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; font-weight: 500; color: rgba(245,242,236,0.55);
    pointer-events: none; user-select: none;
  }
  .am-input-phone { padding-left: 46px; }

  .am-otp-box {
    width: 100%; aspect-ratio: 1 / 1; min-width: 0;
    text-align: center; font-size: 22px; font-weight: 600;
    color: #F5F2EC; background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.14); border-radius: 10px;
    outline: none; font-family: 'Cal Sans', sans-serif;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .am-otp-box:focus { border-color: ${GOLD}; box-shadow: 0 0 0 3px rgba(201,168,76,0.16); }

  .am-btn-gold {
    width: 100%; padding: 13px 24px; margin-top: 4px;
    background: ${GOLD}; border: none; border-radius: 9px;
    font-family: 'Cal Sans', sans-serif; font-size: 14px; font-weight: 700;
    letter-spacing: 0.04em; color: #0a0a0a; cursor: pointer;
    transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
  }
  .am-btn-gold:hover:not(:disabled) { background: #3DDAD9; box-shadow: 0 6px 22px rgba(201,168,76,0.32); transform: translateY(-1px); }
  .am-btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }

  .am-or { display: flex; align-items: center; gap: 12px; margin: 18px 0; }
  .am-or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
  .am-or-text { font-size: 11px; color: rgba(245,242,236,0.4); text-transform: uppercase; letter-spacing: 0.08em; }

  .am-btn-google {
    width: 100%; padding: 12px 24px;
    background: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 9px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-family: 'Cal Sans', sans-serif; font-size: 14px; font-weight: 500;
    color: #1a1a1a; cursor: pointer; transition: box-shadow 0.18s, transform 0.12s;
  }
  .am-btn-google:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.3); transform: translateY(-1px); }

  .am-back {
    background: none; border: none; cursor: pointer; padding: 0;
    color: rgba(245,242,236,0.55); margin-bottom: 14px;
    display: inline-flex; transition: color 0.15s;
  }
  .am-back:hover { color: ${GOLD}; }

  .am-resend { text-align: center; font-size: 13px; color: rgba(245,242,236,0.5); margin: 16px 0 0; }
  .am-resend-wait { color: rgba(245,242,236,0.35); }
  .am-resend-link { background: none; border: none; cursor: pointer; color: ${GOLD}; font-weight: 600; font-size: 13px; font-family: 'Cal Sans', sans-serif; }
  .am-resend-link:hover { text-decoration: underline; }

  .am-role {
    width: 100%; display: flex; align-items: flex-start; gap: 13px;
    padding: 16px; margin-bottom: 12px; text-align: left; cursor: pointer;
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.1); border-radius: 12px;
    transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  }
  .am-role:hover { border-color: rgba(201,168,76,0.45); }
  .am-role.sel { border-color: ${GOLD}; background: rgba(201,168,76,0.08); box-shadow: 0 0 0 3px rgba(201,168,76,0.12); }
  .am-role-radio {
    width: 19px; height: 19px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
    border: 2px solid rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.18s;
  }
  .am-role.sel .am-role-radio { border-color: ${GOLD}; }
  .am-role-radio-dot { width: 9px; height: 9px; border-radius: 50%; background: ${GOLD}; opacity: 0; transform: scale(0.4); transition: opacity 0.15s, transform 0.15s; }
  .am-role.sel .am-role-radio-dot { opacity: 1; transform: scale(1); }
  .am-role-main { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
  .am-role-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .am-role-title { font-size: 15px; font-weight: 600; color: #FFFFFF; }
  .am-role-perk { font-size: 12.5px; font-weight: 600; color: ${GOLD}; }
  .am-role-desc { font-size: 12px; color: rgba(245,242,236,0.45); }
  .am-role-badge {
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: ${GREEN}; background: ${GOLD}; padding: 2px 7px; border-radius: 4px;
  }

  .am-check {
    display: flex; align-items: flex-start; gap: 9px; cursor: pointer;
    margin: 18px 0 4px; font-size: 13px; color: rgba(245,242,236,0.6); line-height: 1.5;
  }
  .am-check input[type="checkbox"] { width: 16px; height: 16px; margin-top: 1px; accent-color: ${GOLD}; cursor: pointer; flex-shrink: 0; }

  .am-success { text-align: center; padding: 24px 0 12px; animation: amStepIn 0.24s ease; }
  .am-success-check {
    width: 64px; height: 64px; margin: 0 auto; border-radius: 50%;
    background: ${GOLD}; display: flex; align-items: center; justify-content: center;
    animation: amPop 0.4s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 8px 30px rgba(201,168,76,0.35);
  }

  @media (max-width: 520px) {
    .am-overlay { padding: 0; }
    .am-card {
      max-width: 100%; width: 100%; height: 100vh; max-height: 100vh;
      border-radius: 0; border-left: none; border-right: none;
      padding: 24px 20px 28px;
    }
  }
`;
