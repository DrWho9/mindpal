import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STEP_IDS, STEP_META, hubStepCaption } from "../src/today/steps.js";
import {
  WINS_STORAGE_KEY,
  WIN_OF_THE_DAY_EMPTY,
  WIN_OF_THE_DAY_EYEBROW,
  WIN_OF_THE_DAY_LEDE,
  WIN_OF_THE_DAY_TITLE,
  addWin,
  loadWinsStore,
  winsForDate,
} from "../src/today/wins.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
const css = readFileSync(join(root, "../src/patches/styles.css"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");

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

  it("names an always-on Win of the day that is not a Today step", () => {
    assert.equal(WIN_OF_THE_DAY_TITLE, "Win of the day");
    assert.equal(WIN_OF_THE_DAY_EYEBROW, "WIN OF THE DAY");
    assert.match(WIN_OF_THE_DAY_LEDE, /morning included/i);
    assert.match(WIN_OF_THE_DAY_EMPTY, /Nothing saved yet today/);
    assert.doesNotMatch(WIN_OF_THE_DAY_TITLE, /step/i);
    assert.doesNotMatch(WIN_OF_THE_DAY_EYEBROW, /step/i);
    assert.doesNotMatch(WIN_OF_THE_DAY_LEDE, /step\s*0/i);
    assert.deepEqual(STEP_IDS, ["readings", "focus", "later", "evening"]);
    assert.equal(Object.hasOwn(STEP_META, "win"), false);
    assert.equal(Object.hasOwn(STEP_META, "winOfDay"), false);
    assert.equal(STEP_META.readings.number, 1);
    assert.equal(STEP_META.readings.title, "Readings");
    assert.equal(hubStepCaption("readings"), "Step 1 · Readings — Verse of the day");
  });

  it("puts Win of the day above Individual Growth Step 1 and still reviews wins at Evening", () => {
    const hub = inject.slice(inject.indexOf("function Rr("));
    const win = hub.indexOf("mpWinsPanel,{variant:`winOfDay`}");
    const growth = hub.indexOf("mpIndividualGrowthCard,{onOpenJournal");
    const talk = hub.indexOf("mpTodayTalkRow,{onReflect:R,onAppointment:Q}");
    assert.ok(win > 0 && growth > win && talk > growth);
    assert.match(inject, /e===`winOfDay`\?mpWins\.WIN_OF_THE_DAY_TITLE/);
    assert.match(inject, /children:mpWins\.WIN_OF_THE_DAY_TITLE/);
    assert.match(inject, /children:mpWins\.WIN_OF_THE_DAY_LEDE/);
    assert.match(inject, /e===`winOfDay`\?mpWins\.WIN_OF_THE_DAY_EMPTY/);
    assert.match(inject, /mpWins\.addWin\(i\)/);
    assert.match(inject, /mpWins\.winsForDate\(mpWins\.loadWinsStore\(\)\)/);
    assert.match(inject, /id:`mp-win-\$\{e\}`/);
    assert.match(inject, /e\.key===`Enter`&&l\(\)/);
    assert.match(inject, /function mpEveningPage/);
    assert.match(inject, /function mpNightBand/);
    assert.equal(inject.split("variant:`evening`").length - 1 >= 2, true);
    assert.doesNotMatch(inject, /Step 0/);
    assert.doesNotMatch(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpWinsPanel/);
    assert.match(css, /\.mp-win-of-day\{[^}]*width:100%/);
    assert.match(css, /\.mp-win-of-day input\{[^}]*min-height:44px/);
    assert.match(build, /WIN_OF_THE_DAY_TITLE,WIN_OF_THE_DAY_EYEBROW,WIN_OF_THE_DAY_LEDE,WIN_OF_THE_DAY_EMPTY/);
  });
});
