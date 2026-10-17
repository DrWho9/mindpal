import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  validateBank, emptyState, selectAnswer, submitAnswer, getProgress, createProgressStore,
  STORAGE_KEY, QUIZ_STORAGE_KEY, PROVISIONAL_QUIZ_STORAGE_KEY,
  startQuizSession, normalizeQuizSession, chooseQuizAnswer, submitQuizAnswer,
  nextQuizQuestion, previousQuizQuestion, submitQuizBatch, getQuizView,
  recordQuizProgress, createQuizStore,
} from "../../src/brain/core.js";
import { patchBrainRoutes } from "../../src/brain/build-extension.mjs";

const bytes = readFileSync(new URL("../../src/brain/questions.json", import.meta.url));
const bank = validateBank(JSON.parse(bytes));
const currentId = session => session.questionIds[session.cursor];
const pick = (session, option = "B") => chooseQuizAnswer(session, bank, currentId(session), option);
const start = (mode = "batch", count = 3, id = "test-round") => startQuizSession(bank, { mode, count, sessionId: id });
const memory = () => {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
function fill(session) {
  while (true) {
    session = pick(session);
    if (session.mode === "immediate") session = submitQuizAnswer(session, bank, currentId(session));
    if (session.cursor === session.questionIds.length - 1) return session;
    session = nextQuizQuestion(session, bank, currentId(session));
  }
}
function assertUnrevealed(session) {
  const view = getQuizView(session, bank);
  assert.deepEqual(view.results, []);
  assert.equal(Object.hasOwn(view.current, "feedback"), false);
  assert.equal(Object.hasOwn(view.current, "correctOptionId"), false);
  assert.equal(Object.hasOwn(view.current, "explanation"), false);
  assert.equal(view.current.locked, false);
}

test("accepted 320-question bank remains byte-exact and complete", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "e79b854fbea3a98e59c3c4190b73b9bfcfdad30e326fc7fee550b388f5638c11");
  assert.equal(bank.questions.length, 320);
  assert.equal(new Set(bank.questions.map(q => q.id)).size, 320);
  for (let level = 1; level <= 16; level++) assert.equal(bank.questions.filter(q => q.level === level).length, 20);
  for (const q of bank.questions) { assert.equal(q.options.length, 4); assert.ok(q.explanation.length); }
});

test("valid counts create exact ordered unique sessions, including a wrap at 320", () => {
  for (const count of [1, 5, 20, 320]) {
    const session = startQuizSession(bank, { mode: "batch", count, startId: "brain-319", sessionId: "wrap" });
    assert.equal(session.questionIds.length, count);
    assert.equal(new Set(session.questionIds).size, count);
    assert.equal(session.questionIds[0], "brain-319");
    if (count > 2) assert.equal(session.questionIds[2], "brain-001");
  }
});

test("invalid mode, count, starting ID and session identity cannot start", () => {
  for (const count of [0, -1, 1.5, 321, NaN, Infinity, "5", "", null]) {
    assert.throws(() => startQuizSession(bank, { count }), /whole number/);
  }
  assert.throws(() => startQuizSession(bank, { mode: "silent" }), /feedback mode/);
  assert.throws(() => startQuizSession(bank, { startId: "missing" }), /starting question/);
  assert.throws(() => startQuizSession(bank, { sessionId: "" }), /identity/);
});

test("selection alone cannot reveal immediate feedback; submit reveals exact correct answer and explanation", () => {
  for (const option of [bank.questions[0].correctOptionId, bank.questions[0].options.find(o => o.id !== bank.questions[0].correctOptionId).id]) {
    let session = start("immediate", 1);
    session = pick(session, option);
    assertUnrevealed(session);
    session = submitQuizAnswer(session, bank, currentId(session));
    const view = getQuizView(session, bank);
    assert.equal(view.current.feedback.correctOptionId, bank.questions[0].correctOptionId);
    assert.equal(view.current.feedback.explanation, bank.questions[0].explanation);
    assert.equal(view.current.feedback.isCorrect, option === bank.questions[0].correctOptionId);
    assert.equal(view.current.selectedOptionId, option);
    assert.equal(view.current.locked, true);
  }
});

