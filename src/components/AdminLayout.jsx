import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminLayout.css'

export default function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="admin-layout">
      <nav className="admin-layout__nav">
        <Link to="/admin/products" className="admin-layout__brand">Admin</Link>
        <div className="admin-layout__links">
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/">Store</Link>
          {user && (
            <button type="button" onClick={() => signOut()} className="admin-layout__signout">
              Sign out
            </button>
          )}
        </div>
      </nav>
      <main className="admin-layout__main">
        <Outlet />
      </main>
    </div>
  )
}
