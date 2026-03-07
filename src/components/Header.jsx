import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
export default function Header() {
  const { cartCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const search = location.search || ''
  const searchParams = new URLSearchParams(search)
  const qFromUrl = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(qFromUrl)
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => { setSearchQuery(qFromUrl) }, [qFromUrl])
  useEffect(() => { setNavOpen(false) }, [location.pathname, search])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    const params = new URLSearchParams(searchParams)
    if (q) params.set('q', q)
    else params.delete('q')
    const queryString = params.toString()
    navigate(`/shop${queryString ? `?${queryString}` : ''}`)
  }

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
            <button
              type="button"
              className="header__nav-toggle"
              onClick={() => setNavOpen((o) => !o)}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
            >
              {navOpen ? <IconClose /> : <IconMenu />}
            </button>
            <Link to="/cart" className="header__icon-btn header__cart" aria-label="Cart">
              <IconCart />
              {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
            </Link>
          </div>
        </div>
        <form className="header__search-wrap header__search-wrap--desktop" onSubmit={handleSearchSubmit} role="search">
          <span className="header__search-icon" aria-hidden>
            <IconSearch />
          </span>
          <input
            type="search"
            className="header__search"
            placeholder="Search for products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
        </form>
        <div className="header__mobile-bar">
          <button
            type="button"
            className="header__nav-toggle"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
          >
            {navOpen ? <IconClose /> : <IconMenu />}
          </button>
          <form className="header__search-wrap header__search-wrap--mobile" onSubmit={handleSearchSubmit} role="search">
            <span className="header__search-icon" aria-hidden>
              <IconSearch />
            </span>
            <input
              type="search"
              className="header__search header__search--mobile"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products"
            />
          </form>
          <Link to="/cart" className="header__icon-btn header__cart" aria-label="Cart">
            <IconCart />
            {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
          </Link>
        </div>
        <nav className="header__nav header__nav--desktop" aria-label="Main">
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
        <div
          className={`header__nav-overlay ${navOpen ? 'header__nav-overlay--open' : ''}`}
          aria-hidden={!navOpen}
          onClick={() => setNavOpen(false)}
        >
          <nav
            className="header__nav header__nav--dropdown"
            aria-label="Main"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map(({ to, label, match }) => {
              const isActive = match && match(location.pathname, search)
              return (
                <Link
                  key={label}
                  to={to}
                  className={`header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
    </>
  )
}
