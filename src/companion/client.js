/** Existing MindPal companion proxy, same paths the vendor Companion page uses. */

export const COMPANION_POLICY_VERSION = "companion-ai-v1";
export const DEFAULT_PAGES_BASE = "/mindpal/";
export const BASE_STORAGE_KEY = "mindpal.companion.base";
export const BASE_WINDOW_KEY = "MINDPAL_COMPANION_BASE";
export const SAFETY_STATES = ["ordinary", "distress", "concern_uncertain", "urgent"];
export const LIVE_LABEL = "Live";
export const DEMO_LABEL = "Demo · companion API not connected";
export const UNAVAILABLE_NOTE =
  "Not sent — MindPal is not live on this page, so no reply was generated. Messages stay on this device.";

export function normalizeCompanionBase(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export function storedCompanionBase(source = globalThis) {
  try {
    const storage = source?.localStorage;
    if (!storage || typeof storage.getItem !== "function") return "";
    return normalizeCompanionBase(storage.getItem(BASE_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function persistCompanionBase(value, source = globalThis) {
  const next = normalizeCompanionBase(value);
  try {
    const storage = source?.localStorage;
    if (!storage) return next;
    if (!next) storage.removeItem(BASE_STORAGE_KEY);
    else storage.setItem(BASE_STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  return next;
}

export function joinCompanionUrl(base, path) {
  const root = String(base || DEFAULT_PAGES_BASE);
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return `${prefix}${String(path || "").replace(/^\//, "")}`;
}

export function resolveCompanionBase(source = globalThis) {
  const fromWindow =
    source && typeof source[BASE_WINDOW_KEY] === "string"
      ? source[BASE_WINDOW_KEY].trim()
      : "";
  if (fromWindow) return fromWindow.endsWith("/") ? fromWindow : `${fromWindow}/`;

  try {
    const stored =
      source?.localStorage && typeof source.localStorage.getItem === "function"
        ? source.localStorage.getItem(BASE_STORAGE_KEY) || ""
        : "";
    const value = String(stored).trim();
    if (value) return value.endsWith("/") ? value : `${value}/`;
  } catch {
    /* private mode */
  }

  const meta =
    source?.document && typeof source.document.querySelector === "function"
      ? source.document.querySelector('meta[name="mindpal-companion-base"]')
      : null;
  const content = meta && typeof meta.content === "string" ? meta.content.trim() : "";
  if (content) return content.endsWith("/") ? content : `${content}/`;

  return DEFAULT_PAGES_BASE;
}

export function companionUrl(kind, base = DEFAULT_PAGES_BASE) {
  const leaf = kind === "chat" ? "chat" : "status";
  return joinCompanionUrl(base, `api/companion/${leaf}`);
}

export function parseCompanionStatus(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { available: false, model: null, medicalKey: false };
  }
  return {
    available: raw.available === true,
    model: typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : null,
    medicalKey: raw.medicalKey === true,
  };
}

export async function fetchCompanionStatus(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const base = options.base ?? resolveCompanionBase(options.source ?? globalThis);
  const timeoutMs = options.timeoutMs ?? 1500;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { available: false, model: null, reason: "offline" };
  }
  if (typeof fetchImpl !== "function") {
    return { available: false, model: null, reason: "unavailable" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(companionUrl("status", base), {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { available: false, model: null, reason: "unavailable" };
    const parsed = parseCompanionStatus(await response.json());
    return { ...parsed, reason: parsed.available ? "ok" : "unavailable" };
  } catch {
    return { available: false, model: null, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export function parseCompanionReply(raw, request) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (!request || raw.requestId !== request.requestId) return null;
  if (raw.policyVersion !== request.policyVersion) return null;
  const kind = String(raw.kind || "");
  if (kind !== "reply" && kind !== "human_help") return null;
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : "";
  if (!reply || reply.length > 1200) return null;
  const modelDisclosure =
    typeof raw.modelDisclosure === "string" && raw.modelDisclosure.trim()
      ? raw.modelDisclosure.trim()
      : "MindPal companion — software, not a therapist.";
  return {
    requestId: request.requestId,
    policyVersion: request.policyVersion,
    kind,
    reply,
    modelDisclosure,
  };
}

export function buildChatRequest({
  message,
  messages = [],
  system = "",
  lane = "reflect",
  safetyState = "ordinary",
  requestId,
} = {}) {
  const text = typeof message === "string" ? message.trim() : "";
  const state = SAFETY_STATES.includes(safetyState) ? safetyState : "ordinary";
  return {
    requestId: requestId || (globalThis.crypto?.randomUUID?.() ?? `mp-${Date.now()}`),
    policyVersion: COMPANION_POLICY_VERSION,
    safetyState: state,
    message: text.slice(0, 2000),
    lane,
    system: typeof system === "string" ? system : "",
    messages: Array.isArray(messages)
      ? messages
          .filter((item) => item && (item.role === "user" || item.role === "assistant"))
          .map((item) => ({
            role: item.role,
            content: String(item.content ?? item.text ?? "").slice(0, 2000),
          }))
          .filter((item) => item.content.trim())
          .slice(-16)
      : [],
  };
}

export async function sendCompanionChat(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const base = options.base ?? resolveCompanionBase(options.source ?? globalThis);
  const timeoutMs = options.timeoutMs ?? 15000;
  const request = buildChatRequest(options);
  if (!request.message) return { kind: "unavailable", request };
  if (typeof fetchImpl !== "function") return { kind: "unavailable", request };

  const controller = options.signal ? null : new AbortController();
  const signal = options.signal ?? controller.signal;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(companionUrl("chat", base), {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json")) {
      return { kind: "unavailable", request };
    }
    const text = await response.text();
    if (text.length > 6000) return { kind: "unavailable", request };
    const parsed = parseCompanionReply(JSON.parse(text), request);
    return parsed ? { kind: "reply", value: parsed, request } : { kind: "unavailable", request };
  } catch {
    return { kind: "unavailable", request };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
