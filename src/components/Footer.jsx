import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../constants/site'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
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
