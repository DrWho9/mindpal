import { civilDateKey } from "../calendar/civil.js";

export const STEPS_STORAGE_KEY = "mindpal.todaySteps.v1";

export const STEP_IDS = ["readings", "focus", "later", "evening"];

export const HUB_FLOW_LINE = "Follow today’s steps — Morning, Day, then Night.";

export const STEP_META = {
  readings: {
    id: "readings",
    number: 1,
    when: "Morning",
    title: "Readings",
    rowLabel: "Readings — Verse of the day",
    blurb: "A verse (tucked away until you want it) and today’s pack reading.",
  },
  focus: {
    id: "focus",
    number: 2,
    when: "Day",
    title: "A Focus moment",
    rowLabel: "A Focus moment",
    blurb: "One small practice for what’s on your mind.",
  },
  later: {
    id: "later",
    number: 3,
    when: "Day",
    title: "A later pause",
    rowLabel: "A later pause",
    blurb: "Optional. A breath or another small activity when the day has room.",
    optional: true,
  },
  evening: {
    id: "evening",
    number: 4,
    when: "Night",
    title: "Before you sleep",
    rowLabel: "Before you sleep",
    blurb: "Read today’s wins, then a short wind-down note in Journal.",
  },
};

export const BANDS = [
  {
    id: "morning",
    title: "Morning",
    lede: "Start gently. One reading is enough.",
    stepIds: ["readings"],
  },
  {
    id: "day",
    title: "Day",
    lede: "One focus, then an optional pause.",
    stepIds: ["focus", "later"],
  },
  {
    id: "night",
    title: "Night",
    lede: "Close the day with wins and a short diary note.",
    stepIds: ["evening"],
  },
];

export function stepRowLabel(stepId) {
  const meta = STEP_META[stepId];
  if (!meta) return "";
  return meta.rowLabel || meta.title;
}

export function hubStepCaption(stepId) {
  const meta = STEP_META[stepId];
  if (!meta) return "";
  return `Step ${meta.number} · ${stepRowLabel(stepId)}`;
}

export function emptyDay(date = new Date()) {
  return {
    version: 1,
    date: civilDateKey(date),
    steps: {
      readings: "todo",
      focus: "todo",
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

export function bandForStep(stepId) {
  return BANDS.find((band) => band.stepIds.includes(stepId)) || null;
}