test("immediate next requires submission; repeat/stale submit and next cannot advance twice", () => {
  const original = start("immediate", 2);
  assert.strictEqual(nextQuizQuestion(original, bank, "brain-001"), original);
  assert.strictEqual(submitQuizAnswer(original, bank, "brain-001"), original);
  const selected = pick(original);
  assert.strictEqual(nextQuizQuestion(selected, bank, "brain-001"), selected);
  const submitted = submitQuizAnswer(selected, bank, "brain-001");
  assert.strictEqual(submitQuizAnswer(submitted, bank, "brain-001"), submitted);
  assert.strictEqual(chooseQuizAnswer(submitted, bank, "brain-001", "A"), submitted);
  const advanced = nextQuizQuestion(submitted, bank, "brain-001");
  assert.equal(advanced.cursor, 1);
  assert.strictEqual(nextQuizQuestion(advanced, bank, "brain-001"), advanced);
  assert.strictEqual(submitQuizAnswer(advanced, bank, "brain-001"), advanced);
});

test("every pending batch question and navigation projection stays unrevealed", () => {
  let session = start("batch", 20);
  for (let index = 0; index < 20; index++) {
    assertUnrevealed(session);
    session = pick(session);
    assertUnrevealed(session);
    session = nextQuizQuestion(session, bank, currentId(session));
  }
  assert.equal(session.cursor, 19);
  assert.equal(session.status, "active");
  assertUnrevealed(session);
});

test("batch Back preserves editable choices and does not reveal correctness", () => {
  let session = pick(start());
  session = nextQuizQuestion(session, bank, "brain-001");
  session = previousQuizQuestion(session, "brain-002");
  assert.equal(session.choices["brain-001"], "B");
  session = pick(session, "C");
  assert.equal(session.choices["brain-001"], "C");
  assertUnrevealed(session);
  assert.strictEqual(previousQuizQuestion(session, "brain-002"), session);
});

test("incomplete batch submission is a no-op, never an implicit grade", () => {
  const empty = start();
  const partial = pick(empty);
  assert.strictEqual(submitQuizBatch(empty, bank), empty);
  assert.strictEqual(submitQuizBatch(partial, bank), partial);
  assert.equal(getQuizView(partial, bank).canSubmitBatch, false);
  assertUnrevealed(partial);
});

test("explicit batch submit locks and returns all chosen/correct answers and explanations in order", () => {
  const active = fill(start("batch", 5));
  assert.equal(getQuizView(active, bank).canSubmitBatch, true);
  assertUnrevealed(active);
  const complete = submitQuizBatch(active, bank);
  assert.equal(complete.status, "complete");
  const results = getQuizView(complete, bank).results;
  assert.equal(results.length, 5);
  for (let index = 0; index < 5; index++) {
    assert.equal(results[index].id, bank.questions[index].id);
    assert.equal(results[index].selectedOptionId, "B");
    assert.equal(results[index].feedback.correctOptionId, bank.questions[index].correctOptionId);
    assert.equal(results[index].feedback.explanation, bank.questions[index].explanation);
    assert.equal(results[index].locked, true);
  }
  assert.strictEqual(submitQuizBatch(complete, bank), complete);
  assert.strictEqual(pick(complete, "C"), complete);
  assert.strictEqual(previousQuizQuestion(complete, "brain-005"), complete);
});

test("immediate mode preserves final feedback before explicit round completion", () => {
  const active = fill(start("immediate", 3));
  assert.equal(active.status, "active");
  assert.ok(getQuizView(active, bank).current.feedback);
  const complete = nextQuizQuestion(active, bank, "brain-003");
  assert.equal(complete.status, "complete");
  assert.equal(getQuizView(complete, bank).results.length, 3);
});

test("batch drafts never credit lifetime progress; submitted questions credit once", () => {
  const history = emptyState(bank);
  const active = fill(start("batch", 5));
  assert.strictEqual(recordQuizProgress(history, active, bank), history);
  const complete = submitQuizBatch(active, bank);
  const credited = recordQuizProgress(history, complete, bank);
  assert.equal(getProgress(credited, bank).completed, 5);
  assert.strictEqual(recordQuizProgress(credited, complete, bank), credited);
});

test("previous first answers survive replay without leaking into a fresh batch", () => {
  const history = submitAnswer(selectAnswer(emptyState(bank), bank, "brain-001", "A"), bank, "brain-001");
  const fresh = start("batch", 1, "replay");
  assertUnrevealed(fresh);
  assert.deepEqual(fresh.choices, {});
  const complete = submitQuizBatch(pick(fresh, "D"), bank);
  const nextHistory = recordQuizProgress(history, complete, bank);
  assert.equal(nextHistory.answers["brain-001"].optionId, "A");
  assert.equal(getQuizView(complete, bank).results[0].selectedOptionId, "D");
  assert.equal(getProgress(nextHistory, bank).completed, 1);
});

