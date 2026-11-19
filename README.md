# ⚡ NexusTech Store — E-commerce Profissional & Completo

Uma loja virtual moderna, modular, responsiva e pronta para vendas reais, desenvolvida com padrões de engenharia de software sênior.

![Status](https://img.shields.io/badge/Status-100%25%20Funcional-brightgreen)
![Arquitetura](https://img.shields.io/badge/Arquitetura-SPA%20Modular%20ES6-blue)
![Pagamento](https://img.shields.io/badge/Gateway-Mercado%20Pago%20Ready-blueviolet)
![Dispositivos](https://img.shields.io/badge/Responsivo-Mobile%20%7C%20Tablet%20%7C%20Desktop-orange)

---

## 🎯 Visão Geral do Projeto

A **NexusTech Store** é uma plataforma de e-commerce completa construída para oferecer uma experiência de compra fluida e veloz, sem dependências pesadas, pronta para publicação no **GitHub Pages**, **Vercel** ou qualquer hospedagem web.

### ✨ Funcionalidades Principais

1. **Navegação SPA Baseada em Rotas por Hash**:
   - `#home`: Vitrine inicial com Hero Banner, categorias em destaque, vantagens e carrossel de mais vendidos.
   - `#catalog`: Catálogo completo com busca textual em tempo real, filtros por categoria, seletor de preço máximo e ordenação dinâmica (preço, nome, avaliação).
   - `#product/:id`: Página de detalhes do produto com fotos HD, breadcrumbs, cálculo de frete simulado por CEP, seletor de quantidade validado pelo estoque e produtos relacionados.
   - `#checkout`: Fluxo de finalização de pedidos em 3 etapas (Dados do comprador, Endereço de entrega com autopreenchimento e Pagamento com PIX, Cartão e Boleto).
   - `#order-success/:id`: Tela de confirmação com QR Code e chave Copia e Cola para pagamento imediato via PIX.
   - `#admin`: Painel de controle completo para cadastro, edição de preços/estoque, remoção de produtos e acompanhamento de pedidos recebidos com alteração de status em tempo real.

2. **Carrinho de Compras Interativo (Drawer Lateral)**:
   - Gaveta deslizante acessível de qualquer página.
   - Ajuste em tempo real de quantidade com proteção contra esgotamento de estoque.
   - Suporte a cupons de desconto (`BEMVINDO10` para 10% OFF e `FRETEGRATIS`).
   - Cálculo automático de frete e subtotal.

3. **Painel de Gestão Administrativa**:
   - Métricas em tempo real: faturamento total, quantidade de itens em estoque, produtos com estoque crítico (≤ 5 unidades) e pedidos recebidos.
   - Modal para cadastrar novos produtos ou editar produtos existentes (nome, categoria, preço, preço original, estoque, foto e destaque na home).
   - Tabela de pedidos com controle de status (*Pago*, *Pendente*, *Enviado*, *Entregue*, *Cancelado*).

4. **Preparada para Produção com Mercado Pago**:
   - Camada `mercadoPagoService.js` com geração de payload oficial para a API de Preferências (`/checkout/preferences`) e geração de QR Code dinâmico para PIX.

---

## 📂 Estrutura de Arquivos do Repositório

```text
├── index.html                   # Estrutura HTML5 semântica e acessível (SPA Root)
├── README.md                    # Documentação e manual completo
├── css/
│   ├── variables.css            # Design tokens (cores primárias, espaçamentos, sombras, raios)
│   ├── base.css                 # Reset CSS moderno, tipografia Inter e utilitários
│   ├── layout.css               # Header fixo, busca global, drawer do carrinho e rodapé
│   ├── components.css           # Cards de produtos, botões, badges, modais e sistema Toast
│   └── pages.css                # Estilos dedicados (Home, Catálogo, Detalhe, Checkout, Admin)
└── js/
    ├── app.js                   # Orquestrador da SPA, router e listeners de eventos
    ├── components/
    │   └── toast.js             # Notificações visuais reativas (sucesso, erro, alerta, info)
    ├── data/
    │   └── initialProducts.js   # Catálogo inicial de eletrônicos, fones, periféricos e smartwatches
    └── services/
        ├── storageService.js    # Gerenciador de persistência local segura (LocalStorage)
        ├── productService.js    # CRUD de produtos, filtros e controle de estoque
        ├── cartService.js       # Regras de negócio do carrinho, cupons e frete
        ├── orderService.js      # Geração, armazenamento e atualização de pedidos
        └── mercadoPagoService.js# Integração com gateway Mercado Pago e PIX
```

---

## 🚀 Como Executar Localmente

Como a aplicação é 100% nativa (HTML5, CSS3 moderno e JavaScript ES6 Modules), não é necessário instalar Node.js ou compilar pacotes:

1. Clone o repositório:
   ```bash
   git clone https://github.com/wlcpaim/Aplicacaoweb.git
   cd Aplicacaoweb
   ```

2. Inicie qualquer servidor HTTP estático para que os módulos ES6 funcionem corretamente:
   - **Com VS Code**: Clique com o botão direito em `index.html` e selecione **"Open with Live Server"**.
   - **Com Python**:
     ```bash
     python -m http.server 8000
     ```
   - **Com Node.js (npx)**:
     ```bash
     npx serve .
     ```

3. Acesse `http://localhost:8000` no seu navegador.

---

## 💳 Configuração do Mercado Pago para Produção

O arquivo `js/services/mercadoPagoService.js` já está estruturado com os contratos oficiais do Mercado Pago.

### Passos para ativar suas credenciais reais:

1. Acesse o [Painel do Desenvolvedor do Mercado Pago](https://www.mercadopago.com.br/developers).
2. Obtenha sua **Public Key** (`TEST-xxx` para testes ou `APP_USR-xxx` para produção) e seu **Access Token**.
3. No arquivo `js/services/mercadoPagoService.js`, configure a sua chave pública:
   ```javascript
   mercadoPagoService.setPublicKey('SUA_CHAVE_PUBLICA_AQUI');
   ```
4. Se desejar processar o pagamento no backend para esconder o Access Token:
   - Envie o payload retornado por `mercadoPagoService.createPreferencePayload(...)` para uma Cloud Function / API Node.js que chama `https://api.mercadopago.com/checkout/preferences`.
   - O retorno conterá o `init_point`, redirecionando o cliente para a tela de pagamento do Mercado Pago com segurança.

---

## 🛡️ Segurança e Boas Práticas

- **Sanitização e Validação**: Todos os campos de checkout e cadastro de produtos possuem validação antes da persistência.
- **Controle de Estoque Atômico**: Baixa automática de estoque assim que o pedido é aprovado (`productService.deductStock`).
- **Acessibilidade (a11y)**: Rótulos semânticos, atributos `aria-*` em modais e drawer, navegação por teclado e contraste de cores de acordo com diretrizes WCAG.
- **Mobile First**: Totalmente responsivo, adaptando grades e gavetas para celulares e tablets.

---

## 📝 Licença

Projeto desenvolvido para fins comerciais e profissionais. Todos os direitos reservados.
