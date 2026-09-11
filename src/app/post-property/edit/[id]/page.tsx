'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

// A single tile in the photo grid — either an already-saved photo_urls entry
// (kind 'existing', url = its secure_url) or a newly picked file awaiting
// upload (kind 'new', url = local blob preview, file = the raw File to
// upload on Save). Position in this array is the display/reorder order;
// coverIndex (tracked separately) marks which tile is the cover, mirroring
// post-property/page.tsx's Step 6 photos + coverPhotoIndex split.
interface PhotoItem {
  id: string
  url: string
  kind: 'existing' | 'new'
  file?: File
}

interface ListingRow {
  photo_urls?: string[] | null;
  listing_type?: string | null; property_category?: string | null;
  address?: string | null; locality?: string | null; city?: string | null;
  state?: string | null; pincode?: string | null; landmark?: string | null;
  built_up_area?: number | null; bedrooms?: number | null; bathrooms?: number | null;
  balconies?: number | null; floor_number?: number | null; total_floors?: number | null;
  facing?: string | null; property_age?: string | null; furnishing?: string | null;
  parking?: number | null;
  price?: number | null; price_negotiable?: boolean | null; possession_status?: string | null;
  maintenance_charge?: number | null; amenities?: string[] | null;
  highlights?: string | null; seller_name?: string | null;
  seller_phone?: string | null; seller_whatsapp?: string | null;
}

interface FloorPlanRow {
  id: string
  image_url: string
  label: string | null
  display_order: number
}

interface EditForm {
  listing_type:       string
  property_category:  string
  address:            string
  locality:           string
  city:               string
  state:              string
  pincode:            string
  landmark:           string
  built_up_area:      string
  bedrooms:           string
  bathrooms:          string
  balconies:          string
  floor_number:       string
  total_floors:       string
  facing:             string
  property_age:       string
  furnishing:         string
  parking:            string
  price:              string
  price_negotiable:   boolean
  possession_status:  string
  maintenance_charge: string
  amenities:          string[]
  highlights:         string
  seller_name:        string
  seller_phone:       string
  seller_whatsapp:    string
}

const EMPTY: EditForm = {
  listing_type: '', property_category: '',
  address: '', locality: '', city: '', state: '', pincode: '', landmark: '',
  built_up_area: '', bedrooms: '', bathrooms: '', balconies: '', floor_number: '',
  total_floors: '', facing: '', property_age: '', furnishing: '',
  parking: '',
  price: '', price_negotiable: false, possession_status: '', maintenance_charge: '',
  amenities: [], highlights: '',
  seller_name: '', seller_phone: '', seller_whatsapp: '',
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0a', surface: '#0f0f0f', surface2: '#161616', border: '#1e1e1e',
  gold: '#10C4C3', goldDim: 'rgba(201,168,76,0.10)', goldBorder: 'rgba(201,168,76,0.30)',
  text: '#F5F2EC', textSub: '#A9B4C2', textMuted: '#6B7686',
} as const

const FB = 'var(--font-body-new)'
const FD = 'var(--font-heading-new)'

