import { civilDateKey } from "../calendar/civil.js";
import {
  WIN_PHOTO_CHANNEL,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_DB,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  deleteAllWinPhotos,
  deleteUnreferencedWinPhotos,
  deleteWinPhotos,
  handleWinPhotoMessage,
  isPlaceholderPhotoBlob,
  placeholderPhotoBlob,
  postWinPhotoChange,
  putWinPhoto,
  readWinPhoto,
  releaseWinPhotoUrl,
  winPhotoDatabaseReady,
  winPhotoObjectUrl,
} from "./win-photos.js";

export {
  WIN_PHOTO_CHANNEL,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_DB,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  handleWinPhotoMessage,
  readWinPhoto,
  releaseWinPhotoUrl,
  winPhotoObjectUrl,
};

/** Legacy key. Read for migration only. Never overwritten or deleted. */
export const WINS_STORAGE_KEY_V1 = "mindpal.dailyWins.v1";
export const WINS_STORAGE_KEY = "mindpal.dailyWins.v2";
/**
 * Prefix for a copy of an unreadable v2 payload.
 * A save reuses a copy that already holds the same text.
 * Timestamped copies stop at MAX_CORRUPT_BACKUPS.
 * A plain load does not write a copy.
 * When a save cannot keep another copy, saving stays blocked until the person resets.
 * Reset copies that unreadable text into a timestamped backup, then clears the v2 key.
 * The newest three timestamped copies stay. Backup names that are not timestamps are kept.
 */
export const WINS_STORAGE_KEY_V2_BACKUP = "mindpal.dailyWins.v2.backup";
/** Timestamped copies only. The unsuffixed backup key is left alone. */
export const MAX_CORRUPT_BACKUPS = 3;
export const WINS_STORE_VERSION = 2;
export const WIN_SAVED_LABEL = "Saved on this device for today.";
export const WIN_NOT_SAVED_LABEL = "Not saved. This win was not stored on this device.";
/** Shown on Win of the day only while a save cannot be stored. */
export const WIN_RESET_LABEL = "Reset wins on this device";
export const WIN_RESET_NOTE =
  "Saving is blocked. Reset keeps the unreadable wins record as a backup on this device, then clears it so a new win can be saved. Older backup copies are dropped only to keep the newest three. This is a prototype, not real private storage.";
export const WIN_RESET_CONFIRM = "Confirm reset on this device";
export const WIN_RESET_CANCEL = "Keep the record";
export const WIN_RESET_DONE =
  "Reset on this device. The unreadable record was kept as a backup. A new win can be saved on this device.";
export const WIN_RESET_UNNEEDED =
  "Reset was not needed. The wins record on this device can already be read.";
export const WIN_RESET_FAILED =
  "Reset did not happen. The unreadable record is still on this device.";
/**
 * Stored when a win has no time of its own.
 * This is not the moment the record was read. The card says so.
 */
export const WIN_UNKNOWN_TIME = "1970-01-01T00:00:00.000Z";
export const WIN_UNKNOWN_TIME_LABEL = "Time not recorded";
const WRITE_PROBE_KEY = "mindpal.dailyWins.v2.writeprobe";
/** Same-tab panels listen for this. Other tabs use the storage event instead. */
export const WINS_CHANGE_EVENT = "mindpal-wins-change";
export const WIN_TEXT_MAX = 280;

/**
 * Bundled fake picture served with the app.
 * This is not a user photo and not private photo storage.
 * When IndexedDB is available, the bytes live in mindpal-photos under the win id
 * and this record stores WIN_PHOTO_REF only. When it is not available, the record
 * keeps this path and the card says so.
 */
export const WIN_PLACEHOLDER_PHOTO = "/mindpal/win-placeholder.svg";
export const WIN_PHOTO_PROTOTYPE_LABEL =
  "Prototype: placeholder image, not real private storage.";

/** Always-on Today control. Not a numbered step and not a STEP_IDS entry. */
export const WIN_OF_THE_DAY_TITLE = "Win of the day";
export const WIN_OF_THE_DAY_EYEBROW = "WIN OF THE DAY";
export const WIN_OF_THE_DAY_LEDE =
  "See today’s wins, or add one now — morning included. Small ones count. You’ll meet them again before sleep.";
