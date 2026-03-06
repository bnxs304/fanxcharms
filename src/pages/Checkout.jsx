import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { createOrder } from '../lib/ordersService'
import { createSumUpCheckout } from '../lib/sumup'
import './Checkout.css'

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [sumUpLoading, setSumUpLoading] = useState(false)
  const [sumUpError, setSumUpError] = useState(null)

  const handlePlaceOrderDemo = (e) => {
    e.preventDefault()
    clearCart()
    navigate('/?order=success')
  }

  const handlePayWithSumUp = async (e) => {
    e.preventDefault()
    setSumUpError(null)
    const emailVal = email.trim()
    const addressVal = address.trim()
    if (!emailVal || !addressVal) {
      setSumUpError('Please enter your email and address.')
      return
    }
    setSumUpLoading(true)
    try {
      const { orderId } = await createOrder({
        email: emailVal,
        address: addressVal,
        name: name.trim() || undefined,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size ?? 'One Size',
          image: i.image ?? '',
        })),
        total: cartTotal,
        currency: 'GBP',
      })
      const { hosted_checkout_url } = await createSumUpCheckout({
        amount: cartTotal,
        currency: 'GBP',
        checkout_reference: orderId,
        description: `Fan X Charms – ${cart.length} item(s)`,
        redirect_url: `${window.location.origin}/?order=success&orderId=${encodeURIComponent(orderId)}`,
      })
      clearCart()
      window.location.href = hosted_checkout_url
    } catch (err) {
      setSumUpError(err.message || 'Payment could not be started. Try the demo order or check the server.')
      setSumUpLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="checkout checkout--empty">
        <h2>No items to checkout</h2>
        <Link to="/">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="checkout">
      <h2 className="checkout__title">Checkout</h2>
      <form className="checkout__form" onSubmit={(e) => e.preventDefault()}>
        <section className="checkout__section">
          <h3>Contact & shipping</h3>
          <p className="checkout__note">
            Enter your details. After payment you will be redirected back here.
          </p>
          <div className="checkout__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="name">Name (optional)</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </section>
        <section className="checkout__section checkout__order">
          <h3>Order summary</h3>
          <ul className="checkout__list">
            {cart.map((item) => (
              <li key={`${item.id}-${item.size}`}>
                <span>{item.name} × {item.quantity}</span>
                <span>£{(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="checkout__total">
            Total <strong>£{cartTotal.toFixed(2)}</strong>
          </p>

          {sumUpError && (
            <p className="checkout__error" role="alert">
              {sumUpError}
            </p>
          )}

          <button
            type="button"
            className="checkout__submit checkout__submit--sumup"
            onClick={handlePayWithSumUp}
            disabled={sumUpLoading}
          >
            {sumUpLoading ? 'Redirecting to payment…' : 'Pay with SumUp'}
          </button>
          <button
            type="button"
            className="checkout__submit checkout__submit--demo"
            onClick={handlePlaceOrderDemo}
          >
            Place order (demo, no payment)
          </button>
        </section>
      </form>
    </div>
  )
}
