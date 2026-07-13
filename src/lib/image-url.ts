const CLOUDINARY_MARKER = 'res.cloudinary.com'
const UPLOAD_SEGMENT = '/upload/'

// Cloudinary URLs get resized/compressed on the fly; anything else (Supabase
// storage, Unsplash, blob previews) is returned unchanged so old data and
// non-Cloudinary sources keep rendering as-is.
export function optimizedImageUrl(url: string | null | undefined, width: number): string {
  if (!url) return ''
  if (!url.includes(CLOUDINARY_MARKER) || !url.includes(UPLOAD_SEGMENT)) return url
  const [prefix, suffix] = url.split(UPLOAD_SEGMENT)
  return `${prefix}${UPLOAD_SEGMENT}f_auto,q_auto,w_${width}/${suffix}`
}
