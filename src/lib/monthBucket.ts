// Shared "bucket rows into the last 12 calendar months" helper — used by
// every chart on the agent dashboard re-skin (Leads Over Time, Deals
// Closed, Performance Trend) so all three define "last 12 months" and
// "which month a timestamp falls into" identically. No SQL group-by/
// date_trunc used anywhere — PostgREST's JS client has no computed-
// expression select syntax for that without a dedicated RPC (a schema
// change, out of scope for this pilot), so every chart fetches raw
// timestamps and buckets them here, client-side.

export interface MonthBucket {
  key: string;   // "2026-01"
  label: string; // "Jan"
  start: Date;   // inclusive
  end: Date;     // exclusive
}

export function last12Months(now: Date = new Date()): MonthBucket[] {
  const months: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("en-IN", { month: "short" }),
      start,
      end,
    });
  }
  return months;
}

// Earliest bucket's start — the single ".gte" lower bound every chart's
// query uses, same "open-ended forward filter, no explicit upper bound"
// convention as the rest of this codebase (there's no future data to
// exclude, so no upper bound is needed).
export function earliestBucketStart(months: MonthBucket[]): Date {
  return months[0].start;
}

export function countByMonth(timestamps: (string | null)[], months: MonthBucket[]): number[] {
  return months.map(m => timestamps.filter(t => {
    if (!t) return false;
    const ms = new Date(t).getTime();
    return ms >= m.start.getTime() && ms < m.end.getTime();
  }).length);
}
