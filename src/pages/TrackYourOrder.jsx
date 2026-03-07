import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrderForCustomer } from '../lib/ordersService'
import './TrackYourOrder.css'

const STATUS_LABELS = {
  pending: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
  canceled: 'Canceled',
}

export default function TrackYourOrder() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setOrder(null)
    const oid = orderId.trim()
    const em = email.trim()
    if (!oid || !em) {
      setError('Please enter both your order reference and the email you used when ordering.')
      return
    }
    setLoading(true)
    try {
      const data = await getOrderForCustomer(oid, em)
      setOrder(data)
    } catch (err) {
      setError(err.status === 404 ? 'We couldn’t find an order with those details. Please check your order reference and email and try again.' : (err.message || 'Something went wrong. Please try again in a moment.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="track-order">
      <h1 className="track-order__title">Track your order</h1>
      <p className="track-order__intro">
        Enter the order reference from your confirmation and the email you used when ordering.
      </p>

      <form className="track-order__form" onSubmit={handleSubmit}>
        <div className="track-order__field">
          <label htmlFor="track-orderId">Order reference</label>
          <input
            id="track-orderId"
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. abc123xyz"
            autoComplete="off"
          />
        </div>
        <div className="track-order__field">
          <label htmlFor="track-email">Email</label>
          <input
            id="track-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        {error && (
          <p className="track-order__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="track-order__submit" disabled={loading}>
          {loading ? 'Looking up…' : 'Track order'}
        </button>
      </form>

      {order && (
        <div className="track-order__result">
          <h2>Order {order.id}</h2>
          <p className="track-order__status">
            Status: <strong>{STATUS_LABELS[order.status] ?? order.status}</strong>
          </p>
          {(order.status === 'pending' || !order.status) && (
            <div className="track-order__pending-notice" role="status">
              <p><strong>This order has not been paid yet.</strong></p>
              <p>If you didn&apos;t complete payment, this order will not be fulfilled. You can place a new order when you&apos;re ready. If you&apos;ve just paid, your status may update in a few moments.</p>
            </div>
          )}
          {(order.trackingNumber || order.carrier) && (
            <p className="track-order__tracking">
              {order.carrier && <strong>{order.carrier}</strong>}
              {order.carrier && order.trackingNumber && ' — '}
              {order.trackingNumber && (
                <span className="track-order__tracking-number">{order.trackingNumber}</span>
              )}
            </p>
          )}
          <p className="track-order__meta">
            Placed on {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
            {order.name && ` · ${order.name}`}
          </p>
          <p className="track-order__address">Shipping: {order.address}</p>
          <ul className="track-order__items">
            {order.items?.map((item, i) => (
              <li key={i}>
                {item.name} × {item.quantity} {item.size && `(${item.size})`} — £{(item.price * item.quantity).toFixed(2)}
              </li>
            ))}
          </ul>
          {(order.shippingCost != null && order.shippingCost > 0) && (
            <p className="track-order__shipping">Shipping: £{Number(order.shippingCost).toFixed(2)}</p>
          )}
          <p className="track-order__total">Total: £{Number(order.total).toFixed(2)}</p>
        </div>
      )}

      <p className="track-order__back">
        <Link to="/">Back to shop</Link>
      </p>
    </div>
  )
}
