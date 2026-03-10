/**
 * Backend: Stripe Checkout + order management (Firestore).
 * Production: set NODE_ENV=production, CORS_ORIGIN to your frontend URL(s), all secrets via env.
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import Stripe from 'stripe'

const isProd = process.env.NODE_ENV === 'production'
const app = express()
const PORT = process.env.PORT || 3001
const ORDERS_COLLECTION = 'orders'
const PRODUCTS_COLLECTION = 'products'

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

const SHOP_NOTIFICATION_EMAIL = process.env.SHOP_NOTIFICATION_EMAIL || 'shop@fanxcharms.com'

/** Send a new-order notification to the shop email when an order is confirmed paid. */
async function sendNewOrderNotificationToShop(orderId, order) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'Fan X Charms <onboarding@resend.dev>'
  if (!apiKey) return
  const to = SHOP_NOTIFICATION_EMAIL
  const subject = `New order #${orderId} – Fan X Charms`
  const itemsList = (order.items || []).map((i) => `  • ${i.name} × ${i.quantity} — £${(i.price * i.quantity).toFixed(2)}`).join('\n')
  const html = `
    <p><strong>A new order has been paid.</strong></p>
    <p><strong>Order reference:</strong> ${orderId}</p>
    <p><strong>Customer:</strong> ${(order.name || '').trim() || '—'}</p>
    <p><strong>Email:</strong> ${order.email || '—'}</p>
    <p><strong>Shipping address:</strong></p>
    <pre>${(order.address || '').trim() || '—'}</pre>
    <p><strong>Shipping method:</strong> ${order.shippingMethod || '—'}</p>
    <p><strong>Items:</strong></p>
    <pre>${itemsList}</pre>
    <p><strong>Total:</strong> £${Number(order.total).toFixed(2)}</p>
    <p>Track and manage: ${process.env.FRONTEND_URL || 'https://fanxcharms.com'}/admin (admin)</p>
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

/** Decrement product stock when an order is paid. Only products with a numeric stock field are updated. Runs inside a transaction so we only decrement once. */
async function markOrderPaidAndDecrementStock(db, orderId) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId)
  const productsRef = db.collection(PRODUCTS_COLLECTION)
  return db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef)
    if (!orderSnap.exists) throw new Error('Order not found')
    const order = orderSnap.data()
    if (order.status === 'paid') return { updated: false }
    const items = order.items || []
    for (const item of items) {
      const productId = item.id
      const qty = Number(item.quantity) || 0
      if (!productId || qty <= 0) continue
      const productRef = productsRef.doc(productId)
      const productSnap = await transaction.get(productRef)
      if (!productSnap.exists) continue
      const product = productSnap.data()
      if (product.stock == null || typeof product.stock !== 'number') continue
      const newStock = Math.max(0, product.stock - qty)
      transaction.update(productRef, { stock: newStock })
    }
    transaction.update(orderRef, {
      status: 'paid',
      updatedAt: admin.firestore.Timestamp.now(),
    })
    return { updated: true }
  })
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
const corsOrigins = typeof corsOrigin === 'string' && corsOrigin.includes(',')
  ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : corsOrigin
const corsOptions = { origin: corsOrigins }

app.use(cors(corsOptions))

// Stripe webhook needs raw body for signature verification – must be before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || !webhookSecret) {
    console.warn('Stripe webhook skipped: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set')
    return res.status(503).send('Webhook not configured')
  }
  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing Stripe-Signature')
  let event
  try {
    const stripe = new Stripe(secretKey)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orderId = session.metadata?.orderId || session.client_reference_id
    if (orderId && db) {
      try {
        const { updated } = await markOrderPaidAndDecrementStock(db, orderId)
        if (updated) {
          const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get()
          if (snap.exists) {
            const orderData = snap.data()
            sendOrderConfirmationEmail(orderId, orderData).catch((e) => console.warn('Confirmation email failed:', e.message))
            sendNewOrderNotificationToShop(orderId, orderData).catch((e) => console.warn('Shop notification email failed:', e.message))
          }
        }
      } catch (e) {
        console.error('Webhook order update/email error:', e.message)
      }
    }
  }
  res.json({ received: true })
})

app.use(express.json({ limit: '256kb' }))

app.get('/', (req, res) => {
  res.json({ message: 'Fan X Charms API. Use the frontend URL to browse the site. Health: /api/health' })
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    orders: !!db,
  })
})

// Zone-based shipping: UK or International only. Set SHIPPING_UK and SHIPPING_INTERNATIONAL in env (pounds).
function getZoneRates(countryCode) {
  const country = (countryCode || 'GB').toUpperCase().trim()
  const uk = Number(process.env.SHIPPING_UK) ?? 0
  const international = Number(process.env.SHIPPING_INTERNATIONAL) || 24.99
  if (country === 'GB') {
    return [{ id: 'zone-uk', carrier: 'Standard', serviceName: 'UK delivery', amount: uk, currency: 'GBP', estimatedDays: '2-4' }]
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

app.post('/api/create-stripe-checkout', async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return res.status(503).json({
      error: 'Stripe not configured',
      message: 'Set STRIPE_SECRET_KEY on the server. Get your key at https://dashboard.stripe.com/apikeys',
    })
  }

  const { amount, currency = 'gbp', orderId, description, success_url, cancel_url } = req.body

  if (amount == null || !orderId) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Body must include amount and orderId.',
    })
  }

  const stripe = new Stripe(secretKey)
  const amountCents = Math.round(Number(amount) * 100)
  const baseSuccessUrl = success_url || `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/?order=success&orderId=${encodeURIComponent(orderId)}`
  const finalSuccessUrl = baseSuccessUrl.includes('{CHECKOUT_SESSION_ID}') ? baseSuccessUrl : `${baseSuccessUrl}${baseSuccessUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (currency || 'gbp').toLowerCase(),
            product_data: {
              name: 'Fan X Charms order',
              description: description || `Order ${orderId}`,
              images: [],
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: cancel_url || `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/checkout`,
      client_reference_id: String(orderId),
      metadata: { orderId: String(orderId) },
    })

    if (!session.url) {
      return res.status(502).json({
        error: 'No payment URL',
        message: 'Stripe did not return a checkout URL.',
      })
    }

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Stripe create checkout error:', err.message)
    res.status(500).json({
      error: 'Stripe checkout failed',
      message: err.type === 'StripeError' ? err.message : safeMessage(err),
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
// Confirm order as paid (call when customer lands on success page with Stripe session_id – fallback if webhook delayed)
app.post('/api/orders/:orderId/confirm-paid', async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return res.status(503).json({ error: 'Stripe not configured' })
  if (!db) return res.status(503).json({ error: 'Orders not configured' })
  const { orderId } = req.params
  const sessionId = (req.body?.session_id || req.query?.session_id || '').trim()
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id', message: 'Provide Stripe Checkout session_id from the success URL.' })
  }
  try {
    const stripe = new Stripe(secretKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Not paid', message: 'Session is not paid.' })
    }
    const sessionOrderId = session.metadata?.orderId || session.client_reference_id
    if (sessionOrderId !== orderId) {
      return res.status(400).json({ error: 'Order mismatch', message: 'Session does not match this order.' })
    }
    const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get()
    if (!snap.exists) return res.status(404).json({ error: 'Order not found' })
    const { updated } = await markOrderPaidAndDecrementStock(db, orderId)
    if (updated) {
      const snap = await db.collection(ORDERS_COLLECTION).doc(orderId).get()
      if (snap.exists) {
        sendNewOrderNotificationToShop(orderId, snap.data()).catch((e) => console.warn('Shop notification email failed:', e.message))
      }
    }
    res.json({ ok: true, status: 'paid', updated })
  } catch (err) {
    console.error('Confirm paid error:', err.message)
    res.status(500).json({ error: 'Server error', message: err.type === 'StripeError' ? err.message : safeMessage(err) })
  }
})

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
    console.log('Endpoints: GET /api/health, POST /api/shipping-rates, POST /api/create-stripe-checkout, POST /api/orders, GET /api/orders/:orderId')
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe not configured: set STRIPE_SECRET_KEY')
  }
  if (!db) {
    console.warn('Orders not configured: set Firebase Admin credentials (see .env.example)')
  }
})
