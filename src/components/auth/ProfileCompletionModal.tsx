"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth, type AuthProfile } from "@/context/AuthContext";

/*
 * Post-signup profile completion — mandatory, non-dismissible.
 *
 * Two flows, driven entirely by which required field is missing on the
 * profile row (not by tracking which provider the user signed in with):
 *   - profile.phone missing  → Google/OAuth users never supply a phone.
 *   - full_name/city missing → OTP users always have a phone already, but
 *     the phone-only "Sign In" path can create a profile with no name/city.
 * This also means an existing user with an old blank profile sees this
 * again on their next login until it's filled in — intentional, it's how
 * the backlog of incomplete profiles visible in /admin gets cleaned up.
 */

const NAVY = "#0A1526";
const TEAL = "#10C4C3";
const CITIES = ["Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Pune", "Chennai", "Others"];

type CompletionKind = "phone" | "details";

function getCompletionKind(profile: AuthProfile | null): CompletionKind | null {
  if (!profile) return null;
  if (!profile.phone) return "phone";
  if (!profile.full_name?.trim() || !profile.city) return "details";
  return null;
}

export default function ProfileCompletionModal() {
  const { user, profile, loading, refreshAuth } = useAuth();

  if (loading || !user) return null;
  const kind = getCompletionKind(profile);
  if (!kind) return null;

  return <CompletionForm key={kind} kind={kind} userId={user.id} onDone={refreshAuth} />;
}

