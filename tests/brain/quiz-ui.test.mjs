import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mountBrain } from "../../src/brain/index.js";
import {
  QUIZ_STORAGE_KEY, STORAGE_KEY, startQuizSession, chooseQuizAnswer,
  submitQuizBatch, emptyState, selectAnswer, submitAnswer,
} from "../../src/brain/core.js";

// A deliberately small, socketless event/DOM harness. This verifies rendering
// and controller behavior, not browser layout, native keyboard or screen readers.
class Node {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc;
    this.children = []; this.parentNode = null; this.attributes = {};
    this.listeners = {}; this.className = ""; this._text = "";
  }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get textContent() { return this._text + this.children.map(node => node.textContent).join(""); }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentNode) node.remove();
      node.parentNode = this; this.children.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const node of this.children) node.parentNode = null;
    this.children = []; this._text = ""; this.append(...nodes);
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(node => node !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
  focus() { this.ownerDocument.activeElement = this; }
  fire(name) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const handler of this.listeners[name] || []) handler(event);
    return event;
  }
}
function memory() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const bank = JSON.parse(readFileSync(new URL("../../src/brain/questions.json", import.meta.url), "utf8"));
function mount(storage = memory(), onExit) {
  const doc = { activeElement: null, createElement(tag) { return new Node(tag, this); } };
  const root = doc.createElement("div");
  return { root, doc, storage, app: mountBrain(root, { bank, storage, onExit }) };
}
function all(root) { return [root, ...root.children.flatMap(all)]; }
function find(root, predicate) { return all(root).find(predicate); }
function named(root, label) { return find(root, node => node.tagName === "BUTTON" && node.textContent === label); }
function click(root, label) {
  const node = named(root, label); assert.ok(node, `Missing button: ${label}`);
  if (node.type === "submit") {
    let form = node.parentNode;
    while (form && form.tagName !== "FORM") form = form.parentNode;
    assert.ok(form); form.fire("submit");
  } else node.fire("click");
  return node;
}
function choose(root, value, group = "answer") {
  const node = find(root, item => item.tagName === "INPUT" && item.type === "radio" && item.name.endsWith(`-${group}`) && item.value === value);
  assert.ok(node, `Missing radio ${group}: ${value}`);
  for (const radio of all(root).filter(item => item.name === node.name)) radio.checked = false;
  node.checked = true; node.focus(); node.fire("change"); return node;
}
function start(harness, mode = "batch", count = 2) {
  choose(harness.root, mode, "feedback-mode");
  const input = find(harness.root, node => node.type === "number");
  input.value = String(count); input.fire("input"); click(harness.root, "Start quiz");
}
function noFeedback(root) {
  const nodes = all(root);
  for (const question of bank.questions) assert.ok(!root.textContent.includes(question.explanation), `Early explanation: ${question.id}`);
  assert.ok(!nodes.some(node => /mp-brain-(?:feedback|correct|option-correct|option-chosen|result-summary|review-list|lifetime)(?:\s|$)/.test(node.className)));
  assert.ok(!root.textContent.includes("Correct answer:"));
}
function current(harness) { return harness.app.getState().session; }
function answer(harness, option = "A") { return choose(harness.root, option); }

test("setup supports both native radio modes, numeric count and accessible validation", () => {
  const h = mount();
  assert.equal(all(h.root).filter(node => node.type === "radio" && node.name.endsWith("-feedback-mode")).length, 2);
  const count = find(h.root, node => node.type === "number");
  assert.equal(count.inputMode, "numeric"); assert.equal(count.min, "1"); assert.equal(count.max, "320");
  assert.ok(find(h.root, node => node.htmlFor === count.id));
  for (const value of ["", "0", "321", "1.5", "1e2"]) {
    count.value = value; count.fire("input"); click(h.root, "Start quiz");
    assert.equal(current(h), null); assert.equal(count.getAttribute("aria-invalid"), "true");
    assert.equal(h.doc.activeElement, count);
  }
  count.value = "1"; count.fire("input"); click(h.root, "Start quiz");
  assert.equal(current(h).questionIds.length, 1);
  assert.ok(h.doc.activeElement.className.includes("mp-brain-prompt"));
});

