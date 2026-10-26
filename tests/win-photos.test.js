import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexedDB } from "fake-indexeddb";
import {
  WIN_PHOTO_DB,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_FUTURE_SKEW_MS,
  WIN_PHOTO_PENDING_MS,
  WIN_PHOTO_REQUEST_MS,
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_PLACEHOLDER_SVG,
  deleteUnreferencedWinPhotos,
  isPlaceholderPhotoBlob,
  placeholderPhotoBlob,
  putWinPhoto,
  readWinPhoto,
  resetWinPhotoDatabase,
  setWinPhotoDatabaseFactory,
  setWinPhotoRequestMs,
} from "../src/today/win-photos.js";
import {
  WINS_STORAGE_KEY,
  WINS_STORAGE_KEY_V1,
  WINS_STORAGE_KEY_V2_BACKUP,
  WIN_PLACEHOLDER_PHOTO,
  WIN_RESET_DONE,
  WIN_RESET_IMAGES_LEFT,
  addWin,
  addWinPhoto,
  exportV1,
  loadWinsStore,
  readWinsStore,
  removeWin,
  resetBlockedWins,
  winResetDoneLabel,
} from "../src/today/wins.js";

const root = dirname(fileURLToPath(import.meta.url));
const morning = new Date(2026, 8, 20, 9, 0, 0);
const later = new Date(2026, 8, 20, 9, 5, 0);

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

function putFailsFactory(base) {
  return {
    open(name, version) {
      const request = base.open(name, version);
      request.addEventListener("success", () => {
        const db = request.result;
        const transaction = db.transaction.bind(db);
        db.transaction = (storeNames, mode) => {
          const tx = transaction(storeNames, mode);
          if (mode !== "readwrite") return tx;
          const objectStore = tx.objectStore.bind(tx);
          tx.objectStore = (storeName) => {
            const store = objectStore(storeName);
            store.put = () => {
              throw new DOMException("Quota exceeded", "QuotaExceededError");
            };
            return store;
          };
          return tx;
        };
      });
      return request;
    },
    deleteDatabase(name) {
      return base.deleteDatabase(name);
    },
  };
}

