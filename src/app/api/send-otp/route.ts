import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Test mode: only active when explicitly set AND not in production
    if (process.env.MSG91_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, requestId: 'test-mode', testMode: true })
    }

    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        sender: process.env.MSG91_SENDER_ID || 'NILAYS',
      }),
    })

    const data = await response.json()

    if (!response.ok || data.type === 'error') {
      console.error('MSG91 send-otp error:', data)
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, requestId: data.request_id })
  } catch (error) {
    console.error('send-otp route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
