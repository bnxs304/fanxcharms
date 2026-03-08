import { useState, useEffect } from 'react'
import './PromoBar.css'

const PROMOS = [
  { text: 'FREE UK SHIPPING!', className: 'promo-bar__left' },
  { text: 'WORLDWIDE SHIPPING AVAILABLE!', className: 'promo-bar__right' },
]

export default function PromoBar() {
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % PROMOS.length)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="promo-bar">
      <div
        className="promo-bar__track"
        style={{ '--promo-index': activeIndex }}
        aria-live="polite"
        aria-atomic
      >
        {PROMOS.map((promo, i) => (
          <span
            key={i}
            className={`promo-bar__item ${promo.className} ${i === activeIndex ? 'promo-bar__item--active' : ''}`}
            aria-hidden={i !== activeIndex}
          >
            {promo.text}
          </span>
        ))}
      </div>
    </div>
  )
}
