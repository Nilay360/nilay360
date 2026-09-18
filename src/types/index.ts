// ── Nilay 360 — Core Type Definitions ─────────────────────────────────────────

export type UserRole = "buyer" | "seller" | "agent" | "agency" | "admin" | "super_admin" | "moderator"

export interface User {
  id: string
  email: string
  phone?: string
  full_name: string
  avatar_url?: string
  role: UserRole
  is_verified: boolean
  created_at: string
}

export type PropertyType = "apartment" | "villa" | "plot" | "office" | "retail" | "warehouse" | "penthouse" | "townhouse"
export type ListingType  = "sale" | "rent" | "commercial"
export type PropertyStatus = "active" | "pending" | "sold" | "rented" | "inactive"

export interface Property {
  id: string
  slug: string
  title: string
  description: string
  type: PropertyType
  listing_type: ListingType
  status: PropertyStatus
  price: number
  price_per_sqft?: number
  area_sqft: number
  bedrooms?: number
  bathrooms?: number
  parking?: number
  floor?: number
  total_floors?: number
  year_built?: number
  is_furnished?: boolean
  is_new_construction?: boolean
  rera_number?: string
  address: string
  city: string
  neighbourhood?: string
  state: string
  pincode?: string
  latitude?: number
  longitude?: number
  images: string[]
  video_url?: string
  // Seller-uploaded walkthrough clip (Bunny Stream), distinct from
  // video_url (a pasted YouTube/Vimeo link, rendered by its own separate
  // "Video Tour" section) — see supabase/migrations/
  // 068_property_video_upload.sql for the full naming rationale. Only
  // rendered as a gallery slide when video_asset_status === 'ready';
  // any other value (processing/failed/null) means the slide doesn't
  // exist in the gallery at all — never a broken placeholder.
  video_asset_provider?: string | null
  video_asset_id?: string | null
  video_asset_status?: 'processing' | 'ready' | 'failed' | null
  video_asset_thumbnail_url?: string | null
  virtual_tour_url?: string
  floor_plan_url?: string
  amenities: string[]
  agent_id?: string
  developer_id?: string
  is_featured: boolean
  views: number
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  full_name: string
  photo_url?: string
  bio?: string
  specialisation?: string[]
  years_experience?: number
  rera_number?: string
  languages?: string[]
  cities?: string[]
  total_listings: number
  total_sold: number
  rating: number
  review_count: number
  phone: string
  email: string
  whatsapp?: string
  is_verified: boolean
  is_featured: boolean
}

export interface Lead {
  id: string
  property_id: string
  buyer_id?: string
  name: string
  email: string
  phone: string
  message?: string
  budget?: number
  preferred_date?: string
  status: "new" | "contacted" | "qualified" | "viewing_scheduled" | "negotiation" | "closed" | "lost"
  agent_id?: string
  created_at: string
}

export interface SearchFilters {
  listing_type?: ListingType
  property_type?: PropertyType[]
  city?: string
  neighbourhood?: string
  min_price?: number
  max_price?: number
  bedrooms?: number[]
  min_area?: number
  max_area?: number
  is_furnished?: boolean
  amenities?: string[]
  is_new_construction?: boolean
  sort?: "newest" | "price_asc" | "price_desc" | "most_popular" | "featured" | "area_desc"
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  featured_image?: string
  category: string
  tags: string[]
  author_id: string
  is_published: boolean
  published_at?: string
  seo_title?: string
  seo_description?: string
}
