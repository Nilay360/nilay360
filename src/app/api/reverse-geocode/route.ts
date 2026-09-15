import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/geocode'

export async function POST(req: NextRequest) {
  const { lat, lng } = await req.json()
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng (numbers) required' }, { status: 400 })
  }
  const result = await reverseGeocode(lat, lng)
  return NextResponse.json({ result }) // result is null on any failure — never an error status
}
