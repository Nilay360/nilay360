"use client";

// "Inquiries Received" — inquiries.created_at where seller_email =
// this user, last 12 months. Same query shape as the agent
// dashboard's LeadsOverTimeChart, filtered by seller_email instead of
// assigned_to. Rendered as a bar chart (not a line) deliberately, so
// it reads as visually distinct from the line chart next to it —
// same pairing the agent dashboard used (Leads Over Time = line,
// Deals Closed = bar), not two identical-looking line charts.

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "../agent-overview/ChartCard";

export default function InquiriesReceivedChart({ email }: { email: string }) {
  const [data, setData] = useState<{ label: string; count: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const { data: rows, error } = await supabase
        .from("inquiries")
        .select("created_at")
        .eq("seller_email", email)
        .gte("created_at", earliestBucketStart(months).toISOString());
      if (error) console.error("InquiriesReceivedChart — inquiries query error:", error);
      const counts = countByMonth((rows as { created_at: string }[] | null ?? []).map(r => r.created_at), months);
      if (!cancelled) setData(months.map((m, i) => ({ label: m.label, count: counts[i] })));
    })();
    return () => { cancelled = true; };
  }, [email]);

  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <ChartCard title="Inquiries Received" value={data ? total : undefined} loading={!data}>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} itemStyle={{ color: "#4ADE80" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="count" name="Inquiries" fill="#4ADE80" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
