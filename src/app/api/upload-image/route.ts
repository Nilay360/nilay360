import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'nilay360/properties',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          max_bytes: 10_000_000,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    // Surface the real reason (e.g. Cloudinary's own "File size too large"
    // or format-rejection message) instead of a generic string — the
    // client displays this directly so a future failure is diagnosable
    // from the UI alone, not just server logs.
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
