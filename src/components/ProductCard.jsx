import { Link } from 'react-router-dom'
import { isInStock } from '../lib/productsService'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const inStock = isInStock(product)
  return (
    <Link to={`/product/${product.id}`} className={`product-card ${!inStock ? 'product-card--out-of-stock' : ''}`}>
      <div className="product-card__image-wrap">
        <img src={product.image} alt={product.name} className="product-card__image" />
        {!inStock && <span className="product-card__badge">Out of stock</span>}
      </div>
      <div className="product-card__info">
        <span className="product-card__category">{product.category}</span>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">£{product.price.toFixed(2)}</p>
      </div>
    </Link>
  )
}