const inp: React.CSSProperties = {
  width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '12px 16px', color: C.text, fontSize: '0.9375rem',
  fontFamily: FB, outline: 'none', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub,
  marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: FB,
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LISTING_TYPES   = ['sale', 'rent', 'commercial']
const CATEGORIES      = ['apartment', 'villa', 'plot', 'office', 'retail', 'penthouse', 'townhouse', 'warehouse']
const COMMERCIAL_CATEGORIES = ['office', 'retail', 'warehouse']
const CITIES          = ['Hyderabad', 'Mumbai', 'Bengaluru', 'Delhi NCR', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad']
const STATES          = ['Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Telangana', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Rajasthan', 'West Bengal', 'Punjab', 'Uttar Pradesh', 'Kerala', 'Madhya Pradesh', 'Haryana', 'Goa']
const FACING_OPTS     = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
const AGE_OPTS        = [{ value: 'new', label: 'New / Under Construction' }, { value: '0-1', label: '< 1 year' }, { value: '1-3', label: '1–3 years' }, { value: '3-5', label: '3–5 years' }, { value: '5-10', label: '5–10 years' }, { value: '10+', label: '10+ years' }]
const FURNISH_OPTS    = [{ value: 'unfurnished', label: 'Unfurnished' }, { value: 'semi-furnished', label: 'Semi-Furnished' }, { value: 'fully-furnished', label: 'Fully Furnished' }]
const POSSESSION_OPTS = [{ value: 'ready_to_move', label: 'Ready to Move' }, { value: 'under_construction', label: 'Under Construction' }, { value: 'new_launch', label: 'New Launch' }]
const AMENITIES_LIST  = ['Swimming Pool', 'Gym / Fitness Centre', 'Clubhouse', '24/7 Security', 'Power Backup', 'Lift / Elevator', 'Covered Parking', 'Garden / Lawn', "Children's Play Area", 'Jogging Track', 'Intercom', 'CCTV Surveillance', 'Concierge Service', 'Rooftop Terrace', 'EV Charging', 'Smart Home', 'High-Speed Internet', 'Air Conditioning', 'Balcony', 'Vastu Compliant']

// ─── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

function TInput({ value, onChange, placeholder, type = 'text', prefix }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: '0.9rem', pointerEvents: 'none', fontFamily: FB }}>{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inp, ...(prefix ? { paddingLeft: 32 } : {}) }} />
    </div>
  )
}

