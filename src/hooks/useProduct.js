import { useState, useEffect } from 'react'
import { getProductById } from '../lib/productsService'

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setProduct(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getProductById(id)
      .then((data) => {
        if (!cancelled) setProduct(data)
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e?.message || ''
          const friendly = /failed to fetch|network error|loadfailed/i.test(msg)
            ? 'We couldn’t load this product right now. Please try again.'
            : (msg || 'Something went wrong. Please try again.')
          setError(friendly)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  return { product, loading, error }
}
