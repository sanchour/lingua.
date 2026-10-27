// Canvases and the library live in this browser's IndexedDB (per site: a canvas made inside one app stays with that
// app; .sandesign files carry it anywhere else).
import type { Doc, SNode } from './model';

export interface LibraryItem {
  id: string;
  kind: 'template' | 'picture';
  name: string;
  created: number;
  nodes: SNode[];
  assets: Record<string, string>;
}

export interface DocSummary {
  id: string;
  title: string;
  updated: number;
  count: number;
}

let opening: Promise<IDBDatabase> | null = null;

const db = () =>
  (opening ??= new Promise((res, rej) => {
    const req = indexedDB.open('sandesigning', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('docs', { keyPath: 'id' });
      req.result.createObjectStore('library', { keyPath: 'id' });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));

const run = async <T>(store: 'docs' | 'library', mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
  const d = await db();
  return new Promise((res, rej) => {
    const req = f(d.transaction(store, mode).objectStore(store));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
};

export const saveDoc = (doc: Doc) => run<void>('docs', 'readwrite', (s) => s.put(doc));
export const loadDoc = (id: string) => run<Doc | undefined>('docs', 'readonly', (s) => s.get(id));
export const deleteDoc = (id: string) => run<void>('docs', 'readwrite', (s) => s.delete(id));
export const listDocs = async (): Promise<DocSummary[]> =>
  (await run<Doc[]>('docs', 'readonly', (s) => s.getAll())).map((d) => ({ id: d.id, title: d.title, updated: d.updated, count: d.nodes.length })).sort((a, b) => b.updated - a.updated);

export const saveItem = (item: LibraryItem) => run<void>('library', 'readwrite', (s) => s.put(item));
export const deleteItem = (id: string) => run<void>('library', 'readwrite', (s) => s.delete(id));
export const listItems = async () => (await run<LibraryItem[]>('library', 'readonly', (s) => s.getAll())).sort((a, b) => b.created - a.created);

const LAST = 'sandesigning:last';
export const lastDocId = () => {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
};
export const setLastDocId = (id: string) => {
  try {
    localStorage.setItem(LAST, id);
  } catch {
    // Private windows may refuse; the canvas still works.
  }
};
