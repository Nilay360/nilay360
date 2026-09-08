"use client";

// "Leads/Deals by City" — the agent's own inquiries + deals, grouped
// by the linked property's city, ranked descending. No map library
// (per instruction) — a plain ranked list with a proportional CSS bar,
// same "real counts, no chart lib needed" approach as the rest of this
// pilot.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CityRow { city: string; leads: number; deals: number; total: number; }

export default function LeadsByCityRanked({ agentId }: { agentId: string }) {
  const [rows, setRows] = useState<CityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRows(null);
      const supabase = createClient();

      const [leadsRes, dealsRes] = await Promise.all([
        supabase.from("inquiries").select("property_id").eq("assigned_to", agentId),
        supabase.from("deals").select("property_id").eq("assigned_to", agentId),
      ]);
      if (leadsRes.error) console.error("LeadsByCityRanked — inquiries query error:", leadsRes.error);
      if (dealsRes.error) console.error("LeadsByCityRanked — deals query error:", dealsRes.error);

      const leadPropertyIds = (leadsRes.data as { property_id: string | null }[] | null ?? []).map(r => r.property_id).filter((id): id is string => !!id);
      const dealPropertyIds = (dealsRes.data as { property_id: string | null }[] | null ?? []).map(r => r.property_id).filter((id): id is string => !!id);
      const allPropertyIds = [...new Set([...leadPropertyIds, ...dealPropertyIds])];

      const cityByProperty = new Map<string, string>();
      if (allPropertyIds.length > 0) {
        const { data: props, error: propsErr } = await supabase.from("property_listings").select("id, city").in("id", allPropertyIds);
        if (propsErr) console.error("LeadsByCityRanked — property_listings query error:", propsErr);
        (props as { id: string; city: string | null }[] | null ?? []).forEach(p => cityByProperty.set(p.id, p.city ?? "Unknown city"));
      }

      const byCity = new Map<string, { leads: number; deals: number }>();
      const bump = (propertyId: string, field: "leads" | "deals") => {
        const city = cityByProperty.get(propertyId) ?? "No property linked";
        const entry = byCity.get(city) ?? { leads: 0, deals: 0 };
        entry[field] += 1;
        byCity.set(city, entry);
      };
      leadPropertyIds.forEach(id => bump(id, "leads"));
      dealPropertyIds.forEach(id => bump(id, "deals"));

      const result: CityRow[] = [...byCity.entries()]
        .map(([city, { leads, deals }]) => ({ city, leads, deals, total: leads + deals }))
        .sort((a, b) => b.total - a.total);

      if (!cancelled) setRows(result);
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  const maxTotal = rows && rows.length > 0 ? Math.max(...rows.map(r => r.total)) : 1;

  return (
    <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
      <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 500, color: "#FFFFFF", marginBottom: "16px" }}>Leads/Deals by City</h3>
      {!rows ? (
        <p style={{ fontSize: "13px", color: "#A9B4C2" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#6B7686" }}>No leads or deals linked to a property yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rows.map(r => (
            <div key={r.city}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "5px" }}>
                <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{r.city}</span>
                <span style={{ color: "#A9B4C2" }}>{r.total} · {r.leads} lead{r.leads !== 1 ? "s" : ""}, {r.deals} deal{r.deals !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(r.total / maxTotal) * 100}%`, background: "#10C4C3", borderRadius: "3px" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
