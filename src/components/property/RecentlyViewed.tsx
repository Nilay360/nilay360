"use client";
import Reveal from "@/components/ui/Reveal";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { optimizedImageUrl } from "@/lib/image-url";

const G = { dark: "#020C1C", gold: "#10C4C3" };

function fmt(price: number, listingType: string): string {
  if (listingType === "rent") {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L/mo`;
    return `₹${(price / 1000).toFixed(0)}K/mo`;
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

// Horizontal strip of the user's recently viewed properties.
// Renders nothing when there is no history. `theme` adapts colours
// for light (ivory) vs dark (green) page backgrounds.
export default function RecentlyViewed({ theme = "light" }: { theme?: "light" | "dark" }) {
  const { recentlyViewed } = useRecentlyViewed();
  if (recentlyViewed.length === 0) return null;

  const dark = theme === "dark";
  const titleColor = dark ? "#020C1C" : G.dark;
  const cardBg = dark ? "rgba(245,242,236,0.04)" : "#fff";
  const cardBorder = dark ? "1px solid rgba(245,242,236,0.08)" : "1px solid rgba(13,43,31,0.08)";
  const subColor = dark ? "rgba(245,242,236,0.5)" : "#6B7C72";

  return (
    <Reveal>
      <section style={{ maxWidth: "1400px", margin: "0 auto", padding: "8px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <div style={{ width: "24px", height: "1.5px", background: G.gold }} />
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: G.gold, textTransform: "uppercase" }}>Recently Viewed</span>
        </div>
        <div className="rv-scroll" style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "6px" }}>
          {recentlyViewed.map(p => {
            const img = p.image || `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80`;
            return (
              <a key={p.id} href={`/property/${p.slug}`} style={{ textDecoration: "none", flex: "0 0 220px", width: "220px", background: cardBg, border: cardBorder, borderRadius: "14px", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(-3px)"; d.style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)"; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLElement; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}>
                <div style={{ height: "120px", overflow: "hidden" }}>
                  <img src={optimizedImageUrl(img, 400)} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontFamily: "'Cal Sans', Georgia, serif", fontSize: "16px", fontWeight: 600, color: G.gold, marginBottom: "4px" }}>{fmt(p.price, p.listing_type)}</div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                  <div style={{ fontSize: "11px", color: subColor, marginTop: "2px" }}>{p.city}</div>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