function SInput({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, appearance: 'none', cursor: 'pointer', paddingRight: 40 }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none', fontSize: '0.7rem' }}>▼</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 32px', marginBottom: 20 }}>
      <h3 style={{ fontFamily: FD, fontSize: '1.25rem', fontWeight: 600, color: C.text, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>{title}</h3>
      {children}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const id      = params.id

  const [form,     setForm]     = useState<EditForm>(EMPTY)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [userId,   setUserId]   = useState<string | null>(null)

  const [floorPlans, setFloorPlans]     = useState<FloorPlanRow[]>([])
  const [fpUploading, setFpUploading]   = useState(false)
  const [fpError, setFpError]           = useState<string | null>(null)
  const fpFileRef = useRef<HTMLInputElement | null>(null)

  // Photo management — mirrors post-property/page.tsx's Step 6, but existing
  // photo_urls entries load in as kind:'existing' tiles alongside any newly
  // picked kind:'new' tiles. Uploads for 'new' tiles happen at Save time
  // (not immediately, matching the create flow), then the merged, cover-
  // adjusted URL list is written into the same update() payload below.
  const [photos, setPhotos]                       = useState<PhotoItem[]>([])
  const [coverIndex, setCoverIndex]                = useState(0)
  const [photoError, setPhotoError]                = useState<string | null>(null)
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const photoFileRef  = useRef<HTMLInputElement | null>(null)
  const photoDragItem   = useRef<number | null>(null)
  const photoDragTarget = useRef<number | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await createClient().auth.getSession()
      setUserId(data.session?.user?.id ?? null)
    }
    void loadUser()
  }, [])

  const set = (field: keyof EditForm) => (v: string | boolean | string[]) =>
    setForm(prev => ({ ...prev, [field]: v }))

  const toggleAmenity = (a: string) =>
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }))

  // Load existing listing
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('property_listings')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }: { data: ListingRow | null; error: unknown }) => {
        if (err || !data) { setNotFound(true); setLoading(false); return }
        setForm({
          listing_type:       data.listing_type       ?? '',
          property_category:  data.property_category  ?? '',
          address:            data.address            ?? '',
          locality:           data.locality           ?? '',
          city:               data.city               ?? '',
          state:              data.state              ?? '',
          pincode:            data.pincode            ?? '',
          landmark:           data.landmark           ?? '',
          built_up_area:      data.built_up_area   != null ? String(data.built_up_area)  : '',
          bedrooms:           data.bedrooms        != null ? String(data.bedrooms)        : '',
          bathrooms:          data.bathrooms       != null ? String(data.bathrooms)       : '',
          balconies:          data.balconies       != null ? String(data.balconies)       : '',
          floor_number:       data.floor_number    != null ? String(data.floor_number)    : '',
          total_floors:       data.total_floors    != null ? String(data.total_floors)    : '',
          facing:             data.facing             ?? '',
          property_age:       data.property_age       ?? '',
          furnishing:         data.furnishing         ?? '',
          parking:            data.parking         != null ? String(data.parking)         : '',
          price:              data.price           != null ? String(data.price)           : '',
          price_negotiable:   data.price_negotiable   ?? false,
          possession_status:  data.possession_status  ?? '',
          maintenance_charge: data.maintenance_charge != null ? String(data.maintenance_charge) : '',
          amenities:          Array.isArray(data.amenities) ? (data.amenities as string[]) : [],
          highlights:         data.highlights         ?? '',
          seller_name:        data.seller_name        ?? '',
          seller_phone:       data.seller_phone       ?? '',
          seller_whatsapp:    data.seller_whatsapp    ?? '',
        })
        const existingUrls = Array.isArray(data.photo_urls) ? data.photo_urls : []
        setPhotos(existingUrls.map(url => ({ id: uid(), url, kind: 'existing' as const })))
        setCoverIndex(0)
        setLoading(false)
      })
  }, [id])

  // Load existing floor plans
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('property_floor_plans')
      .select('id, image_url, label, display_order')
      .eq('property_id', id)
      .order('display_order', { ascending: true })
      .then(({ data }: { data: FloorPlanRow[] | null }) => {
        setFloorPlans(data ?? [])
      })
  }, [id])

  const addFloorPlanFiles = async (files: FileList) => {
    setFpError(null)
    setFpUploading(true)
    const supabase = createClient()
    // Matches Cloudinary's max_bytes in api/upload-image/route.ts exactly —
    // previously 10*1024*1024 (10,485,760), which let a ~486 KB band of
    // files pass this check and still get rejected server-side.
    const MAX_BYTES = 10_000_000
    let nextOrder = floorPlans.length
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { setFpError(`${file.name} is not an image`); continue }
      if (file.size > MAX_BYTES) { setFpError(`${file.name} is over 10 MB`); continue }
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/upload-image', { method: 'POST', body })
        const json = await res.json()
        if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? 'Upload failed')
        const { data: row, error: insErr } = await supabase
          .from('property_floor_plans')
          .insert([{ property_id: id, image_url: json.secure_url, label: null, display_order: nextOrder }])
          .select('id, image_url, label, display_order')
          .single()
        if (insErr) throw insErr
        setFloorPlans(prev => [...prev, row as FloorPlanRow])
        nextOrder += 1
      } catch (err) {
        console.error('Floor plan upload failed:', file.name, err)
        setFpError(`${file.name} failed to upload. Please try again.`)
      }
    }
    setFpUploading(false)
  }

  const removeFloorPlan = async (planId: string) => {
    const supabase = createClient()
    const prev = floorPlans
    setFloorPlans(fp => fp.filter(p => p.id !== planId))
    const { error: delErr } = await supabase.from('property_floor_plans').delete().eq('id', planId)
    if (delErr) {
      console.error('Floor plan delete failed:', delErr)
      setFpError('Could not remove that floor plan. Please try again.')
      setFloorPlans(prev)
    }
  }

  const updateFloorPlanLabel = (planId: string, label: string) =>
    setFloorPlans(fp => fp.map(p => p.id === planId ? { ...p, label } : p))

  const saveFloorPlanLabel = async (planId: string, label: string) => {
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('property_floor_plans')
      .update({ label: label.trim() || null })
      .eq('id', planId)
    if (updErr) console.error('Floor plan label save failed:', updErr)
  }

  // ── Photo management (mirrors post-property/page.tsx Step 6) ──────────────────

  const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10 MB

  const addPhotoFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files)
    const valid: PhotoItem[] = []
    const rejected: string[] = []

    for (const file of incoming) {
      if (!file.type.startsWith('image/')) { rejected.push(`${file.name} (not an image)`); continue }
      if (file.size > MAX_PHOTO_BYTES) { rejected.push(`${file.name} (over 10 MB)`); continue }
      valid.push({ id: uid(), url: URL.createObjectURL(file), kind: 'new', file })
    }

    if (valid.length) setPhotos(prev => [...prev, ...valid])
    setPhotoError(rejected.length ? `Skipped ${rejected.length} file(s): ${rejected.join(', ')}` : null)
  }, [])

  const removePhoto = (item: PhotoItem, idx: number) => {
    if (item.kind === 'existing') {
      if (!window.confirm('Remove this photo from the listing? This cannot be undone once you save.')) return
    }
    setPhotos(prev => prev.filter(p => p.id !== item.id))
    setCoverIndex(prev => {
      if (idx === prev) return 0
      if (idx < prev) return prev - 1
      return prev
    })
  }

  const onPhotoTileDragEnd = () => {
    const from = photoDragItem.current
    const to = photoDragTarget.current
    photoDragItem.current = null
    photoDragTarget.current = null
    if (from === null || to === null || from === to) return
    setPhotos(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr
    })
    setCoverIndex(prev => {
      if (from === prev) return to
      if (from < prev && to >= prev) return prev - 1
      if (from > prev && to <= prev) return prev + 1
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.listing_type || !form.price) {
      setError('Listing type and price are required.')
      return
    }
    if (!userId) {
      setError('You must be signed in to edit a listing.')
      return
    }

    // Cover-adjust the display order into final photo_urls order (existing
    // convention: index 0 = cover), same "splice + unshift" step the create
    // flow does at submit time — before touching uploads, so we can bail
    // out early on the empty-array guard without uploading anything.
    const orderedPhotos = (() => {
      if (coverIndex <= 0 || coverIndex >= photos.length) return photos
      const arr = [...photos]
      const [cover] = arr.splice(coverIndex, 1)
      arr.unshift(cover)
      return arr
    })()

    if (orderedPhotos.length === 0) {
      if (!window.confirm(
        'This listing will be saved with zero photos — that’s a real visibility ' +
        'downgrade for buyers. Save anyway?'
      )) return
    }

    setSaving(true)
    setError(null)
    setPhotoError(null)

    // Upload any newly picked files — try all of them (same as the create
    // flow) and only decide whether to abort once every attempt is done, so
    // one early failure doesn't hide problems with the rest.
    const finalPhotoUrls: string[] = []
    const failedUploads: string[] = []
    const newCount = orderedPhotos.filter(p => p.kind === 'new').length
    let uploadedSoFar = 0
    for (const item of orderedPhotos) {
      if (item.kind === 'existing') { finalPhotoUrls.push(item.url); continue }
      uploadedSoFar += 1
      setPhotoUploadProgress({ current: uploadedSoFar, total: newCount })
      try {
        const body = new FormData()
        body.append('file', item.file as File)
        const res = await fetch('/api/upload-image', { method: 'POST', body })
        const json = await res.json()
        if (!res.ok || !json?.secure_url) throw new Error(json?.error ?? 'Upload failed')
        finalPhotoUrls.push(json.secure_url as string)
      } catch (err) {
        console.error('Photo upload failed:', item.file?.name, err)
        failedUploads.push(item.file?.name ?? 'unnamed file')
      }
    }
    setPhotoUploadProgress(null)

    if (failedUploads.length > 0) {
      setSaving(false)
      setPhotoError(`${failedUploads.length} photo(s) failed to upload: ${failedUploads.join(', ')}. Please try again — no changes were saved.`)
      return
    }

    try {
      const supabase = createClient()
      const { error: upErr } = await supabase
        .from('property_listings')
        .update({
          photo_urls:          finalPhotoUrls,
          listing_type:       form.listing_type       || null,
          property_category:  form.property_category  || null,
          address:            form.address            || null,
          locality:           form.locality           || null,
          city:               form.city               || null,
          state:              form.state              || null,
          pincode:            form.pincode            || null,
          landmark:           form.landmark           || null,
          built_up_area:      form.built_up_area      ? Number(form.built_up_area)      : null,
          bedrooms:           form.bedrooms           ? Number(form.bedrooms)           : null,
          bathrooms:          form.bathrooms          ? Number(form.bathrooms)          : null,
          balconies:          form.balconies          ? Number(form.balconies)          : null,
          floor_number:       form.floor_number       ? Number(form.floor_number)       : null,
          total_floors:       form.total_floors       ? Number(form.total_floors)       : null,
          facing:             form.facing             || null,
          property_age:       form.property_age       || null,
          furnishing:         form.furnishing         || null,
          parking:            form.parking            ? Number(form.parking)            : null,
          price:              form.price              ? Number(form.price)              : null,
          price_negotiable:   form.price_negotiable,
          possession_status:  form.possession_status  || null,
          maintenance_charge: form.maintenance_charge ? Number(form.maintenance_charge) : null,
          amenities:          form.amenities,
          highlights:         form.highlights         || null,
          seller_name:        form.seller_name        || null,
          seller_phone:       form.seller_phone       || null,
          seller_whatsapp:    form.seller_whatsapp    || null,
          updated_at:         new Date().toISOString(),
        })
        .eq('id', id)
      setSaving(false)
      if (upErr) {
        console.error('Edit listing — update error code:', upErr.code, '| message:', upErr.message, '| details:', upErr.details)
        setError('Could not save changes. Please try again.')
      } else {
        router.push('/dashboard/my-listings')
      }
    } catch (err) {
      console.error('Edit listing — unexpected error:', err)
      setSaving(false)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  // ── Loading / Not found states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.gold, fontFamily: FB, fontSize: 14, opacity: 0.7 }}>Loading listing…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: C.text, fontFamily: FD, fontSize: 28 }}>Listing not found</div>
        <a href="/dashboard/my-listings" style={{ color: C.gold, fontFamily: FB, fontSize: 14, textDecoration: 'none' }}>← Back to My Listings</a>
      </div>
    )
  }

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: ${FB}; }
        input, select, textarea { color-scheme: dark; }
        input:focus, select:focus, textarea:focus { border-color: ${C.goldBorder} !important; outline: none; box-shadow: 0 0 0 3px rgba(201,168,76,0.08); }
        select option { background: ${C.surface2}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
        @media (max-width: 768px) {
          .ppe-header { padding: 20px 16px !important; }
          .ppe-form { padding: 16px 16px 64px !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, paddingTop: 64 }}>

        {/* Header */}
        <div className="ppe-header" style={{ background: `linear-gradient(135deg, #081c12 0%, #020C1C 100%)`, borderBottom: `1px solid rgba(201,168,76,0.12)`, padding: '36px 48px 32px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <a href="/dashboard/my-listings" style={{ fontSize: 12, color: 'rgba(245,242,236,0.4)', textDecoration: 'none' }}>My Listings</a>
              <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: 10 }}>›</span>
              <span style={{ fontSize: 12, color: C.gold }}>Edit Listing</span>
            </div>
            <h1 style={{ fontFamily: FD, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 400, color: C.text, lineHeight: 1.2, marginBottom: 6 }}>
              Edit <em style={{ fontStyle: 'italic', color: C.gold }}>Property Listing</em>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(245,242,236,0.45)' }}>Update your listing details. Changes take effect immediately after saving.</p>
          </div>
        </div>

        <form className="ppe-form" onSubmit={handleSubmit} style={{ maxWidth: 900, margin: '0 auto', padding: '32px 48px 80px' }}>

          {/* Step 1 — Listing type */}
          <SectionCard title="1. Listing Type">
            <div style={grid2}>
              <Field label="Listing Type">
                <SInput value={form.listing_type} onChange={set('listing_type') as (v: string) => void}
                  options={LISTING_TYPES.map(t => ({ value: t, label: t === 'sale' ? 'For Sale' : t === 'rent' ? 'For Rent' : 'Commercial' }))}
                  placeholder="Select type"
                />
              </Field>
              <Field label="Property Category">
                <SInput value={form.property_category} onChange={set('property_category') as (v: string) => void}
                  options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                  placeholder="Select category"
                />
              </Field>
            </div>
          </SectionCard>

          {/* Step 2 — Location */}
          <SectionCard title="2. Location">
            <div style={grid2}>
              <Field label="Address">
                <TInput value={form.address} onChange={set('address') as (v: string) => void} placeholder="Street address" />
              </Field>
              <Field label="Locality / Area">
                <TInput value={form.locality} onChange={set('locality') as (v: string) => void} placeholder="e.g. Banjara Hills" />
              </Field>
              <Field label="City">
                <SInput value={form.city} onChange={set('city') as (v: string) => void}
                  options={CITIES.map(c => ({ value: c, label: c }))} placeholder="Select city" />
              </Field>
              <Field label="State">
                <SInput value={form.state} onChange={set('state') as (v: string) => void}
                  options={STATES.map(s => ({ value: s, label: s }))} placeholder="Select state" />
              </Field>
              <Field label="Pincode">
                <TInput value={form.pincode} onChange={set('pincode') as (v: string) => void} placeholder="500001" />
              </Field>
              <Field label="Landmark">
                <TInput value={form.landmark} onChange={set('landmark') as (v: string) => void} placeholder="Near..." />
              </Field>
            </div>
          </SectionCard>

          {/* Step 3 — Property details */}
          <SectionCard title="3. Property Details">
            <div style={grid2}>
              <Field label="Built-up Area (sq ft)">
                <TInput value={form.built_up_area} onChange={set('built_up_area') as (v: string) => void} type="number" placeholder="e.g. 1200" />
              </Field>
              <Field label={COMMERCIAL_CATEGORIES.includes(form.property_category) ? 'Rooms / Cabins' : 'Bedrooms'}>
                <TInput value={form.bedrooms} onChange={set('bedrooms') as (v: string) => void} type="number" placeholder="e.g. 3" />
              </Field>
              <Field label={COMMERCIAL_CATEGORIES.includes(form.property_category) ? 'Washrooms' : 'Bathrooms'}>
                <TInput value={form.bathrooms} onChange={set('bathrooms') as (v: string) => void} type="number" placeholder="e.g. 2" />
              </Field>
              <Field label="Balconies">
                <TInput value={form.balconies} onChange={set('balconies') as (v: string) => void} type="number" placeholder="e.g. 1" />
              </Field>
              <Field label="Floor Number">
                <TInput value={form.floor_number} onChange={set('floor_number') as (v: string) => void} type="number" placeholder="e.g. 4" />
              </Field>
              <Field label="Total Floors">
                <TInput value={form.total_floors} onChange={set('total_floors') as (v: string) => void} type="number" placeholder="e.g. 12" />
              </Field>
              <Field label="Facing">
                <SInput value={form.facing} onChange={set('facing') as (v: string) => void}
                  options={FACING_OPTS.map(f => ({ value: f, label: f }))} placeholder="Select facing" />
              </Field>
              <Field label="Property Age">
                <SInput value={form.property_age} onChange={set('property_age') as (v: string) => void}
                  options={AGE_OPTS} placeholder="Select age" />
              </Field>
              <Field label="Furnishing">
                <SInput value={form.furnishing} onChange={set('furnishing') as (v: string) => void}
                  options={FURNISH_OPTS} placeholder="Select furnishing" />
              </Field>
              <Field label="Parking Spaces">
                <TInput value={form.parking} onChange={set('parking') as (v: string) => void} type="number" placeholder="0" />
              </Field>
            </div>
          </SectionCard>

          {/* Step 4 — Pricing */}
          <SectionCard title="4. Pricing">
            <div style={grid2}>
              <Field label="Price (₹)">
                <TInput value={form.price} onChange={set('price') as (v: string) => void} type="number" placeholder="e.g. 8500000" prefix="₹" />
              </Field>
              <Field label="Possession Status">
                <SInput value={form.possession_status} onChange={set('possession_status') as (v: string) => void}
                  options={POSSESSION_OPTS} placeholder="Select status" />
              </Field>
              <Field label="Maintenance Charge (₹/mo)">
                <TInput value={form.maintenance_charge} onChange={set('maintenance_charge') as (v: string) => void} type="number" placeholder="e.g. 5000" prefix="₹" />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={() => set('price_negotiable')(!form.price_negotiable)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: form.price_negotiable ? C.goldDim : 'transparent', border: `1px solid ${form.price_negotiable ? C.goldBorder : C.border}`, borderRadius: 8, cursor: 'pointer', fontFamily: FB, color: form.price_negotiable ? C.gold : C.textSub, fontSize: 13, fontWeight: form.price_negotiable ? 600 : 400 }}>
                <div style={{ width: 14, height: 14, border: `2px solid ${form.price_negotiable ? C.gold : C.textMuted}`, borderRadius: 3, background: form.price_negotiable ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {form.price_negotiable && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                Price is negotiable
              </button>
            </div>
          </SectionCard>

          {/* Step 5 — Amenities */}
          <SectionCard title="5. Amenities & Highlights">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {AMENITIES_LIST.map(a => {
                const active = form.amenities.includes(a)
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    style={{ padding: '7px 16px', borderRadius: 999, border: `1px solid ${active ? C.gold : C.border}`, background: active ? C.goldDim : 'transparent', color: active ? C.gold : C.textSub, fontFamily: FB, fontSize: '0.875rem', fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    {a}
                  </button>
                )
              })}
            </div>
            <Field label="Highlights / Description">
              <textarea value={form.highlights} onChange={e => set('highlights')(e.target.value)}
                placeholder="Describe what makes this property special…" rows={4}
                style={{ ...inp, resize: 'vertical', minHeight: 100, fontFamily: FB }} />
            </Field>
          </SectionCard>

          {/* Step 6 — Photos */}
          <SectionCard title="6. Photos">
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              Listings with 8+ photos receive 3× more inquiries. Click any photo to set it as the cover.
            </p>

            <div
              onDragOver={e => { e.preventDefault() }}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files) addPhotoFiles(e.dataTransfer.files) }}
              onClick={() => photoFileRef.current?.click()}
              style={{
                border: `2px dashed ${C.border}`,
                borderRadius: 14, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
                background: C.surface2, marginBottom: 20,
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>📸</div>
              <div style={{ fontFamily: FD, fontSize: '1.05rem', color: C.text, marginBottom: 4 }}>
                Drag & drop photos, or click to browse
              </div>
              <div style={{ fontSize: '0.75rem', color: C.textMuted }}>
                JPG, PNG, WEBP · Max 10 MB each
              </div>
            </div>

            <input
              ref={photoFileRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) addPhotoFiles(e.target.files); e.target.value = '' }}
            />

            {photoError && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 8, color: '#e05555', fontSize: 13, fontFamily: FB }}>
                {photoError}
              </div>
            )}

            {photoUploadProgress && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 13, fontFamily: FB }}>
                Uploading photo {photoUploadProgress.current} of {photoUploadProgress.total}…
              </div>
            )}

            {photos.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.875rem', color: C.textSub, fontFamily: FB }}>
                    {photos.length} photo{photos.length > 1 ? 's' : ''} · Drag to reorder
                  </span>
                  <span style={{ fontSize: '0.8rem', color: C.textMuted, fontFamily: FB }}>
                    Click any photo to set as cover
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {photos.map((photo, idx) => {
                    const isCover = idx === coverIndex
                    return (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => { photoDragItem.current = idx }}
                        onDragEnter={() => { photoDragTarget.current = idx }}
                        onDragEnd={onPhotoTileDragEnd}
                        onDragOver={e => e.preventDefault()}
                        onClick={() => setCoverIndex(idx)}
                        style={{
                          position: 'relative', borderRadius: 8, overflow: 'hidden',
                          border: `2px solid ${isCover ? C.gold : 'transparent'}`,
                          cursor: 'grab', aspectRatio: '4/3', userSelect: 'none',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url} alt={`Property photo ${idx + 1}`}
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
                        {photo.kind === 'new' && (
                          <div style={{
                            position: 'absolute', top: 6, right: 30,
                            background: 'rgba(0,0,0,0.65)', color: C.gold,
                            fontSize: '0.6rem', fontWeight: 700, fontFamily: FB,
                            padding: '2px 6px', borderRadius: 4,
                          }}>NEW</div>
                        )}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removePhoto(photo, idx) }}
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
          </SectionCard>

          {/* Step 7 — Contact */}
          <SectionCard title="7. Contact Details">
            <div style={grid2}>
              <Field label="Your Name">
                <TInput value={form.seller_name} onChange={set('seller_name') as (v: string) => void} placeholder="Full name" />
              </Field>
              <Field label="Phone">
                <TInput value={form.seller_phone} onChange={set('seller_phone') as (v: string) => void} type="tel" placeholder="+91 98765 43210" />
              </Field>
              <Field label="WhatsApp">
                <TInput value={form.seller_whatsapp} onChange={set('seller_whatsapp') as (v: string) => void} type="tel" placeholder="+91 98765 43210" />
              </Field>
            </div>
          </SectionCard>

          {/* Step 8 — Floor Plans */}
          <SectionCard title="8. Floor Plans">
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              Optional — add one floor plan, or several for multi-config projects (e.g. &ldquo;2BHK - Type A&rdquo;, &ldquo;3BHK - Type B&rdquo;). Changes save immediately.
            </p>

            {floorPlans.length > 0 && (
              <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                {floorPlans.map((plan, idx) => (
                  <div key={plan.id} style={{ display: 'flex', gap: 14, alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, background: C.surface2 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={plan.image_url} alt={`Floor plan ${idx + 1}`} style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={lbl}>Label (optional)</label>
                      <input
                        type="text"
                        value={plan.label ?? ''}
                        onChange={e => updateFloorPlanLabel(plan.id, e.target.value)}
                        onBlur={e => saveFloorPlanLabel(plan.id, e.target.value)}
                        placeholder={`e.g. 2BHK - Type ${String.fromCharCode(65 + idx)}`}
                        style={inp}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFloorPlan(plan.id)}
                      style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', lineHeight: 1, fontFamily: FB }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fpFileRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) addFloorPlanFiles(e.target.files); e.target.value = '' }}
            />
            <button
              type="button"
              disabled={fpUploading}
              onClick={() => fpFileRef.current?.click()}
              style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.goldBorder}`, background: 'transparent', color: C.gold, fontFamily: FB, fontSize: '0.875rem', fontWeight: 600, cursor: fpUploading ? 'not-allowed' : 'pointer', opacity: fpUploading ? 0.6 : 1 }}
            >
              {fpUploading ? 'Uploading…' : '+ Add Floor Plan'}
            </button>

            {fpError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 8, color: '#e05555', fontSize: 13, fontFamily: FB }}>
                {fpError}
              </div>
            )}
          </SectionCard>

          {/* Error */}
          {error && (
            <div style={{ padding: '14px 20px', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 10, color: '#e05555', fontSize: 14, fontFamily: FB, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <a href="/dashboard/my-listings"
              style={{ padding: '13px 24px', borderRadius: 8, border: `1px solid ${C.border}`, color: C.textSub, fontFamily: FB, fontWeight: 500, fontSize: '0.9375rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Cancel
            </a>
            <button type="submit" disabled={saving}
              style={{ background: `linear-gradient(135deg, ${C.gold} 0%, #0B9C9B 100%)`, color: '#0a0a0a', fontFamily: FB, fontWeight: 600, fontSize: '0.9375rem', padding: '13px 36px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, letterSpacing: '0.02em', transition: 'opacity 0.15s' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
