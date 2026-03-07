import { useState, useEffect } from 'react'
import { getProducts } from '../lib/productsService'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { products, loading, error }
}
