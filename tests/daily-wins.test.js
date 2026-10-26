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
  WIN_RESET_CANCEL,
  WIN_RESET_CONFIRM,
  WIN_RESET_DONE,
  WIN_RESET_FAILED,
  WIN_RESET_IMAGES_LEFT,
  WIN_RESET_LABEL,
  WIN_RESET_NOTE,
  WIN_RESET_UNNEEDED,
  WIN_UNKNOWN_TIME,
  WIN_UNKNOWN_TIME_LABEL,
  WIN_SAVED_LABEL,
  WIN_OF_THE_DAY_EMPTY,
  WIN_OF_THE_DAY_EYEBROW,
  WIN_OF_THE_DAY_LEDE,
  WIN_OF_THE_DAY_TITLE,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_PROTOTYPE_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_PLACEHOLDER_PHOTO,
  WINS_CHANGE_EVENT,
  addWin,
  clearWinsProbeCache,
  emptyWinsStore,
  exportV1,
  handleWinsStorageEvent,
  isWinsStorageKey,
  listenForWinsChanges,
  loadWinsStore,
  migrateV1WinsJson,
  normalizeWin,
  readWinsStore,
  removeWin,
  resetBlockedWins,
  saveWinsStore,
  stableWinId,
  winsForDate,
  winsSaveBlocked,
  winsSaveBlockedQuiet,
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
    removeItem: (key) => {
      store.delete(key);
    },
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
    removeItem(key) {
      store.delete(key);
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
    assert.match(inject, /e\.key===`Enter`&&!F\.current&&l\(\)/);
    assert.match(inject, /function mpEveningPage/);
    assert.match(inject, /function mpNightBand/);
    assert.equal(inject.split("variant:`evening`").length - 1 >= 2, true);
    assert.doesNotMatch(inject, /Step 0/);
    assert.doesNotMatch(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpWinsPanel/);
    assert.match(css, /\.mp-win-of-day\{[^}]*width:100%/);
    assert.match(css, /\.mp-win-of-day input\{[^}]*min-height:44px/);
    assert.match(build, /WIN_OF_THE_DAY_TITLE,WIN_OF_THE_DAY_EYEBROW,WIN_OF_THE_DAY_LEDE,WIN_OF_THE_DAY_EMPTY,PAST_WINS_PAGE_DAYS,PAST_WINS_TITLE,PAST_WINS_EMPTY,PAST_WINS_SHOW_MORE,PAST_WINS_REMOVE,emptyPastWins,pastWinsPage/);
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
    const referenced = normalizeWin({
      id: "photo-ref",
      text: "Stored on this device",
      at: "2026-09-20T09:00:00.000Z",
      photo: WIN_PHOTO_REF,
    });
    assert.equal(referenced.photo, WIN_PHOTO_REF);
    assert.equal(JSON.stringify(referenced).includes("<svg"), false);

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
    assert.deepEqual(winsForDate(loadWinsStore(blocked), morning).map((item) => item.text), ["Tea"]);
    assert.equal(blocked.getItem(WINS_STORAGE_KEY), corrupt);
    blocked.failBackup = false;
    const recovered = addWin("Again", blocked, morning, later);
    assert.equal(recovered.saved, true);
    assert.equal(userCopy(recovered), WIN_SAVED_LABEL);
    assert.deepEqual(winsForDate(loadWinsStore(blocked), morning).map((item) => item.text), ["Tea", "Again"]);
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
      const loaded = loadWinsStore(storage);
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
      loadWinsStore(storage);
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

  it("caps timestamped backups when storage has no key listing", () => {
    const store = new Map([[WINS_STORAGE_KEY, "corrupt-0"]]);
    const storage = {
      store,
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        if (key === WINS_STORAGE_KEY) throw new Error("v2 quota");
        store.set(key, value);
      },
    };
    assert.equal(Object.hasOwn(storage, "length"), false);
    assert.equal(Object.hasOwn(storage, "key"), false);
    for (let i = 0; i < MAX_CORRUPT_BACKUPS; i += 1) {
      store.set(WINS_STORAGE_KEY, `corrupt-${i}`);
      const result = addWin(`Win ${i}`, storage, morning, new Date(2026, 8, 20, 9, i, 0));
      assert.equal(result.saved, false);
      assert.equal(stampedBackups(storage).length, i + 1);
    }
    const held = stampedBackups(storage);
    store.set(WINS_STORAGE_KEY, "corrupt-extra");
    const blocked = addWin("Extra", storage, morning, new Date(2026, 8, 20, 9, 40, 0));
    assert.equal(blocked.saved, false);
    assert.equal(userCopy(blocked), WIN_NOT_SAVED_LABEL);
    assert.deepEqual(stampedBackups(storage), held);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), "corrupt-extra");
  });

  it("writes no backup when storage keys cannot be listed", () => {
    const bag = new Map([[WINS_STORAGE_KEY, "corrupt-a"]]);
    const writes = [];
    const storage = {
      getItem(key) {
        return bag.has(key) ? bag.get(key) : null;
      },
      setItem(key, value) {
        writes.push(key);
        bag.set(key, value);
      },
    };
    const first = addWin("One", storage, morning, morning);
    assert.equal(first.saved, false);
    assert.equal(userCopy(first), WIN_NOT_SAVED_LABEL);
    bag.set(WINS_STORAGE_KEY, "corrupt-b");
    const second = addWin("Two", storage, morning, new Date(2026, 8, 20, 9, 5, 0));
    assert.equal(second.saved, false);
    assert.equal(userCopy(second), WIN_NOT_SAVED_LABEL);
    assert.deepEqual(
      writes.filter((key) => key === WINS_STORAGE_KEY_V2_BACKUP || key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`)),
      [],
    );
    assert.equal(bag.get(WINS_STORAGE_KEY), "corrupt-b");
  });

  it("shows the placeholder thumbnail only on the Win of the day card", () => {
    const panel = inject.slice(inject.indexOf("function mpWinsPanel("), inject.indexOf("function mpMaddyTeaser("));
    assert.match(panel, /className:`mp-win-photo`/);
    assert.match(panel, /src,alt:caption/);
    assert.match(panel, /view&&view\.url\?view\.url:mpWins\.WIN_PLACEHOLDER_PHOTO/);
    assert.match(panel, /mpWins\.WIN_PHOTO_ON_DEVICE_LABEL/);
    assert.match(panel, /mpWins\.WIN_PHOTO_MISSING_LABEL/);
    assert.match(panel, /mpWins\.WIN_PHOTO_CHECKING_LABEL/);
    assert.match(panel, /children:mpWins\.WIN_PHOTO_PROTOTYPE_LABEL/);
    assert.match(panel, /Attach prototype placeholder image/);
    assert.equal(panel.split("className:`mp-win-photo`").length - 1, 1);
    assert.match(panel, /e===`winOfDay`&&p\?mpWins\.addWinPhoto\(i,void 0,void 0,void 0,void 0,\{signal,attempt\}\):mpWins\.addWin\(i\)/);
    assert.match(panel, /mpWins\.watchSave\(/);
    assert.match(panel, /mpWins\.winSaveTimeoutLimit\(\)/);
    assert.match(panel, /mpWins\.winSaveStatusLabel\(u,e===`winOfDay`&&p\)/);
    assert.match(panel, /useRef\)\(!1\)/);
    assert.match(panel, /if\(F\.current\)return/);
    assert.match(panel, /disabled:S/);
    assert.match(panel, /onKeyDown:e=>\{e\.key===`Enter`&&!F\.current&&l\(\)\}/);
    assert.match(panel, /finally\{if\(saveSeq\.current===token\)\{F\.current=!1;T\(!1\)\}\}/);
    assert.match(panel, /if\(!u\.saved\)\{s\(label\);return\}/);
    assert.match(panel, /function k\(\)\{let store=mpWins\.readWinsStore\(\);r\(mpWins\.winsForDate\(store\)\);if\(e!==`winOfDay`\)return;h\(mpWins\.winsSaveBlockedQuiet\(\)\);setPast\(mpWins\.pastWinsPage\(store,new Date\(\),shown\.current\)\)\}/);
    assert.match(panel, /listenForWinsChanges\(window,c,k\)/);
    assert.doesNotMatch(panel.slice(panel.indexOf("function k()"), panel.indexOf("function l()")), /setItem|addWin|resetBlockedWins|loadWinsStore/);
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
    assert.match(build, /exportV1,stableWinId,loadWinsStore,saveWinsStore,winsSaveBlocked,resetBlockedWins/);
    assert.match(build, /WIN_RESET_LABEL,WIN_RESET_NOTE,WIN_RESET_CONFIRM,WIN_RESET_CANCEL,WIN_RESET_DONE,WIN_RESET_IMAGES_LEFT,WIN_RESET_UNNEEDED,WIN_RESET_FAILED,winResetDoneLabel,WIN_UNKNOWN_TIME,WIN_UNKNOWN_TIME_LABEL/);
    assert.match(css, /\.mp-win-of-day \.mp-win-reset\{/);
    assert.match(css, /\.mp-win-of-day \.mp-win-reset button\{[^}]*min-height:44px/);
    assert.equal(panel.split("e===`winOfDay`&&b?").length - 1, 1);
    assert.match(panel, /e===`winOfDay`&&mpWins\.winsSaveBlocked\(\)/);
    assert.match(panel, /if\(e!==`winOfDay`\)return;h\(mpWins\.winsSaveBlocked\(\)\)/);
    assert.match(panel, /if\(e===`winOfDay`\)\{let blocked=mpWins\.winsSaveBlocked\(\)/);
    assert.doesNotMatch(panel, /\(\)=>mpWins\.winsSaveBlocked\(\)/);
    assert.match(panel, /disabled:j,onClick:\(\)=>\{if\(!j\)x\(!0\)\},children:mpWins\.WIN_RESET_LABEL/);
    assert.match(panel, /className:`secondary`,type:`button`,disabled:j,onClick:d,children:mpWins\.WIN_RESET_CONFIRM/);
    assert.match(panel, /disabled:j,onClick:\(\)=>\{if\(!j\)x\(!1\)\},children:mpWins\.WIN_RESET_CANCEL/);
    assert.match(panel, /if\(G\.current\)return/);
    assert.match(panel, /mpWins\.resetBlockedWins\(\)/);
    assert.match(panel, /y&&y\.needed===false\?mpWins\.WIN_RESET_UNNEEDED:mpWins\.WIN_RESET_FAILED/);
    assert.match(panel, /photos=y\.photoCleanup\?await y\.photoCleanup:\{failed:!0\}/);
    assert.match(panel, /s\(mpWins\.winResetDoneLabel\(photos\)\)/);
    assert.match(panel, /w\.at===mpWins\.WIN_UNKNOWN_TIME\?/);
    assert.match(panel, /children:mpWins\.WIN_UNKNOWN_TIME_LABEL/);
    assert.doesNotMatch(
      `${WIN_RESET_LABEL} ${WIN_RESET_NOTE} ${WIN_RESET_CONFIRM} ${WIN_RESET_CANCEL} ${WIN_RESET_DONE} ${WIN_RESET_IMAGES_LEFT} ${WIN_RESET_UNNEEDED} ${WIN_RESET_FAILED} ${WIN_UNKNOWN_TIME_LABEL} ${WIN_PHOTO_NOT_SAVED_LABEL} ${WIN_PHOTO_UNAVAILABLE_LABEL} ${WIN_PHOTO_MISSING_LABEL} ${WIN_PHOTO_ON_DEVICE_LABEL} ${WIN_PHOTO_CHECKING_LABEL}`,
      /—|–/,
    );
    assert.match(build, /src\/today\/win-photos\.js/);
    assert.match(build, /readWinsStore,winsSaveBlockedQuiet,clearWinsProbeCache,handleWinsStorageEvent,listenForWinsChanges/);
    assert.match(build, /addWinPhoto,WIN_PHOTO_DB,WIN_PHOTO_STORE,WIN_PHOTO_REF/);
    assert.match(build, /MINDPAL_PHOTO_TEST\)\{mpWins\.setWinPhotoDatabaseFactory=setWinPhotoDatabaseFactory/);
    assert.match(build, /mpWins\.setWinSaveTimeoutMs=setWinSaveTimeoutMs/);
    assert.match(build, /mpWins\.setWinPhotoRequestMs=setWinPhotoRequestMs/);
    assert.match(build, /MINDPAL_PHOTO_TEST\)globalThis\.mpWins=mpWins/);
    assert.doesNotMatch(build, /typeof globalThis<\\`u\\`\)globalThis\.mpWins=mpWins/);
  });

  it("gives v1 wins without an id a stable unique id and removes only one", () => {
    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({
      version: 1,
      days: {
        "2026-09-20": [
          { text: "Tea", at, photo: "data:image/png;base64,not-a-real-photo" },
          { text: "Walk", at },
          { text: "Tea", at },
        ],
      },
    });
    const storage = memoryStorage({ [WINS_STORAGE_KEY_V1]: v1 });
    const loaded = loadWinsStore(storage);
    const day = loaded.days["2026-09-20"];
    assert.equal(day.length, 3);
    assert.equal(day[0].id, stableWinId(0, at, "Tea"));
    assert.equal(day[1].id, stableWinId(1, at, "Walk"));
    assert.equal(day[2].id, stableWinId(2, at, "Tea"));
    assert.equal(day[0].id.includes("Tea"), false);
    assert.ok(day[0].id.length < 24);
    assert.equal(new Set(day.map((item) => item.id)).size, 3);
    assert.equal(Object.hasOwn(day[0], "photo"), false);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    const written = JSON.parse(storage.getItem(WINS_STORAGE_KEY));
    assert.deepEqual(written.days["2026-09-20"].map((item) => item.id), day.map((item) => item.id));

    storage.removeItem(WINS_STORAGE_KEY);
    const again = loadWinsStore(storage);
    assert.deepEqual(
      again.days["2026-09-20"].map((item) => item.id),
      day.map((item) => item.id),
    );
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);

    const removed = removeWin(day[0].id, storage, morning);
    assert.equal(removed.saved, true);
    assert.deepEqual(removed.items.map((item) => item.text), ["Walk", "Tea"]);
    const removedAgain = removeWin(day[0].id, storage, morning);
    assert.deepEqual(removedAgain.items.map((item) => item.text), ["Walk", "Tea"]);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
  });

  it("fixes duplicate v2 ids in memory and writes them on the next save", () => {
    const at = "2026-09-20T09:00:00.000Z";
    const raw = JSON.stringify({
      version: 2,
      days: {
        "2026-09-20": [
          { id: "same", text: "One", at, photo: WIN_PLACEHOLDER_PHOTO },
          { id: "same", text: "Two", at, photo: WIN_PLACEHOLDER_PHOTO },
          { id: "same", text: "Three", at },
        ],
      },
    });
    let writes = 0;
    const storage = memoryStorage({ [WINS_STORAGE_KEY]: raw });
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      origSet(key, value);
    };
    const loaded = loadWinsStore(storage);
    const day = loaded.days["2026-09-20"];
    assert.equal(writes, 0);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), raw);
    assert.equal(day[0].id, "same");
    assert.equal(day[0].photo, WIN_PLACEHOLDER_PHOTO);
    assert.equal(day[1].id, stableWinId(1, at, "Two"));
    assert.equal(day[2].id, stableWinId(2, at, "Three"));
    assert.equal(new Set(day.map((item) => item.id)).size, 3);

    const removed = removeWin("same", storage, morning);
    assert.equal(removed.saved, true);
    assert.equal(writes, 1);
    assert.deepEqual(removed.items.map((item) => item.text), ["Two", "Three"]);
    assert.deepEqual(removed.items.map((item) => item.id), [day[1].id, day[2].id]);
    const stored = JSON.parse(storage.getItem(WINS_STORAGE_KEY));
    assert.deepEqual(stored.days["2026-09-20"].map((item) => item.text), ["Two", "Three"]);
    assert.equal(new Set(stored.days["2026-09-20"].map((item) => item.id)).size, 2);
    const onceMore = removeWin("same", storage, morning);
    assert.deepEqual(onceMore.items.map((item) => item.text), ["Two", "Three"]);
  });

  it("exports v2 wins back to a v1 record without touching storage", () => {
    const at = "2026-09-20T09:00:00.000Z";
    const originalV1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "old", text: "Original", at }] },
    });
    const storage = memoryStorage({ [WINS_STORAGE_KEY_V1]: originalV1 });
    const added = addWin("Walked to the shops", storage, morning, morning, WIN_PLACEHOLDER_PHOTO);
    assert.equal(added.saved, true);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), originalV1);
    let writes = 0;
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      origSet(key, value);
    };
    const exported = exportV1(loadWinsStore(storage));
    assert.equal(writes, 0);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), originalV1);
    assert.equal(storage.store.has(WINS_STORAGE_KEY_V1), true);
    assert.equal(exported.version, 1);
    assert.equal(exported.days["2026-09-20"][0].text, "Original");
    assert.equal(exported.days["2026-09-20"][1].text, "Walked to the shops");
    assert.equal(exported.days["2026-09-20"][1].id, added.item.id);
    assert.equal(Object.hasOwn(exported.days["2026-09-20"][1], "photo"), false);

    const absent = memoryStorage();
    addWin("Only in v2", absent, morning, morning);
    assert.equal(absent.store.has(WINS_STORAGE_KEY_V1), false);
    const downgraded = exportV1(loadWinsStore(absent));
    assert.equal(absent.store.has(WINS_STORAGE_KEY_V1), false);
    assert.equal(absent.getItem(WINS_STORAGE_KEY_V1), null);
    const rolled = memoryStorage({ [WINS_STORAGE_KEY_V1]: JSON.stringify(downgraded) });
    const legacy = JSON.parse(rolled.getItem(WINS_STORAGE_KEY_V1));
    assert.equal(legacy.version, 1);
    assert.equal(legacy.days["2026-09-20"][0].text, "Only in v2");
    assert.equal(Object.hasOwn(legacy.days["2026-09-20"][0], "photo"), false);
    const readBack = loadWinsStore(rolled);
    assert.equal(readBack.days["2026-09-20"][0].text, "Only in v2");
    assert.equal(rolled.getItem(WINS_STORAGE_KEY_V1), JSON.stringify(downgraded));
  });

  it("resets a blocked save and keeps the newest backup copies", () => {
    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "win-old", text: "Tea", at }] },
    });
    const flags = { failV2: true };
    const storage = listedWinsStorage(
      {
        [WINS_STORAGE_KEY]: "corrupt-0",
        [WINS_STORAGE_KEY_V1]: v1,
        [WINS_STORAGE_KEY_V2_BACKUP]: "plain-backup",
      },
      {
        onSet(key) {
          if (flags.failV2 && key === WINS_STORAGE_KEY) throw new Error("v2 quota");
          if (key === WINS_STORAGE_KEY_V1) throw new Error("v1 must stay untouched");
        },
      },
    );
    for (let i = 0; i < MAX_CORRUPT_BACKUPS; i += 1) {
      storage.store.set(WINS_STORAGE_KEY, `corrupt-${i}`);
      const result = addWin(`Win ${i}`, storage, morning, new Date(2026, 8, 20, 9, i, 0));
      assert.equal(result.saved, false);
    }
    assert.equal(winsSaveBlocked(storage), false);
    assert.equal(resetBlockedWins(storage).cleared, false);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), `corrupt-${MAX_CORRUPT_BACKUPS - 1}`);

    storage.store.set(WINS_STORAGE_KEY, "corrupt-extra");
    assert.equal(winsSaveBlocked(storage), true);
    const blocked = addWin("Extra", storage, morning, new Date(2026, 8, 20, 9, 30, 0));
    assert.equal(blocked.saved, false);
    assert.equal(userCopy(blocked), WIN_NOT_SAVED_LABEL);
    const held = stampedBackups(storage);
    assert.equal(held.length, MAX_CORRUPT_BACKUPS);
    const resetAt = new Date(2026, 8, 20, 9, 30, 0);
    const oldestKey = `${WINS_STORAGE_KEY_V2_BACKUP}.${new Date(2026, 8, 20, 9, 0, 0).getTime()}`;
    const middleKey = `${WINS_STORAGE_KEY_V2_BACKUP}.${new Date(2026, 8, 20, 9, 1, 0).getTime()}`;
    const newerKey = `${WINS_STORAGE_KEY_V2_BACKUP}.${new Date(2026, 8, 20, 9, 2, 0).getTime()}`;
    const rotatedKey = `${WINS_STORAGE_KEY_V2_BACKUP}.${resetAt.getTime()}`;
    const reset = resetBlockedWins(storage, resetAt);
    assert.equal(reset.cleared, true);
    assert.equal(reset.needed, true);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
    assert.equal(storage.getItem(oldestKey), null);
    assert.equal(storage.getItem(middleKey), "corrupt-1");
    assert.equal(storage.getItem(newerKey), "corrupt-2");
    assert.equal(storage.getItem(rotatedKey), "corrupt-extra");
    assert.equal(stampedBackups(storage).length, MAX_CORRUPT_BACKUPS);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V2_BACKUP), "plain-backup");
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    assert.equal(winsSaveBlocked(storage), false);
    const again = resetBlockedWins(storage, resetAt);
    assert.equal(again.cleared, false);
    assert.equal(again.needed, false);

    flags.failV2 = false;
    const saved = addWin("Kept", storage, morning, new Date(2026, 8, 20, 9, 45, 0));
    assert.equal(saved.saved, true);
    assert.equal(userCopy(saved), WIN_SAVED_LABEL);
    assert.equal(storage.getItem(rotatedKey), "corrupt-extra");
    assert.equal(stampedBackups(storage).length, MAX_CORRUPT_BACKUPS);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    assert.deepEqual(
      winsForDate(loadWinsStore(storage), morning).map((item) => item.text),
      ["Tea", "Kept"],
    );
    assert.equal(winsSaveBlocked(storage), false);

    const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
    const crowded = listedWinsStorage({
      [WINS_STORAGE_KEY]: "corrupt-new",
      [WINS_STORAGE_KEY_V1]: v1,
      [WINS_STORAGE_KEY_V2_BACKUP]: "plain-backup",
      [`${prefix}10`]: "oldest",
      [`${prefix}20`]: "keep-b",
      [`${prefix}30`]: "keep-c",
      [`${prefix}40.1`]: "newest",
    });
    assert.equal(winsSaveBlocked(crowded), true);
    const trimAt = new Date(2026, 8, 20, 11, 0, 0);
    const trimmed = resetBlockedWins(crowded, trimAt);
    const rotated = `${prefix}${trimAt.getTime()}`;
    assert.equal(trimmed.cleared, true);
    assert.equal(crowded.getItem(WINS_STORAGE_KEY), null);
    assert.equal(crowded.getItem(`${prefix}10`), null);
    assert.equal(crowded.getItem(`${prefix}20`), null);
    assert.equal(crowded.getItem(`${prefix}30`), "keep-c");
    assert.equal(crowded.getItem(`${prefix}40.1`), "newest");
    assert.equal(crowded.getItem(rotated), "corrupt-new");
    assert.equal(crowded.getItem(WINS_STORAGE_KEY_V2_BACKUP), "plain-backup");
    assert.equal(crowded.getItem(WINS_STORAGE_KEY_V1), v1);
    assert.deepEqual(trimmed.kept, [`${prefix}30`, `${prefix}40.1`, rotated, WINS_STORAGE_KEY_V2_BACKUP]);

    const readable = memoryStorage();
    addWin("Still here", readable, morning, morning);
    const before = readable.getItem(WINS_STORAGE_KEY);
    assert.equal(winsSaveBlocked(readable), false);
    const skipped = resetBlockedWins(readable);
    assert.equal(skipped.cleared, false);
    assert.equal(skipped.needed, false);
    assert.equal(readable.getItem(WINS_STORAGE_KEY), before);

    const repaired = listedWinsStorage({ [WINS_STORAGE_KEY]: "corrupt-repaired" });
    for (let i = 0; i < MAX_CORRUPT_BACKUPS; i += 1) {
      repaired.store.set(`${WINS_STORAGE_KEY_V2_BACKUP}.${i + 1}`, `old-${i}`);
    }
    repaired.store.set(WINS_STORAGE_KEY, "corrupt-open");
    assert.equal(winsSaveBlocked(repaired), true);
    repaired.store.set(
      WINS_STORAGE_KEY,
      JSON.stringify({ version: 2, days: { "2026-09-20": [{ id: "fixed", text: "Tea", at }] } }),
    );
    const unneeded = resetBlockedWins(repaired, morning);
    assert.equal(unneeded.cleared, false);
    assert.equal(unneeded.needed, false);
    assert.equal(JSON.parse(repaired.getItem(WINS_STORAGE_KEY)).days["2026-09-20"][0].text, "Tea");

    const unlistable = {
      getItem(key) {
        return key === WINS_STORAGE_KEY ? "corrupt-unlistable" : null;
      },
      setItem() {
        throw new Error("no writes");
      },
      removeItem() {
        throw new Error("remove must not run");
      },
    };
    assert.equal(winsSaveBlocked(unlistable), true);
    const refused = resetBlockedWins(unlistable, morning);
    assert.equal(refused.cleared, false);
    assert.equal(refused.needed, true);
    assert.equal(unlistable.getItem(WINS_STORAGE_KEY), "corrupt-unlistable");
  });

  it("keeps the same ids and times when a win has no time and v2 cannot be read", () => {
    const corrupt = "{\"version\":2,\"days\":";
    const v1 = JSON.stringify({
      version: 1,
      days: {
        "2026-09-20": [{ text: "Tea" }, { text: "Walk" }],
      },
    });
    let writes = 0;
    const storage = memoryStorage({
      [WINS_STORAGE_KEY]: corrupt,
      [WINS_STORAGE_KEY_V1]: v1,
    });
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      origSet(key, value);
    };
    const first = loadWinsStore(storage);
    const second = loadWinsStore(storage);
    const firstDay = first.days["2026-09-20"];
    const secondDay = second.days["2026-09-20"];
    assert.equal(writes, 0);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), corrupt);
    assert.deepEqual(firstDay.map((item) => item.id), secondDay.map((item) => item.id));
    assert.deepEqual(firstDay.map((item) => item.at), secondDay.map((item) => item.at));
    assert.equal(firstDay[0].at, WIN_UNKNOWN_TIME);
    assert.equal(firstDay[1].at, WIN_UNKNOWN_TIME);
    assert.equal(firstDay[0].id, stableWinId(0, WIN_UNKNOWN_TIME, "Tea"));
    assert.equal(firstDay[1].id, stableWinId(1, WIN_UNKNOWN_TIME, "Walk"));
    assert.notEqual(firstDay[0].id, firstDay[1].id);
    assert.equal(firstDay[0].id.includes("Tea"), false);
    assert.equal(WIN_UNKNOWN_TIME_LABEL, "Time not recorded");
  });

  it("shows reset when a new backup cannot be written and does not erase the record", () => {
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: "corrupt-quota" },
      {
        onSet(key) {
          if (key === WINS_STORAGE_KEY || key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`) || key === "mindpal.dailyWins.v2.writeprobe") {
            throw new Error("quota");
          }
        },
      },
    );
    assert.equal(winsSaveBlocked(storage), true);
    const added = addWin("Extra", storage, morning, morning);
    assert.equal(added.saved, false);
    assert.equal(userCopy(added), WIN_NOT_SAVED_LABEL);
    const reset = resetBlockedWins(storage, morning);
    assert.equal(reset.cleared, false);
    assert.equal(reset.needed, true);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), "corrupt-quota");
    assert.equal(stampedBackups(storage).length, 0);
  });

  it("does not delete a backup whose name is not a timestamp", () => {
    const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
    const when = new Date(2026, 8, 20, 12, 0, 0);
    const storage = listedWinsStorage({
      [WINS_STORAGE_KEY]: "corrupt-odd",
      [`${prefix}10`]: "oldest",
      [`${prefix}20`]: "mid",
      [`${prefix}30`]: "newest",
      [`${prefix}notes`]: "keep-unknown",
      [`${prefix}10.beta`]: "keep-odd",
    });
    assert.equal(winsSaveBlocked(storage), true);
    const reset = resetBlockedWins(storage, when);
    assert.equal(reset.cleared, true);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
    assert.equal(storage.getItem(`${prefix}notes`), "keep-unknown");
    assert.equal(storage.getItem(`${prefix}10.beta`), "keep-odd");
    assert.equal(storage.getItem(`${prefix}10`), null);
    assert.equal(storage.getItem(`${prefix}20`), "mid");
    assert.equal(storage.getItem(`${prefix}30`), "newest");
    assert.equal(storage.getItem(`${prefix}${when.getTime()}`), "corrupt-odd");
    assert.ok(reset.kept.includes(`${prefix}notes`));
    assert.ok(reset.kept.includes(`${prefix}10.beta`));
  });

  it("does not count a non-timestamp backup name toward the cap of three", () => {
    const prefix = `${WINS_STORAGE_KEY_V2_BACKUP}.`;
    const storage = listedWinsStorage({
      [WINS_STORAGE_KEY]: "corrupt-names",
      [`${prefix}notes`]: "keep-a",
      [`${prefix}10.beta`]: "keep-b",
      [`${prefix}later`]: "keep-c",
    });
    assert.equal(winsSaveBlocked(storage), false);
    const added = addWin("Tea", storage, morning, morning);
    assert.equal(added.saved, true);
    assert.equal(storage.getItem(`${prefix}notes`), "keep-a");
    assert.equal(storage.getItem(`${prefix}10.beta`), "keep-b");
    assert.equal(storage.getItem(`${prefix}later`), "keep-c");
    assert.equal(storage.getItem(`${prefix}${morning.getTime()}`), "corrupt-names");
    assert.equal(storage.getItem("mindpal.dailyWins.v2.writeprobe"), null);
  });

  it("leaves at out of the v1 export when the win has no time", () => {
    const known = "2026-09-20T09:00:00.000Z";
    const exported = exportV1({
      version: 2,
      days: {
        "2026-09-20": [
          { id: "win-known", text: "Tea", at: known },
          { id: "win-unknown", text: "Walk", at: WIN_UNKNOWN_TIME },
          { id: "win-blank", text: "Nap" },
        ],
      },
    });
    assert.equal(exported.days["2026-09-20"][0].at, known);
    assert.equal(Object.hasOwn(exported.days["2026-09-20"][1], "at"), false);
    assert.equal(exported.days["2026-09-20"][1].text, "Walk");
    assert.equal(Object.hasOwn(exported.days["2026-09-20"][2], "at"), false);
    assert.equal(exported.days["2026-09-20"][2].text, "Nap");
    const rolled = memoryStorage({ [WINS_STORAGE_KEY_V1]: JSON.stringify(exported) });
    const read = loadWinsStore(rolled);
    assert.equal(read.days["2026-09-20"][1].at, WIN_UNKNOWN_TIME);
    assert.equal(read.days["2026-09-20"][1].text, "Walk");
    assert.equal(JSON.parse(rolled.getItem(WINS_STORAGE_KEY_V1)).days["2026-09-20"][1].at, undefined);
  });

  it("blocks a save when the full record does not fit and does not probe that text again", () => {
    const text = "corrupt-record-too-big";
    let probeWrites = 0;
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: text },
      {
        onSet(key, value) {
          if (key !== "mindpal.dailyWins.v2.writeprobe") return;
          probeWrites += 1;
          if (typeof value === "string" && value.length < text.length) return;
          throw new Error("quota");
        },
      },
    );
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);
    assert.equal(storage.getItem("mindpal.dailyWins.v2.writeprobe"), null);
    const roomy = listedWinsStorage({ [WINS_STORAGE_KEY]: "short-corrupt" });
    assert.equal(winsSaveBlocked(roomy), false);
    assert.equal(roomy.getItem("mindpal.dailyWins.v2.writeprobe"), null);
  });

  it("keeps a probe key when removeItem throws and does not write it again", () => {
    const text = "corrupt-keep-probe";
    let writes = 0;
    const storage = listedWinsStorage({ [WINS_STORAGE_KEY]: text });
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === "mindpal.dailyWins.v2.writeprobe") writes += 1;
      origSet(key, value);
    };
    storage.removeItem = () => {
      throw new Error("remove failed");
    };
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(writes, 1);
    assert.equal(storage.getItem("mindpal.dailyWins.v2.writeprobe"), text);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(writes, 1);
  });

  it("checks again after a failed save when free space shrinks", () => {
    const text = "corrupt-then-tight";
    let tight = false;
    let probeWrites = 0;
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: text },
      {
        onSet(key) {
          if (key === "mindpal.dailyWins.v2.writeprobe") probeWrites += 1;
          if (!tight) return;
          if (
            key === WINS_STORAGE_KEY
            || key.startsWith(`${WINS_STORAGE_KEY_V2_BACKUP}.`)
            || key === "mindpal.dailyWins.v2.writeprobe"
          ) {
            throw new Error("quota");
          }
        },
      },
    );
    assert.equal(winsSaveBlocked(storage), false);
    assert.equal(probeWrites, 1);
    assert.equal(winsSaveBlocked(storage), false);
    assert.equal(probeWrites, 1);
    tight = true;
    const added = addWin("Tea", storage, morning, morning);
    assert.equal(added.saved, false);
    assert.equal(userCopy(added), WIN_NOT_SAVED_LABEL);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), text);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 2);
  });

  it("reads a missing v2 record without writing the v1 copy", () => {
    const v1 = JSON.stringify({
      version: 1,
      days: { "2026-09-20": [{ id: "win-old", text: "Tea", at: "2026-09-20T09:00:00.000Z" }] },
    });
    let writes = 0;
    const storage = memoryStorage({ [WINS_STORAGE_KEY_V1]: v1 });
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      origSet(key, value);
    };
    const read = readWinsStore(storage);
    assert.equal(writes, 0);
    assert.equal(read.days["2026-09-20"][0].text, "Tea");
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
    const loaded = loadWinsStore(storage);
    assert.equal(loaded.days["2026-09-20"][0].text, "Tea");
    assert.equal(writes, 1);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
  });

  it("forgets the probe answer when another tab changes a wins key and does not write", () => {
    const text = "corrupt-other-tab";
    let probeWrites = 0;
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: text },
      {
        onSet(key, value) {
          if (key !== "mindpal.dailyWins.v2.writeprobe") return;
          probeWrites += 1;
          if (typeof value === "string" && value.length < text.length) return;
          throw new Error("quota");
        },
      },
    );
    clearWinsProbeCache();
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);
    assert.equal(winsSaveBlockedQuiet(storage), false);
    assert.equal(probeWrites, 1);
    assert.equal(handleWinsStorageEvent({ key: "mindpal.sessionUser.v1" }), false);
    assert.equal(isWinsStorageKey("mindpal.sessionUser.v1"), false);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);
    assert.equal(handleWinsStorageEvent({ key: WINS_STORAGE_KEY }), true);
    assert.equal(probeWrites, 1);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 2);
    assert.equal(handleWinsStorageEvent({ key: null }), true);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 3);
    assert.equal(storage.getItem("mindpal.dailyWins.v2.writeprobe"), null);
  });

  it("refreshes other tabs from a storage event and a photo message without writing", async () => {
    const text = "corrupt-listener";
    let probeWrites = 0;
    const storage = listedWinsStorage(
      { [WINS_STORAGE_KEY]: text },
      {
        onSet(key) {
          if (key === "mindpal.dailyWins.v2.writeprobe") probeWrites += 1;
          throw new Error("quota");
        },
      },
    );
    clearWinsProbeCache();
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);

    let quiet = 0;
    let same = 0;
    const target = new EventTarget();
    const stop = listenForWinsChanges(
      target,
      () => {
        same += 1;
      },
      () => {
        quiet += 1;
      },
    );
    target.dispatchEvent(Object.assign(new Event("storage"), { key: "mindpal.sessionUser.v1" }));
    assert.equal(quiet, 0);
    assert.equal(same, 0);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 1);

    target.dispatchEvent(Object.assign(new Event("storage"), { key: WINS_STORAGE_KEY }));
    assert.equal(quiet, 1);
    assert.equal(same, 0);
    assert.equal(probeWrites, 1);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 2);

    target.dispatchEvent(new Event(WINS_CHANGE_EVENT));
    assert.equal(same, 1);
    assert.equal(quiet, 1);
    assert.equal(winsSaveBlocked(storage), true);
    assert.equal(probeWrites, 2);

    const before = quiet;
    const other = new BroadcastChannel("mindpal-photos");
    other.postMessage({ source: "mindpal-photos", kind: "put", id: "win-1" });
    other.postMessage({ source: "someone-else", kind: "put" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(quiet, before + 1);
    assert.equal(same, 1);
    assert.equal(probeWrites, 2);
    other.close();
    stop();
    const afterStop = new BroadcastChannel("mindpal-photos");
    afterStop.postMessage({ source: "mindpal-photos", kind: "put", id: "win-2" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(quiet, before + 1);
    afterStop.close();
  });
});
