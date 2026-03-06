import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { productMatchesCategory } from '../data/categories'
import ProductCard from '../components/ProductCard'
import './Shop.css'

export default function Shop() {
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('cat') || ''
  const { products, loading, error } = useProducts()
  const filtered = catParam
    ? products.filter((p) => productMatchesCategory(p, catParam))
    : products

  return (
    <div className="shop">
      <h1 className="shop__title">Shop</h1>
      {/* for each tab add subtitle to match the tab */}
      {catParam === 'anime' && <p className="shop__subtitle">Anime</p>}
      {catParam === 'k-pop' && <p className="shop__subtitle">K-Pop</p>}
      {catParam === 'gaming' && <p className="shop__subtitle">Gaming</p>}
      {catParam === 'others' && <p className="shop__subtitle">more products </p>}
      {catParam === '' && <p className="shop__subtitle">All products</p>}

      {loading && <p className="shop__loading">Loading products…</p>}
      {error && <p className="shop__error" role="alert">{error}</p>}
      {!loading && !error && (
        <div className="shop__grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="shop__empty">
          {catParam ? `No products in this category.` : 'No products available.'}
        </p>
      )}
    </div>
  )
}
