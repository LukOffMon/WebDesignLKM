import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'micarpintero';
const DB_VERSION = 1;
export const STORE_STATE = 'state';
export const STORE_FILES = 'files';
type StoreName = typeof STORE_STATE | typeof STORE_FILES;

let dbPromise: Promise<IDBDatabase> | null = null;

const isIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined';

const openDatabase = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) db.createObjectStore(STORE_STATE);
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB está bloqueada por otra pestaña'));
  });
  // Allow a retry on the next call if opening failed.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
};

const runRequest = async <T>(store: StoreName, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Operación de IndexedDB fallida'));
  });
};

export const idbGet = async <T>(store: StoreName, key: string): Promise<T | undefined> => {
  if (!isIndexedDbAvailable()) return undefined;
  const value = await runRequest<unknown>(store, 'readonly', (s) => s.get(key));
  return value === undefined ? undefined : (value as T);
};

export const idbSet = async (store: StoreName, key: string, value: unknown): Promise<void> => {
  if (!isIndexedDbAvailable()) return;
  await runRequest(store, 'readwrite', (s) => s.put(value, key));
};

export const idbDelete = async (store: StoreName, key: string): Promise<void> => {
  if (!isIndexedDbAvailable()) return;
  await runRequest(store, 'readwrite', (s) => s.delete(key));
};

/** Zustand `StateStorage` backed by IndexedDB, with an in-memory fallback. */
export const createIndexedDbStorage = (): StateStorage => {
  const memory = new Map<string, string>();
  return {
    getItem: async (name) => {
      try {
        const value = await idbGet<string>(STORE_STATE, name);
        return value ?? memory.get(name) ?? null;
      } catch {
        return memory.get(name) ?? null;
      }
    },
    setItem: async (name, value) => {
      memory.set(name, value);
      try {
        await idbSet(STORE_STATE, name, value);
      } catch {
        // Private mode or quota exceeded: keep the in-memory copy for this session.
      }
    },
    removeItem: async (name) => {
      memory.delete(name);
      try {
        await idbDelete(STORE_STATE, name);
      } catch {
        // Nothing persisted to remove.
      }
    },
  };
};

/** Stores raw bytes (uploaded PDFs) so pages can be re-rendered after a reload. */
export const saveFile = (key: string, data: ArrayBuffer): Promise<void> => idbSet(STORE_FILES, key, data);

export const loadFile = async (key: string): Promise<ArrayBuffer | undefined> => {
  const value = await idbGet<unknown>(STORE_FILES, key);
  return value instanceof ArrayBuffer ? value : undefined;
};

export const deleteFile = (key: string): Promise<void> => idbDelete(STORE_FILES, key);
