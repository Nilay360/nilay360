import React from "react"
import { cn } from "@/lib/utils"

// ── SectionHeader ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: "left" | "center"
  className?: string
  dark?: boolean
}

export function SectionHeader({
  eyebrow, title, subtitle,
  align = "center", className, dark = false,
}: SectionHeaderProps) {
  return (
    <div className={cn(
      "mb-10",
      align === "center" && "text-center",
      className
    )}>
      {eyebrow && (
        <p className={cn(
          "text-[11px] font-semibold tracking-[0.18em] uppercase mb-3",
          dark ? "text-[#10C4C3]" : "text-[#10C4C3]"
        )}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn(
        "font-display font-semibold leading-tight",
        "text-[2rem] md:text-[2.5rem]",
        dark ? "text-white" : "text-[#020C1C]"
      )}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn(
          "mt-3 text-[15px] leading-relaxed max-w-[560px]",
          align === "center" && "mx-auto",
          dark ? "text-white/60" : "text-[#6B7C72]"
        )}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  value: string
  label: string
  dark?: boolean
  className?: string
}

export function StatCard({ value, label, dark = true, className }: StatCardProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className={cn(
        "font-display text-[2rem] font-semibold leading-none mb-1",
        dark ? "text-[#3DDAD9]" : "text-[#0A1526]"
      )}>
        {value}
      </div>
      <div className={cn(
        "text-[11px] font-medium uppercase tracking-[0.06em]",
        dark ? "text-white/45" : "text-[#6B7C72]"
      )}>
        {label}
      </div>
    </div>
  )
}

// ── GoldDivider ───────────────────────────────────────────────────────────────
interface GoldDividerProps {
  label?: string
  className?: string
}

export function GoldDivider({ label, className }: GoldDividerProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-px bg-[rgba(201,168,76,0.3)]" />
      {label && (
        <span className="text-[11px] font-medium text-[#10C4C3] tracking-[0.1em] uppercase">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-[rgba(201,168,76,0.3)]" />
    </div>
  )
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className={cn("animate-spin text-[#10C4C3]", className)}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[16px] border border-[rgba(27,67,50,0.1)] overflow-hidden animate-pulse">
      <div className="h-48 bg-[#E8E3D8]" />
      <div className="p-4">
        <div className="h-5 bg-[#E8E3D8] rounded w-2/3 mb-2" />
        <div className="h-4 bg-[#E8E3D8] rounded w-1/2 mb-4" />
        <div className="h-3 bg-[#E8E3D8] rounded w-full" />
      </div>
    </div>
  )
}