export const WIN_OF_THE_DAY_EMPTY =
  "Nothing saved yet today. Add one whenever you like.";
const MAX_DAYS = 60;

export function emptyWinsDay(date = new Date()) {
  return [];
}

/**
 * The record may name the bundled placeholder path, or the IndexedDB reference.
 * Image bytes are never stored in this JSON. Any other value is dropped.
 */
function allowedPhoto(raw) {
  if (raw === WIN_PLACEHOLDER_PHOTO || raw === WIN_PHOTO_REF) return raw;
  return undefined;
}

export function normalizeWin(raw, fallbackAt = new Date(WIN_UNKNOWN_TIME)) {
  if (!raw || typeof raw !== "object") return null;
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, WIN_TEXT_MAX) : "";
  if (!text) return null;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `win-${fallbackAt.getTime()}`;
  const at =
    typeof raw.at === "string" && raw.at
      ? raw.at
      : WIN_UNKNOWN_TIME;
  const win = { id, text, at };
  const photo = allowedPhoto(raw.photo);
  if (photo) win.photo = photo;
  return win;
}

export function emptyWinsStore() {
  return { version: WINS_STORE_VERSION, days: {} };
}

function shortHash(value) {
  let hash = 5381;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Stable id for a win that had none, or that repeated an id already used that day.
 * A short hash of the index, the time, and the text. A missing time uses
 * WIN_UNKNOWN_TIME, not the clock, so a later read matches.
 */
export function stableWinId(index, at, text, salt = 0) {
  const stamp = typeof at === "string" && at ? at : WIN_UNKNOWN_TIME;
  const body = typeof text === "string" ? text : "";
  const saltPart = salt > 0 ? `-${salt}` : "";
  return `win-${index}${saltPart}-${shortHash(`${index}\n${salt}\n${stamp}\n${body}`)}`;
}

function withUniqueIds(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (let index = 0; index < list.length; index += 1) {
    const raw = list[index];
    const win = normalizeWin(raw);
    if (!win) continue;
    const rawId = raw && typeof raw === "object" && typeof raw.id === "string" ? raw.id.trim() : "";
    if (!rawId) win.id = stableWinId(index, win.at, win.text, 0);
    if (seen.has(win.id)) {
      let salt = 0;
      let next = stableWinId(index, win.at, win.text, salt);
      while (seen.has(next)) {
        salt += 1;
        next = stableWinId(index, win.at, win.text, salt);
      }
      win.id = next;
    }
    seen.add(win.id);
    out.push(win);
  }
  return out;
}

export function normalizeWinsStore(raw) {
  const store = emptyWinsStore();
  if (!raw || typeof raw !== "object") return store;
  const days = raw.days && typeof raw.days === "object" ? raw.days : {};
  for (const [key, list] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    store.days[key] = withUniqueIds(list);
  }
  return store;
}

export function parseWinsJson(text) {
  if (!text || typeof text !== "string") return emptyWinsStore();
  try {
    return normalizeWinsStore(JSON.parse(text));
  } catch {
    return emptyWinsStore();
  }
}

/**
 * Copy a v1 store into the v2 shape.
 * Returns null when the text cannot be read, so the caller must not write v2.
 * Wins keep id, text and at. No photo is copied or invented.
 */
export function migrateV1WinsJson(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const daysIn = raw.days;
  if (!daysIn || typeof daysIn !== "object" || Array.isArray(daysIn)) return null;
  const store = emptyWinsStore();
  for (const [key, list] of Object.entries(daysIn)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    store.days[key] = withUniqueIds(
      list.map((item) =>
        item && typeof item === "object" ? { id: item.id, text: item.text, at: item.at } : null,
      ),
    );
  }
  return pruneDays(store);
}

/**
 * Pure downgrade of a v2 store into the v1 shape.
 * Returns { version: 1, days } with id and text. at is included only when a time
 * was recorded. WIN_UNKNOWN_TIME is left out, so the export does not invent a time.
 * Photos are left out, including the IndexedDB reference and the placeholder path.
 * This does not read or write storage, and it does not delete or create the v1 key.
 *
 * Migration leaves mindpal.dailyWins.v1 as it is, including when that key is already
 * absent. Deleting it would drop the only record v1 code can read. Writing it during
 * migration would replace an original record, or create one, without a separate decision.
 * A rollback to code that reads the v1 key can take JSON.stringify(exportV1(store))
 * and store that text under the v1 key as its own step.
 */
export function exportV1(store) {
  const normalized = typeof store === "string" ? parseWinsJson(store) : normalizeWinsStore(store);
  const days = {};
  for (const [key, list] of Object.entries(normalized.days)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    days[key] = list.map((item) => {
      const win = { id: item.id, text: item.text };
      if (typeof item.at === "string" && item.at && item.at !== WIN_UNKNOWN_TIME) win.at = item.at;
      return win;
    });
  }
  return { version: 1, days };
}

function readKey(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function readWinsStoreText(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Object.prototype.hasOwnProperty.call(raw, "days")) {
    if (!raw.days || typeof raw.days !== "object" || Array.isArray(raw.days)) return null;
  }
  return normalizeWinsStore(raw);
}

function migratedV1(storage) {
  const v1Text = readKey(storage, WINS_STORAGE_KEY_V1);
  if (typeof v1Text !== "string" || v1Text.length === 0) return null;
  return migrateV1WinsJson(v1Text);
}

function namesFromStorage(storage) {
  if (!storage || typeof storage !== "object") return null;
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    const names = [];
    for (let i = 0; i < storage.length; i += 1) names.push(storage.key(i));
    return names;
  }
  const bag = storage.store;
  if (!bag || typeof bag !== "object") return null;
  if (typeof bag.keys === "function") return [...bag.keys()];
  return Object.keys(bag);
}

