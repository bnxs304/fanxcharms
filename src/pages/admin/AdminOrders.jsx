import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getOrdersFromFirestore, updateOrderStatus } from '../../lib/ordersService'
import './Admin.css'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
]

export default function AdminOrders() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getOrdersFromFirestore()
      .then((data) => { if (!cancelled) setOrders(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true, state: { from: location } })
    }
  }, [user, authLoading, navigate, location])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } catch (e) {
      alert(e.message || 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Orders</h1>
        <div className="admin__header-actions">
          <Link to="/admin/products" className="admin__btn">Products</Link>
        </div>
      </header>

      {loading ? (
        <p>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="admin__empty">No orders yet.</p>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Email</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <code className="admin__order-id">{o.id}</code>
                  </td>
                  <td>{o.email}</td>
                  <td>£{Number(o.total).toFixed(2)}</td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      disabled={updatingId === o.id}
                      className="admin__select"
                      aria-label={`Update status for order ${o.id}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="admin__btn admin__btn--small"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
