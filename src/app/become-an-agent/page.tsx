"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { CITIES } from "@/constants";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: "9px", fontSize: "14px",
  color: "#FFFFFF", fontFamily: "var(--font-body-new)", outlineColor: "#10C4C3",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase" as const, color: "#A9B4C2", marginBottom: "8px",
};

function CityMultiSelect({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const toggle = (city: string) => {
    onChange(selected.includes(city) ? selected.filter(c => c !== city) : [...selected, city]);
  };
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {CITIES.map(city => {
        const on = selected.includes(city);
        return (
          <button
            type="button"
            key={city}
            onClick={() => toggle(city)}
            style={{ padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: on ? 700 : 500, background: on ? "#10C4C3" : "rgba(255,255,255,0.06)", color: on ? "#020C1C" : "#A9B4C2", border: on ? "1.5px solid #10C4C3" : "1.5px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            {city}
          </button>
        );
      })}
    </div>
  );
}

export default function BecomeAnAgentPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [licenseNumber, setLicenseNumber] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    // Migration 052 — AuthModal's agent-signup flow may already have
    // created this user's agent_profiles row (rera_number + status:
    // 'pending'), in which case a plain INSERT here would fail on the
    // unique user_id constraint with the dead-end "already have an
    // application" error below. Check first, and UPDATE that row with this
    // page's fields instead of failing. Falls through to the original
    // unconditional INSERT for anyone who reaches this page without having
    // gone through AuthModal's agent-signup flow first.
    const { data: existingProfile, error: selectErr } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectErr) {
      setSubmitting(false);
      setError("Something went wrong — please try again.");
      return;
    }

    let agentId: string;

    if (existingProfile) {
      const { error: updateErr } = await supabase
        .from("agent_profiles")
        .update({
          license_number: licenseNumber || null,
          agency_name: agencyName || null,
          bio: bio || null,
          years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        })
        .eq("id", existingProfile.id);

      if (updateErr) {
        setSubmitting(false);
        setError("Something went wrong — please try again.");
        return;
      }
      agentId = existingProfile.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("agent_profiles")
        .insert({
          user_id: user.id,
          license_number: licenseNumber || null,
          agency_name: agencyName || null,
          bio: bio || null,
          years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        setSubmitting(false);
        setError(
          insertErr?.code === "23505"
            ? "You already have an agent application on file."
            : "Something went wrong — please try again."
        );
        return;
      }
      agentId = inserted.id;
    }

    if (cities.length > 0) {
      await supabase
        .from("agent_service_cities")
        .insert(cities.map(city => ({ agent_id: agentId, city })));
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const wrap: React.CSSProperties = {
    minHeight: "100dvh", background: "#020C1C", paddingTop: "64px",
    display: "flex", flexDirection: "column", alignItems: "center",
    fontFamily: "var(--font-body-new)",
  };

  if (authLoading) {
    return (
      <div style={{ ...wrap, justifyContent: "center" }}>
        <div style={{ color: "#10C4C3" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ ...wrap, justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "32px", fontWeight: 600, color: "#FFFFFF", marginBottom: "12px" }}>
            Become an Agent
          </h1>
          <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "24px", lineHeight: 1.6 }}>
            Sign in to apply as a Nilay 360 agent.
          </p>
          <button
            onClick={() => openAuthModal("signin")}
            style={{ padding: "12px 28px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "13px", letterSpacing: "0.04em", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ ...wrap, justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "440px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(52,211,153,0.08)", border: "1.5px solid rgba(52,211,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#34D399" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 600, color: "#FFFFFF", marginBottom: "10px" }}>
            Application Received
          </h1>
          <p style={{ fontSize: "14px", color: "#A9B4C2", lineHeight: 1.6 }}>
            We&apos;ll review your application and get back to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrap, alignItems: "center", padding: "48px 24px 80px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "34px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>
          Become an Agent
        </h1>
        <p style={{ fontSize: "14px", color: "#A9B4C2", marginBottom: "32px", lineHeight: 1.6 }}>
          Tell us about your experience — our team reviews every application.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={labelStyle}>License Number</label>
            <input type="text" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} style={inputStyle} placeholder="RERA / license number" />
          </div>
          <div>
            <label style={labelStyle}>Agency Name</label>
            <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} style={inputStyle} placeholder="Your agency (if any)" />
          </div>
          <div>
            <label style={labelStyle}>Years of Experience</label>
            <input type="number" min="0" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Tell us about yourself and your work." />
          </div>
          <div>
            <label style={labelStyle}>Service Cities</label>
            <CityMultiSelect selected={cities} onChange={setCities} />
          </div>

          {error && <div style={{ fontSize: "13px", color: "#F87171" }}>{error}</div>}

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{ padding: "14px", borderRadius: "9px", background: "#10C4C3", color: "#020C1C", border: "none", fontWeight: 700, fontSize: "14px", letterSpacing: "0.04em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "var(--font-body-new)" }}
          >
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
