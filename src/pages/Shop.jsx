import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { productMatchesCategory } from '../data/categories'
import { productMatchesSearch } from '../utils/searchMatch'
import { useSeo } from '../utils/useSeo'
import ProductCard from '../components/ProductCard'
import './Shop.css'

export default function Shop() {
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('cat') || ''
  const searchQuery = searchParams.get('q') || ''
  const { products, loading, error } = useProducts()

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const catLabel =
    catParam === 'anime' ? 'Anime'
      : catParam === 'k-pop' ? 'K-Pop'
        : catParam === 'gaming' ? 'Gaming'
          : catParam === 'others' ? 'More products'
            : 'Shop'
  const title = `${catLabel}${searchQuery ? ` - “${searchQuery}”` : ''} - Fan X Charms`
  const description = searchQuery
    ? `Browse ${catLabel} merchandise and search for “${searchQuery}”.`
    : `Shop ${catLabel} merchandise. Anime, K-Pop & gaming collectibles.`
  useSeo({
    title,
    description,
    canonical: origin ? `${origin}/shop` : undefined,
  })

  const byCategory = catParam
    ? products.filter((p) => productMatchesCategory(p, catParam))
    : products
  const filtered = searchQuery
    ? byCategory.filter((p) => productMatchesSearch(p, searchQuery))
    : byCategory

  return (
    <div className="shop">
      <h1 className="shop__title">Shop</h1>
      {catParam === 'anime' && <p className="shop__subtitle">Anime</p>}
      {catParam === 'k-pop' && <p className="shop__subtitle">K-Pop</p>}
      {catParam === 'gaming' && <p className="shop__subtitle">Gaming</p>}
      {catParam === 'others' && <p className="shop__subtitle">More products</p>}
      {catParam === '' && !searchQuery && <p className="shop__subtitle">All products</p>}
      {searchQuery && <p className="shop__subtitle">Search: &ldquo;{searchQuery}&rdquo;</p>}

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
