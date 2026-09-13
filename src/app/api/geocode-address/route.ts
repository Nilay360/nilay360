import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'

export async function POST(req: NextRequest) {
  const { address } = await req.json()
  if (!address || typeof address !== 'string') {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }
  const result = await geocodeAddress(address)
  return NextResponse.json({ result }) // result is null on any failure — never an error status
}
