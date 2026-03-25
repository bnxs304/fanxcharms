import { useEffect } from 'react'

function getOrCreateMeta({ name, property }) {
  const selector = name
    ? `meta[name="${name}"]`
    : `meta[property="${property}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    if (name) el.setAttribute('name', name)
    if (property) el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  return el
}

function setLinkHref(rel, href) {
  if (!href) return
  let link = document.head.querySelector(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

/**
 * Lightweight SEO helper (no external libs).
 * Updates:
 * - document title
 * - meta description
 * - OpenGraph (og:*)
 * - Twitter card tags
 * - canonical link
 */
export function useSeo({ title, description, canonical, image } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    if (title) document.title = title

    if (description) {
      getOrCreateMeta({ name: 'description' }).setAttribute('content', description)
      getOrCreateMeta({ property: 'og:description' }).setAttribute('content', description)
      getOrCreateMeta({ name: 'twitter:description' }).setAttribute('content', description)
    }

    if (title) {
      getOrCreateMeta({ property: 'og:title' }).setAttribute('content', title)
      getOrCreateMeta({ name: 'twitter:title' }).setAttribute('content', title)
    }

    if (canonical) {
      setLinkHref('canonical', canonical)
      getOrCreateMeta({ property: 'og:url' }).setAttribute('content', canonical)
    }

    if (image) {
      getOrCreateMeta({ property: 'og:image' }).setAttribute('content', image)
      getOrCreateMeta({ name: 'twitter:image' }).setAttribute('content', image)
    }
  }, [title, description, canonical, image])
}

