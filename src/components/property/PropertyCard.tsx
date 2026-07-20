"use client"

import React, { useState } from "react"
import Link from "next/link"
import { cn, formatPrice, formatArea } from "@/lib/utils"
import { optimizedImageUrl } from "@/lib/image-url"
import { Badge } from "@/components/ui/Badge"
import { useCompare } from "@/context/CompareContext"

// Mirrors post-property/page.tsx's COMMERCIAL_CATEGORIES — these categories
// store "rooms/cabins" in the bedrooms field, not a BHK count.
const COMMERCIAL_CATEGORIES = ["office", "retail", "warehouse"]

export interface PropertyCardProps {
  id: string
  slug: string
  title: string
  price: number
  listing_type: "sale" | "rent" | "commercial"
  type: string
  city: string
  neighbourhood?: string
  bedrooms?: number
  bathrooms?: number
  area_sqft: number
  images: string[]
  is_featured?: boolean
  is_new_construction?: boolean
  status?: string
  rera_number?: string
  className?: string
  onSave?: (id: string) => void
  isSaved?: boolean
}

export function PropertyCard({
  id, slug, title, price, listing_type, type,
  city, neighbourhood, bedrooms, bathrooms, area_sqft,
  images, is_featured, is_new_construction, status,
  rera_number, className, onSave, isSaved = false,
}: PropertyCardProps) {
  const [saved, setSaved] = useState(isSaved)
  const [imgError, setImgError] = useState(false)
  const { has: isComparing, toggle: toggleCompare, isFull } = useCompare()
  const comparing = isComparing(id)

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSaved(!saved)
    onSave?.(id)
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!comparing && isFull) return
    toggleCompare({
      id, slug, title, price,
      listing_type: listing_type === "rent" ? "rent" : "sale",
      property_type: type, status: status ?? "active",
      bedrooms: bedrooms ?? null, bathrooms: bathrooms ?? null, area_sqft: area_sqft ?? null,
      floor_number: null, total_floors: null, parking_spaces: null, year_built: null,
      is_furnished: null, amenities: [], address: null,
      city, neighbourhood: neighbourhood ?? "", image: images[0] ?? null,
    })
  }

  const priceLabel = listing_type === "rent"
    ? `${formatPrice(price)}/mo`
    : formatPrice(price)

  return (
    <Link href={`/property/${slug}`} className={cn("group block", className)}>
      <div className={cn(
        "bg-white rounded-[16px] border border-[rgba(27,67,50,0.1)]",
        "shadow-[0_2px_12px_rgba(13,43,31,0.06)]",
        "transition-all duration-200",
        "hover:shadow-[0_8px_32px_rgba(13,43,31,0.14)] hover:-translate-y-1",
        "overflow-hidden"
      )}>

        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-[#111F33]">
          {images[0] && !imgError ? (
            <img
              src={optimizedImageUrl(images[0], 600)}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0A1526] to-[#111F33]">
              <span className="text-[#10C4C3] text-[13px] font-medium tracking-widest opacity-60">Nilay 360</span>
            </div>
          )}

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {is_featured && <Badge variant="featured">★ Featured</Badge>}
            {is_new_construction && <Badge variant="new">New Launch</Badge>}
            {status === "sold" && <Badge variant="sold">Sold</Badge>}
            {status === "rented" && <Badge variant="rented">Rented</Badge>}
          </div>

          {/* Save button top-right */}
          <button
            onClick={handleSave}
            aria-label={saved ? "Remove from saved" : "Save property"}
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center",
              "transition-all duration-150",
              saved
                ? "bg-[#10C4C3] text-[#020C1C]"
                : "bg-white/90 text-[#6B7C72] hover:bg-white hover:text-[#10C4C3]"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Compare toggle top-right (left of save) */}
          <button
            onClick={handleCompare}
            aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
            title={!comparing && isFull ? "Comparison is full (max 3)" : comparing ? "Remove from comparison" : "Add to comparison"}
            className={cn(
              "absolute top-3 right-12 h-8 px-2 rounded-full flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
              "transition-all duration-150",
              comparing
                ? "bg-[#10C4C3] text-[#020C1C]"
                : "bg-white/90 text-[#6B7C72] hover:bg-white hover:text-[#10C4C3]",
              !comparing && isFull && "opacity-50 cursor-not-allowed"
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {comparing
                ? <polyline points="20 6 9 17 4 12" />
                : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
            </svg>
            {comparing ? "Added" : "Compare"}
          </button>

          {/* Listing type pill bottom-left */}
          <div className="absolute bottom-3 left-3">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
              listing_type === "rent"       ? "bg-blue-600 text-white" :
              listing_type === "commercial" ? "bg-purple-600 text-white" :
                                             "bg-[#0A1526] text-[#3DDAD9]"
            )}>
              {listing_type === "rent" ? "For Rent" : listing_type === "commercial" ? "Commercial" : "For Sale"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Price */}
          <div className="mb-1">
            <span className="font-display text-[20px] font-semibold text-[#020C1C]">
              {priceLabel}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[13px] font-medium text-[#020C1C] mb-1 line-clamp-1">
            {title}
          </h3>

          {/* Location */}
          <p className="text-[11px] text-[#6B7C72] mb-3 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {neighbourhood ? `${neighbourhood}, ${city}` : city}
          </p>

          {/* Specs */}
          <div className="flex items-center gap-3 pt-3 border-t border-[rgba(27,67,50,0.08)]">
            {bedrooms !== undefined && (
              <div className="flex items-center gap-1 text-[11px] text-[#6B7C72]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 22V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14M3 22h18M3 12h18" />
                </svg>
                <strong className="text-[#020C1C] font-medium">{bedrooms}</strong> {COMMERCIAL_CATEGORIES.includes(type) ? "Rooms" : "BHK"}
              </div>
            )}
            {bathrooms !== undefined && (
              <div className="flex items-center gap-1 text-[11px] text-[#6B7C72]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12h16M4 12V8a2 2 0 0 1 2-2h1M4 12v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                </svg>
                <strong className="text-[#020C1C] font-medium">{bathrooms}</strong> {COMMERCIAL_CATEGORIES.includes(type) ? "Wash" : "Bath"}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px] text-[#6B7C72] ml-auto">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <strong className="text-[#020C1C] font-medium">{formatArea(area_sqft)}</strong>
            </div>
          </div>

          {/* RERA */}
          {rera_number && (
            <div className="mt-2">
              <Badge variant="rera">RERA: {rera_number.slice(0, 12)}...</Badge>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
