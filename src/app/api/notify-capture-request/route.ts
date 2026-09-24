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

// Notifies every admin when a seller/agent requests a 360° capture for a
// listing. Same service-role insert-into-notifications pattern as
// notify-admin-agent and notify-agent-contact tonight — fire-and-forget
// from the caller, never blocks the capture_360_requests insert that
// already succeeded by the time this is called. Always 200; a failure
// here only means the admin finds out via the admin panel's Capture 360°
// Requests tab instead of the notification bell, not a lost request (the
// durable record is the capture_360_requests row itself).
export async function POST(req: NextRequest) {
  try {
    const { propertyTitle, propertyAddress, requesterName } = await req.json()

    const supabase = adminClient()
    const { data: admins, error: adminsErr } = await supabase
      .from('profiles')
      .select('id, phone, full_name')
      .in('role', ['admin', 'super_admin'])

    if (adminsErr) {
      console.error('[notify-capture-request] Failed to look up admin recipients:', adminsErr)
      return NextResponse.json({ notified: false })
    }

    if (admins?.length) {
      const notificationBody = `${requesterName ?? 'Someone'} requested a 360° capture for "${propertyTitle ?? 'a listing'}"${propertyAddress ? ` — ${propertyAddress}` : ''}.`
      const rows = admins.map((a) => ({
        user_id: a.id,
        title: '360° capture request',
        body: notificationBody,
        type: 'capture_360_request',
        action_url: '/admin?section=capture360',
      }))
      const { error: notifErr } = await supabase.from('notifications').insert(rows)
      if (notifErr) {
        console.error('[notify-capture-request] Failed to insert admin notifications:', notifErr)
        return NextResponse.json({ notified: false })
      }

      // WhatsApp, alongside the in-app notifications above — fire-and-forget
      // per admin, never blocks or fails this route.
      for (const admin of admins) {
        if (admin.phone) {
          console.log(`[notify-capture-request] Calling sendWhatsAppMessage for admin ${admin.id}...`)
          // after(), not a bare promise: Vercel can freeze the function once
          // the response is sent, cutting off an un-awaited MSG91 call.
          const phone = admin.phone, name = admin.full_name?.trim() || 'there'
          after(() => sendWhatsAppMessage(phone, name, notificationBody))
        } else {
          console.log(`[notify-capture-request] Skipping — no phone on file for admin ${admin.id}`)
        }
      }
    }

    return NextResponse.json({ notified: true })
  } catch (err) {
    console.error('[notify-capture-request] Unexpected error:', err)
    return NextResponse.json({ notified: false })
  }
}
