/**
 * Shipping rates via backend POST /api/shipping-rates (zone-based: UK / EU / International).
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Get shipping rates for a destination (country determines zone).
 * @param {{ countryCode: string }}
 * @returns {Promise<{ rates: Array<{ id: string, carrier: string, serviceName: string, amount: number, currency: string, estimatedDays?: string }> }>}
 */
export async function getShippingRates({ countryCode }) {
  const res = await fetch(`${API_URL}/api/shipping-rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: (countryCode || 'GB').trim(),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (Array.isArray(data.rates) && data.rates.length > 0) {
      return { rates: data.rates }
    }
    const base = data.message || data.error || 'We couldn’t load shipping options'
    let details = ''
    if (Array.isArray(data.apiErrors) && data.apiErrors.length > 0) {
      details = data.apiErrors
        .map((e) => (e && (e.message || e.error_message || e.error_code || e)))
        .filter(Boolean)
        .join('; ')
    }
    throw new Error(details ? `${base}. ${details}` : `${base}. Please try again or contact us.`)
  }
  return { rates: data.rates || [] }
}
