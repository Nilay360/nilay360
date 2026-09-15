import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Notifies whoever manages a listing when someone new saves it. Called from
// useSavedProperties.ts's toggleSave() fire-and-forget, only after a
// successful INSERT (never on unsave — losing a save isn't a notification-
// worthy event). Service-role insert required — notifications' RLS
// ("notif_own") only lets a session insert a row for itself, and the
// inserting session here is the SAVER, not the recipient, same reasoning as
// every other notify-* route tonight.
//
// OWNER VS. ASSIGNED-AGENT PRIORITY: when a listing has an assigned_agent_id,
// the agent is notified instead of the owner, not in addition to them. This
// mirrors the site's own existing precedent, not an arbitrary pick: once an
// agent is assigned to a listing, inquiries route to that agent
// (assigned_to on the inquiries row, /agent/leads), and 062's
// capture_360_requests RLS already treats the assigned agent as an equal
// co-manager alongside the owner for read/write access. The agent is the
// one actively working this listing's leads day-to-day; the owner is the
// fallback recipient only for listings nobody has been assigned to yet —
// notifying both would duplicate a signal the agent (once assigned) is
// already the designated point of contact for.
export async function POST(req: NextRequest) {
  try {
    const { propertyId, saverId } = await req.json()
    if (!propertyId || !saverId) {
      return NextResponse.json({ notified: false })
    }

    const supabase = adminClient()

    const { data: listing, error: listingErr } = await supabase
      .from('property_listings')
      .select('title, slug, user_id, assigned_agent_id')
      .eq('id', propertyId)
      .maybeSingle()

    if (listingErr || !listing) {
      console.error('[notify-listing-saved] Listing lookup failed:', listingErr)
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

    // No identifiable owner/agent (e.g. a legacy seller_email-only listing
    // with no user_id) — nothing to notify, not a failure.
    if (!targetUserId) {
      return NextResponse.json({ notified: false })
    }

    // Never notify someone about saving their own listing.
    if (targetUserId === saverId) {
      return NextResponse.json({ notified: false })
    }

    const { data: saverProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', saverId)
      .maybeSingle()

    const notificationBody = `${saverProfile?.full_name?.trim() || 'Someone'} saved your listing "${listing.title ?? 'your property'}".`

    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      title: 'New save on your listing',
      body: notificationBody,
      type: 'listing_saved',
      action_url: listing.slug ? `/property/${listing.slug}` : '/dashboard/my-listings',
    })

    if (notifErr) {
      console.error('[notify-listing-saved] Failed to insert notification:', notifErr)
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
      console.log(`[notify-listing-saved] Calling sendWhatsAppMessage for ${targetUserId}...`)
      void sendWhatsAppMessage(targetProfile.phone, targetProfile.full_name?.trim() || 'there', notificationBody)
    } else {
      console.log(`[notify-listing-saved] Skipping — no phone on file for ${targetUserId}`)
    }

    return NextResponse.json({ notified: true })
  } catch (err) {
    console.error('[notify-listing-saved] Unexpected error:', err)
    return NextResponse.json({ notified: false })
  }
}
