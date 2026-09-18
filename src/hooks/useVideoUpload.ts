import { useCallback, useRef, useState } from 'react'
import * as tus from 'tus-js-client'

// Shared by post-property/page.tsx (create) and post-property/edit/[id]/
// page.tsx (edit) — one video tile per listing, uploaded via Bunny
// Stream's TUS resumable protocol directly from the browser. Mirrors the
// photo tiles' "validate client-side, upload immediately, keep the
// result in form state" shape, but video only ever has one slot (not a
// growing array like photos), since Phase 1 scopes exactly one uploaded
// clip per listing.
//
// Phase 1 stops here: once tus reports success, this hook's status is
// 'processing' and stays there — no polling loop is started. Bunny's
// webhook (src/app/api/bunny-webhook/route.ts) is what eventually flips
// video_upload_sessions.status to 'ready'/'failed'; picking that status
// back up (on this page, or on the property detail page) is Phase 2
// work, deliberately not built here.

// Matches src/app/api/upload-video/route.ts's MAX_VIDEO_BYTES/
// MAX_VIDEO_SECONDS exactly — duplicated as constants here (not
// imported) because that file is a server route and this is a client
// hook; keep both in sync by hand if either changes.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 90
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export type VideoUploadPhase = 'idle' | 'validating' | 'uploading' | 'processing' | 'failed'

export interface VideoUploadState {
  phase: VideoUploadPhase
  progress: number // 0-100, only meaningful during 'uploading'
  error: string | null
  previewUrl: string | null // local blob URL, for an immediate thumbnail-less preview
  videoAssetProvider: string | null
  videoAssetId: string | null
  videoAssetStatus: 'processing' | 'ready' | 'failed' | null
  videoAssetThumbnailUrl: string | null
}

const INITIAL_STATE: VideoUploadState = {
  phase: 'idle',
  progress: 0,
  error: null,
  previewUrl: null,
  videoAssetProvider: null,
  videoAssetId: null,
  videoAssetStatus: null,
  videoAssetThumbnailUrl: null,
}

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video metadata — the file may be corrupt or an unsupported codec.'))
    }
    video.src = url
  })
}

export function useVideoUpload() {
  const [state, setState] = useState<VideoUploadState>(INITIAL_STATE)
  const uploadRef = useRef<tus.Upload | null>(null)

  const reset = useCallback(() => {
    uploadRef.current?.abort()
    uploadRef.current = null
    setState(INITIAL_STATE)
  }, [])

  const pickFile = useCallback(async (file: File) => {
    setState({ ...INITIAL_STATE, phase: 'validating' })

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setState({ ...INITIAL_STATE, phase: 'failed', error: `Unsupported video type: ${file.type || 'unknown'}. Use MP4, MOV, or WEBM.` })
      return
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setState({ ...INITIAL_STATE, phase: 'failed', error: `Video is over the ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit.` })
      return
    }

    let duration: number
    try {
      duration = await readVideoDurationSeconds(file)
    } catch (err) {
      setState({ ...INITIAL_STATE, phase: 'failed', error: err instanceof Error ? err.message : 'Could not read video metadata.' })
      return
    }
    if (duration > MAX_VIDEO_SECONDS) {
      setState({ ...INITIAL_STATE, phase: 'failed', error: `Video is ${Math.round(duration)}s — please trim it to ${MAX_VIDEO_SECONDS}s or under.` })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setState(s => ({ ...s, phase: 'uploading', previewUrl }))

    let init: {
      videoAssetId: string
      videoAssetProvider: string
      tus: { endpoint: string; headers: Record<string, string>; metadata: Record<string, string> }
    }
    try {
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, filetype: file.type, sizeBytes: file.size }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Could not start the video upload.')
      init = json
    } catch (err) {
      setState(s => ({ ...s, phase: 'failed', error: err instanceof Error ? err.message : 'Could not start the video upload.' }))
      return
    }

    const upload = new tus.Upload(file, {
      endpoint: init.tus.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: init.tus.headers,
      metadata: init.tus.metadata,
      onError: (err) => {
        setState(s => ({ ...s, phase: 'failed', error: err.message || 'Video upload failed.' }))
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        setState(s => ({ ...s, progress: Math.round((bytesUploaded / bytesTotal) * 100) }))
      },
      onSuccess: () => {
        setState(s => ({
          ...s,
          phase: 'processing',
          progress: 100,
          videoAssetProvider: init.videoAssetProvider,
          videoAssetId: init.videoAssetId,
          videoAssetStatus: 'processing',
        }))
      },
    })
    uploadRef.current = upload
    upload.start()
  }, [])

  return { state, pickFile, reset }
}
