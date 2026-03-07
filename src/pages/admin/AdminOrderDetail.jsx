import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getOrderByIdFromFirestore, updateOrderStatus, updateOrderTracking } from '../../lib/ordersService'
import './Admin.css'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'canceled', label: 'Canceled' },
]

export default function AdminOrderDetail() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [savingTracking, setSavingTracking] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    let cancelled = false
    getOrderByIdFromFirestore(id)
      .then((data) => {
        if (!cancelled) {
          setOrder(data)
          setTrackingNumber(data?.trackingNumber ?? '')
          setCarrier(data?.carrier ?? '')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, id])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true, state: { from: location } })
    }
  }, [user, authLoading, navigate, location])

  const handleStatusChange = async (newStatus) => {
    if (!order) return
    setSaving(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      setOrder({ ...order, status: newStatus })
    } catch (e) {
      alert(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTracking = async () => {
    if (!order) return
    setSavingTracking(true)
    try {
      await updateOrderTracking(order.id, { trackingNumber, carrier })
      setOrder({ ...order, trackingNumber, carrier })
    } catch (e) {
      alert(e.message || 'Update failed')
    } finally {
      setSavingTracking(false)
    }
  }

  if (authLoading || !user) return null
  if (loading) return <div className="admin"><p>Loading order…</p></div>
  if (!order) return <div className="admin"><p>Order not found.</p><Link to="/admin/orders">Back to orders</Link></div>

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Order {order.id}</h1>
        <div className="admin__header-actions">
          <Link to="/admin/orders" className="admin__btn">← Orders</Link>
        </div>
      </header>

      <div className="admin__card admin__order-detail">
        <p><strong>Email:</strong> {order.email}</p>
        {order.name && <p><strong>Name:</strong> {order.name}</p>}
        <p><strong>Address:</strong> {order.address}</p>
        {order.shippingMethod && <p><strong>Shipping:</strong> {order.shippingMethod}{order.shippingCost != null && order.shippingCost > 0 ? ` (£${Number(order.shippingCost).toFixed(2)})` : ''}</p>}
        <p><strong>Total:</strong> £{Number(order.total).toFixed(2)} {order.currency}</p>
        <p><strong>Placed:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</p>

        <div className="admin__field">
          <label>Status {(order.status === 'pending' || !order.status) && <span className="admin__label-hint">(unpaid)</span>}</label>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={saving}
            className="admin__select"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <h3 className="admin__order-detail-sub">Tracking</h3>
        <div className="admin__field">
          <label>Carrier</label>
          <input
            type="text"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="e.g. Royal Mail, DPD"
            className="admin__input"
          />
        </div>
        <div className="admin__field">
          <label>Tracking number</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1234567890"
            className="admin__input"
          />
        </div>
        <button type="button" className="admin__btn admin__btn--small" onClick={handleSaveTracking} disabled={savingTracking}>
          {savingTracking ? 'Saving…' : 'Save tracking'}
        </button>

        <h3 className="admin__order-detail-sub">Items</h3>
        <ul className="admin__order-items">
          {order.items?.map((item, i) => (
            <li key={i}>
              {item.name} × {item.quantity} {item.size && `(${item.size})`} — £{(item.price * item.quantity).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
