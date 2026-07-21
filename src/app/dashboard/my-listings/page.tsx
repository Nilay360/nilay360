"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { MyListingsList } from "@/components/dashboard/MyListingsList";
import type { Listing } from "@/components/dashboard/MyListingsList";

const G = { ivory: "#020C1C", gold: "#10C4C3" };

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [email,    setEmail]    = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const userEmail = data.session?.user?.email ?? null;
      const userId    = data.session?.user?.id    ?? null;
      setEmail(userEmail);
      if (!userEmail && !userId) { setLoading(false); return; }
      const filter = userId && userEmail
        ? `seller_email.eq.${userEmail},user_id.eq.${userId}`
        : userEmail ? `seller_email.eq.${userEmail}` : `user_id.eq.${userId}`;
      supabase
        .from("property_listings")
        .select("id, title, city, property_category, listing_type, price, status, submitted_at, slug, photo_urls")
        .or(filter)
        .order("submitted_at", { ascending: false })
        .then(({ data: rows }: { data: Listing[] | null }) => {
          setListings(rows ?? []);
          setLoading(false);
        });
    });
  }, []);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").delete().eq("id", id);
    if (!error) setListings(prev => prev.filter(l => l.id !== id));
    else alert("Failed to delete. Please try again.");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  if (!email) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#FFFFFF", fontFamily: "'Cal Sans', sans-serif", fontSize: 16 }}>Please sign in to view your listings.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "'Cal Sans', sans-serif", textDecoration: "none" }}>Sign In →</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: "'Cal Sans', Georgia, serif",
              fontSize: 34, fontWeight: 600, color: "#FFFFFF",
              margin: 0, lineHeight: 1.15,
            }}>
              My Listings
            </h1>
            <p style={{ color: "#A9B4C2", fontFamily: "'Cal Sans', sans-serif", fontSize: 14, margin: "6px 0 0" }}>
              {listings.length} {listings.length === 1 ? "property" : "properties"} · {email}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 500,
                color: "#FFFFFF", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                cursor: "pointer", fontFamily: "'Cal Sans', sans-serif",
              }}>← Dashboard</button>
            </Link>
            <Link href="/post-property" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#020C1C", background: G.gold,
                border: "none", borderRadius: 999,
                boxShadow: "0 10px 30px rgba(30,167,255,.35)",
                cursor: "pointer", fontFamily: "'Cal Sans', sans-serif",
              }}>+ New Listing</button>
            </Link>
          </div>
        </div>

        <MyListingsList listings={listings} onDelete={handleDelete} />

      </div>
    </div>
  );
}
