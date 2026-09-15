"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { MyListingsList } from "@/components/dashboard/MyListingsList";
import type { Listing } from "@/components/dashboard/MyListingsList";

const G = { ivory: "#020C1C", gold: "#10C4C3" };

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [email,    setEmail]    = useState<string | null>(null);
  const [userId,   setUserId]   = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      const userEmail = data.session?.user?.email ?? null;
      const sessionUserId = data.session?.user?.id ?? null;
      setEmail(userEmail);
      setUserId(sessionUserId);
      if (!userEmail && !sessionUserId) { setLoading(false); return; }
      const filter = sessionUserId && userEmail
        ? `seller_email.eq.${userEmail},user_id.eq.${sessionUserId}`
        : userEmail ? `seller_email.eq.${userEmail}` : `user_id.eq.${sessionUserId}`;
      const { data: rows } = await supabase
        .from("property_listings")
        .select("id, title, city, property_category, listing_type, price, status, submitted_at, slug, photo_urls")
        .or(filter)
        .order("submitted_at", { ascending: false });

      const baseListings = (rows ?? []) as Listing[];

      // One batched query for all listings' existing capture requests,
      // not a per-row fetch — merged in below so MyListingsList can hide
      // the Request 360° Capture button per-listing without querying
      // capture_360_requests itself.
      if (baseListings.length > 0) {
        const { data: requests } = await supabase
          .from("capture_360_requests")
          .select("property_id, status")
          .in("property_id", baseListings.map(l => l.id))
          .in("status", ["pending", "scheduled"]) as { data: { property_id: string; status: string }[] | null };
        const statusByProperty = new Map((requests ?? []).map(r => [r.property_id, r.status]));

        // One batched query for all listings' view events, not a per-row
        // fetch — property_view_events' own RLS (066) already restricts
        // this to rows this signed-in owner is allowed to see, so counting
        // the returned rows client-side is safe by construction.
        const { data: viewEvents } = await supabase
          .from("property_view_events")
          .select("property_id")
          .in("property_id", baseListings.map(l => l.id)) as { data: { property_id: string }[] | null };
        const viewCountByProperty = new Map<string, number>();
        for (const row of viewEvents ?? []) {
          viewCountByProperty.set(row.property_id, (viewCountByProperty.get(row.property_id) ?? 0) + 1);
        }

        setListings(baseListings.map(l => ({
          ...l,
          capture_request_status: statusByProperty.get(l.id) ?? null,
          view_count: viewCountByProperty.get(l.id) ?? 0,
        })));
      } else {
        setListings(baseListings);
      }
      setLoading(false);
    });
  }, []);

  const handleRequestCapture = async (listing: Listing) => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("capture_360_requests").insert({
      property_id: listing.id,
      requester_id: userId,
      status: "pending",
    });
    if (error) {
      console.error("Capture 360 request insert failed:", error);
      alert("Could not submit the request. Please try again.");
      return;
    }
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, capture_request_status: "pending" } : l));
    alert("360° capture request submitted — our team will be in touch to schedule it.");
    fetch("/api/notify-capture-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyTitle: listing.title,
        propertyAddress: listing.city,
        requesterName: email,
      }),
    }).catch((err) => console.error("[Capture360] Admin notification failed:", err));
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("property_listings").delete().eq("id", id);
    if (!error) setListings(prev => prev.filter(l => l.id !== id));
    else alert("Failed to delete. Please try again.");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#A9B4C2", fontFamily: "var(--font-body-new)", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  if (!email) {
    return (
      <div style={{ minHeight: "100vh", background: G.ivory, paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#FFFFFF", fontFamily: "var(--font-body-new)", fontSize: 16 }}>Please sign in to view your listings.</p>
        <Link href="/login" style={{ color: G.gold, fontWeight: 600, fontFamily: "var(--font-body-new)", textDecoration: "none" }}>Sign In →</Link>
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
              fontFamily: "var(--font-heading-new)",
              fontSize: 34, fontWeight: 600, color: "#FFFFFF",
              margin: 0, lineHeight: 1.15,
            }}>
              My Listings
            </h1>
            <p style={{ color: "#A9B4C2", fontFamily: "var(--font-body-new)", fontSize: 14, margin: "6px 0 0" }}>
              {listings.length} {listings.length === 1 ? "property" : "properties"} · {email}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 500,
                color: "#FFFFFF", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                cursor: "pointer", fontFamily: "var(--font-body-new)",
              }}>← Dashboard</button>
            </Link>
            <Link href="/post-property" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "9px 18px", fontSize: 13, fontWeight: 600,
                color: "#020C1C", background: G.gold,
                border: "none", borderRadius: 999,
                boxShadow: "0 10px 30px rgba(30,167,255,.35)",
                cursor: "pointer", fontFamily: "var(--font-body-new)",
              }}>+ New Listing</button>
            </Link>
          </div>
        </div>

        <MyListingsList
          listings={listings}
          onDelete={handleDelete}
          onRequestCapture={handleRequestCapture}
          onViewInquiries={listing => router.push(`/dashboard?tab=inquiries&property=${listing.id}`)}
        />

      </div>
    </div>
  );
}
