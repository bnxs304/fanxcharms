import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useProduct } from '../hooks/useProduct'
import { isInStock } from '../lib/productsService'
import { useCart } from '../context/CartContext'
import './ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading, error } = useProduct(id)
  const { addToCart } = useCart()
  const [size, setSize] = useState('One Size')
  const [added, setAdded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const images = (product?.images?.length ? product.images : product?.image ? [product.image] : [])

  useEffect(() => {
    if (product?.sizes?.length) setSize(product.sizes[0])
  }, [product])

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [id])

  const handleAddToCart = () => {
    if (!product || !isInStock(product)) return
    const maxQuantity = product.stock != null && product.stock > 0 ? product.stock : null
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      maxQuantity,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="product-detail product-detail--missing">
        <p>Loading product…</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail product-detail--missing">
        <p>{error || 'This product isn’t available or the link may be wrong. Try browsing the shop.'}</p>
        <button type="button" onClick={() => navigate('/')}>Back to shop</button>
      </div>
    )
  }

  const inStock = isInStock(product)

  return (
    <div className="product-detail">
      <div className="product-detail__grid">
        <div className="product-detail__gallery">
          <div className="product-detail__image-wrap">
            <img
              src={images[selectedImageIndex] || product.image}
              alt={product.name}
              className="product-detail__image"
            />
          </div>
          {images.length > 1 && (
            <div className="product-detail__thumbs">
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  className={`product-detail__thumb ${i === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail__info">
          <span className="product-detail__category">{product.category}</span>
          <h1 className="product-detail__name">{product.name}</h1>
          <p className="product-detail__price">£{product.price.toFixed(2)} <span className="product-detail__tax">(All prices include tax)</span></p>
          {!inStock && (
            <p className="product-detail__out-of-stock" role="status">Out of stock</p>
          )}
          <p className="product-detail__description">{product.description}</p>
          {product.sizes.length > 1 && (
            <div className="product-detail__sizes">
              <label className="product-detail__label">Size</label>
              <div className="product-detail__size-options">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`product-detail__size-btn ${size === s ? 'active' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            className={`product-detail__add ${added ? 'added' : ''} ${!inStock ? 'product-detail__add--disabled' : ''}`}
            onClick={handleAddToCart}
            disabled={added || !inStock}
          >
            {!inStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
