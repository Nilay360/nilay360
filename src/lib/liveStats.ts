"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "loading" while the first attempt (or a retry) is in flight, "success"
// once real numbers have come back, "error" only after every retry has
// been exhausted. Every consumer of useLiveStats() must treat "error"
// as distinct from a genuine zero — see PLACEHOLDER_STATS below, whose
// numeric fields are never meant to be rendered as real data.
export type LiveStatsStatus = "loading" | "success" | "error";

export interface LiveStats {
  status: LiveStatsStatus;
  listings: number;
  agents: number;
  cities: number;
  cityNames: string[];
  listingsByType: { sale: number; rent: number; commercial: number };
  blogPosts: number;
  /** Avg ₹/sqft across active Hyderabad "sale" listings only (rent/commercial
   * excluded — different price units, would silently corrupt the average).
   * null when there isn't at least one usable listing to compute from
   * (a genuine "no data" case, orthogonal to `status`). */
  avgSalePricePerSqft: number | null;
  avgSalePriceSampleSize: number;
}

// Only used while status is "loading" or "error" — the numeric 0s here are
// never meant to reach the screen as if they were real counts. Callers must
// check `status` before rendering; see homepage hero stat tiles for the
// reference pattern (render "—" / hide on "error", never the raw number).
const PLACEHOLDER_STATS: Omit<LiveStats, "status"> = {
  listings: 0,
  agents: 0,
  cities: 0,
  cityNames: [],
  listingsByType: { sale: 0, rent: 0, commercial: 0 },
  blogPosts: 0,
  avgSalePricePerSqft: null,
  avgSalePriceSampleSize: 0,
};

// Mirrors the live-stats query originally inlined in src/app/page.tsx (homepage
// hero + trust-bar stats) — extracted here so every page quoting real inventory
// counts reads from one implementation instead of copy-pasting the queries.
//
// Throws on ANY failure — a rejected fetch (network/TLS blip, a browser
// extension blocking the request) or a query-level Supabase error — rather
// than swallowing it and returning zeros. Confirmed tonight: a blocked/failed
// request rendered identically to "genuinely zero listings" site-wide, which
// is what this function existing (instead of inlining try/catch per caller)
// is meant to prevent. Callers (useLiveStats below) own the retry/fallback
// decision — this function's only job is to fetch or fail honestly.
export async function fetchLiveStats(): Promise<Omit<LiveStats, "status">> {
  const supabase = createClient();
  const [
    { count: listingsCount, error: listingsErr },
    { count: agentsCount, error: agentsErr },
    { data: cityRows, error: cityErr },
    { data: typeRows, error: typeErr },
    { count: blogCount, error: blogErr },
    { data: hyderabadSaleRows, error: hydErr },
  ] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("agent_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("property_listings").select("city").eq("status", "active"),
    supabase.from("property_listings").select("listing_type").eq("status", "active"),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("property_listings").select("price, built_up_area").eq("status", "active").eq("listing_type", "sale").ilike("city", "hyderabad"),
  ]);

  const firstError = listingsErr ?? agentsErr ?? cityErr ?? typeErr ?? blogErr ?? hydErr;
  if (firstError) throw firstError;

  const perSqftValues = ((hyderabadSaleRows ?? []) as { price: number | null; built_up_area: number | null }[])
    .filter(r => r.price && r.built_up_area)
    .map(r => (r.price as number) / (r.built_up_area as number));
  const avgSalePricePerSqft = perSqftValues.length
    ? Math.round(perSqftValues.reduce((a, b) => a + b, 0) / perSqftValues.length)
    : null;

  const cityNames = Array.from(
    new Set((cityRows ?? []).map((r: { city: string | null }) => r.city).filter(Boolean))
  ).sort() as string[];

  const listingsByType = { sale: 0, rent: 0, commercial: 0 };
  for (const row of (typeRows ?? []) as { listing_type?: string }[]) {
    if (row.listing_type === "sale") listingsByType.sale++;
    else if (row.listing_type === "rent") listingsByType.rent++;
    else if (row.listing_type === "commercial") listingsByType.commercial++;
  }

  return {
    listings: listingsCount ?? 0,
    agents: agentsCount ?? 0,
    cities: cityNames.length,
    cityNames,
    listingsByType,
    blogPosts: blogCount ?? 0,
    avgSalePricePerSqft,
    avgSalePriceSampleSize: perSqftValues.length,
  };
}

// Two automatic retries (0.6s, then 1.8s later) before giving up — enough to
// silently ride out a momentary blip (a flaky connection, a browser extension
// that only blocks the first attempt) without the visitor ever seeing
// anything. Only after both retries fail does status become "error".
const RETRY_DELAYS_MS = [600, 1800];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>({ status: "loading", ...PLACEHOLDER_STATS });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      for (let attempt = 0; ; attempt++) {
        try {
          const s = await fetchLiveStats();
          if (!cancelled) setStats({ status: "success", ...s });
          return;
        } catch (err) {
          if (attempt >= RETRY_DELAYS_MS.length) {
            console.error("[liveStats] failed after retries — showing error state, not fake zeros:", err);
            if (!cancelled) setStats(prev => ({ ...prev, status: "error" }));
            return;
          }
          await delay(RETRY_DELAYS_MS[attempt]);
          if (cancelled) return;
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return stats;
}
