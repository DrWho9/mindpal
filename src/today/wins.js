import { civilDateKey } from "../calendar/civil.js";

/** Legacy key. Read for migration only. Never overwritten or deleted. */
export const WINS_STORAGE_KEY_V1 = "mindpal.dailyWins.v1";
export const WINS_STORAGE_KEY = "mindpal.dailyWins.v2";
/** Holds an unreadable v2 payload before that payload is replaced from v1. */
export const WINS_STORAGE_KEY_V2_BACKUP = "mindpal.dailyWins.v2.backup";
export const WINS_STORE_VERSION = 2;
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

function backupCorruptWins(storage, v2Text) {
  try {
    const existing = storage.getItem(WINS_STORAGE_KEY_V2_BACKUP);
    if (typeof existing === "string" && existing.length > 0 && existing !== v2Text) return false;
    if (existing !== v2Text) storage.setItem(WINS_STORAGE_KEY_V2_BACKUP, v2Text);
    return storage.getItem(WINS_STORAGE_KEY_V2_BACKUP) === v2Text;
  } catch {
    return false;
  }
}

export function loadWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  const v2Text = readKey(storage, WINS_STORAGE_KEY);
  if (typeof v2Text === "string" && v2Text.length > 0) {
    const parsed = readWinsStoreText(v2Text);
    if (parsed) return parsed;
    const v1Text = readKey(storage, WINS_STORAGE_KEY_V1);
    const migrated =
      typeof v1Text === "string" && v1Text.length > 0 ? migrateV1WinsJson(v1Text) : null;
    if (migrated && backupCorruptWins(storage, v2Text)) {
      try {
        storage.setItem(WINS_STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        /* backup holds the unreadable v2 text; the v1 key stays as it was */
      }
      return migrated;
    }
    return migrated || emptyWinsStore();
  }
  const v1Text = readKey(storage, WINS_STORAGE_KEY_V1);
  if (typeof v1Text !== "string" || v1Text.length === 0) return emptyWinsStore();
  const migrated = migrateV1WinsJson(v1Text);
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

export function saveWinsStore(store, storage = globalThis.localStorage) {
  const next = pruneDays(normalizeWinsStore(store));
  if (!storage) return next;
  const current = readKey(storage, WINS_STORAGE_KEY);
  if (typeof current === "string" && current.length > 0 && !readWinsStoreText(current)) {
    /* unreadable v2 stays put unless load already copied it aside and replaced it from v1 */
    return next;
  }
  try {
    storage.setItem(WINS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota; the v1 key is never written */
  }
  return next;
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
  if (!item) return { store, item: null, items: winsForDate(store, date) };
  item.id = `win-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const key = civilDateKey(date);
  const items = [...winsForDate(store, date), item];
  store.days[key] = items;
  return { store: saveWinsStore(store, storage), item, items };
}

export function removeWin(id, storage = globalThis.localStorage, date = new Date()) {
  const store = loadWinsStore(storage);
  const key = civilDateKey(date);
  const items = winsForDate(store, date).filter((item) => item.id !== id);
  store.days[key] = items;
  return { store: saveWinsStore(store, storage), items };
}
