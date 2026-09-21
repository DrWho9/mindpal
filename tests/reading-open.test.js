import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OPEN_READING_EVENT,
  OPEN_READING_KEY,
  findReadingById,
  openReading,
  peekOpenReadingId,
  takeOpenReadingId,
} from "../src/readings/open.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
const kitUi = readFileSync(join(root, "../src/patches/feelings-readings.inject.js"), "utf8");
const daily = readFileSync(join(root, "../src/patches/daily-reading.inject.js"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe("open reading helper", () => {
  it("finds a Pack A chapter by id and stores a deep-link", () => {
    const first = packA.readings[0];
    assert.equal(findReadingById(first.id, packA).title, first.title);
    assert.equal(findReadingById("missing-id", packA), null);
    const storage = memoryStorage();
    const events = [];
    const id = openReading(first.id, {
      storage,
      windowObj: {
        dispatchEvent(event) {
          events.push(event.type);
          return true;
        },
      },
    });
    assert.equal(id, first.id);
    assert.equal(peekOpenReadingId(storage), first.id);
    assert.equal(takeOpenReadingId(storage), first.id);
    assert.equal(takeOpenReadingId(storage), "");
    assert.ok(events.includes(OPEN_READING_EVENT));
    assert.equal(storage.store.has(OPEN_READING_KEY), false);
  });

  it("wires a reusable book reader for Readings, Today, and hubs", () => {
    assert.match(inject, /function mpBookReader\(/);
    assert.match(inject, /function mpHubOpenableReadings\(/);
    assert.match(inject, /function mpNightBand\(/);
    assert.match(inject, /Open Journal/);
    assert.match(inject, /Open the book reader/);
    assert.match(inject, /mpHubOpenableReadings,\{readings:u/);
    assert.match(kitUi, /mpKitReadingArticle/);
    assert.match(kitUi, /Open the reading/);
    assert.match(daily, /takeOpenReadingId|openReading/);
    assert.match(daily, /mindpal-daily-reading/);
    assert.match(build, /openReading,findReadingById/);
    assert.match(build, /\{name:`My diary`,icon:rn\}/);
  });
});
