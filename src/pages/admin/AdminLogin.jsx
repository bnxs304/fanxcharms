import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Admin.css'

export default function AdminLogin() {
  const { user, loading, signIn, isConfigured } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/admin/products'

  if (!isConfigured) {
    return (
      <div className="admin admin--centered">
        <p className="admin__message">Firebase is not configured. Add VITE_FIREBASE_* to .env</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="admin admin--centered">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="admin admin--centered">
      <div className="admin__card">
        <h1 className="admin__title">Admin login</h1>
        <p className="admin__subtitle">Sign in to manage product listings.</p>
        <form onSubmit={handleSubmit} className="admin__form">
          {error && <p className="admin__error" role="alert">{error}</p>}
          <div className="admin__field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="admin__field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="admin__btn admin__btn--primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
