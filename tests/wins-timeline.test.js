import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexedDB } from "fake-indexeddb";
import {
  WIN_PHOTO_DB,
  WIN_PHOTO_REQUEST_MS,
  placeholderPhotoBlob,
  putWinPhoto,
  readWinPhoto,
  resetWinPhotoDatabase,
  setWinPhotoDatabaseFactory,
  setWinPhotoRequestMs,
} from "../src/today/win-photos.js";
import {
  PAST_WINS_EMPTY,
  PAST_WINS_PAGE_DAYS,
  PAST_WINS_EARLIER,
  PAST_WINS_FUTURE_NOTE,
  PAST_WINS_LATER,
  PAST_WINS_REMOVE,
  PAST_WINS_REMOVE_CONFIRM,
  PAST_WINS_REMOVE_KEEP,
  PAST_WINS_SHOW_MORE,
  PAST_WINS_TITLE,
  WIN_NOT_REMOVED_LABEL,
  WIN_NOT_SAVED_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_PLACEHOLDER_PHOTO,
  WIN_RESET_DONE,
  WIN_RESET_NOTE,
  WIN_SAVE_ABORT_GRACE_MS,
  WIN_SAVE_TIMEOUT_MS,
  WIN_SAVED_LABEL,
  WIN_UNKNOWN_TIME,
  WINS_STORAGE_KEY,
  addWin,
  addWinPhoto,
  civilDateFromKey,
  emptyPastWins,
  formatWinDayLabel,
  loadWinsStore,
  pastWinConfirmLabel,
  pastWinFocusAfter,
  pastWinHoldAfterRefresh,
  pastWinKeepLabel,
  pastWinRemoveLabel,
  pastWinTimeLabel,
  pastWinsPage,
  readWinsStore,
  removeWin,
  setWinSaveAbortGraceMs,
  setWinSaveTimeoutMs,
  watchSave,
  winSaveStatusLabel,
} from "../src/today/wins.js";

const root = dirname(fileURLToPath(import.meta.url));
const today = new Date(2026, 8, 20, 9, 0, 0);

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => {
      store.delete(key);
    },
    get length() {
      return store.size;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    store,
  };
}

function onDay(offset, hour = 9) {
  return new Date(2026, 8, 20 - offset, hour, 0, 0);
}

function hangWrites() {
  const rows = new Map();
  const late = [];
  const factory = {
    open() {
      const request = {};
      queueMicrotask(() => {
        const db = {
          name: WIN_PHOTO_DB,
          objectStoreNames: { contains: () => true },
          close() {},
          transaction(_names, mode) {
            const tx = {
              mode,
              aborted: false,
              pendingPut: null,
              abort() {
                this.aborted = true;
                if (typeof this.onabort === "function") this.onabort();
              },
              objectStore() {
                const finishRead = (fill) => {
                  const req = {};
                  queueMicrotask(() => {
                    fill(req);
                    if (typeof req.onsuccess === "function") req.onsuccess();
                    queueMicrotask(() => {
                      if (!tx.aborted && typeof tx.oncomplete === "function") tx.oncomplete();
                    });
                  });
                  return req;
                };
                return {
                  put: (value, key) => {
                    const req = {};
                    tx.pendingPut = () => {
                      if (!tx.aborted) rows.set(key, value);
                    };
                    queueMicrotask(() => {
                      if (typeof req.onsuccess === "function") req.onsuccess();
                    });
                    return req;
                  },
                  get: (key) => finishRead((req) => {
                    req.result = rows.get(key);
                  }),
                  delete: (key) => finishRead(() => {
                    rows.delete(key);
                  }),
                  getAllKeys: () => finishRead((req) => {
                    req.result = [...rows.keys()];
                  }),
                  getAll: () => finishRead((req) => {
                    req.result = [...rows.values()];
                  }),
                };
              },
            };
            if (mode === "readwrite") late.push(tx);
            return tx;
          },
        };
        request.result = db;
        if (typeof request.onsuccess === "function") request.onsuccess();
      });
      return request;
    },
    deleteDatabase() {
      const request = {};
      queueMicrotask(() => {
        rows.clear();
        if (typeof request.onsuccess === "function") request.onsuccess();
      });
      return request;
    },
  };
  return {
    factory,
    rows,
    finishLate() {
      for (const tx of late.splice(0)) {
        if (tx.aborted) continue;
        if (typeof tx.pendingPut === "function") tx.pendingPut();
        if (typeof tx.oncomplete === "function") tx.oncomplete();
      }
    },
  };
}

