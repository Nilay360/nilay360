"use client";

// Shared chart-card shell for the agent dashboard re-skin (Phase 22) —
// dark re-skin of the reference "chart card" (title + value on the
// left, chart below). No period dropdown here: every chart mounted in
// this card is a fixed "last 12 months" window per the content spec,
// not a Week/Month/Year toggle like /agent/analytics — a toggle that
// couldn't actually change a hard-coded 12-month query would be
// decorative, not functional, so it's deliberately omitted rather than
// added just to visually match the reference. `right` is still exposed
// as an optional slot for a future case that does need one.

export default function ChartCard({ title, value, right, loading, children }: {
  title: string;
  value?: string | number;
  right?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF" }}>{title}</h3>
          {value !== undefined && (
            <div style={{ fontFamily: "var(--font-support-new)", fontSize: "24px", fontWeight: 700, marginTop: "4px", background: "linear-gradient(135deg, #FFFFFF 0%, #10C4C3 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#FFFFFF" }}>{value}</div>
          )}
        </div>
        {right}
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px", color: "#10C4C3" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "chartcard-spin 0.8s linear infinite" }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
      ) : children}
      <style>{`@keyframes chartcard-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
