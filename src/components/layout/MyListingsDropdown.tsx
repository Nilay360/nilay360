"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface MiniListing {
  id: string
  title: string | null
  city: string | null
  status: string
  photo_urls: string[] | null
}

const STATUS_MAP: Record<string, { text: string; bg: string; label: string }> = {
  active:         { text: "#2BA8E0", bg: "rgba(43,168,224,0.15)",  label: "Active"   },
  pending_review: { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: "Pending"  },
  pending:        { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: "Pending"  },
  rejected:       { text: "#F87171", bg: "rgba(248,113,113,0.15)", label: "Rejected" },
  inactive:       { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: "Inactive" },
  sold:           { text: "#C4B5FD", bg: "rgba(139,92,246,0.15)",  label: "Sold"     },
}

function HouseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

interface PanelProps {
  listings: MiniListing[]
  loading: boolean
  search: string
  onSearchChange: (v: string) => void
  onNavClose?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function ListingsPanel({ listings, loading, search, onSearchChange, onNavClose, onMouseEnter, onMouseLeave }: PanelProps) {
  const visible = listings.filter(l => {
    const q = search.toLowerCase()
    return !q || l.title?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q) || l.status.toLowerCase().includes(q)
  }).slice(0, 5)

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 8px 6px", background: "rgba(255,255,255,0.02)" }}
    >
      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search listings…"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "7px 10px", marginBottom: 6,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 7, fontSize: 12, color: "#E8EAED", outline: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      />

      {loading ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "6px 4px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          Loading…
        </p>
      ) : visible.length === 0 ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "6px 4px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          {search ? "No listings match" : "No listings yet"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {visible.map(l => {
            const sc = STATUS_MAP[l.status] ?? { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: l.status }
            const thumb = l.photo_urls?.[0] ?? null
            return (
              <Link
                key={l.id}
                href={`/post-property/edit/${l.id}`}
                onClick={onNavClose}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 5, flexShrink: 0,
                  background: thumb ? `url(${thumb}) center/cover no-repeat` : "rgba(43,168,224,0.1)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {!thumb && <span style={{ fontSize: 11, color: "rgba(43,168,224,0.6)" }}>⌂</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500, color: "#E8EAED",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {l.title ?? "Untitled"}
                  </div>
                  {l.city && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
                      {l.city}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                  flexShrink: 0, color: sc.text, background: sc.bg,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {sc.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 6, paddingTop: 4 }}>
        <Link
          href="/dashboard/my-listings"
          onClick={onNavClose}
          style={{
            display: "block", textAlign: "center",
            fontSize: 12, fontWeight: 600, color: "#2BA8E0",
            fontFamily: "'DM Sans', sans-serif",
            padding: "5px 0", textDecoration: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          View All in Dashboard →
        </Link>
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  onNavClose?: () => void
  mobile?: boolean
}

export function MyListingsDropdown({ onNavClose, mobile = false }: Props) {
  const [open, setOpen]         = useState(false)
  const [listings, setListings] = useState<MiniListing[]>([])
  const [search, setSearch]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [fetched, setFetched]   = useState(false)
  const leaveTimer              = useRef<number | null>(null)

  const fetchOnce = async () => {
    if (fetched) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const userEmail = data.session?.user?.email ?? null
    const userId    = data.session?.user?.id    ?? null
    if (!userEmail && !userId) { setLoading(false); return }
    const filter = userId && userEmail
      ? `seller_email.eq.${userEmail},user_id.eq.${userId}`
      : userEmail ? `seller_email.eq.${userEmail}` : `user_id.eq.${userId}`
    const { data: rows } = await supabase
      .from("property_listings")
      .select("id, title, city, status, photo_urls")
      .or(filter)
      .order("submitted_at", { ascending: false })
      .limit(20)
    setListings(rows ?? [])
    setFetched(true)
    setLoading(false)
  }

  const openPanel    = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setOpen(true);  fetchOnce() }
  const cancelClose  = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  const scheduleClose = () => { leaveTimer.current = window.setTimeout(() => setOpen(false), 180) }

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }, [])

  // ── Mobile: tap to expand ──────────────────────────────────────────────────
  if (mobile) {
    return (
      <div>
        <button
          onClick={() => { const next = !open; setOpen(next); if (next) fetchOnce() }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "11px 12px", borderRadius: 10,
            background: open ? "rgba(43,168,224,0.08)" : "rgba(255,255,255,0.04)",
            border: open ? "1px solid rgba(43,168,224,0.25)" : "1px solid rgba(255,255,255,0.07)",
            color: open ? "#2BA8E0" : "rgba(255,255,255,0.75)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", textAlign: "left" as const,
          }}
        >
          <span style={{ fontSize: 15, color: "#2BA8E0" }}>🏠</span>
          My Listings
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div style={{
            marginTop: 4, background: "rgba(255,255,255,0.02)",
            borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden",
          }}>
            <ListingsPanel
              listings={listings} loading={loading}
              search={search} onSearchChange={setSearch}
              onNavClose={onNavClose}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: hover to expand inline within the user dropdown ──────────────
  return (
    <div onMouseEnter={openPanel} onMouseLeave={scheduleClose}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
        color: open ? "#FFFFFF" : "rgba(255,255,255,0.65)",
        background: open ? "rgba(43,168,224,0.07)" : "transparent",
        cursor: "pointer", transition: "background 0.12s, color 0.12s",
      }}>
        <span style={{ color: open ? "#2BA8E0" : "rgba(43,168,224,0.55)", transition: "color 0.12s", flexShrink: 0 }}>
          <HouseIcon />
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 450, fontFamily: "'DM Sans', sans-serif" }}>
          My Listings
        </span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: "rgba(255,255,255,0.35)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {open && (
        <ListingsPanel
          listings={listings} loading={loading}
          search={search} onSearchChange={setSearch}
          onNavClose={onNavClose}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  )
}
