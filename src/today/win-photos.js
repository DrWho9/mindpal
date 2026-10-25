/**
 * Prototype placeholder images on this device.
 * Database mindpal-photos, object store winPhotos, key is the win id.
 * The stored value is the bundled fake placeholder image plus the time it was stored.
 * It is not a user photo and not real private storage. Nothing is uploaded.
 * A plain load of the wins record does not open this database and does not delete blobs.
 */

export const WIN_PHOTO_DB = "mindpal-photos";
export const WIN_PHOTO_STORE = "winPhotos";
/** Reference stored on the win. The blob is in IndexedDB under the win id. */
export const WIN_PHOTO_REF = "idb";
/** BroadcastChannel name. Messages only ask other tabs to read again. */
export const WIN_PHOTO_CHANNEL = "mindpal-photos";

export const WIN_PHOTO_NOT_SAVED_LABEL = "Saved on this device for today. Placeholder image not saved.";
export const WIN_PHOTO_UNAVAILABLE_LABEL =
  "Saved on this device for today. Placeholder image storage is not available on this device, so this win uses the bundled placeholder.";
export const WIN_PHOTO_MISSING_LABEL =
  "This placeholder image is not on this device. Showing the bundled placeholder.";
export const WIN_PHOTO_ON_DEVICE_LABEL =
  "Prototype placeholder image stored on this device only. Not real private storage.";
export const WIN_PHOTO_CHECKING_LABEL = "Checking this placeholder image on this device.";
/**
 * A blob newer than this is still being saved by this tab or another tab.
 * Reset and an unreadable-record sweep leave it in place.
 * An ordinary save of a readable record does not use this window. It deletes only ids that record dropped.
 */
export const WIN_PHOTO_PENDING_MS = 15000;

/** Same bytes as win-placeholder.svg. The only image this prototype stores. */
export const WIN_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Prototype placeholder, not a private photo">
  <title>Prototype placeholder</title>
  <rect width="160" height="160" rx="18" fill="#e7f0e4"/>
  <circle cx="80" cy="58" r="22" fill="#f4c95d"/>
  <rect x="34" y="96" width="92" height="14" rx="7" fill="#2f5a3d"/>
  <rect x="46" y="118" width="68" height="10" rx="5" fill="#8aa583"/>
  <text x="80" y="148" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#2f3b2c">PLACEHOLDER</text>
