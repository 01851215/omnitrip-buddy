/**
 * Platform-agnostic storage adapter.
 *
 * Web:    setStorageAdapter is NOT called → falls back to localStorage (default below)
 * Mobile: call setStorageAdapter(AsyncStorage) in apps/mobile/src/setup.ts before anything else
 */

export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

// Default: localStorage (works in web, throws gracefully in RN if not replaced)
const localStorageFallback: StorageAdapter = {
  getItem: (k) =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null,
  setItem: (k, v) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
  },
  removeItem: (k) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
  },
};

let _adapter: StorageAdapter = localStorageFallback;

export function setStorageAdapter(adapter: StorageAdapter): void {
  _adapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  return _adapter;
}