test("session normalization copies valid state and rejects malformed identities/counts/answers", () => {
  const original = pick(start());
  const restored = normalizeQuizSession(JSON.parse(JSON.stringify(original)), bank);
  assert.deepEqual(restored, original);
  assert.notStrictEqual(restored, original);
  for (const patch of [
    { version: 2 }, { sessionId: "" }, { revision: -1 }, { mode: "bad" }, { status: "bad" },
    { questionIds: [] }, { questionIds: ["brain-001", "brain-001"] }, { questionIds: ["missing"] },
    { cursor: 99 }, { choices: { "brain-001": "E" } }, { choices: { missing: "A" } },
    { revealed: ["brain-001"] }, { status: "complete" },
  ]) assert.equal(normalizeQuizSession({ ...original, ...patch }, bank), null);
});

test("edited content invalidates only the stale choice and reopens a batch without feedback", () => {
  const complete = submitQuizBatch(fill(start()), bank);
  const changedInput = JSON.parse(JSON.stringify(bank));
  changedInput.questions[1].prompt += " (revised)";
  const changedBank = validateBank(changedInput);
  const restored = normalizeQuizSession(complete, changedBank);
  assert.equal(restored.status, "active");
  assert.equal(restored.cursor, 1);
  assert.equal(restored.choices["brain-001"], "B");
  assert.equal(restored.choices["brain-002"], undefined);
  assert.equal(restored.choices["brain-003"], "B");
  const view = getQuizView(restored, changedBank);
  assert.equal(view.current.feedback, undefined);
  assert.deepEqual(view.results, []);
});

test("session reload preserves pending choices without reveal and submitted batch results", () => {
  const storage = memory();
  let store = createQuizStore({ bank, storage });
  assert.equal(store.read(), null);
  store.start(start());
  store.save(pick(store.read()));
  store = createQuizStore({ bank, storage });
  assert.equal(store.read().choices["brain-001"], "B");
  assertUnrevealed(store.read());
  store.save(submitQuizBatch(fill(store.read()), bank));
  store = createQuizStore({ bank, storage });
  assert.equal(store.read().status, "complete");
  assert.equal(getQuizView(store.read(), bank).results.length, 3);
});

test("session restart clears only its own key and preserves lifetime progress", () => {
  const storage = memory(); storage.setItem("unrelated", "keep");
  const historyStore = createProgressStore({ bank, storage });
  const sessionStore = createQuizStore({ bank, storage });
  sessionStore.start(submitQuizBatch(fill(start()), bank));
  historyStore.save(recordQuizProgress(historyStore.read(), sessionStore.read(), bank));
  const before = storage.getItem(STORAGE_KEY);
  sessionStore.clear();
  assert.equal(sessionStore.read(), null);
  assert.equal(storage.getItem(STORAGE_KEY), before);
  assert.equal(storage.getItem("unrelated"), "keep");
  assert.notEqual(PROVISIONAL_QUIZ_STORAGE_KEY, QUIZ_STORAGE_KEY);
});

test("corrupt and unavailable session storage safely retain usable in-memory state", () => {
  const broken = memory(); broken.setItem(QUIZ_STORAGE_KEY, "{bad");
  const recovered = createQuizStore({ bank, storage: broken });
  assert.equal(recovered.status(), "recovered");
  assert.equal(recovered.read(), null);
  for (const storage of [null, { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } }, { getItem() { return null; }, setItem() { throw new Error("quota"); } }]) {
    const store = createQuizStore({ bank, storage });
    store.start(start());
    store.save(pick(store.read()));
    assert.equal(store.status(), "unavailable");
    assert.equal(store.read().choices["brain-001"], "B");
  }
});

test("stale local transitions cannot replace a newer selection or sealed result", () => {
  const store = createQuizStore({ bank, storage: memory() });
  const old = store.start(start("batch", 1));
  const newer = store.save(pick(old, "A"));
  assert.deepEqual(store.save(pick(old, "D")), newer);
  const complete = store.save(submitQuizBatch(newer, bank));
  assert.deepEqual(store.save(newer), complete);
  assert.equal(store.status(), "conflict");
});

