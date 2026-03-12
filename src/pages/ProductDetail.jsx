import { useParams, useNavigate, Link } from 'react-router-dom'
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
  const variants = Array.isArray(product?.variants) ? product.variants : []

  const sizeOptions = variants.length
    ? [...new Set(variants.map((v) => v?.size).filter(Boolean))]
    : (product?.sizes || ['One Size'])

  useEffect(() => {
    if (sizeOptions?.length) {
      setSize(sizeOptions[0])
    }
  }, [product])

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [id])

  const handleAddToCart = () => {
    if (!product) return
    const selectedVariant =
      variants.length && size
        ? variants.find((v) => v?.size === size)
        : null
    const variantStock =
      selectedVariant && selectedVariant.stock != null && selectedVariant.stock !== ''
        ? Number(selectedVariant.stock)
        : null
    const productInStock = variants.length
      ? (variantStock == null || variantStock > 0)
      : isInStock(product)
    if (!productInStock) return
    const maxQuantity =
      variants.length
        ? (variantStock != null && variantStock > 0 ? variantStock : null)
        : (product.stock != null && product.stock > 0 ? product.stock : null)
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
        <div className="product-detail__back-wrap">
          <button type="button" className="product-detail__back" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <p className="product-detail__missing-text">Loading product…</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail product-detail--missing">
        <div className="product-detail__back-wrap">
          <button type="button" className="product-detail__back" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <p className="product-detail__missing-text">{error || 'This product isn’t available or the link may be wrong. Try browsing the shop.'}</p>
        <Link to="/shop" className="product-detail__missing-btn">Back to shop</Link>
      </div>
    )
  }

  const selectedVariant =
    variants.length && size
      ? variants.find((v) => v?.size === size)
      : null
  const variantStock =
    selectedVariant && selectedVariant.stock != null && selectedVariant.stock !== ''
      ? Number(selectedVariant.stock)
      : null
  const inStock = variants.length
    ? (variantStock == null || variantStock > 0)
    : isInStock(product)

  return (
    <div className="product-detail">
      <div className="product-detail__back-wrap">
        <button type="button" className="product-detail__back" onClick={() => navigate(-1)}>← Back</button>
      </div>
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
                  className={`product-detail__thumb ${i === selectedImageIndex ? 'product-detail__thumb--active' : ''}`}
                  onClick={() => setSelectedImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === selectedImageIndex ? 'true' : undefined}
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
          <p className="product-detail__price">£{product.price.toFixed(2)} <span className="product-detail__tax">inc. tax</span></p>
          {!inStock && (
            <p className="product-detail__out-of-stock" role="status">Out of stock</p>
          )}
          {product.description && (
            <div className="product-detail__description-wrap">
              <h3 className="product-detail__description-title">Description</h3>
              <div className="product-detail__description">
                {(product.description || '')
                  .split(/\n\n+/)
                  .filter((block) => block.trim())
                  .map((block, i) => (
                    <p key={i}>{block.trim().split(/\n/).join(' ')}</p>
                  ))}
              </div>
            </div>
          )}
          {sizeOptions?.length > 1 && (
            <div className="product-detail__sizes">
              <span className="product-detail__label">Size</span>
              <div className="product-detail__size-options">
                {sizeOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`product-detail__size-btn ${size === s ? 'product-detail__size-btn--active' : ''}`}
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
            className={`product-detail__add ${added ? 'product-detail__add--added' : ''} ${!inStock ? 'product-detail__add--disabled' : ''}`}
            onClick={handleAddToCart}
            disabled={added || !inStock}
          >
            {!inStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}
          </button>
          {added && (
            <p className="product-detail__cart-hint">
              <Link to="/cart">View cart</Link> or <Link to="/shop">continue shopping</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
