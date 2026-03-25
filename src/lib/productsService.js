/**
 * Products: Firestore (when configured) with fallback to static data.
 * Admin write operations require Firebase Auth.
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db, isConfigured } from './firebase'
import { products as staticProducts, getProductById as getStaticById } from '../data/products'

const COLLECTION = 'products'

/** Make path-only image URLs absolute so they work when the app is deployed (e.g. /images/foo → https://site.com/images/foo). */
function ensureAbsoluteImageUrl(url) {
  if (!url || typeof url !== 'string') return url
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + u
  }
  return u
}

function normalizeImages(d) {
  const images = Array.isArray(d.images) && d.images.length > 0
    ? d.images.filter(Boolean)
    : (d.image ? [d.image] : [])
  const image = images[0] ?? ''
  return {
    images: images.map(ensureAbsoluteImageUrl),
    image: ensureAbsoluteImageUrl(image),
  }
}

/** Sort by ascending listOrder; missing listOrder sorts after, by name. */
export function sortProductsByListOrder(list) {
  return [...list].sort((a, b) => {
    const ao = a.listOrder
    const bo = b.listOrder
    if (typeof ao === 'number' && typeof bo === 'number' && ao !== bo) return ao - bo
    if (typeof ao === 'number' && typeof bo !== 'number') return -1
    if (typeof ao !== 'number' && typeof bo === 'number') return 1
    return (a.name || '').localeCompare(b.name || '')
  })
}

function snapshotToProduct(docSnap) {
  if (!docSnap.exists()) return null
  const d = docSnap.data()
  const { images, image } = normalizeImages(d)
  const listOrderRaw = d.listOrder
  const listOrder =
    typeof listOrderRaw === 'number' && !Number.isNaN(listOrderRaw) ? listOrderRaw : undefined
  const variants = Array.isArray(d.variants)
    ? d.variants
        .map((v) => ({
          size: v?.size ?? '',
          stock:
            v?.stock != null && v.stock !== ''
              ? Number(v.stock)
              : null,
        }))
        .filter((v) => v.size)
    : []
  return {
    id: docSnap.id,
    name: d.name ?? '',
    price: Number(d.price) ?? 0,
    description: d.description ?? '',
    image,
    images,
    category: d.category ?? '',
    sizes: Array.isArray(d.sizes) ? d.sizes : ['One Size'],
    stock: d.stock != null ? Number(d.stock) : undefined,
    variants,
    listOrder,
    enabled: d.enabled !== false,
  }
}

/** Fetch all products from Firestore. Returns [] if Firebase not configured or error. */
export async function getProductsFromFirestore() {
  if (!isConfigured || !db) return []
  try {
    const snap = await getDocs(collection(db, COLLECTION))
    const list = snap.docs.map((d) => snapshotToProduct(d))
    return sortProductsByListOrder(list)
  } catch (e) {
    console.warn('Firestore getProducts failed:', e.message)
    return []
  }
}

/** Fetch one product by id from Firestore. Returns null if not found or error. */
export async function getProductByIdFromFirestore(id) {
  if (!isConfigured || !db) return null
  try {
    const ref = doc(db, COLLECTION, id)
    const snap = await getDoc(ref)
    return snapshotToProduct(snap)
  } catch (e) {
    console.warn('Firestore getProductById failed:', e.message)
    return null
  }
}

async function getNextListOrder() {
  const snap = await getDocs(collection(db, COLLECTION))
  let max = -1
  snap.docs.forEach((d) => {
    const lo = d.data()?.listOrder
    if (typeof lo === 'number' && !Number.isNaN(lo) && lo > max) max = lo
  })
  return max + 1
}

/** Create product (admin). Requires auth. Returns new doc id. */
export async function createProduct(data) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : (data.image ? [data.image] : [])
  const variants = Array.isArray(data.variants)
    ? data.variants
        .map((v) => ({
          size: (v.size ?? '').trim(),
          stock:
            v.stock === '' || v.stock == null
              ? null
              : Number(v.stock),
        }))
        .filter((v) => v.size)
    : []
  const listOrder = typeof data.listOrder === 'number' && !Number.isNaN(data.listOrder)
    ? data.listOrder
    : await getNextListOrder()
  const payload = {
    name: data.name,
    price: Number(data.price),
    description: data.description ?? '',
    image: images[0] ?? data.image ?? '',
    images,
    category: data.category ?? '',
    sizes: Array.isArray(data.sizes) ? data.sizes : ['One Size'],
    stock: data.stock != null ? Number(data.stock) : null,
    variants: variants.length ? variants : [],
    listOrder,
    enabled: data.enabled !== false,
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, COLLECTION), payload)
  return ref.id
}

