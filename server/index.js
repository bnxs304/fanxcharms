/**
 * Backend: SumUp checkout + order management (Firestore).
 * Production: set NODE_ENV=production, CORS_ORIGIN to your frontend URL(s), all secrets via env.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'

const isProd = process.env.NODE_ENV === 'production'
const app = express()
const PORT = process.env.PORT || 3001
const SUMUP_API = 'https://api.sumup.com/v0.1/checkouts'
const ORDERS_COLLECTION = 'orders'

function safeMessage(err) {
  return isProd ? 'Something went wrong.' : (err?.message || 'Server error')
}

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore()
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp()
    return admin.firestore()
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    })
    return admin.firestore()
  }
  return null
}

const db = initFirebase()

async function sendOrderConfirmationEmail(orderId, order) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'Fan X Charms <onboarding@resend.dev>'
  if (!apiKey) return
  const to = order.email
  const subject = `Order confirmation #${orderId} – Fan X Charms`
  const itemsList = (order.items || []).map((i) => `  • ${i.name} × ${i.quantity} — £${(i.price * i.quantity).toFixed(2)}`).join('\n')
  const html = `
    <p>Thank you for your order.</p>
    <p><strong>Order reference:</strong> ${orderId}</p>
    <p><strong>Shipping:</strong> ${order.address}</p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p><strong>Total:</strong> £${Number(order.total).toFixed(2)}</p>
    <p>Track your order: ${process.env.FRONTEND_URL || 'https://fanxcharms.com'}/track-your-order</p>
  `.replace(/\n\s+/g, '\n').trim()
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || res.statusText)
  }
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const corsOrigins = typeof corsOrigin === 'string' && corsOrigin.includes(',')
  ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : corsOrigin
const corsOptions = { origin: corsOrigins }

app.use(cors(corsOptions))
app.use(express.json({ limit: '256kb' }))

app.get('/', (req, res) => {
  res.json({ message: 'Fan X Charms API. Use the frontend URL to browse the site. Health: /api/health' })
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    sumup: !!(process.env.SUMUP_API_KEY || process.env.SUMUP_ACCESS_TOKEN) && !!process.env.SUMUP_MERCHANT_CODE,
    orders: !!db,
  })
})

// Fixed zone-based shipping (no external API). Set SHIPPING_UK, SHIPPING_EU, SHIPPING_INTERNATIONAL in env (pounds).
const EU_COUNTRY_CODES = new Set(['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'])

function getZoneRates(countryCode) {
  const country = (countryCode || 'GB').toUpperCase().trim()
  const uk = Number(process.env.SHIPPING_UK) ?? 0
  const eu = Number(process.env.SHIPPING_EU) || 9.99
  const international = Number(process.env.SHIPPING_INTERNATIONAL) || 19.99
  if (country === 'GB') {
    return [{ id: 'zone-uk', carrier: 'Standard', serviceName: 'UK delivery', amount: uk, currency: 'GBP', estimatedDays: '2-4' }]
  }
  if (EU_COUNTRY_CODES.has(country)) {
    return [{ id: 'zone-eu', carrier: 'Standard', serviceName: 'EU delivery', amount: eu, currency: 'GBP', estimatedDays: '5-7' }]
  }
  return [{ id: 'zone-intl', carrier: 'Standard', serviceName: 'International delivery', amount: international, currency: 'GBP', estimatedDays: '7-14' }]
}

app.post('/api/shipping-rates', (req, res) => {
  const { countryCode } = req.body || {}
  const country = (countryCode || '').trim() || 'GB'
  res.json({ rates: getZoneRates(country) })
})

// In-server address format validation (no external API). Same request/response shape for checkout.
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i

function validateAddressFormat(addr) {
  const line1 = (addr.address_line1 || '').trim()
  const postal = (addr.postal_code || '').trim().replace(/\s/g, '')
  const country = (addr.country_code || 'GB').toUpperCase().trim()
  const messages = []
  if (line1.length < 5) messages.push('Address line is too short.')
  if (line1.length > 100) messages.push('Address line is too long.')
  if (country === 'GB' && postal && !UK_POSTCODE_REGEX.test(postal)) {
    messages.push('Please enter a valid UK postcode (e.g. SW1A 1AA).')
  }
  if (country.length !== 2) messages.push('Please select a valid country.')
  const status = messages.length === 0 ? 'verified' : 'warning'
  const matched_address = {
    address_line1: line1,
    address_line2: addr.address_line2 || null,
    city_locality: addr.city_locality || addr.city || null,
    state_province: addr.state_province || addr.state || null,
    postal_code: postal || addr.postal_code || '',
    country_code: country,
  }
  return { status, matched_address, messages }
}

app.post('/api/addresses/validate', (req, res) => {
  const addresses = req.body
  const list = Array.isArray(addresses) ? addresses : (addresses ? [addresses] : [])
  if (list.length === 0 || list.length > 10) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Body must be an address object or array of 1–10 addresses with address_line1, postal_code, country_code.',
    })
  }
  const normalized = list.map((a) => ({
    address_line1: a.address_line1 || a.addressLine1 || '',
    address_line2: a.address_line2 || a.addressLine2 || null,
    city_locality: a.city_locality || a.city || null,
    state_province: a.state_province || a.stateProvince || a.state || null,
    postal_code: (a.postal_code || a.postalCode || a.postcode || '').trim(),
    country_code: (a.country_code || a.countryCode || 'GB').toUpperCase().trim(),
  }))
  const results = normalized.map((addr) => validateAddressFormat(addr))
  res.json({ results })
})

app.post('/api/create-sumup-checkout', async (req, res) => {
  const token = process.env.SUMUP_API_KEY || process.env.SUMUP_ACCESS_TOKEN
  const merchantCode = process.env.SUMUP_MERCHANT_CODE

  if (!token || !merchantCode) {
    return res.status(503).json({
      error: 'SumUp not configured',
      message: 'Set SUMUP_API_KEY and SUMUP_MERCHANT_CODE on the server. Get your API key at https://me.sumup.com/settings/api-keys',
    })
  }

  const { amount, currency = 'GBP', checkout_reference, description, redirect_url } = req.body

  if (amount == null || !checkout_reference) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Body must include amount and checkout_reference.',
    })
  }

  const payload = {
    merchant_code: merchantCode,
    amount: Number(amount),
    currency: String(currency).toUpperCase(),
    checkout_reference: String(checkout_reference),
    hosted_checkout: { enabled: true },
  }
  if (description) payload.description = description
  if (redirect_url) payload.redirect_url = redirect_url

  try {
    const response = await fetch(SUMUP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'SumUp checkout failed',
        message: data.message || data.error_description || response.statusText,
      })
    }

    const url = data.hosted_checkout_url
    if (!url) {
      return res.status(502).json({
        error: 'No payment URL',
        message: 'SumUp did not return hosted_checkout_url.',
      })
    }

    res.json({ hosted_checkout_url: url, checkout_id: data.id })
  } catch (err) {
    console.error('SumUp create checkout error:', err.message)
    res.status(500).json({
      error: 'Server error',
      message: safeMessage(err),
    })
  }
})

// Create order (stores in Firestore), returns { orderId }
app.post('/api/orders', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Orders not configured',
      message: 'Set Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS).',
    })
  }
  const { email, address, name, shippingMethod, shippingCost, items, total, currency = 'GBP' } = req.body
  if (!email || !address || !Array.isArray(items) || items.length === 0 || total == null) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Body must include email, address, items (array), and total.',
    })
  }
  const now = admin.firestore.Timestamp.now()
  const order = {
    email: String(email).trim(),
    address: String(address).trim(),
    name: name != null ? String(name).trim() : '',
    shippingMethod: shippingMethod ? String(shippingMethod) : 'free-uk',
    shippingCost: Number(shippingCost) || 0,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity) || 1,
      size: i.size ?? 'One Size',
      image: i.image ?? '',
    })),
    total: Number(total),
    currency: String(currency).toUpperCase(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  try {
    const ref = await db.collection(ORDERS_COLLECTION).add(order)
    const orderId = ref.id
    sendOrderConfirmationEmail(orderId, order).catch((e) => console.warn('Confirmation email failed:', e.message))
    res.status(201).json({ orderId })
  } catch (err) {
    console.error('Create order error:', err.message)
    res.status(500).json({
      error: 'Server error',
      message: safeMessage(err),
    })
  }
})

// Get order for customer (only if email matches)
app.get('/api/orders/:orderId', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Orders not configured',
      message: 'Order lookup is not available.',
    })
  }
  const { orderId } = req.params
  const email = (req.query.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(400).json({
      error: 'Missing email',
      message: 'Query parameter email is required.',
    })
  }
  try {
    const ref = db.collection(ORDERS_COLLECTION).doc(orderId)
    const snap = await ref.get()
    if (!snap.exists) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const data = snap.data()
    const orderEmail = (data.email || '').trim().toLowerCase()
    if (orderEmail !== email) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = {
      id: snap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
    }
    res.json(order)
  } catch (err) {
    console.error('Get order error:', err.message)
    res.status(500).json({
      error: 'Server error',
      message: safeMessage(err),
    })
  }
})

app.listen(PORT, () => {
  if (!isProd) {
    console.log(`Server running at http://localhost:${PORT}`)
    console.log('Endpoints: GET /api/health, POST /api/shipping-rates, POST /api/create-sumup-checkout, POST /api/orders, GET /api/orders/:orderId')
  }
  const key = process.env.SUMUP_API_KEY || process.env.SUMUP_ACCESS_TOKEN
  if (!key || !process.env.SUMUP_MERCHANT_CODE) {
    console.warn('SumUp not configured: set SUMUP_API_KEY and SUMUP_MERCHANT_CODE')
  }
  if (!db) {
    console.warn('Orders not configured: set Firebase Admin credentials (see .env.example)')
  }
})
