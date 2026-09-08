"use client";

// "Saved Searches Over Time" — saved_searches.created_at, scoped to
// this user, last 12 months. Same shape as the agent dashboard's
// LeadsOverTimeChart (../agent-overview/LeadsOverTimeChart.tsx) —
// same ChartCard shell, same monthBucket.ts helper, just a different
// table/filter. Not duplicated logic, the same pattern applied here.

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "../agent-overview/ChartCard";

export default function SavedSearchesOverTimeChart({ userId }: { userId: string }) {
  const [data, setData] = useState<{ label: string; count: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const { data: rows, error } = await supabase
        .from("saved_searches")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", earliestBucketStart(months).toISOString());
      if (error) console.error("SavedSearchesOverTimeChart — saved_searches query error:", error);
      const counts = countByMonth((rows as { created_at: string }[] | null ?? []).map(r => r.created_at), months);
      if (!cancelled) setData(months.map((m, i) => ({ label: m.label, count: counts[i] })));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <ChartCard title="Saved Searches Over Time" value={data ? total : undefined} loading={!data}>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} itemStyle={{ color: "#10C4C3" }} />
            <Line type="monotone" dataKey="count" name="Saved Searches" stroke="#10C4C3" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
