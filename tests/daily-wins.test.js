import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WINS_STORAGE_KEY,
  addWin,
  loadWinsStore,
  winsForDate,
} from "../src/today/wins.js";

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    store,
  };
}

const morning = new Date(2026, 8, 20, 9, 0, 0);
const evening = new Date(2026, 8, 20, 21, 0, 0);
const nextDay = new Date(2026, 8, 21, 8, 0, 0);

describe("daily wins", () => {
  it("stores a win on the civil day and reads it back at evening", () => {
    const storage = memoryStorage();
    const added = addWin("Walked to the shops", storage, morning, morning);
    assert.equal(added.items.length, 1);
    assert.equal(added.items[0].text, "Walked to the shops");
    assert.equal(storage.store.has(WINS_STORAGE_KEY), true);
    const tonight = winsForDate(loadWinsStore(storage), evening);
    assert.equal(tonight.length, 1);
    assert.equal(tonight[0].text, "Walked to the shops");
  });

  it("does not mix yesterday’s wins into a new civil day", () => {
    const storage = memoryStorage();
    addWin("Yesterday’s cup of tea", storage, morning, morning);
    assert.equal(winsForDate(loadWinsStore(storage), nextDay).length, 0);
    assert.equal(winsForDate(loadWinsStore(storage), morning).length, 1);
  });

  it("ignores blank text", () => {
    const storage = memoryStorage();
    const added = addWin("   ", storage, morning, morning);
    assert.equal(added.item, null);
    assert.equal(added.items.length, 0);
  });
});
