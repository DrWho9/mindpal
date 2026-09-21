/** Local Companion demo — works without Live AI. Bryan owns the proxy. */

/** Same localStorage key as src/companion/client.js so Reflect / Appointment share Live. */
export const COMPANION_BASE_KEY = "mindpal.companion.base";
export const DEFAULT_COMPANION_BASE = "/mindpal/";
export const COMPANION_POLICY_VERSION = "companion-ai-v1";
export const HELP_ROUTE = "Get support";
export const REFLECT_ROUTE = "Reflect";
export const BREATH_EXERCISE_ID = "E01";

export const DEMO_BANNER = "DETERMINISTIC DEMO · NO LIVE AI";
export const LIVE_BANNER = "LIVE AI COMPANION · XAI GROK";

export const CHOICES = [
  { id: "ordinary", label: "A small exercise", kind: "practice" },
  { id: "distress", label: "I’m distressed", kind: "crisis" },
  { id: "concern_uncertain", label: "I’m not sure I’m safe", kind: "crisis" },
  { id: "urgent", label: "Immediate help", kind: "crisis" },
];

export const INTENT_PANELS = {
  ordinary: {
    title: "A small, optional exercise",
    body: "Nothing here is assessed. When you are ready, show practice choices for a breath, a one-sentence reframe, a tiny next step, or Reflect.",
  },
  distress: {
    title: "Human help comes first",
    body: "If this stretch feels too heavy, use Help — Lifeline 13 11 14, or 000 in an emergency. MindPal cannot monitor you or summon help.",
  },
  concern_uncertain: {
    title: "If you are not sure you are safe",
    body: "Please use human support now. In Australia call Lifeline 13 11 14, or 000 if you are in immediate danger.",
  },
  urgent: {
    title: "Immediate help",
    body: "If you are in immediate danger in Australia, call 000. Lifeline is 13 11 14. MindPal cannot contact anyone for you.",
  },
};

export const CRISIS_LINES = {
  emergency: { label: "Emergency", number: "000", href: "tel:000" },
  lifeline: { label: "Lifeline", number: "13 11 14", href: "tel:131114" },
};

export const PRACTICE_CARDS = [
  {
    id: "breath",
    title: "A short breath",
    teaser: "A few quiet cycles, without forcing the air.",
    body: "Notice the air moving in and out for a few cycles, without forcing it.",
    cta: "Open a steady-detail pause",
    action: { type: "exercise", exerciseId: BREATH_EXERCISE_ID },
  },
  {
    id: "reframe",
    title: "One sentence reframe",
    teaser: "A kind sentence you can try, change, or skip.",
    body: "Try: “This is a hard stretch, and I can take the next minute kindly.” You can change the words, or skip them.",
    cta: "Show the sentence",
    action: { type: "expand" },
  },
  {
    id: "next-step",
    title: "A tiny next step",
    teaser: "One thing you could do in the next two minutes — or sit still.",
    body: "Name one thing you could do in the next two minutes — drink water, step outside, or choose to sit still.",
    cta: "Show a tiny step",
    action: { type: "expand" },
  },
  {
    id: "reflect",
    title: "Open Reflect",
    teaser: "A quieter page if a private line would help.",
    body: "A quieter page if a private line would help. Optional — you can leave whenever you like.",
    cta: "Open Reflect",
    action: { type: "route", route: REFLECT_ROUTE },
  },
];

export function choiceById(id) {
  return CHOICES.find((item) => item.id === id) || null;
}

export function isCrisisChoice(id) {
  return choiceById(id)?.kind === "crisis";
}

export function practiceCardById(id) {
  return PRACTICE_CARDS.find((item) => item.id === id) || null;
}

export function emptyCompanionState() {
  return {
    choiceId: "ordinary",
    panel: "intent",
    practicesVisible: false,
    expandedCardId: null,
    status: "demo",
    model: null,
    chatOpen: false,
    navigate: null,
    exerciseId: null,
  };
}

export function companionBanner(state) {
  return state?.status === "live" ? LIVE_BANNER : DEMO_BANNER;
}

export function setCompanionLive(state, status) {
  const available = status?.available === true;
  return {
    ...state,
    status: available ? "live" : "demo",
    model: typeof status?.model === "string" ? status.model : null,
    chatOpen: available ? state.chatOpen : false,
  };
}

export function applyChoice(state, choiceId) {
  const choice = choiceById(choiceId);
  if (!choice) return { ...state, navigate: null, exerciseId: null };
  if (choice.kind === "crisis") {
    return {
      ...state,
      choiceId,
      panel: "crisis",
      practicesVisible: false,
      expandedCardId: null,
      chatOpen: false,
      navigate: HELP_ROUTE,
      exerciseId: null,
    };
  }
  return {
    ...state,
    choiceId,
    panel: "intent",
    practicesVisible: false,
    expandedCardId: null,
    navigate: null,
    exerciseId: null,
  };
}

