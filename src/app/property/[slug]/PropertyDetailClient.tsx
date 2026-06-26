"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Reveal from "@/components/ui/Reveal";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useAuth } from "@/context/AuthContext";

// ── Types ────────────────────────────────────────────────────
type Property = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  listing_type: string;
  status: string;
  price: number;
  price_per_sqft: number | null;
  deposit_amount: number | null;
  area_sqft: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  floor_number: number | null;
  total_floors: number | null;
  year_built: number | null;
  is_furnished: boolean;
  address: string;
  city: string;
  neighbourhood: string | null;
  state: string;
  pincode: string | null;
  images: string[];
  amenities: string[];
  facing: string | null;
  vastu_compliant: boolean | null;
  rera_number: string | null;
  ownership_type: string | null;
  is_featured: boolean;
  views: number;
  saves: number;
  created_at: string;
  video_url: string | null;
  seller_email?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_whatsapp?: string;
};

// ── Map user-submitted property_listings row → detail Property ──
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
}

function mapListingToProperty(row: Record<string, unknown>): Property {
  const photos = Array.isArray(row.photo_urls) ? (row.photo_urls as string[]).filter(Boolean) : [];
  const amenities = Array.isArray(row.amenities) ? (row.amenities as string[]) : [];
  return {
    id:             String(row.id ?? ""),
    slug:           typeof row.slug === "string" ? row.slug : String(row.id ?? ""),
    title:          typeof row.title === "string" ? row.title : "Untitled Property",
    description:    typeof row.highlights === "string" ? row.highlights : null,
    type:           typeof row.property_category === "string" ? row.property_category : "",
    listing_type:   typeof row.listing_type === "string" ? row.listing_type : "sale",
    status:         typeof row.status === "string" ? row.status : "pending_review",
    price:          num(row.price) ?? 0,
    price_per_sqft: null,
    deposit_amount: null,
    area_sqft:      num(row.built_up_area) ?? 0,
    bedrooms:       num(row.bedrooms),
    bathrooms:      num(row.bathrooms),
    parking_spaces: null,
    floor_number:   num(row.floor_number),
    total_floors:   num(row.total_floors),
    year_built:     null,
    is_furnished:   row.furnishing != null && row.furnishing !== "unfurnished",
    address:        typeof row.address === "string" ? row.address : "",
    city:           typeof row.city === "string" ? row.city : "",
    neighbourhood:  typeof row.locality === "string" ? row.locality : null,
    state:          typeof row.state === "string" ? row.state : "",
    pincode:        typeof row.pincode === "string" ? row.pincode : null,
    images:         photos,
    amenities,
    facing:         typeof row.facing === "string" ? row.facing : null,
    vastu_compliant: amenities.some(a => a.toLowerCase().includes("vastu")),
    rera_number:    null,
    ownership_type: null,
    is_featured:    Boolean(row.is_featured),
    views:          num(row.views) ?? 0,
    saves:          0,
    created_at:     typeof row.created_at === "string"
      ? row.created_at
      : (typeof row.submitted_at === "string" ? row.submitted_at : new Date().toISOString()),
    video_url:      typeof row.video_url === "string" && row.video_url.trim() ? row.video_url : null,
    seller_email:    typeof row.seller_email === "string" ? row.seller_email : undefined,
    seller_name:     typeof row.seller_name === "string" ? row.seller_name : undefined,
    seller_phone:    typeof row.seller_phone === "string" ? row.seller_phone : undefined,
    seller_whatsapp: typeof row.seller_whatsapp === "string" ? row.seller_whatsapp : undefined,
  };
}

// ── Similar properties (active listings, same city → fall back to listing_type) ──
async function fetchSimilar(
  supabase: ReturnType<typeof createClient>,
  city: string,
  listingType: string,
  excludeId: string,
): Promise<Property[]> {
  const SELECT = "*";
  // Primary: same city
  const { data: byCity } = await supabase
    .from("property_listings")
    .select(SELECT)
    .eq("status", "active")
    .eq("city", city)
    .neq("id", excludeId)
    .limit(4);

  let rows = (byCity ?? []) as Record<string, unknown>[];

  // Fallback: top up with same listing_type when the city has too few
  if (rows.length < 4) {
    const haveIds = new Set(rows.map(r => String(r.id ?? "")));
    const { data: byType } = await supabase
      .from("property_listings")
      .select(SELECT)
      .eq("status", "active")
      .eq("listing_type", listingType)
      .neq("id", excludeId)
      .limit(8);
    for (const r of (byType ?? []) as Record<string, unknown>[]) {
      if (rows.length >= 4) break;
      if (!haveIds.has(String(r.id ?? ""))) { rows.push(r); haveIds.add(String(r.id ?? "")); }
    }
  }

  return rows.slice(0, 4).map(mapListingToProperty);
}

