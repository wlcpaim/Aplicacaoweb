/**
 * Camada de Persistência Segura (LocalStorage + Fallback em memória)
 */
class StorageService {
  constructor() {
    this.memoryFallback = new Map();
    this.isLocalStorageAvailable = this._checkAvailability();
  }

  _checkAvailability() {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('[StorageService] LocalStorage indisponível, usando fallback em memória.', e);
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      if (this.isLocalStorageAvailable) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      return this.memoryFallback.has(key) ? this.memoryFallback.get(key) : defaultValue;
    } catch (error) {
      console.error(`[StorageService] Erro ao recuperar chave "${key}":`, error);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (this.isLocalStorageAvailable) {
        window.localStorage.setItem(key, serialized);
      }
      this.memoryFallback.set(key, value);
      return true;
    } catch (error) {
      console.error(`[StorageService] Erro ao salvar chave "${key}":`, error);
      return false;
    }
  }

  remove(key) {
    try {
      if (this.isLocalStorageAvailable) {
        window.localStorage.removeItem(key);
      }
      this.memoryFallback.delete(key);
      return true;
    } catch (error) {
      console.error(`[StorageService] Erro ao remover chave "${key}":`, error);
      return false;
    }
  }
}

export const storage = new StorageService();
