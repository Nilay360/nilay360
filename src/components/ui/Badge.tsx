import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "verified" | "premium" | "new" | "sold" | "rented" | "rera" | "ready" | "featured"
}

const variantStyles = {
  verified: "bg-[#121519] text-[#0B0D10] border border-[#0B0D10]",
  premium:  "bg-[#FBF5E6] text-[#1577B8] border border-[rgba(201,168,76,0.3)]",
  new:      "bg-[#0B0D10] text-[#3DBEF5]",
  sold:     "bg-red-50 text-red-800 border border-red-100",
  rented:   "bg-blue-50 text-blue-800 border border-blue-100",
  rera:     "bg-[#121519] text-[#121519] border border-[#0B0D10]",
  ready:    "bg-[#FBF5E6] text-[#1577B8] border border-[rgba(201,168,76,0.3)]",
  featured: "bg-[#2BA8E0] text-[#000000]",
}

const variantIcons: Record<string, string> = {
  verified: "✓",
  premium:  "★",
  new:      "",
  featured: "★",
  rera:     "✓",
}

export function Badge({ variant = "verified", className, children, ...props }: BadgeProps) {
  const icon = variantIcons[variant]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full",
        "text-[11px] font-medium tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}
