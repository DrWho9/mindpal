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
  WIN_PHOTO_REF,
  WIN_PHOTO_STORE,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_PLACEHOLDER_SVG,
  isPlaceholderPhotoBlob,
  placeholderPhotoBlob,
  putWinPhoto,
  readWinPhoto,
  resetWinPhotoDatabase,
  setWinPhotoDatabaseFactory,
} from "../src/today/win-photos.js";
import {
  WINS_STORAGE_KEY,
  WINS_STORAGE_KEY_V1,
  WINS_STORAGE_KEY_V2_BACKUP,
  WIN_PLACEHOLDER_PHOTO,
  addWin,
  addWinPhoto,
  exportV1,
  loadWinsStore,
  readWinsStore,
  removeWin,
  resetBlockedWins,
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
  });

  it("stores only the synthetic placeholder svg", async () => {
    const file = readFileSync(join(root, "../win-placeholder.svg"), "utf8");
    assert.equal(WIN_PLACEHOLDER_SVG, file);
    assert.equal(WIN_PHOTO_DB, "mindpal-photos");
    assert.equal(WIN_PHOTO_STORE, "winPhotos");
    assert.equal(WIN_PHOTO_REF, "idb");
    assert.match(WIN_PHOTO_NOT_SAVED_LABEL, /Photo not saved/);
    assert.match(WIN_PHOTO_UNAVAILABLE_LABEL, /not available on this device/);
    assert.match(WIN_PHOTO_MISSING_LABEL, /not on this device/);
    assert.match(WIN_PHOTO_ON_DEVICE_LABEL, /on this device only/);
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
    const planted = await putWinPhoto("old-orphan", placeholderPhotoBlob());
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
    await putWinPhoto("reset-a", placeholderPhotoBlob());
    await putWinPhoto("reset-b", placeholderPhotoBlob());
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
    assert.match(WIN_PHOTO_MISSING_LABEL, /prototype placeholder/);
  });
});
