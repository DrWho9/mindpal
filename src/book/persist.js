/**
 * On-device book library.
 * IndexedDB name mindpal-book-idb is the old reader store (b4f58eb).
 * Version 2 keeps the legacy `pdfs/current` row and adds a multi-book `books` store.
 * Position, notes, and bookmarks stay in localStorage under the old keys.
 */

export const BOOK_IDB = "mindpal-book-idb";
export const BOOK_STORE = "books";
export const LEGACY_PDF_STORE = "pdfs";
export const LEGACY_PDF_KEY = "current";
export const BOOK_POS_KEY = "mindpal-book-pos-v2";
export const BOOK_NOTES_KEY = "mindpal-book-notes-v1";
export const BOOK_BM_KEY = "mindpal-book-bookmark-v1";

export function bookIdForName(name) {
  const slug = String(name || "book")
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return slug || "book";
}

function cloneBuffer(buffer) {
  if (!buffer) return buffer;
  if (typeof buffer.slice === "function") return buffer.slice(0);
  return buffer;
}

function publicMeta(row) {
  return {
    id: row.id,
    name: row.name || "Saved PDF",
    savedAt: row.savedAt || 0,
    kind: row.kind || "pdf",
    bytes: row.buffer?.byteLength || row.bytes || 0,
  };
}

function cloneRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    savedAt: row.savedAt || 0,
    kind: row.kind || "pdf",
    bytes: row.buffer?.byteLength || row.bytes || 0,
    buffer: cloneBuffer(row.buffer),
  };
}

export function createMemoryBookLibrary(initial = []) {
  const rows = new Map();
  for (const row of initial) {
    if (row?.id) rows.set(row.id, cloneRow(row));
  }
  return {
    async listBooks() {
      return [...rows.values()]
        .map(publicMeta)
        .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    },
    async getBook(id) {
      return cloneRow(rows.get(id));
    },
    async putBook(book) {
      const id = book?.id || bookIdForName(book?.name);
      const row = cloneRow({
        id,
        name: book?.name || "Saved PDF",
        buffer: book?.buffer,
        savedAt: book?.savedAt || Date.now(),
        kind: book?.kind || "pdf",
      });
      rows.set(id, row);
      return publicMeta(row);
    },
    async deleteBook(id) {
      rows.delete(id);
    },
  };
}

function requestResult(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Device storage request failed"));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Device storage write failed"));
    tx.onabort = () => reject(tx.error || new Error("Device storage write aborted"));
  });
}

export function createIdbBookLibrary(factory = globalThis.indexedDB) {
  if (!factory || typeof factory.open !== "function") return createMemoryBookLibrary();
  const opened = new Promise((resolve, reject) => {
    const req = factory.open(BOOK_IDB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_PDF_STORE)) db.createObjectStore(LEGACY_PDF_STORE);
      if (!db.objectStoreNames.contains(BOOK_STORE)) db.createObjectStore(BOOK_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Could not open device book storage"));
  });

  async function migrate(db) {
    if (!db.objectStoreNames.contains(LEGACY_PDF_STORE)) return;
    const legacy = await requestResult(
      db.transaction(LEGACY_PDF_STORE, "readonly").objectStore(LEGACY_PDF_STORE).get(LEGACY_PDF_KEY),
    );
    if (!legacy?.buffer) return;
    const id = bookIdForName(legacy.name || "Saved PDF");
    const existing = await requestResult(
      db.transaction(BOOK_STORE, "readonly").objectStore(BOOK_STORE).get(id),
    );
    if (!existing) {
      const tx = db.transaction(BOOK_STORE, "readwrite");
      tx.objectStore(BOOK_STORE).put(
        {
          id,
          name: legacy.name || "Saved PDF",
          buffer: legacy.buffer,
          savedAt: legacy.savedAt || Date.now(),
          kind: "pdf",
        },
        id,
      );
      await transactionDone(tx);
    }
    const clear = db.transaction(LEGACY_PDF_STORE, "readwrite");
    clear.objectStore(LEGACY_PDF_STORE).delete(LEGACY_PDF_KEY);
    await transactionDone(clear);
  }

  return {
    async listBooks() {
      const db = await opened;
      await migrate(db);
      const rows = await requestResult(db.transaction(BOOK_STORE, "readonly").objectStore(BOOK_STORE).getAll());
      return (rows || []).map(publicMeta).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    },
    async getBook(id) {
      const db = await opened;
      const row = await requestResult(db.transaction(BOOK_STORE, "readonly").objectStore(BOOK_STORE).get(id));
      return cloneRow(row);
    },
    async putBook(book) {
      const db = await opened;
      const id = book?.id || bookIdForName(book?.name);
      const row = {
        id,
        name: book?.name || "Saved PDF",
        buffer: cloneBuffer(book?.buffer),
        savedAt: book?.savedAt || Date.now(),
        kind: book?.kind || "pdf",
      };
      const tx = db.transaction(BOOK_STORE, "readwrite");
      tx.objectStore(BOOK_STORE).put(row, id);
      await transactionDone(tx);
      return publicMeta(row);
    },
    async deleteBook(id) {
      const db = await opened;
      const tx = db.transaction(BOOK_STORE, "readwrite");
      tx.objectStore(BOOK_STORE).delete(id);
      await transactionDone(tx);
    },
  };
}

