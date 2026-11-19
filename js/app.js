/**
 * NexusTech Store - Aplicação E-commerce SPA
 * Orquestrador central: rotas, visualização de catálogo, carrinho, checkout e painel administrativo.
 */

import { Toast } from './components/toast.js';
import { productService } from './services/productService.js';
import { cartService } from './services/cartService.js';
import { orderService } from './services/orderService.js';
import { mercadoPagoService } from './services/mercadoPagoService.js';

// ============================================================================
// Utilitários de Formatação
// ============================================================================
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

// ============================================================================
// Gerenciador do Carrinho (Drawer Lateral)
// ============================================================================
class CartUI {
  constructor() {
    this.drawer = document.getElementById('cart-drawer');
    this.overlay = document.getElementById('cart-drawer-overlay');
    this.closeBtn = document.getElementById('cart-close-btn');
    this.triggerBtn = document.getElementById('cart-trigger');
    this.badge = document.getElementById('cart-counter-badge');
    this.itemsContainer = document.getElementById('cart-drawer-items');
    this.itemsCountLabel = document.getElementById('drawer-items-count');
    this.subtotalEl = document.getElementById('drawer-subtotal');
    this.discountRow = document.getElementById('drawer-discount-row');
    this.discountEl = document.getElementById('drawer-discount');
    this.shippingEl = document.getElementById('drawer-shipping');
    this.totalEl = document.getElementById('drawer-total');
    this.couponForm = document.getElementById('cart-coupon-form');
    this.couponInput = document.getElementById('coupon-input');
    this.couponFeedback = document.getElementById('coupon-feedback');
    this.continueBtn = document.getElementById('btn-continue-shopping');

    this.initEvents();
  }