function backupKeys(storage) {
  const names = namesFromStorage(storage);
  if (!names) return null;
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  return names.filter(
    (key) => typeof key === "string" && (key === WINS_STORAGE_KEY_V2_BACKUP || key.startsWith(prefix)),
  );
}

function quarantineCorruptWins(storage, v2Text, now = new Date()) {
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return null;
  }
  if (keys == null) return null;
  for (const key of keys) {
    if (readKey(storage, key) === v2Text) return key;
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const stamped = keys.filter((key) => isKnownBackupKey(key));
  if (stamped.length >= MAX_CORRUPT_BACKUPS) return null;
  const stamp = now.getTime();
  for (let n = 0; n < 50; n += 1) {
    const key = n === 0 ? `${prefix}${stamp}` : `${prefix}${stamp}.${n}`;
    let existing;
    try {
      existing = storage.getItem(key);
    } catch {
      return null;
    }
    if (existing === v2Text) return key;
    if (typeof existing === "string" && existing.length > 0) continue;
    try {
      storage.setItem(key, v2Text);
      if (storage.getItem(key) === v2Text) return key;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Read the wins record without writing.
 * A cross-tab refresh uses this so a storage event cannot copy v1 into v2.
 */
export function readWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  const v2Text = readKey(storage, WINS_STORAGE_KEY);
  if (typeof v2Text === "string" && v2Text.length > 0) {
    const parsed = readWinsStoreText(v2Text);
    if (parsed) return parsed;
    return migratedV1(storage) || emptyWinsStore();
  }
  return migratedV1(storage) || emptyWinsStore();
}

export function loadWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  const v2Text = readKey(storage, WINS_STORAGE_KEY);
  if (typeof v2Text === "string" && v2Text.length > 0) {
    const parsed = readWinsStoreText(v2Text);
    if (parsed) return parsed;
    return migratedV1(storage) || emptyWinsStore();
  }
  const migrated = migratedV1(storage);
  if (!migrated) return emptyWinsStore();
  try {
    storage.setItem(WINS_STORAGE_KEY, JSON.stringify(migrated));
  } catch {
    /* quota or private mode: leave the v1 key untouched */
  }
  return migrated;
}

function referencedPhotoIds(store) {
  const ids = [];
  const days = store && store.days && typeof store.days === "object" ? store.days : {};
  for (const list of Object.values(days)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && item.photo === WIN_PHOTO_REF && typeof item.id === "string" && item.id) ids.push(item.id);
    }
  }
  return ids;
}