describe("past wins timeline", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
    setWinPhotoRequestMs(WIN_PHOTO_REQUEST_MS);
    setWinSaveTimeoutMs(WIN_SAVE_TIMEOUT_MS);
    setWinSaveAbortGraceMs(WIN_SAVE_ABORT_GRACE_MS);
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(WIN_PHOTO_REQUEST_MS);
    setWinSaveTimeoutMs(WIN_SAVE_TIMEOUT_MS);
    setWinSaveAbortGraceMs(WIN_SAVE_ABORT_GRACE_MS);
  });

  it("groups earlier days newest first and leaves today out", () => {
    const storage = memoryStorage();
    const before = storage.getItem(WINS_STORAGE_KEY);
    addWin("Older morning", storage, onDay(2), onDay(2, 8), WIN_PLACEHOLDER_PHOTO, "older-am");
    addWin("Older evening", storage, onDay(2), onDay(2, 18), WIN_PLACEHOLDER_PHOTO, "older-pm");
    addWin("Yesterday", storage, onDay(1), onDay(1), WIN_PHOTO_REF, "yesterday");
    addWin("Today", storage, today, today, WIN_PLACEHOLDER_PHOTO, "today");
    const store = loadWinsStore(storage);
    store.days["2026-09-21"] = [{ id: "future", text: "Not yet", at: "2026-09-21T09:00:00.000Z" }];
    store.days["2026-09-10"] = [];
    const page = pastWinsPage(store, today, PAST_WINS_PAGE_DAYS);
    assert.equal(page.totalDays, 3);
    assert.equal(page.hasMore, false);
    assert.deepEqual(page.days.map((day) => day.key), ["2026-09-21", "2026-09-19", "2026-09-18"]);
    assert.equal(page.days[0].future, true);
    assert.equal(page.days[1].future, false);
    assert.equal(page.days[0].items[0].id, "future");
    assert.equal(page.days[0].items[0].text, "Not yet");
    assert.match(page.days[0].label, /21/);
    assert.deepEqual(page.days[2].items.map((item) => item.id), ["older-am", "older-pm"]);
    assert.equal(page.days.some((day) => day.items.some((item) => item.id === "today")), false);
    assert.equal(storage.getItem(WINS_STORAGE_KEY) !== before, true);
    const serial = storage.getItem(WINS_STORAGE_KEY);
    assert.equal(pastWinsPage(readWinsStore(storage), today).days.length, 2);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), serial);
    assert.equal(emptyPastWins().totalDays, 0);
    assert.match(formatWinDayLabel("2026-09-19", "en-AU"), /19/);
    assert.match(formatWinDayLabel("2026-09-19", "en-AU"), /2026/);
    assert.equal(formatWinDayLabel("nope"), "");
    assert.equal(civilDateFromKey("2026-09-19").getDate(), 19);
    assert.equal(civilDateFromKey("bad"), null);
    assert.equal(PAST_WINS_PAGE_DAYS, 7);
    assert.equal(PAST_WINS_TITLE, "Past wins");
    assert.match(PAST_WINS_EMPTY, /No earlier wins saved on this device/);
    assert.match(PAST_WINS_EMPTY, /prototype/);
    assert.match(PAST_WINS_EMPTY, /on this device only/);
    assert.equal(PAST_WINS_SHOW_MORE, "Show more");
    assert.equal(PAST_WINS_REMOVE, "Remove");
    assert.equal(PAST_WINS_LATER, "Later dates");
    assert.equal(PAST_WINS_EARLIER, "Earlier days");
    assert.equal(PAST_WINS_FUTURE_NOTE, "Future date");
    assert.doesNotMatch(
      `${PAST_WINS_TITLE} ${PAST_WINS_EMPTY} ${PAST_WINS_SHOW_MORE} ${PAST_WINS_REMOVE} ${PAST_WINS_LATER} ${PAST_WINS_EARLIER} ${PAST_WINS_FUTURE_NOTE} ${formatWinDayLabel("2026-09-19", "en-AU")}`,
      /—|–/,
    );
  });

  it("caps the timeline at seven days until show more", () => {
    const days = {};
    for (let offset = 1; offset <= 8; offset += 1) {
      const when = onDay(offset);
      const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
      days[key] = [{ id: `win-${offset}`, text: `Synthetic win ${offset}`, at: when.toISOString() }];
    }
    const store = { version: 2, days };
    const first = pastWinsPage(store, today);
    assert.equal(first.days.length, 7);
    assert.equal(first.totalDays, 8);
    assert.equal(first.hasMore, true);
    assert.equal(first.days[0].key, "2026-09-19");
    assert.equal(first.days[6].key, "2026-09-13");
    assert.equal(first.days.some((day) => day.key === "2026-09-12"), false);
    const rest = pastWinsPage(store, today, PAST_WINS_PAGE_DAYS * 2);
    assert.equal(rest.days.length, 8);
    assert.equal(rest.hasMore, false);
    assert.equal(rest.days[7].key, "2026-09-12");
  });

  it("removes only the chosen past win and its placeholder image", async () => {
    const storage = memoryStorage();
    const yesterday = onDay(1);
    const older = onDay(3);
    addWin("Keep yesterday", storage, yesterday, yesterday, WIN_PHOTO_REF, "keep-y");
    addWin("Drop yesterday", storage, yesterday, yesterday, WIN_PHOTO_REF, "drop-y");
    addWin("Keep older", storage, older, older, WIN_PLACEHOLDER_PHOTO, "keep-o");
    assert.equal((await putWinPhoto("keep-y", placeholderPhotoBlob(), new Date(0))).ok, true);
    assert.equal((await putWinPhoto("drop-y", placeholderPhotoBlob(), new Date(0))).ok, true);
    const removed = removeWin("drop-y", storage, civilDateFromKey("2026-09-19"));
    assert.equal(removed.saved, true);
    await removed.photoCleanup;
    const page = pastWinsPage(removed.store, today);
    assert.deepEqual(page.days[0].items.map((item) => item.id), ["keep-y"]);
    assert.deepEqual(page.days[1].items.map((item) => item.text), ["Keep older"]);
    assert.equal(await readWinPhoto("drop-y"), null);
    assert.equal((await readWinPhoto("keep-y")).type, "image/svg+xml");
    const missed = removeWin("keep-y", storage, older);
    assert.equal(pastWinsPage(missed.store, today).days[0].items.some((item) => item.id === "keep-y"), true);
    const unknown = addWin("No clock", storage, older, older, WIN_PLACEHOLDER_PHOTO, "no-clock");
    unknown.store.days["2026-09-17"][1].at = WIN_UNKNOWN_TIME;
    const listed = pastWinsPage(unknown.store, today);
    const noClock = listed.days.flatMap((day) => day.items).find((item) => item.id === "no-clock");
    assert.equal(noClock.at, WIN_UNKNOWN_TIME);
  });

  it("says a fresh placeholder can stay without blaming only another tab", () => {
    assert.match(WIN_RESET_NOTE, /One saved in the last 15 seconds can stay/);
    assert.match(WIN_RESET_DONE, /One saved in the last 15 seconds can stay/);
    assert.doesNotMatch(WIN_RESET_NOTE, /another tab/i);
    assert.doesNotMatch(WIN_RESET_DONE, /another tab/i);
    assert.doesNotMatch(`${WIN_RESET_NOTE} ${WIN_RESET_DONE}`, /—|–/);
    const panel = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
    const resetFn = panel.slice(panel.indexOf("async function d()"), panel.indexOf("function more()"));
    assert.match(resetFn, /if\(G\.current\)return/);
    assert.match(resetFn, /q\(!0\)/);
    const awaitAt = resetFn.indexOf("await y.photoCleanup");
    const hideAt = resetFn.indexOf("x(!1)");
    assert.ok(awaitAt > 0);
    assert.ok(hideAt > awaitAt);
    assert.match(panel, /disabled:j,onClick:d/);
    assert.match(panel, /disabled:j,onClick:\(\)=>\{if\(!j\)x\(!0\)\}/);
    assert.match(panel, /mp-past-wins/);
    assert.match(panel, /mpWins\.PAST_WINS_EMPTY/);
    assert.match(panel, /releaseWinPhotoUrl\(url\)/);
    assert.equal(panel.split("className:`mp-past-wins`").length - 1, 1);
    assert.doesNotMatch(panel.slice(panel.indexOf("function more()"), panel.indexOf("async function drop(")), /setItem|addWin|loadWinsStore/);
    const css = readFileSync(join(root, "../src/patches/styles.css"), "utf8");
    assert.match(css, /\.mp-win-of-day \.mp-past-wins summary\{[^}]*min-height:44px/);
    assert.match(css, /\.mp-win-of-day \.mp-past-wins \.mp-past-remove,\.mp-win-of-day \.mp-past-wins \.mp-past-more\{[^}]*min-height:44px/);
    assert.match(css, /@media \(width<=480px\)/);
    assert.doesNotMatch(css, /(^|\n)\.mp-past-wins/);
    const photoEffect = panel.slice(panel.indexOf("Past thumbnails load only"), panel.indexOf("async function l()"));
    assert.match(photoEffect, /if\(openPast\)/);
    assert.match(photoEffect, /if\(cache\[w\.id\]&&cache\[w\.id\]\.kind===`blob`&&!again\)continue/);
    assert.match(panel, /photoCache\.current=\{\}/);
    const dropFn = panel.slice(panel.indexOf("async function drop("), panel.indexOf("function photoBlock("));
    assert.match(dropFn, /if\(dropGuard\.current\)return/);
    assert.match(dropFn, /setDropBusy\(!0\)/);
    assert.match(dropFn, /mpWins\.WIN_NOT_REMOVED_LABEL/);
    assert.match(dropFn, /mpWins\.readWinsStore\(\)/);
    assert.match(dropFn, /mpWins\.pastWinFocusAfter\(past\.days,id,index\)/);
    assert.doesNotMatch(dropFn.slice(dropFn.indexOf("if(!u.saved)"), dropFn.indexOf("let nextFocus")), /u\.store/);
    assert.match(panel, /disabled:dropBusy/);
    assert.match(panel.slice(panel.indexOf("Focus only after dropBusy"), panel.indexOf("async function l()")), /if\(dropBusy\)return/);
    assert.match(panel, /\[past,dropBusy,hold\]/);
    assert.match(panel, /focusAfter\.current=aim/);
    assert.match(panel, /"aria-label":removeName/);
    assert.match(panel, /"aria-label":confirmName/);
    assert.match(panel, /"aria-label":keepName/);
    assert.match(panel, /mpWins\.pastWinKeepLabel/);
    assert.match(panel, /mpWins\.PAST_WINS_LATER/);
    assert.match(panel, /mpWins\.PAST_WINS_EARLIER/);
    assert.match(panel, /mpWins\.PAST_WINS_FUTURE_NOTE/);
    assert.match(panel, /`h3`,\{className:`mp-past-later`/);
    assert.match(panel, /`h3`,\{className:`mp-past-earlier`/);
    assert.doesNotMatch(panel, /`p`,\{className:`mp-past-later`/);
    assert.match(panel, /className:`mp-past-future`/);
    assert.match(panel, /hold\.id===w\.id&&hold\.key===day\.key&&hold\.pos===pos/);
    assert.match(panel, /id:mpWins\.winStatusId\(e\)/);
    assert.doesNotMatch(panel, /id:`mp-win-status`/);
    assert.match(panel, /pastWinHoldAfterRefresh/);
    assert.ok(dropFn.indexOf("if(!check.keep)return") < dropFn.indexOf("mpWins.removeWin"));
    assert.ok(dropFn.indexOf("focusAfter.current=`#${mpWins.winStatusId(`winOfDay`)}`") < dropFn.indexOf("let nextFocus"));
    assert.match(panel, /mpWins\.PAST_WINS_REMOVE_CONFIRM/);
    assert.match(panel, /mpWins\.PAST_WINS_REMOVE_KEEP/);
    assert.match(panel, /id:`mp-past-summary`/);
  });

  it("keeps a win on screen when the removal cannot be stored", () => {
    const storage = memoryStorage();
    addWin("Stay put", storage, onDay(1), onDay(1), WIN_PLACEHOLDER_PHOTO, "stay");
    const saved = storage.getItem(WINS_STORAGE_KEY);
    storage.setItem = () => {
      throw new Error("quota");
    };
    const removed = removeWin("stay", storage, onDay(1));
    assert.equal(removed.saved, false);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), saved);
    const kept = loadWinsStore(storage);
    assert.equal(kept.days["2026-09-19"].some((item) => item.id === "stay"), true);
    assert.equal(WIN_NOT_REMOVED_LABEL, "Not removed. This win is still saved on this device.");
    assert.doesNotMatch(WIN_NOT_REMOVED_LABEL, /Not saved/);
    assert.doesNotMatch(WIN_NOT_REMOVED_LABEL, /—|–/);
  });

  it("names the remove control and chooses the next focus target", () => {
    const day = "Saturday 19 September 2026";
    const otherDay = "Friday 18 September 2026";
    assert.equal(pastWinRemoveLabel("Synthetic win yesterday", day, "9:15 am"), "Remove win: Synthetic win yesterday, Saturday 19 September 2026, 9:15 am");
    assert.equal(pastWinConfirmLabel("Synthetic win yesterday", day, "9:15 am"), "Confirm remove win: Synthetic win yesterday, Saturday 19 September 2026, 9:15 am");
    assert.equal(pastWinKeepLabel("Synthetic win yesterday", day, "9:15 am"), "Keep this win: Synthetic win yesterday, Saturday 19 September 2026, 9:15 am");
    assert.notEqual(pastWinRemoveLabel("Tea", day, "9:15 am"), pastWinRemoveLabel("Tea", otherDay, "8:00 am"));
    assert.equal(pastWinTimeLabel(WIN_UNKNOWN_TIME), "");
    assert.equal(pastWinRemoveLabel("Quiet", day, pastWinTimeLabel(WIN_UNKNOWN_TIME)), "Remove win: Quiet, Saturday 19 September 2026");
    assert.equal(pastWinRemoveLabel("  "), "Remove win");
    assert.equal(pastWinConfirmLabel(""), "Confirm remove win");
    assert.equal(pastWinKeepLabel("  "), "Keep this win");
    assert.equal(pastWinKeepLabel("", day), "Keep this win, Saturday 19 September 2026");
    assert.equal(PAST_WINS_REMOVE, "Remove");
    assert.equal(PAST_WINS_REMOVE_CONFIRM, "Confirm remove");
    assert.equal(PAST_WINS_REMOVE_KEEP, "Keep this win");
    const long = "word ".repeat(30);
    assert.match(pastWinRemoveLabel(long, day, "9:15 am"), /^Remove win: /);
    assert.match(pastWinRemoveLabel(long, day, "9:15 am"), /Saturday 19 September 2026, 9:15 am$/);
    assert.ok(pastWinRemoveLabel(long, day, "9:15 am").length < long.length);
    assert.doesNotMatch(`${pastWinRemoveLabel("Tea", day, "9:15 am")} ${pastWinConfirmLabel("Tea", day, "9:15 am")} ${pastWinKeepLabel("Tea", day, "9:15 am")} ${PAST_WINS_REMOVE_CONFIRM} ${PAST_WINS_REMOVE_KEEP}`, /—|–/);
    const days = [
      { key: "2026-09-19", items: [{ id: "a" }, { id: "b" }] },
      { key: "2026-09-18", items: [{ id: "c" }] },
    ];
    assert.deepEqual(pastWinFocusAfter(days, "a"), { kind: "win", id: "b", index: 0 });
    assert.deepEqual(pastWinFocusAfter(days, "b"), { kind: "win", id: "c", index: 1 });
    assert.deepEqual(pastWinFocusAfter(days, "c"), { kind: "win", id: "b", index: 1 });
    assert.deepEqual(pastWinFocusAfter([{ key: "2026-09-19", items: [{ id: "only" }] }], "only"), { kind: "summary" });
    const dup = [{ key: "2026-09-19", items: [{ id: "dup" }, { id: "dup" }, { id: "tail" }] }];
    assert.deepEqual(pastWinFocusAfter(dup, "dup", 0), { kind: "win", id: "dup", index: 0 });
    assert.deepEqual(pastWinFocusAfter(dup, "dup", 1), { kind: "win", id: "tail", index: 1 });
    assert.deepEqual(pastWinFocusAfter(dup, "dup"), { kind: "win", id: "dup", index: 0 });
  });

  it("keeps confirm on the picked win when midnight or another tab shifts the list", () => {
    const oct25 = new Date(2026, 9, 25, 9, 0, 0);
    const oct26 = new Date(2026, 9, 26, 12, 0, 0);
    const oct24 = new Date(2026, 9, 24, 9, 0, 0);
    const oct23 = new Date(2026, 9, 23, 9, 0, 0);
    const storage = memoryStorage();
    addWin("Was today", storage, oct25, oct25, WIN_PLACEHOLDER_PHOTO, "todayish");
    addWin("Picked", storage, oct24, oct24, WIN_PLACEHOLDER_PHOTO, "picked");
    addWin("Decoy", storage, oct23, oct23, WIN_PLACEHOLDER_PHOTO, "decoy");
    const before = pastWinsPage(loadWinsStore(storage), oct25);
    assert.deepEqual(before.days.map((day) => day.key), ["2026-10-24", "2026-10-23"]);
    const hold = { id: "picked", key: "2026-10-24", pos: 0 };
    assert.equal(pastWinHoldAfterRefresh(before.days, hold).keep, true);
    const afterMidnight = pastWinsPage(loadWinsStore(storage), oct26);
    assert.equal(afterMidnight.days[0].items[0].id, "todayish");
    const midnight = pastWinHoldAfterRefresh(afterMidnight.days, hold);
    assert.equal(midnight.keep, true);
    assert.equal(midnight.focus.id, "picked");
    assert.equal(midnight.focus.key, "2026-10-24");
    assert.notEqual(midnight.focus.index, 0);
    assert.notEqual(afterMidnight.days[0].items[0].id, hold.id);

    const store = loadWinsStore(storage);
    delete store.days["2026-10-24"];
    const shifted = pastWinsPage(store, oct26);
    const crossTab = pastWinHoldAfterRefresh(shifted.days, hold);
    assert.equal(crossTab.keep, false);
    assert.notEqual(crossTab.focus.id, "picked");
    assert.equal(shifted.days.some((day) => day.items.some((item) => item.id === "picked")), false);

    const sameDay = [{ key: "2026-10-24", future: false, items: [{ id: "slide" }, { id: "picked" }, { id: "decoy" }] }];
    const open = { id: "picked", key: "2026-10-24", pos: 1 };
    assert.equal(pastWinHoldAfterRefresh(sameDay, open).keep, true);
    const removedEarlier = [{ key: "2026-10-24", future: false, items: [{ id: "picked" }, { id: "decoy" }] }];
    const moved = pastWinHoldAfterRefresh(removedEarlier, open);
    assert.equal(moved.keep, false);
    assert.equal(moved.focus.id, "picked");
    assert.equal(moved.focus.pos, 0);
    assert.equal(removedEarlier[0].items[1].id, "decoy");
    assert.notEqual(moved.focus.id, removedEarlier[0].items[open.pos].id);
    assert.equal(pastWinHoldAfterRefresh(removedEarlier, { id: "picked", key: "2026-10-24", pos: 0 }).keep, true);
  });
});

