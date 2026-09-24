import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Notifies a listing's submitter when an admin requests changes on their
// pending submission (migration 074's changes_requested_note). Called
// from the admin panel's Pending Review preview, fire-and-forget, after
// the property_listings row has already been updated — a failure here
// only means the submitter finds out via their own dashboard instead of
// the notification bell, not a lost request (the durable record is the
// property_listings row itself). Service-role insert required —
// notifications' RLS ("notif_own") only permits a session to insert a
// row for itself, and the admin is writing on someone else's behalf,
// same reasoning as every other notify-* route tonight.
//
// OWNER VS. ASSIGNED-AGENT PRIORITY: same precedent as notify-listing-
// saved — once an agent is assigned to a listing, they're the one
// actively working it day-to-day, so they're notified instead of the
// owner, not in addition.
export async function POST(req: NextRequest) {
  try {
    const { propertyId, note } = await req.json()
    if (!propertyId) {
      return NextResponse.json({ notified: false })
    }

    const supabase = adminClient()

    const { data: listing, error: listingErr } = await supabase
      .from('property_listings')
      .select('id, title, user_id, assigned_agent_id')
      .eq('id', propertyId)
      .maybeSingle()

    if (listingErr || !listing) {
      console.error('[notify-listing-changes-requested] Listing lookup failed:', listingErr)
      return NextResponse.json({ notified: false })
    }

    let targetUserId: string | null = null
    if (listing.assigned_agent_id) {
      const { data: agentProfile } = await supabase
        .from('agent_profiles')
        .select('user_id')
        .eq('id', listing.assigned_agent_id)
        .maybeSingle()
      targetUserId = agentProfile?.user_id ?? null
    }
    if (!targetUserId) {
      targetUserId = listing.user_id ?? null
    }

    // No identifiable owner/agent (e.g. a legacy seller_email-only
    // listing with no user_id) — nothing to notify, not a failure. The
    // changes_requested_note itself is still saved on the row either
    // way; this route only handles the in-app/WhatsApp nudge.
    if (!targetUserId) {
      return NextResponse.json({ notified: false })
    }

    const notificationBody = note && String(note).trim()
      ? `Changes requested on "${listing.title ?? 'your listing'}": ${note}`
      : `An admin requested changes on "${listing.title ?? 'your listing'}". Please review and resubmit.`

    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      title: 'Changes requested on your listing',
      body: notificationBody,
      type: 'listing_changes_requested',
      action_url: `/post-property/edit/${propertyId}`,
    })

    if (notifErr) {
      console.error('[notify-listing-changes-requested] Failed to insert notification:', notifErr)
      return NextResponse.json({ notified: false })
    }

    // WhatsApp, alongside the in-app notification above — fire-and-forget,
    // never blocks this route's response.
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('phone, full_name')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetProfile?.phone) {
      // after(), not a bare promise: Vercel can freeze the function once the
      // response is sent, cutting off an un-awaited MSG91 call.
      const phone = targetProfile.phone, name = targetProfile.full_name?.trim() || 'there'
      after(() => sendWhatsAppMessage(phone, name, notificationBody))
    }

    return NextResponse.json({ notified: true })
  } catch (err) {
    console.error('[notify-listing-changes-requested] Unexpected error:', err)
    return NextResponse.json({ notified: false })
  }
}
