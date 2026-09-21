export const OPEN_READING_KEY = "mindpal.openReading.v1";
export const OPEN_READING_EVENT = "mindpal-open-reading";

function asReadingList(pack) {
  if (Array.isArray(pack?.readings)) return pack.readings;
  if (Array.isArray(pack)) return pack;
  return [];
}

export function findReadingById(id, ...packs) {
  if (!id || typeof id !== "string") return null;
  for (const pack of packs) {
    const hit = asReadingList(pack).find((item) => item && item.id === id);
    if (hit) return hit;
  }
  return null;
}

export function peekOpenReadingId(storage = globalThis.sessionStorage) {
  if (!storage) return "";
  try {
    const value = storage.getItem(OPEN_READING_KEY);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function takeOpenReadingId(storage = globalThis.sessionStorage) {
  const id = peekOpenReadingId(storage);
  if (!id || !storage) return id;
  try {
    storage.removeItem(OPEN_READING_KEY);
  } catch {
    /* private mode / quota */
  }
  return id;
}

export function openReading(id, { storage = globalThis.sessionStorage, windowObj = globalThis } = {}) {
  const next = typeof id === "string" ? id.trim() : "";
  if (storage && next) {
    try {
      storage.setItem(OPEN_READING_KEY, next);
    } catch {
      /* private mode / quota */
    }
  }
  try {
    windowObj?.dispatchEvent?.(new CustomEvent(OPEN_READING_EVENT, { detail: { id: next } }));
  } catch {
    /* jsdom / missing CustomEvent */
  }
  return next;
}
