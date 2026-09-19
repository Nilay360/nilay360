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

// Notifies the requester once an admin schedules or declines their 360°
// capture request. Service-role insert — required because notifications'
// RLS ("notif_own") only permits a user to insert a row for their own
// user_id, and this is written by the admin acting on someone else's
// request, same reasoning as notify-admin-agent/notify-agent-contact.
// Fire-and-forget from the admin UI, always 200 — a failure here only
// means the requester finds out via their own dashboard listing instead
// of the notification bell, not a lost status change (the durable record
// is the capture_360_requests row itself, already updated by the time
// this is called).
export async function POST(req: NextRequest) {
  try {
    const {
      requesterId, status, propertyTitle, scheduledDate, scheduledTimeSlot, adminNotes,
      suggestedAlternativeDate1, suggestedAlternativeDate2,
    } = await req.json()

    if (!requesterId || (status !== 'scheduled' && status !== 'declined')) {
      return NextResponse.json({ error: 'requesterId and a valid status are required' }, { status: 400 })
    }

    const title = status === 'scheduled' ? '360° capture scheduled' : '360° capture request declined'
    // Alternatives are decline-only (migration 072) — admin-entered
    // structured dates, not free text, so they're formatted here rather
    // than expecting the admin to have typed them into adminNotes.
    const alternatives = [suggestedAlternativeDate1, suggestedAlternativeDate2].filter(Boolean)
    const body = status === 'scheduled'
      ? `Your 360° capture for "${propertyTitle ?? 'your listing'}" is scheduled for ${scheduledDate ?? 'TBD'}${scheduledTimeSlot ? ` (${scheduledTimeSlot})` : ''}.${adminNotes ? ` Note: ${adminNotes}` : ''}`
      : `Your 360° capture request for "${propertyTitle ?? 'your listing'}" was declined.` +
        (alternatives.length ? ` Suggested alternatives: ${alternatives.join(', ')}.` : '') +
        (adminNotes ? ` Reason: ${adminNotes}` : '')

    const supabase = adminClient()
    const { error } = await supabase.from('notifications').insert({
      user_id: requesterId,
      title,
      body,
      type: 'capture_360_status',
      action_url: '/dashboard/my-listings',
    })

    if (error) {
      console.error('[notify-capture-requester] Failed to insert notification:', error)
      return NextResponse.json({ notified: false })
    }

    // WhatsApp, alongside the in-app notification above — fire-and-forget,
    // never blocks this route's response. Requires its own lookup since this
    // route is only ever called with requesterId, never their phone.
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('phone, full_name')
      .eq('id', requesterId)
      .maybeSingle()
    if (requesterProfile?.phone) {
      void sendWhatsAppMessage(requesterProfile.phone, requesterProfile.full_name?.trim() || 'there', body)
    }

    return NextResponse.json({ notified: true })
  } catch (err) {
    console.error('[notify-capture-requester] Unexpected error:', err)
    return NextResponse.json({ notified: false })
  }
}
