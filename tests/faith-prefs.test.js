import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACCOUNTS_KEY,
  COPTIC_PREF_KEY,
  OTHER_TRADITIONS,
  PRIMARY_TRADITIONS,
  SESSION_KEY,
  UNIVERSAL_FALLBACK,
  faithSummary,
  hasFaithPreference,
  isCopticDateEnabled,
  isSecularPrefs,
  lanesForTradition,
  pickMorningVerse,
  prefsFromChoice,
  sessionPreferences,
  setCopticDateEnabled,
  setSessionFaithPrefs,
  shouldShowFaithModules,
  shouldShowMorningPrayer,
  traditionIdFromPrefs,
} from "../src/prefs/faith.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
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

const catalog = {
  default: {
    id: "default",
    lane: "christian",
    verse: { text: "Christian default", reference: "Psalm 118:24 · WEB" },
  },
  entries: [
    {
      id: "c1",
      date: "2026-09-21",
      lane: "christian",
      verse: { text: "Peace I leave with you.", reference: "John 14:27 · WEB" },
    },
    {
      id: "i1",
      date: "2026-09-20",
      lane: "islamic",
      verse: { text: "With hardship comes ease.", reference: "Qur’an 94:5–6" },
    },
    {
      id: "b1",
      date: null,
      lane: "buddhist",
      verse: { text: "Hatred is never ended by hatred.", reference: "Dhammapada 1:5" },
    },
    {
      id: "j1",
      date: null,
      lane: "jewish",
      verse: { text: "Yahweh is my shepherd.", reference: "Psalm 23:1–2 · WEB" },
    },
  ],
};

describe("sign-in faith preference", () => {
  it("keeps the AU primary chips and a fuller Other list", () => {
    assert.deepEqual(
      PRIMARY_TRADITIONS.map((item) => item.label),
      ["Christianity", "Islam", "Buddhism", "Hinduism"],
    );
    const other = OTHER_TRADITIONS.map((item) => item.label);
    assert.ok(other.includes("Judaism"));
    assert.ok(other.includes("Sikhism"));
    assert.ok(other.includes("Bahá’í"));
    assert.ok(other.includes("Spiritual but not listed"));
    assert.ok(other.includes("Prefer not to say"));
    assert.ok(other.includes("Aboriginal and Torres Strait Islander spirituality"));
  });

  it("stores secular on the signed-in local account and survives a re-read", () => {
    const storage = memoryStorage({
      [SESSION_KEY]: "Sam",
      [ACCOUNTS_KEY]: JSON.stringify({
        version: 1,
        accounts: [{ username: "Sam", preferences: {} }],
      }),
    });
    setSessionFaithPrefs({ stance: "secular" }, storage);
    const prefs = sessionPreferences(storage);
    assert.equal(prefs.faithStance, "secular");
    assert.equal(prefs.tradition, "");
    assert.equal(prefs.morningVerseEnabled, false);
    assert.equal(isSecularPrefs(prefs), true);
    assert.equal(shouldShowFaithModules(prefs), false);
    assert.equal(pickMorningVerse(catalog, prefs), null);
    assert.equal(faithSummary(prefs), "No religion / secular");
    assert.equal(hasFaithPreference(sessionPreferences(storage)), true);
  });

  it("stores a religion on the same local-account preferences object", () => {
    const storage = memoryStorage({
      [SESSION_KEY]: "Sam",
      [ACCOUNTS_KEY]: JSON.stringify({
        version: 1,
        accounts: [{ username: "Sam", preferences: { showCopticDate: false } }],
      }),
    });
    setSessionFaithPrefs({ stance: "religious", traditionId: "islam" }, storage);
    const prefs = sessionPreferences(storage);
    assert.equal(prefs.faithStance, "religious");
    assert.equal(prefs.tradition, "Islam");
    assert.equal(prefs.traditionId, "islam");
    assert.equal(prefs.morningVerseEnabled, true);
    assert.equal(prefs.morningPrayerEnabled, false);
    assert.equal(prefs.showCopticDate, false);
    assert.equal(hasFaithPreference(prefs), true);
    assert.equal(shouldShowFaithModules(prefs), true);
    assert.equal(shouldShowMorningPrayer(prefs), false);
  });

  it("treats a legacy tradition string as already asked", () => {
    assert.equal(hasFaithPreference({ tradition: "Coptic Orthodox" }), true);
    assert.equal(traditionIdFromPrefs({ tradition: "Coptic Orthodox" }), "coptic");
    assert.equal(shouldShowMorningPrayer({ tradition: "Christianity" }), true);
    assert.equal(hasFaithPreference({}), false);
  });

  it("does not treat an unanswered new profile as already secular", () => {
    const unanswered = {
      faithStance: "",
      tradition: "",
      traditionId: "",
      morningVerseEnabled: false,
      morningPrayerEnabled: false,
    };
    assert.equal(hasFaithPreference(unanswered), false);
    assert.equal(isSecularPrefs(unanswered), false);
    assert.equal(shouldShowFaithModules(unanswered), false);
    assert.equal(faithSummary(unanswered), "Not set yet");
  });
});

