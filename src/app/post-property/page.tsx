'use client'

import React, {
  useReducer, useEffect, useRef, useCallback, DragEvent,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import LocationPicker, { ReverseGeocodedAddress } from '@/components/LocationPicker'
import { useVideoUpload, MAX_VIDEO_BYTES as VIDEO_MAX_BYTES, MAX_VIDEO_SECONDS } from '@/hooks/useVideoUpload'

// ─── Types ─────────────────────────────────────────────────────────────────────

type ListingType = 'sale' | 'rent' | 'commercial'
type PropertyCategory =
  | 'apartment' | 'villa' | 'plot' | 'office'
  | 'retail' | 'penthouse' | 'townhouse' | 'warehouse'

interface UploadedPhoto {
  id: string
  file: File
  preview: string
}

interface UploadedFloorPlan {
  id: string
  file: File
  preview: string
  label: string
}

interface FormState {
  // Step 1
  listingType: ListingType | ''
  propertyCategory: PropertyCategory | ''
  // Step 2
  address: string
  locality: string
  city: string
  stateField: string
  pincode: string
  landmark: string
  latitude: number | null
  longitude: number | null
  // Step 3
  areaSqft: string
  bedrooms: string
  bathrooms: string
  balconies: string
  floor: string
  totalFloors: string
  facing: string
  propertyAge: string
  furnishing: string
  coveredParking: string
  openParking: string
  // Step 4
  price: string
  isNegotiable: boolean
  possessionStatus: string
  maintenanceCharges: string
  // ₹/sq.ft calculator (sale only) — separate from areaSqft (Step 3's
  // built-up area) by deliberate decision, never derived from or
  // written into price or areaSqft.
  pricePerSqftArea: string
  pricePerSqft: string
  showPricePerSqft: boolean
  // Rental-only: maintenance mode (amount still uses maintenanceCharges
  // above — see migration 070's comment), deposit, availability, tenant
  maintenanceType: 'included' | 'additional'
  depositAmount: string
  availableFrom: string
  preferredTenant: string
  // Sale-only
  listedBy: string
  reraNumber: string
  // Shared (brokerage): mode's option set differs by listing type
  // (days'/months' rent vs percentage/fixed) but it's one field either
  // way, since a listing is only ever one type.
  brokerageMode: string
  brokerageValue: string
  showBrokerageDetails: boolean
  // Step 5
  amenities: string[]
  highlights: string
  // Step 6
  photos: UploadedPhoto[]
  coverPhotoIndex: number
  videoAssetProvider: string | null
  videoAssetId: string | null
  videoAssetStatus: 'processing' | 'ready' | 'failed' | null
  videoAssetThumbnailUrl: string | null
  // True only while a video is actively validating/uploading (mirrors
  // useVideoUpload's phase) — used solely to gate "Continue →" at step 6,
  // since Step6 unmounts on navigation and the hook's own local state
  // would otherwise be lost the moment that happens. Never sent to the
  // server; not part of any submit payload.
  videoUploadBusy: boolean
  // Step 7
  floorPlans: UploadedFloorPlan[]
  // Step 8
  sellerName: string
  sellerEmail: string
  sellerPhone: string
  sellerWhatsapp: string
  agreeToTerms: boolean
  ownershipWarranty: boolean
  capture360Requested: boolean
  // Requester's preference, distinct from capture_360_requests'
  // admin-set scheduled_date/scheduled_time_slot — see migration 071's
  // comment. Both optional even when the toggle is on.
  capture360PreferredDate: string
  capture360PreferredTimeSlot: string
}

type Action =
  | { type: 'SET'; field: keyof FormState; value: unknown }
  | { type: 'TOGGLE_AMENITY'; amenity: string }
  | { type: 'ADD_PHOTOS'; photos: UploadedPhoto[] }
  | { type: 'REMOVE_PHOTO'; id: string }
  | { type: 'SET_COVER'; index: number }
  | { type: 'REORDER'; photos: UploadedPhoto[]; cover: number }
  | { type: 'ADD_FLOOR_PLANS'; floorPlans: UploadedFloorPlan[] }
  | { type: 'REMOVE_FLOOR_PLAN'; id: string }
  | { type: 'SET_FLOOR_PLAN_LABEL'; id: string; label: string }
  | { type: 'LOAD_DRAFT'; partial: Partial<Omit<FormState, 'photos' | 'floorPlans'>> }
  | { type: 'PREFILL_SELLER_EMAIL'; email: string }
  | { type: 'PREFILL_SELLER_NAME'; name: string }
  | { type: 'PREFILL_SELLER_PHONE'; phone: string }

const INITIAL: FormState = {
  listingType: '', propertyCategory: '',
  address: '', locality: '', city: '', stateField: '', pincode: '', landmark: '',
  latitude: null, longitude: null,
  areaSqft: '', bedrooms: '', bathrooms: '', balconies: '', floor: '',
  totalFloors: '', facing: '', propertyAge: '', furnishing: '',
  coveredParking: '', openParking: '',
  price: '', isNegotiable: false, possessionStatus: '', maintenanceCharges: '',
  pricePerSqftArea: '', pricePerSqft: '', showPricePerSqft: false,
  maintenanceType: 'included', depositAmount: '', availableFrom: '', preferredTenant: '',
  listedBy: '', reraNumber: '',
  brokerageMode: '', brokerageValue: '', showBrokerageDetails: false,
  amenities: [], highlights: '',
  photos: [], coverPhotoIndex: 0,
  videoAssetProvider: null, videoAssetId: null, videoAssetStatus: null, videoAssetThumbnailUrl: null,
  videoUploadBusy: false,
  floorPlans: [],
  sellerName: '', sellerEmail: '', sellerPhone: '', sellerWhatsapp: '',
  agreeToTerms: false,
  ownershipWarranty: false,
  capture360Requested: false,
  capture360PreferredDate: '', capture360PreferredTimeSlot: '',
}

function reducer(s: FormState, a: Action): FormState {
  switch (a.type) {
    case 'SET': return { ...s, [a.field]: a.value }
    case 'TOGGLE_AMENITY':
      return {
        ...s,
        amenities: s.amenities.includes(a.amenity)
          ? s.amenities.filter(x => x !== a.amenity)
          : [...s.amenities, a.amenity],
      }
    case 'ADD_PHOTOS': return { ...s, photos: [...s.photos, ...a.photos] }
    case 'REMOVE_PHOTO': {
      const idx = s.photos.findIndex(p => p.id === a.id)
      const photos = s.photos.filter(p => p.id !== a.id)
      let cover = s.coverPhotoIndex
      if (idx === cover) cover = 0
      else if (idx < cover) cover = cover - 1
      return { ...s, photos, coverPhotoIndex: Math.max(0, cover) }
    }
    case 'SET_COVER': return { ...s, coverPhotoIndex: a.index }
    case 'REORDER': return { ...s, photos: a.photos, coverPhotoIndex: a.cover }
    case 'ADD_FLOOR_PLANS': return { ...s, floorPlans: [...s.floorPlans, ...a.floorPlans] }
    case 'REMOVE_FLOOR_PLAN': return { ...s, floorPlans: s.floorPlans.filter(p => p.id !== a.id) }
    case 'SET_FLOOR_PLAN_LABEL':
      return { ...s, floorPlans: s.floorPlans.map(p => p.id === a.id ? { ...p, label: a.label } : p) }
    case 'LOAD_DRAFT': return { ...s, ...a.partial, photos: [], floorPlans: [] }
    // Only fills in a still-blank field — never overwrites a value the
    // user already typed or restored from a saved draft, regardless of
    // whether this resolves before or after LOAD_DRAFT.
    case 'PREFILL_SELLER_EMAIL': return s.sellerEmail ? s : { ...s, sellerEmail: a.email }
    // Same "only fill if still blank" rule as PREFILL_SELLER_EMAIL above,
    // applied to name/phone sourced from the profiles table instead of
    // the raw auth session.
    case 'PREFILL_SELLER_NAME': return s.sellerName ? s : { ...s, sellerName: a.name }
    case 'PREFILL_SELLER_PHONE': return s.sellerPhone ? s : { ...s, sellerPhone: a.phone }
    default: return s
  }
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0a',
  surface: '#0f0f0f',
  surface2: '#161616',
  border: '#1e1e1e',
  green: '#0A1526',
  greenMid: '#111F33',
  gold: '#10C4C3',
  goldDim: 'rgba(201,168,76,0.10)',
  goldBorder: 'rgba(201,168,76,0.30)',
  text: '#F5F2EC',
  textSub: '#9a9a9a',
  textMuted: '#8A8A8A',
  errorBg: 'rgba(224,85,85,0.10)',
  errorBorder: 'rgba(224,85,85,0.30)',
  error: '#e05555',
} as const

const FD = 'var(--font-heading-new)'
const FB = 'var(--font-body-new)'

// ─── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  inp: {
    width: '100%',
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '12px 16px',
    color: C.text,
    fontSize: '0.9375rem',
    fontFamily: FB,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,

  lbl: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: C.textSub,
    marginBottom: 6,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    fontFamily: FB,
  } as React.CSSProperties,

  btnPrimary: {
    background: `linear-gradient(135deg, ${C.gold} 0%, #0B9C9B 100%)`,
    color: '#0a0a0a',
    fontFamily: FB,
    fontWeight: 600,
    fontSize: '0.9375rem',
    padding: '13px 32px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'opacity 0.15s',
  } as React.CSSProperties,

  btnSecondary: {
    background: 'transparent',
    color: C.textSub,
    fontFamily: FB,
    fontWeight: 500,
    fontSize: '0.9375rem',
    padding: '13px 24px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  } as React.CSSProperties,

  stepTitle: {
    fontFamily: FD,
    fontSize: 'clamp(1.4rem, 3vw, 1.875rem)',
    fontWeight: 600,
    color: C.text,
    margin: '0 0 4px',
    lineHeight: 1.2,
  } as React.CSSProperties,

  stepSub: {
    fontSize: '0.875rem',
    color: C.textMuted,
    margin: '0 0 28px',
    fontFamily: FB,
  } as React.CSSProperties,

  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  } as React.CSSProperties,
} as const

// ─── Constants ─────────────────────────────────────────────────────────────────

const LISTING_TYPES = [
  { value: 'sale' as ListingType, label: 'For Sale', desc: 'Sell your residential or commercial property', icon: '🏷️' },
  { value: 'rent' as ListingType, label: 'For Rent', desc: 'Rent out your residential property', icon: '🔑' },
  { value: 'commercial' as ListingType, label: 'Commercial', desc: 'Offices, shops & industrial spaces', icon: '🏢' },
]

