"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

const REASONS = ["Misleading information", "Spam", "Inappropriate content", "Other"] as const;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px", background: "#F8F6F1",
  border: "1.5px solid rgba(13,43,31,0.08)", borderRadius: "8px", fontSize: "13px",
  color: "#020C1C", fontFamily: "'Cal Sans', sans-serif", outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "#6B7C72",
  textTransform: "uppercase" as const, display: "block", marginBottom: "4px",
};

/**
 * Reusable "Report" trigger + modal for public pages (property detail,
 * agent profile). Signed-out clicks open the existing sign-in modal
 * rather than the report form — reports are tied to a reporter_id.
 */
export default function ReportButton({
  entityType, entityId, variant = "light",
}: {
  entityType: "listing" | "profile";
  entityId: string;
  /** "dark" matches the translucent pill buttons on dark hero imagery (property gallery); "light" matches white sidebar cards (agent profile). */
  variant?: "dark" | "light";
}) {
  const { user, openAuthModal } = useAuth();
  const [open,       setOpen]       = useState(false);
  const [reason,     setReason]     = useState<string>(REASONS[0]);
  const [details,    setDetails]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleTriggerClick = () => {
    if (!user) { openAuthModal("signin"); return; }
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false); setReason(REASONS[0]); setDetails(""); setError(null);
    }, 200);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("reports").insert({
      reporter_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (err) { setError("Failed to submit — please try again."); return; }
    setSubmitted(true);
  };

  const triggerStyle: React.CSSProperties = variant === "dark"
    ? { display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }
    : { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#fff", border: "1.5px solid rgba(13,43,31,0.1)", borderRadius: "10px", fontSize: "12px", fontWeight: 600, color: "#6B7C72", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif", width: "100%" };

  return (
    <>
      <button onClick={handleTriggerClick} style={triggerStyle}>
        <svg width={variant === "dark" ? 13 : 14} height={variant === "dark" ? 13 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Report
      </button>

      {open && (
        <div
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Report content"
          style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "18px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 12px 48px rgba(0,0,0,0.25)", width: "100%", maxWidth: "420px", padding: "26px 28px", fontFamily: "'Cal Sans', sans-serif" }}
          >
            {submitted ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>✅</div>
                <p style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", color: "#020C1C", marginBottom: "8px" }}>Report submitted</p>
                <p style={{ fontSize: "12px", color: "#6B7C72", lineHeight: 1.7, marginBottom: "18px" }}>Our team will review this shortly. Thank you for helping keep Nilay 360 trustworthy.</p>
                <button onClick={close} style={{ padding: "10px 20px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h3 style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#020C1C" }}>Report {entityType === "listing" ? "Listing" : "Profile"}</h3>
                  <button onClick={close} aria-label="Close" style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={labelStyle}>Reason</label>
                    <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Details (optional)</label>
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      rows={3}
                      placeholder="Anything that will help our team review this…"
                      style={{ ...inputStyle, resize: "vertical" as const }}
                    />
                  </div>
                  {error && <div style={{ fontSize: "12px", color: "#DC2626" }}>{error}</div>}
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    style={{ padding: "12px", background: "#10C4C3", border: "none", borderRadius: "9px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1, fontFamily: "'Cal Sans', sans-serif" }}
                  >
                    {submitting ? "Submitting…" : "Submit Report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
