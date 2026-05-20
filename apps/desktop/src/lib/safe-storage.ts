export type StorageUsage = {
  usedBytes: number;
  itemCount: number;
};

function estimateStorageUsage(storage: Storage): StorageUsage {
  let usedBytes = 0;
  let itemCount = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) {
      const value = storage.getItem(key);
      usedBytes += key.length * 2 + (value?.length ?? 0) * 2;
      itemCount++;
    }
  }
  return { usedBytes, itemCount };
}

export type SafeStorage = Storage & {
  getStorageUsage: () => StorageUsage;
};

export function createSafeLocalStorage(): SafeStorage {
  return {
    clear: () => localStorage.clear(),
    getItem: (key: string) => localStorage.getItem(key),
    key: (index: number) => localStorage.key(index),
    get length() {
      return localStorage.length;
    },
    removeItem: (key: string) => localStorage.removeItem(key),
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value);
    },
    getStorageUsage: () => estimateStorageUsage(localStorage),
  };
}
