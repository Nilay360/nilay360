"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg" | "icon"
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles = {
  primary: "bg-[#0B0D10] text-[#3DBEF5] hover:bg-[#000000] border border-transparent",
  gold:    "bg-[#2BA8E0] text-[#000000] hover:bg-[#1577B8] border border-transparent font-semibold",
  outline: "bg-transparent text-[#0B0D10] border border-[#0B0D10] hover:bg-[#121519]",
  ghost:   "bg-transparent text-[#6B7C72] border border-[rgba(27,67,50,0.15)] hover:bg-white",
  danger:  "bg-red-600 text-white hover:bg-red-700 border border-transparent",
}

const sizeStyles = {
  sm:   "px-4 py-2 text-[13px] rounded-[6px] gap-1.5",
  md:   "px-6 py-3 text-[14px] rounded-[8px] gap-2",
  lg:   "px-9 py-4 text-[15px] rounded-[8px] gap-2",
  icon: "p-2 rounded-[8px]",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2BA8E0] focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
