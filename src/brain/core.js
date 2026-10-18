/** @typedef {{id:string,text:string}} BrainOption */
/** @typedef {{id:string,level:number,position:number,difficulty?:'umat'|'challenge',skill:string,prompt:string,options:BrainOption[],correctOptionId:string,explanation:string}} BrainQuestion */
/** @typedef {{schemaVersion:string,title:string,questions:BrainQuestion[]}} BrainBank */
/** @typedef {{optionId:string,questionKey:string}} BrainAnswer */
/** @typedef {{version:1,currentId:string,view:'question'|'review'|'complete',answers:Record<string,BrainAnswer>,drafts:Record<string,BrainAnswer>}} BrainState */

export const STAGE_SIZE = 20;
export const FULL_BANK_SIZE = 320;
export const STORAGE_KEY = "mindpal.brain.v1";
export const PROVISIONAL_STORAGE_KEY = "mindpal.brain.preview.v1";
const OPTION_IDS = ["A", "B", "C", "D"];

function text(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`Brain content: invalid ${label}.`);
  }
  return value.trim();
}

/** Fail closed before changing the DOM or reading/writing progress. */
export function validateBank(input, { provisional = false, difficulty = "foundation" } = {}) {
  if (!["foundation", "umat", "challenge"].includes(difficulty)) throw new Error("Brain content: unknown difficulty.");
  if (!input || input.schemaVersion !== "1.0" || input.title !== "Brain" || !Array.isArray(input.questions)) {
    throw new Error("Brain content: expected schemaVersion 1.0, title Brain, and questions.");
  }
  const count = input.questions.length;
  const reasoning = difficulty !== "foundation";
  if (reasoning && count !== 9) throw new Error(`Brain content: ${difficulty} bank must contain 9 questions.`);
  if (!reasoning && (count < 1 || count > FULL_BANK_SIZE || (!provisional && count !== FULL_BANK_SIZE))) {
    throw new Error(provisional ? "Brain content: preview needs 1–320 questions." : "Brain content: the complete bank must contain 320 questions.");
  }
  const seen = new Set();
  const questions = input.questions.map((item, index) => {
    const expectedId = `brain-${reasoning ? `${difficulty}-` : ""}${String(index + 1).padStart(3, "0")}`;
    if (!item || seen.has(item.id) || item.id !== expectedId || item.level !== Math.floor(index / STAGE_SIZE) + 1 || item.position !== index % STAGE_SIZE + 1 ||
        (reasoning && item.difficulty !== difficulty)) {
      throw new Error(`Brain content: invalid or duplicate ID, level, or position at ${expectedId}.`);
    }
    seen.add(item.id);
    if (!Array.isArray(item.options) || item.options.length !== 4) throw new Error(`Brain content: ${expectedId} needs four options.`);
    const options = item.options.map((option, i) => {
      if (!option || option.id !== OPTION_IDS[i]) throw new Error(`Brain content: ${expectedId} option IDs must be A, B, C, D in order.`);
      return Object.freeze({ id: option.id, text: text(option.text, `${expectedId} option`, 1000) });
    });
    if (new Set(options.map(option => option.text.toLocaleLowerCase())).size !== 4 || !OPTION_IDS.includes(item.correctOptionId)) {
      throw new Error(`Brain content: ${expectedId} has duplicate options or an invalid answer key.`);
    }
    return Object.freeze({
      id: expectedId, level: item.level, position: item.position,
      ...(reasoning ? { difficulty } : {}),
      skill: text(item.skill, `${expectedId} skill`, 100),
      prompt: text(item.prompt, `${expectedId} prompt`, 2000),
      options: Object.freeze(options), correctOptionId: item.correctOptionId,
      explanation: text(item.explanation, `${expectedId} explanation`, 6000),
    });
  });
  return Object.freeze({ schemaVersion: "1.0", title: "Brain", questions: Object.freeze(questions) });
}

