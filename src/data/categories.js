/**
 * Shop categories – products must use one of these.
 * URL param uses id (e.g. ?cat=k-pop); display uses label.
 */
export const SHOP_CATEGORIES = [
  { id: 'anime', label: 'Anime' },
  { id: 'k-pop', label: 'K-Pop' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'others', label: 'Others' },
]

const ID_TO_LABEL = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c.id, c.label]))

/** Get display label from URL param (e.g. "k-pop" -> "K-Pop"). */
export function categoryIdToLabel(id) {
  return ID_TO_LABEL[id] || null
}

/** True if product.category matches the category for this URL param. */
export function productMatchesCategory(product, catParam) {
  if (!catParam) return true
  const label = categoryIdToLabel(catParam)
  if (!label) return true
  return (product.category || '').trim() === label
}