export function revealPractices(state) {
  if (isCrisisChoice(state.choiceId)) {
    return {
      ...state,
      panel: "crisis",
      practicesVisible: false,
      chatOpen: false,
      navigate: HELP_ROUTE,
      exerciseId: null,
    };
  }
  if (state.panel === "practices" && state.practicesVisible) {
    return {
      ...state,
      panel: "practices",
      practicesVisible: true,
      expandedCardId: state.expandedCardId || "breath",
      navigate: null,
      exerciseId: null,
    };
  }
  return {
    ...state,
    panel: "practices",
    practicesVisible: true,
    expandedCardId: null,
    chatOpen: false,
    navigate: null,
    exerciseId: null,
  };
}

export function activatePracticeCard(state, cardId) {
  const card = practiceCardById(cardId);
  if (!card) return { ...state, navigate: null, exerciseId: null };
  if (card.action.type === "expand") {
    return {
      ...state,
      expandedCardId: state.expandedCardId === cardId ? null : cardId,
      navigate: null,
      exerciseId: null,
    };
  }
  if (card.action.type === "exercise") {
    return {
      ...state,
      expandedCardId: cardId,
      navigate: null,
      exerciseId: card.action.exerciseId,
    };
  }
  return {
    ...state,
    expandedCardId: cardId,
    navigate: card.action.route || null,
    exerciseId: null,
  };
}

export function openLiveChat(state) {
  if (state.status !== "live") return { ...state, navigate: null, exerciseId: null };
  return {
    ...state,
    panel: "chat",
    chatOpen: true,
    navigate: null,
    exerciseId: null,
  };
}

export function primaryCtaLabel(state) {
  if (isCrisisChoice(state.choiceId) || state.panel === "crisis") {
    return "Open Help now";
  }
  return "Show practice choices";
}

export function normalizeCompanionBase(raw) {
  if (typeof raw !== "string") return DEFAULT_COMPANION_BASE;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_COMPANION_BASE;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function companionBaseLookup(deps = {}) {
  const win = deps.window ?? (typeof globalThis !== "undefined" ? globalThis : {});
  return {
    search: win.location?.search || "",
    storage: win.localStorage,
    globalBase: win.MINDPAL_COMPANION_BASE,
  };
}

export function resolveCompanionBaseUrl({
  explicit,
  search = "",
  storage,
  globalBase,
} = {}) {
  if (explicit) return normalizeCompanionBase(explicit);
  const query = String(search || "");
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const fromQuery = params.get("companionBase");
  if (fromQuery) return normalizeCompanionBase(fromQuery);
  if (globalBase) return normalizeCompanionBase(globalBase);
  try {
    const stored = storage?.getItem?.(COMPANION_BASE_KEY);
    if (stored) return normalizeCompanionBase(stored);
  } catch {
    /* storage may be blocked */
  }
  return DEFAULT_COMPANION_BASE;
}

export function saveCompanionBase(raw, storage) {
  const base = normalizeCompanionBase(raw);
  try {
    storage?.setItem?.(COMPANION_BASE_KEY, base);
  } catch {
    /* ignore quota / private mode */
  }
  return base;
}

export function companionStatusUrl(base) {
  return `${normalizeCompanionBase(base)}api/companion/status`;
}

export function companionChatUrl(base) {
  return `${normalizeCompanionBase(base)}api/companion/chat`;
}

export function parseCompanionStatus(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { available: false, model: null };
  }
  return {
    available: payload.available === true,
    model: typeof payload.model === "string" ? payload.model : null,
  };
}

export async function probeCompanionStatus({
  base,
  fetchImpl,
  timeoutMs = 1500,
} = {}) {
  const fetchFn = fetchImpl ?? (typeof fetch === "function" ? fetch : null);
  if (!fetchFn) return { available: false, model: null };
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort?.(), timeoutMs);
  try {
    const res = await fetchFn(companionStatusUrl(base), {
      method: "GET",
      signal: ctrl?.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res?.ok) return { available: false, model: null };
    return parseCompanionStatus(await res.json());
  } catch {
    return { available: false, model: null };
  } finally {
    clearTimeout(timer);
  }
}

export function companionChatPayload({ safetyState, message, requestId }) {
  return {
    requestId: requestId || "companion-demo",
    policyVersion: COMPANION_POLICY_VERSION,
    safetyState: isCrisisChoice(safetyState) ? "urgent" : safetyState || "ordinary",
    message: String(message || "").trim(),
  };
}

export function parseCompanionReply(payload, requestId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.requestId !== requestId) return null;
  if (payload.policyVersion !== COMPANION_POLICY_VERSION) return null;
  if (!["reply", "human_help"].includes(payload.kind)) return null;
  if (typeof payload.reply !== "string" || !payload.reply.trim()) return null;
  return {
    kind: payload.kind,
    reply: payload.reply.trim(),
    modelDisclosure:
      typeof payload.modelDisclosure === "string" ? payload.modelDisclosure : "",
  };
}
