import { getApiOrigin } from '../config/apiOrigin'

/** Resolve display URL for a screenshot: Cloudinary HTTPS, or legacy local filename. */
export function resolveScreenshotUrl(shot) {
  const origin = getApiOrigin()
  const uploads = (name) => `${origin}/uploads/trades/${name}`
  if (shot == null) return ''
  if (typeof shot === 'string') {
    if (shot.startsWith('http')) return shot
    return uploads(shot)
  }
  if (typeof shot === 'object' && shot.url) {
    const u = shot.url
    if (u.startsWith('http')) return u
    if (u.startsWith('/')) return origin ? `${origin}${u}` : u
    return uploads(u)
  }
  return ''
}

export function screenshotKey(shot, index) {
  const u = resolveScreenshotUrl(shot)
  return u ? `${u}-${index}` : `shot-${index}`
}