test("immediate mode keeps radio focus, requires submit, then gives exact feedback and locks answer", () => {
  const h = mount(); start(h, "immediate", 1);
  const first = bank.questions[0];
  click(h.root, "Submit answer"); assert.equal(current(h).revealed.length, 0);
  const radio = answer(h, "B");
  assert.equal(h.doc.activeElement, radio);
  assert.equal(find(h.root, node => node.id === radio.id), radio, "Choice must not replace the native radio");
  assert.ok(!h.root.textContent.includes(first.explanation));
  click(h.root, "Submit answer");
  assert.ok(h.root.textContent.includes(first.explanation));
  assert.ok(h.root.textContent.includes(`Correct answer: ${first.correctOptionId}.`));
  assert.ok(all(h.root).filter(node => node.name?.endsWith("-answer")).every(node => node.disabled));
  assert.equal(h.doc.activeElement.className, "mp-brain-feedback");
  assert.equal(current(h).status, "active");
  click(h.root, "See round results"); assert.equal(current(h).status, "complete");
});

test("pending batch never renders answers, explanations, hidden score or historical answer indicators", () => {
  const storage = memory();
  const history = submitAnswer(selectAnswer(emptyState(bank), bank, "brain-001", "C"), bank, "brain-001");
  storage.setItem(STORAGE_KEY, JSON.stringify(history));
  // Replay a historical question without allowing lifetime feedback into DOM.
  storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(startQuizSession(bank, { mode: "batch", count: 2, sessionId: "pending" })));
  const h = mount(storage); noFeedback(h.root);
  answer(h, "D"); noFeedback(h.root);
  assert.ok(h.root.textContent.includes("1 of 2 choices saved"));
  click(h.root, "Next"); noFeedback(h.root);
  click(h.root, "Back"); noFeedback(h.root);
  answer(h, "B"); noFeedback(h.root);
  click(h.root, "New round"); noFeedback(h.root);
  click(h.root, "Keep this round"); noFeedback(h.root);
  h.app.destroy(); const restored = mount(storage); noFeedback(restored.root);
  assert.equal(current(restored).choices["brain-001"], "B");
  assert.equal(restored.app.getState().progress.answers["brain-001"].optionId, "C");
});

test("batch requires every choice, preserves editable Back choices and reveals all ordered results only on submit", () => {
  const h = mount(); start(h);
  click(h.root, "Next"); assert.equal(current(h).cursor, 0); noFeedback(h.root);
  answer(h, "A"); click(h.root, "Next"); click(h.root, "Submit batch");
  assert.equal(current(h).status, "active"); noFeedback(h.root);
  answer(h, "B"); click(h.root, "Back");
  assert.equal(find(h.root, node => node.type === "radio" && node.value === "A").checked, true);
  answer(h, "C"); click(h.root, "Next");
  assert.equal(find(h.root, node => node.type === "radio" && node.value === "B").checked, true);
  click(h.root, "Submit batch");
  assert.equal(current(h).status, "complete");
  const items = all(h.root).filter(node => node.className === "mp-brain-review-item");
  assert.equal(items.length, 2);
  for (const [index, item] of items.entries()) {
    assert.ok(item.textContent.includes(bank.questions[index].prompt));
    assert.ok(item.textContent.includes(bank.questions[index].explanation));
    assert.ok(item.textContent.includes("Your answer:")); assert.ok(item.textContent.includes("Correct answer:"));
  }
  assert.equal(Object.keys(h.app.getState().progress.answers).length, 2);
  assert.ok(h.doc.activeElement.textContent.includes("Round complete"));
});

test("reload restores pending and completed batches without changing lifetime first answers", () => {
  const h = mount(); start(h); answer(h, "A"); click(h.root, "Next"); h.app.destroy();
  const restored = mount(h.storage); noFeedback(restored.root);
  assert.equal(current(restored).cursor, 1); answer(restored, "D"); click(restored.root, "Submit batch");
  const before = restored.storage.getItem(STORAGE_KEY); restored.app.destroy();
  const complete = mount(h.storage);
  assert.equal(current(complete).status, "complete");
  assert.equal(complete.storage.getItem(STORAGE_KEY), before);
  assert.ok(complete.root.textContent.includes(bank.questions[0].explanation));
});

