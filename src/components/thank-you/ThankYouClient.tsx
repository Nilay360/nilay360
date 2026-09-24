"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { formatPrice, formatArea } from "@/lib/utils";
import { optimizedImageUrl } from "@/lib/image-url";
import { useSiteContact } from "@/hooks/useSiteContact";
import { waHref } from "@/lib/contactFormat";
import ScrollHero from "./ScrollHero";

export interface SimilarProperty {
  id: string;
  slug: string;
  title: string;
  price: number;
  listing_type: "sale" | "rent" | "commercial";
  type: string;
  city: string;
  neighbourhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft: number;
  images: string[];
  is_featured?: boolean;
  is_new_construction?: boolean;
  status?: string;
  rera_number?: string;
}

interface ThankYouClientProps {
  isMobile: boolean;
  properties: SimilarProperty[];
  listingCount: number;
}

// Enquiry is already sent by the time this page loads, so "Under Review" is
// the current step — matches the reference design's stepper state exactly.
const STEPS = ["Enquiry Sent", "Under Review", "Team Contact"] as const;
const CURRENT_STEP_INDEX = 1;

const GOOGLE_ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function ThankYouTracking() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utm = {
      utm_source: searchParams.get("utm_source") ?? undefined,
      utm_medium: searchParams.get("utm_medium") ?? undefined,
      utm_campaign: searchParams.get("utm_campaign") ?? undefined,
      utm_term: searchParams.get("utm_term") ?? undefined,
      utm_content: searchParams.get("utm_content") ?? undefined,
    };
    posthog.capture("thank_you_page_viewed", utm);
  }, [searchParams]);

  return null;
}

