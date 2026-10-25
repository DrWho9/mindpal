import { civilDateKey } from "../calendar/civil.js";

/** Legacy key. Read for migration only. Never overwritten or deleted. */
export const WINS_STORAGE_KEY_V1 = "mindpal.dailyWins.v1";
export const WINS_STORAGE_KEY = "mindpal.dailyWins.v2";
/**
 * Prefix for a copy of an unreadable v2 payload.
 * A save reuses a copy that already holds the same text.
 * Timestamped copies stop at MAX_CORRUPT_BACKUPS.
 * A plain load does not write a copy.
 */
export const WINS_STORAGE_KEY_V2_BACKUP = "mindpal.dailyWins.v2.backup";
/** Timestamped copies only. The unsuffixed backup key is left alone. */
export const MAX_CORRUPT_BACKUPS = 3;
export const WINS_STORE_VERSION = 2;
export const WIN_SAVED_LABEL = "Saved on this device for today.";
export const WIN_NOT_SAVED_LABEL = "Not saved. This win was not stored on this device.";
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

export function normalizeWin(raw, fallbackAt = new Date()) {
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
      : fallbackAt.toISOString();
  const win = { id, text, at };
  const photo = allowedPhoto(raw.photo);
  if (photo) win.photo = photo;
  return win;
}

export function emptyWinsStore() {
  return { version: WINS_STORE_VERSION, days: {} };
}

export function normalizeWinsStore(raw) {
  const store = emptyWinsStore();
  if (!raw || typeof raw !== "object") return store;
  const days = raw.days && typeof raw.days === "object" ? raw.days : {};
  for (const [key, list] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    store.days[key] = list.map((item) => normalizeWin(item)).filter(Boolean);
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
    store.days[key] = list
      .map((item) =>
        normalizeWin(
          item && typeof item === "object"
            ? { id: item.id, text: item.text, at: item.at }
            : null,
        ),
      )
      .filter(Boolean);
  }
  return pruneDays(store);
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

function backupKeys(storage) {
  const keys = [];
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const consider = (key) =>
    typeof key === "string" && (key === WINS_STORAGE_KEY_V2_BACKUP || key.startsWith(prefix));
  if (typeof storage.length === "number" && typeof storage.key === "function") {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (consider(key)) keys.push(key);
    }
    return keys;
  }
  const bag = storage.store;
  if (bag && typeof bag.keys === "function") {
    for (const key of bag.keys()) if (consider(key)) keys.push(key);
    return keys;
  }
  if (bag && typeof bag === "object") {
    for (const key of Object.keys(bag)) if (consider(key)) keys.push(key);
  }
  return keys;
}

function quarantineCorruptWins(storage, v2Text, now = new Date()) {
  let keys;
  try {
    keys = backupKeys(storage);
  } catch {
    return null;
  }
  for (const key of keys) {
    if (readKey(storage, key) === v2Text) return key;
  }
  const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
  const stamped = keys.filter((key) => key.startsWith(prefix));
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

export function loadWinsStore(storage = globalThis.localStorage, now = new Date()) {
  void now;
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
  const store = loadWinsStore(storage, now);
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
      items: winsForDate(loadWinsStore(storage, now), date),
      saved: false,
    };
  }
  return { store: written.store, item, items: winsForDate(written.store, date), saved: true };
}

export function removeWin(id, storage = globalThis.localStorage, date = new Date()) {
  const store = loadWinsStore(storage);
  const key = civilDateKey(date);
  const items = winsForDate(store, date).filter((item) => item.id !== id);
  store.days[key] = items;
  const written = persistWins(store, storage, new Date());
  if (!written.saved) {
    return { store: written.store, items: winsForDate(loadWinsStore(storage), date), saved: false };
  }
  return { store: written.store, items: winsForDate(written.store, date), saved: true };
}
