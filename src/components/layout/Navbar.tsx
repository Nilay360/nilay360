"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_LINKS, NAV_MENUS } from "@/constants"
import type { NavMenuData } from "@/constants"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import type { User } from "@supabase/supabase-js"
import { MyListingsDropdown } from "@/components/layout/MyListingsDropdown"
import { NotificationBell } from "@/components/layout/NotificationBell"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  full_name: string | null
  city:      string | null
  role:      string | null
}

interface MenuItem {
  label: string
  href:  string
  icon:  React.ComponentType
}

interface MenuGroup {
  group: string
  items: MenuItem[]
}

// ─── User account dropdown items ───────────────────────────────────────────────

const MENU_ITEMS: MenuGroup[] = [
  {
    group: "listings",
    items: [
      { label: "Dashboard",        href: "/dashboard",              icon: IconDashboard },
      { label: "My Listings",      href: "/dashboard/my-listings", icon: IconListings  },
      { label: "List Property",    href: "/post-property",          icon: IconPlus      },
      { label: "Saved Properties", href: "/dashboard/saved",        icon: IconHeart     },
      { label: "My Searches",      href: "/dashboard/searches",     icon: IconSearch    },
    ],
  },
  {
    group: "tools",
    items: [
      { label: "EMI Calculator",  href: "/calculator",     icon: IconCalc    },
      { label: "NRI Services",    href: "/nri",            icon: IconGlobe   },
      { label: "Contact Support", href: "/contact",        icon: IconSupport },
    ],
  },
  {
    group: "account",
    items: [
      { label: "Profile Settings", href: "/profile/edit", icon: IconGear },
    ],
  },
]

// ─── SVG icon components ───────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function IconListings() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconHeart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconCalc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="16" y2="18"/>
    </svg>
  )
}
function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}
function IconSupport() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IconGear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ─── Chevron SVG ───────────────────────────────────────────────────────────────

