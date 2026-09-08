import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PropertyDetailClient from "./PropertyDetailClient";

type Props = { params: Promise<{ slug: string }> };

type PropertyMeta = {
  title: string;
  highlights: string | null;
  category: string | null;
  listingType: string;
  city: string;
  state: string | null;
  locality: string | null;
  price: number;
  images: string[];
  bedrooms: number | null;
  slug: string;
};

async function getPropertyMeta(slug: string): Promise<PropertyMeta | null> {
  const supabase = await createClient();

  // 1) Try seed catalog
  const { data: seed } = await supabase
    .from("properties")
    .select("title,description,type,listing_type,price,city,state,neighbourhood,images,bedrooms,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (seed) {
    const s = seed as Record<string, unknown>;
    return {
      title:       String(s.title ?? ""),
      highlights:  typeof s.description === "string" ? s.description : null,
      category:    typeof s.type === "string" ? s.type : null,
      listingType: typeof s.listing_type === "string" ? s.listing_type : "sale",
      city:        typeof s.city === "string" ? s.city : "",
      state:       typeof s.state === "string" ? s.state : null,
      locality:    typeof s.neighbourhood === "string" ? s.neighbourhood : null,
      price:       typeof s.price === "number" ? s.price : 0,
      images:      Array.isArray(s.images) ? (s.images as string[]) : [],
      bedrooms:    typeof s.bedrooms === "number" ? s.bedrooms : null,
      slug:        String(s.slug ?? slug),
    };
  }

  // 2) Fall back to a user-submitted listing. No explicit status filter
  // here — this server client reads the real request's session cookies
  // (@/lib/supabase/server uses @supabase/ssr), so it's under the same
  // RLS as PropertyDetailClient.tsx's own fetch: public+active, the
  // seller's own row, or (migration 026) the approved agent assigned to
  // a lead referencing this property. An explicit "active only" filter
  // here would just re-introduce the same bug PropertyDetailClient.tsx
  // had — a redundant business-rule gate stricter than RLS, silently
  // showing "Property Not Found" in the tab title for a listing whose
  // real content the visitor is genuinely allowed to see.
  const { data: listing } = await supabase
    .from("property_listings")
    .select("title,highlights,property_category,listing_type,price,city,state,locality,photo_urls,bedrooms,slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!listing) return null;
  const l = listing as Record<string, unknown>;
  return {
    title:       String(l.title ?? ""),
    highlights:  typeof l.highlights === "string" ? l.highlights : null,
    category:    typeof l.property_category === "string" ? l.property_category : null,
    listingType: typeof l.listing_type === "string" ? l.listing_type : "sale",
    city:        typeof l.city === "string" ? l.city : "",
    state:       typeof l.state === "string" ? l.state : null,
    locality:    typeof l.locality === "string" ? l.locality : null,
    price:       typeof l.price === "number" ? l.price : 0,
    images:      Array.isArray(l.photo_urls) ? (l.photo_urls as string[]) : [],
    bedrooms:    typeof l.bedrooms === "number" ? l.bedrooms : null,
    slug:        String(l.slug ?? slug),
  };
}

function formatPriceMeta(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function buildDescription(p: PropertyMeta): string {
  if (p.highlights && p.highlights.length > 30) {
    return p.highlights.slice(0, 155) + (p.highlights.length > 155 ? "…" : "");
  }
  const parts: string[] = [];
  if (p.bedrooms) parts.push(`${p.bedrooms} BHK`);
  if (p.category) parts.push(p.category.charAt(0).toUpperCase() + p.category.slice(1));
  const action = p.listingType === "rent" ? "for Rent" : "for Sale";
  const loc = [p.locality, p.city, p.state].filter(Boolean).join(", ");
  parts.push(action);
  if (loc) parts.push(`in ${loc}`);
  parts.push(`at ${formatPriceMeta(p.price, p.listingType)}`);
  return parts.join(" ") + ". Contact Nilay 360 for details.";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPropertyMeta(slug);

  if (!p) {
    return {
      title: "Property Not Found | Nilay 360",
      description: "This property listing could not be found.",
    };
  }

  const title = `${p.title} | Nilay 360 Premium Real Estate`;
  const description = buildDescription(p);
  const image = p.images[0] ?? "/og-image.png";
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/property/${p.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: p.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const p = await getPropertyMeta(slug);

  const jsonLd = p
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: p.title,
        description: buildDescription(p),
        image: p.images[0] ?? "/og-image.png",
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/property/${p.slug}`,
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: p.city,
          addressRegion: p.state ?? undefined,
          addressCountry: "IN",
          streetAddress: p.locality ?? undefined,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PropertyDetailClient />
    </>
  );
}
