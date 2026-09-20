import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STEPS_STORAGE_KEY,
  STEP_IDS,
  emptyDay,
  loadDay,
  markStep,
  nextStepId,
  saveDay,
} from "../src/today/steps.js";

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
  it("orders morning through before-sleep", () => {
    assert.deepEqual(STEP_IDS, ["readings", "focus", "journal", "later", "evening"]);
    assert.equal(nextStepId(emptyDay(day)), "readings");
  });

  it("treats skip and done as complete for Do this next", () => {
    let state = emptyDay(day);
    state = markStep(state, "readings", "done", day);
    state = markStep(state, "focus", "skipped", day);
    assert.equal(nextStepId(state), "journal");
    state = markStep(state, "journal", "done", day);
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
  });

  it("resets when the civil day changes", () => {
    const storage = memoryStorage({
      [STEPS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        date: "2026-09-19",
        steps: { readings: "done", focus: "done", journal: "done", later: "done", evening: "done" },
      }),
    });
    const loaded = loadDay(storage, day);
    assert.equal(loaded.date, "2026-09-20");
    assert.equal(loaded.steps.readings, "todo");
    assert.equal(nextStepId(loaded), "readings");
  });
});