const CATEGORIES: Record<string, Array<{ value: PropertyCategory; label: string; icon: string }>> = {
  sale: [
    { value: 'apartment', label: 'Apartment', icon: '🏢' },
    { value: 'villa',     label: 'Villa',       icon: '🏡' },
    { value: 'plot',      label: 'Plot / Land',  icon: '📐' },
    { value: 'penthouse', label: 'Penthouse',   icon: '🌆' },
    { value: 'townhouse', label: 'Townhouse',   icon: '🏘️' },
  ],
  rent: [
    { value: 'apartment', label: 'Apartment', icon: '🏢' },
    { value: 'villa',     label: 'Villa',      icon: '🏡' },
    { value: 'townhouse', label: 'Townhouse',  icon: '🏘️' },
  ],
  commercial: [
    { value: 'office',    label: 'Office Space', icon: '🏦' },
    { value: 'retail',    label: 'Retail Shop',  icon: '🏪' },
    { value: 'warehouse', label: 'Warehouse',    icon: '🏭' },
  ],
}

// Categories where "bedrooms" really means rooms/cabins, not BHK — used to keep
// the wizard, validation, and review summary from talking about "BHK" for a
// commercial listing. Property detail page display mirrors this list.
const COMMERCIAL_CATEGORIES = ['office', 'retail', 'warehouse']

const CITIES = ['Hyderabad', 'Mumbai', 'Bengaluru', 'Delhi NCR', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']

const PP_CITY_STATE_MAP: Record<string, string> = {
  'Hyderabad': 'Telangana', 'Mumbai': 'Maharashtra', 'Pune': 'Maharashtra',
  'Bengaluru': 'Karnataka', 'Delhi NCR': 'Delhi', 'Chennai': 'Tamil Nadu',
  'Kolkata': 'West Bengal', 'Ahmedabad': 'Gujarat',
}

const PP_PINCODE_MAP: Record<string, { state: string; city: string }> = {
  '500': { state: 'Telangana',      city: 'Hyderabad'  },
  '400': { state: 'Maharashtra',    city: 'Mumbai'     },
  '411': { state: 'Maharashtra',    city: 'Pune'       },
  '560': { state: 'Karnataka',      city: 'Bengaluru'  },
  '110': { state: 'Delhi',          city: 'Delhi NCR'  },
  '600': { state: 'Tamil Nadu',     city: 'Chennai'    },
  '700': { state: 'West Bengal',    city: 'Kolkata'    },
  '380': { state: 'Gujarat',        city: 'Ahmedabad'  },
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

const FACING_OPTS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']

const AGE_OPTS = [
  { value: 'new',   label: 'New / Under Construction' },
  { value: '0-1',   label: 'Less than 1 year' },
  { value: '1-3',   label: '1–3 years' },
  { value: '3-5',   label: '3–5 years' },
  { value: '5-10',  label: '5–10 years' },
  { value: '10+',   label: 'More than 10 years' },
]

const FURNISH_OPTS = [
  { value: 'unfurnished',     label: 'Unfurnished' },
  { value: 'semi-furnished',  label: 'Semi-Furnished' },
  { value: 'fully-furnished', label: 'Fully Furnished' },
]

const POSSESSION_OPTS = [
  { value: 'ready_to_move',      label: 'Ready to Move' },
  { value: 'under_construction', label: 'Under Construction' },
  { value: 'new_launch',         label: 'New Launch' },
]

const AMENITIES_LIST = [
  'Swimming Pool', 'Gym / Fitness Centre', 'Clubhouse', '24/7 Security',
  'Power Backup', 'Lift / Elevator', 'Covered Parking', 'Garden / Lawn',
  "Children's Play Area", 'Jogging Track', 'Intercom', 'CCTV Surveillance',
  'Concierge Service', 'Rooftop Terrace', 'EV Charging', 'Smart Home',
  'High-Speed Internet', 'Air Conditioning', 'Balcony', 'Vastu Compliant',
]

const STEP_LABELS = ['Listing Type', 'Location', 'Details', 'Pricing', 'Amenities', 'Photos', 'Floor Plans', 'Review']

// ─── Helpers ───────────────────────────────────────────────────────────────────

// profile.phone is stored as "+91" + 10 digits (see api/verify-otp/route.ts) —
// sellerPhone here is a bare 10-digit field (validated as /^\d{10}$/ in
// validate() below), so the stored prefix must be stripped before
// prefilling or it fails that validation. Same helper as
// PropertyDetailClient.tsx / contact/page.tsx, duplicated rather than
// shared per this codebase's existing convention for small file-local
// utilities.
function stripIndianCountryCode(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length === 12 && digitsOnly.startsWith('91') ? digitsOnly.slice(2) : digitsOnly
}

// Fixed truncation bug: the previous version split the price into
// separate crore/lakh/thousand integer buckets via floor+modulo, and
// only showed the thousands remainder when `!cr && !lk` — so any
// amount with a non-zero lakh AND a non-zero thousands remainder (e.g.
// 1,575,000 = 15 lakh + 75 thousand) silently dropped the 75,000,
// displaying "₹15 Lakh" instead of the real amount. Fixed by reusing
// the same divide-and-.toFixed(2) approach already verified correct in
// PropertyDetailClient.tsx's formatPrice() (sale branch) — a single
// decimal division has no separate remainder bucket to lose precision
// on. Not imported directly (that function lives in a different file/
// rendering context, matching this codebase's existing convention of
// small per-file local helpers), but the logic itself is the same.
function toCrore(raw: string): string {
  const n = Number(raw)
  if (!n || isNaN(n)) return ''
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── Primitive components ───────────────────────────────────────────────────────

function Pill({ text, active, onClick }: { text: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 18px',
        borderRadius: 999,
        border: `1px solid ${active ? C.gold : C.border}`,
        background: active ? C.goldDim : 'transparent',
        color: active ? C.gold : C.textSub,
        fontFamily: FB,
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >{text}</button>
  )
}

function FField({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : {}}>
      <label style={S.lbl}>{label}</label>
      {children}
    </div>
  )
}

function TInput({
  value, onChange, placeholder, type = 'text', maxLen, prefix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLen?: number
  prefix?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: C.textMuted, fontSize: '0.9rem', pointerEvents: 'none', fontFamily: FB,
        }}>{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLen}
        style={{ ...S.inp, ...(prefix ? { paddingLeft: 32 } : {}) }}
      />
    </div>
  )
}

function SInput({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...S.inp, appearance: 'none', cursor: 'pointer', paddingRight: 40 }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{
        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        color: C.textMuted, pointerEvents: 'none', fontSize: '0.7rem',
      }}>▼</span>
    </div>
  )
}

