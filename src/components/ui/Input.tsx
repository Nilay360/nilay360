import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-medium text-[#111F33] tracking-wide uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[#6B7C72] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full px-4 py-3 rounded-[8px] text-[14px] font-normal",
              "bg-white text-[#020C1C] placeholder:text-[#6B7C72]",
              "border border-[rgba(27,67,50,0.15)]",
              "transition-all duration-150",
              "focus:outline-none focus:border-[#10C4C3] focus:ring-2 focus:ring-[rgba(201,168,76,0.15)]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#020C1C]",
              error && "border-red-400 focus:border-red-400 focus:ring-red-100",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-[#6B7C72]">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        {hint && !error && <p className="text-[12px] text-[#6B7C72]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"


export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-[12px] font-medium text-[#111F33] tracking-wide uppercase">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full px-4 py-3 rounded-[8px] text-[14px]",
            "bg-white text-[#020C1C]",
            "border border-[rgba(27,67,50,0.15)]",
            "focus:outline-none focus:border-[#10C4C3] focus:ring-2 focus:ring-[rgba(201,168,76,0.15)]",
            "disabled:opacity-50 cursor-pointer",
            error && "border-red-400",
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = "Select"
