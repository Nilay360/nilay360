"use client";

// "Performance Trend" — Leads Assigned / Deals Closed / Calls Logged,
// one line each, by month, last 12 months, scoped to self.
//
// Judgment call, flagged rather than silently built as literally
// stated: the brief says "reuse Phase 21's computeAgentPerformance",
// but that function runs ~9 queries per call and computes 7 metrics
// this chart doesn't need — calling it once per month (12 calls) would
// mean ~108 queries to render one chart, throwing away most of the
// work each call does. Instead this fetches the 3 needed raw
// timestamp sets ONCE each (not per month) and buckets them with the
// same last12Months/countByMonth helper every other chart here uses —
// same tables, same status/stage definitions as computeAgentPerformance
// (deals.stage='closed', tasks not needed here), just not literally
// calling that function in a loop.

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { last12Months, earliestBucketStart, countByMonth } from "@/lib/monthBucket";
import ChartCard from "./ChartCard";

interface Row { label: string; leads: number; deals: number; calls: number; }

export default function PerformanceTrendChart({ agentId }: { agentId: string }) {
  const [data, setData] = useState<Row[] | null>(null);

  // TEMPORARY — mount marker for the /agent/leads red-line diagnosis. Remove after confirming.
  useEffect(() => { console.log("[MOUNT MARKER] PerformanceTrendChart mounted at", window.location.pathname); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(null);
      const supabase = createClient();
      const months = last12Months();
      const startIso = earliestBucketStart(months).toISOString();

      const [leadsRes, dealsRes, callsRes] = await Promise.all([
        supabase.from("inquiries").select("created_at").eq("assigned_to", agentId).gte("created_at", startIso),
        supabase.from("deals").select("closed_at").eq("assigned_to", agentId).eq("stage", "closed").gte("closed_at", startIso),
        supabase.from("call_logs").select("called_at").eq("agent_profile_id", agentId).gte("called_at", startIso),
      ]);
      if (leadsRes.error) console.error("PerformanceTrendChart — inquiries query error:", leadsRes.error);
      if (dealsRes.error) console.error("PerformanceTrendChart — deals query error:", dealsRes.error);
      if (callsRes.error) console.error("PerformanceTrendChart — call_logs query error:", callsRes.error);

      const leadsCounts = countByMonth((leadsRes.data as { created_at: string }[] | null ?? []).map(r => r.created_at), months);
      const dealsCounts = countByMonth((dealsRes.data as { closed_at: string | null }[] | null ?? []).map(r => r.closed_at), months);
      const callsCounts = countByMonth((callsRes.data as { called_at: string }[] | null ?? []).map(r => r.called_at), months);

      if (!cancelled) {
        setData(months.map((m, i) => ({ label: m.label, leads: leadsCounts[i], deals: dealsCounts[i], calls: callsCounts[i] })));
      }
    })();
    return () => { cancelled = true; };
  }, [agentId]);

  return (
    <ChartCard title="Performance Trend" loading={!data}>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0A1526", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#A9B4C2" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#A9B4C2" }} />
            <Line type="monotone" dataKey="leads" name="Leads Assigned" stroke="#10C4C3" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="deals" name="Deals Closed" stroke="#4ADE80" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="calls" name="Calls Logged" stroke="#FBBF24" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
