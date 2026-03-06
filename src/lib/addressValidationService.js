/**
 * Address format validation via backend POST /api/addresses/validate (server-side, no external API).
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Validate one or more addresses.
 * @param {Array<{ address_line1: string, address_line2?: string, city_locality?: string, state_province?: string, postal_code: string, country_code: string }> | { address_line1: string, postal_code: string, country_code: string }} addresses
 * @returns {Promise<{ results: Array<{ status: string, original_address: object, matched_address: object, messages: Array }> }>}
 */
export async function validateAddresses(addresses) {
  const body = Array.isArray(addresses) ? addresses : [addresses]
  const res = await fetch(`${API_URL}/api/addresses/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Address validation failed')
    err.code = data.code
    throw err
  }
  return { results: data.results || [] }
}
