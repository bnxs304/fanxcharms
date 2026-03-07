import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { confirmOrderPaid } from '../lib/ordersService'
import './Home.css'

export default function Home() {
  const [searchParams] = useSearchParams()
  const orderSuccess = searchParams.get('order') === 'success'
  const orderId = searchParams.get('orderId') || ''
  const sessionId = searchParams.get('session_id') || ''
  const { products, loading, error } = useProducts()
  const whatsNewProducts = products.slice(0, 4)

  useEffect(() => {
    if (!orderSuccess || !orderId || !sessionId) return
    confirmOrderPaid(orderId, sessionId).catch(() => { /* ignore – webhook may have already updated */ })
  }, [orderSuccess, orderId, sessionId])

  return (
    <div className="home">
      {orderSuccess && (
        <div className="home__banner">
          Thanks for your order! We'll get it ready for you.
          {orderId && (
            <span className="home__banner-order">
              {' '}Order ref: <strong>{orderId}</strong>. A confirmation email has been sent to you. You can <Link to="/track-your-order">track your order</Link> with this reference and your email.
            </span>
          )}
        </div>
      )}

      <section className="whats-new">
        <img src="/images/whats-new.png" alt="What's New!" className="whats-new__graphic-img" />
        <div className="whats-new__content">
          <p className="whats-new__welcome">WELCOME AND THANK YOU FOR VISITING FAN X CHARMS SHOP</p>
          <p className="whats-new__update">NEW ITEMS ARE BEING ADDED EVERY WEEK</p>
          {loading && <p className="whats-new__loading">Loading…</p>}
          {error && <p className="whats-new__error" role="alert">{error}</p>}
          {!loading && !error && whatsNewProducts.length > 0 && (
            <div className="whats-new__grid">
              {whatsNewProducts.map((product) => (
                <Link to={`/product/${product.id}`} key={product.id} className="whats-new__card">
                  <div className="whats-new__card-image-wrap">
                    <img src={product.image} alt={product.name} />
                    <span className="whats-new__card-price">£{product.price.toFixed(2)}</span>
                  </div>
                  <span className="whats-new__card-name">{product.name}</span>
                </Link>
              ))}
            </div>
          )}
          {!loading && !error && (
            <div className="whats-new__social">
              <a href="https://instagram.com/fanxcharms" target="_blank" rel="noopener noreferrer" className="whats-new__social-icon" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://tiktok.com/@fanxcharms" target="_blank" rel="noopener noreferrer" className="whats-new__social-icon" aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
              </a>
              <span className="whats-new__social-handle">@FANXCHARMS</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
