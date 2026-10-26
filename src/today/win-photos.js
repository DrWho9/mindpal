/**
 * Prototype sample images on this device.
 * Database mindpal-photos, object store winPhotos, key is the win id.
 * The stored value is one bundled sample, or the bundled placeholder, plus the time it was stored.
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
  "This image is not on this device. Showing the bundled placeholder.";
export const WIN_PHOTO_ON_DEVICE_LABEL =
  "Prototype placeholder image stored on this device only. Not real private storage.";
export const WIN_SAMPLE_ON_DEVICE_LABEL =
  "Prototype sample image stored on this device only. Not real private storage.";
export const WIN_SAMPLE_PROTOTYPE_LABEL =
  "Prototype sample image, not real private storage.";
export const WIN_PHOTO_CHECKING_LABEL = "Checking this image on this device.";
/**
 * A blob newer than this is still being saved by this tab or another tab.
 * Reset and an unreadable-record sweep leave it in place.
 * An ordinary save of a readable record does not use this window. It deletes only ids that record dropped.
 */
export const WIN_PHOTO_PENDING_MS = 15000;
/**
 * Clock skew. A stored time further ahead than this is not a save in progress.
 * A stamp inside this skew can still be pending for WIN_PHOTO_PENDING_MS.
 */
export const WIN_PHOTO_FUTURE_SKEW_MS = 2000;
/** A photo database request that never settles fails after this long. */
export const WIN_PHOTO_REQUEST_MS = 10000;

let winPhotoRequestMs = WIN_PHOTO_REQUEST_MS;

export function setWinPhotoRequestMs(ms) {
  const next = Number(ms);
  winPhotoRequestMs = Number.isFinite(next) && next >= 0 ? next : WIN_PHOTO_REQUEST_MS;
}

export function winPhotoRequestLimit() {
  return winPhotoRequestMs;
}

/** Same bytes as win-placeholder.svg. One of the images this prototype stores. */
export const WIN_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Prototype placeholder, not a private photo">
  <title>Prototype placeholder</title>
  <rect width="160" height="160" rx="18" fill="#e7f0e4"/>
  <circle cx="80" cy="58" r="22" fill="#f4c95d"/>
  <rect x="34" y="96" width="92" height="14" rx="7" fill="#2f5a3d"/>
  <rect x="46" y="118" width="68" height="10" rx="5" fill="#8aa583"/>
  <text x="80" y="148" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#2f3b2c">PLACEHOLDER</text>
</svg>
`;

/** Same bytes as win-sample-1.svg. Green squares. No people. */
export const WIN_SAMPLE_1_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Sample image, green squares">
  <title>Sample image 1</title>
  <rect width="160" height="160" rx="18" fill="#e7f0e4"/>
  <rect x="28" y="32" width="46" height="46" rx="6" fill="#2f5a3d"/>
  <rect x="86" y="32" width="46" height="46" rx="6" fill="#8aa583"/>
  <rect x="28" y="88" width="46" height="28" rx="6" fill="#8aa583"/>
  <rect x="86" y="88" width="46" height="28" rx="6" fill="#2f5a3d"/>
  <text x="80" y="142" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#2f3b2c">Sample</text>
</svg>
`;

/** Same bytes as win-sample-2.svg. Blue circles. No people. */
export const WIN_SAMPLE_2_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Sample image, blue circles">
  <title>Sample image 2</title>
  <rect width="160" height="160" rx="18" fill="#e7eef6"/>
  <circle cx="54" cy="62" r="24" fill="#2a4d6e"/>
  <circle cx="108" cy="58" r="16" fill="#7ea0c4"/>
  <circle cx="86" cy="102" r="18" fill="#3d6f99"/>
  <text x="80" y="146" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1e3348">Sample</text>
</svg>
`;

/** Same bytes as win-sample-3.svg. Amber triangles. No people. */
export const WIN_SAMPLE_3_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Sample image, amber triangles">
  <title>Sample image 3</title>
  <rect width="160" height="160" rx="18" fill="#f8f1e4"/>
  <polygon points="40,100 70,44 100,100" fill="#c47b2b"/>
  <polygon points="78,108 108,62 138,108" fill="#e2b56a"/>
  <text x="80" y="142" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#5c5346">Sample</text>
</svg>
`;

/** Same bytes as win-sample-4.svg. Teal bars. No people. */
export const WIN_SAMPLE_4_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Sample image, teal bars">
  <title>Sample image 4</title>
  <rect width="160" height="160" rx="18" fill="#e5f3f1"/>
  <rect x="28" y="40" width="104" height="16" rx="6" fill="#1f6f6a"/>
  <rect x="28" y="68" width="76" height="16" rx="6" fill="#3d9a94"/>
  <rect x="28" y="96" width="52" height="16" rx="6" fill="#8ec9c4"/>
  <text x="80" y="142" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1e3348">Sample</text>
