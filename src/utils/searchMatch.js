/**
 * Product search: match query words against name, description, category,
 * sizes, and variation labels (variant.size) with simple English-style
 * variations (plurals, -ing/-ed, -ies, hyphen vs space).
 */

function variantAndSizeSearchText(product) {
  const parts = []
  if (Array.isArray(product.variants)) {
    for (const v of product.variants) {
      if (v && v.size != null && String(v.size).trim()) {
        parts.push(String(v.size).trim())
      }
    }
  }
  if (Array.isArray(product.sizes)) {
    for (const s of product.sizes) {
      if (s != null && String(s).trim()) {
        parts.push(String(s).trim())
      }
    }
  }
  return parts.join(' ')
}

const HYPHEN_UNDERSCORE = /[-_]/g

function normalizeSpaces(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(HYPHEN_UNDERSCORE, ' ')
    .replace(/\s+/g, ' ')
}

/** Extract words from text (letters/numbers across common scripts). */
function wordsFrom(text) {
  const t = normalizeSpaces(String(text).replace(HYPHEN_UNDERSCORE, ' '))
  const parts = t.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  return parts.length ? parts : []
}

function lightStem(word) {
  if (word.length <= 2) return word
  let w = word
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1)
  if (w.endsWith('ing') && w.length > 4) return w.slice(0, -3)
  if (w.endsWith('ed') && w.length > 3) return w.slice(0, -2)
  return w
}

function tokensMatch(qw, hw) {
  if (!qw || !hw) return false
  if (qw === hw) return true
  const sq = lightStem(qw)
  const sh = lightStem(hw)
  if (sq.length >= 2 && sh.length >= 2 && sq === sh) return true
  const shorter = qw.length <= hw.length ? qw : hw
  const longer = qw.length > hw.length ? qw : hw
  if (shorter.length >= 3 && longer.startsWith(shorter)) return true
  return false
}

function wordMatchesHaystack(qw, hayText, hayWords) {
  if (hayText.includes(qw)) return true
  if (qw.length <= 1) return hayText.includes(qw)
  for (const hw of hayWords) {
    if (tokensMatch(qw, hw)) return true
  }
  return false
}

/**
 * @param {{
 *   name?: string,
 *   description?: string,
 *   category?: string,
 *   sizes?: string[],
 *   variants?: Array<{ size?: string, stock?: number | null }>,
 * }} product
 * @param {string} query
 */
export function productMatchesSearch(product, query) {
  if (!query || !query.trim()) return true

  const name = product.name || ''
  const desc = product.description || ''
  const cat = product.category || ''
  const extra = variantAndSizeSearchText(product)

  const hayText = normalizeSpaces(`${name} ${desc} ${cat} ${extra}`)
  const qNorm = normalizeSpaces(query)

  if (hayText.includes(qNorm)) return true

  const queryWords = wordsFrom(query)
  if (queryWords.length === 0) return true

  const hayWords = wordsFrom(`${name} ${desc} ${cat} ${extra}`)
  if (hayWords.length === 0) return false

  return queryWords.every((qw) => wordMatchesHaystack(qw, hayText, hayWords))
}
