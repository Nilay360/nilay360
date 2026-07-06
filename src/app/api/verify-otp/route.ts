import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()
    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })
    }

    if (process.env.MSG91_TEST_MODE === 'true' && otp === '123456') {
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

    if (data.type === 'error') {
      return NextResponse.json({ error: data.message || 'Invalid OTP' }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('verify-otp route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
