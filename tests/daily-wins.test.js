import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STEP_IDS, STEP_META, hubStepCaption } from "../src/today/steps.js";
import {
  WINS_STORAGE_KEY,
  WINS_STORAGE_KEY_V1,
  WINS_STORAGE_KEY_V2_BACKUP,
  MAX_CORRUPT_BACKUPS,
  WINS_STORE_VERSION,
  WIN_NOT_SAVED_LABEL,
  WIN_SAVED_LABEL,
  WIN_OF_THE_DAY_EMPTY,
  WIN_OF_THE_DAY_EYEBROW,
  WIN_OF_THE_DAY_LEDE,
  WIN_OF_THE_DAY_TITLE,
  WIN_PHOTO_PROTOTYPE_LABEL,
  WIN_PLACEHOLDER_PHOTO,
  addWin,
  emptyWinsStore,
  loadWinsStore,
  migrateV1WinsJson,
  normalizeWin,
  saveWinsStore,
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

function listedWinsStorage(initial = {}, { onSet } = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get length() {
      return store.size;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (onSet) onSet(key, value);
      store.set(key, value);
    },
  };
}

function stampedBackups(storage) {
  return [...storage.store.entries()].filter(([key]) =>
    key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`),
  );
}

function userCopy(result) {
  return result.saved ? WIN_SAVED_LABEL : WIN_NOT_SAVED_LABEL;
}

const morning = new Date(2026, 8, 20, 9, 0, 0);
const evening = new Date(2026, 8, 20, 21, 0, 0);
const nextDay = new Date(2026, 8, 21, 8, 0, 0);

describe("daily wins", () => {
  it("stores a win on the civil day and reads it back at evening", () => {
    const storage = memoryStorage();
    const added = addWin("Walked to the shops", storage, morning, morning);
    assert.equal(added.saved, true);
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
    assert.equal(added.saved, false);
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

  it("keeps a v2 win model and accepts only the bundled placeholder photo", () => {
    assert.equal(WINS_STORAGE_KEY, "mindpal.dailyWins.v2");
    assert.equal(WINS_STORAGE_KEY_V1, "mindpal.dailyWins.v1");
    assert.equal(WINS_STORE_VERSION, 2);
    assert.equal(emptyWinsStore().version, 2);
    assert.equal(
      WIN_PHOTO_PROTOTYPE_LABEL,
      "Prototype: placeholder image, not real private storage.",
    );
    assert.equal(WIN_PLACEHOLDER_PHOTO, "/mindpal/win-placeholder.svg");
    const svg = readFileSync(join(root, "../win-placeholder.svg"), "utf8");
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /PLACEHOLDER/);
    assert.doesNotMatch(svg, /<image\b/i);
    assert.doesNotMatch(svg, /data:image/i);

    const storage = memoryStorage();
    const plain = addWin("A quiet cup of tea", storage, morning, morning);
    assert.equal(plain.item.text, "A quiet cup of tea");
    assert.equal(Object.hasOwn(plain.item, "photo"), false);
    const withPhoto = addWin(
      "Saw the placeholder",
      storage,
      morning,
      new Date(2026, 8, 20, 9, 5, 0),
      WIN_PLACEHOLDER_PHOTO,
    );
    assert.equal(withPhoto.item.photo, WIN_PLACEHOLDER_PHOTO);
    assert.equal(withPhoto.items[0].text, "A quiet cup of tea");
    assert.equal(Object.hasOwn(withPhoto.items[0], "photo"), false);
    assert.equal(withPhoto.items[1].photo, WIN_PLACEHOLDER_PHOTO);

    for (const rejected of [
      "data:image/png;base64,aaaa",
      "https://example.com/private.jpg",
      "file:///tmp/face.png",
      "/mindpal/win-placeholder.svg?user=1",
      "win-placeholder.svg",
    ]) {
      const added = addWin(
        `Reject ${rejected.slice(0, 12)}`,
        storage,
        morning,
        new Date(2026, 8, 20, 9, 6, 0),
        rejected,
      );
      assert.equal(Object.hasOwn(added.item, "photo"), false, rejected);
    }
    const saved = JSON.parse(storage.getItem(WINS_STORAGE_KEY));
    assert.equal(saved.version, 2);
    assert.equal(storage.store.has(WINS_STORAGE_KEY_V1), false);
    const normalized = normalizeWin({
      id: "keep",
      text: "Still here",
      at: "2026-09-20T09:00:00.000Z",
      photo: "data:image/jpeg;base64,secret",
    });
    assert.deepEqual(normalized, {
      id: "keep",
      text: "Still here",
      at: "2026-09-20T09:00:00.000Z",
    });
  });

  it("migrates v1 wins into v2 and leaves the v1 record intact", () => {
    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({
      version: 1,
      days: {
        "2026-09-20": [
          {
            id: "win-keep",
            text: "Walked to the shops",
            at,
            photo: "data:image/png;base64,not-a-real-photo",
          },
        ],
      },
    });
    const storage = memoryStorage({ [WINS_STORAGE_KEY_V1]: v1 });
    const loaded = loadWinsStore(storage);
    assert.equal(loaded.version, 2);
    assert.deepEqual(loaded.days["2026-09-20"], [
      { id: "win-keep", text: "Walked to the shops", at },
    ]);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    const written = JSON.parse(storage.getItem(WINS_STORAGE_KEY));
    assert.equal(written.version, 2);
    assert.deepEqual(written.days["2026-09-20"][0], {
      id: "win-keep",
      text: "Walked to the shops",
      at,
    });
    const again = loadWinsStore(storage);
    assert.equal(again.days["2026-09-20"][0].id, "win-keep");
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);

    const added = addWin("Evening note", storage, evening, evening);
    assert.equal(added.items.length, 2);
    assert.equal(added.items[0].id, "win-keep");
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    assert.equal(migrateV1WinsJson("{not json"), null);
  });

  it("does not write v2 or change v1 when migration fails", () => {
    const broken = "{not json";
    const storage = memoryStorage({ [WINS_STORAGE_KEY_V1]: broken });
    const loaded = loadWinsStore(storage);
    assert.deepEqual(loaded, emptyWinsStore());
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), broken);
    assert.equal(storage.store.has(WINS_STORAGE_KEY), false);

    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "win-1", text: "Tea", at }] },
    });
    let v1Writes = 0;
    const failing = {
      getItem(key) {
        if (key === WINS_STORAGE_KEY_V1) return v1;
        return null;
      },
      setItem(key) {
        if (key === WINS_STORAGE_KEY_V1) {
          v1Writes += 1;
          throw new Error("v1 must stay untouched");
        }
        throw new Error("quota");
      },
    };
    const migrated = loadWinsStore(failing);
    assert.equal(v1Writes, 0);
    assert.equal(migrated.days["2026-09-20"][0].text, "Tea");
    assert.equal(migrated.days["2026-09-20"][0].id, "win-1");
    assert.equal(Object.hasOwn(migrated.days["2026-09-20"][0], "photo"), false);
    assert.equal(failing.getItem(WINS_STORAGE_KEY_V1), v1);

    const kept = memoryStorage({
      [WINS_STORAGE_KEY_V1]: v1,
      [WINS_STORAGE_KEY]: JSON.stringify({
        version: 2,
        days: { "2026-09-21": [{ id: "newer", text: "Already moved", at }] },
      }),
    });
    const existing = loadWinsStore(kept);
    assert.equal(existing.days["2026-09-21"][0].id, "newer");
    assert.equal(existing.days["2026-09-20"], undefined);
    assert.equal(kept.getItem(WINS_STORAGE_KEY_V1), v1);
    saveWinsStore(existing, kept);
    assert.equal(kept.getItem(WINS_STORAGE_KEY_V1), v1);
  });

  it("keeps a corrupt v2 record and still lets the next save persist", () => {
    const corrupt = "{\"version\":2,\"days\":";
    const at = "2026-09-20T09:00:00.000Z";
    const readableV1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "win-old", text: "Tea", at }] },
    });
    const unreadableV1 = "{not json";
    const stamp = morning.getTime();
    const later = new Date(2026, 8, 20, 9, 30, 0);
    assert.equal(WIN_SAVED_LABEL, "Saved on this device for today.");
    assert.equal(WIN_NOT_SAVED_LABEL, "Not saved. This win was not stored on this device.");
    assert.doesNotMatch(WIN_NOT_SAVED_LABEL, /Saved on this device/);

    function reloadTexts(storage) {
      return winsForDate(loadWinsStore(storage), morning).map((item) => item.text);
    }
    function backupCopies(storage) {
      return [...storage.store.entries()].filter(([key]) => key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`));
    }
    function userCopy(result) {
      return result.saved ? WIN_SAVED_LABEL : WIN_NOT_SAVED_LABEL;
    }

    const brokenV1 = memoryStorage({
      [WINS_STORAGE_KEY]: corrupt,
      [WINS_STORAGE_KEY_V1]: unreadableV1,
    });
    const firstBroken = addWin("Fresh", brokenV1, morning, morning);
    assert.equal(firstBroken.saved, true);
    assert.equal(userCopy(firstBroken), WIN_SAVED_LABEL);
    assert.deepEqual(firstBroken.items.map((item) => item.text), ["Fresh"]);
    assert.equal(brokenV1.getItem(WINS_STORAGE_KEY_V1), unreadableV1);
    assert.deepEqual(backupCopies(brokenV1), [[`${WINS_STORAGE_KEY_V2_BACKUP}.${stamp}`, corrupt]]);
    assert.deepEqual(reloadTexts(brokenV1), ["Fresh"]);
    const secondBroken = addWin("Again", brokenV1, morning, later);
    assert.equal(secondBroken.saved, true);
    assert.equal(userCopy(secondBroken), WIN_SAVED_LABEL);
    assert.deepEqual(reloadTexts(brokenV1), ["Fresh", "Again"]);

    const noV1 = memoryStorage({ [WINS_STORAGE_KEY]: corrupt });
    const firstNew = addWin("Fresh", noV1, morning, morning);
    assert.equal(firstNew.saved, true);
    assert.equal(userCopy(firstNew), WIN_SAVED_LABEL);
    assert.equal(noV1.store.has(WINS_STORAGE_KEY_V1), false);
    assert.deepEqual(backupCopies(noV1), [[`${WINS_STORAGE_KEY_V2_BACKUP}.${stamp}`, corrupt]]);
    assert.deepEqual(reloadTexts(noV1), ["Fresh"]);
    const secondNew = addWin("Again", noV1, morning, later);
    assert.equal(secondNew.saved, true);
    assert.deepEqual(reloadTexts(noV1), ["Fresh", "Again"]);

    const olderBackup = "older-unreadable-record";
    const takenKey = `${WINS_STORAGE_KEY_V2_BACKUP}.${stamp}`;
    const takenValue = "different-timestamp-backup";
    const withBackup = memoryStorage({
      [WINS_STORAGE_KEY]: corrupt,
      [WINS_STORAGE_KEY_V1]: readableV1,
      [WINS_STORAGE_KEY_V2_BACKUP]: olderBackup,
      [takenKey]: takenValue,
    });
    const firstKept = addWin("Fresh", withBackup, morning, morning);
    assert.equal(firstKept.saved, true);
    assert.equal(userCopy(firstKept), WIN_SAVED_LABEL);
    assert.equal(withBackup.getItem(WINS_STORAGE_KEY_V1), readableV1);
    assert.equal(withBackup.getItem(WINS_STORAGE_KEY_V2_BACKUP), olderBackup);
    assert.equal(withBackup.getItem(takenKey), takenValue);
    assert.equal(withBackup.getItem(`${takenKey}.1`), corrupt);
    assert.deepEqual(reloadTexts(withBackup), ["Tea", "Fresh"]);
    const secondKept = addWin("Again", withBackup, morning, later);
    assert.equal(secondKept.saved, true);
    assert.equal(userCopy(secondKept), WIN_SAVED_LABEL);
    assert.deepEqual(reloadTexts(withBackup), ["Tea", "Fresh", "Again"]);
    assert.equal(withBackup.getItem(WINS_STORAGE_KEY_V2_BACKUP), olderBackup);
    assert.equal(withBackup.getItem(takenKey), takenValue);

    const blocked = {
      failBackup: true,
      store: new Map([
        [WINS_STORAGE_KEY, corrupt],
        [WINS_STORAGE_KEY_V1, readableV1],
      ]),
      getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
      },
      setItem(key, value) {
        if (key === WINS_STORAGE_KEY_V1) throw new Error("v1 must stay untouched");
        if (this.failBackup && (key === WINS_STORAGE_KEY_V2_BACKUP || key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`))) {
          throw new Error("backup quota");
        }
        this.store.set(key, value);
      },
    };
    const failed = addWin("Fresh", blocked, morning, morning);
    assert.equal(failed.saved, false);
    assert.equal(failed.item.text, "Fresh");
    assert.equal(userCopy(failed), WIN_NOT_SAVED_LABEL);
    assert.deepEqual(failed.items.map((item) => item.text), ["Tea"]);
    assert.equal(blocked.getItem(WINS_STORAGE_KEY), corrupt);
    assert.equal(blocked.getItem(WINS_STORAGE_KEY_V1), readableV1);
    assert.equal([...blocked.store.keys()].some((key) => key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`)), false);
    assert.deepEqual(winsForDate(loadWinsStore(blocked, morning), morning).map((item) => item.text), ["Tea"]);
    assert.equal(blocked.getItem(WINS_STORAGE_KEY), corrupt);
    blocked.failBackup = false;
    const recovered = addWin("Again", blocked, morning, later);
    assert.equal(recovered.saved, true);
    assert.equal(userCopy(recovered), WIN_SAVED_LABEL);
    assert.deepEqual(winsForDate(loadWinsStore(blocked, later), morning).map((item) => item.text), ["Tea", "Again"]);
    assert.equal(blocked.getItem(`${WINS_STORAGE_KEY_V2_BACKUP}.${later.getTime()}`), corrupt);
    const third = addWin("Later", blocked, morning, new Date(2026, 8, 20, 9, 45, 0));
    assert.equal(third.saved, true);
    assert.deepEqual(
      winsForDate(loadWinsStore(blocked), morning).map((item) => item.text),
      ["Tea", "Again", "Later"],
    );
    assert.match(build, /WINS_STORE_VERSION,WINS_STORAGE_KEY_V2_BACKUP,WIN_SAVED_LABEL,WIN_NOT_SAVED_LABEL,MAX_CORRUPT_BACKUPS/);
  });

  it("does not pile up backups when the fresh v2 write fails", () => {
    const corrupt = "{\"version\":2,\"days\":";
    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "win-old", text: "Tea", at }] },
    });
    const flags = { failV2: true };
    let backupWrites = 0;
    const storage = listedWinsStorage(
      {
        [WINS_STORAGE_KEY]: corrupt,
        [WINS_STORAGE_KEY_V1]: v1,
      },
      {
        onSet(key) {
          if (flags.failV2 && key === WINS_STORAGE_KEY) throw new Error("v2 quota");
          if (key === WINS_STORAGE_KEY_V1) throw new Error("v1 must stay untouched");
          if (key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`)) backupWrites += 1;
        },
      },
    );

    for (let i = 0; i < 5; i += 1) {
      const loaded = loadWinsStore(storage, new Date(2026, 8, 20, 10, i, 0));
      assert.equal(winsForDate(loaded, morning)[0].text, "Tea");
      assert.equal(storage.getItem(WINS_STORAGE_KEY), corrupt);
      assert.equal(stampedBackups(storage).length, 0);
      assert.equal(backupWrites, 0);
    }

    const first = addWin("Fresh", storage, morning, morning);
    assert.equal(first.saved, false);
    assert.equal(first.item.text, "Fresh");
    assert.deepEqual(first.items.map((item) => item.text), ["Tea"]);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), corrupt);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    assert.equal(backupWrites, 1);
    assert.equal(stampedBackups(storage).length, 1);
    assert.equal(storage.getItem(stampedBackups(storage)[0][0]), corrupt);

    for (let i = 0; i < 5; i += 1) {
      loadWinsStore(storage, new Date(2026, 8, 20, 10, 10 + i, 0));
      const again = addWin(`Note ${i}`, storage, morning, new Date(2026, 8, 20, 11, i, 0));
      assert.equal(again.saved, false);
      assert.equal(userCopy(again), WIN_NOT_SAVED_LABEL);
      assert.deepEqual(again.items.map((item) => item.text), ["Tea"]);
      assert.equal(storage.getItem(WINS_STORAGE_KEY), corrupt);
      assert.equal(backupWrites, 1);
      assert.equal(stampedBackups(storage).length, 1);
    }

    flags.failV2 = false;
    const saved = addWin("Kept", storage, morning, new Date(2026, 8, 20, 12, 0, 0));
    assert.equal(saved.saved, true);
    assert.equal(userCopy(saved), WIN_SAVED_LABEL);
    assert.equal(backupWrites, 1);
    assert.equal(stampedBackups(storage).length, 1);
    assert.equal(storage.getItem(stampedBackups(storage)[0][0]), corrupt);
    assert.deepEqual(
      winsForDate(loadWinsStore(storage), morning).map((item) => item.text),
      ["Tea", "Kept"],
    );
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
  });

  it("stops at three timestamped backups when each corrupt record is different", () => {
    const flags = { failV2: true };
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: "corrupt-0" },
      {
        onSet(key) {
          if (flags.failV2 && key === WINS_STORAGE_KEY) throw new Error("v2 quota");
        },
      },
    );
    for (let i = 0; i < MAX_CORRUPT_BACKUPS; i += 1) {
      storage.store.set(WINS_STORAGE_KEY, `corrupt-${i}`);
      const result = addWin(`Win ${i}`, storage, morning, new Date(2026, 8, 20, 9, i, 0));
      assert.equal(result.saved, false);
      assert.equal(userCopy(result), WIN_NOT_SAVED_LABEL);
      assert.equal(stampedBackups(storage).length, i + 1);
    }
    const held = stampedBackups(storage);
    assert.equal(held.length, MAX_CORRUPT_BACKUPS);
    storage.store.set(WINS_STORAGE_KEY, "corrupt-extra");
    const blocked = addWin("Extra", storage, morning, new Date(2026, 8, 20, 9, 30, 0));
    assert.equal(blocked.saved, false);
    assert.equal(userCopy(blocked), WIN_NOT_SAVED_LABEL);
    assert.deepEqual(stampedBackups(storage), held);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), "corrupt-extra");
    assert.equal(storage.store.has(WINS_STORAGE_KEY_V1), false);

    flags.failV2 = false;
    storage.store.set(WINS_STORAGE_KEY, "corrupt-0");
    const recovered = addWin("Kept", storage, morning, new Date(2026, 8, 20, 9, 45, 0));
    assert.equal(recovered.saved, true);
    assert.equal(userCopy(recovered), WIN_SAVED_LABEL);
    assert.deepEqual(stampedBackups(storage), held);
    assert.deepEqual(
      winsForDate(loadWinsStore(storage), morning).map((item) => item.text),
      ["Kept"],
    );
  });

  it("shows the placeholder thumbnail only on the Win of the day card", () => {
    const panel = inject.slice(inject.indexOf("function mpWinsPanel("), inject.indexOf("function mpMaddyTeaser("));
    assert.match(panel, /e===`winOfDay`&&w\.photo===mpWins\.WIN_PLACEHOLDER_PHOTO\?\(0,A\.jsxs\)\(`figure`/);
    assert.match(panel, /src:mpWins\.WIN_PLACEHOLDER_PHOTO,alt:mpWins\.WIN_PHOTO_PROTOTYPE_LABEL/);
    assert.match(panel, /children:mpWins\.WIN_PHOTO_PROTOTYPE_LABEL/);
    assert.match(panel, /Attach prototype placeholder image/);
    assert.equal(panel.split("className:`mp-win-photo`").length - 1, 1);
    assert.match(panel, /e===`winOfDay`&&p\?mpWins\.addWin\(i,void 0,void 0,void 0,mpWins\.WIN_PLACEHOLDER_PHOTO\):mpWins\.addWin\(i\)/);
    assert.match(panel, /if\(!u\.saved\)\{s\(mpWins\.WIN_NOT_SAVED_LABEL\);return\}/);
    assert.match(panel, /a\(``\),s\(mpWins\.WIN_SAVED_LABEL\),r\(u\.items\)/);
    assert.doesNotMatch(panel, /s\(`Saved on this device for today\.`\)/);
    assert.match(panel, /e===`evening`\?\(0,A\.jsx\)\(`h2`,\{children:`Today’s wins`\}/);
    assert.match(panel, /e===`growth`\?/);
    assert.match(panel, /e===`nudge`\?/);
    assert.match(panel, /if\(e===`hub`\)/);
    assert.doesNotMatch(panel, /type:`file`/);
    assert.doesNotMatch(panel, /capture=/);
    assert.match(css, /\.mp-win-of-day \.mp-win-photo img\{/);
    assert.match(inject, /not real private photo storage/);
    assert.doesNotMatch(inject, /Wins, photos and friends stay on this device/);
    assert.match(build, /WINS_STORAGE_KEY_V1,WINS_STORE_VERSION/);
    assert.match(build, /WIN_PLACEHOLDER_PHOTO,WIN_PHOTO_PROTOTYPE_LABEL/);
    assert.match(build, /migrateV1WinsJson/);
  });
});
