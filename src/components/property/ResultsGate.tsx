"use client";
import { useAuth } from "@/context/AuthContext";
import { REQUIRE_SIGNIN_FOR_RESULTS_VIEW } from "@/lib/feature-flags";

// Wraps a results grid (property cards) on /search, /buy, /rent. When the gate is on and
// no user session exists, the grid renders blurred and inert behind a "Sign In to View
// Properties" CTA. Filters/sidebar live outside this component and are never affected.
//
// While auth is still resolving we treat the view as locked (not unlocked) so a signed-out
// visitor never sees a flash of real listings before the gate kicks in.
export default function ResultsGate({ children }: { children: React.ReactNode }) {
  const { user, loading, openAuthModal } = useAuth();

  if (!REQUIRE_SIGNIN_FOR_RESULTS_VIEW) return <>{children}</>;

  const locked = loading || !user;

  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden={locked}
        style={{
          filter: locked ? "blur(16px)" : "none",
          pointerEvents: locked ? "none" : "auto",
          userSelect: locked ? "none" : "auto",
          transition: "filter 0.25s",
        }}
      >
        {children}
      </div>
      {locked && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", minHeight: "320px" }}>
          <div style={{ background: "rgba(8,14,26,0.7)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "32px 28px", maxWidth: "380px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(16,196,195,0.12)", border: "1px solid rgba(16,196,195,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>
              Sign In to View Properties
            </div>
            <p style={{ fontSize: "13px", color: "#A9B4C2", lineHeight: 1.6, marginBottom: "20px" }}>
              Create a free account to see full listings, photos, and details for these results.
            </p>
            <button
              onClick={() => openAuthModal("signin")}
              style={{ width: "100%", padding: "12px", background: "#10C4C3", border: "none", borderRadius: "16px", boxShadow: "0 10px 30px rgba(30,167,255,.35)", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Cal Sans', sans-serif" }}
            >
              Sign In to View Properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