/** Update product (admin). Requires auth. Preserves listOrder unless passed in data. */
export async function updateProduct(id, data) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, COLLECTION, id)
  const existingSnap = await getDoc(ref)
  const prev = existingSnap.exists() ? existingSnap.data() : {}
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : (data.image ? [data.image] : [])
  const variants = Array.isArray(data.variants)
    ? data.variants
        .map((v) => ({
          size: (v.size ?? '').trim(),
          stock:
            v.stock === '' || v.stock == null
              ? null
              : Number(v.stock),
        }))
        .filter((v) => v.size)
    : []
  const prevLo = prev.listOrder
  const listOrder =
    typeof data.listOrder === 'number' && !Number.isNaN(data.listOrder)
      ? data.listOrder
      : typeof prevLo === 'number' && !Number.isNaN(prevLo)
        ? prevLo
        : undefined
  const prevEnabled = prev.enabled !== false
  const enabled =
    typeof data.enabled === 'boolean' ? data.enabled : prevEnabled
  const payload = {
    name: data.name,
    price: Number(data.price),
    description: data.description ?? '',
    image: images[0] ?? data.image ?? '',
    images,
    category: data.category ?? '',
    sizes: Array.isArray(data.sizes) ? data.sizes : ['One Size'],
    stock: data.stock != null ? Number(data.stock) : null,
    variants: variants.length ? variants : [],
    enabled,
    updatedAt: serverTimestamp(),
    ...(listOrder !== undefined ? { listOrder } : {}),
  }
  await updateDoc(ref, payload)
}

/** Toggle storefront visibility (admin). */
export async function setProductEnabled(id, enabled) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    enabled: Boolean(enabled),
    updatedAt: serverTimestamp(),
  })
}

/** Delete product (admin). Requires auth. */
export async function deleteProduct(id) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

/** True if the product should appear on the shop (default when field missing). */
export function isProductEnabled(product) {
  return product != null && product.enabled !== false
}

/** Ensure product has .image and .images array (for static or legacy data). */
export function withImages(product) {
  if (!product) return product
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : [])
  const image = images[0] ?? product.image ?? ''
  return {
    ...product,
    images: images.map(ensureAbsoluteImageUrl),
    image: ensureAbsoluteImageUrl(image),
  }
}

/** Public: get product by id. Tries Firestore first, then static. Disabled products are hidden. */
export async function getProductById(id) {
  const fromFirestore = await getProductByIdFromFirestore(id)
  if (fromFirestore) {
    return isProductEnabled(fromFirestore) ? fromFirestore : null
  }
  const staticP = getStaticById(id)
  if (!staticP) return null
  const withImg = withImages(staticP)
  return isProductEnabled(withImg) ? withImg : null
}

/**
 * Assigns listOrder 0..n-1 by current name sort when any product is missing listOrder.
 * Call from admin before reordering. Requires auth write rules on products.
 */
export async function ensureProductListOrders() {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const snap = await getDocs(collection(db, COLLECTION))
  const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
  if (rows.length === 0) return
  if (rows.every(({ data }) => typeof data.listOrder === 'number' && !Number.isNaN(data.listOrder))) {
    return
  }
  const sorted = [...rows].sort((a, b) =>
    (a.data.name || '').localeCompare(b.data.name || '')
  )
  const batch = writeBatch(db)
  sorted.forEach((row, i) => {
    batch.update(doc(db, COLLECTION, row.id), {
      listOrder: i,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

/**
 * Swap listOrder between two adjacent products in a sorted list (by listOrder).
 * @param {Array<{ id: string, listOrder?: number }>} sortedProducts
 * @param {number} index — index of item to move
 * @param {'up' | 'down'} direction
 */
export async function moveProductListOrder(sortedProducts, index, direction) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const toIndex = direction === 'up' ? index - 1 : index + 1
  if (toIndex < 0 || toIndex >= sortedProducts.length) return
  const a = sortedProducts[index]
  const b = sortedProducts[toIndex]
  const loA = typeof a.listOrder === 'number' ? a.listOrder : index
  const loB = typeof b.listOrder === 'number' ? b.listOrder : toIndex
  const batch = writeBatch(db)
  batch.update(doc(db, COLLECTION, a.id), { listOrder: loB, updatedAt: serverTimestamp() })
  batch.update(doc(db, COLLECTION, b.id), { listOrder: loA, updatedAt: serverTimestamp() })
  await batch.commit()
}

/** Public: enabled products only. Tries Firestore first; if empty, uses static. */
export async function getProducts() {
  const fromFirestore = await getProductsFromFirestore()
  if (fromFirestore.length > 0) {
    return sortProductsByListOrder(fromFirestore.filter(isProductEnabled))
  }
  const list = staticProducts.map((p, i) =>
    withImages({
      ...p,
      listOrder: typeof p.listOrder === 'number' ? p.listOrder : i,
    })
  )
  return sortProductsByListOrder(list.filter(isProductEnabled))
}

/** In-stock check (works for both Firestore and static shape). Stock 0 = out of stock; null/undefined = no limit. */
export function isInStock(product) {
  if (!product) return false
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const anyInStock = product.variants.some((v) => {
      if (v == null) return false
      if (v.stock == null || v.stock === '') return true
      const n = Number(v.stock)
      return !Number.isNaN(n) && n > 0
    })
    return anyInStock
  }
  if (product.stock == null || product.stock === '') return true
  const n = Number(product.stock)
  return !Number.isNaN(n) && n > 0
}

