/**
 * Backend API base URL. Use this for all fetch() calls to the orders/checkout/shipping server.
 * When deployed: set VITE_API_URL at build time to your backend URL (e.g. https://api.fanxcharms.com).
 * If unset in production and the app is served from the same origin as the API, we fall back to current origin.
 */
export function getApiUrl() {
  const env = import.meta.env.VITE_API_URL
  if (env && env.trim()) return env.trim().replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost') {
    return window.location.origin
  }
  return 'http://localhost:3001'
}
