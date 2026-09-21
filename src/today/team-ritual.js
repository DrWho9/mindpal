import { civilDateKey } from "../calendar/civil.js";

export const TEAM_RITUAL_STORAGE_KEY = "mindpal.teamMorningRitual.v1";
export const TEAM_RITUAL_CHANGE_EVENT = "mindpal-team-ritual-change";

export const TEAM_RITUAL_TITLE = "Work team morning ritual";
export const TEAM_RITUAL_SHORT = "Team morning settle";
export const TEAM_RITUAL_EYEBROW = "OPTIONAL · WORK TEAM";
export const TEAM_RITUAL_LEDE =
  "Arrive, then start. Three quiet minutes for the body, then one peaceful reading. Optional — nobody is keeping score.";
export const TEAM_RITUAL_HINT =
  "Tap to expand. Breath first, so the words can land.";

export const TEAM_RITUAL_BREATH_ID = "maddy-timed-breath";
export const TEAM_RITUAL_BREATH_SRC = "/videos/maddy/timed-breath.mp4";

export const RITUAL_STEP_IDS = ["breathe", "reading"];

export const RITUAL_STEPS = {
  breathe: {
    id: "breathe",
    number: 1,
    title: "Breathe",
    rowLabel: "Breathe (~3 min)",
    blurb: "Settle the body first. Follow Maddy’s timed breath, or the quiet cues here.",
  },
  reading: {
    id: "reading",
    number: 2,
    title: "Peaceful reading",
    rowLabel: "Peaceful reading",
    blurb: "One gentle Pack A piece is enough. Not a problem hub.",
  },
};

/** Calm / gratitude / mindset-adjacent Pack A mornings — not heavy support hubs. */
export const PEACEFUL_THEME_LABELS = [
  "gratitude for small",
  "compassion",
  "connection",
  "listening",
  "recognition",
  "joy",
  "appreciation",
  "specific thanks",
  "lightness",
  "receiving",
  "joy permission",
  "ordinary life",
];

export const HEAVY_RITUAL_TAGS = [
  "aod",
  "mothers",
  "sleep",
  "anxiety",
  "drugs",
  "alcohol",
  "craving",
];

/** ~3 minutes. Maddy’s clip is shorter; the timer keeps the gentle cues going. */
export const BREATH_DURATION_SEC = 180;
export const BREATH_COUNT_SEC = 1.5;
export const BREATH_INHALE_COUNTS = 4;
export const BREATH_HOLD_COUNTS = 4;
export const BREATH_EXHALE_COUNTS = 6;
export const BREATH_SETTLE_SEC = 8;
export const BREATH_CYCLE_SEC =
  (BREATH_INHALE_COUNTS + BREATH_HOLD_COUNTS + BREATH_EXHALE_COUNTS) * BREATH_COUNT_SEC;

function readingTags(reading) {
  const tags = [];
  if (Array.isArray(reading?.theme_tags)) tags.push(...reading.theme_tags);
  if (Array.isArray(reading?.tags)) tags.push(...reading.tags);
  if (Array.isArray(reading?.problemTags)) tags.push(...reading.problemTags);
  return tags;
}

