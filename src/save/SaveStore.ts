import type { GameState } from '../sim/core/state';
import { migrate } from './migrations';

/**
 * Prod.io keeps exactly one save per playthrough. It lives in IndexedDB, with
 * a synchronous localStorage mirror written when the page closes (IndexedDB
 * writes can be cut off during unload). On load the newer of the two wins.
 */
export interface SaveRecord {
  savedAt: number;
  state: GameState;
}

const DB_NAME = 'prod-io';
const STORE = 'saves';
const KEY = 'autosave';
const MIRROR_KEY = 'prod-io:autosave';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const hasIdb = () => typeof indexedDB !== 'undefined';
const hasLocalStorage = () => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

function snapshot(state: GameState): SaveRecord {
  return { savedAt: Date.now(), state: structuredClone(state) };
}

export async function writeSave(state: GameState): Promise<void> {
  const record = snapshot(state);
  if (hasIdb()) await idbRequest('readwrite', (s) => s.put(record, KEY));
  else writeMirror(state);
}

/** Synchronous write for page unload. */
export function writeMirror(state: GameState): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(snapshot(state)));
  } catch {
    // Storage full or blocked: the IndexedDB copy from the last day still exists.
  }
}

export async function readSave(): Promise<SaveRecord | null> {
  const candidates: SaveRecord[] = [];
  if (hasIdb()) {
    const fromIdb = await idbRequest<SaveRecord | undefined>('readonly', (s) => s.get(KEY));
    if (fromIdb) candidates.push(fromIdb);
  }
  if (hasLocalStorage()) {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (raw) {
      try {
        candidates.push(JSON.parse(raw) as SaveRecord);
      } catch {
        // A damaged mirror is ignored; IndexedDB is the primary copy.
      }
    }
  }
  if (candidates.length === 0) return null;
  const newest = candidates.reduce((a, b) => (b.savedAt > a.savedAt ? b : a));
  return { savedAt: newest.savedAt, state: migrate(newest.state) };
}

export async function deleteSave(): Promise<void> {
  if (hasIdb()) await idbRequest('readwrite', (s) => s.delete(KEY));
  if (hasLocalStorage()) localStorage.removeItem(MIRROR_KEY);
}