function Chevron({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: "transform 0.2s",
        transform: rotated ? "rotate(180deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ─── Avatar component ──────────────────────────────────────────────────────────

function Avatar({
  initial, size = 32, ring = false,
}: { initial: string; size?: number; ring?: boolean }) {
  return (
    <div
      style={{
        width:  size, height: size, borderRadius: "50%",
        background:  "#111F33",
        border:      ring ? "2px solid #10C4C3" : "1.5px solid rgba(16,196,195,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-body-new)",
        fontSize:   size * 0.4,
        fontWeight: 700,
        color:      "#10C4C3",
        letterSpacing: "0.02em",
        boxShadow:  ring ? "0 0 0 1px rgba(16,196,195,0.15)" : "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {initial}
    </div>
  )
}

// ─── User dropdown panel ───────────────────────────────────────────────────────

interface DropdownProps {
  user:        User
  profile:     Profile | null
  onClose:     () => void
  onSignOut:   () => void
  open:        boolean
  wrapperRef:  React.RefObject<HTMLDivElement>
  dropdownRef: React.RefObject<HTMLDivElement>
}

function UserDropdown({ user, profile, onClose, onSignOut, open, wrapperRef, dropdownRef }: DropdownProps) {
  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "User"
  const initial     = (displayName || "U")[0].toUpperCase()
  const city        = profile?.city ?? null

  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, right: 0 })

  React.useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownPos({
        top:   rect.bottom + 10,
        right: window.innerWidth - rect.right,
      })
    }
  }, [open, wrapperRef])

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed", right: dropdownPos.right, top: dropdownPos.top,
        width: 272,
        background: "#0A1526",
        border: "1px solid rgba(16,196,195,0.18)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,196,195,0.06)",
        overflow: "hidden",
        zIndex: 9999,
        animation: "ddFadeIn 0.15s ease",
      }}
    >
      {/* Profile header */}
      <div style={{
        padding: "16px 16px 14px",
        background: "linear-gradient(135deg, #111F33 0%, #0A1526 100%)",
        borderBottom: "1px solid rgba(16,196,195,0.14)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Avatar initial={initial} size={42} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "#FFFFFF", fontWeight: 600, fontSize: 14,
            fontFamily: "var(--font-body-new)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {displayName}
          </div>
          {city && (
            <div style={{
              color: "rgba(16,196,195,0.75)", fontSize: 11.5,
              fontFamily: "var(--font-body-new)", marginTop: 1,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {city}
            </div>
          )}
        </div>
        <Link
          href="/profile/edit"
          onClick={onClose}
          style={{
            fontSize: 11, fontWeight: 600, color: "#10C4C3",
            fontFamily: "var(--font-body-new)",
            background: "rgba(16,196,195,0.1)", border: "1px solid rgba(16,196,195,0.25)",
            borderRadius: 6, padding: "4px 9px",
            textDecoration: "none", flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          Edit
        </Link>
      </div>

      {/* Menu groups */}
      <div style={{ padding: "6px 0" }}>
        {MENU_ITEMS.map((group, gi) => (
          <React.Fragment key={group.group}>
            {gi > 0 && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
            )}
            {group.items.map(item =>
              item.label === "My Listings" ? (
                <MyListingsDropdown key="my-listings" onNavClose={onClose} />
              ) : (
                <DropdownLink
                  key={item.href}
                  href={item.href}
                  icon={<item.icon />}
                  label={item.label}
                  onClick={onClose}
                />
              )
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Admin Panel */}
      {(profile?.role === "admin" || profile?.role === "super_admin") && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "4px 8px" }}>
          <Link
            href="/admin"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 8px",
              color: "#10C4C3",
              background: "rgba(16,196,195,0.07)",
              borderRadius: 8,
              textDecoration: "none", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-body-new)",
              letterSpacing: "0.02em",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin Panel
          </Link>
        </div>
      )}

      {/* Sign out */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "6px 8px 8px" }}>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", borderRadius: 8,
            background: "transparent", border: "none", cursor: "pointer",
            color: "#e05555", fontSize: 13, fontWeight: 500,
            fontFamily: "var(--font-body-new)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,85,85,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ color: "#e05555", opacity: 0.85 }}><IconSignOut /></span>
          Sign Out
        </button>
      </div>
    </div>,
    document.body
  )
}

function DropdownLink({
  href, icon, label, onClick,
}: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 16px",
        color: hovered ? "#FFFFFF" : "rgba(255,255,255,0.65)",
        background: hovered ? "rgba(16,196,195,0.07)" : "transparent",
        textDecoration: "none", fontSize: 13, fontWeight: 450,
        fontFamily: "var(--font-body-new)",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      <span style={{ color: hovered ? "#10C4C3" : "rgba(16,196,195,0.55)", transition: "color 0.12s" }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}

// ─── Mega-menu sub-components ──────────────────────────────────────────────────

function MegaLink({
  href, label, onClick, featured = false,
}: {
  href:      string
  label:     string
  onClick:   () => void
  featured?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        padding: featured ? "6px 0" : "4px 0",
        fontSize: 13,
        fontWeight: featured ? 500 : 400,
        fontFamily: "var(--font-body-new)",
        textDecoration: "none",
        lineHeight: 1.55,
        color: hovered
          ? "#10C4C3"
          : featured
            ? "rgba(255,255,255,0.82)"
            : "rgba(255,255,255,0.48)",
        transition: "color 0.12s",
      }}
    >
      {label}
    </Link>
  )
}

function MegaPanel({
  menu,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: {
  menu:         NavMenuData
  onMouseEnter: () => void
  onMouseLeave: () => void
  onLinkClick:  () => void
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#020C1C",
        borderTop: "1px solid rgba(16,196,195,0.12)",
        borderBottom: "1px solid rgba(16,196,195,0.18)",
        boxShadow: "0 28px 72px rgba(0,0,0,0.55)",
        zIndex: 999,
        animation: "megaFadeIn 0.18s ease",
      }}
    >
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 24px",
        display: "flex",
      }}>

        {/* Left quick-links column */}
        <div style={{
          width: 210,
          flexShrink: 0,
          padding: "28px 28px 28px 0",
          borderRight: "1px solid rgba(16,196,195,0.1)",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#10C4C3",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
            fontFamily: "var(--font-support-new)",
          }}>
            {menu.leftColumn.heading}
          </div>
          {menu.leftColumn.links.map(link => (
            <MegaLink
              key={link.href + link.label}
              href={link.href}
              label={link.label}
              onClick={onLinkClick}
              featured
            />
          ))}
        </div>

        {/* Right columns */}
        <div style={{
          flex: 1,
          display: "flex",
          padding: "28px 0 28px 32px",
          gap: 0,
          overflowX: "auto",
        }}>
          {menu.columns.map((col, ci) => (
            <div
              key={col.heading}
              style={{
                flex: 1,
                paddingLeft: ci > 0 ? 24 : 0,
                borderLeft: ci > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                minWidth: 0,
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#10C4C3",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 12,
                fontFamily: "var(--font-support-new)",
                paddingBottom: 8,
                borderBottom: "1px solid rgba(16,196,195,0.15)",
                whiteSpace: "nowrap",
              }}>
                {col.heading}
              </div>
              {col.links.map(link => (
                <MegaLink
                  key={link.href + link.label}
                  href={link.href}
                  label={link.label}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── Desktop nav item with hover state ────────────────────────────────────────

function NavItem({
  label,
  href,
  isActive,
  isOpen,
  hasMenu,
  onMouseEnter,
  onMouseLeave,
}: {
  label:        string
  href:         string
  isActive:     boolean
  isOpen:       boolean
  hasMenu:      boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => { setHovered(true); onMouseEnter() }}
      onMouseLeave={() => { setHovered(false); onMouseLeave() }}
    >
      <Link
        href={href}
        style={{
          padding: "7px 14px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-body-new)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
          color:
            isActive || isOpen
              ? "#ffffff"
              : hovered
                ? "#10C4C3"
                : "rgba(255,255,255,0.6)",
          background:
            isActive || isOpen
              ? "rgba(255,255,255,0.09)"
              : hovered
                ? "rgba(16,196,195,0.06)"
                : "transparent",
          transition: "color 0.15s, background 0.15s",
        }}
      >
        {label}
        {hasMenu && (
          <span style={{ opacity: isOpen || hovered ? 0.9 : 0.5, transition: "opacity 0.15s" }}>
            <Chevron rotated={isOpen} />
          </span>
        )}
      </Link>
    </div>
  )
}

// ─── Main Navbar component ─────────────────────────────────────────────────────

export function Navbar() {
  const pathname   = usePathname()
  const { user: authUser, profile: authProfile, openAuthModal } = useAuth()

  // Narrow AuthProfile → local Profile shape (Navbar only needs these three fields)
  const user:    User | null    = authUser
  const profile: Profile | null = authProfile
    ? { full_name: authProfile.full_name, city: authProfile.city, role: authProfile.role }
    : null

  const [scrolled,          setScrolled]          = useState(false)
  const [menuOpen,          setMenuOpen]          = useState(false)
  const [dropdown,          setDropdown]          = useState(false)
  const [openMenu,          setOpenMenu]          = useState<string | null>(null)
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null)
  const [mounted,           setMounted]           = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const wrapperRef   = useRef<HTMLDivElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)

  // ── Mega-menu hover helpers ──
  const cancelMegaClose = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleMegaClose = () => {
    cancelMegaClose()
    closeTimerRef.current = window.setTimeout(() => setOpenMenu(null), 120)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close user dropdown on outside click
  useEffect(() => {
    if (!dropdown) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdown])

  // Close everything on route change
  useEffect(() => {
    setDropdown(false)
    setMenuOpen(false)
    setOpenMenu(null)
    setMobileExpandedMenu(null)
  }, [pathname])

  const handleSignOut = () => {
    const supabase = createClient()
    supabase.auth.signOut().finally(() => {
      window.location.replace("/")
    })
  }

  // List Property requires an account — open the auth modal first if signed out.
  const handleListProperty = () => {
    setMenuOpen(false)
    if (user) {
      window.location.href = "/post-property"
    } else {
      openAuthModal("signin")
    }
  }

  const avatarInitial = ((profile?.full_name ?? user?.email ?? "U") || "U")[0].toUpperCase()
  const displayName   = profile?.full_name ?? user?.email?.split("@")[0] ?? "User"
  const isHome        = pathname === "/"

  const headerBg = scrolled || !isHome
    ? "rgba(11, 13, 16, 0.97)"
    : "#020C1C"

  const currentMenu = openMenu !== null ? NAV_MENUS[openMenu] ?? null : null

  return (
    <>
      <style>{`
        @keyframes ddFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes megaFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (max-width: 1023px) { .nvl-desktop { display: none !important; } }
        @media (min-width: 1024px) { .nvl-mobile  { display: none !important; } }
        .nvl-sign-in:hover  { color: #ffffff !important; border-color: #3DDAD9 !important; }
        .nvl-list-btn:hover { background: #3DDAD9 !important; }
      `}</style>

      <header style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        height: 64,
        background: headerBg,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(16,196,195,0.12)",
        boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.35)" : "none",
        transition: "background 0.3s, box-shadow 0.3s",
        overflow: "visible",
        isolation: "isolate",
      }}>

        {/* ── Main bar ── */}
        <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>

          {/* Logo — flush left, outside max-width constraint */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0, paddingLeft: 24 }}>
            <img
              src="/brand/Nilay360-09-Photoroom%20(1).png"
              alt="Nilay 360"
              style={{ height: 58, width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* Nav + right buttons — centered max-width container */}
          <div className="nilay360-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, height: "100%", paddingRight: 24 }}>

          {/* Desktop nav */}
          <nav className="nvl-desktop" style={{ display: "flex", alignItems: "center", gap: 2 }} aria-label="Main navigation">
            {NAV_LINKS.map(link => {
              const hasMenu = link.label in NAV_MENUS
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              const isOpen   = openMenu === link.label
              return (
                <NavItem
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  isActive={isActive}
                  isOpen={isOpen}
                  hasMenu={hasMenu}
                  onMouseEnter={() => {
                    cancelMegaClose()
                    setOpenMenu(hasMenu ? link.label : null)
                  }}
                  onMouseLeave={scheduleMegaClose}
                />
              )
            })}
          </nav>

          {/* Desktop right actions */}
          <div className="nvl-desktop" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/dashboard/saved" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", textDecoration: "none",
              transition: "all 0.15s",
            }} title="Saved Properties">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>
            <button
              className="nvl-list-btn"
              onClick={handleListProperty}
              style={{
                padding: "8px 18px",
                fontSize: 13, fontWeight: 600,
                color: "#0a0a0a",
                background: "#10C4C3",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "var(--font-body-new)",
                letterSpacing: "0.01em",
                transition: "background 0.15s",
              }}
            >
              List Property
            </button>

            {/* Notification bell — agent-only, sits beside the profile
                dropdown. Rendered as its own sibling so its portal/z-index
                is independent of the user dropdown's. */}
            {mounted && user && profile?.role === "agent" && (
              <NotificationBell userId={user.id} />
            )}

            {mounted && (user ? (
              <div ref={wrapperRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdown(v => !v)}
                  aria-expanded={dropdown}
                  aria-label="Open user menu"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: dropdown ? "rgba(16,196,195,0.1)" : "transparent",
                    border: `1px solid ${dropdown ? "rgba(16,196,195,0.5)" : "rgba(16,196,195,0.25)"}`,
                    borderRadius: 8, padding: "4px 10px 4px 5px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!dropdown) e.currentTarget.style.borderColor = "rgba(16,196,195,0.5)" }}
                  onMouseLeave={e => { if (!dropdown) e.currentTarget.style.borderColor = "rgba(16,196,195,0.25)" }}
                >
                  <Avatar initial={avatarInitial} size={28} ring />
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "var(--font-body-new)",
                    maxWidth: 110, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {displayName}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="rgba(16,196,195,0.6)" strokeWidth="2.5"
                    style={{ transition: "transform 0.2s", transform: dropdown ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {dropdown && window.innerWidth >= 1024 && (
                  <UserDropdown
                    user={user}
                    profile={profile}
                    onClose={() => setDropdown(false)}
                    onSignOut={handleSignOut}
                    open={dropdown}
                    wrapperRef={wrapperRef}
                    dropdownRef={dropdownRef}
                  />
                )}
              </div>
            ) : (
              <button
                className="nvl-sign-in"
                onClick={() => openAuthModal("signin")}
                style={{
                  padding: "7px 16px",
                  fontSize: 13, fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "var(--font-body-new)",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Sign In
              </button>
            ))}
          </div>

          </div>{/* end nilay360-container */}

          {/* Mobile saved + hamburger */}
          <Link href="/dashboard/saved" className="nvl-mobile" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8,
            color: "rgba(255,255,255,0.7)", textDecoration: "none",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>
          <button
            className="nvl-mobile"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              boxSizing: "border-box",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {/* ── Desktop mega-menu panel ── */}
        {currentMenu && (
          <MegaPanel
            menu={currentMenu}
            onMouseEnter={cancelMegaClose}
            onMouseLeave={scheduleMegaClose}
            onLinkClick={() => setOpenMenu(null)}
          />
        )}


      </header>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div
          className="nvl-mobile"
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "#020C1C",
            zIndex: 99999,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 20px", height: 64, borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "#020C1C", flexShrink: 0,
          }}>
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <img src="/brand/Nilay360-09-Photoroom%20(1).png" alt="Nilay 360" style={{ height: 56, width: "auto" }} />
            </Link>
            <button onClick={() => setMenuOpen(false)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", color: "#fff",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 40px" }}>

            {/* Nav links */}
            <nav style={{ padding: "8px 16px" }}>
              {NAV_LINKS.map(link => (
                <div key={link.label}>
                  {link.menu ? (
                    <div>
                      <button
                        onClick={() => setOpenMenu(currentMenu === link.label ? null : link.label)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          justifyContent: "space-between", padding: "14px 12px",
                          background: currentMenu === link.label ? "rgba(16,196,195,0.08)" : "transparent",
                          border: "none", borderRadius: 10, cursor: "pointer",
                          color: currentMenu === link.label ? "#10C4C3" : "rgba(255,255,255,0.85)",
                          fontSize: 15, fontWeight: 500, fontFamily: "var(--font-body-new)",
                          transition: "all 0.15s",
                        }}
                      >
                        {link.label}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          style={{ transform: currentMenu === link.label ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {currentMenu === link.label && (
                        <div style={{ padding: "4px 12px 8px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
                          {link.menu.columns?.[0]?.items?.slice(0, 5).map((item: any) => (
                            <Link key={item.href} href={item.href} onClick={() => { setMenuOpen(false); setOpenMenu(null); }}
                              style={{
                                padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.6)",
                                fontSize: 14, display: "block", textDecoration: "none",
                                borderLeft: "2px solid rgba(16,196,195,0.3)",
                                paddingLeft: 16, transition: "all 0.15s",
                              }}>
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link href={link.href ?? "#"} onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block", padding: "14px 12px", borderRadius: 10,
                        color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 500,
                        textDecoration: "none", fontFamily: "var(--font-body-new)",
                      }}>
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 16px" }} />

            {/* Auth section */}
            <div style={{ padding: "12px 16px" }}>
              {mounted && (user ? (
                <>
                  {/* Profile card */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: "linear-gradient(135deg, rgba(16,196,195,0.08) 0%, rgba(16,196,195,0.03) 100%)",
                    borderRadius: 12, border: "1px solid rgba(16,196,195,0.2)", marginBottom: 12,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #10C4C3, #0B9C9B)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, color: "#fff",
                    }}>
                      {avatarInitial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                        {profile?.full_name ?? user.email?.split("@")[0]}
                      </div>
                      <div style={{ color: "rgba(16,196,195,0.8)", fontSize: 12 }}>
                        {profile?.city ?? user.email}
                      </div>
                    </div>
                    <Link href="/profile/edit" onClick={() => setMenuOpen(false)}
                      style={{
                        padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(16,196,195,0.4)",
                        color: "#10C4C3", fontSize: 12, fontWeight: 600, textDecoration: "none",
                        background: "rgba(16,196,195,0.08)",
                      }}>
                      Edit
                    </Link>
                  </div>

                  {/* My Listings expandable panel */}
                  <div style={{ marginBottom: 8 }}>
                    <MyListingsDropdown mobile onNavClose={() => setMenuOpen(false)} />
                  </div>

                  {/* Quick links grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { href: "/dashboard",          label: "Dashboard",    icon: "⊞" },
                      { href: "/post-property",       label: "List Property",icon: "+" },
                      { href: "/dashboard/saved",     label: "Saved",        icon: "♡" },
                      { href: "/dashboard/searches",  label: "My Searches",  icon: "⌕" },
                      { href: "/calculator",          label: "Calculator",   icon: "⊟" },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "11px 12px",
                          borderRadius: 10, background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500,
                          textDecoration: "none", transition: "all 0.15s",
                        }}>
                        <span style={{ color: "#10C4C3", fontSize: 16 }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Admin panel link — only for admins */}
                  {profile?.role === "admin" && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                        borderRadius: 10, background: "rgba(16,196,195,0.1)",
                        border: "1px solid rgba(16,196,195,0.3)",
                        color: "#10C4C3", fontSize: 14, fontWeight: 600,
                        textDecoration: "none", marginBottom: 12,
                      }}>
                      <span>⚙</span> Admin Panel
                    </Link>
                  )}

                  {/* Sign out */}
                  <button onClick={() => { handleSignOut(); setMenuOpen(false); }}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 10,
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#EF4444", fontSize: 14, fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-body-new)",
                    }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={() => { openAuthModal("signin"); setMenuOpen(false); }}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 10,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
                      fontFamily: "var(--font-body-new)",
                    }}>
                    Sign In
                  </button>
                  <button onClick={() => { handleListProperty(); setMenuOpen(false); }}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 10,
                      background: "linear-gradient(135deg, #10C4C3, #0B9C9B)",
                      border: "none", color: "#fff", fontSize: 15, fontWeight: 600,
                      cursor: "pointer", fontFamily: "var(--font-body-new)",
                    }}>
                    List Property
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
