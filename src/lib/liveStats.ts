"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface LiveStats {
  listings: number;
  agents: number;
  cities: number;
  cityNames: string[];
  listingsByType: { sale: number; rent: number; commercial: number };
  blogPosts: number;
  /** Avg ₹/sqft across active Hyderabad "sale" listings only (rent/commercial
   * excluded — different price units, would silently corrupt the average).
   * null when there isn't at least one usable listing to compute from. */
  avgSalePricePerSqft: number | null;
  avgSalePriceSampleSize: number;
}

const EMPTY_STATS: LiveStats = {
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
export async function fetchLiveStats(): Promise<LiveStats> {
  const supabase = createClient();
  const [
    { count: listingsCount },
    { count: agentsCount },
    { data: cityRows },
    { data: typeRows },
    { count: blogCount },
    { data: hyderabadSaleRows },
  ] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("agent_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("property_listings").select("city").eq("status", "active"),
    supabase.from("property_listings").select("listing_type").eq("status", "active"),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("property_listings").select("price, built_up_area").eq("status", "active").eq("listing_type", "sale").ilike("city", "hyderabad"),
  ]);

  const perSqftValues = ((hyderabadSaleRows ?? []) as { price: number | null; built_up_area: number | null }[])
    .filter(r => r.price && r.built_up_area)
    .map(r => (r.price as number) / (r.built_up_area as number));
  const avgSalePricePerSqft = perSqftValues.length
    ? Math.round(perSqftValues.reduce((a, b) => a + b, 0) / perSqftValues.length)
    : null;

  const cityNames = Array.from(
    new Set((cityRows ?? []).map((r: any) => r.city).filter(Boolean))
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

export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS);
  useEffect(() => {
    async function load() {
      try {
        const s = await fetchLiveStats();
        setStats(s);
      } catch (_) {}
    }
    load();
  }, []);
  return stats;
}
