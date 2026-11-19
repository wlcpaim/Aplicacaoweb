import { storage } from './storageService.js';
import { INITIAL_PRODUCTS } from '../data/initialProducts.js';

const STORAGE_KEY = 'wlcia_ecommerce_products_v1';

class ProductService {
  constructor() {
    this._initProducts();
  }

  _initProducts() {
    const existing = storage.get(STORAGE_KEY, null);
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      storage.set(STORAGE_KEY, INITIAL_PRODUCTS);
    }
  }

  getAll() {
    return storage.get(STORAGE_KEY, INITIAL_PRODUCTS);
  }

  getById(id) {
    const products = this.getAll();
    return products.find(p => p.id === id) || null;
  }

  getCategories() {
    const products = this.getAll();
    const categoriesMap = new Map();
    products.forEach(p => {
      if (p.category && !categoriesMap.has(p.category)) {
        categoriesMap.set(p.category, p.categoryLabel || p.category);
      }
    });
    return Array.from(categoriesMap.entries()).map(([key, label]) => ({ key, label }));
  }

  filter({ category, search, sortBy, maxPrice }) {
    let list = [...this.getAll()];

    if (category && category !== 'all') {
      list = list.filter(p => p.category === category);
    }

    if (search && search.trim() !== '') {
      const term = search.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term) ||
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(term))
      );
    }

    if (maxPrice && !isNaN(maxPrice)) {
      list = list.filter(p => p.price <= maxPrice);
    }

    if (sortBy) {
      if (sortBy === 'price-asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-desc') {
        list.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'name-asc') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'rating') {
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    }

    return list;
  }

  create(productData) {
    const products = this.getAll();
    const newProduct = {
      id: `prod-${Date.now()}`,
      name: productData.name.trim(),
      category: productData.category,
      categoryLabel: productData.categoryLabel || productData.category,
      price: parseFloat(productData.price) || 0,
      originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
      stock: parseInt(productData.stock, 10) || 0,
      rating: 5.0,
      reviewsCount: 1,
      image: productData.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
      description: productData.description || '',
      featured: Boolean(productData.featured)
    };

    products.unshift(newProduct);
    storage.set(STORAGE_KEY, products);
    return newProduct;
  }

  update(id, updatedData) {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
      ...products[index],
      ...updatedData,
      price: updatedData.price !== undefined ? parseFloat(updatedData.price) : products[index].price,
      originalPrice: updatedData.originalPrice !== undefined ? parseFloat(updatedData.originalPrice) : products[index].originalPrice,
      stock: updatedData.stock !== undefined ? parseInt(updatedData.stock, 10) : products[index].stock
    };

    storage.set(STORAGE_KEY, products);
    return products[index];
  }

  delete(id) {
    const products = this.getAll();
    const filtered = products.filter(p => p.id !== id);
    storage.set(STORAGE_KEY, filtered);
    return true;
  }

  deductStock(items) {
    const products = this.getAll();
    items.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
      }
    });
    storage.set(STORAGE_KEY, products);
  }
}

export const productService = new ProductService();
