import { storage } from './storageService.js';
import { productService } from './productService.js';
import { cartService } from './cartService.js';

const STORAGE_KEY = 'wlcia_ecommerce_orders_v1';

class OrderService {
  getAll() {
    return storage.get(STORAGE_KEY, []);
  }

  getById(orderId) {
    const orders = this.getAll();
    return orders.find(o => o.id === orderId) || null;
  }

  createOrder({ customer, paymentMethod, paymentDetails }) {
    const cartState = cartService.getState();
    if (cartState.items.length === 0) {
      throw new Error('O carrinho está vazio');
    }

    const orderId = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name,
        email: customer.email,
        cpf: customer.cpf,
        phone: customer.phone,
        address: customer.address,
        cep: customer.cep,
        city: customer.city,
        state: customer.state
      },
      items: [...cartState.items],
      pricing: {
        subtotal: cartState.subtotal,
        discount: cartState.discount,
        shipping: cartState.shipping,
        total: cartState.total,
        couponCode: cartState.coupon ? cartState.coupon.code : null
      },
      payment: {
        method: paymentMethod, // 'pix', 'credit_card', 'boleto'
        status: paymentMethod === 'pix' ? 'approved' : 'approved', // Simulação aprovada para teste imediato
        transactionId: `mp-${Date.now()}`,
        details: paymentDetails || {}
      },
      status: 'paid' // 'pending', 'paid', 'shipped', 'delivered', 'cancelled'
    };

    // Baixa de estoque dos produtos
    productService.deductStock(newOrder.items);

    // Salva o pedido
    const orders = this.getAll();
    orders.unshift(newOrder);
    storage.set(STORAGE_KEY, orders);

    // Limpa o carrinho
    cartService.clear();

    return newOrder;
  }

  updateStatus(orderId, newStatus) {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = newStatus;
    storage.set(STORAGE_KEY, orders);
    return order;
  }
}

export const orderService = new OrderService();
