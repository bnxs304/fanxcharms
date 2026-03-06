/**
 * Backend: SumUp checkout + order management (Firestore).
 * Required env: SUMUP_API_KEY (or SUMUP_ACCESS_TOKEN), SUMUP_MERCHANT_CODE
 * Orders: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or GOOGLE_APPLICATION_CREDENTIALS path).
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'

const app = express()
const PORT = process.env.PORT || 3001
const SUMUP_API = 'https://api.sumup.com/v0.1/checkouts'
const ORDERS_COLLECTION = 'orders'

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

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

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
      message: err.message || 'Failed to create checkout.',
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
  const { email, address, name, items, total, currency = 'GBP' } = req.body
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
    res.status(201).json({ orderId: ref.id })
  } catch (err) {
    console.error('Create order error:', err.message)
    res.status(500).json({
      error: 'Server error',
      message: err.message || 'Failed to create order.',
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
      message: err.message || 'Failed to fetch order.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Endpoints: POST /api/create-sumup-checkout, POST /api/orders, GET /api/orders/:orderId')
  const key = process.env.SUMUP_API_KEY || process.env.SUMUP_ACCESS_TOKEN
  if (!key || !process.env.SUMUP_MERCHANT_CODE) {
    console.warn('SumUp not configured: set SUMUP_API_KEY and SUMUP_MERCHANT_CODE')
  }
  if (!db) {
    console.warn('Orders not configured: set Firebase Admin credentials (see .env.example)')
  }
})
