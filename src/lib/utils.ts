import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format price in Indian number system
export function formatPrice(price: number, currency = "₹"): string {
  if (price >= 10000000) return `${currency}${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000)   return `${currency}${(price / 100000).toFixed(2)} L`
  return `${currency}${price.toLocaleString("en-IN")}`
}

// Format area
export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString("en-IN")} sq ft`
}

// Slugify a string
export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

// Truncate text
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str
}

// Calculate EMI
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const r = annualRate / 12 / 100
  if (r === 0) return principal / tenureMonths
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

// Format date
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