// ─── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', overflowX: 'auto',
      paddingBottom: 4, gap: 0,
    }}>
      {STEP_LABELS.map((lbl, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <React.Fragment key={n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? C.green : active ? C.gold : C.surface2,
                border: `2px solid ${done ? C.greenMid : active ? C.gold : C.border}`,
                color: done ? '#fff' : active ? '#0a0a0a' : C.textMuted,
                fontSize: '0.75rem', fontWeight: 700, fontFamily: FB,
                transition: 'all 0.25s',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{
                fontSize: '0.6rem', marginTop: 5, fontFamily: FB, fontWeight: active ? 600 : 400,
                color: active ? C.gold : done ? C.textSub : C.textMuted,
                whiteSpace: 'nowrap', letterSpacing: '0.03em', textTransform: 'uppercase',
              }}>{lbl}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: '1 1 16px', height: 2, marginTop: 15, minWidth: 12,
                background: done ? C.greenMid : C.border,
                transition: 'background 0.25s',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Step 1: Listing type ───────────────────────────────────────────────────────

function Step1({
  state, dispatch,
}: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const cats = state.listingType ? (CATEGORIES[state.listingType] ?? []) : []

  return (
    <div>
      <h2 style={S.stepTitle}>What would you like to do?</h2>
      <p style={S.stepSub}>Select the intent for your listing</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
        {LISTING_TYPES.map(lt => {
          const on = state.listingType === lt.value
          return (
            <button
              key={lt.value} type="button"
              onClick={() => {
                dispatch({ type: 'SET', field: 'listingType', value: lt.value })
                dispatch({ type: 'SET', field: 'propertyCategory', value: '' })
              }}
              style={{
                padding: '22px 16px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${on ? C.gold : C.border}`,
                background: on ? C.goldDim : C.surface2,
                textAlign: 'left', position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {on && (
                <span style={{
                  position: 'absolute', top: 10, right: 10, width: 18, height: 18,
                  borderRadius: '50%', background: C.gold, color: '#0a0a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800,
                }}>✓</span>
              )}
              <div style={{ fontSize: '1.875rem', marginBottom: 10 }}>{lt.icon}</div>
              <div style={{ fontFamily: FD, fontSize: '1.125rem', fontWeight: 600, color: on ? C.gold : C.text, marginBottom: 4 }}>{lt.label}</div>
              <div style={{ fontSize: '0.8rem', color: C.textMuted, lineHeight: 1.45 }}>{lt.desc}</div>
            </button>
          )
        })}
      </div>

      {cats.length > 0 && (
        <div>
          <p style={{ ...S.lbl, marginBottom: 12 }}>Property Category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {cats.map(cat => {
              const on = state.propertyCategory === cat.value
              return (
                <button
                  key={cat.value} type="button"
                  onClick={() => dispatch({ type: 'SET', field: 'propertyCategory', value: cat.value })}
                  style={{
                    padding: '10px 20px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${on ? C.gold : C.border}`,
                    background: on ? C.goldDim : 'transparent',
                    color: on ? C.gold : C.textSub,
                    fontFamily: FB, fontSize: '0.9rem', fontWeight: on ? 600 : 400,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────

function Step2({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const f = (field: keyof FormState) => (v: string) => dispatch({ type: 'SET', field, value: v })

  const handleCity = (v: string) => {
    dispatch({ type: 'SET', field: 'city', value: v })
    const autoState = PP_CITY_STATE_MAP[v]
    if (autoState) dispatch({ type: 'SET', field: 'stateField', value: autoState })
  }

  const handlePincode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    dispatch({ type: 'SET', field: 'pincode', value: digits })
    if (digits.length >= 3) {
      const match = PP_PINCODE_MAP[digits.slice(0, 3)]
      if (match) {
        dispatch({ type: 'SET', field: 'city', value: match.city })
        dispatch({ type: 'SET', field: 'stateField', value: match.state })
      }
    }
  }

  // "Confirm Location" fills each field only if it is still blank — a
  // seller who already typed their own address (Path A) keeps exactly
  // what they typed; a seller who dropped/searched a pin first (Path B)
  // gets the fields filled from the reverse-geocoded result. Same
  // non-destructive rule as PREFILL_SELLER_EMAIL/NAME/PHONE. city/state
  // arrive already normalized against this form's own CITIES/STATES
  // lists (or omitted when LocationPicker couldn't match either) — never
  // dispatched at all when omitted, so a non-matching value is never
  // written into those <select>s.
  const handleConfirmLocation = (addr: ReverseGeocodedAddress) => {
    if (!state.address && addr.address) dispatch({ type: 'SET', field: 'address', value: addr.address })
    if (!state.locality && addr.locality) dispatch({ type: 'SET', field: 'locality', value: addr.locality })
    if (!state.city && addr.city) dispatch({ type: 'SET', field: 'city', value: addr.city })
    if (!state.stateField && addr.state) dispatch({ type: 'SET', field: 'stateField', value: addr.state })
    if (!state.pincode && addr.pincode) dispatch({ type: 'SET', field: 'pincode', value: addr.pincode })
  }

  return (
    <div>
      <h2 style={S.stepTitle}>Where is the property?</h2>
      <p style={S.stepSub}>Accurate location helps buyers find you faster</p>

      <div style={{ display: 'grid', gap: 18 }}>
        <FField label="Street Address *">
          <TInput value={state.address} onChange={f('address')} placeholder="e.g., Plot 45, Kaveri Nagar, Road No. 3" />
        </FField>

        <div style={S.grid2}>
          <FField label="Locality / Area *">
            <TInput value={state.locality} onChange={f('locality')} placeholder="e.g., Banjara Hills, Koramangala" />
          </FField>
          <FField label="City *">
            <SInput
              value={state.city}
              onChange={handleCity}
              options={CITIES.map(c => ({ value: c, label: c }))}
              placeholder="Select city"
            />
          </FField>
        </div>

        <div style={S.grid2}>
          <FField label="State *">
            <SInput
              value={state.stateField}
              onChange={f('stateField')}
              options={STATES.map(s => ({ value: s, label: s }))}
              placeholder="Select state"
            />
          </FField>
          <FField label="Pincode *">
            <TInput
              value={state.pincode}
              onChange={handlePincode}
              placeholder="6-digit pincode"
            />
          </FField>
        </div>

        <FField label="Landmark (Optional)">
          <TInput value={state.landmark} onChange={f('landmark')} placeholder="e.g., Near Inorbit Mall, opposite HDFC Bank" />
        </FField>

        <FField label="Pin the exact location (Optional)">
          <LocationPicker
            latitude={state.latitude}
            longitude={state.longitude}
            address={state.address}
            locality={state.locality}
            city={state.city}
            state={state.stateField}
            pincode={state.pincode}
            onChange={(lat, lng) => {
              dispatch({ type: 'SET', field: 'latitude', value: lat })
              dispatch({ type: 'SET', field: 'longitude', value: lng })
            }}
            onConfirm={handleConfirmLocation}
          />
        </FField>
      </div>
    </div>
  )
}

// ─── Step 3: Property Details ─────────────────────────────────────────────────

function Step3({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const f = (field: keyof FormState) => (v: string) => dispatch({ type: 'SET', field, value: v })
  const isPlot = state.propertyCategory === 'plot'
  const isComm = COMMERCIAL_CATEGORIES.includes(state.propertyCategory)

  const numPills = (count: number, start = 1) =>
    Array.from({ length: count }, (_, i) => String(i + start))

  return (
    <div>
      <h2 style={S.stepTitle}>Property Details</h2>
      <p style={S.stepSub}>Tell buyers exactly what your property offers</p>

      <div style={{ display: 'grid', gap: 22 }}>
        {/* Area + Facing */}
        <div style={S.grid2}>
          <FField label="Built-up Area (sq ft) *">
            <TInput
              value={state.areaSqft}
              onChange={v => dispatch({ type: 'SET', field: 'areaSqft', value: v.replace(/\D/g, '') })}
              placeholder="e.g., 1200"
            />
          </FField>
          <FField label="Facing Direction">
            <SInput
              value={state.facing}
              onChange={f('facing')}
              options={FACING_OPTS.map(fo => ({ value: fo.toLowerCase().replace(/\s/g, '-'), label: fo }))}
              placeholder="Select facing"
            />
          </FField>
        </div>

        {/* Bedrooms — skip for plots */}
        {!isPlot && (
          <div>
            <p style={S.lbl}>{isComm ? 'Rooms / Cabins *' : 'Bedrooms *'}</p>
            {isComm ? (
              <TInput
                value={state.bedrooms}
                onChange={v => dispatch({ type: 'SET', field: 'bedrooms', value: v.replace(/\D/g, '') })}
                placeholder="Number of rooms or open floor"
              />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...numPills(5), '5+'].map(n => (
                  <Pill key={n} text={`${n} BHK`} active={state.bedrooms === n}
                    onClick={() => dispatch({ type: 'SET', field: 'bedrooms', value: n })} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bathrooms + Balconies */}
        {!isPlot && (
          <div style={S.grid2}>
            <div>
              <p style={S.lbl}>Bathrooms</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...numPills(4), '5+'].map(n => (
                  <Pill key={n} text={n} active={state.bathrooms === n}
                    onClick={() => dispatch({ type: 'SET', field: 'bathrooms', value: n })} />
                ))}
              </div>
            </div>
            <div>
              <p style={S.lbl}>Balconies</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['0', ...numPills(4)].map(n => (
                  <Pill key={n} text={n === '0' ? 'None' : n} active={state.balconies === n}
                    onClick={() => dispatch({ type: 'SET', field: 'balconies', value: n })} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floor info */}
        {!isPlot && (
          <div style={S.grid2}>
            <FField label="Floor Number">
              <TInput
                value={state.floor}
                onChange={v => dispatch({ type: 'SET', field: 'floor', value: v.replace(/\D/g, '') })}
                placeholder="e.g., 5"
              />
            </FField>
            <FField label="Total Floors in Building">
              <TInput
                value={state.totalFloors}
                onChange={v => dispatch({ type: 'SET', field: 'totalFloors', value: v.replace(/\D/g, '') })}
                placeholder="e.g., 20"
              />
            </FField>
          </div>
        )}

        {/* Age + Furnishing */}
        <div style={S.grid2}>
          <FField label="Property Age">
            <SInput value={state.propertyAge} onChange={f('propertyAge')} options={AGE_OPTS} placeholder="Select age" />
          </FField>
          {!isPlot && (
            <div>
              <p style={S.lbl}>Furnishing Status</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FURNISH_OPTS.map(fo => (
                  <Pill key={fo.value} text={fo.label} active={state.furnishing === fo.value}
                    onClick={() => dispatch({ type: 'SET', field: 'furnishing', value: fo.value })} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Parking */}
        <div style={S.grid2}>
          <FField label="Covered Parking">
            <TInput
              value={state.coveredParking}
              onChange={v => dispatch({ type: 'SET', field: 'coveredParking', value: v.replace(/\D/g, '') })}
              placeholder="e.g., 1"
            />
          </FField>
          <FField label="Open Parking">
            <TInput
              value={state.openParking}
              onChange={v => dispatch({ type: 'SET', field: 'openParking', value: v.replace(/\D/g, '') })}
              placeholder="e.g., 2"
            />
          </FField>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Pricing ──────────────────────────────────────────────────────────

function Step4({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const set = (field: keyof FormState, value: unknown) => dispatch({ type: 'SET', field, value })
  const isRent = state.listingType === 'rent'
  const isSale = state.listingType === 'sale'
  const crore = toCrore(state.price)
  const priceNum = Number(state.price)
  const areaNum = Number(state.areaSqft)
  const ppsf = !isRent && priceNum && areaNum ? Math.round(priceNum / areaNum) : 0

  // ₹/sq.ft calculator (sale only) — deliberately separate from areaSqft
  // (Step 3's required Built-up Area, used for the informational ppsf
  // badge above) per an explicit decision: this is its own optional
  // pair of fields an agent fills in only to compute/display a public
  // ₹/sq.ft figure, never derived from or written back into built-up
  // area or the main price.
  const psfAreaNum = Number(state.pricePerSqftArea)
  const psfRateNum = Number(state.pricePerSqft)
  const psfPreviewTotal = psfAreaNum > 0 && psfRateNum > 0 ? Math.round(psfAreaNum * psfRateNum) : null

  return (
    <div>
      <h2 style={S.stepTitle}>Pricing & Possession</h2>
      <p style={S.stepSub}>Set your expected {isRent ? 'monthly rent' : 'sale price'}</p>

      <div style={{ display: 'grid', gap: 22 }}>
        {/* Price input */}
        <div>
          <label style={S.lbl}>Expected {isRent ? 'Monthly Rent' : 'Price'} (₹) *</label>
          <TInput
            value={state.price ? Number(state.price).toLocaleString('en-IN') : ''}
            onChange={v => set('price', v.replace(/\D/g, ''))}
            placeholder={isRent ? 'Monthly rent in rupees' : 'Sale price in rupees'}
            prefix="₹"
          />
          {crore && (
            <div style={{
              marginTop: 10, padding: '12px 18px', borderRadius: 10,
              background: C.goldDim, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontFamily: FD, fontSize: '1.5rem', color: C.gold, fontWeight: 600 }}>{crore}</span>
              {ppsf > 0 && (
                <span style={{
                  fontSize: '0.8125rem', color: C.textMuted, fontFamily: FB,
                  borderLeft: `1px solid ${C.goldBorder}`, paddingLeft: 12,
                }}>
                  ₹{ppsf.toLocaleString('en-IN')}<span style={{ fontSize: '0.7rem' }}>/sq ft</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Negotiable toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px', background: C.surface2,
          borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontFamily: FB, fontWeight: 500, color: C.text, fontSize: '0.9375rem' }}>Price Negotiable</div>
            <div style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: 2 }}>Allow buyers to negotiate the listed price</div>
          </div>
          <button
            type="button"
            onClick={() => set('isNegotiable', !state.isNegotiable)}
            style={{
              width: 46, height: 26, borderRadius: 999, border: 'none', flexShrink: 0,
              background: state.isNegotiable ? C.gold : C.border,
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: state.isNegotiable ? 23 : 3,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Possession status */}
        <div>
          <p style={S.lbl}>Possession Status *</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {POSSESSION_OPTS.map(po => (
              <Pill key={po.value} text={po.label}
                active={state.possessionStatus === po.value}
                onClick={() => set('possessionStatus', po.value)} />
            ))}
          </div>
        </div>

        {/* Maintenance — sale keeps the original plain ₹/month field
            unchanged; rent upgrades it to a mode toggle, reusing the
            same maintenanceCharges field for the amount (see migration
            070's comment) rather than adding a second ₹ field. */}
        {isRent ? (
          <div>
            <p style={S.lbl}>Maintenance *</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: state.maintenanceType === 'additional' ? 12 : 0 }}>
              <Pill text="Included" active={state.maintenanceType === 'included'}
                onClick={() => set('maintenanceType', 'included')} />
              <Pill text="Additional" active={state.maintenanceType === 'additional'}
                onClick={() => set('maintenanceType', 'additional')} />
            </div>
            {state.maintenanceType === 'additional' && (
              <TInput
                value={state.maintenanceCharges}
                onChange={v => set('maintenanceCharges', v.replace(/\D/g, ''))}
                placeholder="e.g., 5000"
                prefix="₹"
              />
            )}
          </div>
        ) : (
          <FField label="Monthly Maintenance Charges (Optional)">
            <TInput
              value={state.maintenanceCharges}
              onChange={v => set('maintenanceCharges', v.replace(/\D/g, ''))}
              placeholder="e.g., 5000"
              prefix="₹"
            />
          </FField>
        )}

        {/* Rental-only: deposit, availability, tenant preference */}
        {isRent && (
          <div style={S.grid2}>
            <FField label="Security Deposit (Optional)">
              <TInput
                value={state.depositAmount}
                onChange={v => set('depositAmount', v.replace(/\D/g, ''))}
                placeholder="e.g., 100000"
                prefix="₹"
              />
            </FField>
            <FField label="Available From (Optional)">
              <input
                type="date"
                value={state.availableFrom}
                onChange={e => set('availableFrom', e.target.value)}
                style={S.inp}
              />
            </FField>
          </div>
        )}
        {isRent && (
          <div>
            <p style={S.lbl}>Preferred Tenant (Optional)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[{ v: 'family', l: 'Family' }, { v: 'bachelor', l: 'Bachelor' }, { v: 'anyone', l: 'Anyone' }].map(t => (
                <Pill key={t.v} text={t.l} active={state.preferredTenant === t.v}
                  onClick={() => set('preferredTenant', state.preferredTenant === t.v ? '' : t.v)} />
              ))}
            </div>
          </div>
        )}

        {/* Sale-only: ownership + RERA */}
        {isSale && (
          <div style={S.grid2}>
            <FField label="Ownership (Optional)">
              <SInput
                value={state.listedBy}
                onChange={v => set('listedBy', v)}
                options={[{ value: 'owner', label: 'Owner' }, { value: 'agent', label: 'Agent' }, { value: 'builder', label: 'Builder' }]}
                placeholder="Select"
              />
            </FField>
            <FField label="RERA Number (Optional)">
              <TInput
                value={state.reraNumber}
                onChange={v => set('reraNumber', v)}
                placeholder="e.g., P01100001234"
              />
            </FField>
          </div>
        )}

        {/* Brokerage — shared UI, option set differs by listing type */}
        {(isRent || isSale) && (
          <BrokerageField state={state} dispatch={dispatch} isRent={isRent} />
        )}

        {/* ₹/sq.ft (sale only) */}
        {isSale && (
          <div style={{
            padding: '18px 20px', borderRadius: 10,
            background: C.surface2, border: `1px solid ${C.border}`,
          }}>
            <p style={{ ...S.lbl, marginBottom: 4 }}>₹/sq.ft (Optional)</p>
            <p style={{ fontSize: '0.8rem', color: C.textMuted, marginBottom: 16 }}>
              A separate area and rate you can choose to display publicly — never affects your Expected Price above.
            </p>
            <div style={S.grid2}>
              <FField label="Area (sq.ft)">
                <TInput
                  value={state.pricePerSqftArea}
                  onChange={v => set('pricePerSqftArea', v.replace(/\D/g, ''))}
                  placeholder="e.g., 1500"
                />
              </FField>
              <FField label="₹/sq.ft">
                <TInput
                  value={state.pricePerSqft}
                  onChange={v => set('pricePerSqft', v.replace(/\D/g, ''))}
                  placeholder="e.g., 12500"
                  prefix="₹"
                />
              </FField>
            </div>

            {psfPreviewTotal != null && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: C.goldDim, border: `1px solid ${C.goldBorder}`,
                fontSize: '0.8125rem', color: C.gold, fontFamily: FB,
              }}>
                Preview total: ₹{psfPreviewTotal.toLocaleString('en-IN')}
                <span style={{ color: C.textMuted, marginLeft: 6 }}>
                  ({state.pricePerSqftArea} sq.ft × ₹{Number(state.pricePerSqft).toLocaleString('en-IN')}/sq.ft) — for reference only, does not change your Expected Price
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => set('showPricePerSqft', !state.showPricePerSqft)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 16,
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${state.showPricePerSqft ? C.gold : C.textMuted}`,
                background: state.showPricePerSqft ? C.gold : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', color: '#0a0a0a', fontWeight: 800,
              }}>{state.showPricePerSqft ? '✓' : ''}</span>
              <span style={{ fontSize: '0.875rem', color: C.text, fontFamily: FB }}>Show ₹/sq.ft on listing page</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Brokerage field (shared by Step4's rent/sale variants) ──────────────────

function BrokerageField({
  state, dispatch, isRent,
}: { state: FormState; dispatch: React.Dispatch<Action>; isRent: boolean }) {
  const set = (field: keyof FormState, value: unknown) => dispatch({ type: 'SET', field, value })
  // UI-only: whether "Custom" is the active choice for rent's preset
  // pills. Not derived from state.brokerageValue (a blank/typed value
  // there doesn't necessarily mean "Custom was clicked") — kept as its
  // own local toggle so the pills reflect what was actually clicked.
  const [customMode, setCustomMode] = React.useState(false)

  const DAY_PRESETS = ['15', '20', '30', '45', '60']
  const MONTH_PRESETS = ['0.5', '1', '1.5', '2']
  const presets = state.brokerageMode === 'days_rent' ? DAY_PRESETS : state.brokerageMode === 'months_rent' ? MONTH_PRESETS : []

  const rentNum = Number(state.price)
  const multiplier = Number(state.brokerageValue)
  // "Days' rent" suggestion approximates a per-day rate from the monthly
  // rent (rent ÷ 30) — Bunny-style disclosure: this is a read-only
  // helper figure, never itself stored; only brokerageMode/brokerageValue
  // (the agent's actual selection) are persisted.
  const suggestion = isRent && rentNum > 0 && multiplier > 0
    ? (state.brokerageMode === 'days_rent' ? Math.round((rentNum / 30) * multiplier) : Math.round(rentNum * multiplier))
    : null

  const selectMode = (mode: string) => {
    set('brokerageMode', mode)
    set('brokerageValue', '')
    setCustomMode(false)
  }

  return (
    <div style={{ padding: '18px 20px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}` }}>
      <p style={{ ...S.lbl, marginBottom: 12 }}>Brokerage (Optional)</p>

      {isRent ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <Pill text="Days' Rent" active={state.brokerageMode === 'days_rent'} onClick={() => selectMode('days_rent')} />
            <Pill text="Months' Rent" active={state.brokerageMode === 'months_rent'} onClick={() => selectMode('months_rent')} />
          </div>
          {(state.brokerageMode === 'days_rent' || state.brokerageMode === 'months_rent') && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {presets.map(p => (
                  <Pill key={p} text={state.brokerageMode === 'days_rent' ? `${p} days` : `${p} mo`}
                    active={!customMode && state.brokerageValue === p}
                    onClick={() => { setCustomMode(false); set('brokerageValue', p) }} />
                ))}
                <Pill text="Custom" active={customMode}
                  onClick={() => { setCustomMode(true); set('brokerageValue', '') }} />
              </div>
              {customMode && (
                <TInput
                  value={state.brokerageValue}
                  onChange={v => set('brokerageValue', v.replace(/[^\d.]/g, ''))}
                  placeholder={state.brokerageMode === 'days_rent' ? 'Custom number of days' : 'Custom number of months'}
                />
              )}
              {suggestion != null && (
                <div style={{ marginTop: 10, fontSize: '0.8125rem', color: C.textMuted, fontFamily: FB }}>
                  Suggested: <span style={{ color: C.gold, fontWeight: 600 }}>₹{suggestion.toLocaleString('en-IN')}</span>
                  {' '}({state.brokerageValue}{state.brokerageMode === 'days_rent' ? " days' rent" : " months' rent"}) — read-only, not stored separately
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <Pill text="Percentage" active={state.brokerageMode === 'percentage'} onClick={() => selectMode('percentage')} />
            <Pill text="Fixed Amount" active={state.brokerageMode === 'fixed'} onClick={() => selectMode('fixed')} />
          </div>
          {state.brokerageMode === 'percentage' && (
            <TInput
              value={state.brokerageValue}
              onChange={v => set('brokerageValue', v.replace(/[^\d.]/g, ''))}
              placeholder="e.g., 2"
            />
          )}
          {state.brokerageMode === 'fixed' && (
            <TInput
              value={state.brokerageValue}
              onChange={v => set('brokerageValue', v.replace(/[^\d.]/g, ''))}
              placeholder="e.g., 50000"
              prefix="₹"
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => set('showBrokerageDetails', !state.showBrokerageDetails)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${state.showBrokerageDetails ? C.gold : C.textMuted}`,
          background: state.showBrokerageDetails ? C.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', color: '#0a0a0a', fontWeight: 800,
        }}>{state.showBrokerageDetails ? '✓' : ''}</span>
        <span style={{ fontSize: '0.875rem', color: C.text, fontFamily: FB }}>Show brokerage details on listing page</span>
      </button>
    </div>
  )
}

// ─── Step 5: Amenities ────────────────────────────────────────────────────────

function Step5({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  return (
    <div>
      <h2 style={S.stepTitle}>Amenities & Highlights</h2>
      <p style={S.stepSub}>Select everything available — buyers filter by amenities</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 8, marginBottom: 28,
      }}>
        {AMENITIES_LIST.map(a => {
          const on = state.amenities.includes(a)
          return (
            <button
              key={a} type="button"
              onClick={() => dispatch({ type: 'TOGGLE_AMENITY', amenity: a })}
              style={{
                padding: '10px 13px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${on ? C.gold : C.border}`,
                background: on ? C.goldDim : C.surface2,
                color: on ? C.gold : C.textSub,
                fontFamily: FB, fontSize: '0.8125rem', fontWeight: on ? 600 : 400,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9,
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${on ? C.gold : C.textMuted}`,
                background: on ? C.gold : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: '#0a0a0a', fontWeight: 800,
              }}>{on ? '✓' : ''}</span>
              {a}
            </button>
          )
        })}
      </div>

      {state.amenities.length > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 22,
          background: C.goldDim, border: `1px solid ${C.goldBorder}`,
          fontSize: '0.8125rem', color: C.gold, fontFamily: FB,
        }}>
          {state.amenities.length} amenit{state.amenities.length === 1 ? 'y' : 'ies'} selected
        </div>
      )}

      <FField label="Property Highlights / Description">
        <textarea
          value={state.highlights}
          onChange={e => dispatch({ type: 'SET', field: 'highlights', value: e.target.value })}
          placeholder="Describe what makes this property special — views, renovations, proximity to landmarks, unique architectural features…"
          rows={5}
          style={{ ...S.inp, resize: 'vertical', lineHeight: 1.65 }}
        />
      </FField>
    </div>
  )
}

// ─── Step 6: Photos ───────────────────────────────────────────────────────────

function Step6({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const [dragOver, setDragOver] = React.useState(false)
  const [photoError, setPhotoError] = React.useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragTarget = useRef<number | null>(null)

  // Video tile — separate from the photo grid above (one slot, not a
  // growing array). The hook does its own client-side validation +
  // direct-to-Bunny TUS upload; here we just mirror its result into
  // FormState the same way photo uploads land in state.photos, so
  // Step8's review + the final submit payload can read it uniformly.
  const videoUpload = useVideoUpload()
  const videoFileRef = useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    if (videoUpload.state.videoAssetId) {
      dispatch({ type: 'SET', field: 'videoAssetProvider', value: videoUpload.state.videoAssetProvider })
      dispatch({ type: 'SET', field: 'videoAssetId', value: videoUpload.state.videoAssetId })
      dispatch({ type: 'SET', field: 'videoAssetStatus', value: videoUpload.state.videoAssetStatus })
      dispatch({ type: 'SET', field: 'videoAssetThumbnailUrl', value: videoUpload.state.videoAssetThumbnailUrl })
    }
  }, [videoUpload.state.videoAssetId, videoUpload.state.videoAssetProvider, videoUpload.state.videoAssetStatus, videoUpload.state.videoAssetThumbnailUrl, dispatch])

  // Mirrors videoUpload.state.phase into FormState.videoUploadBusy —
  // this is the ONLY thing that survives Step6 unmounting (goNext's
  // validate() call happens in the parent, which has no visibility into
  // this hook's local state otherwise). See FormState.videoUploadBusy's
  // own comment for why this exists.
  React.useEffect(() => {
    const busy = videoUpload.state.phase === 'validating' || videoUpload.state.phase === 'uploading'
    dispatch({ type: 'SET', field: 'videoUploadBusy', value: busy })
  }, [videoUpload.state.phase, dispatch])

  // Matches Cloudinary's max_bytes in api/upload-image/route.ts exactly —
  // previously 10*1024*1024 (10,485,760), which let a ~486 KB band of files
  // pass this check and still get rejected server-side.
  const MAX_BYTES = 10_000_000 // 10 MB

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
    const valid: UploadedPhoto[] = []
    const rejected: string[] = []

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (not an image)`)
        continue
      }
      if (file.size > MAX_BYTES) {
        rejected.push(`${file.name} (over 10 MB)`)
        continue
      }
      valid.push({ id: uid(), file, preview: URL.createObjectURL(file) })
    }

    if (valid.length) dispatch({ type: 'ADD_PHOTOS', photos: valid })
    setPhotoError(rejected.length ? `Skipped ${rejected.length} file(s): ${rejected.join(', ')}` : '')
  }, [dispatch, MAX_BYTES])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const onTileDragEnd = () => {
    const from = dragItem.current
    const to = dragTarget.current
    dragItem.current = null
    dragTarget.current = null
    if (from === null || to === null || from === to) return
    const arr = [...state.photos]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    let cover = state.coverPhotoIndex
    if (from === cover) cover = to
    else if (from < cover && to >= cover) cover--
    else if (from > cover && to <= cover) cover++
    dispatch({ type: 'REORDER', photos: arr, cover: Math.max(0, cover) })
  }

  return (
    <div>
      <h2 style={S.stepTitle}>Upload Photos</h2>
      <p style={S.stepSub}>Listings with 8+ photos receive 3× more inquiries — add your best shots</p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? C.gold : C.border}`,
          borderRadius: 14, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? C.goldDim : C.surface2,
          transition: 'all 0.2s', marginBottom: 24,
        }}
      >
        <div style={{ fontSize: '2.25rem', marginBottom: 10 }}>📸</div>
        <div style={{ fontFamily: FD, fontSize: '1.25rem', color: C.text, marginBottom: 6 }}>
          {dragOver ? 'Drop photos here' : 'Drag & drop your photos'}
        </div>
        <div style={{ fontSize: '0.875rem', color: C.textMuted, marginBottom: 18 }}>
          or click to browse from your device
        </div>
        <span style={{
          display: 'inline-block', padding: '8px 22px',
          border: `1px solid ${C.gold}`, borderRadius: 8,
          color: C.gold, fontSize: '0.875rem', fontFamily: FB,
        }}>Browse Files</span>
        <div style={{ fontSize: '0.75rem', color: C.textMuted, marginTop: 10 }}>
          JPG, PNG, WEBP · Max 10 MB each · Minimum 1, recommend 8+
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {photoError && (
        <div style={{
          marginBottom: 18, padding: '12px 16px',
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          borderRadius: 8, color: C.error, fontSize: '0.875rem', fontFamily: FB,
        }}>
          {photoError}
        </div>
      )}

      {/* Photo grid */}
      {state.photos.length > 0 && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
          }}>
            <span style={{ fontSize: '0.875rem', color: C.textSub, fontFamily: FB }}>
              {state.photos.length} photo{state.photos.length > 1 ? 's' : ''} · Drag to reorder
            </span>
            <span style={{ fontSize: '0.8rem', color: C.textMuted, fontFamily: FB }}>
              Click any photo to set as cover
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {state.photos.map((photo, idx) => {
              const isCover = idx === state.coverPhotoIndex
              return (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => { dragItem.current = idx }}
                  onDragEnter={() => { dragTarget.current = idx }}
                  onDragEnd={onTileDragEnd}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => dispatch({ type: 'SET_COVER', index: idx })}
                  style={{
                    position: 'relative', borderRadius: 8, overflow: 'hidden',
                    border: `2px solid ${isCover ? C.gold : 'transparent'}`,
                    cursor: 'grab', aspectRatio: '4/3', userSelect: 'none',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.preview} alt={`Property photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {isCover && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: C.gold, color: '#0a0a0a',
                      fontSize: '0.6rem', fontWeight: 800, fontFamily: FB,
                      padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em',
                    }}>COVER</div>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_PHOTO', id: photo.id }) }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)', border: 'none', color: '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.875rem', lineHeight: 1,
                      fontFamily: FB,
                    }}
                  >×</button>
                  <div style={{
                    position: 'absolute', bottom: 4, right: 5,
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    fontSize: '0.6rem', fontFamily: FB, padding: '1px 5px', borderRadius: 3,
                  }}>{idx + 1}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Video tile — one optional slot, distinct from the photo grid above */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ ...S.stepTitle, fontSize: '1.05rem', marginBottom: 4 }}>Add a Walkthrough Video (Optional)</h3>
        <p style={{ ...S.stepSub, marginBottom: 16 }}>
          A short tap-to-play clip shown as a slide alongside your photos · Max {MAX_VIDEO_SECONDS}s · Max {Math.round(VIDEO_MAX_BYTES / 1024 / 1024)} MB
        </p>

        <input
          ref={videoFileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) videoUpload.pickFile(f); e.target.value = '' }}
        />

        {videoUpload.state.phase === 'idle' && !state.videoAssetId && (
          <div
            onClick={() => videoFileRef.current?.click()}
            style={{
              border: `2px dashed ${C.border}`, borderRadius: 14, padding: '32px 24px',
              textAlign: 'center', cursor: 'pointer', background: C.surface2,
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>🎬</div>
            <div style={{ fontFamily: FD, fontSize: '1rem', color: C.text, marginBottom: 4 }}>Click to select a video</div>
            <div style={{ fontSize: '0.75rem', color: C.textMuted }}>MP4, MOV, or WEBM</div>
          </div>
        )}

        {(videoUpload.state.phase === 'validating' || videoUpload.state.phase === 'uploading') && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
          }}>
            {videoUpload.state.previewUrl && (
              <video src={videoUpload.state.previewUrl} muted style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: C.text, fontFamily: FB, marginBottom: 4 }}>
                {videoUpload.state.phase === 'validating' ? 'Checking video…' : `Uploading… ${videoUpload.state.progress}%`}
              </div>
              <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${videoUpload.state.phase === 'validating' ? 5 : videoUpload.state.progress}%`, background: C.gold, transition: 'width 0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {(videoUpload.state.phase === 'processing' || state.videoAssetId) && videoUpload.state.phase !== 'failed' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            padding: '16px 18px', background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {videoUpload.state.previewUrl && (
                <video src={videoUpload.state.previewUrl} muted style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontSize: '0.875rem', color: C.gold, fontFamily: FB, fontWeight: 600 }}>Video uploaded</div>
                <div style={{ fontSize: '0.75rem', color: C.textMuted }}>Processing — it&apos;ll be ready to view shortly</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                videoUpload.reset()
                dispatch({ type: 'SET', field: 'videoAssetProvider', value: null })
                dispatch({ type: 'SET', field: 'videoAssetId', value: null })
                dispatch({ type: 'SET', field: 'videoAssetStatus', value: null })
                dispatch({ type: 'SET', field: 'videoAssetThumbnailUrl', value: null })
              }}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, color: C.text,
                cursor: 'pointer', fontSize: '0.9rem', fontFamily: FB,
              }}
            >×</button>
          </div>
        )}

        {videoUpload.state.phase === 'failed' && (
          <div style={{
            padding: '14px 18px', background: C.errorBg, border: `1px solid ${C.errorBorder}`,
            borderRadius: 10, color: C.error, fontSize: '0.875rem', fontFamily: FB,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>{videoUpload.state.error}</span>
            <button
              type="button"
              onClick={() => videoUpload.reset()}
              style={{ background: 'transparent', border: `1px solid ${C.error}`, color: C.error, borderRadius: 6, padding: '5px 12px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: FB, flexShrink: 0 }}
            >Try again</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 7: Floor Plans (optional) ───────────────────────────────────────────

function Step7({ state, dispatch }: { state: FormState; dispatch: React.Dispatch<Action> }) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [fpError, setFpError] = React.useState('')

  // Matches Cloudinary's max_bytes in api/upload-image/route.ts exactly —
  // previously 10*1024*1024 (10,485,760), which let a ~486 KB band of files
  // pass this check and still get rejected server-side.
  const MAX_BYTES = 10_000_000 // 10 MB

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
    const valid: UploadedFloorPlan[] = []
    const rejected: string[] = []

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (not an image)`)
        continue
      }
      if (file.size > MAX_BYTES) {
        rejected.push(`${file.name} (over 10 MB)`)
        continue
      }
      valid.push({ id: uid(), file, preview: URL.createObjectURL(file), label: '' })
    }

    if (valid.length) dispatch({ type: 'ADD_FLOOR_PLANS', floorPlans: valid })
    setFpError(rejected.length ? `Skipped ${rejected.length} file(s): ${rejected.join(', ')}` : '')
  }, [dispatch, MAX_BYTES])

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <h2 style={S.stepTitle}>Floor Plans</h2>
      <p style={S.stepSub}>
        Optional — add one floor plan, or several if your project has multiple unit types (e.g. &ldquo;2BHK - Type A&rdquo;, &ldquo;3BHK - Type B&rdquo;)
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? C.gold : C.border}`,
          borderRadius: 14, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? C.goldDim : C.surface2,
          transition: 'all 0.2s', marginBottom: 24,
        }}
      >
        <div style={{ fontSize: '2.25rem', marginBottom: 10 }}>📐</div>
        <div style={{ fontFamily: FD, fontSize: '1.25rem', color: C.text, marginBottom: 6 }}>
          {dragOver ? 'Drop floor plans here' : 'Drag & drop floor plan images'}
        </div>
        <div style={{ fontSize: '0.875rem', color: C.textMuted, marginBottom: 18 }}>
          or click to browse from your device
        </div>
        <span style={{
          display: 'inline-block', padding: '8px 22px',
          border: `1px solid ${C.gold}`, borderRadius: 8,
          color: C.gold, fontSize: '0.875rem', fontFamily: FB,
        }}>Browse Files</span>
        <div style={{ fontSize: '0.75rem', color: C.textMuted, marginTop: 10 }}>
          JPG, PNG, WEBP · Max 10 MB each · Skip this step if you don&apos;t have one yet
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {fpError && (
        <div style={{
          marginBottom: 18, padding: '12px 16px',
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          borderRadius: 8, color: C.error, fontSize: '0.875rem', fontFamily: FB,
        }}>
          {fpError}
        </div>
      )}

      {state.floorPlans.length > 0 && (
        <div style={{ display: 'grid', gap: 14 }}>
          {state.floorPlans.map((plan, idx) => (
            <div
              key={plan.id}
              style={{
                display: 'flex', gap: 14, alignItems: 'center',
                border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
                background: C.surface2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plan.preview} alt={`Floor plan ${idx + 1}`}
                style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={S.lbl}>Label (optional)</label>
                <input
                  type="text"
                  value={plan.label}
                  onChange={e => dispatch({ type: 'SET_FLOOR_PLAN_LABEL', id: plan.id, label: e.target.value })}
                  placeholder={`e.g. 2BHK - Type ${String.fromCharCode(65 + idx)}`}
                  style={S.inp}
                />
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_FLOOR_PLAN', id: plan.id })}
                style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, color: C.text,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', lineHeight: 1, fontFamily: FB,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* 360° capture request toggle — moved here from Step8's checkbox.
          Same underlying state field (capture360Requested) and the same
          post-insert logic in handleSubmit; only the control type and
          location changed. Real on/off toggle, not a checkbox, since this
          reads as "turn on a service" rather than "confirm a statement" —
          same switch pattern already used for Price Negotiable (Step4). */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px', background: C.surface2,
        borderRadius: 10, border: `1px solid ${C.border}`,
        marginTop: state.floorPlans.length > 0 ? 20 : 0,
      }}>
        <div>
          <div style={{ fontFamily: FB, fontWeight: 500, color: C.text, fontSize: '0.9375rem' }}>
            Request a professional 360° capture for this listing?
          </div>
          <div style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: 2 }}>
            Our team will reach out to schedule a visit — completely optional.
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET', field: 'capture360Requested', value: !state.capture360Requested })}
          style={{
            width: 46, height: 26, borderRadius: 999, border: 'none', flexShrink: 0,
            background: state.capture360Requested ? C.gold : C.border,
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3,
            left: state.capture360Requested ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Preferred visit date & time — only shown while the toggle above
          is on; optional even then (the team can still call to schedule
          if skipped). Stored separately from capture_360_requests'
          admin-set scheduled_date/scheduled_time_slot — see migration
          071's comment for why these aren't the same columns. */}
      {state.capture360Requested && (
        <div style={{
          padding: '16px 18px', background: C.surface2,
          borderRadius: 10, border: `1px solid ${C.border}`, marginTop: 12,
        }}>
          <p style={{ ...S.lbl, marginBottom: 4 }}>Preferred visit date & time (Optional)</p>
          <p style={{ fontSize: '0.8rem', color: C.textMuted, marginBottom: 14 }}>
            Skip this and our team will call to schedule instead.
          </p>
          <div style={S.grid2}>
            <FField label="Date">
              <input
                type="date"
                value={state.capture360PreferredDate}
                onChange={e => dispatch({ type: 'SET', field: 'capture360PreferredDate', value: e.target.value })}
                style={S.inp}
              />
            </FField>
            <div>
              <p style={S.lbl}>Time Slot</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[{ v: 'morning', l: 'Morning' }, { v: 'afternoon', l: 'Afternoon' }, { v: 'evening', l: 'Evening' }].map(t => (
                  <Pill key={t.v} text={t.l} active={state.capture360PreferredTimeSlot === t.v}
                    onClick={() => dispatch({ type: 'SET', field: 'capture360PreferredTimeSlot', value: state.capture360PreferredTimeSlot === t.v ? '' : t.v })} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 8: Review & Submit ──────────────────────────────────────────────────

function Step8({
  state, dispatch, isSubmitting, submitError, uploadProgress,
}: {
  state: FormState
  dispatch: React.Dispatch<Action>
  isSubmitting: boolean
  submitError: string
  uploadProgress: { current: number; total: number } | null
}) {
  const set = (field: keyof FormState) => (v: string) => dispatch({ type: 'SET', field, value: v })
  const isComm = COMMERCIAL_CATEGORIES.includes(state.propertyCategory)

  const rows: [string, string][] = [
    ['Listing Type',   state.listingType ? state.listingType.charAt(0).toUpperCase() + state.listingType.slice(1) : '—'],
    ['Category',       state.propertyCategory || '—'],
    ['Address',        [state.address, state.locality, state.city, state.stateField, state.pincode].filter(Boolean).join(', ') || '—'],
    ['Landmark',       state.landmark || '—'],
    ['Built-up Area',  state.areaSqft ? `${Number(state.areaSqft).toLocaleString('en-IN')} sq ft` : '—'],
    [isComm ? 'Rooms / Cabins' : 'Bedrooms', state.bedrooms || '—'],
    ['Bathrooms',      state.bathrooms || '—'],
    ['Balconies',      state.balconies || '—'],
    ['Floor',          state.floor ? `${state.floor} of ${state.totalFloors || '?'}` : '—'],
    ['Facing',         state.facing || '—'],
    ['Property Age',   state.propertyAge || '—'],
    ['Furnishing',     state.furnishing || '—'],
    ['Parking',        [state.coveredParking && `${state.coveredParking} Covered`, state.openParking && `${state.openParking} Open`].filter(Boolean).join(', ') || '—'],
    ['Price',          state.price ? `₹${Number(state.price).toLocaleString('en-IN')} (${toCrore(state.price)})` : '—'],
    ['Negotiable',     state.isNegotiable ? 'Yes' : 'No'],
    ['Possession',     state.possessionStatus || '—'],
    ['Maintenance',    state.maintenanceCharges ? `₹${Number(state.maintenanceCharges).toLocaleString('en-IN')}/mo` : '—'],
    ['Amenities',      state.amenities.length ? `${state.amenities.length} selected` : '—'],
    ['Photos',         state.photos.length ? `${state.photos.length} uploaded` : '—'],
    ['Floor Plans',    state.floorPlans.length ? `${state.floorPlans.length} uploaded` : '—'],
  ]

  return (
    <div>
      <h2 style={S.stepTitle}>Review Your Listing</h2>
      <p style={S.stepSub}>Verify every detail before submitting for review</p>

      {/* Summary table */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{
            display: 'grid', gridTemplateColumns: '1fr 2fr',
            padding: '10px 18px',
            borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
            background: i % 2 !== 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
          }}>
            <span style={{ fontSize: '0.8rem', color: C.textMuted, fontFamily: FB }}>{k}</span>
            <span style={{ fontSize: '0.875rem', color: C.text, fontFamily: FB }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Seller contact */}
      <h3 style={{ fontFamily: FD, fontSize: '1.25rem', fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
        Your Contact Details
      </h3>
      <p style={{ ...S.stepSub, marginBottom: 18 }}>Serious buyers will reach out on these channels</p>

      <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        <div style={S.grid2}>
          <FField label="Your Full Name *">
            <TInput value={state.sellerName} onChange={set('sellerName')} placeholder="e.g., Rajesh Kumar" />
          </FField>
          <FField label="Email Address *">
            <TInput value={state.sellerEmail} onChange={set('sellerEmail')} placeholder="you@email.com" type="email" />
          </FField>
        </div>
        <div style={S.grid2}>
          <FField label="Mobile Number *">
            <TInput
              value={state.sellerPhone}
              onChange={v => dispatch({ type: 'SET', field: 'sellerPhone', value: v.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit mobile number" type="tel"
            />
          </FField>
          <FField label="WhatsApp Number (Optional)">
            <TInput
              value={state.sellerWhatsapp}
              onChange={v => dispatch({ type: 'SET', field: 'sellerWhatsapp', value: v.replace(/\D/g, '').slice(0, 10) })}
              placeholder="If different from mobile" type="tel"
            />
          </FField>
        </div>
      </div>

      {/* Terms checkbox */}
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET', field: 'agreeToTerms', value: !state.agreeToTerms })}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 0, textAlign: 'left',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
          border: `2px solid ${state.agreeToTerms ? C.gold : C.border}`,
          background: state.agreeToTerms ? C.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', color: '#0a0a0a', fontSize: '0.7rem', fontWeight: 900,
        }}>
          {state.agreeToTerms ? '✓' : ''}
        </div>
        <span style={{ fontSize: '0.875rem', color: C.textSub, lineHeight: 1.6, fontFamily: FB }}>
          I confirm that I am the owner or authorised representative of this property and agree to Nilay 360&rsquo;s{' '}
          <span style={{ color: C.gold }}>Terms of Service</span> and{' '}
          <span style={{ color: C.gold }}>Listing Guidelines</span>. I understand listings are subject to verification before going live.
        </span>
      </button>

      {/* Ownership-warranty checkbox — migration 053. Distinct from the
          general ToS checkbox above: this is a specific factual warranty
          Nilay 360 relies on to publish the listing, not routine platform
          consent, so its value is persisted (ownership_warranty_confirmed /
          _at) on submit rather than left as a client-side-only gate. */}
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET', field: 'ownershipWarranty', value: !state.ownershipWarranty })}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 0, textAlign: 'left', marginTop: 16,
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
          border: `2px solid ${state.ownershipWarranty ? C.gold : C.border}`,
          background: state.ownershipWarranty ? C.gold : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', color: '#0a0a0a', fontSize: '0.7rem', fontWeight: 900,
        }}>
          {state.ownershipWarranty ? '✓' : ''}
        </div>
        <span style={{ fontSize: '0.875rem', color: C.textSub, lineHeight: 1.6, fontFamily: FB }}>
          I warrant that I have the legal right and authority to sell or let this property, and that all details in this listing are accurate to the best of my knowledge. I understand Nilay 360 relies on this warranty to publish the listing, and that a false warranty may result in the listing being removed and legal liability.
        </span>
      </button>

      {submitError && (
        <div style={{
          marginTop: 18, padding: '12px 16px',
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          borderRadius: 8, color: C.error, fontSize: '0.875rem', fontFamily: FB,
        }}>
          {submitError}
        </div>
      )}

      {isSubmitting && (
        <div style={{
          marginTop: 18, padding: '12px 16px',
          background: C.goldDim, border: `1px solid ${C.goldBorder}`,
          borderRadius: 8, color: C.gold, fontSize: '0.875rem', fontFamily: FB,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span>
          {uploadProgress
            ? `Uploading image ${uploadProgress.current} of ${uploadProgress.total}…`
            : 'Submitting your listing…'}
        </div>
      )}
    </div>
  )
}

// ─── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <div style={{
      background: C.bg, minHeight: '100vh', fontFamily: FB, color: C.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 28px',
          background: `linear-gradient(135deg, ${C.green}, ${C.greenMid})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: '#fff',
        }}>✓</div>
        <h1 style={{ fontFamily: FD, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, color: C.text, margin: '0 0 14px' }}>
          Listing Submitted!
        </h1>
        <p style={{ color: C.textSub, lineHeight: 1.75, marginBottom: 36, fontSize: '0.9375rem' }}>
          Your property is now pending review. Our team will verify the details and make it live within{' '}
          <strong style={{ color: C.gold }}>24–48 hours</strong>. You&rsquo;ll receive a confirmation on your registered email.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/dashboard" style={{
            ...S.btnPrimary, textDecoration: 'none', display: 'inline-block',
          }}>View Dashboard</a>
          <a href="/" style={{
            ...S.btnSecondary, textDecoration: 'none', display: 'inline-block',
          }}>Back to Home</a>
        </div>
      </div>
    </div>
  )
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validate(step: number, s: FormState): string | null {
  if (step === 1) {
    if (!s.listingType) return 'Please select a listing type (Sale / Rent / Commercial)'
    if (!s.propertyCategory) return 'Please select a property category'
  }
  if (step === 2) {
    if (!s.address.trim()) return 'Street address is required'
    if (!s.locality.trim()) return 'Locality / area is required'
    if (!s.city) return 'Please select a city'
    if (!s.stateField) return 'Please select a state'
    if (!/^\d{6}$/.test(s.pincode)) return 'Please enter a valid 6-digit pincode'
  }
  if (step === 3) {
    if (!s.areaSqft || isNaN(Number(s.areaSqft)) || Number(s.areaSqft) <= 0)
      return 'Please enter a valid built-up area in sq ft'
    if (s.propertyCategory !== 'plot' && !s.bedrooms)
      return COMMERCIAL_CATEGORIES.includes(s.propertyCategory)
        ? 'Please enter the number of rooms / cabins'
        : 'Please select the number of bedrooms'
  }
  if (step === 4) {
    if (!s.price || isNaN(Number(s.price)) || Number(s.price) <= 0)
      return 'Please enter a valid price'
    if (!s.possessionStatus) return 'Please select possession status'
  }
  if (step === 6) {
    if (s.photos.length === 0) return 'Please upload at least 1 photo'
    if (s.videoUploadBusy) return 'Please wait for your video to finish uploading before continuing'
  }
  if (step === 8) {
    if (!s.sellerName.trim()) return 'Your full name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.sellerEmail)) return 'Please enter a valid email address'
    if (!/^\d{10}$/.test(s.sellerPhone)) return 'Please enter a valid 10-digit mobile number'
    if (!s.agreeToTerms) return 'Please accept the Terms of Service to continue'
    if (!s.ownershipWarranty) return 'Please confirm the ownership warranty to continue'
  }
  return null
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PostPropertyPage() {
  const { profile } = useAuth()
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const [step, setStep] = React.useState(1)
  const [stepError, setStepError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState('')
  const [uploadProgress, setUploadProgress] = React.useState<{ current: number; total: number } | null>(null)
  const [success, setSuccess] = React.useState(false)

  // Draft persistence
  useEffect(() => {
    const { photos, floorPlans, ...saveable } = state
    void photos
    void floorPlans
    try {
      localStorage.setItem('nilay360_post_draft', JSON.stringify({ ...saveable, _step: step }))
    } catch {}
  }, [state, step])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nilay360_post_draft')
      if (!raw) return
      const { _step, ...partial } = JSON.parse(raw)
      dispatch({ type: 'LOAD_DRAFT', partial })
      if (typeof _step === 'number' && _step >= 1 && _step <= 8) setStep(_step)
    } catch {}
  }, [])

  // Pre-fill (not lock) the seller-email field from the authenticated
  // session, so it defaults to the real login email instead of a blank
  // free-text field the user has to remember to fill in accurately.
  // Stays editable — a seller may legitimately want inquiries routed to
  // a different contact email. PREFILL_SELLER_EMAIL only ever fills a
  // still-blank field, so this can't clobber a manually-typed value or
  // one just restored from a saved draft.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const email = result.data.session?.user?.email
      if (email) dispatch({ type: 'PREFILL_SELLER_EMAIL', email })
    })
  }, [])

  // Same pre-fill-not-lock behavior as the email effect above, but sourced
  // from useAuth()'s profile (the profiles table) rather than a raw
  // session lookup — the same pattern already used for this exact purpose
  // in PropertyDetailClient.tsx's inquiry/site-visit forms, agents/[slug]'s
  // contact form, and DashboardClient.tsx. Keyed on `profile` rather than
  // run once on mount: AuthProvider fetches the profile row asynchronously
  // after this component has already rendered, so `profile` is typically
  // still null on first mount and arrives later — this effect re-fires
  // when it does, rather than needing its own independent fetch.
  useEffect(() => {
    if (profile?.full_name) dispatch({ type: 'PREFILL_SELLER_NAME', name: profile.full_name })
    if (profile?.phone) dispatch({ type: 'PREFILL_SELLER_PHONE', phone: stripIndianCountryCode(profile.phone) })
  }, [profile])

  const goNext = () => {
    const err = validate(step, state)
    if (err) { setStepError(err); return }
    setStepError('')
    setStep(s => Math.min(s + 1, 8))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStepError('')
    setStep(s => Math.max(s - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const err = validate(8, state)
    if (err) { setStepError(err); return }
    setStepError('')
    setSubmitting(true)
    setSubmitError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const authUserId = session?.user?.id ?? null

      // Upload photos to Cloudinary via /api/upload-image — track failures and abort if any fail
      const imageUrls: string[] = []
      const failed: string[] = []
      for (let i = 0; i < state.photos.length; i++) {
        const photo = state.photos[i]
        setUploadProgress({ current: i + 1, total: state.photos.length })
        try {
          const body = new FormData()
          body.append('file', photo.file)
          const res = await fetch('/api/upload-image', { method: 'POST', body })
          const json = await res.json()
          if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? 'Upload failed')
          imageUrls.push(json.secure_url as string)
        } catch (err) {
          console.error('Photo upload failed:', photo.file.name, err)
          const reason = err instanceof Error ? err.message : 'Upload failed'
          failed.push(`${photo.file.name} (${reason})`)
        }
      }

      if (failed.length > 0) {
        setSubmitting(false)
        setUploadProgress(null)
        setSubmitError(`${failed.length} photo(s) failed to upload: ${failed.join(', ')}. Please try again or remove them.`)
        return
      }

      // Floor plans are optional — upload what we can and skip failures rather
      // than blocking submission of an otherwise-complete listing over them.
      const floorPlanUploads: { image_url: string; label: string | null }[] = []
      for (let i = 0; i < state.floorPlans.length; i++) {
        const plan = state.floorPlans[i]
        setUploadProgress({ current: i + 1, total: state.floorPlans.length })
        try {
          const body = new FormData()
          body.append('file', plan.file)
          const res = await fetch('/api/upload-image', { method: 'POST', body })
          const json = await res.json()
          if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? 'Upload failed')
          floorPlanUploads.push({ image_url: json.secure_url as string, label: plan.label.trim() || null })
        } catch (err) {
          console.error('Floor plan upload failed:', plan.file.name, err)
        }
      }

      // Move cover photo to front
      if (state.coverPhotoIndex > 0 && imageUrls.length > state.coverPhotoIndex) {
        const [cover] = imageUrls.splice(state.coverPhotoIndex, 1)
        imageUrls.unshift(cover)
      }

      const slugBase = [state.propertyCategory, state.locality, state.city]
        .filter(Boolean).join('-').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      // Combine parking into a human-readable text field (matches schema column `parking text`)
      const parkingParts: string[] = []
      if (state.coveredParking) parkingParts.push(`${state.coveredParking} Covered`)
      if (state.openParking)    parkingParts.push(`${state.openParking} Open`)

      const isCommTitle = COMMERCIAL_CATEGORIES.includes(state.propertyCategory)

      // Prefer the coordinates the seller confirmed via LocationPicker
      // (search + optional drag-to-adjust) during Step 2. Only fall back to
      // the best-effort geocode-at-submit-time call below if the seller
      // never interacted with the picker at all (state.latitude/longitude
      // still null) — never blocks submission either way. A network
      // failure, a missing/misconfigured API key, or Google returning no
      // match all resolve to `geo = null`, and the listing still submits
      // exactly as it does today, just without coordinates.
      const addressString = [state.address, state.locality, state.city, state.stateField, state.pincode]
        .filter(Boolean).join(', ')
      let geo: { latitude: number; longitude: number } | null =
        state.latitude != null && state.longitude != null
          ? { latitude: state.latitude, longitude: state.longitude }
          : null
      if (!geo) {
        try {
          const geoRes = await fetch('/api/geocode-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: addressString }),
          })
          const geoJson = await geoRes.json()
          geo = geoJson.result ?? null
        } catch (err) {
          console.error('Geocoding request failed:', err)
        }
      }

      const { data: insertedListing, error: insertErr } = await supabase.from('property_listings').insert([{
        slug:               `${slugBase}-${Date.now()}`,
        title:              `${!isCommTitle && state.bedrooms ? state.bedrooms + ' BHK ' : ''}${state.propertyCategory} in ${state.locality}, ${state.city}`.trim(),
        // Schema column names (requirements-aligned)
        listing_type:       state.listingType,
        property_category:  state.propertyCategory,
        status:             'pending_review',
        price:              Number(state.price),
        price_negotiable:   state.isNegotiable,
        maintenance_charge: state.maintenanceCharges ? Number(state.maintenanceCharges) : null,
        // ₹/sq.ft calculator — see FormState.pricePerSqftArea's own
        // comment. Stored as entered regardless of the checkbox; the
        // checkbox only controls PUBLIC display (read on the detail
        // page), not whether the values are saved at all.
        area_sqft:            state.pricePerSqftArea ? Number(state.pricePerSqftArea) : null,
        price_per_sqft:       state.pricePerSqft      ? Number(state.pricePerSqft)      : null,
        show_price_per_sqft:  state.showPricePerSqft,
        // Rental-only fields — null for sale/commercial, matching how
        // every other conditionally-shown field in this payload already
        // behaves (e.g. bedrooms below for plots).
        maintenance_type:     state.listingType === 'rent' ? state.maintenanceType : null,
        deposit_amount:       state.listingType === 'rent' && state.depositAmount ? Number(state.depositAmount) : null,
        available_from:       state.listingType === 'rent' && state.availableFrom ? state.availableFrom : null,
        preferred_tenant:     state.listingType === 'rent' && state.preferredTenant ? state.preferredTenant : null,
        // Sale-only fields
        listed_by:            state.listingType === 'sale' && state.listedBy ? state.listedBy : null,
        rera_number:          state.listingType === 'sale' && state.reraNumber ? state.reraNumber : null,
        // Brokerage — shared, applies to whichever type the listing is
        brokerage_mode:          state.brokerageMode || null,
        brokerage_value:         state.brokerageValue ? Number(state.brokerageValue) : null,
        show_brokerage_details:  state.showBrokerageDetails,
        built_up_area:      Number(state.areaSqft),
        bedrooms:           state.bedrooms || null,
        bathrooms:          state.bathrooms || null,
        balconies:          state.balconies || null,
        floor_number:       state.floor ? Number(state.floor) : null,
        total_floors:       state.totalFloors ? Number(state.totalFloors) : null,
        facing:             state.facing || null,
        property_age:       state.propertyAge || null,
        furnishing:         state.furnishing || null,
        parking:            parkingParts.join(', ') || null,
        possession_status:  state.possessionStatus || null,
        address:            state.address,
        locality:           state.locality,
        city:               state.city,
        state:              state.stateField,
        pincode:            state.pincode,
        landmark:           state.landmark || null,
        latitude:           geo?.latitude ?? null,
        longitude:          geo?.longitude ?? null,
        highlights:         state.highlights || null,
        photo_urls:         imageUrls,
        // Copied from FormState as of this exact submit moment — see
        // migration 068_property_video_upload.sql for why this is a
        // point-in-time copy rather than a live reference: if Bunny's
        // webhook hasn't fired yet, video_asset_status lands here as
        // 'processing' and the webhook's own best-effort direct sync
        // (src/app/api/bunny-webhook/route.ts) picks it up once this
        // row exists.
        video_asset_provider:      state.videoAssetProvider,
        video_asset_id:            state.videoAssetId,
        video_asset_status:        state.videoAssetStatus,
        video_asset_thumbnail_url: state.videoAssetThumbnailUrl,
        amenities:          state.amenities,
        seller_name:        state.sellerName,
        seller_email:       state.sellerEmail,
        seller_phone:       state.sellerPhone,
        seller_whatsapp:    state.sellerWhatsapp || null,
        user_id:            authUserId,
        is_featured:        false,
        views:              0,
        // Migration 053 — write-once at creation, per the checkbox above.
        ownership_warranty_confirmed:    state.ownershipWarranty,
        ownership_warranty_confirmed_at: new Date().toISOString(),
      }]).select('id').single()

      if (insertErr) throw insertErr

      if (floorPlanUploads.length > 0 && insertedListing?.id) {
        const { error: fpErr } = await supabase.from('property_floor_plans').insert(
          floorPlanUploads.map((fp, idx) => ({
            property_id: insertedListing.id,
            image_url: fp.image_url,
            label: fp.label,
            display_order: idx,
          }))
        )
        // The listing itself was already created successfully — don't fail
        // the whole submission over the floor plans row insert.
        if (fpErr) console.error('Floor plan row insert failed:', fpErr)
      }

      // 360° capture request — non-fatal, own try/catch, never blocks a
      // listing submission that already succeeded. authUserId is always
      // present here: the checkbox is only reachable after a real signed-in
      // submission (property_listings.user_id already required it above).
      if (state.capture360Requested && insertedListing?.id && authUserId) {
        try {
          const { error: captureErr } = await supabase.from('capture_360_requests').insert({
            property_id: insertedListing.id,
            requester_id: authUserId,
            status: 'pending',
            preferred_date:      state.capture360PreferredDate      || null,
            preferred_time_slot: state.capture360PreferredTimeSlot  || null,
          })
          if (captureErr) {
            console.error('Capture 360 request insert failed:', captureErr)
          } else {
            fetch('/api/notify-capture-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                propertyTitle: `${!isCommTitle && state.bedrooms ? state.bedrooms + ' BHK ' : ''}${state.propertyCategory} in ${state.locality}, ${state.city}`.trim(),
                propertyAddress: addressString,
                requesterName: state.sellerName,
              }),
            }).catch((err) => console.error('[Capture360] Admin notification failed:', err))
          }
        } catch (err) {
          console.error('Unexpected error requesting 360 capture:', err)
        }
      }

      localStorage.removeItem('nilay360_post_draft')
      setSuccess(true)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed — please try again.')
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  if (success) return <SuccessScreen />

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: FB, color: C.text }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${C.bg}f0`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: FD, fontSize: '1.5rem', fontWeight: 700, color: C.gold, letterSpacing: '0.06em' }}>
            Nilay 360
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: C.greenMid,
            display: 'inline-block', animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{ color: C.textMuted, fontSize: '0.8rem' }}>Draft auto-saved</span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(20px, 4vw, 40px) 16px 80px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: FD, fontSize: 'clamp(1.875rem, 5vw, 2.75rem)',
            fontWeight: 600, color: C.text, margin: '0 0 8px', lineHeight: 1.15,
          }}>Post Your Property</h1>
          <p style={{ color: C.textMuted, margin: 0, fontSize: '0.9375rem' }}>
            Reach thousands of buyers &amp; tenants across India
          </p>
        </div>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Step card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 'clamp(22px, 4vw, 40px)', marginTop: 28,
        }}>
          {step === 1 && <Step1 state={state} dispatch={dispatch} />}
          {step === 2 && <Step2 state={state} dispatch={dispatch} />}
          {step === 3 && <Step3 state={state} dispatch={dispatch} />}
          {step === 4 && <Step4 state={state} dispatch={dispatch} />}
          {step === 5 && <Step5 state={state} dispatch={dispatch} />}
          {step === 6 && <Step6 state={state} dispatch={dispatch} />}
          {step === 7 && <Step7 state={state} dispatch={dispatch} />}
          {step === 8 && (
            <Step8
              state={state} dispatch={dispatch}
              isSubmitting={submitting} submitError={submitError}
              uploadProgress={uploadProgress}
            />
          )}

          {/* Step error */}
          {stepError && (
            <div style={{
              marginTop: 18, padding: '12px 16px',
              background: C.errorBg, border: `1px solid ${C.errorBorder}`,
              borderRadius: 8, color: C.error, fontSize: '0.875rem', fontFamily: FB,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠</span> {stepError}
            </div>
          )}

          {/* Proactive notice while a video is uploading on step 6 — shown
              regardless of whether "Continue →" has been clicked yet, not
              only as a reactive error after the fact. */}
          {step === 6 && state.videoUploadBusy && (
            <div style={{
              marginTop: 18, padding: '12px 16px',
              background: C.goldDim, border: `1px solid ${C.goldBorder}`,
              borderRadius: 8, color: C.gold, fontSize: '0.875rem', fontFamily: FB,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⏳</span> Please wait for your video to finish uploading before continuing
            </div>
          )}

          {/* Navigation */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}`,
          }}>
            {step > 1
              ? <button onClick={goBack} style={S.btnSecondary}>← Back</button>
              : <div />
            }

            {step < 8
              ? (
                <button
                  onClick={goNext}
                  disabled={step === 6 && state.videoUploadBusy}
                  style={{ ...S.btnPrimary, ...(step === 6 && state.videoUploadBusy ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                >Continue →</button>
              )
              : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ ...S.btnPrimary, opacity: submitting ? 0.65 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Submitting…' : 'Submit for Review'}
                </button>
              )
            }
          </div>
        </div>

        {/* Step counter */}
        <p style={{ textAlign: 'center', marginTop: 20, color: C.textMuted, fontSize: '0.8125rem', fontFamily: FB }}>
          Step {step} of {STEP_LABELS.length}
        </p>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        input, select, textarea { outline: none; }
        input:focus, select:focus, textarea:focus {
          border-color: ${C.gold} !important;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
        }
        input::placeholder, textarea::placeholder { color: ${C.textMuted}; }
        option { background: #161616; color: #FFFFFF; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.green}; border-radius: 3px; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