describe("scripture targeting", () => {
  const monday = new Date(2026, 8, 21, 8, 0, 0);

  it("keeps Christianity on the existing Christian verse lane", () => {
    const prefs = prefsFromChoice({ stance: "religious", traditionId: "christianity" });
    assert.deepEqual(lanesForTradition(prefs), ["christian"]);
    const verse = pickMorningVerse(catalog, prefs, monday);
    assert.equal(verse.lane, "christian");
    assert.equal(verse.id, "c1");
    assert.equal(shouldShowMorningPrayer(prefs), true);
  });

  it("picks Islam and Buddhism from their own lanes, never a Christian default", () => {
    const islam = pickMorningVerse(
      catalog,
      prefsFromChoice({ stance: "religious", traditionId: "islam" }),
      monday,
    );
    assert.equal(islam.lane, "islamic");
    assert.match(islam.verse.reference, /Qur/);
    const buddhist = pickMorningVerse(
      catalog,
      prefsFromChoice({ stance: "religious", traditionId: "buddhism" }),
      monday,
    );
    assert.equal(buddhist.lane, "buddhist");
    assert.match(buddhist.verse.reference, /Dhammapada/);
  });

  it("uses a gentle universal fallback when a tradition has no scripture here", () => {
    for (const id of ["hinduism", "sikhism", "bahai", "spiritual", "prefer_not"]) {
      const verse = pickMorningVerse(
        catalog,
        prefsFromChoice({ stance: "religious", traditionId: id }),
        monday,
      );
      assert.equal(verse.fallback, true);
      assert.equal(verse.id, UNIVERSAL_FALLBACK.id);
      assert.doesNotMatch(verse.verse.text, /Yahweh|Qur|Dhammapada|Psalm/i);
      assert.match(verse.verse.source_note, /not a sacred text/i);
    }
  });

  it("never substitutes another tradition’s scripture", () => {
    const hindu = pickMorningVerse(
      catalog,
      prefsFromChoice({ stance: "religious", traditionId: "hinduism" }),
      monday,
    );
    assert.notEqual(hindu.lane, "christian");
    assert.notEqual(hindu.lane, "islamic");
    assert.notEqual(hindu.lane, "buddhist");
    assert.notEqual(hindu.lane, "jewish");
  });
});

describe("faith preference surfaces", () => {
  it("asks once at sign-in and can be edited on the Local account card", () => {
    assert.match(inject, /function mpNeedsFaithSetup/);
    assert.match(inject, /function mpShowSignInGate/);
    assert.match(inject, /function mpFaithPrefQuestions/);
    assert.match(inject, /setFaithAsk\(mpNeedsFaithSetup\(\)\)/);
    assert.match(inject, /if\(faithAsk\)/);
    assert.match(inject, /I have a faith \/ religion/);
    assert.match(inject, /No religion \/ prefer secular/);
    assert.match(inject, /So we can relate to you — what’s your religion\?/);
    assert.match(inject, /function mpAccountFaithCard/);
    assert.match(inject, /mpAccountFaithCard/);
    assert.match(inject, /function mpMorningVerse/);
    assert.match(inject, /pickMorningVerse\(mpFaithCatalog/);
    assert.doesNotMatch(inject, /LOCAL ACCOUNT/);
  });

  it("does not default new local profiles to Christianity", () => {
    assert.match(
      build,
      /faithStance:``,tradition:``,traditionId:``/,
    );
    assert.match(build, /t===`verse`&&\(0,A\.jsx\)\(mpMorningVerse,\{\}\)/);
    assert.match(build, /mpShowSignInGate\(\)/);
  });
});
