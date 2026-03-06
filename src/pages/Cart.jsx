import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './Cart.css'

export default function Cart() {
  const { cart, cartTotal, updateQuantity, removeFromCart } = useCart()

  if (cart.length === 0) {
    return (
      <div className="cart cart--empty">
        <h2 className="cart__title">Your cart is empty</h2>
        <p className="cart__empty-text">Add something you love from the shop.</p>
        <Link to="/" className="cart__shop-link">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="cart">
      <h2 className="cart__title">Your cart</h2>
      <div className="cart__items">
        {cart.map((item) => (
          <div key={`${item.id}-${item.size}`} className="cart-item">
            <div className="cart-item__image-wrap">
              <img src={item.image} alt={item.name} />
            </div>
            <div className="cart-item__details">
              <h3 className="cart-item__name">{item.name}</h3>
              <p className="cart-item__meta">Size: {item.size} · £{item.price.toFixed(2)}</p>
              <div className="cart-item__actions">
                <div className="cart-item__qty">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                    aria-label="Increase quantity"
                    disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                  >
                    +
                  </button>
                  {item.maxQuantity != null && item.quantity >= item.maxQuantity && (
                    <span className="cart-item__max" aria-live="polite">Max {item.maxQuantity}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="cart-item__remove"
                  onClick={() => removeFromCart(item.id, item.size)}
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="cart-item__total">£{(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>
      <div className="cart__footer">
        <p className="cart__total">
          Subtotal <strong>£{cartTotal.toFixed(2)}</strong>
        </p>
        <Link to="/checkout" className="cart__checkout-btn">Proceed to checkout</Link>
        <Link to="/" className="cart__continue">Continue shopping</Link>
      </div>
    </div>
  )
}
