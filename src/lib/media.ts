// Generate high-quality image thumbnail (600px)
export async function generateImageThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new globalThis.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 600
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// Generate multiple video frames at evenly spaced intervals
export async function generateVideoFrames(file: File, count: number): Promise<(Blob | null)[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const frames: (Blob | null)[] = []

    function captureCurrentFrame(): Promise<Blob | null> {
      return new Promise((res) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              const canvas = document.createElement('canvas')
              const maxSize = 600
              const vw = video.videoWidth || 640
              const vh = video.videoHeight || 360
              const ratio = Math.min(maxSize / vw, maxSize / vh, 1)
              canvas.width = vw * ratio
              canvas.height = vh * ratio
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              canvas.toBlob((blob) => res(blob), 'image/jpeg', 0.85)
            } catch {
              res(null)
            }
          })
        })
      })
    }

    video.onloadedmetadata = async () => {
      const duration = video.duration
      for (let i = 0; i < count; i++) {
        const time = (duration * (i + 1)) / (count + 1)
        video.currentTime = time

        await new Promise<void>((seekDone) => {
          video.onseeked = () => seekDone()
        })

        const blob = await captureCurrentFrame()
        frames.push(blob)
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = () => { URL.revokeObjectURL(url); resolve([]) }
    setTimeout(() => { URL.revokeObjectURL(url); resolve(frames) }, 30000)

    video.src = url
    video.load()
  })
}
