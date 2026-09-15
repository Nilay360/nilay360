import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Records one property-view event, deduped to at most one per
// property+visitor+day by the UNIQUE(property_id, viewer_key, view_date)
// constraint on property_view_events (066_view_and_click_tracking.sql) — a
// repeat same-day visit is a structural no-op via ON CONFLICT, not
// application logic remembering not to double-count. Service-role insert
// required: that table has no INSERT policy for anon/authenticated at all
// (every write goes through this route by design).
//
// This is pure analytics — always returns success (200) regardless of
// outcome. A tracking failure must never surface as an error to the
// visitor or affect the page they're on; the worst case is one missed or
// duplicate-but-harmless-because-deduped view event, not a broken page.
export async function POST(req: NextRequest) {
  try {
    const { propertyId, viewerKey } = await req.json()
    if (!propertyId || !viewerKey) {
      return NextResponse.json({ success: true })
    }

    const supabase = adminClient()
    const { error } = await supabase
      .from('property_view_events')
      .upsert(
        { property_id: propertyId, viewer_key: viewerKey },
        { onConflict: 'property_id,viewer_key,view_date', ignoreDuplicates: true }
      )

    if (error) {
      console.error('[track-property-view] Insert failed:', error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[track-property-view] Unexpected error:', err)
    return NextResponse.json({ success: true })
  }
}
