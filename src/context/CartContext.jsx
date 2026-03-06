import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function capQuantity(qty, max) {
  if (max == null || max <= 0) return qty
  return Math.min(Math.max(0, qty), max)
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const payload = action.payload
      const addQty = payload.quantity || 1
      const maxQty = payload.maxQuantity != null ? payload.maxQuantity : null
      const existing = state.find((i) => i.id === payload.id && i.size === payload.size)
      if (existing) {
        const newQty = capQuantity(existing.quantity + addQty, existing.maxQuantity ?? maxQty)
        return state.map((i) =>
          i.id === payload.id && i.size === payload.size
            ? { ...i, quantity: newQty }
            : i
        )
      }
      const quantity = capQuantity(addQty, maxQty)
      return [...state, { ...payload, quantity, maxQuantity: maxQty }]
    }
    case 'REMOVE':
      return state.filter(
        (i) => !(i.id === action.payload.id && i.size === action.payload.size)
      )
    case 'UPDATE_QTY': {
      const { id, size, quantity } = action.payload
      const item = state.find((i) => i.id === id && i.size === size)
      if (!item) return state
      if (quantity < 1) {
        return state.filter((i) => !(i.id === id && i.size === size))
      }
      const capped = capQuantity(quantity, item.maxQuantity)
      return state.map((i) =>
        i.id === id && i.size === size ? { ...i, quantity: capped } : i
      )
    }
    case 'CLEAR':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])

  const addToCart = (item) => dispatch({ type: 'ADD', payload: item })
  const removeFromCart = (id, size) => dispatch({ type: 'REMOVE', payload: { id, size } })
  const updateQuantity = (id, size, quantity) =>
    dispatch({ type: 'UPDATE_QTY', payload: { id, size, quantity } })
  const clearCart = () => dispatch({ type: 'CLEAR' })

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
