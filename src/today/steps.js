import { civilDateKey } from "../calendar/civil.js";

export const STEPS_STORAGE_KEY = "mindpal.todaySteps.v1";

export const STEP_IDS = ["readings", "focus", "journal", "later", "evening"];

export const STEP_META = {
  readings: {
    id: "readings",
    number: 1,
    when: "Morning",
    title: "Readings",
    blurb: "A verse, a prayer, and today’s pack reading.",
  },
  focus: {
    id: "focus",
    number: 2,
    when: "Morning",
    title: "A Focus moment",
    blurb: "One small practice for what’s on your mind.",
  },
  journal: {
    id: "journal",
    number: 3,
    when: "Anytime",
    title: "Journal",
    blurb: "A few lines — only if you want them written down.",
  },
  later: {
    id: "later",
    number: 4,
    when: "Later",
    title: "A later pause",
    blurb: "Optional. A breath or another small activity when the day has room.",
    optional: true,
  },
  evening: {
    id: "evening",
    number: 5,
    when: "Evening",
    title: "Before you sleep",
    blurb: "Read today’s wins together, then a short wind-down note in Journal.",
  },
};

export function emptyDay(date = new Date()) {
  return {
    version: 1,
    date: civilDateKey(date),
    steps: {
      readings: "todo",
      focus: "todo",
      journal: "todo",
      later: "todo",
      evening: "todo",
    },
  };
}

export function normalizeDay(raw, date = new Date()) {
  const today = civilDateKey(date);
  const base = emptyDay(date);
  if (!raw || typeof raw !== "object") return base;
  if (raw.date !== today) return base;
  const steps = { ...base.steps };
  for (const id of STEP_IDS) {
    const value = raw.steps?.[id];
    steps[id] = value === "done" || value === "skipped" ? value : "todo";
  }
  return { version: 1, date: today, steps };
}

export function parseDayJson(text, date = new Date()) {
  if (!text || typeof text !== "string") return emptyDay(date);
  try {
    return normalizeDay(JSON.parse(text), date);
  } catch {
    return emptyDay(date);
  }
}

export function loadDay(storage = globalThis.localStorage, date = new Date()) {
  if (!storage) return emptyDay(date);
  try {
    return parseDayJson(storage.getItem(STEPS_STORAGE_KEY), date);
  } catch {
    return emptyDay(date);
  }
}

export function saveDay(day, storage = globalThis.localStorage, date = new Date()) {
  const next = normalizeDay(day, date);
  if (!storage) return next;
  try {
    storage.setItem(STEPS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function markStep(day, stepId, status, date = new Date()) {
  if (!STEP_IDS.includes(stepId)) return normalizeDay(day, date);
  if (status !== "done" && status !== "skipped" && status !== "todo") {
    return normalizeDay(day, date);
  }
  const current = normalizeDay(day, date);
  return {
    ...current,
    steps: { ...current.steps, [stepId]: status },
  };
}

export function nextStepId(day) {
  const steps = day?.steps || emptyDay().steps;
  return STEP_IDS.find((id) => steps[id] === "todo") || null;
}

export function stepStatus(day, stepId) {
  return day?.steps?.[stepId] === "done" || day?.steps?.[stepId] === "skipped"
    ? day.steps[stepId]
    : "todo";
}
