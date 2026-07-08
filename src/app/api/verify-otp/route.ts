import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()
    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
    }

    // Test mode: only active when explicitly set AND not in production
    if (process.env.MSG91_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production' && otp === '123456') {
      return NextResponse.json({ success: true, verified: true, testMode: true })
    }

    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${phone}`,
      {
        method: 'GET',
        headers: { 'authkey': process.env.MSG91_AUTH_KEY! },
      }
    )

    const data = await response.json()

    if (!response.ok || data.type === 'error') {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please try again.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('verify-otp route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
