import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COPTIC_PREF_KEY,
  isCopticDateEnabled,
  setCopticDateEnabled,
  sessionPreferences,
} from "../src/prefs/faith.js";

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe("Coptic calendar preference", () => {
  it("is off by default", () => {
    assert.equal(isCopticDateEnabled(memoryStorage()), false);
  });

  it("turns on from the settings key", () => {
    const storage = memoryStorage();
    setCopticDateEnabled(true, storage);
    assert.equal(storage.store.get(COPTIC_PREF_KEY), "1");
    assert.equal(isCopticDateEnabled(storage), true);
  });

  it("follows a signed-in account tradition that names Coptic", () => {
    const storage = memoryStorage({
      "mindpal.sessionUser.v1": "Mo1",
      "mindpal.localAccounts.v1": JSON.stringify({
        version: 1,
        accounts: [
          {
            username: "Mo1",
            preferences: { tradition: "Coptic Orthodox", morningVerseEnabled: true },
          },
        ],
      }),
    });
    assert.equal(sessionPreferences(storage).tradition, "Coptic Orthodox");
    assert.equal(isCopticDateEnabled(storage), true);
  });

  it("writes showCopticDate onto the signed-in account prefs", () => {
    const storage = memoryStorage({
      "mindpal.sessionUser.v1": "Mo1",
      "mindpal.localAccounts.v1": JSON.stringify({
        version: 1,
        accounts: [{ username: "Mo1", preferences: { tradition: "Christianity" } }],
      }),
    });
    setCopticDateEnabled(true, storage);
    const prefs = JSON.parse(storage.store.get("mindpal.localAccounts.v1")).accounts[0]
      .preferences;
    assert.equal(prefs.showCopticDate, true);
    assert.equal(isCopticDateEnabled(storage), true);
  });
});
