/**
 * Product inventory/listing – single source for shop items.
 * category must be one of: Anime, K-Pop, Gaming, Others (see src/data/categories.js).
 * Optional `stock`: number in stock; 0 = out of stock (add to cart disabled).
 */
export const products = [
  {
    id: '1',
    name: 'Luna Moon Charm',
    price: 24.99,
    description: 'Handcrafted sterling silver moon charm. Perfect for layering or as a standalone piece.',
    image: 'https://images.unsplash.com/photo-1611652022419-a5079b8f2c1a?w=600',
    category: 'Anime',
    sizes: ['One Size'],
    stock: 10,
  },
  {
    id: '2',
    name: 'Star Cluster Pendant',
    price: 32.00,
    description: 'Delicate star cluster in gold-plated brass. A subtle statement for everyday wear.',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600',
    category: 'K-Pop',
    sizes: ['One Size'],
    stock: 5,
  },
  {
    id: '3',
    name: 'Pearl Drop Earrings',
    price: 28.50,
    description: 'Freshwater pearl drops on sterling silver hooks. Elegant and timeless.',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600',
    category: 'Gaming',
    sizes: ['One Size'],
    stock: 8,
  },
  {
    id: '4',
    name: 'Braided Ring Set',
    price: 45.00,
    description: 'Set of three thin braided bands. Mix and match or stack for a custom look.',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600',
    category: 'Others',
    sizes: ['6', '7', '8', '9'],
    stock: 12,
  },
  {
    id: '5',
    name: 'Leaf Charm Bracelet',
    price: 38.00,
    description: 'Sterling silver leaf charms on an adjustable chain. Nature-inspired everyday piece.',
    image: 'https://images.unsplash.com/photo-1617038260897-8e15779a2e1c?w=600',
    category: 'K-Pop',
    sizes: ['S', 'M', 'L'],
    stock: 0,
  },
  {
    id: '6',
    name: 'Hamsa Pendant',
    price: 29.99,
    description: 'Protective Hamsa symbol in oxidized silver. A meaningful gift or personal talisman.',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    category: 'Anime',
    sizes: ['One Size'],
    stock: 3,
  },
]

export function getProductById(id) {
  return products.find((p) => p.id === id) ?? null
}

/** True if product has stock (stock undefined or > 0). */
export function isInStock(product) {
  return product && (product.stock == null || product.stock > 0)
}
