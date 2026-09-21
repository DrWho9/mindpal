import { civilDateKey } from "../calendar/civil.js";
import {
  pickPeacefulReading,
  peacefulReadings,
} from "./team-ritual.js";

export const GROWTH_STORAGE_KEY = "mindpal.individualGrowth.v1";
export const GROWTH_CHANGE_EVENT = "mindpal-individual-growth-change";

export const GROWTH_TITLE = "MindPal individual growth";
export const GROWTH_SHORT = "Your morning with MindPal";
export const GROWTH_EYEBROW = "MINDPAL · INDIVIDUAL GROWTH";
export const GROWTH_OPEN =
  "MindPal is glad you’re here — settle in before the day gets loud.";
export const GROWTH_LEDE =
  "Four quiet steps for you: settle, a verse, one peaceful reading, then one win or intention. Nobody is keeping score.";
export const GROWTH_HINT =
  "Tap a step to open it. One at a time — settle first, then the words, then a win.";
export const GROWTH_FLOW =
  "Step 1 Settle, then Step 2 Verse, then Step 3 Peaceful reading, then Step 4 One win.";
export const GROWTH_BREATH_HERO =
  "About three minutes for you — not a team ritual. Follow Maddy if you’d like company — inhale 4, hold 4, exhale 6. MindPal counts down each phase. The clock keeps going after the clip ends.";
export const GROWTH_VERSE_HERO =
  "MindPal keeps today’s verse optional. If you named a tradition, we use that lane. If not, a gentle non-faith teaching from the same catalog — never invented scripture.";
export const GROWTH_READING_HERO =
  "One gentle Pack A piece for this morning. Opening here does not mark a Pack A day Done.";
export const GROWTH_WIN_HERO =
  "Name one win or one intention for the day. A sentence is enough. Small counts.";
export const GROWTH_CHAPTER_SUMMARY = "Read the whole chapter — tap to expand";

export const GROWTH_STEP_IDS = ["settle", "verse", "reading", "win"];

export const GROWTH_STEPS = {
  settle: {
    id: "settle",
    number: 1,
    title: "Settle / breathe",
    rowLabel: "Settle / breathe",
    blurb: "A personal timed breath with MindPal. Countdown cues, then I’m done when you’ve had enough.",
  },
  verse: {
    id: "verse",
    number: 2,
    title: "Verse of the day",
    rowLabel: "Verse of the day",
    blurb: "Today’s verse from the MindPal catalog. Expand the chapter if you want the surrounding lines.",
  },
  reading: {
    id: "reading",
    number: 3,
    title: "Peaceful reading",
    rowLabel: "Peaceful reading",
    blurb: "One gentle Pack A piece is enough. Not a problem hub.",
  },
  win: {
    id: "win",
    number: 4,
    title: "One win / intention",
    rowLabel: "One win / intention",
    blurb: "One win or intention for the day — or skip and come back tonight.",
  },
};

function asStatus(value) {
  return value === "done" || value === "skipped" ? value : "todo";
}

export function emptyGrowth(pack, date = new Date()) {
  const reading = pickPeacefulReading(pack, date);
  return {
    version: 1,
    date: civilDateKey(date),
    settle: "todo",
    verse: "todo",
    reading: "todo",
    win: "todo",
    readingId: reading?.id || null,
  };
}

export function normalizeGrowth(raw, pack, date = new Date()) {
  const today = civilDateKey(date);
  const base = emptyGrowth(pack, date);
  if (!raw || typeof raw !== "object") return base;
  if (raw.date !== today) return base;
  const pool = peacefulReadings(pack);
  const readingId = pool.some((item) => item.id === raw.readingId)
    ? raw.readingId
    : base.readingId;
  const settle = asStatus(raw.settle);
  let verse = asStatus(raw.verse);
  let reading = asStatus(raw.reading);
  let win = asStatus(raw.win);
  if (verse !== "todo" && settle === "todo") verse = "todo";
  if (reading !== "todo" && verse === "todo") reading = "todo";
  if (win !== "todo" && reading === "todo") win = "todo";
  return { version: 1, date: today, settle, verse, reading, win, readingId };
}

export function parseGrowthJson(text, pack, date = new Date()) {
  if (!text || typeof text !== "string") return emptyGrowth(pack, date);
  try {
    return normalizeGrowth(JSON.parse(text), pack, date);
  } catch {
    return emptyGrowth(pack, date);
  }
}

export function loadGrowth(pack, storage = globalThis.localStorage, date = new Date()) {
  if (!storage) return emptyGrowth(pack, date);
  try {
    return parseGrowthJson(storage.getItem(GROWTH_STORAGE_KEY), pack, date);
  } catch {
    return emptyGrowth(pack, date);
  }
}

export function saveGrowth(growth, pack, storage = globalThis.localStorage, date = new Date()) {
  const next = normalizeGrowth(growth, pack, date);
  if (!storage) return next;
  try {
    storage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function growthStepStatus(growth, stepId) {
  if (!GROWTH_STEP_IDS.includes(stepId)) return "todo";
  return asStatus(growth?.[stepId]);
}

export function canOpenGrowthVerse(growth) {
  const settle = growthStepStatus(growth, "settle");
  return settle === "done" || settle === "skipped";
}

export function canOpenGrowthReading(growth) {
  const verse = growthStepStatus(growth, "verse");
  return verse === "done" || verse === "skipped";
}

export function canOpenGrowthWin(growth) {
  const reading = growthStepStatus(growth, "reading");
  return reading === "done" || reading === "skipped";
}

export function canOpenGrowthStep(growth, stepId) {
  if (stepId === "settle") return true;
  if (stepId === "verse") return canOpenGrowthVerse(growth);
  if (stepId === "reading") return canOpenGrowthReading(growth);
  if (stepId === "win") return canOpenGrowthWin(growth);
  return false;
}

export function markGrowth(growth, stepId, status, pack, date = new Date()) {
  if (!GROWTH_STEP_IDS.includes(stepId)) return normalizeGrowth(growth, pack, date);
  if (status !== "done" && status !== "skipped" && status !== "todo") {
    return normalizeGrowth(growth, pack, date);
  }
  const current = normalizeGrowth(growth, pack, date);
  if (stepId !== "settle" && status !== "todo" && !canOpenGrowthStep(current, stepId)) {
    return current;
  }
  return { ...current, [stepId]: status };
}

export function nextGrowthStep(growth) {
  if (growthStepStatus(growth, "settle") === "todo") return "settle";
  if (growthStepStatus(growth, "verse") === "todo") return "verse";
  if (growthStepStatus(growth, "reading") === "todo") return "reading";
  if (growthStepStatus(growth, "win") === "todo") return "win";
  return null;
}

export function growthReading(pack, growth) {
  const id = growth?.readingId;
  const pool = peacefulReadings(pack);
  return pool.find((item) => item.id === id) || pickPeacefulReading(pack) || null;
}

export function notifyGrowthChange(win = globalThis.window) {
  try {
    win?.dispatchEvent?.(new Event(GROWTH_CHANGE_EVENT));
  } catch {
    /* listeners are optional */
  }
}
