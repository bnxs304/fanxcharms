import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { confirmOrderPaid } from '../lib/ordersService'
import { CONTACT_EMAIL } from '../constants/site'
import './Home.css'

function ProductCard({ product, isFocused }) {
  return (
    <Link to={`/product/${product.id}`} className={`whats-new__card ${isFocused ? 'whats-new__card--focused' : ''}`}>
      <div className="whats-new__card-image-wrap">
        <img src={product.image} alt={product.name} />
        <span className="whats-new__card-price">£{product.price.toFixed(2)}</span>
      </div>
      <span className="whats-new__card-name">{product.name}</span>
    </Link>
  )
}

export default function Home() {
  const [searchParams] = useSearchParams()
  const orderSuccess = searchParams.get('order') === 'success'
  const orderId = searchParams.get('orderId') || ''
  const sessionId = searchParams.get('session_id') || ''
  const { products, loading, error } = useProducts()
  const { clearCart } = useCart()
  const whatsNewProducts = products.slice(0, 4)
  const scrollRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const lastIndexRef = useRef(0)
  const [confirmFailed, setConfirmFailed] = useState(false)

  const scrollToCard = (index) => {
    const el = scrollRef.current
    if (!el || whatsNewProducts.length === 0) return
    const firstCard = el.querySelector('.whats-new__card')
    if (!firstCard) return
    const cardWidth = firstCard.offsetWidth
    const gap = 12
    const containerWidth = el.clientWidth
    const targetLeft = index * (cardWidth + gap) - (containerWidth / 2 - cardWidth / 2)
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollTo({ left: Math.max(0, Math.min(targetLeft, maxScroll)), behavior: 'smooth' })
  }

  useEffect(() => {
    if (!orderSuccess || !orderId || !sessionId) return
    let cancelled = false
    const maxAttempts = 3
    const delayMs = (attempt) => (attempt + 1) * 1000

    const run = async (attempt = 0) => {
      if (cancelled) return
      try {
        await confirmOrderPaid(orderId, sessionId)
        if (!cancelled) {
          setConfirmFailed(false)
          clearCart()
        }
      } catch (e) {
        if (cancelled) return
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs(attempt)))
          run(attempt + 1)
        } else {
          setConfirmFailed(true)
          clearCart()
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [orderSuccess, orderId, sessionId, clearCart])

  useEffect(() => {
    const el = scrollRef.current
    const n = whatsNewProducts.length
    if (!el || n === 0) return
    let rafId = null
    const handleScroll = () => {
      const firstCard = el.querySelector('.whats-new__card')
      if (!firstCard) return
      const cardWidth = firstCard.offsetWidth
      const gap = 12
      const slot = cardWidth + gap
      const containerWidth = el.clientWidth
      const center = el.scrollLeft + containerWidth / 2 - cardWidth / 2
      const idx = Math.min(Math.max(0, Math.round(center / slot)), n - 1)
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (lastIndexRef.current !== idx) {
          lastIndexRef.current = idx
          setFocusedIndex(idx)
        }
        rafId = null
      })
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [whatsNewProducts.length])

  return (
    <div className="home">
      {orderSuccess && (
        <div className={`home__banner ${confirmFailed ? 'home__banner--warning' : 'home__banner--success'}`}>
          {confirmFailed ? (
            <>
              <strong>Payment succeeded.</strong>
              {' '}We couldn’t update your order status from this page. Your payment went through—please save your order reference: <strong>{orderId}</strong>. If you don’t receive a confirmation email, contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with this reference.
            </>
          ) : (
            <>
              <strong>Payment received.</strong> Your order is confirmed. We'll get it ready for you.
              {orderId && (
                <span className="home__banner-order">
                  {' '}Order ref: <strong>{orderId}</strong>. A confirmation email has been sent to you. You can <Link to="/track-your-order">track your order</Link> with this reference and your email.
                </span>
              )}
            </>
          )}
        </div>
      )}

      <section className="whats-new">
        <div className="whats-new__graphic-wrap">
          <img src="/images/whats-new.png" alt="What's New" className="whats-new__graphic-img" />
        </div>
        <div className="whats-new__content">
          {loading && <p className="whats-new__loading">Loading…</p>}
          {error && <p className="whats-new__error" role="alert">{error}</p>}
          {!loading && !error && whatsNewProducts.length > 0 && (
            <>
              <div className="whats-new__grid">
                {whatsNewProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="whats-new__scroll-wrap" aria-hidden>
                <div className="whats-new__scroll-inner" ref={scrollRef}>
                  <div className="whats-new__scroll-set">
                    {whatsNewProducts.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isFocused={i === focusedIndex}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="whats-new__scroll-nav"
                  role="tablist"
                  aria-label="Carousel navigation"
                  style={{ '--focused-index': focusedIndex, '--total': whatsNewProducts.length }}
                >
                  <button
                    type="button"
                    className="whats-new__scroll-btn whats-new__scroll-btn--prev"
                    onClick={() => scrollToCard(Math.max(0, focusedIndex - 1))}
                    aria-label="Previous"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <div className="whats-new__scroll-track">
                    <div className="whats-new__scroll-thumb" aria-hidden />
                    {whatsNewProducts.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === focusedIndex}
                        aria-label={`Slide ${i + 1}`}
                        className="whats-new__scroll-segment"
                        onClick={() => scrollToCard(i)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="whats-new__scroll-btn whats-new__scroll-btn--next"
                    onClick={() => scrollToCard(Math.min(whatsNewProducts.length - 1, focusedIndex + 1))}
                    aria-label="Next"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              </div>
              <nav className="whats-new__shop-btns" aria-label="Shop by category">
                <Link to="/shop?cat=anime" className="whats-new__shop-btn">Shop Anime</Link>
                <Link to="/shop?cat=k-pop" className="whats-new__shop-btn">Shop K-Pop</Link>
                <Link to="/shop?cat=gaming" className="whats-new__shop-btn">Shop Gaming</Link>
                <Link to="/shop" className="whats-new__shop-btn">Shop All</Link>
              </nav>
            </>
          )}
          <div className="whats-new__footer">
          <div className="whats-new__social">
            <a href="https://instagram.com/fanxcharms" target="_blank" rel="noopener noreferrer" className="whats-new__social-icon" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://tiktok.com/@fanxcharms" target="_blank" rel="noopener noreferrer" className="whats-new__social-icon" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            </a>
            <span className="whats-new__social-handle">@FANXCHARMS</span>
          </div>
          </div>
        </div>
      </section>
    </div>
  )
}
