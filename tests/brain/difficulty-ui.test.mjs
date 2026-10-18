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
const reasoningBank = { schemaVersion: "1.0", title: "Brain", questions: ["umat", "challenge"].flatMap(difficulty => Array.from({length:9}, (_,i) => ({
  id: `brain-${difficulty}-${String(i+1).padStart(3,"0")}`, difficulty, level:1, position:i+1,
  skill:"synthetic-reasoning", prompt:`${difficulty} synthetic reasoning item ${i+1}`,
  options:["A","B","C","D"].map(id=>({id,text:`${id} synthetic option`})), correctOptionId:"C", explanation:`${difficulty} explanation ${i+1}`,
}))) };
function mount(storage = memory(), onExit) {
  const doc = { activeElement: null, createElement(tag) { return new Node(tag, this); } };
  const root = doc.createElement("div");
  return { root, doc, storage, app: mountBrain(root, { bank, reasoningBank, storage, onExit }) };
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


test("difficulty defaults to UMAT-level and native radios safely update the selected bank limit", () => {
 const h=mount();
 const radios=all(h.root).filter(n=>n.type==="radio"&&n.name.endsWith("-difficulty"));
 assert.equal(radios.length,3);
 assert.equal(radios.find(n=>n.checked).value,"umat");
 const count=find(h.root,n=>n.type==="number");
 assert.equal(count.max,"9"); assert.equal(count.value,"9");
 const foundation=choose(h.root,"foundation","difficulty");
 assert.equal(h.doc.activeElement,foundation);
 assert.equal(find(h.root,n=>n.id===foundation.id),foundation);
 assert.equal(count.max,"320"); count.value="320";count.fire("input");
 const challenge=choose(h.root,"challenge","difficulty");
 assert.equal(count.max,"9");assert.equal(count.value,"9");
 assert.equal(h.doc.activeElement,challenge);
 assert.ok(h.root.textContent.includes("Challenge: 9 questions available"));
 click(h.root,"Start quiz");
 assert.deepEqual(current(h).questionIds,reasoningBank.questions.filter(q=>q.difficulty==="challenge").map(q=>q.id));
 assert.ok(!all(h.root).some(n=>n.name?.endsWith("-difficulty")));
});

test("higher-level batch restores selected difficulty, withholds feedback, and credits new IDs", () => {
 const h=mount();start(h,"batch",2);answer(h,"A");click(h.root,"Next");
 assert.ok(current(h).questionIds.every(id=>id.startsWith("brain-umat-")));
 for(const q of reasoningBank.questions)assert.ok(!h.root.textContent.includes(q.explanation));
 h.app.destroy();const r=mount(h.storage);assert.equal(current(r).cursor,1);
 answer(r,"C");click(r.root,"Submit batch");
 assert.ok(r.root.textContent.includes("UMAT-level"));
 assert.ok(r.root.textContent.includes(reasoningBank.questions[0].explanation));
 assert.equal(Object.keys(r.app.getState().progress.answers).length,2);
 click(r.root,"New round");choose(r.root,"foundation","difficulty");start(r,"immediate",1);
 assert.equal(current(r).questionIds[0],"brain-001");
});

test("legacy Foundation sessions and first-answer progress survive the new catalog unchanged", () => {
 const storage=memory();
 const history=submitAnswer(selectAnswer(emptyState(bank),bank,"brain-001","B"),bank,"brain-001");
 const session=startQuizSession(bank,{mode:"batch",count:2,sessionId:"legacy"});
 session.choices["brain-001"]="D";
 storage.setItem(STORAGE_KEY,JSON.stringify(history));storage.setItem(QUIZ_STORAGE_KEY,JSON.stringify(session));
 const h=mount(storage);
 assert.deepEqual(current(h),session);assert.equal(h.app.getState().progress.answers["brain-001"].optionId,"B");
 assert.ok(h.root.textContent.includes("Foundation"));noFeedback(h.root);
 click(h.root,"New round");click(h.root,"Keep this round");assert.deepEqual(current(h),session);
 click(h.root,"New round");click(h.root,"Discard round");
 assert.equal(all(h.root).find(n=>n.name?.endsWith("-difficulty")&&n.checked).value,"foundation");
 choose(h.root,"challenge","difficulty");start(h,"immediate",1);answer(h,"C");click(h.root,"Submit answer");
 assert.equal(h.app.getState().progress.answers["brain-001"].optionId,"B");
 assert.equal(h.app.getState().progress.answers["brain-challenge-001"].optionId,"C");
});