/** Exact content identity prevents carrying answers across editorial changes. */
export function questionKey(question) {
  return JSON.stringify(question);
}

/** @returns {BrainState} */
export function emptyState(bank) {
  return { version: 1, currentId: bank.questions[0].id, view: "question", answers: {}, drafts: {} };
}

export function normalizeState(raw, bank) {
  const state = emptyState(bank);
  if (!raw || typeof raw !== "object" || raw.version !== 1) return state;
  for (const question of bank.questions) {
    for (const kind of ["answers", "drafts"]) {
      const saved = raw[kind]?.[question.id];
      if (saved && OPTION_IDS.includes(saved.optionId) && saved.questionKey === questionKey(question)) {
        state[kind][question.id] = { optionId: saved.optionId, questionKey: saved.questionKey };
      }
    }
    if (state.answers[question.id]) delete state.drafts[question.id];
  }
  const current = bank.questions.find(question => question.id === raw.currentId);
  const pending = bank.questions.find(question => !state.answers[question.id]);
  state.currentId = current?.id || pending?.id || bank.questions[0].id;
  if (raw.view === "review" && Object.keys(state.answers).length) state.view = "review";
  if (raw.view === "complete" && !pending) state.view = "complete";
  return state;
}

export function getProgress(state, bank) {
  const current = bank.questions.find(question => question.id === state.currentId) || bank.questions[0];
  const completed = bank.questions.filter(question => state.answers[question.id]).length;
  const stage = bank.questions.filter(question => question.level === current.level);
  return {
    completed, total: bank.questions.length, level: current.level,
    stages: Math.ceil(bank.questions.length / STAGE_SIZE),
    stageCompleted: stage.filter(question => state.answers[question.id]).length,
    stageTotal: stage.length, nextId: bank.questions.find(question => !state.answers[question.id])?.id || null,
  };
}

export function selectAnswer(state, bank, id, optionId) {
  const question = bank.questions.find(item => item.id === id);
  if (!question || state.answers[id] || !OPTION_IDS.includes(optionId)) return state;
  return { ...state, drafts: { ...state.drafts, [id]: { optionId, questionKey: questionKey(question) } } };
}

/** First submission is immutable; wrong answers also count as completed practice. */
export function submitAnswer(state, bank, id) {
  const question = bank.questions.find(item => item.id === id);
  const draft = state.drafts[id];
  if (!question || state.answers[id] || !draft || draft.questionKey !== questionKey(question)) return state;
  const drafts = { ...state.drafts };
  delete drafts[id];
  return { ...state, answers: { ...state.answers, [id]: draft }, drafts };
}

export function visitQuestion(state, bank, id) {
  return bank.questions.some(question => question.id === id) ? { ...state, currentId: id, view: "question" } : state;
}

export function nextQuestion(state, bank) {
  const index = bank.questions.findIndex(question => question.id === state.currentId);
  if (!state.answers[state.currentId]) return state;
  if (index < bank.questions.length - 1) return visitQuestion(state, bank, bank.questions[index + 1].id);
  return resumePractice(state, bank);
}

export function previousQuestion(state, bank) {
  const index = bank.questions.findIndex(question => question.id === state.currentId);
  return index > 0 ? visitQuestion(state, bank, bank.questions[index - 1].id) : state;
}

export function resumePractice(state, bank) {
  const next = getProgress(state, bank).nextId;
  return next ? visitQuestion(state, bank, next) : { ...state, view: "complete" };
}

export function reviewAnswers(state) {
  return Object.keys(state.answers).length ? { ...state, view: "review" } : state;
}

/** Resolve localStorage inside try/catch: its getter itself can be denied. */
export function browserStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