</svg>
`;

const WIN_PHOTO_MAX_BYTES = 4096;

let winPhotoFactoryOverride;
let winPhotoOpened = null;
let winPhotoCachedDb = null;
let winPhotoGeneration = 0;

function winPhotoCurrentFactory() {
  if (winPhotoFactoryOverride !== undefined) return winPhotoFactoryOverride;
  try {
    return globalThis.indexedDB || null;
  } catch {
    return null;
  }
}

/**
 * Tests pass a fake IndexedDB factory. Null means photo storage is unavailable.
 * Undefined uses the browser database. Closes a cached connection so the next open is fresh.
 */
function winPhotoDropCached(db) {
  if (!db || winPhotoCachedDb !== db) return;
  winPhotoCachedDb = null;
  winPhotoOpened = null;
}

function winPhotoWatchConnection(db, generation) {
  if (!db || generation !== winPhotoGeneration) {
    if (db && typeof db.close === "function") {
      try {
        db.close();
      } catch {
        /* a replaced connection is already closed */
      }
    }
    return;
  }
  winPhotoCachedDb = db;
  db.onversionchange = () => {
    if (generation === winPhotoGeneration) winPhotoDropCached(db);
    try {
      db.close();
    } catch {
      /* the connection is already closed */
    }
  };
  db.onclose = () => {
    if (generation !== winPhotoGeneration) return;
    winPhotoDropCached(db);
  };
}

export function setWinPhotoDatabaseFactory(factory) {
  const previous = winPhotoOpened;
  winPhotoGeneration += 1;
  winPhotoFactoryOverride = factory;
  winPhotoOpened = null;
  winPhotoCachedDb = null;
  if (previous) {
    previous.then((db) => {
      if (db && typeof db.close === "function") {
        try {
          db.close();
        } catch {
          /* already closed */
        }
      }
    }).catch(() => {});
  }
}

export async function resetWinPhotoDatabase() {
  const factory = winPhotoCurrentFactory();
  const pending = winPhotoOpened;
  winPhotoGeneration += 1;
  winPhotoOpened = null;
  winPhotoCachedDb = null;
  if (pending) {
    const db = await pending.catch(() => null);
    if (db && typeof db.close === "function") {
      try {
        db.close();
      } catch {
        /* already closed */
      }
    }
  }
  if (!factory || typeof factory.deleteDatabase !== "function") return;
  await new Promise((resolve) => {
    let request;
    try {
      request = factory.deleteDatabase(WIN_PHOTO_DB);
    } catch {
      resolve();
      return;
    }
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function winPhotoRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("photo request failed"));
  });
}

function winPhotoTxDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("photo write failed"));
    tx.onabort = () => reject(tx.error || new Error("photo write aborted"));
  });
}

function winPhotoOpenDatabase(factory, generation) {
  return new Promise((resolve) => {
    let request;
    try {
      request = factory.open(WIN_PHOTO_DB, 1);
    } catch {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (db) => {
      if (settled) {
        if (db && typeof db.close === "function") {
          try {
            db.close();
          } catch {
            /* the late connection is already closed */
          }
        }
        return;
      }
      settled = true;
      if (db) winPhotoWatchConnection(db, generation);
      resolve(db || null);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WIN_PHOTO_STORE)) db.createObjectStore(WIN_PHOTO_STORE);
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(null);
    /* A held connection would otherwise leave Save waiting. Fall back instead. */
    request.onblocked = () => {
      setTimeout(() => finish(null), 500);
    };
  });
}

function winPhotoOpenDb() {
  const factory = winPhotoCurrentFactory();
  if (!factory || typeof factory.open !== "function") return Promise.resolve(null);
  if (!winPhotoOpened) {
    const generation = winPhotoGeneration;
    let pending;
    pending = winPhotoOpenDatabase(factory, generation).then(
      (db) => {
        if (winPhotoOpened === pending && (!db || generation !== winPhotoGeneration)) winPhotoOpened = null;
        if (generation !== winPhotoGeneration) return null;
        return db;
      },
      () => {
        if (winPhotoOpened === pending) winPhotoOpened = null;
        return null;
      },
    );
    winPhotoOpened = pending;
  }
  return winPhotoOpened;
}

export async function winPhotoDatabaseReady() {
  const db = await winPhotoOpenDb();
  return Boolean(db);
}

export function placeholderPhotoBlob() {
  return new Blob([WIN_PLACEHOLDER_SVG], { type: "image/svg+xml" });
}

function winPhotoBlobLike(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof Blob === "function" && value instanceof Blob) return true;
  return typeof value.text === "function" && typeof value.size === "number" && typeof value.type === "string";
}

/** True only for the synthetic placeholder image. Real photos are rejected. */
export async function isPlaceholderPhotoBlob(blob) {
  if (!winPhotoBlobLike(blob)) return false;
  if (blob.type !== "image/svg+xml") return false;
  if (blob.size <= 0 || blob.size > WIN_PHOTO_MAX_BYTES) return false;
  try {
    return (await blob.text()) === WIN_PLACEHOLDER_SVG;
  } catch {
    return false;
  }
}

function winPhotoStoredAt(createdAt) {
  const stamp = createdAt instanceof Date ? createdAt.getTime() : Number(createdAt);
  return Number.isFinite(stamp) ? stamp : Date.now();
}

function winPhotoBytes(value) {
  if (winPhotoBlobLike(value)) return value;
  if (value && typeof value === "object" && winPhotoBlobLike(value.blob)) return value.blob;
  return null;
}

/** A just-stored placeholder image. A raw blob with no time is not pending. */
function winPhotoPending(value, nowMs) {
  if (!value || typeof value !== "object" || winPhotoBlobLike(value)) return false;
  if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt)) return false;
  return nowMs - value.createdAt < WIN_PHOTO_PENDING_MS;
}

/**
 * Store the placeholder image under the win id, with the time it was stored.
 * createdAt defaults to now. Tests pass an older time when a sweep should be allowed to delete it.
 * reason "unavailable" means IndexedDB cannot be opened.
 * reason "put" means the write failed, including quota.
 * reason "blob" means the bytes were not the placeholder image.
 */
export async function putWinPhoto(id, blob, createdAt = Date.now()) {
  if (typeof id !== "string" || !id.trim()) return { ok: false, reason: "id" };
  if (!(await isPlaceholderPhotoBlob(blob))) return { ok: false, reason: "blob" };
  const db = await winPhotoOpenDb();
  if (!db) return { ok: false, reason: "unavailable" };
  let tx = null;
  try {
    tx = db.transaction(WIN_PHOTO_STORE, "readwrite");
    tx.objectStore(WIN_PHOTO_STORE).put({ blob, createdAt: winPhotoStoredAt(createdAt) }, id);
    await winPhotoTxDone(tx);
    return { ok: true };
  } catch {
    try {
      if (tx && tx.abort) tx.abort();
    } catch {
      /* the write already failed */
    }
    return { ok: false, reason: "put" };
  }
}

export async function readWinPhoto(id) {
  if (typeof id !== "string" || !id) return null;
  const db = await winPhotoOpenDb();
  if (!db) return null;
  try {
    const tx = db.transaction(WIN_PHOTO_STORE, "readonly");
    const value = await winPhotoRequest(tx.objectStore(WIN_PHOTO_STORE).get(id));
    await winPhotoTxDone(tx);
    const bytes = winPhotoBytes(value);
    if (!(await isPlaceholderPhotoBlob(bytes))) return null;
    return bytes;
  } catch {
    return null;
  }
}

async function winPhotoEntries(db) {
  const tx = db.transaction(WIN_PHOTO_STORE, "readonly");
  const store = tx.objectStore(WIN_PHOTO_STORE);
  if (typeof store.getAllKeys !== "function" || typeof store.getAll !== "function") {
    await winPhotoTxDone(tx);
    return null;
  }
  const keysRequest = store.getAllKeys();
  const valuesRequest = store.getAll();
  const keys = await winPhotoRequest(keysRequest);
  const values = await winPhotoRequest(valuesRequest);
  await winPhotoTxDone(tx);
  if (!Array.isArray(keys) || !Array.isArray(values) || keys.length !== values.length) return null;
  const entries = [];
  for (let i = 0; i < keys.length; i += 1) {
    if (typeof keys[i] === "string" && keys[i]) entries.push({ id: keys[i], value: values[i] });
  }
  return entries;
}

/**
 * Tell other tabs a placeholder image changed. Does not write the wins record.
 * Closing waits a tick so the message is not dropped.
 */
export function postWinPhotoChange(kind, id) {
  if (typeof BroadcastChannel !== "function") return false;
  let channel = null;
  try {
    channel = new BroadcastChannel(WIN_PHOTO_CHANNEL);
    channel.postMessage({
      source: WIN_PHOTO_CHANNEL,
      kind: typeof kind === "string" ? kind : "change",
      id: typeof id === "string" ? id : "",
    });
  } catch {
    return false;
  }
  const pending = channel;
  queueMicrotask(() => {
    try {
      pending.close();
    } catch {
      /* already closed */
    }
  });
  return true;
}

/** True when another tab stored or deleted a placeholder image. Does not write or post again. */
export function handleWinPhotoMessage(event) {
  const data = event && event.data;
  if (!data || data.source !== WIN_PHOTO_CHANNEL) return false;
  return true;
}

export async function deleteWinPhotos(ids, options = {}) {
  const notify = options.notify !== false;
  const unique = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && id))];
  if (unique.length === 0) return { deleted: [] };
  const db = await winPhotoOpenDb();
  if (!db) return { deleted: [], unavailable: true };
  try {
    const tx = db.transaction(WIN_PHOTO_STORE, "readwrite");
    const store = tx.objectStore(WIN_PHOTO_STORE);
    for (const id of unique) store.delete(id);
    await winPhotoTxDone(tx);
  } catch {
    return { deleted: [], failed: true };
  }
  if (notify) postWinPhotoChange("delete", unique[0] || "");
  return { deleted: unique };
}

/**
 * Ids that a sweep may delete.
 * keepIds stay. A placeholder image stored in the last WIN_PHOTO_PENDING_MS stays too,
 * so another tab's save can still write its reference.
 * A value with no stored time is old enough to delete.
 * Null means the list could not be read. The caller must not guess and must not clear the store.
 */
function winPhotoSweepIds(entries, keepIds, nowMs) {
  if (!Array.isArray(entries)) return null;
  const keep = new Set(Array.isArray(keepIds) ? keepIds : []);
  return entries
    .filter((entry) => !keep.has(entry.id) && !winPhotoPending(entry.value, nowMs))
    .map((entry) => entry.id);
}

/**
 * Delete placeholder images whose keys are not in keepIds.
 * Used after a save replaces an unreadable wins record, when the old ids cannot be read.
 * The caller passes ids from the record it just wrote. This does not run on load.
 * A placeholder image stored in the last WIN_PHOTO_PENDING_MS is left in place.
 * If the keys cannot be listed, nothing is deleted.
 */
export async function deleteUnreferencedWinPhotos(keepIds, nowMs = Date.now()) {
  const db = await winPhotoOpenDb();
  if (!db) return { deleted: [], unavailable: true };
  let entries;
  try {
    entries = await winPhotoEntries(db);
  } catch {
    return { deleted: [], failed: true };
  }
  const ids = winPhotoSweepIds(entries, keepIds, nowMs);
  if (!ids) return { deleted: [], failed: true };
  return deleteWinPhotos(ids);
}

/**
 * Reset path. The live wins record is already cleared, so stored images are unmatched.
 * A placeholder image stored in the last WIN_PHOTO_PENDING_MS is left in place.
 * This does not clear the whole store, because a clear would remove that fresh image.
 * If the keys cannot be listed, nothing is deleted.
 */
export async function deleteAllWinPhotos(nowMs = Date.now()) {
  return deleteUnreferencedWinPhotos([], nowMs);
}

export function winPhotoObjectUrl(blob) {
  if (!winPhotoBlobLike(blob) || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
  try {
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export function releaseWinPhotoUrl(url) {
  if (!url || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* already released */
  }
}