test("another tab's new round or later submission wins instead of being overwritten", () => {
  const storage = memory();
  const first = createQuizStore({ bank, storage });
  first.start(start("batch", 1, "first"));
  const stale = createQuizStore({ bank, storage });
  first.save(submitQuizBatch(pick(first.read()), bank));
  const preserved = stale.save(pick(stale.read(), "D"));
  assert.equal(preserved.status, "complete");
  assert.equal(preserved.choices["brain-001"], "B");
  first.start(start("batch", 2, "second"));
  assert.equal(stale.clear().sessionId, "second");
  assert.equal(stale.status(), "conflict");
});

test("a stale tab cannot resurrect a round discarded or removed by another tab", () => {
  for (const removeKey of [false, true]) {
    const storage = memory();
    const first = createQuizStore({ bank, storage });
    first.start(start("batch", 2, "discard-me"));
    const stale = createQuizStore({ bank, storage });
    const staleUpdate = pick(stale.read(), "C");
    if (removeKey) storage.data.delete(QUIZ_STORAGE_KEY);
    else first.clear();
    assert.equal(stale.save(staleUpdate), null);
    assert.equal(stale.status(), "conflict");
    assert.equal(createQuizStore({ bank, storage }).read(), null);
    assert.equal(storage.getItem(QUIZ_STORAGE_KEY), removeKey ? null : "null");
  }
});

test("an external clear still wins after quota interrupts a previously persisted round", () => {
  const storage = memory();
  const store = createQuizStore({ bank, storage });
  store.start(start("batch", 2, "persisted-before-quota"));
  storage.setItem = () => { throw new Error("quota"); };
  store.save(pick(store.read(), "C"));
  assert.equal(store.status(), "unavailable");
  assert.equal(store.read().choices["brain-001"], "C");
  storage.data.delete(QUIZ_STORAGE_KEY);
  assert.equal(store.save(pick(store.read(), "D")), null);
  assert.equal(store.status(), "conflict");
});

test("unchanged older disk data cannot replace a new in-memory round after quota failure", () => {
  const storage = memory();
  const store = createQuizStore({ bank, storage });
  store.start(start("batch", 2, "old-on-disk"));
  storage.setItem = () => { throw new Error("quota"); };
  store.clear();
  store.start(start("batch", 2, "new-in-memory"));
  store.save(pick(store.read(), "D"));
  assert.equal(store.status(), "unavailable");
  assert.equal(store.read().sessionId, "new-in-memory");
  assert.equal(store.read().choices["brain-001"], "D");
  assert.equal(JSON.parse(storage.getItem(QUIZ_STORAGE_KEY)).sessionId, "old-on-disk");
});

test("lifetime store still preserves first answers from sequential stale tabs", () => {
  const storage = memory();
  const first = createProgressStore({ bank, storage });
  const stale = createProgressStore({ bank, storage });
  first.save(recordQuizProgress(first.read(), submitQuizBatch(fill(start("batch", 1)), bank), bank));
  stale.save(recordQuizProgress(stale.read(), submitQuizBatch(pick(start("batch", 1), "D"), bank), bank));
  assert.equal(createProgressStore({ bank, storage }).read().answers["brain-001"].optionId, "B");
});

test("Brain is inserted exactly once directly below Appointment Questions and other order stays intact", () => {
  const source = [
    "Ii=[`Feelings`,`YouTube directory`,", '"route.book":`Book`', "Book:`route.book`,",
    "zi=[{name:`Feelings`,icon:fn},{name:`YouTube directory`,icon:vn},{name:`Appointment Questions`,icon:fn}]",
    "t===`Book`&&(0,A.jsx)(mpYourBooksPage,{})",
  ].join("\n");
  const patched = patchBrainRoutes(source);
  assert.equal(patched.split("{name:`Brain`,icon:fn}").length - 1, 1);
  assert.ok(patched.includes("{name:`Appointment Questions`,icon:fn},{name:`Brain`,icon:fn}]"));
  assert.ok(patched.includes("zi=[{name:`Feelings`,icon:fn},{name:`YouTube directory`,icon:vn},"));
  assert.throws(() => patchBrainRoutes(source.replace("Appointment Questions", "Changed")), /expected one integration anchor/);
  assert.throws(() => patchBrainRoutes(source + source), /found 2/);
  assert.throws(() => patchBrainRoutes(patched), /expected one integration anchor/);
});
