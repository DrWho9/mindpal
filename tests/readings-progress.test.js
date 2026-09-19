import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PACK_A_ID,
  PACK_B_ID,
  STORAGE_KEY,
  canMarkDone,
  dailyDefaultPackId,
  emptyProgress,
  isDayUnlocked,
  loadProgress,
  markReadingDone,
  nextIncomplete,
  packAComplete,
  parseProgressJson,
  saveProgress,
} from "../src/readings/progress.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const packB = JSON.parse(readFileSync(join(root, "../src/data/pack-b.json"), "utf8"));
const readings = packA.readings;

describe("Pack A source", () => {
  it("is the approved 100-day paraphrase pack", () => {
    assert.equal(packA.pack_id, PACK_A_ID);
    assert.equal(readings.length, 100);
    assert.equal(packB.pack_id, PACK_B_ID);
    const days = readings.map((item) => item.day);
    assert.deepEqual(days, Array.from({ length: 100 }, (_, i) => i + 1));
  });
});

describe("sequential Mark Done gate", () => {
  it("unlocks only day 1 until the previous day is Done", () => {
    assert.equal(isDayUnlocked(readings, [], 1), true);
    assert.equal(isDayUnlocked(readings, [], 2), false);
    assert.equal(canMarkDone(readings, [], readings[0]), true);
    assert.equal(canMarkDone(readings, [], readings[1]), false);
  });

  it("does not treat open/listen as Done", () => {
    const progress = emptyProgress();
    assert.equal(progress.completedIds.length, 0);
    assert.equal(nextIncomplete(readings, progress.completedIds).id, readings[0].id);
  });

  it("unlocks day N only after day N-1 is marked Done", () => {
    let progress = emptyProgress();
    progress = markReadingDone(progress, readings[0], readings);
    assert.deepEqual(progress.completedIds, [readings[0].id]);
    assert.equal(canMarkDone(readings, progress.completedIds, readings[1]), true);
    assert.equal(canMarkDone(readings, progress.completedIds, readings[2]), false);
    assert.equal(nextIncomplete(readings, progress.completedIds).id, readings[1].id);
  });

  it("keeps Pack B off the daily default before 100/100", () => {
    const ninetyNine = {
      ...emptyProgress(),
      completedIds: readings.slice(0, 99).map((item) => item.id),
    };
    assert.equal(packAComplete(ninetyNine), false);
    assert.equal(dailyDefaultPackId(ninetyNine), PACK_A_ID);
    assert.equal(ninetyNine.unlockedHomemadeAt, null);
  });

  it("unlocks Pack B as daily default only at 100/100", () => {
    let progress = {
      ...emptyProgress(),
      completedIds: readings.slice(0, 99).map((item) => item.id),
    };
    progress = markReadingDone(progress, readings[99], readings, new Date("2026-09-20T00:00:00Z"));
    assert.equal(progress.completedIds.length, 100);
    assert.equal(packAComplete(progress), true);
    assert.equal(dailyDefaultPackId(progress), PACK_B_ID);
    assert.equal(progress.unlockedHomemadeAt, "2026-09-20T00:00:00.000Z");
  });
});

describe("localStorage mindpal.readings.v1", () => {
  it("round-trips progress on the idiomatic key", () => {
    const store = new Map();
    const storage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
    };
    const saved = saveProgress(
      { completedIds: [readings[0].id] },
      storage,
    );
    assert.equal(store.has(STORAGE_KEY), true);
    assert.deepEqual(JSON.parse(store.get(STORAGE_KEY)).completedIds, [readings[0].id]);
    assert.deepEqual(loadProgress(storage).completedIds, saved.completedIds);
  });

  it("migrates the gate-doc legacy key", () => {
    const store = new Map([
      ["mindpal.reading.progress.v1", JSON.stringify({ completedIds: [readings[0].id] })],
    ]);
    const storage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
    };
    const loaded = loadProgress(storage);
    assert.deepEqual(loaded.completedIds, [readings[0].id]);
    assert.equal(store.has(STORAGE_KEY), true);
  });

  it("ignores corrupt JSON", () => {
    assert.deepEqual(parseProgressJson("not-json").completedIds, []);
  });
});
