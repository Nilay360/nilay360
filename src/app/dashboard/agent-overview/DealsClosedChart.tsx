"use client";

// "Deals Closed" — deals where stage='closed', grouped by closed_at
// month, assigned_to = self, last 12 months. Uses the real closed_at
// column from migration 046 (live) — not updated_at. Reference
// layout's "Sales/Revenue" bar chart, re-skinned dark, real data.

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "./ChartCard";

export default function DealsClosedChart({ agentId }: { agentId: string }) {
  const [data, setData] = useState<{ label: string; count: number }[] | null>(null);

  // TEMPORARY — mount marker for the /agent/leads red-line diagnosis. Remove after confirming.
  useEffect(() => { console.log("[MOUNT MARKER] DealsClosedChart mounted at", window.location.pathname); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const { data: rows, error } = await supabase
        .from("deals")
        .select("closed_at")
        .eq("assigned_to", agentId)
        .eq("stage", "closed")
        .gte("closed_at", earliestBucketStart(months).toISOString());
      if (error) console.error("DealsClosedChart — deals query error:", error);
      const counts = countByMonth((rows as { closed_at: string | null }[] | null ?? []).map(r => r.closed_at), months);
      if (!cancelled) setData(months.map((m, i) => ({ label: m.label, count: counts[i] })));
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <ChartCard title="Deals Closed" value={data ? total : undefined} loading={!data}>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} itemStyle={{ color: "#4ADE80" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="count" name="Closed" fill="#4ADE80" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