test("New round protects active drafts and discards only session state", () => {
  const h = mount(); h.storage.setItem("unrelated", "keep"); start(h); answer(h);
  const before = current(h); click(h.root, "New round"); click(h.root, "Keep this round");
  assert.deepEqual(current(h), before);
  click(h.root, "New round"); click(h.root, "Discard round");
  assert.equal(current(h), null); assert.ok(named(h.root, "Start quiz"));
  assert.equal(h.storage.getItem("unrelated"), "keep");
  assert.equal(Object.keys(h.app.getState().progress.answers).length, 0);
});

test("stale controls, double submits and double Next cannot change newer questions or destroyed mounts", () => {
  const h = mount(); start(h, "immediate", 2); answer(h);
  const form = find(h.root, node => node.tagName === "FORM"); form.fire("submit");
  const submitted = current(h); form.fire("submit"); assert.deepEqual(current(h), submitted);
  const next = click(h.root, "Next question"); next.fire("click"); assert.equal(current(h).cursor, 1);
  const staleRadio = answer(h, "B"); const before = h.storage.getItem(QUIZ_STORAGE_KEY);
  h.app.destroy(); staleRadio.value = "C"; staleRadio.fire("change"); next.fire("click"); form.fire("submit");
  assert.equal(h.root.children.length, 0); assert.equal(h.storage.getItem(QUIZ_STORAGE_KEY), before);
});

test("a round discarded in another tab returns stale UI to setup without resurrection", () => {
  const h = mount(); start(h); const stale = mount(h.storage);
  click(h.root, "New round"); click(h.root, "Discard round");
  answer(stale, "C"); assert.equal(current(stale), null);
  assert.ok(named(stale.root, "Start quiz"));
  assert.ok(stale.root.textContent.includes("Another open Brain page cleared the saved round"));
  assert.equal(stale.storage.getItem(QUIZ_STORAGE_KEY), "null");
});

test("quota-denied storage preserves usable in-memory choices and warns about reload", () => {
  const h = mount({ getItem: () => null, setItem() { throw new Error("quota"); } });
  start(h, "batch", 1); answer(h, "C"); noFeedback(h.root); click(h.root, "Submit batch");
  assert.equal(current(h).status, "complete");
  assert.ok(h.root.textContent.includes("reloading may lose"));
  assert.ok(h.root.textContent.includes(bank.questions[0].explanation));
});

test("malformed draft recovers to setup; restored revealed submission reconciles missing lifetime credit", () => {
  const storage = memory(); storage.setItem(QUIZ_STORAGE_KEY, "{bad");
  const broken = mount(storage); assert.equal(current(broken), null);
  assert.ok(broken.root.textContent.includes("couldn’t be restored")); broken.app.destroy();
  let session = startQuizSession(bank, { mode: "batch", count: 1, sessionId: "history-interrupted" });
  session = submitQuizBatch(chooseQuizAnswer(session, bank, "brain-001", "D"), bank);
  storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(session));
  const h = mount(storage);
  assert.equal(h.app.getState().progress.answers["brain-001"].optionId, "D");
  const before = storage.getItem(STORAGE_KEY); h.app.destroy(); mount(storage);
  assert.equal(storage.getItem(STORAGE_KEY), before, "Reconciliation is idempotent");
});

test("a restored incomplete last question offers a neutral path to the first missing answer", () => {
  const storage = memory();
  const session = startQuizSession(bank, { mode: "batch", count: 2, sessionId: "missing-first" });
  session.cursor = 1;
  storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(session));
  const h = mount(storage); answer(h, "B"); click(h.root, "Submit batch"); noFeedback(h.root);
  click(h.root, "Go to question 1"); assert.equal(current(h).cursor, 0); noFeedback(h.root);
});

test("exit callback and existing mount lifecycle remain callable", () => {
  let exits = 0; const h = mount(memory(), () => { exits += 1; });
  click(h.root, "Back to MindPal"); assert.equal(exits, 1);
  assert.deepEqual(Object.keys(h.app).sort(), ["destroy", "getState"]);
  h.app.destroy(); h.app.destroy(); assert.equal(h.root.children.length, 0);
});

test("source includes scoped narrow-layout, focus, reduced-motion and forced-color rules", () => {
  const css = readFileSync(new URL("../../src/brain/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.mp-brain\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(forced-colors:active\)/);
  assert.match(css, /min-height:48px/);
});