function removedPhotoIds(previousStore, nextStore) {
  const keep = new Set(referencedPhotoIds(nextStore));
  return referencedPhotoIds(previousStore).filter((id) => !keep.has(id));
}

function idlePhotoCleanup() {
  return Promise.resolve({ deleted: [] });
}

function pruneDays(store) {
  const keys = Object.keys(store.days).sort();
  if (keys.length <= MAX_DAYS) return store;
  const keep = keys.slice(-MAX_DAYS);
  const days = {};
  for (const key of keep) days[key] = store.days[key];
  return { version: WINS_STORE_VERSION, days };
}

function persistWins(store, storage, now = new Date()) {
  const next = pruneDays(normalizeWinsStore(store));
  const idle = idlePhotoCleanup();
  if (!storage) return { store: next, saved: true, photoCleanup: idle };
  const current = readKey(storage, WINS_STORAGE_KEY);
  const readable = typeof current === "string" && current.length > 0 ? readWinsStoreText(current) : null;
  /*
   * Read the previous record before the write. A later cleanup only deletes photos
   * for ids that readable record named and this save dropped. It does not sweep
   * unknown keys, so a blob another tab has stored but not yet referenced can stay.
   * An unreadable record has no ids. After it is replaced, blobs the new record
   * does not name are removed. A plain load never reaches this function.
   */
  if (typeof current === "string" && current.length > 0 && !readable) {
    const backupKey = quarantineCorruptWins(storage, current, now);
    if (!backupKey || readKey(storage, backupKey) !== current) {
      clearProbeMemory();
      return { store: next, saved: false, photoCleanup: idle };
    }
  }
  let serial;
  try {
    serial = JSON.stringify(next);
    storage.setItem(WINS_STORAGE_KEY, serial);
  } catch {
    /* private mode / quota; the v1 key is never written */
    clearProbeMemory();
    return { store: next, saved: false, photoCleanup: idle };
  }
  const saved = readKey(storage, WINS_STORAGE_KEY) === serial;
  if (!saved) {
    clearProbeMemory();
    return { store: next, saved: false, photoCleanup: idle };
  }
  let photoCleanup = idle;
  if (readable) photoCleanup = deleteWinPhotos(removedPhotoIds(readable, next));
  else if (typeof current === "string" && current.length > 0) {
    photoCleanup = deleteUnreferencedWinPhotos(referencedPhotoIds(next));
  }
  return { store: next, saved: true, photoCleanup };
}

export function saveWinsStore(store, storage = globalThis.localStorage, now = new Date()) {
  return persistWins(store, storage, now).store;
}

function backupSuffix(key) {
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : "";
}

/** A timestamped copy is digits, or digits, a dot, and digits. Other names are kept. */
function isKnownBackupKey(key) {
  return /^\d+(?:\.\d+)?$/.test(backupSuffix(key));
}

function knownBackupRank(key) {
  const [stampText, extraText] = backupSuffix(key).split(".");
  const stamp = Number(stampText);
  const extra = extraText == null || extraText === "" ? 0 : Number(extraText);
  return [Number.isFinite(stamp) ? stamp : 0, Number.isFinite(extra) ? extra : 0];
}

function compareKnownBackupAge(a, b) {
  const [aStamp, aExtra] = knownBackupRank(a);
  const [bStamp, bExtra] = knownBackupRank(b);
  if (aStamp !== bStamp) return aStamp - bStamp;
  return aExtra - bExtra;
}

/**
 * Last probe for one storage object and one unreadable text.
 * A later check of that same text does not write again, until a failed save forgets it.
 * Another tab can change the record or free space. That tab's storage event must call
 * clearWinsProbeCache, or this answer stays stale. The event handler only forgets the
 * answer. It does not write a new probe. winsSaveBlockedQuiet is the read-only check
 * a refresh uses so the event itself does not write.
 */
let probeMemory = null;

