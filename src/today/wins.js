import { civilDateKey } from "../calendar/civil.js";

export const WINS_STORAGE_KEY = "mindpal.dailyWins.v1";
export const WIN_TEXT_MAX = 280;
const MAX_DAYS = 60;

export function emptyWinsDay(date = new Date()) {
  return [];
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
  return { id, text, at };
}

export function emptyWinsStore() {
  return { version: 1, days: {} };
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

export function loadWinsStore(storage = globalThis.localStorage) {
  if (!storage) return emptyWinsStore();
  try {
    return parseWinsJson(storage.getItem(WINS_STORAGE_KEY));
  } catch {
    return emptyWinsStore();
  }
}

function pruneDays(store) {
  const keys = Object.keys(store.days).sort();
  if (keys.length <= MAX_DAYS) return store;
  const keep = keys.slice(-MAX_DAYS);
  const days = {};
  for (const key of keep) days[key] = store.days[key];
  return { version: 1, days };
}

export function saveWinsStore(store, storage = globalThis.localStorage) {
  const next = pruneDays(normalizeWinsStore(store));
  if (!storage) return next;
  try {
    storage.setItem(WINS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
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
) {
  const item = normalizeWin({ text, at: now.toISOString() }, now);
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
