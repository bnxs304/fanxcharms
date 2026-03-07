import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getProductsFromFirestore, deleteProduct, seedStaticProducts, createProduct } from '../../lib/productsService'
import './Admin.css'

export default function AdminProducts() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [duplicatingId, setDuplicatingId] = useState(null)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getProductsFromFirestore()
      .then((data) => { if (!cancelled) setProducts(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true, state: { from: location } })
    }
  }, [user, authLoading, navigate, location])

  const handleSeed = async () => {
    if (!window.confirm('Add sample products from static data to Firestore?')) return
    setSeeding(true)
    try {
      await seedStaticProducts()
      const data = await getProductsFromFirestore()
      setProducts(data)
    } catch (e) {
      alert(e.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

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

  if (authLoading || !user) return null

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">Product listings</h1>
        <div className="admin__header-actions">
          <button type="button" className="admin__btn" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed from static'}
          </button>
          <Link to="/admin/products/new" className="admin__btn admin__btn--primary">Add product</Link>
        </div>
      </header>

      {loading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p className="admin__empty">No products in Firestore. Add one or seed from static data.</p>
      ) : (
        <>
          <p className="admin__hint">Products are stored in Firestore. Public store reads from here with fallback to static data.</p>
          <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img src={p.image} alt="" className="admin__thumb" />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>£{Number(p.price).toFixed(2)}</td>
                  <td>{p.stock != null ? p.stock : '—'}</td>
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
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
