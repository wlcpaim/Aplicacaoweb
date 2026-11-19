import { storage } from './storageService.js';
import { productService } from './productService.js';

const STORAGE_KEY = 'wlcia_ecommerce_cart_v1';

class CartService extends EventTarget {
  constructor() {
    super();
    this.items = storage.get(STORAGE_KEY, []);
    this.coupon = null;
    this.shippingCost = 0;
  }

  _saveAndEmit() {
    storage.set(STORAGE_KEY, this.items);
    this.dispatchEvent(new CustomEvent('cart-updated', { detail: this.getState() }));
  }

  getItems() {
    return [...this.items];
  }

  addItem(productId, quantity = 1) {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.stock <= 0) {
      throw new Error('Produto fora de estoque');
    }

    const existingIndex = this.items.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
      const newQty = this.items[existingIndex].quantity + quantity;
      if (newQty > product.stock) {
        throw new Error(`Estoque insuficiente. Restam apenas ${product.stock} unidades.`);
      }
      this.items[existingIndex].quantity = newQty;
    } else {
      if (quantity > product.stock) {
        throw new Error(`Estoque insuficiente. Restam apenas ${product.stock} unidades.`);
      }
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        categoryLabel: product.categoryLabel,
        quantity: quantity
      });
    }

    this._saveAndEmit();
  }

  updateQuantity(productId, quantity) {
    const parsedQty = parseInt(quantity, 10);
    if (parsedQty <= 0) {
      this.removeItem(productId);
      return;
    }

    const product = productService.getById(productId);
    if (product && parsedQty > product.stock) {
      throw new Error(`Apenas ${product.stock} unidades disponíveis em estoque.`);
    }

    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.quantity = parsedQty;
      this._saveAndEmit();
    }
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this._saveAndEmit();
  }

  clear() {
    this.items = [];
    this.coupon = null;
    this.shippingCost = 0;
    this._saveAndEmit();
  }

  applyCoupon(couponCode) {
    const code = (couponCode || '').trim().toUpperCase();
    if (code === 'BEMVINDO10') {
      this.coupon = { code, discountPercent: 10, label: '10% de desconto de boas-vindas' };
      this._saveAndEmit();
      return { success: true, message: 'Cupom de 10% aplicado com sucesso!' };
    } else if (code === 'FRETEGRATIS') {
      this.coupon = { code, freeShipping: true, label: 'Frete Grátis' };
      this.shippingCost = 0;
      this._saveAndEmit();
      return { success: true, message: 'Cupom de Frete Grátis aplicado!' };
    }
    return { success: false, message: 'Cupom inválido ou expirado.' };
  }

  removeCoupon() {
    this.coupon = null;
    this._saveAndEmit();
  }

  calculateShipping(cep) {
    const cleanCep = (cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('Informe um CEP válido com 8 dígitos.');
    }

    if (this.coupon && this.coupon.freeShipping) {
      this.shippingCost = 0;
    } else {
      const subtotal = this.getSubtotal();
      // Frete grátis para compras acima de R$ 300
      this.shippingCost = subtotal >= 300 ? 0 : 19.90;
    }

    this._saveAndEmit();
    return this.shippingCost;
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  getDiscountAmount() {
    if (!this.coupon || !this.coupon.discountPercent) return 0;
    return (this.getSubtotal() * this.coupon.discountPercent) / 100;
  }

  getTotal() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscountAmount();
    return Math.max(0, subtotal - discount + this.shippingCost);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getState() {
    return {
      items: this.getItems(),
      count: this.getItemCount(),
      subtotal: this.getSubtotal(),
      discount: this.getDiscountAmount(),
      shipping: this.shippingCost,
      total: this.getTotal(),
      coupon: this.coupon
    };
  }
}

export const cartService = new CartService();
