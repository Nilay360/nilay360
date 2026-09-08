"use client";

// "Leads Over Time" — inquiries.created_at, assigned_to = self, last 12
// months. Reference layout's "Yearly Stats" line chart, re-skinned dark
// (teal stroke, no fill, curved), real data.

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "./ChartCard";

export default function LeadsOverTimeChart({ agentId }: { agentId: string }) {
  const [data, setData] = useState<{ label: string; count: number }[] | null>(null);

  // TEMPORARY — mount marker for the /agent/leads red-line diagnosis. Remove after confirming.
  useEffect(() => { console.log("[MOUNT MARKER] LeadsOverTimeChart mounted at", window.location.pathname); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const { data: rows, error } = await supabase
        .from("inquiries")
        .select("created_at")
        .eq("assigned_to", agentId)
        .gte("created_at", earliestBucketStart(months).toISOString());
      if (error) console.error("LeadsOverTimeChart — inquiries query error:", error);
      const counts = countByMonth((rows as { created_at: string }[] | null ?? []).map(r => r.created_at), months);
      if (!cancelled) setData(months.map((m, i) => ({ label: m.label, count: counts[i] })));
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <ChartCard title="Leads Over Time" value={data ? total : undefined} loading={!data}>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} itemStyle={{ color: "#10C4C3" }} />
            <Line type="monotone" dataKey="count" name="Leads" stroke="#10C4C3" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
