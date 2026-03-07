import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__bottom">
        <span className="footer__copy">All rights reserved</span>
        <span className="footer__legal">
          <Link to="/privacy">Privacy Policy</Link>
          {' / '}
          <Link to="/terms">General conditions</Link>
          {' / '}
          <Link to="/returns-refunds">Returns & Refunds</Link>
        </span>
      </div>
    </footer>
  )
}
