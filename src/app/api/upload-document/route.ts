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
          folder: 'nilay360/documents',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
          // PDFs need this — the image-only route can omit it and default
          // to Cloudinary's implicit resource_type: 'image', but that
          // default rejects PDFs outright. 'auto' lets Cloudinary detect
          // image vs. non-image per file, which is required now that both
          // are accepted through the same endpoint.
          resource_type: 'auto',
          max_bytes: 25_000_000,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      ).end(buffer)
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Cloudinary document upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
