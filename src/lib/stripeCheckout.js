/**
 * Stripe Checkout – create session and redirect to Stripe-hosted payment page.
 * Backend must be configured with STRIPE_SECRET_KEY (see server/ and .env).
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Create a Stripe Checkout Session and return the redirect URL.
 * @param {{ amount: number, currency?: string, orderId: string, description?: string, success_url?: string, cancel_url?: string }} opts
 * @returns {Promise<{ url: string }>}
 */
export async function createStripeCheckout(opts) {
  const { amount, currency = 'gbp', orderId, description, success_url, cancel_url } = opts
  const res = await fetch(`${API_URL}/api/create-stripe-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency,
      orderId,
      description: description || `Order ${orderId}`,
      success_url: success_url || `${window.location.origin}/?order=success&orderId=${encodeURIComponent(orderId)}`,
      cancel_url: cancel_url || `${window.location.origin}/checkout`,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.message || data.error || 'We couldn’t open the payment page. Please try again.')
    err.code = data.error
    err.status = res.status
    throw err
  }

  if (!data.url) {
    throw new Error('We couldn’t start payment. Please try again.')
  }

  return { url: data.url }
}
