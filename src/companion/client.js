/** Existing MindPal companion proxy, same paths the vendor Companion page uses. */

export const COMPANION_POLICY_VERSION = "companion-ai-v1";
export const DEFAULT_PAGES_BASE = "/mindpal/";
export const BASE_STORAGE_KEY = "mindpal.companion.base";
export const BASE_WINDOW_KEY = "MINDPAL_COMPANION_BASE";
export const SAFETY_STATES = ["ordinary", "distress", "concern_uncertain", "urgent"];
export const LIVE_LABEL = "Live";
export const DEMO_LABEL = "Demo · live chat is off";
export const SUGGESTED_COMPANION_BASE =
  "https://mindpal-companion.steps2life-and-flawless-aesthestics.workers.dev/";
export const DEMO_HOLD_NOTE =
  "That note stays on this phone. Live chat is off, so it was not sent and no reply was written. Practice choices are below.";
export const UNAVAILABLE_NOTE =
  "Not sent — MindPal is not live on this phone, so no reply was written. Your message stays on this device.";

export function companionFailureCopy(reason) {
  switch (reason) {
    case "empty":
      return "Type a message first, or use the practice choices.";
    case "timeout":
      return "That took too long, so no reply was written. Your message is back in the box — tap Send to try again.";
    case "offline":
      return "You look offline, so this was not sent. It stays on this phone until you are back online.";
    default:
      return "MindPal could not get a reply just now. Nothing was invented. Your message stays on this phone — try again, or use the practice choices.";
  }
}

export function companionStatusCopy(status = {}, options = {}) {
  const surface = options.surface || "companion";
  const saved = String(options.savedBase || "").trim();
  const available = status?.available === true;
  const reason = status?.reason || (available ? "ok" : "pending");
  if (reason === "pending" || status?.status === "checking") {
    return {
      label: "Checking…",
      detail: "Looking for live chat. You can keep going while this finishes.",
    };
  }
  if (available) {
    const model = typeof status.model === "string" && status.model.trim() ? status.model.trim() : "";
    const where = surface === "appointment" ? "Appointment chat is on" : "Live chat is on";
    return {
      label: LIVE_LABEL,
      detail: model
        ? `${where} (${model}). Your message is sent only when you tap Send.`
        : `${where}. Your message is sent only when you tap Send.`,
    };
  }
  if (reason === "offline") {
    return {
      label: "Offline",
      detail:
        surface === "appointment"
          ? "You look offline. Nothing is sent, and this screen will not invent a medical reply."
          : "You look offline. Nothing is sent. Try again when this phone is back online.",
    };
  }
  if (reason === "timeout") {
    return {
      label: "Demo",
      detail: "Live chat did not answer in time. Tap Check again. Nothing was invented.",
    };
  }
  if (saved) {
    return {
      label: "Demo",
      detail:
        surface === "appointment"
          ? "The saved address did not answer. Check it below. This screen will not invent a medical reply."
          : "The saved address did not answer. Check it below, or tap Check again. Nothing was sent.",
    };
  }
  const off =
    surface === "appointment"
      ? "Live chat is off on this phone until you save the companion address below. This screen will not invent a medical reply."
      : surface === "reflect"
        ? "Live chat is off on this phone until you save the companion address below. Your words stay here until you do."
        : "Live chat is off on this phone until you save the companion address below. Practice choices still work, and nothing you type is sent.";
  return { label: "Demo", detail: off };
}

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

export function companionBaseFromSearch(search = "") {
  const query = String(search || "");
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const fromQuery = params.get("companionBase");
  if (!fromQuery) return "";
  return normalizeCompanionBase(fromQuery);
}

export function resolveCompanionBase(source = globalThis) {
  const fromQuery = companionBaseFromSearch(source?.location?.search || "");
  if (fromQuery) return fromQuery;

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
  const timeoutMs = options.timeoutMs ?? 8000;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { available: false, model: null, medicalKey: false, reason: "offline" };
  }
  if (typeof fetchImpl !== "function") {
    return { available: false, model: null, medicalKey: false, reason: "unavailable" };
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
    if (!response.ok) return { available: false, model: null, medicalKey: false, reason: "unavailable" };
    const parsed = parseCompanionStatus(await response.json());
    return { ...parsed, reason: parsed.available ? "ok" : "unavailable" };
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return {
      available: false,
      model: null,
      medicalKey: false,
      reason: timedOut ? "timeout" : "unavailable",
    };
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

function randomRequestId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  } catch {
    /* insecure context */
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
    requestId: requestId || randomRequestId(),
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
  const timeoutMs = options.timeoutMs ?? 20000;
  const request = buildChatRequest(options);
  if (!request.message) return { kind: "unavailable", reason: "empty", request };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "unavailable", reason: "offline", request };
  }
  if (typeof fetchImpl !== "function") return { kind: "unavailable", reason: "unavailable", request };

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
      return { kind: "unavailable", reason: "unavailable", request };
    }
    const text = await response.text();
    if (text.length > 6000) return { kind: "unavailable", reason: "unavailable", request };
    const parsed = parseCompanionReply(JSON.parse(text), request);
    return parsed
      ? { kind: "reply", value: parsed, request }
      : { kind: "unavailable", reason: "unavailable", request };
  } catch (error) {
    const timedOut = !options.signal && error?.name === "AbortError";
    return { kind: "unavailable", reason: timedOut ? "timeout" : "unavailable", request };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