export function clearWinsProbeCache() {
  probeMemory = null;
}

function clearProbeMemory() {
  clearWinsProbeCache();
}

/**
 * True when a backup of this exact text cannot be stored.
 * The probe value is that text, so a one-byte write cannot hide a larger record.
 * The probe key is not a wins backup. removeItem clears it after the check.
 * If removeItem throws, or the key is still there, the probe can remain and this returns true.
 * The answer is remembered for this storage and this text until a failed save forgets it,
 * or until clearWinsProbeCache runs because another tab changed a wins key.
 */
function freshBackupWriteFails(storage, text) {
  const sample = typeof text === "string" ? text : "";
  if (probeMemory && probeMemory.storage === storage && probeMemory.text === sample) {
    return probeMemory.fails;
  }
  let fails = true;
  try {
    storage.setItem(WRITE_PROBE_KEY, sample);
    fails = storage.getItem(WRITE_PROBE_KEY) !== sample;
  } catch {
    fails = true;
  }
  try {
    if (typeof storage.removeItem === "function") storage.removeItem(WRITE_PROBE_KEY);
  } catch {
    /* the probe key can remain */
  }
  const left = readKey(storage, WRITE_PROBE_KEY);
  if (typeof left === "string" && left.length > 0) fails = true;
  probeMemory = { storage, text: sample, fails };
  return fails;
}

/**
 * True when a save cannot store a new win because the v2 record is unreadable
 * and a backup of that text cannot be reused or written.
 * A matching backup can still be reused, so that case is not blocked.
 * A readable store is not blocked.
 * When the cap is not full, the first check for this text may write and remove a probe
 * the same size as the record. The same text is not probed again on this storage
 * until a failed save forgets that answer. A plain load does not call this.
 */
export function winsSaveBlocked(storage = globalThis.localStorage) {
  if (!storage) return false;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0) return false;
  if (readWinsStoreText(current)) return false;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return true;
  }
  if (keys == null) return true;
  for (const key of keys) {
    if (readKey(storage, key) === current) return false;
  }
  const known = keys.filter(isKnownBackupKey);
  if (known.length >= MAX_CORRUPT_BACKUPS) return true;
  return freshBackupWriteFails(storage, current);
}

/**
 * Read-only blocked check. Never writes a probe and never uses the remembered answer.
 * True when the record is unreadable and a backup cannot be reused or the cap is full.
 * When a probe would be needed to know about quota, this returns false. The next save
 * can probe. A storage event uses this so the refresh does not write.
 */
export function winsSaveBlockedQuiet(storage = globalThis.localStorage) {
  if (!storage) return false;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0) return false;
  if (readWinsStoreText(current)) return false;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return true;
  }
  if (keys == null) return true;
  for (const key of keys) {
    if (readKey(storage, key) === current) return false;
  }
  return keys.filter(isKnownBackupKey).length >= MAX_CORRUPT_BACKUPS;
}

