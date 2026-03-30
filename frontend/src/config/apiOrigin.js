/**
 * Backend origin for API + uploads (from `frontend/.env` as VITE_API_URL).
 * Empty = same origin (Vite dev proxy or Docker nginx). No trailing slash.
 */
export function getApiOrigin() {
  const v = import.meta.env.VITE_API_URL
  if (v == null || v === '') return ''
  return String(v).replace(/\/$/, '')
}
