export const PACK_A_ID = "mindpal-dstss-themes-paraphrase-v1";
export const PACK_B_ID = "mindpal-daily-soften-v1";
export const STORAGE_KEY = "mindpal.readings.v1";
export const LEGACY_STORAGE_KEY = "mindpal.reading.progress.v1";
export const PACK_A_TOTAL = 100;

export const PACK_A_CREDIT =
  "Inspired by themes from Don't Sweat the Small Stuff · MindPal original wording · not a reprint";

export const PACK_A_PROGRESS_LINE =
  "Inspired by themes from Don't Sweat the Small Stuff";

export function emptyProgress() {
  return {
    version: 1,
    packId: PACK_A_ID,
    completedIds: [],
    unlockedHomemadeAt: null,
    packBBannerSeen: false,
  };
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === "string" && id.trim()))];
}

export function normalizeProgress(raw) {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  const completedIds = asIdList(raw.completedIds);
  const unlocked =
    completedIds.length >= PACK_A_TOTAL
      ? typeof raw.unlockedHomemadeAt === "string" && raw.unlockedHomemadeAt
        ? raw.unlockedHomemadeAt
        : new Date().toISOString()
      : null;
  return {
    version: 1,
    packId: PACK_A_ID,
    completedIds,
    unlockedHomemadeAt: unlocked,
    packBBannerSeen: raw.packBBannerSeen === true,
  };
}

export function parseProgressJson(text) {
  if (!text || typeof text !== "string") return emptyProgress();
  try {
    return normalizeProgress(JSON.parse(text));
  } catch {
    return emptyProgress();
  }
}

export function orderedReadings(pack) {
  const list = Array.isArray(pack?.readings) ? pack.readings.slice() : [];
  return list.sort((a, b) => Number(a.day) - Number(b.day));
}

export function isDayUnlocked(readings, completedIds, day) {
  const n = Number(day);
  if (!Number.isFinite(n) || n <= 1) return true;
  const prev = readings.find((item) => Number(item.day) === n - 1);
  if (!prev) return false;
  return completedIds.includes(prev.id);
}

export function nextIncomplete(readings, completedIds) {
  const ordered = orderedReadings({ readings });
  if (!ordered.length) return null;
  return ordered.find((item) => !completedIds.includes(item.id)) || null;
}

export function canMarkDone(readings, completedIds, reading) {
  if (!reading?.id) return false;
  if (reading.gate === false || reading.pack === "owner") return false;
  if (completedIds.includes(reading.id)) return false;
  return isDayUnlocked(readings, completedIds, reading.day);
}

export function markReadingDone(progress, reading, readings, now = new Date()) {
  const current = normalizeProgress(progress);
  if (!canMarkDone(readings, current.completedIds, reading)) return current;
  const completedIds = [...current.completedIds, reading.id];
  const justFinished = completedIds.length >= PACK_A_TOTAL;
  return {
    ...current,
    completedIds,
    unlockedHomemadeAt: justFinished
      ? current.unlockedHomemadeAt || now.toISOString()
      : null,
  };
}

export function packAComplete(progress) {
  return normalizeProgress(progress).completedIds.length >= PACK_A_TOTAL;
}

export function dailyDefaultPackId(progress) {
  return packAComplete(progress) ? PACK_B_ID : PACK_A_ID;
}

export function loadProgress(storage = globalThis.localStorage) {
  if (!storage) return emptyProgress();
  try {
    const primary = storage.getItem(STORAGE_KEY);
    if (primary) return parseProgressJson(primary);
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = parseProgressJson(legacy);
      storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch {
    /* private mode / quota */
  }
  return emptyProgress();
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  const next = normalizeProgress(progress);
  if (!storage) return next;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function pickRandom(readings, excludeId) {
  const pool = readings.filter((item) => item.id !== excludeId);
  const list = pool.length ? pool : readings;
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}