export default function ThankYouClient({ isMobile, properties, listingCount }: ThankYouClientProps) {
  const contact = useSiteContact("general");
  const whatsappHref = contact
    ? waHref(contact.whatsapp ?? contact.phone, "Hi, I just submitted an enquiry on Nilay 360")
    : undefined;

  return (
    <>
      <Suspense fallback={null}>
        <ThankYouTracking />
      </Suspense>

      {GOOGLE_ADS_CONVERSION_ID && GOOGLE_ADS_CONVERSION_LABEL && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_CONVERSION_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-conversion" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ADS_CONVERSION_ID}');
              gtag('event', 'conversion', {'send_to': '${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}'});
            `}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'Lead');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=Lead&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Always-available CTA — a visitor ready to act immediately doesn't
          have to scroll through the full sequence to find it. Purely additive:
          the end-of-scroll CTA inside ScrollHero stays exactly as designed. */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 900,
          display: "flex",
          gap: "10px",
          padding: "10px 16px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(2,12,28,0.92)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(16,196,195,0.2)",
        }}
        data-viewport={isMobile ? "mobile" : "desktop"}
      >
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center text-[13px] font-semibold rounded-full transition-transform hover:scale-[1.02]"
            style={{ color: "#10C4C3", border: "1.33px solid #10C4C3", background: "transparent", padding: "10px 16px" }}
          >
            Chat on WhatsApp
          </a>
        )}
        <Link
          href="/properties"
          className="flex-1 flex items-center justify-center text-[13px] font-semibold rounded-full transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: "#10C4C3", color: "#020C1C", padding: "10px 16px" }}
        >
          Browse properties
        </Link>
      </div>

      <ScrollHero listingCount={listingCount} whatsappHref={whatsappHref} />

      <div
        className="text-white"
        style={{
          background: "radial-gradient(120% 120% at 50% -10%, #0A1830 0%, #020C1C 55%)",
          paddingBottom: "96px",
        }}
      >
        <ol
          className="flex items-center justify-center"
          style={{ maxWidth: "380px", width: "100%", margin: "48px auto 0", padding: "0 24px" }}
          aria-label="Enquiry progress"
        >
          {STEPS.map((step, i) => {
            const done = i <= CURRENT_STEP_INDEX;
            const current = i === CURRENT_STEP_INDEX;
            return (
              <li key={step} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1 1 0%" : "0 0 auto" }}>
                <div className="flex flex-col items-center" style={{ gap: "8px", flex: "1 1 0%" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "9999px",
                      ...(done
                        ? { backgroundColor: "#10C4C3" }
                        : { backgroundColor: "transparent", border: "1.33px solid rgba(16,196,195,0.4)" }),
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: current ? "#FFFFFF" : "#C9D3E0", fontWeight: current ? 600 : 400 }}
                  >
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span style={{ height: "2px", flex: "1 1 0%", backgroundColor: "rgba(16,196,195,0.2)", marginTop: "4px" }} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>

        {properties.length > 0 && (
          <section style={{ maxWidth: "1100px", margin: "48px auto 0", padding: "0 24px" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#10C4C3", fontWeight: 700, marginBottom: "10px" }}>
              While you wait
            </p>
            <h2 className="font-display" style={{ fontSize: "26px", fontWeight: 700, marginBottom: "8px" }}>
              Explore similar properties
            </h2>
            <p style={{ color: "#C9D3E0", opacity: 0.75, fontSize: "14px", marginBottom: "24px", maxWidth: "60ch" }}>
              Hand-picked listings matching your enquiry — saved for you until our team reaches out.
            </p>
            <SimilarPropertiesGrid properties={properties} />
          </section>
        )}

        <p className="text-[12px] text-center" style={{ color: "#6B7686", marginTop: "64px" }}>
          Nilay 360 — Real Estate, Reimagined.
        </p>
      </div>
    </>
  );
}

function SimilarPropertiesGrid({ properties }: { properties: SimilarProperty[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cardsIn, setCardsIn] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setCardsIn(true);
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "20px" }}>
      {properties.map((property, i) => (
        <SimilarPropertyCard key={property.id} property={property} cardsIn={cardsIn} index={i} />
      ))}
    </div>
  );
}

function SimilarPropertyCard({ property, cardsIn, index }: { property: SimilarProperty; cardsIn: boolean; index: number }) {
  const priceLabel = property.listing_type === "rent" ? `${formatPrice(property.price)}/mo` : formatPrice(property.price);
  const location = property.neighbourhood ? `${property.neighbourhood}, ${property.city}` : property.city;

  return (
    <Link
      href={`/property/${property.slug}`}
      className="block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
      style={{
        backgroundColor: "#0A1830",
        opacity: cardsIn ? 1 : 0,
        transform: cardsIn ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${index * 0.09}s, transform 0.6s ease ${index * 0.09}s`,
      }}
    >
      <div className="relative h-36 bg-[#111F33]">
        {property.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedImageUrl(property.images[0], 400)}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#10C4C3] text-[12px] tracking-widest opacity-60">
            Nilay 360
          </div>
        )}
        <span
          className="absolute text-[10px] font-bold uppercase rounded-full"
          style={{ top: "10px", left: "10px", backgroundColor: "#10C4C3", color: "#020C1C", letterSpacing: "0.4px", padding: "4px 10px" }}
        >
          {property.listing_type === "rent" ? "For Rent" : "For Sale"}
        </span>
      </div>
      <div style={{ padding: "16px" }}>
        <p className="text-[18px] font-bold text-white line-clamp-1" style={{ marginBottom: "4px" }}>{priceLabel}</p>
        <p className="text-[13px] line-clamp-1" style={{ color: "#C9D3E0", marginBottom: "4px" }}>{property.title}</p>
        <p className="text-[12px]" style={{ color: "#C9D3E0" }}>{location}</p>
        <div
          className="flex items-center text-[11px]"
          style={{ color: "#C9D3E0", gap: "12px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {property.bedrooms !== undefined && <span>{property.bedrooms} BHK</span>}
          {property.bathrooms !== undefined && <span>{property.bathrooms} Bath</span>}
          <span style={{ marginLeft: "auto" }}>{formatArea(property.area_sqft)}</span>
        </div>
      </div>
    </Link>
  );
}
