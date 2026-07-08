"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface MiniListing {
  id: string
  title: string | null
  status: string
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

// Self-contained panel — owns its own search state so filter is always live
interface PanelProps {
  listings: MiniListing[]
  loading: boolean
  onNavClose?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function ListingsPanel({ listings, loading, onNavClose, onMouseEnter, onMouseLeave }: PanelProps) {
  const [search, setSearch] = useState("")

  const visible = search.trim() === ""
    ? listings.slice(0, 3)
    : listings.filter(l =>
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.status.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 3)

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 10px 6px", background: "rgba(255,255,255,0.02)" }}
    >
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search listings…"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "6px 10px", marginBottom: 5,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 6, fontSize: 12,
          color: "#E8EAED", outline: "none",
          fontFamily: "'DM Sans', sans-serif",
        }}
      />

      {loading ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "4px 2px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          Loading…
        </p>
      ) : visible.length === 0 ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "4px 2px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          {search ? "No match" : "No listings yet"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {visible.map(l => {
            const sc = STATUS_MAP[l.status] ?? { text: "#AEB4BC", bg: "rgba(255,255,255,0.10)", label: l.status }
            return (
              <Link
                key={l.id}
                href={`/post-property/edit/${l.id}`}
                onClick={onNavClose}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "5px 4px", borderRadius: 5, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: "#E8EAED", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                  {l.title ?? "Untitled"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, flexShrink: 0, color: sc.text, background: sc.bg, fontFamily: "'DM Sans', sans-serif" }}>
                  {sc.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 5, paddingTop: 4 }}>
        <Link
          href="/dashboard/my-listings"
          onClick={onNavClose}
          style={{ display: "block", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#2BA8E0", fontFamily: "'DM Sans', sans-serif", padding: "4px 0", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
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
      .select("id, title, status")
      .or(filter)
      .order("submitted_at", { ascending: false })
      .limit(20)
    setListings((rows ?? []) as MiniListing[])
    setFetched(true)
    setLoading(false)
  }

  const openPanel     = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setOpen(true); fetchOnce() }
  const cancelClose   = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  const scheduleClose = () => { leaveTimer.current = window.setTimeout(() => setOpen(false), 180) }

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }, [])

  // ── Mobile: link navigates, chevron expands panel ──────────────────────────
  if (mobile) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", borderRadius: 10, overflow: "hidden", border: open ? "1px solid rgba(43,168,224,0.25)" : "1px solid rgba(255,255,255,0.07)" }}>
          <Link
            href="/dashboard/my-listings"
            onClick={onNavClose}
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              padding: "11px 12px",
              background: open ? "rgba(43,168,224,0.06)" : "rgba(255,255,255,0.04)",
              color: open ? "#2BA8E0" : "rgba(255,255,255,0.75)",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: 15, color: "#2BA8E0" }}>🏠</span>
            My Listings
          </Link>
          <button
            onClick={() => { const next = !open; setOpen(next); if (next) fetchOnce() }}
            aria-label="Expand My Listings preview"
            style={{
              padding: "11px 14px",
              background: open ? "rgba(43,168,224,0.08)" : "rgba(255,255,255,0.04)",
              border: "none", borderLeft: "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer", color: open ? "#2BA8E0" : "rgba(255,255,255,0.45)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ display: "block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {open && (
          <div style={{ marginTop: 4, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <ListingsPanel listings={listings} loading={loading} onNavClose={onNavClose} />
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: label navigates, hover expands panel inline ───────────────────
  return (
    <div onMouseEnter={openPanel} onMouseLeave={scheduleClose}>
      {/* Trigger row — label is a real link, chevron is visual only */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
        background: open ? "rgba(43,168,224,0.07)" : "transparent",
        transition: "background 0.12s",
      }}>
        <span style={{ color: open ? "#2BA8E0" : "rgba(43,168,224,0.55)", transition: "color 0.12s", flexShrink: 0 }}>
          <HouseIcon />
        </span>
        <Link
          href="/dashboard/my-listings"
          onClick={onNavClose}
          style={{
            flex: 1, fontSize: 13, fontWeight: 450,
            color: open ? "#FFFFFF" : "rgba(255,255,255,0.65)",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none", transition: "color 0.12s",
          }}
        >
          My Listings
        </Link>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ color: "rgba(255,255,255,0.35)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {open && (
        <ListingsPanel
          listings={listings} loading={loading}
          onNavClose={onNavClose}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  )
}
