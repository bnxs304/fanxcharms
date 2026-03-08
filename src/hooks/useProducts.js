import { useState, useEffect } from 'react'
import { getProducts } from '../lib/productsService'

const PRODUCTS_LOAD_TIMEOUT_MS = 15000

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setError('We couldn’t load the shop right now. Please check your connection and try again.')
      setLoading(false)
    }, PRODUCTS_LOAD_TIMEOUT_MS)

    getProducts()
      .then((data) => {
        if (!cancelled) setProducts(data)
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e?.message || ''
          const friendly = /failed to fetch|network error|loadfailed/i.test(msg)
            ? 'We couldn’t load the shop right now. Please try again.'
            : (msg || 'Something went wrong. Please try again.')
          setError(friendly)
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [])

  return { products, loading, error }
}
