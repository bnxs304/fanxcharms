import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import PromoBar from './PromoBar'
import './Header.css'

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
export default function Header() {
  const { cartCount } = useCart()
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const search = location.search || ''

  const navItems = [
    { to: '/', label: 'HOME', match: (path, qs) => path === '/' && !qs },
    { to: '/shop', label: 'SHOP', match: (path) => path === '/shop' && !search },
    { to: '/shop?cat=anime', label: 'ANIME', match: (path, qs) => path === '/shop' && qs.includes('cat=anime') },
    { to: '/shop?cat=k-pop', label: 'K-POP', match: (path, qs) => path === '/shop' && qs.includes('cat=k-pop') },
    { to: '/shop?cat=gaming', label: 'GAMING', match: (path, qs) => path === '/shop' && qs.includes('cat=gaming') },
    { to: '/shop?cat=others', label: 'OTHERS', match: (path, qs) => path === '/shop' && qs.includes('cat=others') },
    { to: '/track-your-order', label: 'TRACK YOUR ORDER', match: (path) => path === '/track-your-order' },
  ]

  return (
    <>
      <PromoBar />
      <header className="header">
        <div className="header__top">
          <Link to="/" className="header__brand">
            <img src="/images/logo-fan-x-charms.png" alt="Fan X Charms" className="header__logo-img" />
            <span className="header__subtitle">SHOP</span>
          </Link>
          <div className="header__icons header__icons--right">
            <Link to="/cart" className="header__icon-btn header__cart" aria-label="Cart">
              <IconCart />
              {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
            </Link>
          </div>
        </div>
        <div className="header__search-wrap">
          <span className="header__search-icon" aria-hidden>
            <IconSearch />
          </span>
          <input
            type="search"
            className="header__search"
            placeholder="Search for products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
          />
        </div>
        <nav className="header__nav">
          {navItems.map(({ to, label, match }) => {
            const isActive = match && match(location.pathname, search)
            return (
              <Link
                key={label}
                to={to}
                className={`header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </header>
    </>
  )
}
