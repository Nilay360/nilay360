"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { CITIES, PROPERTY_TYPES, BHK_OPTIONS } from "@/constants"

const TABS = ["Buy", "Rent", "Commercial", "New Projects"] as const
type Tab = typeof TABS[number]

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("Buy")
  const [city, setCity]           = useState("")
  const [propType, setPropType]   = useState("")
  const [bhk, setBhk]             = useState("")
  const [budget, setBudget]       = useState("")

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (city)     params.set("city", city)
    if (propType) params.set("type", propType)
    if (bhk)      params.set("beds", bhk)
    if (budget)   params.set("budget", budget)
    params.set("listing", activeTab.toLowerCase().replace(" ", "-"))
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className={cn("w-full max-w-[860px] mx-auto", className)}>
      {/* Tabs */}
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 text-[13px] font-medium transition-all duration-150 relative",
              "border-t border-x border-transparent rounded-t-[8px]",
              activeTab === tab
                ? "bg-white text-[#020C1C] font-semibold border-[rgba(27,67,50,0.15)]"
                : "bg-[rgba(0,0,0,0.5)] text-white/60 hover:text-white border-transparent"
            )}
          >
            {tab}
            {tab === "New Projects" && (
              <span className="absolute -top-2 -right-1 text-[8px] bg-[#10C4C3] text-[#020C1C] font-bold px-1.5 py-0.5 rounded-full">
                NEW
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search inner */}
      <div className="bg-white rounded-[0_8px_8px_8px] flex items-stretch border border-[rgba(27,67,50,0.15)] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.25)]">

        {/* City */}
        <div className="flex-1 min-w-[120px] border-r border-[rgba(27,67,50,0.1)]">
          <div className="px-4 py-3">
            <div className="text-[9px] font-semibold text-[#6B7C72] uppercase tracking-[0.07em] mb-1">City</div>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full text-[13px] font-medium text-[#020C1C] bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="">All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Property Type */}
        <div className="flex-1 min-w-[120px] border-r border-[rgba(27,67,50,0.1)]">
          <div className="px-4 py-3">
            <div className="text-[9px] font-semibold text-[#6B7C72] uppercase tracking-[0.07em] mb-1">Type</div>
            <select
              value={propType}
              onChange={e => setPropType(e.target.value)}
              className="w-full text-[13px] font-medium text-[#020C1C] bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="">Any Type</option>
              {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* BHK */}
        {activeTab !== "Commercial" && (
          <div className="flex-[0.7] min-w-[90px] border-r border-[rgba(27,67,50,0.1)]">
            <div className="px-4 py-3">
              <div className="text-[9px] font-semibold text-[#6B7C72] uppercase tracking-[0.07em] mb-1">BHK</div>
              <select
                value={bhk}
                onChange={e => setBhk(e.target.value)}
                className="w-full text-[13px] font-medium text-[#020C1C] bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="">Any</option>
                {BHK_OPTIONS.map(b => <option key={b} value={b}>{b}+ BHK</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Budget */}
        <div className="flex-1 min-w-[120px] border-r border-[rgba(27,67,50,0.1)]">
          <div className="px-4 py-3">
            <div className="text-[9px] font-semibold text-[#6B7C72] uppercase tracking-[0.07em] mb-1">Budget</div>
            <select
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="w-full text-[13px] font-medium text-[#020C1C] bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="">Any Budget</option>
              <option value="0-5000000">Under ₹50L</option>
              <option value="5000000-10000000">₹50L – ₹1Cr</option>
              <option value="10000000-20000000">₹1Cr – ₹2Cr</option>
              <option value="20000000-50000000">₹2Cr – ₹5Cr</option>
              <option value="50000000-100000000">₹5Cr – ₹10Cr</option>
              <option value="100000000-999999999">Above ₹10Cr</option>
            </select>
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="px-7 bg-[#10C4C3] hover:bg-[#0B9C9B] text-[#020C1C] font-semibold text-[14px] transition-colors duration-150 flex items-center gap-2 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search
        </button>
      </div>
    </div>
  )
}
