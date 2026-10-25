import { civilDateKey } from "../calendar/civil.js";

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
export const WIN_TEXT_MAX = 280;

/**
 * Bundled fake picture served with the app.
 * This is not a user photo and not private photo storage.
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

function allowedPhoto(raw) {
  return raw === WIN_PLACEHOLDER_PHOTO ? WIN_PLACEHOLDER_PHOTO : undefined;
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
 * Returns { version: 1, days } with id, text, and at only. Photos are left out.
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
    days[key] = list.map((item) => ({ id: item.id, text: item.text, at: item.at }));
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
  if (!storage) return { store: next, saved: true };
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current === "string" && current.length > 0 && !readWinsStoreText(current)) {
    const backupKey = quarantineCorruptWins(storage, current, now);
    if (!backupKey || readKey(storage, backupKey) !== current) return { store: next, saved: false };
  }
  let serial;
  try {
    serial = JSON.stringify(next);
    storage.setItem(WINS_STORAGE_KEY, serial);
  } catch {
    /* private mode / quota; the v1 key is never written */
    return { store: next, saved: false };
  }
  return { store: next, saved: readKey(storage, WINS_STORAGE_KEY) === serial };
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
 * True when a new backup of one byte cannot be written.
 * The probe key is not a wins backup. It is removed when removeItem works.
 */
function freshBackupWriteFails(storage) {
  try {
    storage.setItem(WRITE_PROBE_KEY, "1");
    const wrote = storage.getItem(WRITE_PROBE_KEY) === "1";
    try {
      if (typeof storage.removeItem === "function") storage.removeItem(WRITE_PROBE_KEY);
    } catch {
      /* the probe is not a wins backup */
    }
    return !wrote;
  } catch {
    return true;
  }
}

/**
 * True when a save cannot store a new win because the v2 record is unreadable
 * and a backup of that text cannot be reused or written.
 * A matching backup can still be reused, so that case is not blocked.
 * A readable store is not blocked.
 * When the cap is not full, this may write and remove a one-byte probe key.
 * A plain load does not call this.
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
  return freshBackupWriteFails(storage);
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
  return { cleared: true, needed: true, kept: remain.concat(unknown, plain) };
}

export function winsForDate(store, date = new Date()) {
  const key = civilDateKey(date);
  const list = store?.days?.[key];
  return Array.isArray(list) ? list.slice() : [];
}

export function addWin(
  text,
  storage = globalThis.localStorage,
  date = new Date(),
  now = new Date(),
  photo,
) {
  const item = normalizeWin({ text, at: now.toISOString(), photo }, now);
  const store = loadWinsStore(storage);
  if (!item) return { store, item: null, items: winsForDate(store, date), saved: false };
  item.id = `win-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
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
    };
  }
  return { store: written.store, item, items: winsForDate(written.store, date), saved: true };
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
    return { store: written.store, items: winsForDate(loadWinsStore(storage), date), saved: false };
  }
  return { store: written.store, items: winsForDate(written.store, date), saved: true };
}