</svg>
`;

export const WIN_SAMPLE_PLACEHOLDER = "placeholder";
export const WIN_SAMPLE_NONE = "none";

export const WIN_SAMPLES = [
  {
    id: "sample-1",
    label: "Sample image 1: green squares",
    file: "win-sample-1.svg",
    path: "/mindpal/win-sample-1.svg",
    svg: WIN_SAMPLE_1_SVG,
  },
  {
    id: "sample-2",
    label: "Sample image 2: blue circles",
    file: "win-sample-2.svg",
    path: "/mindpal/win-sample-2.svg",
    svg: WIN_SAMPLE_2_SVG,
  },
  {
    id: "sample-3",
    label: "Sample image 3: amber triangles",
    file: "win-sample-3.svg",
    path: "/mindpal/win-sample-3.svg",
    svg: WIN_SAMPLE_3_SVG,
  },
  {
    id: "sample-4",
    label: "Sample image 4: teal bars",
    file: "win-sample-4.svg",
    path: "/mindpal/win-sample-4.svg",
    svg: WIN_SAMPLE_4_SVG,
  },
];

/** Radios for a new win and for a win already on the card. Placeholder stays first. */
export const WIN_SAMPLE_CHOICES = [
  { id: WIN_SAMPLE_PLACEHOLDER, label: "Placeholder image", thumb: "/mindpal/win-placeholder.svg" },
  ...WIN_SAMPLES.map((item) => ({ id: item.id, label: item.label, thumb: item.path })),
  { id: WIN_SAMPLE_NONE, label: "No image", thumb: "" },
];

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

function winPhotoGaveUp(error) {
  if (!error) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const message = typeof error.message === "string" ? error.message : "";
  return (
    message === "photo request timed out"
    || message === "photo write aborted"
    || message === "The photo request was aborted."
  );
}

function winPhotoAbortError() {
  try {
    return new DOMException("The photo request was aborted.", "AbortError");
  } catch {
    const error = new Error("The photo request was aborted.");
    error.name = "AbortError";
    return error;
  }
}

function winPhotoListen(signal, onAbort) {
  if (!signal || typeof signal.addEventListener !== "function") return () => {};
  if (signal.aborted) {
    onAbort();
    return () => {};
  }
  signal.addEventListener("abort", onAbort);
  return () => {
    try {
      signal.removeEventListener("abort", onAbort);
    } catch {
      /* the request is already finished */
    }
  };
}

/**
 * Resolves, rejects, or gives up after winPhotoRequestLimit.
 * A late success or error is ignored so it cannot settle twice.
 */
function winPhotoRequest(request, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let stopListen = () => {};
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      stopListen();
      fn(value);
    };
    const onAbort = () => finish(reject, winPhotoAbortError());
    timer = setTimeout(() => finish(reject, new Error("photo request timed out")), winPhotoRequestLimit());
    stopListen = winPhotoListen(signal, onAbort);
    if (settled && timer) clearTimeout(timer);
    if (settled) return;
    try {
      request.onsuccess = () => finish(resolve, request.result);
      request.onerror = () => finish(reject, request.error || new Error("photo request failed"));
    } catch (error) {
      finish(reject, error);
    }
  });
}

/**
 * Waits for the transaction. On timeout or abort, the transaction is aborted
 * so a late complete cannot store the blob after the caller has moved on.
 */
function winPhotoTxDone(tx, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let stopListen = () => {};
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      stopListen();
      fn(value);
    };
    const giveUp = (error) => {
      try {
        if (tx && typeof tx.abort === "function") tx.abort();
      } catch {
        /* the write is already finished */
      }
      finish(reject, error);
    };
    const onAbort = () => giveUp(winPhotoAbortError());
    timer = setTimeout(() => giveUp(new Error("photo request timed out")), winPhotoRequestLimit());
    stopListen = winPhotoListen(signal, onAbort);
    if (settled && timer) clearTimeout(timer);
    if (settled) return;
    tx.oncomplete = () => finish(resolve);
    tx.onerror = () => finish(reject, tx.error || new Error("photo write failed"));
    tx.onabort = () => finish(reject, tx.error || new Error("photo write aborted"));
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
    let timer = null;
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
      if (timer) clearTimeout(timer);
      if (db) winPhotoWatchConnection(db, generation);
      resolve(db || null);
    };
    timer = setTimeout(() => finish(null), winPhotoRequestLimit());
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

export async function winPhotoDatabaseReady(signal) {
  if (signal && signal.aborted) return false;
  const opening = winPhotoOpenDb();
  if (!signal || typeof signal.addEventListener !== "function") return Boolean(await opening);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        signal.removeEventListener("abort", onAbort);
      } catch {
        /* the open is already finished */
      }
      resolve(Boolean(value) && !signal.aborted);
    };
    const onAbort = () => finish(null);
    if (signal.aborted) {
      finish(null);
      return;
    }
    signal.addEventListener("abort", onAbort);
    opening.then(finish, () => finish(null));
  });
}

export function placeholderPhotoBlob() {
  return new Blob([WIN_PLACEHOLDER_SVG], { type: "image/svg+xml" });
}

/** Blob for a bundled sample or the placeholder. Null when the id is not on the list. */
export function winSampleBlob(choice) {
  if (choice === WIN_SAMPLE_PLACEHOLDER) return placeholderPhotoBlob();
  const sample = WIN_SAMPLES.find((item) => item.id === choice);
  if (!sample) return null;
  return new Blob([sample.svg], { type: "image/svg+xml" });
}

/** Bundled path for a choice. Empty when the id is not on the list. */
export function winSamplePath(choice) {
  if (choice === WIN_SAMPLE_PLACEHOLDER) return "/mindpal/win-placeholder.svg";
  const sample = WIN_SAMPLES.find((item) => item.id === choice);
  return sample ? sample.path : "";
}

/** Choice id for a stored path. Empty for a missing path, the idb reference, or anything else. */
export function winPhotoChoiceForPath(photo) {
  if (typeof photo !== "string" || !photo) return "";
  if (photo === "/mindpal/win-placeholder.svg") return WIN_SAMPLE_PLACEHOLDER;
  const sample = WIN_SAMPLES.find((item) => item.path === photo);
  return sample ? sample.id : "";
}

function winPhotoBlobLike(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof Blob === "function" && value instanceof Blob) return true;
  return typeof value.text === "function" && typeof value.size === "number" && typeof value.type === "string";
}

const winPhotoEncoder = new TextEncoder();

function winPhotoBytesEqual(left, right) {
  if (!left || !right || left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

/**
 * Exact file bytes only. A decoded string is not enough: a leading BOM is stripped
 * by text decoding and would otherwise match a bundled sample.
 */
async function winPhotoRawBytes(blob) {
  if (!winPhotoBlobLike(blob)) return null;
  if (blob.type !== "image/svg+xml") return null;
  if (typeof blob.size !== "number" || blob.size <= 0 || blob.size > WIN_PHOTO_MAX_BYTES) return null;
  if (typeof blob.arrayBuffer !== "function") return null;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength !== blob.size) return null;
    if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return null;
    return bytes;
  } catch {
    return null;
  }
}

function winPhotoChoiceIdFromBytes(bytes) {
  if (!bytes) return "";
  if (winPhotoBytesEqual(bytes, winPhotoEncoder.encode(WIN_PLACEHOLDER_SVG))) return WIN_SAMPLE_PLACEHOLDER;
  const sample = WIN_SAMPLES.find((item) => winPhotoBytesEqual(bytes, winPhotoEncoder.encode(item.svg)));
  return sample ? sample.id : "";
}

/**
 * Id of an allowlisted image, or "" when the bytes are not an exact bundled sample
 * or the exact placeholder. Real photos are rejected. A leading BOM is rejected.
 */
export async function winPhotoAllowlistId(blob) {
  return winPhotoChoiceIdFromBytes(await winPhotoRawBytes(blob));
}

/** True for the placeholder or one of the four bundled samples. Same list as put and read. */
export async function isAllowedWinPhotoBlob(blob) {
  return (await winPhotoAllowlistId(blob)) !== "";
}

/** Choice id for a blob already known to be an image. Empty when it is not allowlisted. */
export async function winPhotoChoiceFromBlob(blob) {
  return winPhotoAllowlistId(blob);
}

/** True only for the synthetic placeholder image. Real photos and samples are rejected. */
export async function isPlaceholderPhotoBlob(blob) {
  return (await winPhotoAllowlistId(blob)) === WIN_SAMPLE_PLACEHOLDER;
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

/**
 * A just-stored placeholder image. A raw blob with no time is not pending.
 * A time more than WIN_PHOTO_FUTURE_SKEW_MS ahead of now is not pending.
 * That cap stops a far future stamp from staying pending until the clock catches up.
 */
function winPhotoPending(value, nowMs) {
  if (!value || typeof value !== "object" || winPhotoBlobLike(value)) return false;
  if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt)) return false;
  const age = nowMs - value.createdAt;
  if (age < -WIN_PHOTO_FUTURE_SKEW_MS) return false;
  return age < WIN_PHOTO_PENDING_MS;
}

/**
 * Store the placeholder image under the win id, with the time it was stored.
 * createdAt defaults to now. Tests pass an older time when a sweep should be allowed to delete it.
 * reason "unavailable" means IndexedDB cannot be opened.
 * reason "put" means the write failed, including quota.
 * reason "blob" means the bytes were not an allowlisted sample or the placeholder.
 * options.previousBlob, when set, is put back if this write times out, so a change
 * does not delete the image that was already there.
 * options.leaveOnTimeout skips that cleanup. A restore uses it so a second timeout
 * does not delete the image it just tried to put back.
 */
export async function putWinPhoto(id, blob, createdAt = Date.now(), options = {}) {
  const signal = options && typeof options === "object" ? options.signal : undefined;
  const previousBlob = options && options.previousBlob;
  const leaveOnTimeout = Boolean(options && options.leaveOnTimeout);
  if (typeof id !== "string" || !id.trim()) return { ok: false, reason: "id" };
  if (signal && signal.aborted) return { ok: false, reason: "timeout" };
  if (!(await isAllowedWinPhotoBlob(blob))) return { ok: false, reason: "blob" };
  if (signal && signal.aborted) return { ok: false, reason: "timeout" };
  const db = await winPhotoOpenDb();
  if (!db) return { ok: false, reason: "unavailable" };
  if (signal && signal.aborted) return { ok: false, reason: "timeout" };
  let tx = null;
  try {
    tx = db.transaction(WIN_PHOTO_STORE, "readwrite");
    tx.objectStore(WIN_PHOTO_STORE).put({ blob, createdAt: winPhotoStoredAt(createdAt) }, id);
    await winPhotoTxDone(tx, signal);
    return { ok: true };
  } catch (error) {
    try {
      if (tx && tx.abort) tx.abort();
    } catch {
      /* the write already failed */
    }
    if (winPhotoGaveUp(error) || (signal && signal.aborted)) {
      /*
       * Abort and commit can overlap. A blob that lands after the timeout
       * would be an orphan while the card says the image was not saved.
       * Start the delete and do not wait. A hung delete must not use up the
       * save grace, or the win text would be dropped. If a late complete
       * arrives after that, delete again.
       * A change passes previousBlob so the image already stored is put back
       * instead of being deleted. leaveOnTimeout is the restore itself.
       * Putting that image back after a timeout relies on IndexedDB running
       * write transactions on the same store in order. The restore transaction
       * is opened after the timed out one, so it is applied after that write
       * and a late commit does not replace it.
       */
      if (!leaveOnTimeout) {
        const cleanup = previousBlob
          ? () => {
            putWinPhoto(id, previousBlob, Date.now(), { leaveOnTimeout: true }).catch(() => {});
          }
          : () => {
            deleteWinPhotos([id], { notify: false }).catch(() => {});
          };
        if (tx) tx.oncomplete = cleanup;
        cleanup();
      }
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "put" };
  }
}

/**
 * ok: an allowlisted blob.
 * missing: no row, or a row that is not an allowlisted image.
 * unavailable: the photo database cannot be opened.
 * error: the read failed. Callers must not treat that as an empty slot.
 */
export async function readWinPhotoRecord(id) {
  if (typeof id !== "string" || !id) return { status: "missing", blob: null };
  const db = await winPhotoOpenDb();
  if (!db) return { status: "unavailable", blob: null };
  try {
    const tx = db.transaction(WIN_PHOTO_STORE, "readonly");
    const value = await winPhotoRequest(tx.objectStore(WIN_PHOTO_STORE).get(id));
    await winPhotoTxDone(tx);
    const bytes = winPhotoBytes(value);
    if (!(await isAllowedWinPhotoBlob(bytes))) return { status: "missing", blob: null };
    return { status: "ok", blob: bytes };
  } catch {
    return { status: "error", blob: null };
  }
}

export async function readWinPhoto(id) {
  const record = await readWinPhotoRecord(id);
  if (!record || record.status !== "ok") return null;
  return record.blob;
}

async function winPhotoEntries(db) {
  let tx = null;
  try {
    tx = db.transaction(WIN_PHOTO_STORE, "readonly");
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
  } catch {
    try {
      if (tx && tx.abort) tx.abort();
    } catch {
      /* the list already failed */
    }
    return null;
  }
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
 * so this tab or another tab can still write its reference.
 * A value with no stored time is old enough to delete.
 * A time more than WIN_PHOTO_FUTURE_SKEW_MS ahead of now is not pending.
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