/** @param {{bank:any,storage?:any,key?:string}} options */
export function createProgressStore({ bank, storage = browserStorage(), key = STORAGE_KEY }) {
  let status = storage ? "saved" : "unavailable";
  let state = emptyState(bank);
  try {
    const saved = storage?.getItem(key);
    if (saved) {
      try { state = normalizeState(JSON.parse(saved), bank); }
      catch { status = "recovered"; }
    }
  } catch { status = "unavailable"; }
  return {
    read: () => state,
    status: () => status,
    save(next) {
      state = normalizeState(next, bank);
      if (!storage) { status = "unavailable"; return state; }
      try {
        // Preserve first answers saved by another open tab before this write.
        // localStorage has no transactions; this is best-effort reconciliation.
        let existing = emptyState(bank);
        try { existing = normalizeState(JSON.parse(storage.getItem(key)), bank); } catch { /* repair corrupt data */ }
        state = normalizeState({
          ...state,
          answers: { ...state.answers, ...existing.answers },
          drafts: { ...existing.drafts, ...state.drafts },
        }, bank);
        storage.setItem(key, JSON.stringify(state));
        status = "saved";
      }
      catch { status = "unavailable"; }
      return state;
    },
  };
}

// Quiz sessions are separate from the v1 lifetime practice record. A previously
// revealed answer must never become feedback in a fresh, unsubmitted batch.
export const QUIZ_STORAGE_KEY = "mindpal.brain.quiz.v1";
export const PROVISIONAL_QUIZ_STORAGE_KEY = "mindpal.brain.quiz.preview.v1";

