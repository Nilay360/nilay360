"use client";

// "Listings Submitted Over Time" — property_listings.submitted_at (not
// created_at — submitted_at is the confirmed-live, semantically correct
// column here; matches PendingSection's own "Oldest submissions first"
// framing), last 12 months. Same ChartCard shell + monthBucket.ts helper
// as the agent dashboard's LeadsOverTimeChart — platform-wide, no
// assigned_to/agent filter, since this is the admin Overview.

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "@/app/dashboard/agent-overview/ChartCard";

export default function ListingsSubmittedOverTimeChart() {
  const [data, setData] = useState<{ label: string; count: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const { data: rows, error } = await supabase
        .from("property_listings")
        .select("submitted_at")
        .gte("submitted_at", earliestBucketStart(months).toISOString());
      if (error) console.error("ListingsSubmittedOverTimeChart — property_listings query error:", error);
      const counts = countByMonth((rows as { submitted_at: string }[] | null ?? []).map(r => r.submitted_at), months);
      if (!cancelled) setData(months.map((m, i) => ({ label: m.label, count: counts[i] })));
    })();
    return () => { cancelled = true; };
  }, []);

  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <ChartCard title="Listings Submitted Over Time" value={data ? total : undefined} loading={!data}>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} itemStyle={{ color: "#10C4C3" }} />
            <Line type="monotone" dataKey="count" name="Listings" stroke="#10C4C3" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
