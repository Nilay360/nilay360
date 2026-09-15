import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Records one photo-open/zoom event. Unlike track-property-view, every
// click is a distinct real engagement event — no day-dedup, plain INSERT,
// per 066_view_and_click_tracking.sql (property_image_clicks has no UNIQUE
// constraint by design). Service-role insert required: no INSERT policy
// for anon/authenticated on that table either.
//
// Pure analytics — always returns success (200) regardless of outcome,
// same reasoning as track-property-view.
export async function POST(req: NextRequest) {
  try {
    const { propertyId, imageUrl, viewerKey } = await req.json()
    if (!propertyId || !viewerKey) {
      return NextResponse.json({ success: true })
    }

    const supabase = adminClient()
    const { error } = await supabase
      .from('property_image_clicks')
      .insert({ property_id: propertyId, image_url: imageUrl ?? null, viewer_key: viewerKey })

    if (error) {
      console.error('[track-image-click] Insert failed:', error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[track-image-click] Unexpected error:', err)
    return NextResponse.json({ success: true })
  }
}
