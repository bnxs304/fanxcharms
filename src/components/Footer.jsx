import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../constants/site'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__col">
          <h3 className="footer__heading">Secure checkout</h3>
          <p className="footer__text">Payments are encrypted with SSL (HTTPS).</p>
          <p className="footer__text">Processed securely by Stripe.</p>
          <p className="footer__text">PCI DSS compliant payments.</p>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Socials</h3>
          <div className="footer__links">
            <a href="https://instagram.com/fanxcharms" target="_blank" rel="noopener noreferrer" className="footer__link" aria-label="Instagram">
              Instagram
            </a>
            <a href="https://tiktok.com/@fanxcharms" target="_blank" rel="noopener noreferrer" className="footer__link" aria-label="TikTok">
              TikTok
            </a>
          </div>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Customer care</h3>
          <div className="footer__links">
            <Link to="/track-your-order" className="footer__link">Track your order</Link>
            <Link to="/returns-refunds" className="footer__link">Returns &amp; Refunds</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="footer__link">{CONTACT_EMAIL}</a>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span className="footer__copy">All rights reserved © 2026 Fan X Charms</span>
        <span className="footer__legal">
          <Link to="/privacy">Privacy Policy</Link>
          {' / '}
          <Link to="/terms">General conditions</Link>
          {' / '}
          <Link to="/returns-refunds">Returns & Refunds</Link>
          {' · '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </span>
        <span className="footer__credit">
          <a href="https://iconscout.com/icons/list" target="_blank" rel="noopener noreferrer" title="List">List</a>
          {' by '}
          <a href="https://iconscout.com/contributors/lagotdesign" target="_blank" rel="noopener noreferrer">lagot design</a>
          {' on '}
          <a href="https://iconscout.com" target="_blank" rel="noopener noreferrer">IconScout</a>
          {' · '}
          <a href="https://iconscout.com/icons/super-cart" target="_blank" rel="noopener noreferrer" title="Super cart">Super cart</a>
          {' by '}
          <a href="https://iconscout.com/contributors/rizky-salam" target="_blank" rel="noopener noreferrer">Rizky Studio</a>
          {' · '}
          <a href="https://iconscout.com/icons/search" target="_blank" rel="noopener noreferrer" title="Search">Search</a>
          {' by '}
          <a href="https://iconscout.com/contributors/priyanka-gupta" target="_blank" rel="noopener noreferrer">WEBTECHOPS LLP</a>
        </span>
      </div>
    </footer>
  )
}
