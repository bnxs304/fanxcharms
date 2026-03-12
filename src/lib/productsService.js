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

function snapshotToProduct(docSnap) {
  if (!docSnap.exists()) return null
  const d = docSnap.data()
  const { images, image } = normalizeImages(d)
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
  }
}

/** Fetch all products from Firestore. Returns [] if Firebase not configured or error. */
export async function getProductsFromFirestore() {
  if (!isConfigured || !db) return []
  try {
    const snap = await getDocs(collection(db, COLLECTION))
    const list = snap.docs.map((d) => snapshotToProduct(d))
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return list
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
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, COLLECTION), payload)
  return ref.id
}

/** Update product (admin). Requires auth. */
export async function updateProduct(id, data) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, COLLECTION, id)
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
    updatedAt: serverTimestamp(),
  }
  await updateDoc(ref, payload)
}

/** Delete product (admin). Requires auth. */
export async function deleteProduct(id) {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
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

/** Public: get product by id. Tries Firestore first, then static. */
export async function getProductById(id) {
  const fromFirestore = await getProductByIdFromFirestore(id)
  if (fromFirestore) return fromFirestore
  return withImages(getStaticById(id))
}

/** Public: get all products. Tries Firestore first; if empty, uses static. */
export async function getProducts() {
  const fromFirestore = await getProductsFromFirestore()
  if (fromFirestore.length > 0) return fromFirestore
  return staticProducts.map(withImages)
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

/** Seed Firestore with static products (admin only). Creates new docs; does not overwrite. */
export async function seedStaticProducts() {
  if (!isConfigured || !db) throw new Error('Firebase not configured')
  const created = []
  for (const p of staticProducts) {
    const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])
    const id = await createProduct({
      name: p.name,
      price: p.price,
      description: p.description,
      image: p.image,
      images,
      category: p.category,
      sizes: p.sizes,
      stock: p.stock,
    })
    created.push(id)
  }
  return created
}
