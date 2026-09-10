"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

type AccountType = "individual" | "agent" | "builder";

export default function RegisterPage() {
  const router = useRouter();
  const { openAuthModal } = useAuth();

  // The auth UI now lives in a global overlay modal. Visiting /register directly
  // redirects home and opens the modal in register mode; the full page below
  // remains as a no-JS fallback.
  useEffect(() => {
    openAuthModal("register");
    router.replace("/");
  }, [openAuthModal, router]);
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // field refs via state
  const [fields, setFields] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
    rera: "", agency: "", cities: "",
  });
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fields.password !== fields.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: fields.email,
        password: fields.password,
        options: {
          data: {
            full_name: fields.name,
            phone: fields.phone,
            account_type: accountType,
            ...((accountType === "agent" || accountType === "builder") && {
              rera_number: fields.rera,
              agency_name: fields.agency,
              cities: fields.cities,
            }),
          },
        },
      });
      console.log("Signup result:", data);
      console.log("Signup error:", authError);
      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("email address is already")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (msg.includes("password") && (msg.includes("weak") || msg.includes("short") || msg.includes("characters"))) {
          setError("Password is too weak. Please use at least 8 characters.");
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.log(error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.");
      }
      setLoading(false);
    }
  }

  const inp = (id: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    background: "#fff",
    border: `1.5px solid ${focused === id ? "#0A1526" : "rgba(13,43,31,0.18)"}`,
    borderRadius: "8px",
    fontFamily: "var(--font-body-new)",
    fontSize: "14px",
    fontWeight: 400,
    color: "#020C1C",
    outline: "none",
    boxShadow: focused === id ? "0 0 0 3px rgba(27,67,50,0.10)" : "none",
    transition: "border-color 0.18s, box-shadow 0.18s",
    WebkitAppearance: "none" as const,
    ...extra,
  });

  const f = (id: string) => ({ onFocus: () => setFocused(id), onBlur: () => setFocused(null) });

  return (
    <>
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }

        .rp-root {
          display: flex;
          min-height: 100vh;
        }

        /* ─── LEFT PANEL ─── */
        .rp-left {
          flex: 0 0 420px;
          min-height: 100vh;
          background: #020C1C;
          display: flex;
          flex-direction: column;
          padding: 48px 52px;
          position: relative;
          overflow: hidden;
        }
        .rp-left-noise {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(ellipse 90% 55% at 15% 110%, rgba(201,168,76,0.14) 0%, transparent 58%),
            radial-gradient(ellipse 60% 70% at 90% -5%, rgba(45,106,79,0.32) 0%, transparent 52%);
        }
        .rp-left-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(201,168,76,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.045) 1px, transparent 1px);
          background-size: 52px 52px;
        }
        .rp-left-inner {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          height: 100%; flex: 1;
        }

        /* logo */
        .rp-logo {
          display: flex; align-items: center; gap: 7px;
          text-decoration: none; margin-bottom: 64px;
        }
        .rp-logo-text {
          font-family: var(--font-support-new);
          font-size: 17px; font-weight: 600;
          color: #fff; letter-spacing: 0.22em;
        }
        .rp-logo-dot { color: #10C4C3; font-size: 22px; line-height: 1; }

        /* headline */
        .rp-eyebrow {
          display: flex; align-items: center; gap: 10px; margin-bottom: 18px;
        }
        .rp-eyebrow-line { width: 26px; height: 1px; background: #10C4C3; flex-shrink: 0; }
        .rp-eyebrow-text {
          font-size: 10px; font-weight: 600; letter-spacing: 0.22em;
          color: #10C4C3; text-transform: uppercase;
        }
        .rp-heading {
          font-family: var(--font-heading-new);
          font-size: 42px; font-weight: 300; line-height: 1.13;
          color: #020C1C; margin-bottom: 14px;
        }
        .rp-heading em { font-style: italic; color: #10C4C3; font-weight: 300; }
        .rp-tagline {
          font-size: 13px; font-weight: 500; letter-spacing: 0.1em;
          color: rgba(201,168,76,0.65); text-transform: uppercase;
          margin-bottom: 44px;
        }

        /* benefits */
        .rp-benefits { display: flex; flex-direction: column; gap: 18px; margin-bottom: 52px; }
        .rp-benefit { display: flex; align-items: flex-start; gap: 13px; }
        .rp-benefit-dot {
          width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.28);
          display: flex; align-items: center; justify-content: center;
          margin-top: 1px;
        }
        .rp-benefit-dot svg { display: block; }
        .rp-benefit-body {}
        .rp-benefit-title {
          font-size: 13px; font-weight: 600; color: rgba(245,242,236,0.88);
          margin-bottom: 2px;
        }
        .rp-benefit-desc { font-size: 12px; color: rgba(245,242,236,0.38); line-height: 1.55; }

        /* footer note */
        .rp-left-foot {
          margin-top: auto;
          font-size: 11px; color: rgba(245,242,236,0.22); line-height: 1.65;
        }
        .rp-left-foot a { color: rgba(201,168,76,0.55); text-decoration: none; }
        .rp-left-foot a:hover { color: #10C4C3; }

        /* ─── RIGHT PANEL ─── */
        .rp-right {
          flex: 1;
          background: #020C1C;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 52px 40px;
          overflow-y: auto;
          position: relative;
        }
        .rp-right::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 65% 45% at 85% 10%, rgba(201,168,76,0.07) 0%, transparent 55%);
        }
        .rp-form-wrap {
          width: 100%; max-width: 500px;
          position: relative; z-index: 2;
        }

        /* form header */
        .rp-form-title {
          font-family: var(--font-heading-new);
          font-size: 32px; font-weight: 500; line-height: 1.1;
          color: #020C1C; margin-bottom: 6px;
        }
        .rp-form-sub {
          font-size: 13.5px; color: #6B7C72; margin-bottom: 28px;
        }
        .rp-form-sub a { color: #10C4C3; text-decoration: none; font-weight: 500; }
        .rp-form-sub a:hover { text-decoration: underline; }

        /* google btn */
        .rp-google-btn {
          width: 100%; padding: 11px 20px;
          background: #fff;
          border: 1.5px solid rgba(13,43,31,0.16);
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-family: var(--font-body-new);
          font-size: 13.5px; font-weight: 500; color: #020C1C;
          transition: border-color 0.18s, box-shadow 0.18s;
          margin-bottom: 22px;
        }
        .rp-google-btn:hover {
          border-color: rgba(13,43,31,0.3);
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }

        /* divider */
        .rp-or {
          display: flex; align-items: center; gap: 12px; margin-bottom: 22px;
        }
        .rp-or-line { flex: 1; height: 1px; background: rgba(13,43,31,0.12); }
        .rp-or-text {
          font-size: 11px; color: #aab5ae; font-weight: 500;
          letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
        }

        /* account type cards */
        .rp-type-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          color: #020C1C; text-transform: uppercase; margin-bottom: 10px;
          display: block;
        }
        .rp-type-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 12px; margin-bottom: 26px;
        }
        .rp-type-card {
          padding: 18px 16px;
          border-radius: 10px;
          border: 2px solid rgba(13,43,31,0.14);
          background: #fff;
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          text-align: left;
          display: flex; flex-direction: column; gap: 8px;
        }
        .rp-type-card:hover {
          border-color: rgba(201,168,76,0.45);
        }
        .rp-type-card.sel {
          border-color: #10C4C3;
          background: rgba(201,168,76,0.07);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.13);
        }
        .rp-type-card-top {
          display: flex; align-items: center; justify-content: space-between;
        }
        .rp-type-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(13,43,31,0.07);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s;
        }
        .rp-type-card.sel .rp-type-icon {
          background: rgba(201,168,76,0.15);
        }
        .rp-type-radio {
          width: 17px; height: 17px; border-radius: 50%;
          border: 2px solid rgba(13,43,31,0.2);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: border-color 0.18s;
        }
        .rp-type-card.sel .rp-type-radio {
          border-color: #10C4C3;
        }
        .rp-type-radio-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10C4C3;
          opacity: 0; transform: scale(0.4);
          transition: opacity 0.15s, transform 0.15s;
        }
        .rp-type-card.sel .rp-type-radio-dot {
          opacity: 1; transform: scale(1);
        }
        .rp-type-name {
          font-size: 14px; font-weight: 600; color: #020C1C; line-height: 1.2;
        }
        .rp-type-subtitle {
          font-size: 11.5px; font-weight: 500; color: #6B7C72; line-height: 1.3;
        }
        .rp-type-desc {
          font-size: 11px; color: #aab5ae; line-height: 1.5;
        }
        .rp-type-badge {
          display: inline-block;
          padding: 2px 7px; border-radius: 4px;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.3);
          font-size: 9.5px; font-weight: 700;
          color: #0B9C9B; letter-spacing: 0.08em;
          text-transform: uppercase;
          align-self: flex-start;
        }

        /* form fields */
        .rp-field { margin-bottom: 14px; }
        .rp-field-label {
          display: block; margin-bottom: 6px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.09em;
          color: #020C1C; text-transform: uppercase;
        }
        .rp-field-row { display: flex; gap: 12px; }
        .rp-field-row .rp-field { flex: 1; margin-bottom: 0; }
        .rp-input-wrap { position: relative; }
        .rp-input-prefix {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          font-size: 13px; font-weight: 500; color: #6B7C72;
          pointer-events: none; user-select: none;
        }
        .rp-input-suffix-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; padding: 2px; cursor: pointer;
          color: #aab5ae; display: flex; align-items: center;
          transition: color 0.15s;
        }
        .rp-input-suffix-btn:hover { color: #0A1526; }
        input::placeholder { color: #bbc5be; }

        /* section divider */
        .rp-section-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 20px 0 18px;
        }
        .rp-section-divider-line { flex: 1; height: 1px; background: rgba(13,43,31,0.1); }
        .rp-section-divider-text {
          font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
          color: #6B7C72; text-transform: uppercase; white-space: nowrap;
        }

        /* checkbox */
        .rp-checkbox-label {
          display: flex; align-items: flex-start; gap: 10px;
          cursor: pointer; margin-bottom: 22px;
        }
        .rp-checkbox-label input[type="checkbox"] {
          width: 16px; height: 16px; margin-top: 1px; flex-shrink: 0;
          accent-color: #0A1526; cursor: pointer;
        }
        .rp-checkbox-text {
          font-size: 12.5px; color: #6B7C72; line-height: 1.55;
        }
        .rp-checkbox-text a { color: #10C4C3; text-decoration: none; font-weight: 500; }
        .rp-checkbox-text a:hover { text-decoration: underline; }

        /* submit */
        .rp-submit {
          width: 100%; padding: 13px 24px;
          background: #10C4C3; border: none; border-radius: 8px;
          font-family: var(--font-body-new);
          font-size: 13.5px; font-weight: 700; letter-spacing: 0.1em;
          color: #020C1C; cursor: pointer; text-transform: uppercase;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
          margin-bottom: 16px;
        }
        .rp-submit:hover {
          background: #3DDAD9;
          box-shadow: 0 4px 20px rgba(201,168,76,0.38);
          transform: translateY(-1px);
        }
        .rp-submit:active { transform: translateY(0); }

        /* sign in link */
        .rp-signin-link {
          text-align: center;
          font-size: 13px; color: #6B7C72;
        }
        .rp-signin-link a { color: #10C4C3; text-decoration: none; font-weight: 500; }
        .rp-signin-link a:hover { text-decoration: underline; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 900px) {
          .rp-root { flex-direction: column; }
          .rp-left { flex: 0 0 auto; min-height: auto; padding: 36px 32px 40px; }
          .rp-logo { margin-bottom: 32px; }
          .rp-benefits { display: none; }
          .rp-right { padding: 36px 24px; }
          .rp-heading { font-size: 34px; }
        }
        @media (max-width: 520px) {
          .rp-left { padding: 28px 20px 32px; }
          .rp-right { padding: 28px 16px; }
          .rp-type-grid { grid-template-columns: 1fr 1fr; }
          .rp-field-row { flex-direction: column; gap: 14px; }
          .rp-field-row .rp-field { margin-bottom: 0; }
          .rp-heading { font-size: 30px; }
          .rp-eyebrow { display: none; }
          .rp-tagline { display: none; }
          .rp-left-foot { display: none; }
        }
      `}</style>

      <div className="rp-root">

        {/* ─── LEFT PANEL ─── */}
        <div className="rp-left">
          <div className="rp-left-noise" />
          <div className="rp-left-grid" />

          <div className="rp-left-inner">
            <a href="/" className="rp-logo">
              <span className="rp-logo-text">Nilay 360</span>
              <span className="rp-logo-dot">·</span>
            </a>

            <div>
              <div className="rp-eyebrow">
                <div className="rp-eyebrow-line" />
                <span className="rp-eyebrow-text">Premium Real Estate</span>
              </div>
              <h1 className="rp-heading">
                Your Property<br /><em>Journey Starts</em><br />Here
              </h1>
              <p className="rp-tagline">Your Trust. Our Promise.</p>

              <div className="rp-benefits">
                {[
                  {
                    title: "List in Minutes",
                    desc: "Add your property details, photos, and pricing — go live right away.",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ),
                  },
                  {
                    title: "Real Estate Experts",
                    desc: "Connect with agents who know the local market inside out.",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Concierge Support",
                    desc: "Dedicated relationship managers for high-value property transactions.",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    ),
                  },
                  {
                    title: "Smart Property Matching",
                    desc: "AI-powered recommendations based on your preferences and budget.",
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    ),
                  },
                ].map((b) => (
                  <div key={b.title} className="rp-benefit">
                    <div className="rp-benefit-dot">{b.icon}</div>
                    <div className="rp-benefit-body">
                      <div className="rp-benefit-title">{b.title}</div>
                      <div className="rp-benefit-desc">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="rp-left-foot">
              By registering you agree to our{" "}
              <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
              Your data is protected under our strict privacy standards.
            </p>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="rp-right">
          <div className="rp-form-wrap">

            <h2 className="rp-form-title">Create your account</h2>
            <p className="rp-form-sub">
              Already have an account?{" "}
              <a href="/login">Sign In</a>
            </p>

            {/* Google */}
            <button type="button" className="rp-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            <div className="rp-or">
              <div className="rp-or-line" />
              <span className="rp-or-text">or register with email</span>
              <div className="rp-or-line" />
            </div>

            {/* Account Type */}
            <span className="rp-type-label">I am a</span>
            <div className="rp-type-grid">

              {/* Individual */}
              <button
                type="button"
                className={`rp-type-card${accountType === "individual" ? " sel" : ""}`}
                onClick={() => setAccountType("individual")}
              >
                <div className="rp-type-card-top">
                  <div className="rp-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={accountType === "individual" ? "#10C4C3" : "#020C1C"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="rp-type-radio">
                    <div className="rp-type-radio-dot" />
                  </div>
                </div>
                <div>
                  <div className="rp-type-name">Individual</div>
                  <div className="rp-type-subtitle">Buy, Rent or Sell Property</div>
                </div>
                <div className="rp-type-desc">Perfect for buyers, homeowners, and landlords</div>
              </button>

              {/* Agent */}
              <button
                type="button"
                className={`rp-type-card${accountType === "agent" ? " sel" : ""}`}
                onClick={() => setAccountType("agent")}
              >
                <div className="rp-type-card-top">
                  <div className="rp-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={accountType === "agent" ? "#10C4C3" : "#020C1C"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      <line x1="12" y1="12" x2="12" y2="16" />
                      <line x1="10" y1="14" x2="14" y2="14" />
                    </svg>
                  </div>
                  <div className="rp-type-radio">
                    <div className="rp-type-radio-dot" />
                  </div>
                </div>
                <div>
                  <div className="rp-type-name">Agent</div>
                  <div className="rp-type-subtitle">Manage Listings &amp; Clients</div>
                </div>
                <div className="rp-type-desc">For licensed real estate agents and brokers</div>
                <span className="rp-type-badge">RERA Required</span>
              </button>

              {/* Builder */}
              <button
                type="button"
                className={`rp-type-card${accountType === "builder" ? " sel" : ""}`}
                onClick={() => setAccountType("builder")}
              >
                <div className="rp-type-card-top">
                  <div className="rp-type-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={accountType === "builder" ? "#10C4C3" : "#020C1C"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 22V4a1 1 0 0 1 1-1h5v19" />
                      <path d="M12 22V11l5-2v13" />
                      <path d="M2 22h20" />
                    </svg>
                  </div>
                  <div className="rp-type-radio">
                    <div className="rp-type-radio-dot" />
                  </div>
                </div>
                <div>
                  <div className="rp-type-name">Builder</div>
                  <div className="rp-type-subtitle">Manage Development Projects</div>
                </div>
                <div className="rp-type-desc">For developers listing new projects</div>
                <span className="rp-type-badge">RERA Required</span>
              </button>

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

            <form onSubmit={handleSubmit}>

              {/* Full Name */}
              <div className="rp-field">
                <label className="rp-field-label" htmlFor="rp-name">Full Name</label>
                <input
                  id="rp-name" type="text" placeholder="Your full name"
                  autoComplete="name" required
                  value={fields.name} onChange={set("name")}
                  style={inp("name")} {...f("name")}
                />
              </div>

              {/* Email */}
              <div className="rp-field">
                <label className="rp-field-label" htmlFor="rp-email">Email Address</label>
                <input
                  id="rp-email" type="email" placeholder="you@example.com"
                  autoComplete="email" required
                  value={fields.email} onChange={set("email")}
                  style={inp("email")} {...f("email")}
                />
              </div>

              {/* Mobile */}
              <div className="rp-field">
                <label className="rp-field-label" htmlFor="rp-phone">Mobile Number</label>
                <div className="rp-input-wrap">
                  <span className="rp-input-prefix">+91</span>
                  <input
                    id="rp-phone" type="tel" placeholder="98765 43210"
                    autoComplete="tel"
                    value={fields.phone} onChange={set("phone")}
                    style={inp("phone", { paddingLeft: "46px" })} {...f("phone")}
                  />
                </div>
              </div>

              {/* Password row */}
              <div className="rp-field-row" style={{ marginBottom: "14px" }}>
                <div className="rp-field">
                  <label className="rp-field-label" htmlFor="rp-pw">Password</label>
                  <div className="rp-input-wrap">
                    <input
                      id="rp-pw" type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters" autoComplete="new-password" required
                      value={fields.password} onChange={set("password")}
                      style={inp("pw", { paddingRight: "40px" })} {...f("pw")}
                    />
                    <button type="button" className="rp-input-suffix-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="rp-field">
                  <label className="rp-field-label" htmlFor="rp-cpw">Confirm Password</label>
                  <div className="rp-input-wrap">
                    <input
                      id="rp-cpw" type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password" autoComplete="new-password" required
                      value={fields.confirm} onChange={set("confirm")}
                      style={inp("cpw", { paddingRight: "40px" })} {...f("cpw")}
                    />
                    <button type="button" className="rp-input-suffix-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Agent/Builder-only fields */}
              {(accountType === "agent" || accountType === "builder") && (
                <>
                  <div className="rp-section-divider">
                    <div className="rp-section-divider-line" />
                    <span className="rp-section-divider-text">Agent Details</span>
                    <div className="rp-section-divider-line" />
                  </div>

                  <div className="rp-field-row" style={{ marginBottom: "14px" }}>
                    <div className="rp-field">
                      <label className="rp-field-label" htmlFor="rp-rera">
                        RERA Registration No.{" "}
                        <span style={{ color: "#E53E3E", marginLeft: 1 }}>*</span>
                      </label>
                      <input
                        id="rp-rera" type="text" placeholder="e.g. A51800012345" required
                        value={fields.rera} onChange={set("rera")}
                        style={inp("rera")} {...f("rera")}
                      />
                    </div>
                    <div className="rp-field">
                      <label className="rp-field-label" htmlFor="rp-agency">
                        Agency Name{" "}
                        <span style={{ fontSize: "10px", color: "#aab5ae", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        id="rp-agency" type="text" placeholder="Your agency or firm"
                        value={fields.agency} onChange={set("agency")}
                        style={inp("agency")} {...f("agency")}
                      />
                    </div>
                  </div>

                  <div className="rp-field">
                    <label className="rp-field-label" htmlFor="rp-cities">Cities You Operate In</label>
                    <input
                      id="rp-cities" type="text"
                      placeholder="e.g. Hyderabad, Bengaluru, Mumbai"
                      value={fields.cities} onChange={set("cities")}
                      style={inp("cities")} {...f("cities")}
                    />
                    <p style={{ marginTop: "5px", fontSize: "11px", color: "#aab5ae" }}>
                      Separate multiple cities with a comma
                    </p>
                  </div>
                </>
              )}

              {/* Terms */}
              <label className="rp-checkbox-label" style={{ marginTop: (accountType === "agent" || accountType === "builder") ? "18px" : "6px" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="rp-checkbox-text">
                  I agree to Nilay 360&apos;s{" "}
                  <a href="/terms">Terms of Service</a> and{" "}
                  <a href="/privacy">Privacy Policy</a>
                </span>
              </label>

              {/* Submit */}
              <button type="submit" className="rp-submit" disabled={loading}
                style={loading ? { opacity: 0.7, cursor: "not-allowed" } : undefined}>
                {loading ? "Creating Account…" : accountType === "agent" ? "Create Agent Account" : accountType === "builder" ? "Create Builder Account" : "Create Account"}
              </button>

              <p className="rp-signin-link">
                Already have an account?{" "}
                <a href="/login">Sign In</a>
              </p>

            </form>
          </div>
        </div>

      </div>
    </>
  );
}