/** True for a wins key, a backup key, the probe key, or a storage.clear() event (null key). */
export function isWinsStorageKey(key) {
  if (key == null) return true;
  if (typeof key !== "string") return false;
  if (
    key === WINS_STORAGE_KEY
    || key === WINS_STORAGE_KEY_V1
    || key === WRITE_PROBE_KEY
    || key === WINS_STORAGE_KEY_V2_BACKUP
  ) {
    return true;
  }
  return key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`);
}

/**
 * Another tab changed a wins key. Forget the probe answer and tell the caller to refresh.
 * Does not write. Returns false for unrelated keys so the caller does not refresh.
 */
export function handleWinsStorageEvent(event) {
  if (!event || !isWinsStorageKey(event.key)) return false;
  clearWinsProbeCache();
  return true;
}

/**
 * Listen for same-tab saves, other-tab wins keys, and photo blob messages.
 * onSameTab may check the probe, because a save in this tab already wrote.
 * onOtherTab must only read. This function does not write and does not post a
 * photo message, so a received message cannot loop.
 * Returns a function that removes the listeners.
 */
export function listenForWinsChanges(target, onSameTab, onOtherTab) {
  if (!target || typeof target.addEventListener !== "function") return () => {};
  function onSame() {
    if (typeof onSameTab === "function") onSameTab();
  }
  function onStorage(event) {
    if (!handleWinsStorageEvent(event)) return;
    if (typeof onOtherTab === "function") onOtherTab();
  }
  function onPhoto(event) {
    if (!handleWinPhotoMessage(event)) return;
    if (typeof onOtherTab === "function") onOtherTab();
  }
  target.addEventListener(WINS_CHANGE_EVENT, onSame);
  target.addEventListener("storage", onStorage);
  let channel = null;
  try {
    if (typeof BroadcastChannel === "function") {
      channel = new BroadcastChannel(WIN_PHOTO_CHANNEL);
      channel.onmessage = onPhoto;
    }
  } catch {
    channel = null;
  }
  return function stopWinsChangeListener() {
    target.removeEventListener(WINS_CHANGE_EVENT, onSame);
    target.removeEventListener("storage", onStorage);
    if (channel) {
      channel.onmessage = null;
      try {
        channel.close();
      } catch {
        /* already closed */
      }
    }
  };
}

function removeStoredKey(storage, key) {
  if (!storage || typeof storage.removeItem !== "function") return false;
  try {
    storage.removeItem(key);
  } catch {
    return false;
  }
  const left = readKey(storage, key);
  return left == null || left === "";
}

function placeCorruptBackup(storage, text, now) {
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return null;
  }
  if (keys == null) return null;
  for (const key of keys) {
    if (readKey(storage, key) === text) return key;
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const stamp = now.getTime();
  for (let n = 0; n < 50; n += 1) {
    const key = n === 0 ? `${prefix}${stamp}` : `${prefix}${stamp}.${n}`;
    let existing;
    try {
      existing = storage.getItem(key);
    } catch {
      return null;
    }
    if (existing === text) return key;
    if (typeof existing === "string" && existing.length > 0) continue;
    try {
      storage.setItem(key, text);
      if (storage.getItem(key) === text) return key;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * User-triggered recovery for a blocked save.
 * Copies the unreadable v2 text into a timestamped backup first.
 * Clears the v2 key only after that copy is in place.
 * Then drops the oldest timestamped copies until MAX_CORRUPT_BACKUPS remain.
 * The copy of the unreadable text is not dropped. Unknown backup names,
 * the unsuffixed backup key, and the v1 key are not removed.
 * If the keys cannot be listed, or the copy cannot be written, nothing is cleared.
 * Does nothing when saving is not blocked, so a readable store stays put.
 * After the v2 key is cleared, every win photo blob is deleted. The unreadable text
 * cannot name those ids, and the live record no longer references them.
 * If the reset does not clear the key, the blobs stay.
 */
export function resetBlockedWins(storage = globalThis.localStorage, now = new Date()) {
  const idle = { cleared: false, needed: false, kept: [] };
  if (!storage || !winsSaveBlocked(storage)) return idle;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current !== "string" || current.length === 0 || readWinsStoreText(current)) return idle;
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    keys = null;
  }
  if (keys == null) return { cleared: false, needed: true, kept: [] };
  const placed = placeCorruptBackup(storage, current, now);
  if (!placed || readKey(storage, placed) !== current) {
    return { cleared: false, needed: true, kept: [] };
  }
  let after;
  try {
    after = backupKeys(storage);
  } catch {
    after = null;
  }
  if (after == null || !removeStoredKey(storage, WINS_STORAGE_KEY)) {
    return { cleared: false, needed: true, kept: after || [placed] };
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const known = after.filter(isKnownBackupKey).sort(compareKnownBackupAge);
  const unknown = after.filter((key) => key.startsWith(prefix) && !isKnownBackupKey(key));
  const plain = after.filter((key) => key === WINS_STORAGE_KEY_V2_BACKUP);
  const remain = known.slice();
  while (remain.length > MAX_CORRUPT_BACKUPS) {
    const index = remain.findIndex((key) => readKey(storage, key) !== current);
    if (index < 0) break;
    const [dropped] = remain.splice(index, 1);
    removeStoredKey(storage, dropped);
  }
  return {
    cleared: true,
    needed: true,
    kept: remain.concat(unknown, plain),
    photoCleanup: deleteAllWinPhotos(),
  };
}

export function winsForDate(store, date = new Date()) {
  const key = civilDateKey(date);
  const list = store?.days?.[key];
  return Array.isArray(list) ? list.slice() : [];
}

function newWinId(now) {
  return `win-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addWin(
  text,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  photo,
  presetId,
) {
  const raw = { text, at: now.toISOString(), photo };
  if (typeof presetId === "string" && presetId.trim()) raw.id = presetId.trim();
  const item = normalizeWin(raw, now);
  const store = loadWinsStore(storage);
  if (!item) {
    return {
      store,
      item: null,
      items: winsForDate(store, date),
      saved: false,
      photoCleanup: idlePhotoCleanup(),
    };
  }
  if (!raw.id) item.id = newWinId(now);
  const key = civilDateKey(date);
  const items = [...winsForDate(store, date), item];
  store.days[key] = items;
  const written = persistWins(store, storage, now);
  if (!written.saved) {
    return {
      store: written.store,
      item,
      items: winsForDate(loadWinsStore(storage), date),
      saved: false,
      photoCleanup: written.photoCleanup,
    };
  }
  return {
    store: written.store,
    item,
    items: winsForDate(written.store, date),
    saved: true,
    photoCleanup: written.photoCleanup,
  };
}

function photoResult(added, flags) {
  return {
    ...added,
    photoSaved: flags.photoSaved === true,
    photoFallback: flags.photoFallback === true,
    photoError: flags.photoError === true,
  };
}

/**
 * Save a win and, when this browser can store it, the placeholder blob.
 * The local record keeps WIN_PHOTO_REF, not the bytes.
 * IndexedDB unavailable: the record keeps the placeholder path and photoFallback is set.
 * Quota or a rejected blob: the text win still saves when it can, with no photo reference.
 * If the text cannot be saved, a blob that was just written is deleted.
 */
export async function addWinPhoto(
  text,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  blob,
) {
  const draft = normalizeWin({ text, at: now.toISOString() }, now);
  if (!draft) return photoResult(addWin(text, storage, date, now), {});
  const id = newWinId(now);
  const body = blob === undefined ? placeholderPhotoBlob() : blob;
  if (!(await isPlaceholderPhotoBlob(body))) {
    return photoResult(addWin(text, storage, date, now, undefined, id), { photoError: true });
  }
  if (!(await winPhotoDatabaseReady())) {
    const added = addWin(text, storage, date, now, WIN_PLACEHOLDER_PHOTO, id);
    return photoResult(added, { photoFallback: added.saved === true });
  }
  const put = await putWinPhoto(id, body);
  if (!put.ok) {
    if (put.reason === "unavailable") {
      const added = addWin(text, storage, date, now, WIN_PLACEHOLDER_PHOTO, id);
      return photoResult(added, { photoFallback: added.saved === true });
    }
    return photoResult(addWin(text, storage, date, now, undefined, id), { photoError: true });
  }
  const added = addWin(text, storage, date, now, WIN_PHOTO_REF, id);
  if (!added.saved || !added.item || added.item.id !== id || added.item.photo !== WIN_PHOTO_REF) {
    await deleteWinPhotos([id], { notify: false });
    return photoResult(added, { photoError: true });
  }
  postWinPhotoChange("put", id);
  return photoResult(added, { photoSaved: true });
}

export function removeWin(id, storage = globalThis.localStorage, date = new Date()) {
  const store = loadWinsStore(storage);
  const key = civilDateKey(date);
  const items = winsForDate(store, date);
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) items.splice(index, 1);
  store.days[key] = items;
  const written = persistWins(store, storage, new Date());
  if (!written.saved) {
    return {
      store: written.store,
      items: winsForDate(loadWinsStore(storage), date),
      saved: false,
      photoCleanup: written.photoCleanup,
    };
  }
  return {
    store: written.store,
    items: winsForDate(written.store, date),
    saved: true,
    photoCleanup: written.photoCleanup,
  };
}
