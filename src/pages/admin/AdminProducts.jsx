import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getProductsFromFirestore,
  deleteProduct,
  createProduct,
  ensureProductListOrders,
  moveProductListOrder,
  setProductEnabled,
} from '../../lib/productsService'
import {
  normalizeAdminSearchQuery,
  adminSearchMatches,
  productAdminSearchHaystack,
} from '../../utils/adminSearch'
import './Admin.css'

export default function AdminProducts() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [orderBusy, setOrderBusy] = useState(false)
  const [togglingEnabledId, setTogglingEnabledId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const searchNorm = useMemo(() => normalizeAdminSearchQuery(searchQuery), [searchQuery])
  const filteredProducts = useMemo(() => {
    if (!searchNorm) return products
    return products.filter((p) =>
      adminSearchMatches(productAdminSearchHaystack(p), searchNorm)
    )
  }, [products, searchNorm])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        let data = await getProductsFromFirestore()
        if (!cancelled && data.some((p) => p.listOrder == null)) {
          try {
            await ensureProductListOrders()
            data = await getProductsFromFirestore()
          } catch (err) {
            console.warn('ensureProductListOrders:', err)
          }
        }
        if (!cancelled) setProducts(data)
      } catch (e) {
        if (!cancelled) console.warn(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true, state: { from: location } })
    }
  }, [user, authLoading, navigate, location])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    setDeletingId(id)
    try {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      alert(e.message || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (p) => {
    setDuplicatingId(p.id)
    try {
      const newId = await createProduct({
        name: `${p.name} (copy)`,
        price: p.price,
        description: p.description ?? '',
        images: Array.isArray(p.images) && p.images.length > 0 ? [...p.images] : (p.image ? [p.image] : []),
        category: p.category ?? '',
        sizes: Array.isArray(p.sizes) ? p.sizes : ['One Size'],
        stock: null,
        enabled: p.enabled !== false,
      })
      const data = await getProductsFromFirestore()
      setProducts(data)
      navigate(`/admin/products/${newId}/edit`)
    } catch (e) {
      alert(e.message || 'Duplicate failed')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleToggleEnabled = async (p) => {
    const next = !(p.enabled !== false)
    setTogglingEnabledId(p.id)
    try {
      await setProductEnabled(p.id, next)
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, enabled: next } : x))
      )
    } catch (e) {
      alert(e.message || 'Could not update listing')
    } finally {
      setTogglingEnabledId(null)
    }
  }

  const handleMoveOrder = async (productId, direction) => {
    if (orderBusy || products.length < 2) return
    const fullIndex = products.findIndex((p) => p.id === productId)
    if (fullIndex < 0) return
    setOrderBusy(true)
    try {
      await moveProductListOrder(products, fullIndex, direction)
      const data = await getProductsFromFirestore()
      setProducts(data)
    } catch (e) {
      alert(e.message || 'Could not update order')
    } finally {
      setOrderBusy(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Product listings</h1>
        <div className="admin__header-actions">
          <Link to="/admin/products/new" className="admin__btn admin__btn--primary">Add product</Link>
        </div>
      </header>

      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p className="admin__empty">No products in Firestore. Add a product to get started.</p>
      ) : (
        <>
          <p className="admin__hint">
            Products are stored in Firestore. Public store reads from here with fallback to static data.
            The first four products in this order appear in &ldquo;What&apos;s new?&rdquo; on the home page.
          </p>
          <div className="admin__toolbar">
            <div className="admin__filter admin__filter--search">
              <label htmlFor="admin-products-search" className="admin__filter-label">
                Search
              </label>
              <input
                id="admin-products-search"
                type="search"
                className="admin__input admin__input--search"
                placeholder="Name, category, ID, price…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
              />
            </div>
          </div>
          {filteredProducts.length === 0 ? (
            <p className="admin__empty">No products match your search.</p>
          ) : (
          <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Storefront</th>
                <th>List order</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const fullIndex = products.findIndex((x) => x.id === p.id)
                return (
                <tr key={p.id} className={p.enabled === false ? 'admin__table-row--disabled' : undefined}>
                  <td>
                    <img src={p.image} alt="" className="admin__thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>£{Number(p.price).toFixed(2)}</td>
                  <td>{p.stock != null ? p.stock : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={`admin__btn admin__btn--small ${p.enabled !== false ? 'admin__btn--success' : ''}`}
                      disabled={togglingEnabledId === p.id}
                      onClick={() => handleToggleEnabled(p)}
                      title={p.enabled !== false ? 'Visible on shop — click to hide' : 'Hidden from shop — click to show'}
                    >
                      {togglingEnabledId === p.id ? '…' : p.enabled !== false ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <div className="admin__order-cell">
                      <button
                        type="button"
                        className="admin__btn admin__btn--small admin__order-btn"
                        disabled={orderBusy || fullIndex === 0}
                        onClick={() => handleMoveOrder(p.id, 'up')}
                        aria-label={`Move ${p.name} up in the list`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin__btn admin__btn--small admin__order-btn"
                        disabled={orderBusy || fullIndex >= products.length - 1}
                        onClick={() => handleMoveOrder(p.id, 'down')}
                        aria-label={`Move ${p.name} down in the list`}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <Link to={`/admin/products/${p.id}/edit`} className="admin__btn admin__btn--small">Edit</Link>
                    {' '}
                    <button
                      type="button"
                      className="admin__btn admin__btn--small"
                      onClick={() => handleDuplicate(p)}
                      disabled={duplicatingId === p.id}
                      title="Duplicate this product"
                    >
                      {duplicatingId === p.id ? '…' : 'Duplicate'}
                    </button>
                    {' '}
                    <button
                      type="button"
                      className="admin__btn admin__btn--small admin__btn--danger"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  )
}