// ── Helpers ──────────────────────────────────────────────────
function formatPrice(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function calcEmi(principal: number, ratePercent: number, tenureYears: number): number {
  const r = ratePercent / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── Amenity icon map ─────────────────────────────────────────
const AMENITY_ICONS: Record<string, string> = {
  "Swimming Pool": "🏊", "Pool": "🏊", "Infinity Pool": "🏊", "Private Pool": "🏊", "Rooftop Pool": "🏊",
  "Gym": "🏋️", "Gymnasium": "🏋️",
  "Parking": "🅿️", "Covered Parking": "🅿️", "Valet Parking": "🅿️",
  "Security": "🛡️", "CCTV Security": "🛡️", "24/7 Security": "🛡️", "CCTV & Armed Security": "🛡️",
  "Garden": "🌿", "Landscaped Garden": "🌿",
  "Clubhouse": "🏛️", "Club House": "🏛️",
  "Elevator": "🛗", "Private Lift": "🛗",
  "Smart Home": "🏠", "Home Automation": "🏠", "Smart Home Automation": "🏠",
  "Power Backup": "⚡", "Solar Power": "⚡",
  "EV Charging": "🔋",
  "Home Theatre": "🎬",
  "Concierge": "🎩", "Concierge Service": "🎩",
  "Rooftop Deck": "🏙️", "Rooftop Lounge": "🏙️", "Rooftop Sky Deck": "🏙️",
  "Wine Cellar": "🍷",
  "Library": "📚",
  "Steam & Sauna": "♨️",
  "Children Play Area": "🎠",
  "Jogging Track": "🏃",
  "Badminton Court": "🏸",
  "Intercom": "📞",
  "Sky Lounge": "☁️",
  "Co-Working Space": "💻",
  "Puja Room": "🪔",
  "Staff Quarters": "🏘️",
  "Rainwater Harvesting": "💧",
};

function getAmenityIcon(name: string): string {
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "✦";
}

// ── Video embed parsing (YouTube / Vimeo) ─────────────────────
type VideoEmbed = { embedUrl: string; thumb: string | null };
function parseVideoUrl(url: string | null): VideoEmbed | null {
  if (!url) return null;
  const u = url.trim();
  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const id = yt[1];
    return { embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`, thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
  }
  // Vimeo: vimeo.com/{id}
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return { embedUrl: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`, thumb: null };
  }
  return null;
}

// ── Branded brochure (opened in a new window → print/save as PDF) ──
function buildBrochureHtml(p: Property): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const spec = (label: string, value: string | null) =>
    value ? `<tr><td class="k">${esc(label)}</td><td class="v">${esc(value)}</td></tr>` : "";
  const location = [p.address, p.neighbourhood, p.city, p.state, p.pincode].filter(Boolean).join(", ");
  const amenities = p.amenities?.length
    ? `<div class="section"><h2>Amenities &amp; Features</h2><div class="amenities">${p.amenities.map(a => `<span>${esc(a)}</span>`).join("")}</div></div>`
    : "";
  const contact = [
    p.seller_name ? `Contact: ${esc(p.seller_name)}` : "",
    p.seller_phone ? `Phone: ${esc(p.seller_phone)}` : "",
    p.seller_email ? `Email: ${esc(p.seller_email)}` : "",
  ].filter(Boolean).join(" &nbsp;·&nbsp; ") || "Contact Nilay 360 for details";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${esc(p.title)} — Nilay 360</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', Arial, sans-serif; color: #000000; background: #fff; padding: 48px; }
  .header { text-align: center; padding-bottom: 24px; border-bottom: 2px solid #2BA8E0; margin-bottom: 32px; }
  .brand { font-family: 'DM Sans', sans-serif; font-size: 26px; font-weight: 600; letter-spacing: 0.22em; color: #0B0D10; }
  .brand span { color: #2BA8E0; }
  .tagline { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6B7C72; margin-top: 6px; }
  h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 34px; font-weight: 600; color: #0B0D10; margin-bottom: 6px; }
  .price { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 30px; font-weight: 700; color: #2BA8E0; margin: 12px 0; }
  .loc { font-size: 14px; color: #6B7C72; margin-bottom: 24px; }
  .section { margin-bottom: 28px; }
  h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 600; color: #0B0D10; margin-bottom: 12px; border-left: 3px solid #2BA8E0; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 4px; font-size: 14px; border-bottom: 1px solid #eee; }
  td.k { color: #6B7C72; width: 45%; }
  td.v { color: #000000; font-weight: 600; }
  p.desc { font-size: 14px; line-height: 1.7; color: #374151; }
  .amenities { display: flex; flex-wrap: wrap; gap: 8px; }
  .amenities span { font-size: 12px; padding: 5px 12px; background: #000000; border: 1px solid rgba(201,168,76,0.3); border-radius: 100px; color: #0B0D10; }
  .footer { margin-top: 36px; padding-top: 20px; border-top: 2px solid #2BA8E0; text-align: center; font-size: 12px; color: #6B7C72; }
  .footer .contact { color: #0B0D10; font-weight: 600; margin-bottom: 6px; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
</style></head>
<body>
  <div class="header">
    <div class="brand">Nilay 360 <span>·</span></div>
    <div class="tagline">Premium Real Estate</div>
  </div>
  <h1>${esc(p.title)}</h1>
  <div class="price">${esc(formatPrice(p.price, p.listing_type))}</div>
  <div class="loc">${esc(location)}</div>
  <div class="section">
    <h2>Property Specifications</h2>
    <table>
      ${spec("Listing Type", p.listing_type === "rent" ? "For Rent" : "For Sale")}
      ${spec("Property Type", p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : null)}
      ${spec("Bedrooms", p.bedrooms != null ? `${p.bedrooms} BHK` : null)}
      ${spec("Bathrooms", p.bathrooms != null ? String(p.bathrooms) : null)}
      ${spec("Built-up Area", p.area_sqft ? `${p.area_sqft.toLocaleString("en-IN")} sqft` : null)}
      ${spec("Floor", p.floor_number != null ? `${p.floor_number}${p.total_floors ? ` of ${p.total_floors}` : ""}` : null)}
      ${spec("Facing", p.facing)}
      ${spec("Furnishing", p.is_furnished ? "Furnished" : "Unfurnished")}
    </table>
  </div>
  ${p.description ? `<div class="section"><h2>About This Property</h2><p class="desc">${esc(p.description)}</p></div>` : ""}
  ${amenities}
  <div class="footer">
    <div class="contact">${contact}</div>
    <div>Generated by Nilay 360 · nilay360.com · Details are indicative; please verify before transacting.</div>
  </div>
</body></html>`;
}

// ── Site-visit time slots ─────────────────────────────────────
const VISIT_SLOTS = [
  { id: "morning", label: "Morning (10am – 12pm)" },
  { id: "afternoon", label: "Afternoon (12pm – 3pm)" },
  { id: "evening", label: "Evening (3pm – 6pm)" },
] as const;

// ── Section heading ───────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 500, color: "#000000", lineHeight: 1.2, marginBottom: "8px" }}>{children}</h2>
      <div style={{ width: "36px", height: "2px", background: "#2BA8E0", borderRadius: "1px" }} />
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 2px 24px rgba(13,43,31,0.07)", border: "1px solid rgba(13,43,31,0.06)", marginBottom: "24px", ...style }}>
      {children}
    </div>
  );
}

// ── Small property card for similar ──────────────────────────
function SimilarCard({ p }: { p: Property }) {
  const img = p.images?.[0] || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80`;
  return (
    <a href={`/property/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.08)", boxShadow: "0 2px 16px rgba(13,43,31,0.06)", transition: "transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(-3px)"; d.style.boxShadow = "0 8px 32px rgba(13,43,31,0.14)"; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "translateY(0)"; d.style.boxShadow = "0 2px 16px rgba(13,43,31,0.06)"; }}
      >
        <div style={{ height: "160px", overflow: "hidden", position: "relative" }}>
          <img src={img} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", top: "10px", left: "10px", padding: "3px 9px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: p.listing_type === "rent" ? "rgba(45,106,79,0.9)" : "rgba(201,168,76,0.9)", color: p.listing_type === "rent" ? "#0B0D10" : "#000000" }}>
            {p.listing_type === "rent" ? "Rent" : "Sale"}
          </span>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 600, color: "#2BA8E0", marginBottom: "6px" }}>{formatPrice(p.price, p.listing_type)}</div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#000000", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
          <div style={{ fontSize: "11px", color: "#6B7C72" }}>{p.neighbourhood ? `${p.neighbourhood}, ` : ""}{p.city}</div>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(13,43,31,0.07)" }}>
            {[{ v: p.bedrooms, l: "Beds" }, { v: p.bathrooms, l: "Bath" }, { v: p.area_sqft?.toLocaleString("en-IN"), l: "sqft" }].map(s => s.v != null && (
              <div key={s.l} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#000000" }}>{s.v}</span>
                <span style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PropertyDetailClient() {
  const params = useParams();
  const slug = params?.slug as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [similar, setSimilar] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Gallery state
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsg, setContactMsg] = useState("I am interested in this property");
  const [contactFocus, setContactFocus] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // EMI calculator state
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  // Feature 1 — lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Feature 4 — video tour lazy load
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Feature 2 — schedule visit modal
  const { user, profile } = useAuth();
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitSlot, setVisitSlot] = useState<"morning" | "afternoon" | "evening">("morning");
  const [visitName, setVisitName] = useState("");
  const [visitPhone, setVisitPhone] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitDone, setVisitDone] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  const [prevProperty, setPrevProperty] = useState<{slug:string, title:string, price:number, images:string[]} | null>(null);
  const [nextProperty, setNextProperty] = useState<{slug:string, title:string, price:number, images:string[]} | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      const supabase = createClient();

      // 1) Try the seed/catalog properties table
      const { data, error } = await supabase.from("properties").select("*").eq("slug", slug).single();
      if (!error && data) {
        setProperty(data as Property);
        setSimilar(await fetchSimilar(supabase, data.city, data.listing_type, data.id));
        setLoading(false);
        return;
      }

      // 2) Fall back to a user-submitted listing
      const { data: listing, error: listingErr } = await supabase
        .from("property_listings")
        .select("*")
        .eq("slug", slug)
        .single();
      if (listingErr || !listing) { setNotFound(true); setLoading(false); return; }

      const row = listing as Record<string, unknown>;
      if (row.status !== "active") {
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email ?? null;
        if (!userEmail || userEmail !== row.seller_email) {
          setNotFound(true);
          setLoading(false);
          return;
        }
      }

      const mapped = mapListingToProperty(row);
      setProperty(mapped);
      setSimilar(await fetchSimilar(supabase, mapped.city, mapped.listing_type, mapped.id));
      setLoading(false);
    }
    load();
  }, [slug]);

  // Record this property in per-device "recently viewed" history
  const { addRecentlyViewed } = useRecentlyViewed();
  useEffect(() => {
    if (!property) return;
    addRecentlyViewed({
      id: property.id,
      slug: property.slug,
      title: property.title,
      city: property.city,
      price: property.price,
      listing_type: property.listing_type,
      image: property.images?.[0] ?? null,
    });
  }, [property, addRecentlyViewed]);

  useEffect(() => {
    if (!property) return;
    const fetchAdjacent = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('property_listings')
        .select('slug, title, price, images, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;

      const currentIndex = data.findIndex((p: any) => p.slug === property.slug);
      if (currentIndex === -1) return;

      setPrevProperty(currentIndex > 0 ? data[currentIndex - 1] : null);
      setNextProperty(currentIndex < data.length - 1 ? data[currentIndex + 1] : null);
    };
    fetchAdjacent();
  }, [property?.slug]);

  const emi = useMemo(() => {
    if (!property) return 0;
    const loan = property.price * (1 - downPct / 100);
    return calcEmi(loan, rate, tenure);
  }, [property, downPct, rate, tenure]);

  const loanAmount = property ? property.price * (1 - downPct / 100) : 0;
  const totalPayable = emi * tenure * 12;
  const totalInterest = totalPayable - loanAmount;

  const images = property?.images?.length
    ? property.images
    : [
        `https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80`,
        `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80`,
        `https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80`,
        `https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80`,
      ];

  const nextImg = useCallback(() => setActiveImg(i => (i + 1) % images.length), [images.length]);
  const prevImg = useCallback(() => setActiveImg(i => (i - 1 + images.length) % images.length), [images.length]);

  // Lightbox keyboard nav + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImg();
      else if (e.key === "ArrowLeft") prevImg();
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, nextImg, prevImg]);

  // Pre-fill the visit form from the logged-in user's profile when it opens
  useEffect(() => {
    if (!visitOpen) return;
    // Seeding form fields from the external auth/profile system on open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitName(prev => prev || profile?.full_name || "");
    setVisitPhone(prev => prev || profile?.phone || "");
  }, [visitOpen, profile]);

  const today = new Date().toISOString().split("T")[0];
  const video = useMemo(() => parseVideoUrl(property?.video_url ?? null), [property?.video_url]);

  async function submitVisit() {
    if (!property) return;
    if (!visitName.trim() || !visitPhone.trim()) { setVisitError("Name and phone are required"); return; }
    if (!visitDate) { setVisitError("Please choose a visit date"); return; }
    setVisitSubmitting(true);
    setVisitError(null);
    const slotLabel = VISIT_SLOTS.find(s => s.id === visitSlot)?.label ?? visitSlot;
    const supabase = createClient();
    const { error } = await supabase.from("site_visits").insert({
      property_id:     property.id,
      property_slug:   property.slug,
      property_title:  property.title,
      seller_email:    property.seller_email ?? null,
      visitor_name:    visitName,
      visitor_phone:   visitPhone,
      visit_date:      visitDate,
      visit_time_slot: slotLabel,
      status:          "pending",
    });
    setVisitSubmitting(false);
    if (error) {
      console.error("Site visit error:", error);
      setVisitError("Could not schedule. Please try again.");
      return;
    }
    setVisitDone(true);
    // Fire-and-forget seller notification — visit already saved
    fetch("/api/send-inquiry-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerEmail:   property.seller_email ?? null,
        sellerName:    property.seller_name ?? null,
        inquirerName:  visitName,
        inquirerEmail: user?.email ?? null,
        inquirerPhone: visitPhone,
        message:       `Site visit requested for ${visitDate} — ${slotLabel}.`,
        propertyTitle: property.title,
        inquiryType:   "site_visit",
      }),
    }).catch(err => console.error("Site visit email failed:", err));
  }

  function downloadBrochure() {
    if (!property) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(buildBrochureHtml(property));
    w.document.close();
  }

  function inputStyle(focused: boolean): React.CSSProperties {
    return {
      width: "100%", padding: "11px 14px",
      background: "#F8F6F1",
      border: focused ? "1.5px solid #2BA8E0" : "1.5px solid rgba(13,43,31,0.12)",
      borderRadius: "8px",
      fontSize: "13px", color: "#000000",
      fontFamily: "'DM Sans', sans-serif",
      outline: "none", transition: "border-color 0.15s",
      marginBottom: "12px",
    };
  }

  async function submitInquiry(inquiryType: "callback" | "viewing") {
    if (!property) return;
    if (!contactName || !contactEmail) { setContactError("Name and email are required"); return; }
    setContactSubmitting(true);
    setContactError(null);
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").insert({
      property_id:    property.id,
      property_slug:  property.slug,
      property_title: property.title,
      seller_email:   property.seller_email ?? null,
      inquirer_name:  contactName,
      inquirer_email: contactEmail,
      inquirer_phone: contactPhone || null,
      message:        contactMsg || null,
      inquiry_type:   inquiryType,
      status:         "new",
    });
    setContactSubmitting(false);
    if (error) {
      console.error("Inquiry error:", error);
      setContactError("Could not send. Please try again.");
    } else {
      setContactSent(true);
      // Fire-and-forget — inquiry already saved; email failure must not surface to user
      fetch("/api/send-inquiry-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerEmail:   property.seller_email ?? null,
          sellerName:    property.seller_name ?? null,
          inquirerName:  contactName,
          inquirerEmail: contactEmail,
          inquirerPhone: contactPhone || null,
          message:       contactMsg || null,
          propertyTitle: property.title,
          inquiryType,
        }),
      }).catch((err) => console.error("Inquiry email failed:", err));
    }
  }

  const handleInquiry = () => submitInquiry("callback");

  // WhatsApp number: prefer seller_whatsapp, fall back to seller_phone; normalise to 91 + 10 digits
  const waRaw = (property?.seller_whatsapp || property?.seller_phone || "").replace(/\D/g, "");
  const waNumber = waRaw ? (waRaw.length === 10 ? `91${waRaw}` : waRaw) : "";

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'DM Sans', sans-serif; background: #000000; } @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#000000", opacity: 0.4, animation: "pulse 1.6s ease-in-out infinite" }}>Loading property…</div>
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'DM Sans', sans-serif; background: #000000; }`}</style>
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ fontSize: "64px", opacity: 0.25 }}>⌂</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 300, color: "#000000" }}>Property Not Found</h1>
        <p style={{ fontSize: "14px", color: "#6B7C72" }}>This listing may have been removed or the URL is incorrect.</p>
        <a href="/properties" style={{ marginTop: "8px", padding: "12px 28px", background: "#2BA8E0", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>Browse Properties</a>
      </div>
    </>
  );

  if (!property) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; color: #000000; overflow-x: hidden; }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; background: rgba(13,43,31,0.12); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #2BA8E0; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
      `}</style>

      <div style={{ background: "#000000", minHeight: "100vh" }}>

        {/* ── NAV ── */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: "rgba(5,8,12,0.82)", backdropFilter: "blur(20px) saturate(180%)", borderBottom: "0.5px solid rgba(201,168,76,0.18)" }}>
          <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "19px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
            Nilay 360 <span style={{ color: "#2BA8E0", fontSize: "22px", lineHeight: 1 }}>·</span>
          </a>
          <div style={{ display: "flex", gap: "2px" }}>
            {[["Home", "/"], ["Properties", "/properties"], ["Agents", "/agents"], ["Blog", "/blog"]].map(([label, href]) => (
              <a key={label} href={href} style={{ padding: "7px 15px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>{label}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <a href="/login" style={{ padding: "8px 18px", borderRadius: "7px", border: "0.5px solid rgba(255,255,255,0.22)", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>Sign In</a>
            <a href="/register" style={{ padding: "8px 22px", borderRadius: "7px", background: "#2BA8E0", color: "#000000", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>List Property</a>
          </div>
        </nav>

        <div style={{ paddingTop: "68px" }}>

          {/* ── IMAGE GALLERY ── */}
          <div style={{ background: "#0a150f", position: "relative" }}>
            {/* Main image */}
            <div style={{ position: "relative", height: "520px", overflow: "hidden" }}>
              <img
                src={images[activeImg]}
                alt={property.title}
                onClick={() => setLightboxOpen(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.3s", cursor: "zoom-in" }}
              />
              {/* Dark overlay gradient */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)", pointerEvents: "none" }} />

              {/* View all photos */}
              <button
                onClick={() => setLightboxOpen(true)}
                style={{ position: "absolute", bottom: "100px", left: "24px", display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", backdropFilter: "blur(8px)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                View All {images.length} Photos
              </button>

              {/* Badges */}
              <div style={{ position: "absolute", top: "24px", left: "24px", display: "flex", gap: "8px" }}>
                <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: property.listing_type === "rent" ? "rgba(45,106,79,0.92)" : "rgba(201,168,76,0.92)", color: property.listing_type === "rent" ? "#0B0D10" : "#000000", backdropFilter: "blur(8px)" }}>
                  {property.listing_type === "rent" ? "For Rent" : "For Sale"}
                </span>
                {property.is_featured && (
                  <span style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(13,43,31,0.85)", color: "#2BA8E0", border: "1px solid rgba(201,168,76,0.5)", backdropFilter: "blur(8px)" }}>Premium</span>
                )}
              </div>

              {/* Share + Save */}
              <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { if (navigator.share) { navigator.share({ title: property.title, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); } }}
                  style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", backdropFilter: "blur(8px)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                  Share
                </button>
                <button
                  onClick={() => setSaved(s => !s)}
                  style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "8px", background: saved ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.12)", border: saved ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(255,255,255,0.2)", color: saved ? "#2BA8E0" : "#fff", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", backdropFilter: "blur(8px)", transition: "all 0.15s" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "#2BA8E0" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  {saved ? "Saved" : "Save"}
                </button>
              </div>

              {/* Image counter */}
              <div style={{ position: "absolute", bottom: "100px", right: "24px", padding: "5px 12px", borderRadius: "100px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "#fff", fontSize: "12px" }}>
                {activeImg + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnails */}
            <div style={{ display: "flex", gap: "4px", padding: "4px", background: "#0a150f" }}>
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{ flex: 1, height: "80px", overflow: "hidden", cursor: "pointer", opacity: activeImg === i ? 1 : 0.55, border: activeImg === i ? "2px solid #2BA8E0" : "2px solid transparent", borderRadius: "4px", transition: "opacity 0.15s, border-color 0.15s" }}
                >
                  <img src={img} alt={`View ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── BREADCRUMB ── */}
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px 48px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <a href="/" style={{ fontSize: "12px", color: "#6B7C72", textDecoration: "none" }}>Home</a>
              <span style={{ color: "#2BA8E0", fontSize: "10px" }}>›</span>
              <a href="/properties" style={{ fontSize: "12px", color: "#6B7C72", textDecoration: "none" }}>Properties</a>
              <span style={{ color: "#2BA8E0", fontSize: "10px" }}>›</span>
              <span style={{ fontSize: "12px", color: "#000000", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "300px" }}>{property.title}</span>
            </div>
          </div>

          {/* ── TWO COLUMN LAYOUT ── */}
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 48px 80px", display: "flex", gap: "28px", alignItems: "flex-start" }}>

            {/* ══ LEFT COLUMN ══ */}
            <div style={{ flex: "0 0 65%", minWidth: 0 }}>

              {/* ── PRICE & TITLE ── */}
              <Card>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 600, color: "#2BA8E0", lineHeight: 1 }}>
                        {formatPrice(property.price, property.listing_type)}
                      </span>
                      {property.price_per_sqft && property.listing_type !== "rent" && (
                        <span style={{ fontSize: "13px", color: "#6B7C72" }}>₹{property.price_per_sqft.toLocaleString("en-IN")}/sqft</span>
                      )}
                    </div>
                    {property.listing_type === "rent" && property.deposit_amount && (
                      <div style={{ fontSize: "12px", color: "#6B7C72", marginBottom: "4px" }}>
                        Deposit: {formatPrice(property.deposit_amount, "sale")}
                      </div>
                    )}
                  </div>
                  {property.rera_number && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "100px", background: "rgba(45,106,79,0.08)", border: "1px solid rgba(45,106,79,0.2)", fontSize: "11px", fontWeight: 600, color: "#0B0D10", letterSpacing: "0.06em" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0D10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      RERA: {property.rera_number}
                    </span>
                  )}
                </div>

                <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 500, color: "#000000", lineHeight: 1.2, marginBottom: "12px" }}>{property.title}</h1>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2BA8E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <span style={{ fontSize: "14px", color: "#6B7C72" }}>{property.address}{property.neighbourhood ? `, ${property.neighbourhood}` : ""}, {property.city}, {property.state}</span>
                </div>

                {/* Key specs grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "12px" }}>
                  {[
                    { icon: "🛏", label: "Bedrooms", value: property.bedrooms != null ? `${property.bedrooms} BHK` : null },
                    { icon: "🚿", label: "Bathrooms", value: property.bathrooms != null ? `${property.bathrooms} Bath` : null },
                    { icon: "⬛", label: "Area", value: property.area_sqft ? `${property.area_sqft.toLocaleString("en-IN")} sqft` : null },
                    { icon: "🏢", label: "Floor", value: property.floor_number != null ? `${property.floor_number}${property.total_floors ? ` of ${property.total_floors}` : ""}` : null },
                    { icon: "🚗", label: "Parking", value: property.parking_spaces != null ? `${property.parking_spaces} Car${property.parking_spaces !== 1 ? "s" : ""}` : null },
                    { icon: "📅", label: "Year Built", value: property.year_built ? `${property.year_built}` : null },
                    { icon: "🧭", label: "Facing", value: property.facing ?? null },
                    { icon: "🏠", label: "Ownership", value: property.ownership_type ?? null },
                  ].filter(s => s.value !== null).map(spec => (
                    <div key={spec.label} style={{ background: "#F8F6F1", borderRadius: "10px", padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "18px", marginBottom: "6px" }}>{spec.icon}</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#000000", marginBottom: "2px" }}>{spec.value}</div>
                      <div style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{spec.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── VIDEO TOUR ── */}
              {video && (
                <Card>
                  <SectionHeading>Video Tour</SectionHeading>
                  <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: "12px", overflow: "hidden", background: "#0a150f" }}>
                    {videoPlaying ? (
                      <iframe
                        src={video.embedUrl}
                        title={`${property.title} — video tour`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      />
                    ) : (
                      <button
                        onClick={() => setVideoPlaying(true)}
                        aria-label="Play video tour"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", padding: 0, background: video.thumb ? `center / cover no-repeat url(${video.thumb})` : "linear-gradient(135deg, #000000 0%, #0B0D10 100%)" }}
                      >
                        <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
                        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "72px", height: "72px", borderRadius: "50%", background: "rgba(201,168,76,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#000000" style={{ marginLeft: "4px" }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </span>
                      </button>
                    )}
                  </div>
                </Card>
              )}

              {/* ── DESCRIPTION ── */}
              <Card>
                <SectionHeading>About This Property</SectionHeading>
                {property.is_furnished && (
                  <span style={{ display: "inline-block", marginBottom: "16px", padding: "5px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#1577B8" }}>Fully Furnished</span>
                )}
                {!property.is_furnished && (
                  <span style={{ display: "inline-block", marginBottom: "16px", padding: "5px 14px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(13,43,31,0.05)", border: "1px solid rgba(13,43,31,0.1)", color: "#6B7C72" }}>Unfurnished</span>
                )}
                <p style={{ fontSize: "15px", lineHeight: 1.8, color: "#374151" }}>
                  {property.description || "No description available for this property."}
                </p>
                {property.vastu_compliant && (
                  <div style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12px", color: "#0B0D10", fontWeight: 500 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0D10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Vastu Compliant
                  </div>
                )}
              </Card>

              {/* ── AMENITIES ── */}
              {property.amenities?.length > 0 && (
                <Card>
                  <SectionHeading>Amenities & Features</SectionHeading>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {property.amenities.map(a => (
                      <div key={a} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "100px", background: "#F8F6F1", border: "1px solid rgba(13,43,31,0.08)", fontSize: "13px", color: "#374151", fontWeight: 500 }}>
                        <span style={{ fontSize: "15px" }}>{getAmenityIcon(a)}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── FLOOR PLAN ── */}
              <Card>
                <SectionHeading>Floor Plan</SectionHeading>
                <div style={{ border: "2px dashed rgba(13,43,31,0.12)", borderRadius: "12px", padding: "60px 24px", textAlign: "center", background: "#F8F6F1" }}>
                  <div style={{ fontSize: "40px", marginBottom: "14px", opacity: 0.3 }}>📐</div>
                  <div style={{ fontSize: "16px", fontWeight: 500, color: "#000000", marginBottom: "6px" }}>Floor Plan Available on Request</div>
                  <div style={{ fontSize: "13px", color: "#6B7C72" }}>Contact our property expert to receive the detailed floor plan.</div>
                </div>
              </Card>

              {/* ── EMI CALCULATOR ── */}
              {property.listing_type === "sale" && (
                <Card>
                  <SectionHeading>Calculate Your EMI</SectionHeading>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      {/* Property price display */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7C72", marginBottom: "8px" }}>Property Price</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 600, color: "#000000" }}>{formatPrice(property.price, "sale")}</div>
                      </div>

                      {/* Down payment */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7C72" }}>Down Payment</div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{downPct}% — {formatPrice(property.price * downPct / 100, "sale")}</div>
                        </div>
                        <input type="range" min={5} max={50} step={5} value={downPct} onChange={e => setDownPct(Number(e.target.value))} />
                      </div>

                      {/* Interest rate */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7C72" }}>Interest Rate (p.a.)</div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{rate}%</div>
                        </div>
                        <input type="range" min={6} max={15} step={0.5} value={rate} onChange={e => setRate(Number(e.target.value))} />
                      </div>

                      {/* Tenure */}
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7C72", marginBottom: "8px" }}>Loan Tenure</div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {[10, 15, 20, 25, 30].map(y => (
                            <button key={y} onClick={() => setTenure(y)} style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: tenure === y ? "#000000" : "#F8F6F1", border: tenure === y ? "none" : "1px solid rgba(13,43,31,0.12)", color: tenure === y ? "#fff" : "#374151", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}>{y}Y</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Results */}
                    <div style={{ background: "#000000", borderRadius: "12px", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,242,236,0.45)", marginBottom: "8px" }}>Monthly EMI</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "38px", fontWeight: 600, color: "#2BA8E0", lineHeight: 1 }}>
                          {formatPrice(Math.round(emi), "rent").replace("/mo", "")}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(245,242,236,0.35)", marginTop: "4px" }}>per month</div>
                      </div>
                      <div style={{ borderTop: "1px solid rgba(245,242,236,0.1)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[
                          { label: "Loan Amount", value: formatPrice(Math.round(loanAmount), "sale") },
                          { label: "Total Interest", value: formatPrice(Math.round(totalInterest), "sale") },
                          { label: "Total Payable", value: formatPrice(Math.round(totalPayable), "sale") },
                        ].map(row => (
                          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "rgba(245,242,236,0.45)" }}>{row.label}</span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* ── SIMILAR PROPERTIES ── */}
              {similar.length > 0 && (
                <Reveal>
                  <div style={{ marginBottom: "24px" }}>
                    <SectionHeading>Similar Properties</SectionHeading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                      {similar.map(p => <SimilarCard key={p.id} p={p} />)}
                    </div>
                  </div>
                </Reveal>
              )}

            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div style={{ flex: "0 0 35%", position: "sticky", top: "88px" }}>

              {/* ── CONTACT FORM ── */}
              <Card style={{ marginBottom: "20px" }}>
                {/* Agent header */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid rgba(13,43,31,0.08)" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #000000 0%, #121519 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", color: "#2BA8E0", fontWeight: 600 }}>N</span>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#000000" }}>Nilay 360 Expert</div>
                    <div style={{ fontSize: "12px", color: "#6B7C72" }}>Property Specialist</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      {"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#2BA8E0", fontSize: "10px" }}>{s}</span>)}
                      <span style={{ fontSize: "10px", color: "#6B7C72", marginLeft: "2px" }}>5.0</span>
                    </div>
                  </div>
                </div>

                {contactSent ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#000000", marginBottom: "6px" }}>Request Sent!</div>
                    <div style={{ fontSize: "13px", color: "#6B7C72" }}>Our expert will contact you shortly.</div>
                  </div>
                ) : (
                  <>
                    <input placeholder="Your Full Name" value={contactName} onChange={e => setContactName(e.target.value)} onFocus={() => setContactFocus("name")} onBlur={() => setContactFocus(null)} style={inputStyle(contactFocus === "name")} />
                    <input type="email" placeholder="Email Address" value={contactEmail} onChange={e => setContactEmail(e.target.value)} onFocus={() => setContactFocus("email")} onBlur={() => setContactFocus(null)} style={inputStyle(contactFocus === "email")} />
                    <div style={{ position: "relative", marginBottom: "12px" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#6B7C72", fontWeight: 500, pointerEvents: "none" }}>+91</span>
                      <input type="tel" placeholder="Phone Number" value={contactPhone} onChange={e => setContactPhone(e.target.value)} onFocus={() => setContactFocus("phone")} onBlur={() => setContactFocus(null)} style={{ ...inputStyle(contactFocus === "phone"), paddingLeft: "46px", marginBottom: 0 }} />
                    </div>
                    <textarea
                      placeholder="Message"
                      value={contactMsg}
                      onChange={e => setContactMsg(e.target.value)}
                      onFocus={() => setContactFocus("msg")}
                      onBlur={() => setContactFocus(null)}
                      rows={3}
                      style={{ width: "100%", padding: "11px 14px", background: "#F8F6F1", border: contactFocus === "msg" ? "1.5px solid #2BA8E0" : "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", marginBottom: "14px" }}
                    />

                    {/* Error */}
                    {contactError && (
                      <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "8px", color: "#B91C1C", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                        {contactError}
                      </div>
                    )}

                    {/* Buttons */}
                    <button
                      onClick={handleInquiry}
                      disabled={contactSubmitting}
                      style={{ width: "100%", padding: "13px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: contactSubmitting ? "not-allowed" : "pointer", opacity: contactSubmitting ? 0.65 : 1, fontFamily: "'DM Sans', sans-serif", marginBottom: "10px" }}
                    >{contactSubmitting ? "Sending…" : "Request Callback"}</button>

                    {waNumber && (
                      <a
                        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I'm interested in the property: ${property.title} (${property.city}). Price: ${formatPrice(property.price, property.listing_type)}. Link: ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "13px", background: "#25D366", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", marginBottom: "10px" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.107 1.504 5.837L.057 23.882l6.233-1.634C7.891 23.221 9.904 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.643-.51-5.148-1.397l-.368-.219-3.824 1.003 1.022-3.731-.239-.38C2.51 15.67 2 13.895 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                        WhatsApp Owner
                      </a>
                    )}

                    <button
                      onClick={() => { setVisitError(null); setVisitOpen(true); }}
                      style={{ width: "100%", padding: "13px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.2)", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      Schedule Visit
                    </button>
                  </>
                )}
              </Card>

              {/* ── DOWNLOAD BROCHURE ── */}
              <button
                onClick={downloadBrochure}
                style={{ width: "100%", padding: "13px", background: "#000000", border: "none", borderRadius: "8px", color: "#2BA8E0", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Brochure
              </button>

              {/* ── QUICK FACTS ── */}
              <Card>
                <SectionHeading>Quick Facts</SectionHeading>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "Listed On", value: formatDate(property.created_at) },
                    { label: "Property ID", value: property.id.slice(0, 8).toUpperCase() },
                    { label: "Views", value: property.views?.toLocaleString("en-IN") ?? "0" },
                    { label: "Property Type", value: property.type.charAt(0).toUpperCase() + property.type.slice(1) },
                    { label: "Status", value: property.status.charAt(0).toUpperCase() + property.status.slice(1) },
                    ...(property.pincode ? [{ label: "Pincode", value: property.pincode }] : []),
                  ].map(fact => (
                    <div key={fact.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
                      <span style={{ fontSize: "12px", color: "#6B7C72" }}>{fact.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#000000" }}>{fact.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </div>

          {(prevProperty || nextProperty) && (
            <div style={{
              maxWidth: 1280, margin: "0 auto", padding: "48px 40px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16
            }}>
              {/* Previous */}
              {prevProperty ? (
                <a href={`/property/${prevProperty.slug}`} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#161A1F", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: 20, textDecoration: "none",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(43,168,224,0.3)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                  <div style={{fontSize: 24, color: "rgba(255,255,255,0.3)"}}>←</div>
                  <div style={{overflow: "hidden", flex: 1}}>
                    <div style={{fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em"}}>Previous Property</div>
                    <div style={{fontSize: 15, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Cormorant Garamond',serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{prevProperty.title}</div>
                    <div style={{fontSize: 13, color: "#2BA8E0", marginTop: 4, fontWeight: 600}}>₹{(prevProperty.price / 10000000).toFixed(1)} Cr</div>
                  </div>
                  {prevProperty.images?.[0] && (
                    <div style={{width: 64, height: 64, borderRadius: 10, backgroundImage: `url(${prevProperty.images[0]})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0}} />
                  )}
                </a>
              ) : <div />}

              {/* Next */}
              {nextProperty ? (
                <a href={`/property/${nextProperty.slug}`} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: "#161A1F", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: 20, textDecoration: "none",
                  transition: "all 0.3s ease", justifyContent: "flex-end"
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = "rgba(43,168,224,0.3)")}
                onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}>
                  {nextProperty.images?.[0] && (
                    <div style={{width: 64, height: 64, borderRadius: 10, backgroundImage: `url(${nextProperty.images[0]})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0}} />
                  )}
                  <div style={{overflow: "hidden", flex: 1, textAlign: "right"}}>
                    <div style={{fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em"}}>Next Property</div>
                    <div style={{fontSize: 15, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Cormorant Garamond',serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{nextProperty.title}</div>
                    <div style={{fontSize: 13, color: "#2BA8E0", marginTop: 4, fontWeight: 600}}>₹{(nextProperty.price / 10000000).toFixed(1)} Cr</div>
                  </div>
                  <div style={{fontSize: 24, color: "rgba(255,255,255,0.3)"}}>→</div>
                </a>
              ) : <div />}
            </div>
          )}

        </div>
      </div>

      {/* ── LIGHTBOX (Feature 1) ── */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <style>{`@keyframes lbFade { from { opacity: 0; } to { opacity: 1; } }`}</style>

          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close gallery"
            style={{ position: "absolute", top: "24px", right: "24px", width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImg(); }}
              aria-label="Previous photo"
              style={{ position: "absolute", left: "24px", top: "50%", transform: "translateY(-50%)", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}

          <img
            key={activeImg}
            src={images[activeImg]}
            alt={`${property.title} — photo ${activeImg + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "86vw", maxHeight: "82vh", objectFit: "contain", borderRadius: "6px", animation: "lbFade 0.25s ease" }}
          />

          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImg(); }}
              aria-label="Next photo"
              style={{ position: "absolute", right: "24px", top: "50%", transform: "translateY(-50%)", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          <div style={{ position: "absolute", bottom: "28px", left: "50%", transform: "translateX(-50%)", padding: "6px 16px", borderRadius: "100px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em" }}>
            {activeImg + 1} / {images.length}
          </div>
        </div>
      )}

      {/* ── SCHEDULE VISIT MODAL (Feature 2) ── */}
      {visitOpen && (
        <div
          onClick={() => { setVisitOpen(false); setVisitDone(false); setVisitError(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,12,9,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", maxWidth: "440px", width: "100%", padding: "32px", boxShadow: "0 30px 80px rgba(0,0,0,0.4)", position: "relative" }}
          >
            <button
              onClick={() => { setVisitOpen(false); setVisitDone(false); setVisitError(null); }}
              aria-label="Close"
              style={{ position: "absolute", top: "18px", right: "18px", background: "transparent", border: "none", cursor: "pointer", color: "#6B7C72", padding: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {visitDone ? (
              <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📅</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 600, color: "#000000", marginBottom: "8px" }}>Visit Scheduled!</h3>
                <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.6 }}>The seller will confirm your appointment.</p>
                <button
                  onClick={() => { setVisitOpen(false); setVisitDone(false); }}
                  style={{ marginTop: "22px", padding: "11px 28px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >Done</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 600, color: "#000000", marginBottom: "4px" }}>Schedule a Site Visit</h3>
                <p style={{ fontSize: "13px", color: "#6B7C72", marginBottom: "22px" }}>{property.title}</p>

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#000000", marginBottom: "6px" }}>Preferred Date</label>
                <input
                  type="date" value={visitDate} min={today}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: "18px" }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#000000", marginBottom: "8px" }}>Time Slot</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
                  {VISIT_SLOTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setVisitSlot(s.id)}
                      style={{ padding: "11px 14px", borderRadius: "8px", textAlign: "left", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", border: visitSlot === s.id ? "1.5px solid #2BA8E0" : "1.5px solid rgba(13,43,31,0.12)", background: visitSlot === s.id ? "rgba(201,168,76,0.1)" : "#F8F6F1", color: visitSlot === s.id ? "#1577B8" : "#374151" }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#000000", marginBottom: "6px" }}>Your Name</label>
                <input
                  type="text" value={visitName} placeholder="Full name"
                  onChange={(e) => setVisitName(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: "14px" }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#000000", marginBottom: "6px" }}>Phone Number</label>
                <input
                  type="tel" value={visitPhone} placeholder="10-digit mobile"
                  onChange={(e) => setVisitPhone(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", color: "#000000", fontFamily: "'DM Sans', sans-serif", outline: "none", marginBottom: "18px" }}
                />

                {visitError && (
                  <div style={{ marginBottom: "14px", padding: "10px 14px", background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.25)", borderRadius: "8px", color: "#B91C1C", fontSize: "12px" }}>
                    {visitError}
                  </div>
                )}

                <button
                  onClick={submitVisit}
                  disabled={visitSubmitting}
                  style={{ width: "100%", padding: "13px", background: "#2BA8E0", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: visitSubmitting ? "not-allowed" : "pointer", opacity: visitSubmitting ? 0.65 : 1, fontFamily: "'DM Sans', sans-serif" }}
                >{visitSubmitting ? "Scheduling…" : "Confirm Visit"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
