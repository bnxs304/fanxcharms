import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getProductByIdFromFirestore,
  createProduct,
  updateProduct,
} from '../../lib/productsService'
import { SHOP_CATEGORIES } from '../../data/categories'
import './Admin.css'

function AddImageUrlForm({ onAdd }) {
  const [url, setUrl] = useState('')
  return (
    <div className="admin__add-url">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste image URL and click Add"
        className="admin__add-url-input"
      />
      <button type="button" className="admin__btn admin__btn--small" onClick={() => { onAdd(url); setUrl('') }} disabled={!url.trim()}>
        Add URL
      </button>
    </div>
  )
}

const defaultProduct = {
  name: '',
  price: '',
  description: '',
  images: [],
  category: '',
  sizes: 'One Size',
  stock: '',
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [form, setForm] = useState(defaultProduct)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user && !authLoading) {
      const from = isNew ? '/admin/products' : `/admin/products/${id}/edit`
      navigate('/admin/login', { replace: true, state: { from: { pathname: from } } })
      return
    }
    if (isNew) {
      setLoading(false)
      return
    }
    getProductByIdFromFirestore(id)
      .then((p) => {
        if (p) {
          const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : [])
          setForm({
            name: p.name,
            price: String(p.price),
            description: p.description ?? '',
            images: [...images],
            category: p.category ?? '',
            sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : 'One Size',
            stock: p.stock != null ? String(p.stock) : '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isNew, user, authLoading, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const addImageUrl = (url) => {
    const trimmed = url?.trim()
    if (!trimmed) return
    setForm((prev) => ({ ...prev, images: [...(prev.images || []), trimmed] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const sizes = form.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    const images = Array.isArray(form.images) ? form.images.filter(Boolean) : []
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      description: form.description.trim(),
      images,
      category: form.category.trim(),
      sizes: sizes.length ? sizes : ['One Size'],
      stock: form.stock === '' ? null : parseInt(form.stock, 10),
    }
    try {
      if (isNew) {
        const newId = await createProduct(payload)
        navigate(`/admin/products/${newId}/edit`, { replace: true })
      } else {
        await updateProduct(id, payload)
        navigate('/admin/products')
      }
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || (!user && !isNew)) return null
  if (!isNew && loading) return <div className="admin">Loading…</div>

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">{isNew ? 'Add product' : 'Edit product'}</h1>
        <Link to="/admin/products" className="admin__btn">Back to list</Link>
      </header>

      <form onSubmit={handleSubmit} className="admin__form admin__form--wide">
        {error && <p className="admin__error" role="alert">{error}</p>}
        <div className="admin__field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="admin__field">
          <label htmlFor="price">Price (£)</label>
          <input id="price" name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required />
        </div>
        <div className="admin__field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange} />
        </div>
        <div className="admin__field">
          <label>Product images</label>
          <p className="admin__hint">First image is the main one. Add image URLs below.</p>
          <AddImageUrlForm onAdd={addImageUrl} />
          {form.images && form.images.length > 0 && (
            <div className="admin__image-list">
              {form.images.map((url, index) => (
                <div key={`${url}-${index}`} className="admin__image-list-item">
                  <img src={url} alt="" />
                  <span className="admin__image-list-order">{index === 0 ? 'Main' : index + 1}</span>
                  <button type="button" className="admin__image-list-remove" onClick={() => removeImage(index)} aria-label="Remove image">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="admin__field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={form.category} onChange={handleChange} required>
            <option value="">Select category</option>
            {SHOP_CATEGORIES.map(({ id, label }) => (
              <option key={id} value={label}>{label}</option>
            ))}
          </select>
        </div>
        <div className="admin__field">
          <label htmlFor="sizes">Sizes (comma-separated)</label>
          <input id="sizes" name="sizes" value={form.sizes} onChange={handleChange} placeholder="One Size or 6, 7, 8, 9" />
        </div>
        <div className="admin__field">
          <label htmlFor="stock">Stock (leave empty for no limit)</label>
          <input id="stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
        </div>
        <div className="admin__actions">
          <button type="submit" className="admin__btn admin__btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
          <Link to="/admin/products" className="admin__btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
