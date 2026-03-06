/**
 * SumUp hosted checkout – create checkout and get redirect URL.
 * Backend must be configured (see server/ and .env).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Create a SumUp hosted checkout and return the payment URL.
 * @param {{ amount: number, currency?: string, checkout_reference: string, description?: string, redirect_url?: string }} opts
 * @returns {Promise<{ hosted_checkout_url: string }>}
 */
export async function createSumUpCheckout(opts) {
  const { amount, currency = 'GBP', checkout_reference, description, redirect_url } = opts
  const res = await fetch(`${API_URL}/api/create-sumup-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency,
      checkout_reference,
      description: description || `Order ${checkout_reference}`,
      redirect_url: redirect_url || `${window.location.origin}/?order=success`,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Checkout failed')
    err.code = data.error
    err.status = res.status
    throw err
  }

  if (!data.hosted_checkout_url) {
    throw new Error('No payment URL returned')
  }

  return { hosted_checkout_url: data.hosted_checkout_url }
}
