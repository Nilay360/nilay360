"use client";

// "My Active Deals" — deals where assigned_to = self AND stage NOT IN
// (closed, lost). Reuses DealStageBadge from /agent/deals' own list
// page (same cross-route module-import pattern already used tonight,
// e.g. tasks/[id] importing from messages/page) rather than
// redefining stage colors a second time.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DealStageBadge, type Deal } from "@/app/agent/deals/page";

interface PropertyTitle { id: string; title: string; }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtPrice(price: number | null): string {
  return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
}

export default function ActiveDealsTable({ agentId }: { agentId: string }) {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [properties, setProperties] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDeals(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("deals")
        .select("id, inquiry_id, site_visit_id, property_id, assigned_to, stage, deal_price, lost_reason, notes, created_at, updated_at")
        .eq("assigned_to", agentId)
        .not("stage", "in", "(closed,lost)")
        .order("created_at", { ascending: false });
      if (error) console.error("ActiveDealsTable — deals query error:", error);
      const rows = (data as Deal[] | null) ?? [];

      const propertyIds = [...new Set(rows.map(d => d.property_id).filter((id): id is string => !!id))];
      const propertyMap = new Map<string, string>();
      if (propertyIds.length > 0) {
        const { data: props } = await supabase.from("property_listings").select("id, title").in("id", propertyIds);
        (props as PropertyTitle[] | null ?? []).forEach(p => propertyMap.set(p.id, p.title));
      }

      if (!cancelled) { setDeals(rows); setProperties(propertyMap); }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>My Active Deals</h3>
      {!deals ? (
        <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
      ) : deals.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7686" }}>No active deals right now.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Property</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Stage</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Price</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#A9B4C2", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(d => (
                <tr key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <Link href={`/agent/deals/${d.id}`} style={{ color: "#10C4C3", textDecoration: "none", fontWeight: 600 }}>
                      {d.property_id ? (properties.get(d.property_id) ?? "Property") : "No property linked"}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 12px" }}><DealStageBadge stage={d.stage} /></td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#FFFFFF" }}>{fmtPrice(d.deal_price)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#A9B4C2" }}>{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
