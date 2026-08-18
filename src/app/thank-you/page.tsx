import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import ThankYouClient, { type SimilarProperty } from "@/components/thank-you/ThankYouClient";

export const metadata: Metadata = {
  title: "Thank You",
  description: "Your enquiry has been received. Our Nilay 360 team will be in touch shortly.",
  robots: { index: false, follow: false },
};

async function isMobileRequest(): Promise<boolean> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const x = Number(v);
  return isNaN(x) ? undefined : x;
}

// Real, live listings come from "property_listings" — the same table used by
// admin, search, buy/rent, and the property detail page. The seed "properties"
// table was deliberately emptied of fake listings and must not be queried here.
async function getSimilarProperties(): Promise<SimilarProperty[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("property_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4);

    if (!data) return [];

    return data
      .map((row): SimilarProperty | null => {
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : null;
        const slug = typeof r.slug === "string" ? r.slug : id;
        const title = typeof r.title === "string" ? r.title : null;
        if (!id || !slug || !title) return null;

        const photos = Array.isArray(r.photo_urls) ? (r.photo_urls as string[]).filter(Boolean) : [];

        return {
          id,
          slug,
          title,
          price: toNumber(r.price) ?? 0,
          listing_type: r.listing_type === "rent" || r.listing_type === "commercial" ? r.listing_type : "sale",
          type: typeof r.property_category === "string" ? r.property_category : "",
          city: typeof r.city === "string" ? r.city : "",
          neighbourhood: typeof r.locality === "string" ? r.locality : undefined,
          bedrooms: toNumber(r.bedrooms),
          bathrooms: toNumber(r.bathrooms),
          area_sqft: toNumber(r.built_up_area) ?? 0,
          images: photos,
          is_featured: Boolean(r.is_featured),
          status: typeof r.status === "string" ? r.status : undefined,
        };
      })
      .filter((p): p is SimilarProperty => p !== null);
  } catch {
    return [];
  }
}

// Real, live count — queried fresh on every render, not cached or assumed
// from an earlier session. Whatever this returns is exactly what's shown.
async function getVerifiedListingCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("property_listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

export default async function ThankYouPage() {
  const [isMobile, properties, listingCount] = await Promise.all([
    isMobileRequest(),
    getSimilarProperties(),
    getVerifiedListingCount(),
  ]);

  return (
    <Suspense fallback={null}>
      <ThankYouClient isMobile={isMobile} properties={properties} listingCount={listingCount} />
    </Suspense>
  );
}
