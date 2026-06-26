"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_LINKS, NAV_MENUS } from "@/constants"
import type { NavMenuData } from "@/constants"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/context/AuthContext"
import type { User } from "@supabase/supabase-js"

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
        background:  "#121519",
        border:      ring ? "2px solid #2BA8E0" : "1.5px solid rgba(43,168,224,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
        fontSize:   size * 0.4,
        fontWeight: 700,
        color:      "#2BA8E0",
        letterSpacing: "0.02em",
        boxShadow:  ring ? "0 0 0 1px rgba(43,168,224,0.15)" : "none",
        transition: "box-shadow 0.2s",
      }}
    >
      {initial}
    </div>
  )
}

// ─── User dropdown panel ───────────────────────────────────────────────────────

interface DropdownProps {
  user:      User
  profile:   Profile | null
  onClose:   () => void
  onSignOut: () => void
}

function UserDropdown({ user, profile, onClose, onSignOut }: DropdownProps) {
  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "User"
  const initial     = (displayName || "U")[0].toUpperCase()
  const city        = profile?.city ?? null

  return (
    <div
      style={{
        position: "absolute", right: 0, top: "calc(100% + 10px)",
        width: 272,
        background: "#0B0D10",
        border: "1px solid rgba(43,168,224,0.18)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(43,168,224,0.06)",
        overflow: "hidden",
        zIndex: 200,
        animation: "ddFadeIn 0.15s ease",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Profile header */}
      <div style={{
        padding: "16px 16px 14px",
        background: "linear-gradient(135deg, #121519 0%, #0B0D10 100%)",
        borderBottom: "1px solid rgba(43,168,224,0.14)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Avatar initial={initial} size={42} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "#FFFFFF", fontWeight: 600, fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {displayName}
          </div>
          {city && (
            <div style={{
              color: "rgba(43,168,224,0.75)", fontSize: 11.5,
              fontFamily: "'DM Sans', sans-serif", marginTop: 1,
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
            fontSize: 11, fontWeight: 600, color: "#2BA8E0",
            fontFamily: "'DM Sans', sans-serif",
            background: "rgba(43,168,224,0.1)", border: "1px solid rgba(43,168,224,0.25)",
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
            {group.items.map(item => (
              <DropdownLink
                key={item.href}
                href={item.href}
                icon={<item.icon />}
                label={item.label}
                onClick={onClose}
              />
            ))}
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
              color: "#2BA8E0",
              background: "rgba(43,168,224,0.07)",
              borderRadius: 8,
              textDecoration: "none", fontSize: 13, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
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
            fontFamily: "'DM Sans', sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(224,85,85,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ color: "#e05555", opacity: 0.85 }}><IconSignOut /></span>
          Sign Out
        </button>
      </div>
    </div>
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
        background: hovered ? "rgba(43,168,224,0.07)" : "transparent",
        textDecoration: "none", fontSize: 13, fontWeight: 450,
        fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      <span style={{ color: hovered ? "#2BA8E0" : "rgba(43,168,224,0.55)", transition: "color 0.12s" }}>
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
        fontFamily: "'DM Sans', sans-serif",
        textDecoration: "none",
        lineHeight: 1.55,
        color: hovered
          ? "#2BA8E0"
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
        background: "#000000",
        borderTop: "1px solid rgba(43,168,224,0.12)",
        borderBottom: "1px solid rgba(43,168,224,0.18)",
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
          borderRight: "1px solid rgba(43,168,224,0.1)",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#2BA8E0",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
            fontFamily: "'DM Sans', sans-serif",
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
                color: "#2BA8E0",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 12,
                fontFamily: "'DM Sans', sans-serif",
                paddingBottom: 8,
                borderBottom: "1px solid rgba(43,168,224,0.15)",
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
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
          color:
            isActive || isOpen
              ? "#ffffff"
              : hovered
                ? "#2BA8E0"
                : "rgba(255,255,255,0.6)",
          background:
            isActive || isOpen
              ? "rgba(255,255,255,0.09)"
              : hovered
                ? "rgba(43,168,224,0.06)"
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
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
    : "#000000"

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
        .nvl-sign-in:hover  { color: #ffffff !important; border-color: #3DBEF5 !important; }
        .nvl-list-btn:hover { background: #3DBEF5 !important; }
      `}</style>

      <header style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        height: 64,
        background: headerBg,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(43,168,224,0.12)",
        boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,0.35)" : "none",
        transition: "background 0.3s, box-shadow 0.3s",
        overflow: "visible",
      }}>

        {/* ── Main bar ── */}
        <div className="nilay360-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <img
              src="/nilay_final.jpg"
              alt="Nilay 360"
              style={{ height: 52, width: "auto", objectFit: "contain" }}
            />
          </Link>

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
            <button
              className="nvl-list-btn"
              onClick={handleListProperty}
              style={{
                padding: "8px 18px",
                fontSize: 13, fontWeight: 600,
                color: "#0a0a0a",
                background: "#2BA8E0",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.01em",
                transition: "background 0.15s",
              }}
            >
              List Property
            </button>

            {mounted && (user ? (
              <div ref={wrapperRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdown(v => !v)}
                  aria-expanded={dropdown}
                  aria-label="Open user menu"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: dropdown ? "rgba(43,168,224,0.1)" : "transparent",
                    border: `1px solid ${dropdown ? "rgba(43,168,224,0.5)" : "rgba(43,168,224,0.25)"}`,
                    borderRadius: 8, padding: "4px 10px 4px 5px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!dropdown) e.currentTarget.style.borderColor = "rgba(43,168,224,0.5)" }}
                  onMouseLeave={e => { if (!dropdown) e.currentTarget.style.borderColor = "rgba(43,168,224,0.25)" }}
                >
                  <Avatar initial={avatarInitial} size={28} ring />
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "'DM Sans', sans-serif",
                    maxWidth: 110, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {displayName}
                  </span>
                  <svg
                    width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="rgba(43,168,224,0.6)" strokeWidth="2.5"
                    style={{ transition: "transform 0.2s", transform: dropdown ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {dropdown && (
                  <UserDropdown
                    user={user}
                    profile={profile}
                    onClose={() => setDropdown(false)}
                    onSignOut={handleSignOut}
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
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Sign In
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="nvl-mobile"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
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

        {/* ── Mobile Menu ── */}
        {menuOpen && (
          <div
            className="nvl-mobile"
            style={{
              background: "#0B0D10",
              borderTop: "1px solid rgba(43,168,224,0.15)",
              padding: "12px 16px",
              maxHeight: "calc(100vh - 64px)",
              overflowY: "auto",
            }}
          >
            {/* Nav links with accordion for mega-menu items */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
              {NAV_LINKS.map(link => {
                const hasMenu   = link.label in NAV_MENUS
                const isActive  = pathname === link.href
                const isExpanded = mobileExpandedMenu === link.label

                if (hasMenu) {
                  const mobileMenu = NAV_MENUS[link.label]
                  return (
                    <div key={link.href}>
                      {/* Accordion trigger */}
                      <button
                        onClick={() => setMobileExpandedMenu(isExpanded ? null : link.label)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 24px",
                          borderRadius: 6,
                          background: isActive || isExpanded ? "rgba(255,255,255,0.06)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 16,
                          fontWeight: 500,
                          fontFamily: "'DM Sans', sans-serif",
                          color: isActive ? "#3DBEF5" : "rgba(255,255,255,0.65)",
                          textAlign: "left",
                          minHeight: 44,
                        }}
                      >
                        <span>{link.label}</span>
                        <span style={{ color: "rgba(43,168,224,0.6)" }}>
                          <Chevron rotated={isExpanded} />
                        </span>
                      </button>

                      {/* Accordion body */}
                      {isExpanded && (
                        <div style={{
                          marginLeft: 12,
                          marginBottom: 6,
                          paddingLeft: 12,
                          borderLeft: "1px solid rgba(43,168,224,0.2)",
                          paddingBottom: 6,
                        }}>
                          {/* Quick links (left column) */}
                          <div style={{ marginBottom: 8 }}>
                            {mobileMenu.leftColumn.links.map(l => (
                              <Link
                                key={l.href + l.label}
                                href={l.href}
                                onClick={() => setMenuOpen(false)}
                                style={{
                                  display: "block",
                                  padding: "6px 0",
                                  fontSize: 13,
                                  fontFamily: "'DM Sans', sans-serif",
                                  textDecoration: "none",
                                  color: "rgba(43,168,224,0.82)",
                                  fontWeight: 500,
                                }}
                              >
                                {l.label}
                              </Link>
                            ))}
                          </div>

                          {/* First column (cities / top items) */}
                          {mobileMenu.columns[0] && (
                            <div>
                              <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "rgba(43,168,224,0.5)",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                padding: "4px 0 6px",
                                fontFamily: "'DM Sans', sans-serif",
                              }}>
                                {mobileMenu.columns[0].heading}
                              </div>
                              {mobileMenu.columns[0].links.map(l => (
                                <Link
                                  key={l.href + l.label}
                                  href={l.href}
                                  onClick={() => setMenuOpen(false)}
                                  style={{
                                    display: "block",
                                    padding: "5px 0",
                                    fontSize: 12.5,
                                    fontFamily: "'DM Sans', sans-serif",
                                    textDecoration: "none",
                                    color: "rgba(255,255,255,0.45)",
                                  }}
                                >
                                  {l.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                // Plain nav link (no mega menu)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      padding: "14px 24px",
                      borderRadius: 6,
                      fontSize: 16,
                      fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      textDecoration: "none",
                      color: isActive ? "#3DBEF5" : "rgba(255,255,255,0.65)",
                      background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      display: "block",
                      minHeight: 44,
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Auth section */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
              {mounted && (user ? (
                <>
                  {/* Profile card */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", marginBottom: 6,
                    background: "linear-gradient(135deg, #121519 0%, #0B0D10 100%)",
                    borderRadius: 10, border: "1px solid rgba(43,168,224,0.2)",
                  }}>
                    <Avatar initial={avatarInitial} size={38} ring />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: "#FFFFFF", fontWeight: 600, fontSize: 14,
                        fontFamily: "'DM Sans', sans-serif",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {displayName}
                      </div>
                      {profile?.city && (
                        <div style={{
                          color: "rgba(43,168,224,0.7)", fontSize: 11.5,
                          fontFamily: "'DM Sans', sans-serif",
                        }}>
                          {profile.city}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/profile/edit"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        fontSize: 11, fontWeight: 600, color: "#2BA8E0",
                        fontFamily: "'DM Sans', sans-serif",
                        background: "rgba(43,168,224,0.1)",
                        border: "1px solid rgba(43,168,224,0.25)",
                        borderRadius: 6, padding: "3px 8px",
                        textDecoration: "none",
                      }}
                    >
                      Edit
                    </Link>
                  </div>

                  {/* Quick links */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 8 }}>
                    {MENU_ITEMS.flatMap(g => g.items).map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 8,
                          color: "rgba(255,255,255,0.7)",
                          textDecoration: "none", fontSize: 13.5,
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        <span style={{ color: "rgba(43,168,224,0.55)" }}>
                          <item.icon />
                        </span>
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <button
                    onClick={handleSignOut}
                    style={{
                      width: "100%", padding: "10px 12px",
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(224,85,85,0.08)",
                      border: "1px solid rgba(224,85,85,0.2)",
                      borderRadius: 8, cursor: "pointer",
                      color: "#e05555", fontSize: 13.5,
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                      marginBottom: 8,
                    }}
                  >
                    <IconSignOut />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMenuOpen(false); openAuthModal("signin") }}
                  style={{
                    width: "100%", padding: "10px 16px", marginBottom: 8,
                    fontSize: 14, fontWeight: 500,
                    color: "rgba(255,255,255,0.75)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "block",
                  }}>
                  Sign In
                </button>
              ))}

              <button
                onClick={handleListProperty}
                style={{
                  width: "100%", padding: "11px 16px",
                  fontSize: 14, fontWeight: 600,
                  color: "#0a0a0a",
                  background: "#2BA8E0",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  display: "block",
                }}>
                List Property
              </button>
            </div>
          </div>
        )}

      </header>
    </>
  )
}
