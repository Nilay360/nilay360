"use client";

// "My Listings" — no query of its own. OverviewTab already receives
// `listings` as a prop (loaded once by loadBuyerSeller() for the
// existing KPI cards, seller_email OR user_id match against
// property_listings) — this is a pure presentational table over that
// same already-loaded data, same table style as the agent
// dashboard's ActiveDealsTable. StatusBadge duplicated locally rather
// than imported from DashboardClient.tsx (which imports this file),
// to avoid a circular import for a ~10-line component — same
// per-file duplication convention used throughout this codebase.

interface ListingRow {
  id: string;
  slug: string | null;
  title: string | null;
  status: string;
  price: number | null;
  submitted_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending_review: { label: "Pending Review", bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" },
    active:         { label: "Active",         bg: "rgba(16,196,195,0.15)", color: "#10C4C3", border: "rgba(16,196,195,0.30)" },
    rejected:       { label: "Rejected",       bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.30)" },
  };
  const c = cfg[status] ?? { label: status, bg: "rgba(255,255,255,0.10)", color: "#A9B4C2", border: "rgba(255,255,255,0.18)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtPrice(price: number | null): string {
  return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
}

export default function MyListingsTable({ listings }: { listings: ListingRow[] }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>My Listings</h3>
      {listings.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7686" }}>No listings yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Title</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Price</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    {l.slug ? (
                      <a href={`/property/${l.slug}`} style={{ color: "#10C4C3", textDecoration: "none", fontWeight: 600 }}>{l.title ?? "Untitled"}</a>
                    ) : (
                      <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{l.title ?? "Untitled"}</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}><StatusBadge status={l.status} /></td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#FFFFFF" }}>{fmtPrice(l.price)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#A9B4C2" }}>{fmtDate(l.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
