import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://nilay360.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/properties`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/buy`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/rent`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/agents`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const supabase = await createClient();

  // Seed catalog properties
  const { data: seedProps } = await supabase
    .from("properties")
    .select("slug,created_at")
    .order("created_at", { ascending: false });

  // User-submitted active listings
  const { data: listings } = await supabase
    .from("property_listings")
    .select("slug,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const seedRoutes: MetadataRoute.Sitemap = (seedProps ?? []).map((p: Record<string, unknown>) => ({
    url: `${BASE}/property/${String(p.slug ?? "")}`,
    lastModified: typeof p.created_at === "string" ? new Date(p.created_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l: Record<string, unknown>) => ({
    url: `${BASE}/property/${String(l.slug ?? "")}`,
    lastModified: typeof l.created_at === "string" ? new Date(l.created_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...seedRoutes, ...listingRoutes];
}
