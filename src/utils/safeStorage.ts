/**
 * ERROREN CHAT - Safe Storage Utility
 * Prevents DOMException / SecurityError from throwing in private browsing,
 * iframes, or restricted security contexts, preventing white-screen crashes.
 */

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryFallback = new MemoryStorage();

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__erroren_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

export const safeStorage = {
  getItem(key: string): string | null {
    if (hasLocalStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        console.warn(`[SafeStorage] Error reading key "${key}":`, err);
        return memoryFallback.getItem(key);
      }
    }
    return memoryFallback.getItem(key);
  },

  setItem(key: string, value: string): boolean {
    if (hasLocalStorage) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (err) {
        console.warn(`[SafeStorage] Error writing key "${key}":`, err);
        memoryFallback.setItem(key, value);
        return false;
      }
    }
    memoryFallback.setItem(key, value);
    return true;
  },

  removeItem(key: string): void {
    if (hasLocalStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.warn(`[SafeStorage] Error removing key "${key}":`, err);
      }
    }
    memoryFallback.removeItem(key);
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== undefined && parsed !== null ? parsed : fallback;
    } catch (err) {
      console.warn(`[SafeStorage] Error parsing JSON for key "${key}":`, err);
      return fallback;
    }
  },

  setJSON<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized);
    } catch (err) {
      console.warn(`[SafeStorage] Error serializing JSON for key "${key}":`, err);
      return false;
    }
  },

  clearAll(): void {
    if (hasLocalStorage) {
      try {
        window.localStorage.clear();
      } catch (err) {
        console.warn('[SafeStorage] Error clearing storage:', err);
      }
    }
    memoryFallback.clear();
  },
};
