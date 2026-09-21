import { civilDateKey } from "../calendar/civil.js";

export const THREAD_STORAGE_KEY = "mindpal.reflect.thread.v1";
export const MESSAGE_TEXT_MAX = 2000;
const MAX_MESSAGES = 80;

export function emptyThread(date = new Date()) {
  return {
    version: 1,
    date: civilDateKey(date),
    messages: [],
    crisis: false,
  };
}

export function normalizeMessage(raw, fallbackAt = new Date()) {
  if (!raw || typeof raw !== "object") return null;
  const role = raw.role === "user" || raw.role === "assistant" || raw.role === "note" ? raw.role : "";
  const text = typeof raw.text === "string" ? raw.text.trim().slice(0, MESSAGE_TEXT_MAX) : "";
  if (!role || !text) return null;
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `msg-${fallbackAt.getTime()}-${Math.random().toString(16).slice(2, 8)}`;
  const at =
    typeof raw.at === "string" && raw.at ? raw.at : fallbackAt.toISOString();
  const message = { id, role, text, at };
  if (raw.kind === "crisis" || raw.kind === "unavailable" || raw.kind === "disclosure") {
    message.kind = raw.kind;
  }
  return message;
}

export function normalizeThread(raw, today = new Date()) {
  const fresh = emptyThread(today);
  if (!raw || typeof raw !== "object") return fresh;
  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : fresh.date;
  if (date !== fresh.date) return fresh;
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map((item) => normalizeMessage(item)).filter(Boolean).slice(-MAX_MESSAGES)
    : [];
  return {
    version: 1,
    date,
    messages,
    crisis: raw.crisis === true,
  };
}

export function parseThreadJson(text, today = new Date()) {
  if (!text || typeof text !== "string") return emptyThread(today);
  try {
    return normalizeThread(JSON.parse(text), today);
  } catch {
    return emptyThread(today);
  }
}

function readStorage(storage, key = THREAD_STORAGE_KEY) {
  if (!storage || typeof storage.getItem !== "function") return "";
  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

export function loadThread(
  storage = globalThis.localStorage,
  today = new Date(),
  key = THREAD_STORAGE_KEY,
) {
  return parseThreadJson(readStorage(storage, key), today);
}

export function saveThread(
  thread,
  storage = globalThis.localStorage,
  today = new Date(),
  key = THREAD_STORAGE_KEY,
) {
  const next = normalizeThread(thread, today);
  if (!storage || typeof storage.setItem !== "function") return next;
  try {
    storage.setItem(key, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function clearThread(
  storage = globalThis.localStorage,
  today = new Date(),
  key = THREAD_STORAGE_KEY,
) {
  const next = emptyThread(today);
  if (storage && typeof storage.removeItem === "function") {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function appendMessage(
  thread,
  raw,
  storage = globalThis.localStorage,
  today = new Date(),
  key = THREAD_STORAGE_KEY,
) {
  const message = normalizeMessage(raw, today);
  if (!message) return normalizeThread(thread, today);
  const current = normalizeThread(thread, today);
  current.messages = [...current.messages, message].slice(-MAX_MESSAGES);
  if (raw && raw.kind === "crisis") current.crisis = true;
  return saveThread(current, storage, today, key);
}

export function downloadableTranscript(thread, title = "MindPal reflection — user-entered, not assessed") {
  const threadDate = typeof thread?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(thread.date)
    ? thread.date
    : null;
  const today = threadDate ? new Date(`${threadDate}T12:00:00`) : new Date();
  const current = normalizeThread(thread, today);
  const lines = [
    title,
    `Date: ${current.date}`,
    "",
    ...current.messages.map((item) => {
      const who = item.role === "user" ? "You" : item.role === "assistant" ? "MindPal" : "Note";
      return `${who}: ${item.text}`;
    }),
  ];
  return lines.join("\n");
}
