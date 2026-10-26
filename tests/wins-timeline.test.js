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
  PAST_WINS_REMOVE,
  PAST_WINS_SHOW_MORE,
  PAST_WINS_TITLE,
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
    assert.equal(page.totalDays, 2);
    assert.equal(page.hasMore, false);
    assert.deepEqual(page.days.map((day) => day.key), ["2026-09-19", "2026-09-18"]);
    assert.deepEqual(page.days[1].items.map((item) => item.id), ["older-am", "older-pm"]);
    assert.equal(page.days.some((day) => day.items.some((item) => item.id === "today")), false);
    assert.equal(page.days.some((day) => day.key === "2026-09-21"), false);
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
    assert.doesNotMatch(
      `${PAST_WINS_TITLE} ${PAST_WINS_EMPTY} ${PAST_WINS_SHOW_MORE} ${PAST_WINS_REMOVE} ${formatWinDayLabel("2026-09-19", "en-AU")}`,
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
    assert.match(css, /\.mp-past-wins summary\{[^}]*min-height:44px/);
    assert.match(css, /\.mp-past-wins \.mp-past-remove,\.mp-past-wins \.mp-past-more\{[^}]*min-height:44px/);
    assert.match(css, /@media \(width<=480px\)/);
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
});
