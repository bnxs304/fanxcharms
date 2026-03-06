/**
 * Orders: create via API, lookup via API (orderId + email).
 * Admin list/update uses Firestore directly (authenticated).
 */
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db, isConfigured } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const ORDERS_COLLECTION = 'orders'

function snapshotToOrder(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    email: d.email ?? '',
    address: d.address ?? '',
    name: d.name ?? '',
    items: Array.isArray(d.items) ? d.items : [],
    total: Number(d.total) ?? 0,
    currency: d.currency ?? 'GBP',
    status: d.status ?? 'pending',
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? d.createdAt,
    updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? d.updatedAt,
  }
}

/**
 * Create an order. Returns { orderId }.
 * @param {{ email: string, address: string, name?: string, items: Array<{id, name, price, quantity, size?, image?}>, total: number, currency?: string }}
 */
export async function createOrder({ email, address, name, items, total, currency = 'GBP' }) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      address: address.trim(),
      name: name != null ? String(name).trim() : '',
      items,
      total: Number(total),
      currency,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to create order')
    err.status = res.status
    throw err
  }
  if (!data.orderId) throw new Error('No order ID returned')
  return { orderId: data.orderId }
}

/** Admin: fetch all orders from Firestore (requires auth). */
export async function getOrdersFromFirestore() {
  if (!isConfigured || !db) return []
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => snapshotToOrder(d))
  } catch (e) {
    console.warn('Firestore getOrders failed:', e.message)
    return []
  }
}

/** Admin: fetch one order by id. */
export async function getOrderByIdFromFirestore(id) {
  if (!isConfigured || !db) return null
  try {
    const ref = doc(db, ORDERS_COLLECTION, id)
    const snap = await getDoc(ref)
    return snapshotToOrder(snap)
  } catch (e) {
    console.warn('Firestore getOrderById failed:', e.message)
    return null
  }
}

/** Admin: update order status. */
export async function updateOrderStatus(id, status) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, ORDERS_COLLECTION, id)
  await updateDoc(ref, {
    status: String(status),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Get order for customer (orderId + email). Returns order or throws.
 */
export async function getOrderForCustomer(orderId, email) {
  const params = new URLSearchParams({ email: email.trim() })
  const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(orderId)}?${params}`, {
    method: 'GET',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Order not found')
    err.status = res.status
    throw err
  }
  return data
}