describe("save timeout", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
    setWinPhotoRequestMs(WIN_PHOTO_REQUEST_MS);
    setWinSaveTimeoutMs(WIN_SAVE_TIMEOUT_MS);
    setWinSaveAbortGraceMs(WIN_SAVE_ABORT_GRACE_MS);
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(WIN_PHOTO_REQUEST_MS);
    setWinSaveTimeoutMs(WIN_SAVE_TIMEOUT_MS);
    setWinSaveAbortGraceMs(WIN_SAVE_ABORT_GRACE_MS);
  });

  it("uses the real save when it finishes, and ignores a late result after giving up", async () => {
    assert.equal(WIN_SAVE_TIMEOUT_MS, 10000);
    assert.equal(WIN_PHOTO_REQUEST_MS, 10000);
    const quick = await watchSave(() => ({ saved: true, item: { id: "ok" }, photoSaved: true }), 50, 10);
    assert.equal(quick.saved, true);
    assert.equal(quick.abandoned, undefined);
    assert.equal(winSaveStatusLabel(quick, true), WIN_SAVED_LABEL);

    let release;
    const late = watchSave(() => new Promise((resolve) => {
      release = () => resolve({ saved: true, item: { id: "late" }, photoSaved: true });
    }), 20, 15);
    const abandoned = await late;
    assert.equal(abandoned.abandoned, true);
    assert.equal(abandoned.saved, false);
    assert.equal(winSaveStatusLabel(abandoned, true), WIN_NOT_SAVED_LABEL);
    release();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(abandoned.saved, false);
    assert.equal(abandoned.item, undefined);
    assert.equal(winSaveStatusLabel({ saved: true, item: { id: "words" }, photoError: true }, true), WIN_PHOTO_NOT_SAVED_LABEL);
    assert.equal(winSaveStatusLabel({ saved: false, item: { id: "no" } }, true), WIN_NOT_SAVED_LABEL);
    assert.equal(winSaveStatusLabel({ saved: true, item: { id: "path" }, photoFallback: true }, true), WIN_PHOTO_UNAVAILABLE_LABEL);
    assert.equal(winSaveStatusLabel({ saved: false, item: null }, true), "");
  });

  it("stores the win text once when the photo write never settles, and a late complete does not save again", async () => {
    const hung = hangWrites();
    setWinPhotoDatabaseFactory(hung.factory);
    setWinPhotoRequestMs(30);
    const storage = memoryStorage();
    const result = await addWinPhoto("Hung photo", storage, today, today);
    assert.equal(result.saved, true);
    assert.equal(result.photoError, true);
    assert.equal(result.timedOut, true);
    assert.equal(result.photoSaved, false);
    assert.equal(Object.hasOwn(result.item, "photo"), false);
    assert.equal(winSaveStatusLabel(result, true), WIN_PHOTO_NOT_SAVED_LABEL);
    const serial = storage.getItem(WINS_STORAGE_KEY);
    const parsed = JSON.parse(serial);
    assert.equal(parsed.days["2026-09-20"].length, 1);
    hung.finishLate();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(storage.getItem(WINS_STORAGE_KEY), serial);
    assert.equal(await readWinPhoto(result.item.id), null);
    assert.equal(hung.rows.size, 0);
  });

  it("aborts a hung photo write and still stores the words before the watch gives up", async () => {
    const hung = hangWrites();
    setWinPhotoDatabaseFactory(hung.factory);
    setWinPhotoRequestMs(400);
    const storage = memoryStorage();
    const started = Date.now();
    const result = await watchSave(
      (signal, attempt) => addWinPhoto("Abort the photo", storage, today, today, undefined, { signal, attempt }),
      40,
      80,
    );
    assert.ok(Date.now() - started < 1000);
    assert.equal(result.abandoned, undefined);
    assert.equal(result.saved, true);
    assert.equal(result.photoError, true);
    assert.equal(result.timedOut, true);
    assert.equal(Object.hasOwn(result.item, "photo"), false);
    assert.equal(winSaveStatusLabel(result, true), WIN_PHOTO_NOT_SAVED_LABEL);
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"].length, 1);
    hung.finishLate();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"].length, 1);
    assert.equal(await readWinPhoto(result.item.id), null);
  });

  it("does not write when the watch has already given up", async () => {
    const storage = memoryStorage();
    const attempt = { dropped: true };
    const dropped = await addWinPhoto("Too late", storage, today, today, undefined, {
      signal: AbortSignal.abort(),
      attempt,
    });
    assert.equal(dropped.saved, false);
    assert.equal(dropped.abandoned, true);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
    assert.equal(winSaveStatusLabel(dropped, true), WIN_NOT_SAVED_LABEL);
  });

  it("stores the win text when a timed out photo write and its cleanup both hang", async () => {
    assert.equal(WIN_SAVE_TIMEOUT_MS, 10000);
    assert.equal(WIN_SAVE_ABORT_GRACE_MS, 50);
    assert.equal(WIN_PHOTO_REQUEST_MS, 10000);
    const rows = new Map();
    setWinPhotoDatabaseFactory({
      open() {
        const request = {};
        queueMicrotask(() => {
          const db = {
            objectStoreNames: { contains: () => true },
            close() {},
            transaction() {
              const tx = {
                abort() {
                  if (typeof this.onabort === "function") this.onabort();
                },
                objectStore() {
                  return {
                    put: () => {
                      const req = {};
                      queueMicrotask(() => {
                        if (typeof req.onsuccess === "function") req.onsuccess();
                      });
                      return req;
                    },
                    delete: () => ({}),
                    get: () => ({}),
                  };
                },
              };
              return tx;
            },
          };
          request.result = db;
          if (typeof request.onsuccess === "function") request.onsuccess();
        });
        return request;
      },
    });
    const storage = memoryStorage();
    const started = Date.now();
    const result = await watchSave(
      (signal, attempt) => addWinPhoto("Hung cleanup", storage, today, today, undefined, { signal, attempt }),
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 8000, `finished too soon (${elapsed}ms)`);
    assert.ok(elapsed < 15000, `cleanup held the save (${elapsed}ms)`);
    assert.equal(result.saved, true);
    assert.equal(result.abandoned, undefined);
    assert.equal(result.photoError, true);
    assert.equal(result.timedOut, true);
    assert.equal(Object.hasOwn(result.item, "photo"), false);
    assert.equal(result.item.text, "Hung cleanup");
    assert.equal(winSaveStatusLabel(result, true), WIN_PHOTO_NOT_SAVED_LABEL);
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"].length, 1);
    assert.equal(rows.size, 0);
  });
});
