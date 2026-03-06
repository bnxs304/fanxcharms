/**
 * Upload a image file to Firebase Storage and return its public URL.
 * Requires Firebase to be configured and user to be authenticated (Storage rules).
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage, isConfigured } from './firebase'

const PRODUCTS_PREFIX = 'products'

/** Sanitize filename for storage path (keep extension). */
function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'image'
}

/**
 * Upload a file to Storage under products/{timestamp}-{filename}.
 * @param {File} file - Image file (e.g. from input type="file")
 * @returns {Promise<string>} Download URL
 */
export async function uploadProductImage(file) {
  if (!isConfigured || !storage) {
    throw new Error('Firebase Storage is not configured')
  }
  const ext = (file.name && file.name.split('.').pop()) || 'jpg'
  const base = safeName(file.name ? file.name.slice(0, -ext.length - 1) : 'image')
  const path = `${PRODUCTS_PREFIX}/${Date.now()}-${base}.${ext}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return url
}
