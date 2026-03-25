/** Shared client-side search for admin product and order lists. */

export function normalizeAdminSearchQuery(q) {
  return (q || '').trim().toLowerCase()
}

export function adminSearchMatches(haystack, queryNorm) {
  if (!queryNorm) return true
  return haystack.toLowerCase().includes(queryNorm)
}

export function productAdminSearchHaystack(p) {
  return [
    p.name,
    p.category,
    p.id,
    String(p.price ?? ''),
    p.stock != null ? String(p.stock) : '',
    p.description,
  ]
    .filter(Boolean)
    .join(' ')
}

export function orderAdminSearchHaystack(o) {
  const itemBits = (o.items || [])
    .map((i) => [i?.name, i?.size].filter(Boolean).join(' '))
    .join(' ')
  return [
    o.id,
    o.email,
    o.name,
    o.address,
    o.shippingMethod,
    o.status,
    String(o.total ?? ''),
    o.trackingNumber,
    o.carrier,
    itemBits,
  ]
    .filter(Boolean)
    .join(' ')
}
