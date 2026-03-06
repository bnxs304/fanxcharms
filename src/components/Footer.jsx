import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__bottom">
        <span className="footer__copy">All rights reserved</span>
        <span className="footer__legal">
          <a href="/">Privacy Policy</a> / <a href="/">General conditions</a> / <a href="/">Return Policy</a>
        </span>
      </div>
    </footer>
  )
}