function CompletionForm({
  kind, userId, onDone,
}: { kind: CompletionKind; userId: string; onDone: () => Promise<void> }) {
  const [phone, setPhone]       = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity]         = useState(CITIES[0]);
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Lock body scroll while this modal is mounted — independent of AuthModal's own lock.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const cleanPhone = (raw: string) => raw.replace(/\D/g, "").slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (kind === "phone") {
      if (phone.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    } else {
      if (!fullName.trim()) { setError("Please enter your full name."); return; }
      if (!city) { setError("Please select your city."); return; }
      if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = kind === "phone"
        ? { phone: `+91${phone}` }
        : { full_name: fullName.trim(), city, ...(email.trim() ? { email: email.trim() } : {}) };

      const { error: updateErr } = await supabase.from("profiles").update(payload).eq("id", userId);

      if (updateErr) {
        console.error("Profile completion update failed:", updateErr);
        setError(
          updateErr.code === "23505"
            ? "That mobile number is already registered to another account."
            : "Couldn't save your details. Please check your connection and try again."
        );
        setSaving(false);
        return;
      }

      await onDone();
      setSaving(false);
    } catch (err) {
      console.error("Profile completion unexpected error:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="pcm-overlay">
        <div className="pcm-card" role="dialog" aria-modal="true" aria-label="Complete your profile">
          <div className="pcm-brand">
            <img
              src="/brand/Nilay360-09-Photoroom%20(1).png"
              alt="Nilay 360"
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </div>

          <h2 className="pcm-title">{kind === "phone" ? "One more thing" : "Complete your profile"}</h2>
          <p className="pcm-sub">
            {kind === "phone"
              ? "Add your mobile number so agents and support can reach you."
              : "Tell us your name and city so we can personalize listings and enquiries."}
          </p>

          {error && <div className="pcm-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {kind === "phone" && (
              <>
                <label className="pcm-label" htmlFor="pcm-phone">Mobile Number</label>
                <div className="pcm-phone-wrap">
                  <span className="pcm-phone-prefix">+91</span>
                  <input
                    id="pcm-phone" type="tel" inputMode="numeric" autoComplete="tel"
                    className="pcm-input pcm-input-phone" placeholder="98765 43210"
                    value={phone} onChange={(e) => setPhone(cleanPhone(e.target.value))}
                    autoFocus disabled={saving}
                  />
                </div>
              </>
            )}

            {kind === "details" && (
              <>
                <label className="pcm-label" htmlFor="pcm-name">Full Name</label>
                <input
                  id="pcm-name" type="text" autoComplete="name" className="pcm-input"
                  placeholder="Your full name" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus disabled={saving}
                />

                <label className="pcm-label" htmlFor="pcm-city">City</label>
                <select
                  id="pcm-city" className="pcm-input pcm-select"
                  value={city} onChange={(e) => setCity(e.target.value)}
                  disabled={saving}
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <label className="pcm-label" htmlFor="pcm-email">
                  Email Address <span className="pcm-optional">(optional)</span>
                </label>
                <input
                  id="pcm-email" type="email" autoComplete="email" className="pcm-input"
                  placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} disabled={saving}
                />
              </>
            )}

            <button type="submit" className="pcm-btn" disabled={saving}>
              {saving ? "Saving…" : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = `
  @keyframes pcmOverlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pcmCardIn { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .pcm-overlay {
    position: fixed; inset: 0; z-index: 6000;
    background: rgba(5,12,9,0.78);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: pcmOverlayIn 0.2s ease;
    font-family: var(--font-body-new);
  }
  .pcm-card {
    position: relative;
    width: 100%; max-width: min(440px, 95vw);
    max-height: 90vh; overflow-y: auto;
    background: ${NAVY};
    border: 1px solid rgba(16,196,195,0.32);
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,196,195,0.05);
    padding: clamp(20px, 5vw, 36px);
    animation: pcmCardIn 0.26s cubic-bezier(0.16,1,0.3,1);
  }
  .pcm-brand { display: flex; align-items: center; margin-bottom: 16px; }
  .pcm-title {
    font-family: var(--font-heading-new);
    font-size: 26px; font-weight: 500; line-height: 1.15;
    color: #FFFFFF; margin: 0 0 6px;
  }
  .pcm-sub { font-size: 13.5px; color: rgba(245,242,236,0.55); line-height: 1.55; margin: 0 0 22px; }
  .pcm-error {
    margin: 0 0 16px; padding: 11px 14px;
    background: rgba(229,62,62,0.10); border: 1px solid rgba(229,62,62,0.3);
    border-radius: 8px; font-size: 13px; color: #FF8A8A; line-height: 1.5;
  }
  .pcm-label {
    display: block; margin: 0 0 7px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    color: rgba(245,242,236,0.7); text-transform: uppercase;
  }
  .pcm-input + .pcm-label, .pcm-select + .pcm-label, .pcm-phone-wrap + .pcm-label { margin-top: 16px; }
  .pcm-optional { font-weight: 400; letter-spacing: 0; text-transform: none; color: rgba(245,242,236,0.35); font-size: 10.5px; }
  .pcm-input {
    width: 100%; padding: 12px 14px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 9px;
    font-family: var(--font-body-new); font-size: 14px; color: #F5F2EC;
    outline: none; transition: border-color 0.18s, box-shadow 0.18s;
    -webkit-appearance: none;
  }
  .pcm-input::placeholder { color: rgba(245,242,236,0.3); }
  .pcm-input:focus { border-color: ${TEAL}; box-shadow: 0 0 0 3px rgba(16,196,195,0.14); }
  .pcm-input:disabled { opacity: 0.6; }
  .pcm-select { cursor: pointer; }
  .pcm-select option { background: ${NAVY}; color: #F5F2EC; }
  .pcm-phone-wrap { position: relative; display: flex; align-items: center; }
  .pcm-phone-prefix {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; font-weight: 500; color: rgba(245,242,236,0.55);
    pointer-events: none; user-select: none;
  }
  .pcm-input-phone { padding-left: 46px; }
  .pcm-btn {
    width: 100%; padding: 13px 24px; margin-top: 22px;
    background: ${TEAL}; border: none; border-radius: 9px;
    font-family: var(--font-body-new); font-size: 14px; font-weight: 700;
    letter-spacing: 0.04em; color: ${NAVY}; cursor: pointer;
    transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
  }
  .pcm-btn:hover:not(:disabled) { background: #3DDAD9; box-shadow: 0 6px 22px rgba(16,196,195,0.32); transform: translateY(-1px); }
  .pcm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  @media (max-width: 520px) {
    .pcm-overlay { padding: 0; }
    .pcm-card {
      max-width: 100%; width: 100%; height: 100vh; max-height: 100vh;
      border-radius: 0; border-left: none; border-right: none;
      padding: 24px 20px 28px;
    }
  }
`;
