"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface ProfileForm {
  full_name: string;
  phone:     string;
  city:      string;
  bio:       string;
}

const EMPTY: ProfileForm = { full_name: "", phone: "", city: "", bio: "" };

const G = { dark: "#000000", gold: "#2BA8E0", ivory: "#000000", mid: "#0B0D10" };

export default function ProfileEditPage() {
  const router = useRouter();
  const [userId,  setUserId]  = useState<string | null>(null);
  const [email,   setEmail]   = useState<string | null>(null);
  const [form,    setForm]    = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);
        setEmail(session.user.email ?? null);

        const { data, error: profErr } = await supabase
          .from("profiles")
          .select("full_name, city, phone, bio, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profErr) {
          console.error("Profile edit — load error:", profErr);
        }

        if (!cancelled && data) {
          setForm({
            full_name: data.full_name ?? "",
            phone:     data.phone     ?? "",
            city:      data.city      ?? "",
            bio:       data.bio       ?? "",
          });
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        console.error("Profile edit — fatal load error:", e);
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) => {
      if (!session?.user) {
        setUserId(null);
        setEmail(null);
        setForm(EMPTY);
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const handleChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({
        id:         userId,
        full_name:  form.full_name.trim() || null,
        phone:      form.phone.trim()     || null,
        city:       form.city.trim()      || null,
        bio:        form.bio.trim()       || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    setSaving(false);

    if (upErr) {
      console.error("Profile edit — save error:", upErr);
      setError("Could not save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: G.dark, fontFamily: "'DM Sans', sans-serif", fontSize: 14, opacity: 0.5 }}>Loading profile…</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: G.dark, fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>Please sign in to edit your profile.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Sign In →</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <style>{`
@media (max-width: 768px) {
  .pe-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 16px !important; }
  .pe-card { padding: 20px 16px !important; margin: 0 16px !important; }
}
`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 40px" }}>

        <div className="pe-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 600, color: G.dark, margin: 0, lineHeight: 1.15 }}>
              Edit Profile
            </h1>
            <p style={{ color: "rgba(13,43,31,0.5)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              {email}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              color: G.dark, background: "transparent",
              border: "1px solid rgba(13,43,31,0.2)", borderRadius: 8,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Dashboard
          </button>
        </div>

        <form
          className="pe-card"
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff", borderRadius: 14,
            border: "1px solid rgba(13,43,31,0.07)",
            boxShadow: "0 2px 12px rgba(13,43,31,0.04)",
            padding: 32,
          }}
        >
          <Field label="Full Name" htmlFor="full_name">
            <input
              id="full_name" type="text"
              value={form.full_name} onChange={handleChange("full_name")}
              placeholder="Your full name"
              style={inputStyle}
            />
          </Field>

          <Field label="Phone Number" htmlFor="phone">
            <input
              id="phone" type="tel"
              value={form.phone} onChange={handleChange("phone")}
              placeholder="+91 98765 43210"
              style={inputStyle}
            />
          </Field>

          <Field label="City" htmlFor="city">
            <input
              id="city" type="text"
              value={form.city} onChange={handleChange("city")}
              placeholder="e.g. Hyderabad"
              style={inputStyle}
            />
          </Field>

          <Field label="Bio" htmlFor="bio">
            <textarea
              id="bio" rows={4}
              value={form.bio} onChange={handleChange("bio")}
              placeholder="A short bio about yourself"
              style={{ ...inputStyle, resize: "vertical", minHeight: 100, fontFamily: "'DM Sans', sans-serif" }}
            />
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "11px 28px", borderRadius: 8,
                fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
                color: "#0a0a0a", background: G.gold,
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && <span style={{ fontSize: 13, color: "#121519", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>✓ Profile saved</span>}
            {error && <span style={{ fontSize: 13, color: "#B91C1C", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "#ffffff",
  border: "1.5px solid rgba(13,43,31,0.12)",
  borderRadius: 8, fontSize: 14, color: "#000000",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: "block", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#6B7C72", marginBottom: 7,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
