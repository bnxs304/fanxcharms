/**
 * Address format validation via backend POST /api/addresses/validate (server-side, no external API).
 */
import { getApiUrl } from './apiUrl'

/**
 * Validate one or more addresses.
 * @param {Array<{ address_line1: string, address_line2?: string, city_locality?: string, state_province?: string, postal_code: string, country_code: string }> | { address_line1: string, postal_code: string, country_code: string }} addresses
 * @returns {Promise<{ results: Array<{ status: string, original_address: object, matched_address: object, messages: Array }> }>}
 */
function isNetworkError(message) {
  if (!message || typeof message !== 'string') return false
  const m = message.toLowerCase()
  return m === 'failed to fetch' || m === 'load failed' || m.includes('network error') || m.includes('loadfailed')
}

export async function validateAddresses(addresses) {
  const body = Array.isArray(addresses) ? addresses : [addresses]
  let res
  try {
    res = await fetch(`${getApiUrl()}/api/addresses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = isNetworkError(err?.message) ? 'We couldn’t check your address right now. Please try again in a moment.' : (err?.message || 'We couldn’t check that address. Please try again.')
    throw new Error(msg)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'We couldn’t check that address. Please try again.')
    err.code = data.code
    throw err
  }
  return { results: data.results || [] }
}