describe("win photo blobs", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(WIN_PHOTO_REQUEST_MS);
  });

  it("stores only the synthetic placeholder svg", async () => {
    const file = readFileSync(join(root, "../win-placeholder.svg"), "utf8");
    assert.equal(WIN_PLACEHOLDER_SVG, file);
    assert.equal(WIN_PHOTO_DB, "mindpal-photos");
    assert.equal(WIN_PHOTO_STORE, "winPhotos");
    assert.equal(WIN_PHOTO_REF, "idb");
    assert.match(WIN_PHOTO_NOT_SAVED_LABEL, /Placeholder image not saved/);
    assert.match(WIN_PHOTO_UNAVAILABLE_LABEL, /not available on this device/);
    assert.match(WIN_PHOTO_MISSING_LABEL, /not on this device/);
    assert.match(WIN_PHOTO_MISSING_LABEL, /bundled placeholder/);
    assert.match(WIN_PHOTO_ON_DEVICE_LABEL, /placeholder image/);
    assert.match(WIN_PHOTO_ON_DEVICE_LABEL, /on this device only/);
    assert.equal(WIN_PHOTO_PENDING_MS, 15000);
    assert.equal(WIN_PHOTO_FUTURE_SKEW_MS, 2000);
    assert.equal(WIN_PHOTO_REQUEST_MS, 10000);
    assert.doesNotMatch(
      `${WIN_PHOTO_NOT_SAVED_LABEL} ${WIN_PHOTO_UNAVAILABLE_LABEL} ${WIN_PHOTO_MISSING_LABEL} ${WIN_PHOTO_ON_DEVICE_LABEL}`,
      /—|–/,
    );
    const blob = placeholderPhotoBlob();
    assert.equal(await isPlaceholderPhotoBlob(blob), true);
    assert.equal(await isPlaceholderPhotoBlob(new Blob(["<svg></svg>"], { type: "image/svg+xml" })), false);
    assert.equal(await isPlaceholderPhotoBlob(new Blob([file], { type: "image/png" })), false);
    assert.equal(await isPlaceholderPhotoBlob("not-a-blob"), false);
  });

  it("keeps the blob in IndexedDB and only a reference in the wins record", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Saw the placeholder", storage, morning, morning);
    assert.equal(added.saved, true);
    assert.equal(added.photoSaved, true);
    assert.equal(added.photoFallback, false);
    assert.equal(added.photoError, false);
    assert.equal(added.item.photo, WIN_PHOTO_REF);
    const serial = storage.getItem(WINS_STORAGE_KEY);
    assert.equal(serial.includes("<svg"), false);
    assert.equal(serial.includes("data:image"), false);
    assert.equal(JSON.parse(serial).days["2026-09-20"][0].photo, WIN_PHOTO_REF);
    const blob = await readWinPhoto(added.item.id);
    assert.equal(blob.type, "image/svg+xml");
    assert.equal(await blob.text(), WIN_PLACEHOLDER_SVG);
    const exported = exportV1(loadWinsStore(storage));
    assert.equal(Object.hasOwn(exported.days["2026-09-20"][0], "photo"), false);
    assert.equal(storage.store.has(WINS_STORAGE_KEY_V1), false);
  });

  it("falls back to the placeholder path when IndexedDB cannot be opened", async () => {
    setWinPhotoDatabaseFactory(null);
    const storage = memoryStorage();
    const added = await addWinPhoto("Quiet cup", storage, morning, morning);
    assert.equal(added.saved, true);
    assert.equal(added.photoSaved, false);
    assert.equal(added.photoFallback, true);
    assert.equal(added.item.photo, WIN_PLACEHOLDER_PHOTO);
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("saves the text win when the photo put fails", async () => {
    setWinPhotoDatabaseFactory(putFailsFactory(indexedDB));
    const storage = memoryStorage();
    const added = await addWinPhoto("Walked anyway", storage, morning, morning);
    assert.equal(added.saved, true);
    assert.equal(added.photoSaved, false);
    assert.equal(added.photoError, true);
    assert.equal(added.photoFallback, false);
    assert.equal(Object.hasOwn(added.item, "photo"), false);
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"][0].text, "Walked anyway");
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("rejects a blob that is not the placeholder and still saves the text", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto(
      "Not a real photo",
      storage,
      morning,
      morning,
      new Blob(["face"], { type: "image/png" }),
    );
    assert.equal(added.saved, true);
    assert.equal(added.photoError, true);
    assert.equal(Object.hasOwn(added.item, "photo"), false);
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("does not open the photo database on load or on a win with no photo", async () => {
    let opens = 0;
    setWinPhotoDatabaseFactory({
      open() {
        opens += 1;
        throw new Error("load must not open photos");
      },
    });
    const storage = memoryStorage();
    loadWinsStore(storage);
    readWinsStore(storage);
    const added = addWin("Tea", storage, morning, morning);
    assert.equal(added.saved, true);
    await added.photoCleanup;
    assert.equal(opens, 0);
  });

  it("deletes only the removed win photo and leaves an unreferenced blob until reset", async () => {
    const storage = memoryStorage();
    const orphan = await putWinPhoto("orphan-blob", placeholderPhotoBlob());
    assert.equal(orphan.ok, true);
    const first = await addWinPhoto("One", storage, morning, morning);
    const second = await addWinPhoto("Two", storage, morning, later);
    assert.equal(first.photoSaved, true);
    assert.equal(second.photoSaved, true);
    await first.photoCleanup;
    await second.photoCleanup;
    assert.equal((await readWinPhoto("orphan-blob")).type, "image/svg+xml");

    const removed = removeWin(first.item.id, storage, morning);
    assert.equal(removed.saved, true);
    await removed.photoCleanup;
    assert.equal(await readWinPhoto(first.item.id), null);
    assert.equal((await readWinPhoto(second.item.id)).type, "image/svg+xml");
    assert.equal((await readWinPhoto("orphan-blob")).type, "image/svg+xml");
    assert.equal(storage.store.has(WINS_STORAGE_KEY_V1), false);
  });

  it("does not delete a photo when the win text cannot be saved", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Keep me", storage, morning, morning);
    assert.equal(added.photoSaved, true);
    storage.setItem = () => {
      throw new Error("quota");
    };
    const removed = removeWin(added.item.id, storage, morning);
    assert.equal(removed.saved, false);
    await removed.photoCleanup;
    assert.equal((await readWinPhoto(added.item.id)).type, "image/svg+xml");
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"][0].id, added.item.id);
  });

  it("drops blobs the new record does not name when a save replaces an unreadable record", async () => {
    const storage = memoryStorage({ [WINS_STORAGE_KEY]: "{\"version\":2,\"days\":" });
    const planted = await putWinPhoto("old-orphan", placeholderPhotoBlob(), new Date(Date.now() - WIN_PHOTO_PENDING_MS - 1000));
    assert.equal(planted.ok, true);
    const added = addWin("Fresh", storage, morning, morning);
    assert.equal(added.saved, true);
    await added.photoCleanup;
    assert.equal(await readWinPhoto("old-orphan"), null);
    assert.equal(JSON.parse(storage.getItem(WINS_STORAGE_KEY)).days["2026-09-20"][0].text, "Fresh");
  });

  it("leaves photo blobs in place when reset cannot clear the record", async () => {
    const storage = memoryStorage({ [WINS_STORAGE_KEY]: "corrupt-stay" });
    storage.setItem = () => {
      throw new Error("quota");
    };
    assert.equal((await putWinPhoto("stay-blob", placeholderPhotoBlob())).ok, true);
    const refused = resetBlockedWins(storage, morning);
    assert.equal(refused.cleared, false);
    assert.equal(refused.photoCleanup, undefined);
    assert.equal((await readWinPhoto("stay-blob")).type, "image/svg+xml");
    assert.equal(storage.getItem(WINS_STORAGE_KEY), "corrupt-stay");
  });

  it("deletes every photo blob after reset and leaves the v1 key", async () => {
    const at = "2026-09-20T09:00:00.000Z";
    const v1 = JSON.stringify({ version: 1, days: { "2026-09-20": [{ id: "old", text: "Tea", at }] } });
    const storage = memoryStorage({
      [WINS_STORAGE_KEY]: "corrupt-reset",
      [WINS_STORAGE_KEY_V1]: v1,
      [`${WINS_STORAGE_KEY_V2_BACKUP}.1`]: "old-a",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.2`]: "old-b",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.3`]: "old-c",
    });
    const old = new Date(Date.now() - WIN_PHOTO_PENDING_MS - 1000);
    await putWinPhoto("reset-a", placeholderPhotoBlob(), old);
    await putWinPhoto("reset-b", placeholderPhotoBlob(), old);
    const reset = resetBlockedWins(storage, morning);
    assert.equal(reset.cleared, true);
    await reset.photoCleanup;
    assert.equal(await readWinPhoto("reset-a"), null);
    assert.equal(await readWinPhoto("reset-b"), null);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
    assert.equal(storage.getItem(WINS_STORAGE_KEY_V1), v1);
  });

  it("shows a missing blob as a reference with no stored bytes", async () => {
    const storage = memoryStorage();
    const added = addWin("Where is it", storage, morning, morning, WIN_PHOTO_REF, "win-missing");
    assert.equal(added.saved, true);
    assert.equal(added.item.photo, WIN_PHOTO_REF);
    assert.equal(await readWinPhoto("win-missing"), null);
    assert.match(WIN_PHOTO_MISSING_LABEL, /bundled placeholder/);
  });

  it("does not keep a placeholder image whose time is further ahead than the clock skew", async () => {
    const now = Date.UTC(2026, 9, 25, 1, 0, 0);
    assert.equal((await putWinPhoto("skew", placeholderPhotoBlob(), now + WIN_PHOTO_FUTURE_SKEW_MS)).ok, true);
    assert.equal((await putWinPhoto("future", placeholderPhotoBlob(), now + WIN_PHOTO_FUTURE_SKEW_MS + 1)).ok, true);
    assert.equal((await putWinPhoto("fresh", placeholderPhotoBlob(), now - 1000)).ok, true);
    const swept = await deleteUnreferencedWinPhotos([], now);
    assert.equal(swept.failed, undefined);
    assert.equal(swept.deleted.includes("future"), true);
    assert.equal(swept.deleted.includes("skew"), false);
    assert.equal(swept.deleted.includes("fresh"), false);
    assert.equal(await readWinPhoto("future"), null);
    assert.equal((await readWinPhoto("skew")).type, "image/svg+xml");
    assert.equal((await readWinPhoto("fresh")).type, "image/svg+xml");
  });

  it("keeps a placeholder image another tab just stored when reset or an unreadable save would otherwise delete it", async () => {
    const swept = memoryStorage({ [WINS_STORAGE_KEY]: "{\"version\":2,\"days\":" });
    assert.equal((await putWinPhoto("pending-blob", placeholderPhotoBlob())).ok, true);
    assert.equal(
      (await putWinPhoto("old-orphan", placeholderPhotoBlob(), new Date(Date.now() - WIN_PHOTO_PENDING_MS))).ok,
      true,
    );
    const added = addWin("Fresh", swept, morning, morning);
    assert.equal(added.saved, true);
    await added.photoCleanup;
    assert.equal((await readWinPhoto("pending-blob")).type, "image/svg+xml");
    assert.equal(await readWinPhoto("old-orphan"), null);

    const blocked = memoryStorage({
      [WINS_STORAGE_KEY]: "corrupt-reset",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.1`]: "old-a",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.2`]: "old-b",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.3`]: "old-c",
    });
    await putWinPhoto("pending-reset", placeholderPhotoBlob());
    await putWinPhoto("old-reset", placeholderPhotoBlob(), new Date(Date.now() - WIN_PHOTO_PENDING_MS - 1000));
    const reset = resetBlockedWins(blocked, morning);
    assert.equal(reset.cleared, true);
    await reset.photoCleanup;
    assert.equal((await readWinPhoto("pending-reset")).type, "image/svg+xml");
    assert.equal(await readWinPhoto("old-reset"), null);
    assert.equal((await readWinPhoto("pending-blob")).type, "image/svg+xml");
  });

  it("does not return a stored value that is not the placeholder image", async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(WIN_PHOTO_DB, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(WIN_PHOTO_STORE)) database.createObjectStore(WIN_PHOTO_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(WIN_PHOTO_STORE, "readwrite");
      tx.objectStore(WIN_PHOTO_STORE).put(new Blob(["nope"], { type: "image/png" }), "bad-raw");
      tx.objectStore(WIN_PHOTO_STORE).put(
        { blob: new Blob(["nope"], { type: "image/png" }), createdAt: Date.now() },
        "bad-record",
      );
      tx.objectStore(WIN_PHOTO_STORE).put(placeholderPhotoBlob(), "raw-ok");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    assert.equal(await readWinPhoto("bad-raw"), null);
    assert.equal(await readWinPhoto("bad-record"), null);
    assert.equal(await (await readWinPhoto("raw-ok")).text(), WIN_PLACEHOLDER_SVG);
  });

  it("drops the cached connection on close and on versionchange, then opens on the next use", async () => {
    let opens = 0;
    let seen = null;
    setWinPhotoDatabaseFactory({
      open(name, version) {
        opens += 1;
        const request = indexedDB.open(name, version);
        request.addEventListener("success", () => {
          seen = request.result;
        });
        return request;
      },
      deleteDatabase(name) {
        return indexedDB.deleteDatabase(name);
      },
    });
    assert.equal((await putWinPhoto("keep", placeholderPhotoBlob(), new Date(0))).ok, true);
    assert.equal(opens, 1);
    assert.equal(typeof seen.onversionchange, "function");
    assert.equal(typeof seen.onclose, "function");
    seen.onclose();
    assert.equal((await putWinPhoto("keep", placeholderPhotoBlob(), new Date(0))).ok, true);
    assert.equal(opens, 2);

    const upgrade = await new Promise((resolve, reject) => {
      const request = indexedDB.open(WIN_PHOTO_DB, 2);
      const timer = setTimeout(() => reject(new Error("versionchange stayed blocked")), 1000);
      request.onupgradeneeded = () => {};
      request.onsuccess = () => {
        clearTimeout(timer);
        request.result.close();
        resolve("opened");
      };
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error);
      };
    });
    assert.equal(upgrade, "opened");
    const after = await putWinPhoto("keep", placeholderPhotoBlob(), new Date(0));
    assert.equal(after.ok, false);
    assert.equal(after.reason, "unavailable");
    assert.equal(opens, 3);
  });

  it("does not give a duplicated id a second claim on the same placeholder image", async () => {
    const at = "2026-09-20T09:00:00.000Z";
    const raw = JSON.stringify({
      version: 2,
      days: {
        "2026-09-20": [
          { id: "same", text: "One", at, photo: WIN_PHOTO_REF },
          { id: "same", text: "Two", at, photo: WIN_PHOTO_REF },
        ],
      },
    });
    const storage = memoryStorage({ [WINS_STORAGE_KEY]: raw });
    let writes = 0;
    const origSet = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      origSet(key, value);
    };
    assert.equal((await putWinPhoto("same", placeholderPhotoBlob(), new Date(0))).ok, true);
    const loaded = loadWinsStore(storage);
    assert.equal(writes, 0);
    assert.equal(storage.getItem(WINS_STORAGE_KEY), raw);
    const day = loaded.days["2026-09-20"];
    assert.equal(day[0].id, "same");
    assert.equal(day[0].photo, WIN_PHOTO_REF);
    assert.notEqual(day[1].id, "same");
    assert.equal(day[1].photo, WIN_PLACEHOLDER_PHOTO);
    assert.equal(await (await readWinPhoto("same")).text(), WIN_PLACEHOLDER_SVG);
    assert.equal(await readWinPhoto(day[1].id), null);
  });

  it("says the placeholder images could not be removed when reset cannot list them", async () => {
    const old = new Date(Date.now() - WIN_PHOTO_PENDING_MS - 1000);
    assert.equal((await putWinPhoto("stuck", placeholderPhotoBlob(), old)).ok, true);
    setWinPhotoDatabaseFactory({
      open(name, version) {
        const request = indexedDB.open(name, version);
        request.addEventListener("success", () => {
          const db = request.result;
          const transaction = db.transaction.bind(db);
          db.transaction = (storeNames, mode) => {
            const tx = transaction(storeNames, mode);
            const objectStore = tx.objectStore.bind(tx);
            tx.objectStore = (storeName) => {
              const store = objectStore(storeName);
              if (mode === "readonly") {
                store.getAll = () => {
                  throw new Error("cannot list");
                };
                store.getAllKeys = () => {
                  throw new Error("cannot list");
                };
              }
              return store;
            };
            return tx;
          };
        });
        return request;
      },
      deleteDatabase(name) {
        return indexedDB.deleteDatabase(name);
      },
    });
    const storage = memoryStorage({
      [WINS_STORAGE_KEY]: "corrupt-list",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.1`]: "old-a",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.2`]: "old-b",
      [`${WINS_STORAGE_KEY_V2_BACKUP}.3`]: "old-c",
    });
    const reset = resetBlockedWins(storage, morning);
    assert.equal(reset.cleared, true);
    const cleanup = await reset.photoCleanup;
    assert.equal(cleanup.failed, true);
    assert.equal(cleanup.deleted.length, 0);
    assert.equal(winResetDoneLabel(cleanup), WIN_RESET_IMAGES_LEFT);
    assert.match(WIN_RESET_IMAGES_LEFT, /could not be removed from this device/);
    assert.doesNotMatch(WIN_RESET_IMAGES_LEFT, /were removed|—|–/);
    assert.equal(winResetDoneLabel(undefined), WIN_RESET_IMAGES_LEFT);
    assert.equal(winResetDoneLabel({ deleted: [], unavailable: true }), WIN_RESET_IMAGES_LEFT);
    assert.equal(winResetDoneLabel({ deleted: ["stuck"] }), WIN_RESET_DONE);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal((await readWinPhoto("stuck")).type, "image/svg+xml");
    assert.equal(storage.getItem(WINS_STORAGE_KEY), null);
  });
});