  initEvents() {
    if (this.triggerBtn) {
      this.triggerBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }
    if (this.continueBtn) {
      this.continueBtn.addEventListener('click', () => this.close());
    }

    // Formulário de Cupom
    if (this.couponForm) {
      this.couponForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = this.couponInput ? this.couponInput.value : '';
        const res = cartService.applyCoupon(code);
        if (res.success) {
          Toast.success(res.message);
          if (this.couponFeedback) {
            this.couponFeedback.textContent = res.message;
            this.couponFeedback.className = 'coupon-feedback success';
          }
        } else {
          Toast.error(res.message);
          if (this.couponFeedback) {
            this.couponFeedback.textContent = res.message;
            this.couponFeedback.className = 'coupon-feedback error';
          }
        }
      });
    }

    // Ouvinte reativo de mudanças no carrinho
    cartService.addEventListener('cart-updated', (e) => {
      this.render(e.detail);
    });

    // Render inicial
    this.render(cartService.getState());
  }

  open() {
    if (this.drawer) {
      this.drawer.classList.add('open');
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  close() {
    if (this.drawer) {
      this.drawer.classList.remove('open');
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  render(state) {
    // Atualiza contadores
    if (this.badge) this.badge.textContent = state.count;
    if (this.itemsCountLabel) this.itemsCountLabel.textContent = `${state.count} itens`;

    // Atualiza totais
    if (this.subtotalEl) this.subtotalEl.textContent = formatCurrency(state.subtotal);
    
    if (this.discountRow && this.discountEl) {
      if (state.discount > 0) {
        this.discountRow.style.display = 'flex';
        this.discountEl.textContent = `- ${formatCurrency(state.discount)}`;
      } else {
        this.discountRow.style.display = 'none';
      }
    }

    if (this.shippingEl) {
      this.shippingEl.textContent = state.shipping === 0 ? 'Grátis' : formatCurrency(state.shipping);
    }

    if (this.totalEl) this.totalEl.textContent = formatCurrency(state.total);

    // Renderiza lista de itens
    if (!this.itemsContainer) return;

    if (state.items.length === 0) {
      this.itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Seu carrinho está vazio</h3>
          <p>Explore nosso catálogo e encontre os melhores produtos de tecnologia.</p>
          <a href="#catalog" class="btn btn-primary btn-sm" onclick="window.appCart.close()">Ver Produtos</a>
        </div>
      `;
      return;
    }

    this.itemsContainer.innerHTML = state.items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy">
        <div class="cart-item-details">
          <span class="cart-item-category">${item.categoryLabel || ''}</span>
          <h4 class="cart-item-title">${item.name}</h4>
          <span class="cart-item-price">${formatCurrency(item.price)}</span>
          
          <div class="cart-item-actions">
            <div class="qty-control">
              <button type="button" class="btn-qty btn-minus" data-action="decrease" data-id="${item.id}" aria-label="Diminuir quantidade">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" class="btn-qty btn-plus" data-action="increase" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
            </div>
            <button type="button" class="btn-remove-item" data-action="remove" data-id="${item.id}" aria-label="Remover item">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Adiciona eventos aos controles de quantidade e remoção
    this.itemsContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        try {
          if (action === 'increase') {
            cartService.updateQuantity(id, item.quantity + 1);
          } else if (action === 'decrease') {
            cartService.updateQuantity(id, item.quantity - 1);
          } else if (action === 'remove') {
            cartService.removeItem(id);
            Toast.info('Item removido do carrinho');
          }
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  }
}

// ============================================================================
// Renderizadores das Páginas da Aplicação
// ============================================================================

const pages = {
  // --------------------------------------------------------------------------
  // 1. HOME / INÍCIO
  // --------------------------------------------------------------------------
  renderHome() {
    const products = productService.getAll();
    const featuredProducts = products.filter(p => p.featured).slice(0, 4);
    const audioProducts = products.filter(p => p.category === 'audio').slice(0, 4);

    return `
      <div class="home-page fade-in">
        
        <!-- Hero Banner Principal -->
        <section class="hero-section">
          <div class="container hero-container">
            <div class="hero-text">
              <span class="hero-tag">Tecnologia de Próxima Geração</span>
              <h1 class="hero-title">Eleve a Sua Performance com Periféricos & Áudio Premium</h1>
              <p class="hero-subtitle">
                Descubra fones com cancelamento de ruído ativo, teclados mecânicos de alta precisão e smartwatches com entrega rápida e garantia oficial.
              </p>
              <div class="hero-cta-group">
                <a href="#catalog" class="btn btn-primary btn-lg">Explorar Catálogo</a>
                <a href="#catalog?category=audio" class="btn btn-outline btn-lg">Ver Linha de Áudio</a>
              </div>
            </div>
            <div class="hero-media">
              <div class="hero-card-preview">
                <img src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80" alt="Headphone Premium NexusTech" class="hero-img">
                <div class="floating-badge">
                  <span class="badge-icon">⚡</span>
                  <div>
                    <strong>Até 10% OFF</strong>
                    <span>no pagamento via PIX</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Faixa de Benefícios / Diferenciais -->
        <section class="benefits-strip">
          <div class="container benefits-grid">
            <div class="benefit-item">
              <div class="benefit-icon">🚚</div>
              <div class="benefit-info">
                <h4>Frete Grátis</h4>
                <p>Em compras acima de R$ 300</p>
              </div>
            </div>
            <div class="benefit-item">
              <div class="benefit-icon">💳</div>
              <div class="benefit-info">
                <h4>Até 12x Sem Juros</h4>
                <p>Nos principais cartões</p>
              </div>
            </div>
            <div class="benefit-item">
              <div class="benefit-icon">🛡️</div>
              <div class="benefit-info">
                <h4>Compra Protegida</h4>
                <p>Garantia e suporte direto</p>
              </div>
            </div>
            <div class="benefit-item">
              <div class="benefit-icon">⚡</div>
              <div class="benefit-info">
                <h4>PIX com Desconto</h4>
                <p>Aprovação imediata</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Categorias Rápidas -->
        <section class="categories-section container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Compre por Categoria</h2>
              <p class="section-subtitle">Navegue pelas principais categorias de tecnologia</p>
            </div>
            <a href="#catalog" class="view-all-link">Ver todas &rarr;</a>
          </div>

          <div class="category-cards-grid">
            <a href="#catalog?category=audio" class="category-card">
              <span class="cat-icon">🎧</span>
              <h3>Áudio & Fones</h3>
              <p>Headsets, TWS e Caixas de Som</p>
            </a>
            <a href="#catalog?category=perifericos" class="category-card">
              <span class="cat-icon">⌨️</span>
              <h3>Periféricos Gamer</h3>
              <p>Teclados, Mouses e Acessórios</p>
            </a>
            <a href="#catalog?category=wearables" class="category-card">
              <span class="cat-icon">⌚</span>
              <h3>Smartwatches</h3>
              <p>Monitoramento e Alta Conectividade</p>
            </a>
            <a href="#catalog?category=acessorios" class="category-card">
              <span class="cat-icon">🔌</span>
              <h3>Cabos & Hubs</h3>
              <p>Carregadores rápidos e Adaptadores</p>
            </a>
          </div>
        </section>

        <!-- Produtos em Destaque -->
        <section class="featured-section container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Produtos em Destaque</h2>
              <p class="section-subtitle">Os favoritos da nossa comunidade com as melhores avaliações</p>
            </div>
            <a href="#catalog" class="btn btn-outline btn-sm">Ver Catálogo Completo</a>
          </div>

          <div class="products-grid">
            ${featuredProducts.map(p => pages.renderProductCard(p)).join('')}
          </div>
        </section>

        <!-- Banner Promocional Secundário -->
        <section class="promo-banner container">
          <div class="promo-content">
            <span class="promo-pill">Oferta Especial</span>
            <h2>Ganhe 10% de Desconto na Primeira Compra</h2>
            <p>Utilize o cupom <strong>BEMVINDO10</strong> na finalização do pedido e garanta o melhor preço.</p>
            <a href="#catalog" class="btn btn-primary btn-lg">Aproveitar Oferta</a>
          </div>
        </section>

        <!-- Mais Vendidos de Áudio -->
        <section class="featured-section container">
          <div class="section-header">
            <div>
              <h2 class="section-title">Destaques em Áudio</h2>
              <p class="section-subtitle">Experiência sonora cristalina com graves potentes</p>
            </div>
            <a href="#catalog?category=audio" class="view-all-link">Ver mais fones &rarr;</a>
          </div>

          <div class="products-grid">
            ${audioProducts.map(p => pages.renderProductCard(p)).join('')}
          </div>
        </section>

      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // Helper: Card de Produto Reutilizável
  // --------------------------------------------------------------------------
  renderProductCard(product) {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
      : 0;

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="card-media">
          ${hasDiscount ? `<span class="badge-discount">-${discountPercent}%</span>` : ''}
          ${product.stock <= 3 && product.stock > 0 ? `<span class="badge-stock-alert">Últimas unidades</span>` : ''}
          ${product.stock === 0 ? `<span class="badge-out-of-stock">Esgotado</span>` : ''}
          
          <a href="#product/${product.id}" class="card-img-link" title="${product.name}">
            <img src="${product.image}" alt="${product.name}" class="product-thumb" loading="lazy">
          </a>
        </div>

        <div class="card-content">
          <span class="product-category">${product.categoryLabel || product.category}</span>
          <h3 class="product-title">
            <a href="#product/${product.id}">${product.name}</a>
          </h3>

          <div class="product-rating" aria-label="Avaliação: ${product.rating} de 5">
            <span class="stars">${'★'.repeat(Math.floor(product.rating || 5))}${'☆'.repeat(5 - Math.floor(product.rating || 5))}</span>
            <span class="rating-number">${product.rating || '5.0'} (${product.reviewsCount || 1})</span>
          </div>

          <div class="product-pricing">
            ${hasDiscount ? `<span class="original-price">${formatCurrency(product.originalPrice)}</span>` : ''}
            <span class="current-price">${formatCurrency(product.price)}</span>
            <span class="pix-price">ou ${formatCurrency(product.price * 0.95)} no PIX (5% off)</span>
          </div>

          <div class="card-actions">
            <button 
              type="button" 
              class="btn btn-primary btn-block btn-add-cart" 
              data-product-id="${product.id}"
              ${product.stock === 0 ? 'disabled' : ''}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              ${product.stock === 0 ? 'Esgotado' : 'Adicionar'}
            </button>
            <a href="#product/${product.id}" class="btn btn-outline btn-icon" title="Ver Detalhes">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  },

  // --------------------------------------------------------------------------
  // 2. CATÁLOGO / PRODUTOS COM FILTROS EM TEMPO REAL
  // --------------------------------------------------------------------------
  renderCatalog(params = {}) {
    const activeCategory = params.category || 'all';
    const activeSearch = params.search || '';
    const activeSort = params.sortBy || 'rating';
    const activeMaxPrice = params.maxPrice ? parseFloat(params.maxPrice) : 3000;

    const filtered = productService.filter({
      category: activeCategory,
      search: activeSearch,
      sortBy: activeSort,
      maxPrice: activeMaxPrice
    });

    const categories = [
      { key: 'all', label: 'Todas as Categorias' },
      ...productService.getCategories()
    ];

    return `
      <div class="catalog-page container fade-in">
        
        <!-- Cabeçalho do Catálogo -->
        <header class="catalog-header">
          <div>
            <h1 class="page-title">Catálogo de Produtos</h1>
            <p class="page-subtitle">Encontrados <strong>${filtered.length}</strong> produtos disponíveis</p>
          </div>
        </header>

        <div class="catalog-layout">
          
          <!-- Barra Lateral de Filtros -->
          <aside class="catalog-sidebar">
            <div class="filter-card">
              <div class="filter-header">
                <h3>Filtros</h3>
                <a href="#catalog" class="filter-clear-link">Limpar</a>
              </div>

              <!-- Busca Interna -->
              <div class="filter-group">
                <label for="catalog-search-input" class="filter-label">Buscar por nome</label>
                <input 
                  type="text" 
                  id="catalog-search-input" 
                  class="input-control" 
                  placeholder="Ex: Teclado, Fone..." 
                  value="${activeSearch}"
                >
              </div>

              <!-- Categorias -->
              <div class="filter-group">
                <label class="filter-label">Categorias</label>
                <div class="category-radio-list">
                  ${categories.map(c => `
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        name="cat-filter" 
                        value="${c.key}" 
                        ${activeCategory === c.key ? 'checked' : ''}
                      >
                      <span>${c.label}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Faixa de Preço -->
              <div class="filter-group">
                <div class="range-labels">
                  <label for="price-range" class="filter-label">Preço Máximo</label>
                  <span id="price-range-val" class="price-indicator">${formatCurrency(activeMaxPrice)}</span>
                </div>
                <input 
                  type="range" 
                  id="price-range" 
                  min="50" 
                  max="3000" 
                  step="50" 
                  value="${activeMaxPrice}" 
                  class="range-slider"
                >
              </div>

              <!-- Ordenação -->
              <div class="filter-group">
                <label for="sort-select" class="filter-label">Ordenar por</label>
                <select id="sort-select" class="input-control">
                  <option value="rating" ${activeSort === 'rating' ? 'selected' : ''}>Mais Bem Avaliados</option>
                  <option value="price-asc" ${activeSort === 'price-asc' ? 'selected' : ''}>Menor Preço</option>
                  <option value="price-desc" ${activeSort === 'price-desc' ? 'selected' : ''}>Maior Preço</option>
                  <option value="name-asc" ${activeSort === 'name-asc' ? 'selected' : ''}>Nome (A - Z)</option>
                </select>
              </div>

            </div>
          </aside>

          <!-- Grade de Resultados -->
          <section class="catalog-results">
            ${filtered.length === 0 ? `
              <div class="empty-results-card">
                <div class="empty-icon">🔍</div>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente ajustar os filtros ou pesquisar com outros termos.</p>
                <a href="#catalog" class="btn btn-outline btn-sm">Limpar Todos os Filtros</a>
              </div>
            ` : `
              <div class="products-grid">
                ${filtered.map(p => pages.renderProductCard(p)).join('')}
              </div>
            `}
          </section>

        </div>

      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 3. DETALHES DO PRODUTO (#product/:id)
  // --------------------------------------------------------------------------
  renderProductDetail(productId) {
    const product = productService.getById(productId);
    if (!product) {
      return `
        <div class="container not-found-page fade-in">
          <h2>Produto não encontrado</h2>
          <p>O item solicitado não existe ou foi removido do catálogo.</p>
          <a href="#catalog" class="btn btn-primary">Voltar para o Catálogo</a>
        </div>
      `;
    }

    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const installments = Math.min(12, 10);
    const installmentValue = product.price / installments;

    // Produtos relacionados da mesma categoria
    const related = productService.getAll()
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4);

    return `
      <div class="product-detail-page container fade-in">
        
        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Navegação estrutural">
          <a href="#home">Início</a>
          <span class="sep">/</span>
          <a href="#catalog">Catálogo</a>
          <span class="sep">/</span>
          <a href="#catalog?category=${product.category}">${product.categoryLabel || product.category}</a>
          <span class="sep">/</span>
          <span class="current">${product.name}</span>
        </nav>

        <div class="detail-grid">
          
          <!-- Galeria de Fotos -->
          <div class="detail-gallery">
            <div class="main-image-wrapper">
              <img src="${product.image}" alt="${product.name}" class="detail-main-img" id="detail-main-img">
            </div>
            <div class="detail-thumbnails">
              <button type="button" class="thumb-btn active">
                <img src="${product.image}" alt="Miniatura 1">
              </button>
            </div>
          </div>

          <!-- Informações de Compra -->
          <div class="detail-info">
            <span class="badge badge-primary">${product.categoryLabel || product.category}</span>
            <h1 class="detail-title">${product.name}</h1>

            <div class="detail-rating-row">
              <span class="stars">${'★'.repeat(Math.floor(product.rating || 5))}</span>
              <span class="rating-text">${product.rating || '5.0'} (${product.reviewsCount || 1} avaliações de clientes verificados)</span>
            </div>

            <div class="detail-pricing-box">
              ${hasDiscount ? `<span class="old-price">De ${formatCurrency(product.originalPrice)} por:</span>` : ''}
              <div class="price-highlight">
                <span class="price-val">${formatCurrency(product.price)}</span>
                <span class="pix-badge">10% OFF no PIX (${formatCurrency(product.price * 0.90)})</span>
              </div>
              <p class="installment-text">em até <strong>${installments}x de ${formatCurrency(installmentValue)}</strong> sem juros</p>
            </div>

            <!-- Descrição Resumida -->
            <p class="detail-description">${product.description || 'Produto de alta tecnologia com garantia oficial.'}</p>

            <!-- Disponibilidade de Estoque -->
            <div class="stock-status-row">
              ${product.stock > 0 ? `
                <span class="stock-pill in-stock">✓ Em Estoque (${product.stock} disponíveis)</span>
              ` : `
                <span class="stock-pill out-of-stock">✕ Fora de estoque</span>
              `}
            </div>

            <!-- Seletor de Quantidade e Compra -->
            ${product.stock > 0 ? `
              <div class="purchase-box">
                <div class="quantity-selector">
                  <label for="detail-qty-input" class="qty-label">Quantidade:</label>
                  <div class="qty-control">
                    <button type="button" class="btn-qty" id="detail-qty-minus">−</button>
                    <input type="number" id="detail-qty-input" value="1" min="1" max="${product.stock}" class="qty-input-field">
                    <button type="button" class="btn-qty" id="detail-qty-plus">+</button>
                  </div>
                </div>

                <div class="detail-action-buttons">
                  <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-detail-add-cart" data-id="${product.id}">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Adicionar ao Carrinho
                  </button>
                  <button type="button" class="btn btn-success btn-lg btn-block" id="btn-detail-buy-now" data-id="${product.id}">
                    Comprar Agora (Checkout Rápido)
                  </button>
                </div>
              </div>
            ` : `
              <div class="alert alert-warning">
                Este produto está temporariamente indisponível no estoque. Fique de olho para reposição.
              </div>
            `}

            <!-- Calculadora de Frete -->
            <div class="shipping-calculator-card">
              <h4>Calcular Frete e Prazo</h4>
              <div class="shipping-input-group">
                <input type="text" id="shipping-cep-input" placeholder="00000-000" maxlength="9" class="input-control">
                <button type="button" class="btn btn-outline" id="btn-calc-shipping">Calcular</button>
              </div>
              <div id="shipping-result-box" class="shipping-result-box"></div>
            </div>

          </div>

        </div>

        <!-- Produtos Relacionados -->
        ${related.length > 0 ? `
          <section class="related-section">
            <h2 class="section-title">Produtos Relacionados</h2>
            <div class="products-grid">
              ${related.map(p => pages.renderProductCard(p)).join('')}
            </div>
          </section>
        ` : ''}

      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 4. FINALIZAÇÃO DE COMPRA / CHECKOUT (#checkout)
  // --------------------------------------------------------------------------
  renderCheckout() {
    const cartState = cartService.getState();

    if (cartState.items.length === 0) {
      return `
        <div class="container checkout-empty fade-in">
          <div class="empty-icon">🛒</div>
          <h2>Seu carrinho está vazio para finalizar compra</h2>
          <p>Adicione produtos antes de prosseguir para o checkout.</p>
          <a href="#catalog" class="btn btn-primary">Voltar para a Loja</a>
        </div>
      `;
    }

    return `
      <div class="checkout-page container fade-in">
        
        <header class="checkout-header">
          <h1 class="page-title">Finalização do Pedido</h1>
          <p class="page-subtitle">Ambiente 100% seguro com criptografia e Mercado Pago</p>
        </header>

        <div class="checkout-grid">
          
          <!-- Formulário Principal -->
          <div class="checkout-main-form">
            <form id="checkout-form" novalidate>
              
              <!-- Seção 1: Dados do Comprador -->
              <section class="checkout-section-card">
                <div class="section-badge">1</div>
                <div class="section-content">
                  <h3>Dados Pessoais</h3>
                  <div class="form-row grid-2">
                    <div class="form-group">
                      <label for="cust-name">Nome Completo *</label>
                      <input type="text" id="cust-name" required class="input-control" placeholder="Seu nome e sobrenome">
                    </div>
                    <div class="form-group">
                      <label for="cust-email">E-mail *</label>
                      <input type="email" id="cust-email" required class="input-control" placeholder="exemplo@email.com">
                    </div>
                  </div>
                  <div class="form-row grid-2">
                    <div class="form-group">
                      <label for="cust-cpf">CPF *</label>
                      <input type="text" id="cust-cpf" required maxlength="14" class="input-control" placeholder="000.000.000-00">
                    </div>
                    <div class="form-group">
                      <label for="cust-phone">WhatsApp / Celular *</label>
                      <input type="tel" id="cust-phone" required maxlength="15" class="input-control" placeholder="(00) 00000-0000">
                    </div>
                  </div>
                </div>
              </section>

              <!-- Seção 2: Endereço de Entrega -->
              <section class="checkout-section-card">
                <div class="section-badge">2</div>
                <div class="section-content">
                  <h3>Endereço de Entrega</h3>
                  <div class="form-row grid-3">
                    <div class="form-group">
                      <label for="cust-cep">CEP *</label>
                      <input type="text" id="cust-cep" required maxlength="9" class="input-control" placeholder="00000-000">
                    </div>
                    <div class="form-group col-span-2">
                      <label for="cust-address">Logradouro / Rua *</label>
                      <input type="text" id="cust-address" required class="input-control" placeholder="Avenida Paulista, 1000">
                    </div>
                  </div>
                  <div class="form-row grid-3">
                    <div class="form-group">
                      <label for="cust-number">Número *</label>
                      <input type="text" id="cust-number" required class="input-control" placeholder="123">
                    </div>
                    <div class="form-group">
                      <label for="cust-city">Cidade *</label>
                      <input type="text" id="cust-city" required class="input-control" placeholder="São Paulo">
                    </div>
                    <div class="form-group">
                      <label for="cust-state">Estado *</label>
                      <input type="text" id="cust-state" required maxlength="2" class="input-control" placeholder="SP">
                    </div>
                  </div>
                </div>
              </section>

              <!-- Seção 3: Forma de Pagamento -->
              <section class="checkout-section-card">
                <div class="section-badge">3</div>
                <div class="section-content">
                  <h3>Forma de Pagamento (Mercado Pago)</h3>
                  
                  <div class="payment-tabs">
                    <label class="payment-tab-option">
                      <input type="radio" name="pay-method" value="pix" checked>
                      <div class="tab-box">
                        <span class="tab-icon">⚡</span>
                        <strong>PIX</strong>
                        <span class="tab-tag">Aprovação Imediata</span>
                      </div>
                    </label>

                    <label class="payment-tab-option">
                      <input type="radio" name="pay-method" value="credit_card">
                      <div class="tab-box">
                        <span class="tab-icon">💳</span>
                        <strong>Cartão</strong>
                        <span class="tab-tag">Até 12x</span>
                      </div>
                    </label>

                    <label class="payment-tab-option">
                      <input type="radio" name="pay-method" value="boleto">
                      <div class="tab-box">
                        <span class="tab-icon">📄</span>
                        <strong>Boleto</strong>
                        <span class="tab-tag">Compensação 1-3 dias</span>
                      </div>
                    </label>
                  </div>

                  <!-- Detalhe do Pagamento Selecionado -->
                  <div class="payment-method-details" id="payment-details-box">
                    <div class="pix-instruction-alert">
                      <p>✨ Ao concluir o pedido, você receberá a <strong>chave Copia e Cola</strong> e o <strong>QR Code oficial do PIX</strong> para pagamento instantâneo pelo aplicativo do seu banco.</p>
                    </div>
                  </div>

                </div>
              </section>

              <button type="submit" class="btn btn-success btn-block btn-lg btn-confirm-order">
                🔒 Confirmar e Gerar Pedido (${formatCurrency(cartState.total)})
              </button>

            </form>
          </div>

          <!-- Resumo Lateral do Pedido -->
          <aside class="checkout-summary-sidebar">
            <div class="summary-card">
              <h3>Resumo da Compra</h3>
              
              <div class="checkout-items-list">
                ${cartState.items.map(item => `
                  <div class="checkout-mini-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="mini-info">
                      <h4>${item.name}</h4>
                      <span>${item.quantity}x ${formatCurrency(item.price)}</span>
                    </div>
                    <strong>${formatCurrency(item.price * item.quantity)}</strong>
                  </div>
                `).join('')}
              </div>

              <div class="summary-divider"></div>

              <div class="summary-lines">
                <div class="s-line">
                  <span>Subtotal</span>
                  <span>${formatCurrency(cartState.subtotal)}</span>
                </div>
                ${cartState.discount > 0 ? `
                  <div class="s-line discount-s-line">
                    <span>Desconto do Cupom</span>
                    <span>- ${formatCurrency(cartState.discount)}</span>
                  </div>
                ` : ''}
                <div class="s-line">
                  <span>Frete</span>
                  <span>${cartState.shipping === 0 ? 'Grátis' : formatCurrency(cartState.shipping)}</span>
                </div>
                <div class="s-line total-s-line">
                  <strong>Total a Pagar</strong>
                  <strong class="total-price">${formatCurrency(cartState.total)}</strong>
                </div>
              </div>

              <div class="safe-badge-box">
                <span>🛡️ Pagamento processado pelo Mercado Pago</span>
              </div>
            </div>
          </aside>

        </div>

      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 5. TELA DE SUCESSO / PEDIDO REALIZADO (#order-success/:id)
  // --------------------------------------------------------------------------
  renderOrderSuccess(orderId) {
    const order = orderService.getById(orderId);
    if (!order) {
      return `
        <div class="container not-found-page fade-in">
          <h2>Pedido não localizado</h2>
          <a href="#home" class="btn btn-primary">Voltar para o Início</a>
        </div>
      `;
    }

    const isPix = order.payment.method === 'pix';
    const pixData = isPix ? mercadoPagoService.generatePixPayment(order.pricing.total, order.id) : null;

    return `
      <div class="order-success-page container fade-in">
        <div class="success-card">
          <div class="success-badge-icon">✓</div>
          <h1 class="success-title">Pedido Realizado com Sucesso!</h1>
          <p class="order-id-label">Código do Pedido: <strong>#${order.id}</strong></p>
          <span class="status-chip status-${order.status}">Status: ${order.status.toUpperCase()}</span>

          ${isPix && pixData ? `
            <div class="pix-payment-box">
              <h3>Pagamento via PIX Instantâneo</h3>
              <p>Escaneie o QR Code abaixo com o aplicativo do seu banco:</p>
              
              <div class="qr-code-wrapper">
                <img src="${pixData.qrCodeBase64}" alt="QR Code PIX" class="qr-image">
              </div>

              <div class="pix-copy-box">
                <label>Ou copie e cole o código PIX:</label>
                <div class="copy-input-row">
                  <input type="text" id="pix-copy-input" readonly value="${pixData.qrCodeCopyPaste}" class="input-control">
                  <button type="button" class="btn btn-outline" id="btn-copy-pix">Copiar</button>
                </div>
              </div>
            </div>
          ` : `
            <div class="card-approved-box">
              <p>Seu pagamento no valor de <strong>${formatCurrency(order.pricing.total)}</strong> foi processado com sucesso pelo Mercado Pago.</p>
            </div>
          `}

          <div class="order-details-summary">
            <h3>Detalhes da Entrega</h3>
            <p><strong>Destinatário:</strong> ${order.customer.name}</p>
            <p><strong>Endereço:</strong> ${order.customer.address}, CEP: ${order.customer.cep}, ${order.customer.city} - ${order.customer.state}</p>
            <p><strong>E-mail de confirmação:</strong> ${order.customer.email}</p>
          </div>

          <div class="success-actions">
            <a href="#catalog" class="btn btn-primary btn-lg">Continuar Comprando</a>
            <a href="#admin" class="btn btn-outline btn-lg">Acompanhar no Painel Admin</a>
          </div>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 6. PAINEL ADMINISTRATIVO / GESTÃO (#admin)
  // --------------------------------------------------------------------------
  renderAdmin() {
    const products = productService.getAll();
    const orders = orderService.getAll();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.pricing.total || 0), 0);
    const lowStockCount = products.filter(p => p.stock <= 5).length;

    return `
      <div class="admin-page container fade-in">
        
        <header class="admin-header">
          <div>
            <h1 class="page-title">Painel de Gestão da Loja</h1>
            <p class="page-subtitle">Gerenciamento completo de produtos, estoque, preços e pedidos</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-admin-new-product">
            + Cadastrar Novo Produto
          </button>
        </header>

        <!-- Cards de Métricas e KPIs -->
        <div class="admin-metrics-grid">
          <div class="metric-card">
            <span class="metric-title">Produtos Cadastrados</span>
            <strong class="metric-number">${products.length}</strong>
            <span class="metric-caption">Em catálogo ativo</span>
          </div>
          <div class="metric-card">
            <span class="metric-title">Faturamento Total</span>
            <strong class="metric-number">${formatCurrency(totalRevenue)}</strong>
            <span class="metric-caption">${orders.length} pedidos realizados</span>
          </div>
          <div class="metric-card">
            <span class="metric-title">Estoque Baixo (≤ 5 un)</span>
            <strong class="metric-number ${lowStockCount > 0 ? 'text-warning' : ''}">${lowStockCount}</strong>
            <span class="metric-caption">Requer atenção de compra</span>
          </div>
          <div class="metric-card">
            <span class="metric-title">Gateway Ativo</span>
            <strong class="metric-number text-success">Mercado Pago</strong>
            <span class="metric-caption">PIX, Cartão e Boleto</span>
          </div>
        </div>

        <!-- Seções do Painel -->
        <div class="admin-tabs-section">
          
          <!-- Formulário de Cadastro/Edição Modal ou Inline -->
          <div id="product-form-modal" class="admin-modal" style="display: none;">
            <div class="modal-card">
              <div class="modal-header">
                <h3 id="product-form-title">Novo Produto</h3>
                <button type="button" class="modal-close" id="btn-close-product-modal">&times;</button>
              </div>
              <form id="product-manage-form">
                <input type="hidden" id="prod-edit-id" value="">
                
                <div class="form-row grid-2">
                  <div class="form-group">
                    <label for="prod-name">Nome do Produto *</label>
                    <input type="text" id="prod-name" required class="input-control" placeholder="Ex: Headset Wireless Pro">
                  </div>
                  <div class="form-group">
                    <label for="prod-category">Categoria *</label>
                    <select id="prod-category" required class="input-control">
                      <option value="audio">Áudio & Fones</option>
                      <option value="perifericos">Periféricos Gamer</option>
                      <option value="wearables">Smartwatches</option>
                      <option value="acessorios">Acessórios & Cabos</option>
                    </select>
                  </div>
                </div>

                <div class="form-row grid-3">
                  <div class="form-group">
                    <label for="prod-price">Preço de Venda (R$) *</label>
                    <input type="number" id="prod-price" required step="0.01" class="input-control" placeholder="299.90">
                  </div>
                  <div class="form-group">
                    <label for="prod-orig-price">Preço Original R$ (opcional)</label>
                    <input type="number" id="prod-orig-price" step="0.01" class="input-control" placeholder="399.90">
                  </div>
                  <div class="form-group">
                    <label for="prod-stock">Estoque Disponível *</label>
                    <input type="number" id="prod-stock" required min="0" class="input-control" placeholder="10">
                  </div>
                </div>

                <div class="form-group">
                  <label for="prod-image">URL da Imagem (HD)</label>
                  <input type="url" id="prod-image" class="input-control" placeholder="https://images.unsplash.com/...">
                </div>

                <div class="form-group">
                  <label for="prod-description">Descrição Completa</label>
                  <textarea id="prod-description" rows="3" class="input-control" placeholder="Detalhes técnicos e especificações do produto..."></textarea>
                </div>

                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" id="prod-featured">
                    <span>Destacar este produto na página inicial</span>
                  </label>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-outline" id="btn-cancel-product">Cancelar</button>
                  <button type="submit" class="btn btn-primary" id="btn-save-product">Salvar Produto</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Tabela de Produtos -->
          <div class="admin-section-box">
            <div class="section-box-header">
              <h2>Produtos em Estoque (${products.length})</h2>
            </div>
            
            <div class="table-responsive">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.map(p => `
                    <tr>
                      <td class="td-thumb">
                        <img src="${p.image}" alt="${p.name}" class="admin-prod-thumb">
                      </td>
                      <td class="td-name">
                        <strong>${p.name}</strong>
                        ${p.featured ? '<span class="chip-featured">Destaque</span>' : ''}
                      </td>
                      <td>${p.categoryLabel || p.category}</td>
                      <td><strong>${formatCurrency(p.price)}</strong></td>
                      <td>
                        <span class="stock-badge ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">
                          ${p.stock} un
                        </span>
                      </td>
                      <td class="td-actions">
                        <button type="button" class="btn btn-outline btn-sm btn-edit-product" data-id="${p.id}">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm btn-del-product" data-id="${p.id}">Excluir</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tabela de Pedidos Recebidos -->
          <div class="admin-section-box">
            <div class="section-box-header">
              <h2>Pedidos Recebidos (${orders.length})</h2>
            </div>

            ${orders.length === 0 ? `
              <div class="empty-state-p">Nenhum pedido registrado ainda. Efetue uma compra para testar o fluxo!</div>
            ` : `
              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orders.map(o => `
                      <tr>
                        <td><strong>#${o.id}</strong></td>
                        <td>${formatDate(o.createdAt)}</td>
                        <td>${o.customer.name} <br><small>${o.customer.email}</small></td>
                        <td><strong>${formatCurrency(o.pricing.total)}</strong></td>
                        <td><span class="badge badge-info">${o.payment.method.toUpperCase()}</span></td>
                        <td>
                          <select class="order-status-select" data-order-id="${o.id}">
                            <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>Pago</option>
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pendente</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Enviado</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Entregue</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                          </select>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

        </div>

      </div>
    `;
  }
};

// ============================================================================
// Orquestrador de Rotas (Router SPA)
// ============================================================================
class Router {
  constructor() {
    this.root = document.getElementById('app-root');
    this.searchForm = document.getElementById('header-search-form');
    this.searchInput = document.getElementById('header-search-input');

    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Busca no cabeçalho
    if (this.searchForm) {
      this.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const term = this.searchInput ? this.searchInput.value.trim() : '';
        window.location.hash = term ? `#catalog?search=${encodeURIComponent(term)}` : '#catalog';
      });
    }

    this.handleRoute();
  }

  parseHash() {
    const raw = window.location.hash.slice(1) || 'home';
    const [pathPart, queryPart] = raw.split('?');
    const segments = pathPart.split('/');

    const query = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((val, key) => {
        query[key] = val;
      });
    }

    return {
      route: segments[0] || 'home',
      id: segments[1] || null,
      query
    };
  }

  handleRoute() {
    const { route, id, query } = this.parseHash();

    // Rola para o topo a cada mudança de página
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (route) {
      case 'home':
        this.root.innerHTML = pages.renderHome();
        this.bindHomeEvents();
        break;

      case 'catalog':
        this.root.innerHTML = pages.renderCatalog(query);
        this.bindCatalogEvents(query);
        break;

      case 'product':
        this.root.innerHTML = pages.renderProductDetail(id);
        this.bindDetailEvents(id);
        break;

      case 'checkout':
        this.root.innerHTML = pages.renderCheckout();
        this.bindCheckoutEvents();
        break;

      case 'order-success':
        this.root.innerHTML = pages.renderOrderSuccess(id);
        this.bindOrderSuccessEvents();
        break;

      case 'admin':
        this.root.innerHTML = pages.renderAdmin();
        this.bindAdminEvents();
        break;

      default:
        this.root.innerHTML = pages.renderHome();
        this.bindHomeEvents();
        break;
    }

    // Associa eventos de clique nos botões rápidos "Adicionar ao Carrinho"
    this.bindQuickAddButtons();
  }

  bindQuickAddButtons() {
    this.root.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        try {
          cartService.addItem(id, 1);
          Toast.success('Produto adicionado ao carrinho!');
          window.appCart.open();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  }

  bindHomeEvents() {
    // Nada específico além dos botões rápidos
  }

  bindCatalogEvents(currentQuery) {
    const searchInput = document.getElementById('catalog-search-input');
    const priceRange = document.getElementById('price-range');
    const priceVal = document.getElementById('price-range-val');
    const sortSelect = document.getElementById('sort-select');
    const radios = document.querySelectorAll('input[name="cat-filter"]');

    const updateParams = () => {
      const params = new URLSearchParams();
      const selectedCat = document.querySelector('input[name="cat-filter"]:checked');
      if (selectedCat && selectedCat.value !== 'all') params.set('category', selectedCat.value);
      if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
      if (priceRange && priceRange.value !== '3000') params.set('maxPrice', priceRange.value);
      if (sortSelect && sortSelect.value !== 'rating') params.set('sortBy', sortSelect.value);

      const qs = params.toString();
      window.location.hash = qs ? `#catalog?${qs}` : '#catalog';
    };

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateParams, 400);
      });
    }

    if (priceRange && priceVal) {
      priceRange.addEventListener('input', () => {
        priceVal.textContent = formatCurrency(priceRange.value);
      });
      priceRange.addEventListener('change', updateParams);
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', updateParams);
    }

    radios.forEach(r => {
      r.addEventListener('change', updateParams);
    });
  }

  bindDetailEvents(productId) {
    const qtyMinus = document.getElementById('detail-qty-minus');
    const qtyPlus = document.getElementById('detail-qty-plus');
    const qtyInput = document.getElementById('detail-qty-input');
    const btnAdd = document.getElementById('btn-detail-add-cart');
    const btnBuyNow = document.getElementById('btn-detail-buy-now');
    const btnCalcShipping = document.getElementById('btn-calc-shipping');
    const cepInput = document.getElementById('shipping-cep-input');
    const shipResult = document.getElementById('shipping-result-box');

    const product = productService.getById(productId);
    if (!product) return;

    if (qtyMinus && qtyPlus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        const val = parseInt(qtyInput.value, 10) || 1;
        if (val > 1) qtyInput.value = val - 1;
      });
      qtyPlus.addEventListener('click', () => {
        const val = parseInt(qtyInput.value, 10) || 1;
        if (val < product.stock) qtyInput.value = val + 1;
      });
    }

    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
        try {
          cartService.addItem(productId, qty);
          Toast.success(`${qty}x "${product.name}" adicionado ao carrinho!`);
          window.appCart.open();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    if (btnBuyNow) {
      btnBuyNow.addEventListener('click', () => {
        const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
        try {
          cartService.addItem(productId, qty);
          window.location.hash = '#checkout';
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    if (btnCalcShipping && cepInput && shipResult) {
      btnCalcShipping.addEventListener('click', () => {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) {
          Toast.warning('Digite um CEP válido com 8 números');
          return;
        }

        shipResult.innerHTML = `
          <div class="shipping-option">
            <span>📦 Normal (Expressa): <strong>${product.price >= 300 ? 'Grátis' : 'R$ 19,90'}</strong></span>
            <small>Prazo estimado: 2 a 4 dias úteis</small>
          </div>
        `;
      });
    }
  }

  bindCheckoutEvents() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('cust-name').value.trim();
      const email = document.getElementById('cust-email').value.trim();
      const cpf = document.getElementById('cust-cpf').value.trim();
      const phone = document.getElementById('cust-phone').value.trim();
      const address = document.getElementById('cust-address').value.trim();
      const cep = document.getElementById('cust-cep').value.trim();
      const city = document.getElementById('cust-city').value.trim();
      const state = document.getElementById('cust-state').value.trim();
      const payMethodRadio = document.querySelector('input[name="pay-method"]:checked');
      const payMethod = payMethodRadio ? payMethodRadio.value : 'pix';

      if (!name || !email || !cpf || !phone || !address || !cep || !city || !state) {
        Toast.error('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      try {
        const newOrder = orderService.createOrder({
          customer: { name, email, cpf, phone, address, cep, city, state },
          paymentMethod: payMethod,
          paymentDetails: { gateway: 'Mercado Pago' }
        });

        Toast.success('Pedido confirmado com sucesso!');
        window.location.hash = `#order-success/${newOrder.id}`;
      } catch (err) {
        Toast.error(`Erro ao criar pedido: ${err.message}`);
      }
    });
  }

  bindOrderSuccessEvents() {
    const copyBtn = document.getElementById('btn-copy-pix');
    const copyInput = document.getElementById('pix-copy-input');
    if (copyBtn && copyInput) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyInput.value).then(() => {
          Toast.success('Código PIX copiado para a área de transferência!');
        }).catch(() => {
          copyInput.select();
          document.execCommand('copy');
          Toast.success('Código PIX copiado!');
        });
      });
    }
  }

  bindAdminEvents() {
    const modal = document.getElementById('product-form-modal');
    const btnNew = document.getElementById('btn-admin-new-product');
    const btnCloseModal = document.getElementById('btn-close-product-modal');
    const btnCancel = document.getElementById('btn-cancel-product');
    const form = document.getElementById('product-manage-form');
    const modalTitle = document.getElementById('product-form-title');
    const editIdInput = document.getElementById('prod-edit-id');

    const openModal = (editProduct = null) => {
      if (!modal) return;
      modal.style.display = 'flex';

      if (editProduct) {
        modalTitle.textContent = 'Editar Produto';
        editIdInput.value = editProduct.id;
        document.getElementById('prod-name').value = editProduct.name;
        document.getElementById('prod-category').value = editProduct.category;
        document.getElementById('prod-price').value = editProduct.price;
        document.getElementById('prod-orig-price').value = editProduct.originalPrice || '';
        document.getElementById('prod-stock').value = editProduct.stock;
        document.getElementById('prod-image').value = editProduct.image || '';
        document.getElementById('prod-description').value = editProduct.description || '';
        document.getElementById('prod-featured').checked = Boolean(editProduct.featured);
      } else {
        modalTitle.textContent = 'Cadastrar Novo Produto';
        editIdInput.value = '';
        form.reset();
      }
    };

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    if (btnNew) btnNew.addEventListener('click', () => openModal(null));
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Salvar produto
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const name = document.getElementById('prod-name').value;
        const category = document.getElementById('prod-category').value;
        const price = document.getElementById('prod-price').value;
        const originalPrice = document.getElementById('prod-orig-price').value;
        const stock = document.getElementById('prod-stock').value;
        const image = document.getElementById('prod-image').value;
        const description = document.getElementById('prod-description').value;
        const featured = document.getElementById('prod-featured').checked;

        const categoryLabels = {
          audio: 'Áudio & Fones',
          perifericos: 'Periféricos Gamer',
          wearables: 'Smartwatches',
          acessorios: 'Acessórios & Cabos'
        };

        const payload = {
          name,
          category,
          categoryLabel: categoryLabels[category] || category,
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          stock: parseInt(stock, 10),
          image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
          description,
          featured
        };

        if (id) {
          productService.update(id, payload);
          Toast.success('Produto atualizado com sucesso!');
        } else {
          productService.create(payload);
          Toast.success('Novo produto cadastrado com sucesso!');
        }

        closeModal();
        this.handleRoute(); // recarrega tela admin
      });
    }

    // Editar produto
    this.root.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = productService.getById(btn.dataset.id);
        if (prod) openModal(prod);
      });
    });

    // Excluir produto
    this.root.querySelectorAll('.btn-del-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const prod = productService.getById(btn.dataset.id);
        if (!prod) return;

        if (confirm(`Tem certeza que deseja excluir o produto "${prod.name}"?`)) {
          productService.delete(prod.id);
          Toast.info('Produto removido');
          this.handleRoute();
        }
      });
    });

    // Alteração de status do pedido
    this.root.querySelectorAll('.order-status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const orderId = sel.dataset.orderId;
        const newStatus = sel.value;
        orderService.updateStatus(orderId, newStatus);
        Toast.success(`Pedido #${orderId} atualizado para "${newStatus.toUpperCase()}"`);
      });
    });
  }
}

// ============================================================================
// Inicialização Global
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  window.appCart = new CartUI();
  window.appRouter = new Router();
});
