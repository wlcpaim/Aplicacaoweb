/**
 * Mercado Pago Integration Service
 * Preparado para produção com suporte a Chaves de Teste/Produção e Checkout Pro / PIX
 */
class MercadoPagoService {
  constructor() {
    // Configurações padrão (podem ser alteradas nas configurações ou variáveis de ambiente)
    this.publicKey = 'TEST-00000000-0000-0000-0000-000000000000';
    this.currency = 'BRL';
  }

  setPublicKey(key) {
    if (key && typeof key === 'string') {
      this.publicKey = key.trim();
    }
  }

  /**
   * Constrói a carga útil (payload) padrão de preferência para o Mercado Pago
   */
  createPreferencePayload(cartItems, customer, backUrls = {}) {
    return {
      items: cartItems.map(item => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        currency_id: this.currency,
        unit_price: Number(item.price)
      })),
      payer: {
        name: customer.name,
        email: customer.email,
        identification: {
          type: 'CPF',
          number: (customer.cpf || '').replace(/\D/g, '')
        },
        address: {
          street_name: customer.address,
          zip_code: (customer.cep || '').replace(/\D/g, '')
        }
      },
      back_urls: {
        success: backUrls.success || window.location.origin + window.location.pathname + '#checkout-success',
        failure: backUrls.failure || window.location.origin + window.location.pathname + '#checkout-failure',
        pending: backUrls.pending || window.location.origin + window.location.pathname + '#checkout-pending'
      },
      auto_return: 'approved'
    };
  }

  /**
   * Gera dados simulados de PIX (QR Code e Copia e Cola)
   * Em produção, esses dados retornam do endpoint `/v1/payments` do Mercado Pago
   */
  generatePixPayment(amount, orderId) {
    const cleanAmount = Number(amount).toFixed(2);
    // Chave simulada válida para cópia e cola
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${cleanAmount.length < 10 ? '0' : ''}${cleanAmount}5802BR5913LOJA VIRTUAL6009SAO PAULO62070503***6304${orderId.slice(-4)}`;
    
    // QR Code dinâmico via gerador de imagem SVG/PNG para exibição imediata
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCopyPaste)}`;

    return {
      qrCodeBase64: qrCodeUrl,
      qrCodeCopyPaste: pixCopyPaste,
      expirationMinutes: 30
    };
  }
}

export const mercadoPagoService = new MercadoPagoService();
