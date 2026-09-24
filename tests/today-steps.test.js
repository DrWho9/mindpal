import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STEPS_STORAGE_KEY,
  STEP_IDS,
  HUB_FLOW_LINE,
  BANDS,
  bandForStep,
  emptyDay,
  hubStepCaption,
  loadDay,
  markStep,
  nextStepId,
  saveDay,
  stepRowLabel,
} from "../src/today/steps.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    store,
  };
}

const day = new Date(2026, 8, 20, 9, 0, 0);

describe("today steps pathway", () => {
  it("keeps the hub as a short numbered flow", () => {
    assert.match(HUB_FLOW_LINE, /Individual Growth/);
    assert.match(HUB_FLOW_LINE, /Support/);
    assert.match(HUB_FLOW_LINE, /Team/);
    assert.equal(stepRowLabel("readings"), "Readings — Verse of the day");
    assert.equal(hubStepCaption("readings"), "Step 1 · Readings — Verse of the day");
    assert.equal(hubStepCaption("evening"), "Step 4 · Before you sleep");
  });

  it("opens Reflect and Appointment Questions from Today", () => {
    assert.match(inject, /function mpTodayTalkRow\(/);
    assert.match(inject, /children:`Talk about my day`/);
    assert.match(inject, /children:`Appointment Questions`/);
    assert.match(inject, /mpTodayTalkRow,\{onReflect:R,onAppointment:Q\}/);
    const growth = inject.indexOf("mpIndividualGrowthCard,{onOpenJournal");
    const talk = inject.indexOf("mpTodayTalkRow,{onReflect:R,onAppointment:Q}");
    const chips = inject.indexOf("mpProblemHubList,{variant:`today`");
    assert.ok(growth > 0 && talk > growth && chips > talk);
  });

  it("keeps a Night journal band at the bottom of Today", () => {
    assert.match(inject, /function mpNightBand\(/);
    assert.match(inject, /Open Journal/);
    assert.match(inject, /e\.id===`night`\?\(0,A\.jsx\)\(mpNightBand/);
    assert.match(inject, /Read today’s wins, then leave a short wind-down note in Journal/);
    assert.match(inject, /function mpPeacefulReadingPeek\(/);
    assert.match(inject, /Open the book reader/);
  });

  it("groups steps into Morning, Day and Night bands", () => {
    assert.deepEqual(BANDS.map((band) => band.id), ["morning", "day", "night"]);
    assert.equal(bandForStep("readings")?.id, "morning");
    assert.equal(bandForStep("focus")?.id, "day");
    assert.equal(bandForStep("later")?.id, "day");
    assert.equal(bandForStep("evening")?.id, "night");
  });

  it("keeps Win of the day above the hub steps and out of the numbered pathway", () => {
    const hub = inject.slice(inject.indexOf("function Rr("));
    const win = hub.indexOf("(0,A.jsx)(mpWinsPanel,{variant:`winOfDay`})");
    const growth = hub.indexOf("(0,A.jsx)(mpIndividualGrowthCard,{onOpenJournal");
    const bands = hub.indexOf("mpTodaySteps.BANDS.filter(e=>e.id!==`morning`)");
    assert.ok(win > 0 && growth > win && bands > growth);
    assert.equal(STEP_IDS.includes("win"), false);
    assert.equal(STEP_IDS.includes("winOfDay"), false);
    assert.equal(STEP_IDS[0], "readings");
    assert.match(inject, /Read today’s wins, then leave a short wind-down note in Journal/);
  });

  it("orders Morning → Day → Night", () => {
    assert.deepEqual(STEP_IDS, ["readings", "focus", "later", "evening"]);
    assert.deepEqual(
      BANDS.map((band) => band.id),
      ["morning", "day", "night"],
    );
    assert.deepEqual(BANDS[0].stepIds, ["readings"]);
    assert.deepEqual(BANDS[1].stepIds, ["focus", "later"]);
    assert.deepEqual(BANDS[2].stepIds, ["evening"]);
    assert.match(BANDS[1].lede, /help with a problem/);
    assert.equal(nextStepId(emptyDay(day)), "readings");
  });

  it("treats skip and done as complete for Do this next", () => {
    let state = emptyDay(day);
    state = markStep(state, "readings", "done", day);
    state = markStep(state, "focus", "skipped", day);
    assert.equal(nextStepId(state), "later");
    state = markStep(state, "later", "skipped", day);
    assert.equal(nextStepId(state), "evening");
    state = markStep(state, "evening", "done", day);
    assert.equal(nextStepId(state), null);
  });

  it("persists on mindpal.todaySteps.v1 for the civil day", () => {
    const storage = memoryStorage();
    const saved = saveDay(
      markStep(emptyDay(day), "readings", "done", day),
      storage,
      day,
    );
    assert.equal(storage.store.has(STEPS_STORAGE_KEY), true);
    assert.equal(JSON.parse(storage.store.get(STEPS_STORAGE_KEY)).date, "2026-09-20");
    assert.equal(loadDay(storage, day).steps.readings, "done");
    assert.equal(saved.steps.readings, "done");
    assert.equal("journal" in saved.steps, false);
  });

  it("resets when the civil day changes", () => {
    const storage = memoryStorage({
      [STEPS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "2026-09-19",
        steps: { readings: "done", focus: "done", later: "done", evening: "done" },
      }),
    });
    const loaded = loadDay(storage, day);
    assert.equal(loaded.date, "2026-09-20");
    assert.equal(loaded.steps.readings, "todo");
    assert.equal(nextStepId(loaded), "readings");
  });
});
