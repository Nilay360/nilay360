"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveStats } from "@/lib/liveStats";

// ── Types ─────────────────────────────────────────────────────
type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  published_at: string | null;
  read_time_mins: number | null;
  views: number;
  author?: { full_name: string; avatar_url: string | null };
};

type Category = {
  id: string;
  name: string;
  slug: string;
  post_count: number;
};

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function catName(catId: string | null, cats: Category[]): string {
  if (!catId) return "General";
  const found = cats.find(c => c.id === catId || c.slug === catId);
  return found?.name ?? catId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function initials(name: string): string {
  const p = name.trim().split(" ");
  return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2).toUpperCase();
}

// ── Skeleton ──────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)" }}>
      <div style={{ height: "200px", background: "#F0EDE7", animation: "pulse 1.6s ease-in-out infinite" }} />
      <div style={{ padding: "20px" }}>
        {[40, 80, 65, 50].map((w, i) => (
          <div key={i} style={{ height: "10px", borderRadius: "5px", background: "#F0EDE7", width: `${w}%`, marginBottom: "10px", animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Article card ──────────────────────────────────────────────
function ArticleCard({ post, cats }: { post: Post; cats: Category[] }) {
  const img = post.featured_image || `https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=1200&q=80`;
  const [hover, setHover] = useState(false);
  return (
    <a href={`/blog/${post.slug}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(13,43,31,0.07)", boxShadow: hover ? "0 16px 48px rgba(13,43,31,0.12)" : "0 1px 6px rgba(13,43,31,0.05)", transform: hover ? "translateY(-4px)" : "translateY(0)", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ height: "210px", overflow: "hidden", position: "relative", background: "#F0EDE7" }}>
        <img src={img} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform 0.35s" }} />
        <span style={{ position: "absolute", top: "14px", left: "14px", padding: "4px 11px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(201,168,76,0.92)", color: "#020C1C", backdropFilter: "blur(6px)" }}>
          {catName(post.category_id, cats)}
        </span>
      </div>
      <div style={{ padding: "20px 22px 22px" }}>
        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#020C1C", lineHeight: 1.35, marginBottom: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.title}</h3>
        {post.excerpt && <p style={{ fontSize: "13px", color: "#6B7C72", lineHeight: 1.65, marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.excerpt}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(13,43,31,0.06)", paddingTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {post.author ? (
              post.author.avatar_url
                ? <img src={post.author.avatar_url} alt={post.author.full_name} style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#10C4C3" }}>{initials(post.author.full_name)}</div>
            ) : null}
            <span style={{ fontSize: "11px", color: "#6B7C72", fontWeight: 500 }}>{post.author?.full_name ?? "Nilay 360 Editorial"}</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{fmtDate(post.published_at)}</span>
            {post.read_time_mins && <span style={{ fontSize: "10px", color: "#10C4C3", fontWeight: 600, letterSpacing: "0.06em" }}>{post.read_time_mins} min</span>}
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function BlogPage() {
  const liveStats = useLiveStats();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [{ data: postsData }, { data: catsData }] = await Promise.all([
          supabase.from("blog_posts").select("*, author:profiles(full_name, avatar_url)").eq("is_published", true).order("published_at", { ascending: false }),
          supabase.from("blog_categories").select("*").order("name"),
        ]);
        setPosts((postsData ?? []) as Post[]);
        setCats((catsData ?? []) as Category[]);
      } catch {
        setPosts([]);
        setCats([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...posts];
    if (activeCat !== "all") list = list.filter(p => p.category_id === activeCat || cats.find(c => c.id === activeCat)?.slug === p.category_id);
    if (search) list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt ?? "").toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [posts, activeCat, search, cats]);

  const featured = posts.find(p => p.is_featured) ?? posts[0] ?? null;
  const gridPosts = filtered.filter(p => p.id !== featured?.id || activeCat !== "all" || search);
  const visiblePosts = gridPosts.slice(0, page * PAGE_SIZE);
  const hasMore = visiblePosts.length < gridPosts.length;

  const TRENDING = ["Jubilee Hills apartments", "3BHK Kokapet rent", "Banjara Hills villas", "Gachibowli investment", "NRI property buying"];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        .cat-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .bl-featured-outer { padding: 0 16px !important; }
          .bl-featured-inner { padding: 28px 20px !important; }
          .bl-categories { padding: 0 16px !important; }
          .bl-layout { flex-direction: column !important; padding: 32px 16px 60px !important; gap: 24px !important; }
          .bl-articles { flex: none !important; width: 100% !important; }
          .bl-sidebar { flex: none !important; width: 100% !important; position: static !important; top: auto !important; }
          .bl-footer { padding: 32px 16px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── HERO ── */}
        <section style={{ paddingTop: "64px", background: "#020C1C", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 80% 110%, rgba(201,168,76,0.1) 0%, transparent 55%), radial-gradient(ellipse 50% 60% at 10% -5%, rgba(45,106,79,0.28) 0%, transparent 50%)" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "760px", margin: "0 auto", padding: "72px 24px 80px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "22px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10C4C3" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>Market Intelligence</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(42px, 6vw, 68px)", fontWeight: 300, lineHeight: 1.12, color: "#FFFFFF", marginBottom: "18px" }}>
              Property Insights<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>& Guides</em>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.55)", lineHeight: 1.75, marginBottom: "36px", maxWidth: "520px", margin: "0 auto 36px" }}>
              Expert analysis, market trends, and buying guides for India's premium real estate market.
            </p>
            {/* Search */}
            <div style={{ display: "flex", maxWidth: "520px", margin: "0 auto", position: "relative" }}>
              <input
                type="text"
                placeholder="Search articles — market trends, investment, Jubilee Hills…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
                style={{ flex: 1, padding: "14px 56px 14px 20px", background: "rgba(245,242,236,0.07)", border: "1px solid rgba(245,242,236,0.18)", borderRadius: "10px 0 0 10px", color: "#020C1C", fontSize: "13px", fontFamily: "var(--font-body-new)", outline: "none" }}
              />
              <button onClick={() => { setSearch(searchInput); setPage(1); }} style={{ padding: "0 24px", background: "#10C4C3", border: "none", borderRadius: "0 10px 10px 0", color: "#020C1C", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", gap: "7px", whiteSpace: "nowrap" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                Search
              </button>
            </div>
            {search && (
              <button onClick={() => { setSearch(""); setSearchInput(""); }} style={{ marginTop: "14px", fontSize: "12px", color: "rgba(201,168,76,0.7)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "14px" }}>×</span> Clear search: "{search}"
              </button>
            )}
          </div>
        </section>

        {/* ── FEATURED ARTICLE ── */}
        {!search && activeCat === "all" && featured && (
          <section style={{ background: "#020C1C", paddingBottom: "0" }}>
            <div className="bl-featured-outer" style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 48px 0" }}>
              <div style={{ position: "relative", borderRadius: "18px 18px 0 0", overflow: "hidden", minHeight: "480px", display: "flex", alignItems: "flex-end" }}>
                <img
                  src={featured.featured_image || `https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=1400&q=80`}
                  alt={featured.title}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,8,12,0.95) 0%, rgba(5,8,12,0.55) 50%, rgba(5,8,12,0.15) 100%)" }} />
                <div className="bl-featured-inner" style={{ position: "relative", zIndex: 2, padding: "52px 56px", maxWidth: "680px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "18px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "#10C4C3", color: "#020C1C" }}>
                      {catName(featured.category_id, cats)}
                    </span>
                    <span style={{ fontSize: "11px", color: "rgba(245,242,236,0.45)" }}>Featured</span>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 500, color: "#020C1C", lineHeight: 1.2, marginBottom: "16px" }}>{featured.title}</h2>
                  {featured.excerpt && <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.6)", lineHeight: 1.7, marginBottom: "28px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{featured.excerpt}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <a href={`/blog/${featured.slug}`} style={{ padding: "12px 28px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      Read Article
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </a>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {featured.author?.avatar_url
                        ? <img src={featured.author.avatar_url} alt={featured.author.full_name} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                        : <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#10C4C3", fontWeight: 700 }}>{initials(featured.author?.full_name ?? "NE")}</div>
                      }
                      <div>
                        <div style={{ fontSize: "12px", color: "#020C1C", fontWeight: 500 }}>{featured.author?.full_name ?? "Nilay 360 Editorial"}</div>
                        <div style={{ fontSize: "10px", color: "rgba(245,242,236,0.45)" }}>{fmtDate(featured.published_at)}{featured.read_time_mins ? ` · ${featured.read_time_mins} min read` : ""}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── CATEGORIES ROW ── */}
        <section style={{ background: "#020C1C", position: "sticky", top: "68px", zIndex: 100, borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="bl-categories" style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 48px" }}>
            <div className="cat-scroll" style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "16px 0", scrollbarWidth: "none" }}>
              {[{ id: "all", name: "All Articles" }, ...cats].map(c => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCat(c.id); setPage(1); }}
                  style={{ padding: "8px 18px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", background: activeCat === c.id ? "#10C4C3" : "rgba(245,242,236,0.07)", border: activeCat === c.id ? "none" : "1px solid rgba(245,242,236,0.12)", color: activeCat === c.id ? "#020C1C" : "rgba(245,242,236,0.5)", cursor: "pointer", fontFamily: "var(--font-body-new)", transition: "all 0.15s", flexShrink: 0 }}
                >{c.name}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ── CONTENT + SIDEBAR ── */}
        <section className="bl-layout" style={{ maxWidth: "1320px", margin: "0 auto", padding: "48px 48px 80px", display: "flex", gap: "32px", alignItems: "flex-start" }}>

          {/* ── ARTICLES GRID ── */}
          <div className="bl-articles" style={{ flex: "0 0 calc(70% - 16px)", minWidth: 0 }}>
            {/* Result count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              {loading ? (
                <div style={{ height: "16px", width: "180px", borderRadius: "5px", background: "#E8E4DC", animation: "pulse 1.6s ease-in-out infinite" }} />
              ) : (
                <span style={{ fontSize: "13px", color: "#6B7C72" }}>
                  <span style={{ fontFamily: "var(--font-support-new)", fontSize: "22px", fontWeight: 600, color: "#020C1C", marginRight: "5px" }}>{gridPosts.length}</span>
                  {search ? `results for "${search}"` : activeCat !== "all" ? `articles in ${catName(activeCat, cats)}` : "articles"}
                </span>
              )}
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "22px", animation: "fadeUp 0.22s ease-out" }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                : visiblePosts.length === 0
                  ? (
                    <div style={{ gridColumn: "1 / -1", padding: "80px 0", textAlign: "center" }}>
                      <div style={{ fontSize: "40px", opacity: 0.2, marginBottom: "14px" }}>📝</div>
                      {posts.length === 0 ? (
                        <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 400, color: "#020C1C", marginBottom: "8px" }}>No articles published yet</h3>
                      ) : (
                        <>
                          <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 400, color: "#020C1C", marginBottom: "8px" }}>No articles found</h3>
                          <p style={{ fontSize: "13px", color: "#6B7C72" }}>Try a different category or clear your search.</p>
                          <button onClick={() => { setActiveCat("all"); setSearch(""); setSearchInput(""); }} style={{ marginTop: "18px", padding: "10px 24px", background: "#020C1C", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Show All Articles</button>
                        </>
                      )}
                    </div>
                  )
                  : visiblePosts.map(post => <ArticleCard key={post.id} post={post} cats={cats} />)
              }
            </div>

            {/* Load more */}
            {!loading && hasMore && (
              <div style={{ textAlign: "center", marginTop: "48px" }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: "13px 40px", background: "transparent", border: "2px solid rgba(13,43,31,0.2)", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)", display: "inline-flex", alignItems: "center", gap: "10px", transition: "all 0.18s" }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "#020C1C"; b.style.color = "#020C1C"; }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "transparent"; b.style.color = "#020C1C"; }}
                >
                  Load More Articles
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <p style={{ marginTop: "12px", fontSize: "12px", color: "#9CA3AF" }}>Showing {visiblePosts.length} of {gridPosts.length} articles</p>
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="bl-sidebar" style={{ flex: "0 0 calc(30% - 16px)", position: "sticky", top: "136px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Market snapshot */}
            <div style={{ background: "#020C1C", borderRadius: "14px", padding: "26px", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10C4C3" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", color: "#10C4C3", textTransform: "uppercase" }}>Market Snapshot</span>
                </div>
                {liveStats.avgSalePricePerSqft !== null ? (
                  <>
                    <p style={{ fontSize: "10px", color: "rgba(245,242,236,0.3)", marginBottom: "18px", letterSpacing: "0.05em" }}>AVG SALE PRICE — HYDERABAD</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(245,242,236,0.07)" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginBottom: "2px" }}>Hyderabad</div>
                        <div style={{ fontFamily: "var(--font-support-new)", fontSize: "17px", fontWeight: 500, color: "#10C4C3" }}>₹{liveStats.avgSalePricePerSqft.toLocaleString("en-IN")}/sqft</div>
                      </div>
                    </div>
                    <p style={{ fontSize: "10px", color: "rgba(245,242,236,0.3)", marginTop: "10px" }}>Based on {liveStats.avgSalePriceSampleSize} active sale listing{liveStats.avgSalePriceSampleSize === 1 ? "" : "s"} — not a market index.</p>
                  </>
                ) : (
                  <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.4)", padding: "8px 0" }}>Not enough listings yet for a price snapshot.</p>
                )}
                <a href="/search" style={{ display: "block", marginTop: "18px", padding: "10px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#10C4C3", textDecoration: "none", letterSpacing: "0.06em" }}>
                  Explore Properties →
                </a>
              </div>
            </div>

            {/* Trending searches */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#020C1C", marginBottom: "16px" }}>Trending Searches</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {TRENDING.map((t, i) => (
                  <a key={t} href={`/search?q=${encodeURIComponent(t)}`} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < TRENDING.length - 1 ? "1px solid rgba(13,43,31,0.06)" : "none", textDecoration: "none" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#10C4C3", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{t}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#020C1C", marginBottom: "6px" }}>Market Updates</h4>
              <p style={{ fontSize: "12px", color: "#6B7C72", lineHeight: 1.6, marginBottom: "16px" }}>Weekly property insights, price movements, and new listings delivered to your inbox.</p>
              {subscribed ? (
                <div style={{ padding: "14px", background: "rgba(45,106,79,0.07)", border: "1px solid rgba(45,106,79,0.18)", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", marginBottom: "4px" }}>✓</div>
                  <p style={{ fontSize: "13px", color: "#111F33", fontWeight: 600 }}>You're subscribed!</p>
                  <p style={{ fontSize: "11px", color: "#6B7C72", marginTop: "2px" }}>Check your inbox to confirm.</p>
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: "#F8F6F1", border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "8px", fontSize: "13px", color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none", marginBottom: "10px" }}
                  />
                  <button
                    onClick={() => { if (email.includes("@")) setSubscribed(true); }}
                    style={{ width: "100%", padding: "11px", background: "#10C4C3", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-body-new)" }}
                  >Subscribe</button>
                  <p style={{ fontSize: "10px", color: "#9CA3AF", textAlign: "center", marginTop: "8px" }}>No spam. Unsubscribe anytime.</p>
                </>
              )}
            </div>

            {/* Categories list */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#020C1C", marginBottom: "16px" }}>Browse Topics</h4>
              {cats.map(c => (
                <button key={c.id} onClick={() => { setActiveCat(c.id); setPage(1); window.scrollTo({ top: 400, behavior: "smooth" }); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", background: "transparent", border: "none", borderBottom: "1px solid rgba(13,43,31,0.06)", cursor: "pointer", fontFamily: "var(--font-body-new)" }}>
                  <span style={{ fontSize: "13px", color: activeCat === c.id ? "#10C4C3" : "#374151", fontWeight: activeCat === c.id ? 600 : 400 }}>{c.name}</span>
                  {c.post_count > 0 && <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{c.post_count}</span>}
                </button>
              ))}
            </div>
          </aside>
        </section>

        {/* ── FOOTER BAND ── */}
        <div className="bl-footer" style={{ background: "#020C1C", borderTop: "1px solid rgba(201,168,76,0.12)", padding: "32px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <span style={{ fontFamily: "var(--font-support-new)", fontSize: "14px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em" }}>Nilay 360 <span style={{ color: "#10C4C3" }}>·</span></span>
          <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.3)" }}>© 2025 Nilay 360. Premium Real Estate Intelligence.</p>
          <div style={{ display: "flex", gap: "20px" }}>
            {[["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Contact","/contact"]].map(([l,h]) => (
              <a key={l} href={h} style={{ fontSize: "12px", color: "rgba(245,242,236,0.35)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
