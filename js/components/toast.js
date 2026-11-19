/**
 * Toast Component - Sistema de notificações visuais reativas
 * Suporta tipos: success, error, info, warning
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Exibe uma notificação toast
   * @param {string} message - Mensagem a ser exibida
   * @param {('success'|'error'|'info'|'warning')} type - Tipo do toast
   * @param {number} duration - Duração em ms (padrão 3500ms)
   */
  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || 'ℹ';

    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Fechar notificação');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => this.dismiss(toast);

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => {
      this.dismiss(toast);
    }, duration);

    toast.dataset.timer = timer;
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    if (toast.dataset.timer) clearTimeout(Number(toast.dataset.timer));

    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, { once: true });
  }

  success(msg, duration) { this.show(msg, 'success', duration); }
  error(msg, duration) { this.show(msg, 'error', duration); }
  warning(msg, duration) { this.show(msg, 'warning', duration); }
  info(msg, duration) { this.show(msg, 'info', duration); }
}

export const Toast = new ToastManager();