export function startQuizSession(bank, { mode = "immediate", count = 10, startId, sessionId } = {}) {
  if (!["immediate", "batch"].includes(mode)) throw new Error("Choose a feedback mode.");
  if (!Number.isInteger(count) || count < 1 || count > bank.questions.length) {
    throw new Error(`Choose a whole number from 1 to ${bank.questions.length}.`);
  }
  const start = startId === undefined ? 0 : bank.questions.findIndex(question => question.id === startId);
  if (start < 0) throw new Error("The starting question is not in this bank.");
  const questions = Array.from({ length: count }, (_, offset) => bank.questions[(start + offset) % bank.questions.length]);
  if (new Set(questions.map(question => question.difficulty || "foundation")).size !== 1) throw new Error("A round must use one difficulty.");
  const id = sessionId ?? globalThis.crypto?.randomUUID?.() ?? `round-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (typeof id !== "string" || !id || id.length > 128) throw new Error("Invalid quiz session identity.");
  return {
    version: 1, sessionId: id, revision: 0, mode, status: "active",
    questionIds: questions.map(question => question.id),
    questionKeys: Object.fromEntries(questions.map(question => [question.id, questionKey(question)])),
    cursor: 0, choices: {}, revealed: [],
  };
}

/** Restore only coherent sessions. Changed content loses its stale selection. */
export function normalizeQuizSession(raw, bank) {
  if (raw === null || raw === undefined) return null;
  if (!raw || typeof raw !== "object" || raw.version !== 1 ||
      typeof raw.sessionId !== "string" || !raw.sessionId || raw.sessionId.length > 128 ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 0 ||
      !["immediate", "batch"].includes(raw.mode) || !["active", "complete"].includes(raw.status) ||
      !Array.isArray(raw.questionIds) || raw.questionIds.length < 1 || raw.questionIds.length > bank.questions.length ||
      new Set(raw.questionIds).size !== raw.questionIds.length ||
      !Number.isInteger(raw.cursor) || raw.cursor < 0 || raw.cursor >= raw.questionIds.length ||
      !raw.questionKeys || typeof raw.questionKeys !== "object" ||
      !raw.choices || typeof raw.choices !== "object" || Array.isArray(raw.choices) ||
      !Array.isArray(raw.revealed) || new Set(raw.revealed).size !== raw.revealed.length) return null;
  const byId = new Map(bank.questions.map(question => [question.id, question]));
  if (raw.questionIds.some(id => typeof id !== "string" || !byId.has(id)) ||
      new Set(raw.questionIds.map(id => byId.get(id)?.difficulty || "foundation")).size !== 1 ||
      Object.keys(raw.choices).some(id => !raw.questionIds.includes(id) || !OPTION_IDS.includes(raw.choices[id])) ||
      raw.revealed.some(id => !raw.questionIds.includes(id) || !OPTION_IDS.includes(raw.choices[id])) ||
      (raw.mode === "batch" && raw.revealed.length)) return null;
  const questionKeys = {}, choices = {};
  const changed = [];
  for (const id of raw.questionIds) {
    questionKeys[id] = questionKey(byId.get(id));
    if (raw.questionKeys[id] !== questionKeys[id]) changed.push(id);
    else if (OPTION_IDS.includes(raw.choices[id])) choices[id] = raw.choices[id];
  }
  const revealed = raw.revealed.filter(id => !changed.includes(id));
  const allChosen = raw.questionIds.every(id => OPTION_IDS.includes(choices[id]));
  if (!changed.length && raw.status === "complete" &&
      (!allChosen || (raw.mode === "immediate" && revealed.length !== raw.questionIds.length))) return null;
  return {
    version: 1, sessionId: raw.sessionId, revision: raw.revision,
    mode: raw.mode, status: changed.length ? "active" : raw.status,
    questionIds: [...raw.questionIds], questionKeys,
    cursor: changed.length ? raw.questionIds.indexOf(changed[0]) : raw.cursor,
    choices, revealed,
  };
}

function currentQuizId(session) { return session?.questionIds[session.cursor]; }
function changeQuiz(session, changes) {
  return { ...session, ...changes, revision: session.revision + 1 };
}

export function chooseQuizAnswer(session, bank, id, optionId) {
  if (!session || session.status !== "active" || id !== currentQuizId(session) ||
      session.revealed.includes(id) || !OPTION_IDS.includes(optionId) ||
      !bank.questions.some(question => question.id === id) || session.choices[id] === optionId) return session;
  return changeQuiz(session, { choices: { ...session.choices, [id]: optionId } });
}

export function submitQuizAnswer(session, bank, id) {
  if (!session || session.status !== "active" || session.mode !== "immediate" ||
      id !== currentQuizId(session) || session.revealed.includes(id) || !OPTION_IDS.includes(session.choices[id]) ||
      !bank.questions.some(question => question.id === id)) return session;
  return changeQuiz(session, { revealed: [...session.revealed, id] });
}

export function nextQuizQuestion(session, bank, id) {
  if (!session || session.status !== "active" || id !== currentQuizId(session) ||
      !OPTION_IDS.includes(session.choices[id]) ||
      (session.mode === "immediate" && !session.revealed.includes(id))) return session;
  if (session.cursor < session.questionIds.length - 1) return changeQuiz(session, { cursor: session.cursor + 1 });
  if (session.mode === "immediate" && session.revealed.length === session.questionIds.length) {
    return changeQuiz(session, { status: "complete" });
  }
  return session; // A batch always requires its own explicit submission.
}

export function previousQuizQuestion(session, id) {
  if (!session || session.status !== "active" || id !== currentQuizId(session) || session.cursor === 0) return session;
  return changeQuiz(session, { cursor: session.cursor - 1 });
}

export function submitQuizBatch(session, bank) {
  if (!session || session.status !== "active" || session.mode !== "batch" ||
      !session.questionIds.every(id => OPTION_IDS.includes(session.choices[id]) && bank.questions.some(question => question.id === id))) return session;
  return changeQuiz(session, { status: "complete" });
}

/** Safe UI projection: unrevealed questions have NO answer/explanation fields. */
export function getQuizView(session, bank) {
  if (!session) return null;
  const byId = new Map(bank.questions.map(question => [question.id, question]));
  const questionView = id => {
    const question = byId.get(id);
    const mayReveal = session.status === "complete" || (session.mode === "immediate" && session.revealed.includes(id));
    const view = {
      id, level: question.level, position: question.position, skill: question.skill,
      prompt: question.prompt, options: question.options.map(option => ({ ...option })),
      selectedOptionId: session.choices[id] ?? null, locked: mayReveal,
    };
    if (mayReveal) {
      view.feedback = {
        correctOptionId: question.correctOptionId,
        correctText: question.options.find(option => option.id === question.correctOptionId).text,
        explanation: question.explanation, isCorrect: session.choices[id] === question.correctOptionId,
      };
    }
    return view;
  };
  return {
    mode: session.mode, status: session.status, count: session.questionIds.length, cursor: session.cursor,
    answeredCount: Object.keys(session.choices).length, revealedCount: session.revealed.length,
    current: questionView(currentQuizId(session)),
    results: session.status === "complete" ? session.questionIds.map(questionView) : [],
    canSubmitBatch: session.mode === "batch" && session.status === "active" && session.questionIds.every(id => OPTION_IDS.includes(session.choices[id])),
  };
}

/** Credit only committed feedback, retaining the historical first submission. */
export function recordQuizProgress(progress, session, bank) {
  if (!session) return progress;
  const committed = session.mode === "batch"
    ? (session.status === "complete" ? session.questionIds : []) : session.revealed;
  let next = progress;
  for (const id of committed) {
    if (next.answers[id]) continue;
    next = submitAnswer(selectAnswer(next, bank, id, session.choices[id]), bank, id);
  }
  return next;
}

/** Local-only resumable session, separate from lifetime progress and other keys. */
export function createQuizStore({ bank, storage = browserStorage(), key = QUIZ_STORAGE_KEY }) {
  let status = storage ? "saved" : "unavailable";
  let session = null;
  // Compare disk with its last observed snapshot, not the in-memory round.
  // Quota failures may leave an older round on disk while a new one is usable.
  let persistedValue = null;
  let observedStorage = false;
  try {
    const saved = storage?.getItem(key);
    persistedValue = saved ?? null;
    observedStorage = Boolean(storage);
    if (saved) {
      try {
        const raw = JSON.parse(saved);
        session = normalizeQuizSession(raw, bank);
        if (raw && (!session || JSON.stringify(raw) !== JSON.stringify(session))) status = "recovered";
      } catch { status = "recovered"; }
    }
  } catch { status = "unavailable"; }
  function write(next, replace) {
    const normalized = normalizeQuizSession(next, bank);
    if (next && !normalized) throw new Error("The quiz session is invalid.");
    if (!replace && session && normalized &&
        (normalized.sessionId !== session.sessionId || normalized.revision < session.revision ||
        (normalized.revision === session.revision && JSON.stringify(normalized) !== JSON.stringify(session)))) {
      status = "conflict";
      return session;
    }
    if (!storage) { session = normalized; status = "unavailable"; return session; }
    try {
      let latest = null;
      let explicitlyCleared = false;
      const saved = storage.getItem(key);
      if (saved === null) explicitlyCleared = true;
      else {
        try {
          const raw = JSON.parse(saved);
          explicitlyCleared = raw === null;
          latest = normalizeQuizSession(raw, bank);
        } catch { /* safely replace corrupt session data */ }
      }
      // A changed null/removal is a reset. An unchanged older snapshot after a
      // failed write is not a competing tab and must not erase in-memory play.
      const changedOnDisk = observedStorage ? saved !== persistedValue : Boolean(latest);
      if (!replace && changedOnDisk && (latest || explicitlyCleared)) {
        session = latest;
        persistedValue = saved;
        observedStorage = true;
        status = "conflict";
        return session;
      }
      const serialized = JSON.stringify(normalized);
      storage.setItem(key, serialized);
      session = normalized;
      persistedValue = serialized;
      observedStorage = true;
      status = "saved";
    } catch { session = normalized; status = "unavailable"; }
    return session;
  }
  return {
    read: () => session,
    status: () => status,
    save: next => write(next, false),
    start: next => write(next, true),
    clear: () => write(null, false),
  };
}