export function stableIndex(key, length) {
  const size = Number(length) || 0;
  if (size <= 0) return 0;
  const text = String(key || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

export function peacefulReadings(pack) {
  const list = Array.isArray(pack?.readings) ? pack.readings : [];
  return list.filter((item) => {
    if (!item || !PEACEFUL_THEME_LABELS.includes(item.theme_label)) return false;
    return !readingTags(item).some((tag) => HEAVY_RITUAL_TAGS.includes(tag));
  });
}

export function pickPeacefulReading(pack, date = new Date(), excludeId) {
  const pool = peacefulReadings(pack).filter((item) => item.id !== excludeId);
  if (!pool.length) return null;
  return pool[stableIndex(civilDateKey(date), pool.length)];
}

export function breathClip(catalog) {
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : [];
  return videos.find((item) => item?.id === TEAM_RITUAL_BREATH_ID) || null;
}

export function breathClipSrc(catalog) {
  const clip = breathClip(catalog);
  return clip?.src || clip?.videoUrl || TEAM_RITUAL_BREATH_SRC;
}

export function formatBreathClock(remainingSec) {
  const n = Math.max(0, Math.ceil(Number(remainingSec) || 0));
  const minutes = Math.floor(n / 60);
  const seconds = n % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function breathCueAt(elapsedSec) {
  const elapsed = Math.max(0, Number(elapsedSec) || 0);
  if (elapsed >= BREATH_DURATION_SEC) {
    return { phase: "done", label: "That’s enough. Let the next breath be ordinary." };
  }
  if (elapsed < BREATH_SETTLE_SEC) {
    return { phase: "settle", label: "Settle in. Soften the jaw and drop the shoulders." };
  }
  const t = (elapsed - BREATH_SETTLE_SEC) % BREATH_CYCLE_SEC;
  const inhale = BREATH_INHALE_COUNTS * BREATH_COUNT_SEC;
  const hold = inhale + BREATH_HOLD_COUNTS * BREATH_COUNT_SEC;
  if (t < inhale) return { phase: "inhale", label: "Inhale gently…" };
  if (t < hold) return { phase: "hold", label: "Hold softly…" };
  return { phase: "exhale", label: "Exhale, unhurried…" };
}

function asStatus(value) {
  return value === "done" || value === "skipped" ? value : "todo";
}

export function emptyRitual(pack, date = new Date()) {
  const reading = pickPeacefulReading(pack, date);
  return {
    version: 1,
    date: civilDateKey(date),
    breathe: "todo",
    reading: "todo",
    readingId: reading?.id || null,
  };
}

export function normalizeRitual(raw, pack, date = new Date()) {
  const today = civilDateKey(date);
  const base = emptyRitual(pack, date);
  if (!raw || typeof raw !== "object") return base;
  if (raw.date !== today) return base;
  const pool = peacefulReadings(pack);
  const readingId = pool.some((item) => item.id === raw.readingId)
    ? raw.readingId
    : base.readingId;
  const breathe = asStatus(raw.breathe);
  let reading = asStatus(raw.reading);
  if (reading !== "todo" && breathe === "todo") reading = "todo";
  return { version: 1, date: today, breathe, reading, readingId };
}

export function parseRitualJson(text, pack, date = new Date()) {
  if (!text || typeof text !== "string") return emptyRitual(pack, date);
  try {
    return normalizeRitual(JSON.parse(text), pack, date);
  } catch {
    return emptyRitual(pack, date);
  }
}

export function loadRitual(pack, storage = globalThis.localStorage, date = new Date()) {
  if (!storage) return emptyRitual(pack, date);
  try {
    return parseRitualJson(storage.getItem(TEAM_RITUAL_STORAGE_KEY), pack, date);
  } catch {
    return emptyRitual(pack, date);
  }
}

export function saveRitual(ritual, pack, storage = globalThis.localStorage, date = new Date()) {
  const next = normalizeRitual(ritual, pack, date);
  if (!storage) return next;
  try {
    storage.setItem(TEAM_RITUAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function ritualStepStatus(ritual, stepId) {
  if (!RITUAL_STEP_IDS.includes(stepId)) return "todo";
  return asStatus(ritual?.[stepId]);
}

export function canOpenReading(ritual) {
  const breathe = ritualStepStatus(ritual, "breathe");
  return breathe === "done" || breathe === "skipped";
}

export function markRitual(ritual, stepId, status, pack, date = new Date()) {
  if (!RITUAL_STEP_IDS.includes(stepId)) return normalizeRitual(ritual, pack, date);
  if (status !== "done" && status !== "skipped" && status !== "todo") {
    return normalizeRitual(ritual, pack, date);
  }
  const current = normalizeRitual(ritual, pack, date);
  if (stepId === "reading" && status !== "todo" && !canOpenReading(current)) {
    return current;
  }
  return { ...current, [stepId]: status };
}

export function nextRitualStep(ritual) {
  if (ritualStepStatus(ritual, "breathe") === "todo") return "breathe";
  if (ritualStepStatus(ritual, "reading") === "todo") return "reading";
  return null;
}

export function ritualReading(pack, ritual) {
  const id = ritual?.readingId;
  const pool = peacefulReadings(pack);
  return pool.find((item) => item.id === id) || pickPeacefulReading(pack) || null;
}

export function notifyRitualChange(win = globalThis.window) {
  try {
    win?.dispatchEvent?.(new Event(TEAM_RITUAL_CHANGE_EVENT));
  } catch {
    /* listeners are optional */
  }
}