let sharedLibrary = null;

function sharedBookLibrary() {
  if (!sharedLibrary) sharedLibrary = createIdbBookLibrary();
  return sharedLibrary;
}

export async function listBooks() {
  return sharedBookLibrary().listBooks();
}

export async function getBook(id) {
  return sharedBookLibrary().getBook(id);
}

export async function putBook(book) {
  return sharedBookLibrary().putBook(book);
}

export async function deleteBook(id) {
  return sharedBookLibrary().deleteBook(id);
}

function readJson(storage, key) {
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export function readPositions(storage) {
  const empty = { books: {}, lastId: "" };
  const raw = readJson(storage, BOOK_POS_KEY);
  if (!raw || typeof raw !== "object") return empty;
  if (raw.books && typeof raw.books === "object") {
    return {
      books: raw.books,
      lastId: typeof raw.lastId === "string" ? raw.lastId : "",
    };
  }
  if (typeof raw.name === "string" && Number.isFinite(raw.chunkIndex)) {
    const id = bookIdForName(raw.name);
    return {
      books: { [id]: { chunkIndex: raw.chunkIndex | 0, name: raw.name } },
      lastId: id,
    };
  }
  return empty;
}

export function positionFor(storage, id) {
  const row = readPositions(storage).books[id];
  return row && Number.isFinite(row.chunkIndex) ? row.chunkIndex | 0 : 0;
}

export function lastOpenId(storage) {
  return readPositions(storage).lastId || "";
}

export function rememberOpen(storage, id, name, chunkIndex) {
  const pos = readPositions(storage);
  pos.books[id] = { chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex | 0 : 0, name: name || "" };
  pos.lastId = id;
  writeJson(storage, BOOK_POS_KEY, pos);
  return pos;
}

export function clearLastOpen(storage) {
  const pos = readPositions(storage);
  pos.lastId = "";
  writeJson(storage, BOOK_POS_KEY, pos);
  return pos;
}

export function noteFor(storage, id, name) {
  const raw = readJson(storage, BOOK_NOTES_KEY);
  if (!raw || typeof raw !== "object") return "";
  if (raw.byId && typeof raw.byId[id] === "string") return raw.byId[id];
  if (name && typeof raw[name] === "string") return raw[name];
  if (name && raw.byName && typeof raw.byName[name] === "string") return raw.byName[name];
  return "";
}

export function writeNote(storage, id, name, text) {
  const raw = readJson(storage, BOOK_NOTES_KEY);
  const map = raw && typeof raw === "object" ? raw : {};
  const byId = map.byId && typeof map.byId === "object" ? map.byId : {};
  const byName = map.byName && typeof map.byName === "object" ? map.byName : {};
  byId[id] = String(text || "");
  if (name) byName[name] = String(text || "");
  writeJson(storage, BOOK_NOTES_KEY, { ...map, byId, byName });
}

export function readBookmark(storage, id) {
  const raw = readJson(storage, BOOK_BM_KEY);
  if (!raw || typeof raw !== "object") return null;
  const books = raw.books && typeof raw.books === "object" ? raw.books : raw;
  const value = books[id];
  return Number.isFinite(value) ? value | 0 : null;
}

export function writeBookmark(storage, id, chunkIndex) {
  const raw = readJson(storage, BOOK_BM_KEY);
  const books = raw?.books && typeof raw.books === "object" ? { ...raw.books } : {};
  if (chunkIndex == null) delete books[id];
  else books[id] = chunkIndex | 0;
  writeJson(storage, BOOK_BM_KEY, { books });
  return books[id] ?? null;
}
