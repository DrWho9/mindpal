import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexedDB } from "fake-indexeddb";
import {
  WIN_PHOTO_DB,
  WIN_PHOTO_STORE,
  WIN_PLACEHOLDER_SVG,
  WIN_SAMPLE_1_SVG,
  WIN_SAMPLE_2_SVG,
  WIN_SAMPLE_3_SVG,
  WIN_SAMPLE_4_SVG,
  WIN_SAMPLE_CHOICES,
  WIN_SAMPLE_NONE,
  WIN_SAMPLE_ON_DEVICE_LABEL,
  WIN_SAMPLE_PROTOTYPE_LABEL,
  WIN_SAMPLES,
  isAllowedWinPhotoBlob,
  isPlaceholderPhotoBlob,
  putWinPhoto,
  readWinPhoto,
  readWinPhotoRecord,
  resetWinPhotoDatabase,
  setWinPhotoDatabaseFactory,
  setWinPhotoRequestMs,
  winPhotoAllowlistId,
  winSampleBlob,
  winSamplePath,
} from "../src/today/win-photos.js";
import {
  WINS_STORAGE_KEY,
  WIN_IMAGE_NOT_CHANGED_LABEL,
  WIN_IMAGE_NOT_ON_DEVICE_LABEL,
  WIN_IMAGE_REMOVED_LABEL,
  WIN_IMAGE_UPDATED_LABEL,
  WIN_IMAGE_WIN_GONE_LABEL,
  WIN_SAMPLE_NOT_SAVED_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_PLACEHOLDER_PHOTO,
  WIN_SAMPLE_UNAVAILABLE_LABEL,
  addWin,
  addWinPhoto,
  changeWinImage,
  exportV1,
  loadWinsStore,
  removeWin,
  saveWinsStore,
  winSaveStatusLabel,
  pastWinDayHeading,
  pastWinFocusMove,
  pastWinHoldAfterRefresh,
  readWinsStore,
  watchSave,
  winStatusId,
} from "../src/today/wins.js";

const root = dirname(fileURLToPath(import.meta.url));
const morning = new Date(2026, 8, 20, 9, 0, 0);
const later = new Date(2026, 8, 20, 9, 5, 0);
const sampleFiles = [
  ["win-sample-1.svg", WIN_SAMPLE_1_SVG],
  ["win-sample-2.svg", WIN_SAMPLE_2_SVG],
  ["win-sample-3.svg", WIN_SAMPLE_3_SVG],
  ["win-sample-4.svg", WIN_SAMPLE_4_SVG],
];

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

function holdFirstWriteFactory(base, delayMs, gate, deleteAfter = false) {
  let used = false;
  return {
    open(name, version) {
      const request = base.open(name, version);
      request.addEventListener("success", () => {
        const db = request.result;
        const transaction = db.transaction.bind(db);
        db.transaction = (storeNames, mode) => {
          if (mode === "readwrite" && !used) {
            used = true;
            let oncomplete = null;
            let payload = null;
            const fake = {
              objectStore() {
                return {
                  put(value, key) {
                    payload = { value, key };
                    if (gate) gate();
                    setTimeout(() => {
                      const tx = transaction(storeNames, "readwrite");
                      const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
                      tx.objectStore(storeName).put(payload.value, payload.key);
                      const done = oncomplete;
                      tx.oncomplete = () => {
                        if (!deleteAfter) {
                          if (typeof done === "function") done();
                          return;
                        }
                        const drop = transaction(storeNames, "readwrite");
                        drop.objectStore(storeName).delete(payload.key);
                        const finish = () => {
                          if (typeof done === "function") done();
                        };
                        drop.oncomplete = finish;
                        drop.onerror = finish;
                        drop.onabort = finish;
                      };
                    }, delayMs);
                    return {};
                  },
                  delete() {
                    return {};
                  },
                };
              },
              abort() {},
            };
            Object.defineProperty(fake, "oncomplete", {
              set(fn) {
                oncomplete = fn;
              },
              get() {
                return oncomplete;
              },
            });
            Object.defineProperty(fake, "onerror", { set() {}, get() { return null; } });
            Object.defineProperty(fake, "onabort", { set() {}, get() { return null; } });
            return fake;
          }
          return transaction(storeNames, mode);
        };
      });
      return request;
    },
    deleteDatabase(name) {
      return base.deleteDatabase(name);
    },
  };
}

function readThrowsFactory(base) {
  return {
    open(name, version) {
      const request = base.open(name, version);
      request.addEventListener("success", () => {
        const db = request.result;
        const transaction = db.transaction.bind(db);
        db.transaction = (storeNames, mode) => {
          const tx = transaction(storeNames, mode);
          if (mode !== "readonly") return tx;
          const objectStore = tx.objectStore.bind(tx);
          tx.objectStore = (storeName) => {
            const store = objectStore(storeName);
            store.get = () => {
              throw new Error("photo read failed");
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

function putHangsFactory(base) {
  return {
    open(name, version) {
      const request = base.open(name, version);
      request.addEventListener("success", () => {
        const db = request.result;
        const transaction = db.transaction.bind(db);
        db.transaction = (storeNames, mode) => {
          if (mode !== "readwrite") return transaction(storeNames, mode);
          return {
            objectStore() {
              return { put() { return {}; }, delete() { return {}; } };
            },
            abort() {},
          };
        };
      });
      return request;
    },
    deleteDatabase(name) {
      return base.deleteDatabase(name);
    },
  };
}

describe("sample image allowlist", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
    setWinPhotoRequestMs(10000);
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(10000);
  });

  it("accepts only the placeholder and the four bundled samples", async () => {
    assert.equal(WIN_SAMPLES.length, 4);
    assert.deepEqual(
      WIN_SAMPLE_CHOICES.map((item) => item.label),
      [
        "Placeholder image",
        "Sample image 1: green squares",
        "Sample image 2: blue circles",
        "Sample image 3: amber triangles",
        "Sample image 4: teal bars",
        "No image",
      ],
    );
    assert.equal(WIN_SAMPLE_CHOICES[0].id, "placeholder");
    assert.equal(winSamplePath("placeholder"), WIN_PLACEHOLDER_PHOTO);
    for (const [file, svg] of sampleFiles) {
      const disk = readFileSync(join(root, "..", file), "utf8");
      assert.equal(svg, disk);
      assert.match(svg, />Sample</);
      assert.doesNotMatch(svg, /<image\b|person|people|face|photo/i);
      const sample = WIN_SAMPLES.find((item) => item.file === file);
      assert.equal(sample.svg, disk);
      const blob = winSampleBlob(sample.id);
      assert.equal(await isAllowedWinPhotoBlob(blob), true);
      assert.equal(await isPlaceholderPhotoBlob(blob), false);
      assert.equal(await winPhotoAllowlistId(blob), sample.id);
      assert.equal((await putWinPhoto(`id-${sample.id}`, blob)).ok, true);
      assert.equal(await (await readWinPhoto(`id-${sample.id}`)).text(), svg);
    }
    const placeholder = winSampleBlob("placeholder");
    assert.equal(await isAllowedWinPhotoBlob(placeholder), true);
    assert.equal(await isPlaceholderPhotoBlob(placeholder), true);
    assert.equal(await (await readWinPhoto("id-sample-2")).text(), WIN_SAMPLE_2_SVG);
    const shifted = `${WIN_SAMPLE_2_SVG.slice(0, -2)} `;
    assert.equal(await isAllowedWinPhotoBlob(new Blob([shifted], { type: "image/svg+xml" })), false);
    assert.equal(await isAllowedWinPhotoBlob(new Blob(["<svg></svg>"], { type: "image/svg+xml" })), false);
    assert.equal(await isAllowedWinPhotoBlob(new Blob([WIN_SAMPLE_2_SVG], { type: "image/png" })), false);
    assert.equal(await isAllowedWinPhotoBlob(new Blob([`${"x".repeat(5000)}`], { type: "image/svg+xml" })), false);
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = new TextEncoder().encode(WIN_SAMPLE_2_SVG);
    const withBom = new Uint8Array(bom.length + body.length);
    withBom.set(bom, 0);
    withBom.set(body, bom.length);
    const bomBlob = new Blob([withBom], { type: "image/svg+xml" });
    assert.equal(await winPhotoAllowlistId(bomBlob), "");
    assert.equal(await isAllowedWinPhotoBlob(bomBlob), false);
    assert.equal((await putWinPhoto("bom", bomBlob)).reason, "blob");
    assert.equal(await putWinPhoto("nope", new Blob(["<svg></svg>"], { type: "image/svg+xml" })).then((result) => result.reason), "blob");
    assert.equal(await readWinPhoto("nope"), null);
    assert.doesNotMatch(
      `${WIN_SAMPLE_ON_DEVICE_LABEL} ${WIN_SAMPLE_PROTOTYPE_LABEL} ${WIN_IMAGE_NOT_CHANGED_LABEL} ${WIN_IMAGE_NOT_ON_DEVICE_LABEL} ${WIN_IMAGE_WIN_GONE_LABEL} ${WIN_IMAGE_UPDATED_LABEL} ${WIN_IMAGE_REMOVED_LABEL} ${WIN_SAMPLE_UNAVAILABLE_LABEL} ${WIN_SAMPLE_NOT_SAVED_LABEL}`,
      /—|–/,
    );
    assert.doesNotMatch(WIN_IMAGE_WIN_GONE_LABEL, /still saved/);
    assert.match(WIN_SAMPLE_ON_DEVICE_LABEL, /sample image/);
    assert.doesNotMatch(WIN_IMAGE_NOT_CHANGED_LABEL, /photo/i);
  });

  it("does not return a stored value outside the allowlist", async () => {
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
      tx.objectStore(WIN_PHOTO_STORE).put(new Blob(["nope"], { type: "image/svg+xml" }), "bad");
      tx.objectStore(WIN_PHOTO_STORE).put(winSampleBlob("sample-4"), "teal");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    assert.equal(await readWinPhoto("bad"), null);
    assert.equal(await (await readWinPhoto("teal")).text(), WIN_SAMPLE_4_SVG);
  });
});

describe("change and remove a sample image", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
    setWinPhotoRequestMs(10000);
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(10000);
  });

  it("stores a chosen sample and leaves it out of exportV1", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Blue circles", storage, morning, morning, winSampleBlob("sample-2"));
    assert.equal(added.saved, true);
    assert.equal(added.photoSaved, true);
    assert.equal(added.item.photo, WIN_PHOTO_REF);
    assert.equal(added.item.text, "Blue circles");
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_2_SVG);
    const serial = storage.getItem(WINS_STORAGE_KEY);
    assert.equal(serial.includes("<svg"), false);
    const exported = exportV1(loadWinsStore(storage));
    assert.equal(Object.hasOwn(exported.days["2026-09-20"][0], "photo"), false);
    assert.equal(exported.days["2026-09-20"][0].text, "Blue circles");
  });

  it("changes the sample on an existing win and keeps the text", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Keep these words", storage, morning, morning);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_PLACEHOLDER_SVG);
    let writes = 0;
    const orig = storage.setItem;
    storage.setItem = (key, value) => {
      writes += 1;
      orig(key, value);
    };
    assert.equal(loadWinsStore(storage).days["2026-09-20"][0].text, "Keep these words");
    assert.equal(writes, 0);
    const changed = await changeWinImage(added.item.id, "sample-3", storage, morning, morning);
    assert.equal(changed.imageChanged, true);
    assert.equal(changed.item.text, "Keep these words");
    assert.equal(changed.item.photo, WIN_PHOTO_REF);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_3_SVG);
    assert.equal(loadWinsStore(storage).days["2026-09-20"][0].text, "Keep these words");
    const again = await changeWinImage(added.item.id, "sample-3", storage, morning, later);
    assert.equal(again.unchanged, true);
    assert.equal(again.imageChanged, false);
  });

  it("removes the image and keeps the text", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Still here", storage, morning, morning, winSampleBlob("sample-1"));
    const removed = await changeWinImage(added.item.id, WIN_SAMPLE_NONE, storage, morning, morning);
    assert.equal(removed.imageChanged, true);
    assert.equal(removed.removed, true);
    assert.equal(removed.item.text, "Still here");
    assert.equal(Object.hasOwn(removed.item, "photo"), false);
    await removed.photoCleanup;
    assert.equal(await readWinPhoto(added.item.id), null);
    assert.equal(loadWinsStore(storage).days["2026-09-20"][0].text, "Still here");
    const second = await changeWinImage(added.item.id, "none", storage, morning, later);
    assert.equal(second.unchanged, true);
  });

  it("keeps the text and the old image when the write fails", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Do not lose this", storage, morning, morning);
    setWinPhotoDatabaseFactory(putFailsFactory(indexedDB));
    const failed = await changeWinImage(added.item.id, "sample-2", storage, morning, morning);
    assert.equal(failed.imageChanged, false);
    assert.equal(failed.kept, true);
    assert.equal(failed.saved, false);
    assert.equal(WIN_IMAGE_NOT_CHANGED_LABEL, "Image not changed. The win text is still saved on this device.");
    const kept = loadWinsStore(storage).days["2026-09-20"][0];
    assert.equal(kept.text, "Do not lose this");
    assert.equal(kept.photo, WIN_PHOTO_REF);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_PLACEHOLDER_SVG);
  });

  it("does not change the record when the image write does not finish", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Wait for it", storage, morning, morning, winSampleBlob("sample-4"));
    setWinPhotoRequestMs(40);
    setWinPhotoDatabaseFactory(putHangsFactory(indexedDB));
    const failed = await changeWinImage(added.item.id, "sample-1", storage, morning, morning);
    assert.equal(failed.imageChanged, false);
    assert.equal(failed.kept, true);
    assert.equal(failed.timedOut, true);
    const kept = readWinsStore(storage).days["2026-09-20"][0];
    assert.equal(kept.text, "Wait for it");
    assert.equal(kept.photo, WIN_PHOTO_REF);
    setWinPhotoDatabaseFactory(indexedDB);
    setWinPhotoRequestMs(10000);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_4_SVG);
  });

  it("stops a hung image change without a second write", async () => {
    const storage = memoryStorage();
    const added = await addWin("Words only", storage, morning, morning);
    setWinPhotoRequestMs(500);
    setWinPhotoDatabaseFactory(putHangsFactory(indexedDB));
    const result = await watchSave(
      (signal, attempt) => changeWinImage(added.item.id, "sample-2", storage, morning, morning, { signal, attempt }),
      30,
      20,
    );
    assert.equal(result.imageChanged === true, false);
    const kept = readWinsStore(storage).days["2026-09-20"][0];
    assert.equal(kept.text, "Words only");
    assert.equal(Object.hasOwn(kept, "photo"), false);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("uses the bundled sample path when IndexedDB cannot be opened", async () => {
    const storage = memoryStorage();
    const added = addWin("Path only", storage, morning, morning);
    setWinPhotoDatabaseFactory(null);
    const changed = await changeWinImage(added.item.id, "sample-2", storage, morning, morning);
    assert.equal(changed.imageChanged, true);
    assert.equal(changed.photoFallback, true);
    assert.equal(changed.item.photo, "/mindpal/win-sample-2.svg");
    assert.equal(changed.item.text, "Path only");
    assert.equal(await readWinPhoto(added.item.id), null);
    const savedSample = await addWinPhoto("Saved sample", storage, morning, later, winSampleBlob("sample-3"));
    assert.equal(savedSample.photoFallback, true);
    assert.equal(savedSample.item.photo, "/mindpal/win-sample-3.svg");
    assert.equal(winSaveStatusLabel(savedSample, true), WIN_SAMPLE_UNAVAILABLE_LABEL);
    const savedPlaceholder = await addWinPhoto("Saved placeholder", storage, morning, new Date(2026, 8, 20, 9, 6, 0));
    assert.equal(savedPlaceholder.photoFallback, true);
    assert.equal(savedPlaceholder.item.photo, WIN_PLACEHOLDER_PHOTO);
    assert.equal(winSaveStatusLabel(savedPlaceholder, true), WIN_PHOTO_UNAVAILABLE_LABEL);
    assert.equal(winSaveStatusLabel({ saved: true, item: { id: "path" }, photoFallback: true }, true), WIN_PHOTO_UNAVAILABLE_LABEL);
    const rejected = await addWinPhoto("Not allowed", storage, morning, later, new Blob(["face"], { type: "image/png" }));
    assert.equal(rejected.photoError, true);
    assert.equal(Object.hasOwn(rejected.item, "photo"), false);
    assert.equal(rejected.item.text, "Not allowed");
  });
});

describe("a sample change reloads before it saves", () => {
  beforeEach(async () => {
    setWinPhotoDatabaseFactory(indexedDB);
    await resetWinPhotoDatabase();
    setWinPhotoRequestMs(10000);
  });

  afterEach(async () => {
    await resetWinPhotoDatabase();
    setWinPhotoDatabaseFactory(undefined);
    setWinPhotoRequestMs(10000);
  });

  function changeWhileHeld(storage, id, during) {
    let ran = false;
    setWinPhotoDatabaseFactory(holdFirstWriteFactory(indexedDB, 300, () => {
      during();
      ran = true;
    }));
    const changing = changeWinImage(id, "sample-2", storage, morning, morning);
    return changing.then((changed) => {
      assert.equal(ran, true);
      return changed;
    });
  }

  it("keeps a win added while the image write is held", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Held win", storage, morning, morning);
    const changed = await changeWhileHeld(storage, added.item.id, () => {
      const extra = addWin("Added during change", storage, morning, later);
      assert.equal(extra.saved, true);
    });
    assert.equal(changed.imageChanged, true);
    const day = loadWinsStore(storage).days["2026-09-20"];
    assert.equal(day.length, 2);
    assert.equal(day.find((item) => item.id === added.item.id).text, "Held win");
    assert.equal(day.find((item) => item.id === added.item.id).photo, WIN_PHOTO_REF);
    assert.equal(day.some((item) => item.text === "Added during change"), true);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_2_SVG);
  });

  it("does not bring back a win removed while the image write is held", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Going away", storage, morning, morning);
    const changed = await changeWhileHeld(storage, added.item.id, () => {
      const removed = removeWin(added.item.id, storage, morning);
      assert.equal(removed.saved, true);
    });
    assert.equal(changed.missing, true);
    assert.equal(changed.imageChanged, false);
    assert.equal(changed.kept, false);
    assert.equal(WIN_IMAGE_WIN_GONE_LABEL.includes("no longer on this device"), true);
    const day = loadWinsStore(storage).days["2026-09-20"] || [];
    assert.equal(day.some((item) => item.id === added.item.id), false);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("keeps a save from another tab while the image write is held", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Shared win", storage, morning, morning);
    const changed = await changeWhileHeld(storage, added.item.id, () => {
      const fresh = loadWinsStore(storage);
      fresh.days["2026-09-20"][0].text = "Edited in another tab";
      fresh.days["2026-09-20"].push({ id: "other-tab", text: "From the other tab", at: later.toISOString() });
      saveWinsStore(fresh, storage, later);
    });
    assert.equal(changed.imageChanged, true);
    const day = loadWinsStore(storage).days["2026-09-20"];
    const target = day.find((item) => item.id === added.item.id);
    assert.equal(target.text, "Edited in another tab");
    assert.equal(target.photo, WIN_PHOTO_REF);
    assert.equal(day.some((item) => item.id === "other-tab"), true);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_2_SVG);
  });

  it("does not point the record at a blob another tab deleted", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Race the blob", storage, morning, morning);
    let cleared = false;
    setWinPhotoDatabaseFactory(holdFirstWriteFactory(indexedDB, 300, () => {
      const fresh = loadWinsStore(storage);
      delete fresh.days["2026-09-20"][0].photo;
      saveWinsStore(fresh, storage, later);
      cleared = true;
    }, true));
    const changed = await changeWinImage(added.item.id, "sample-2", storage, morning, morning);
    assert.equal(cleared, true);
    assert.equal(changed.imageChanged, false);
    assert.equal(changed.kept, true);
    assert.equal(changed.reason, "unconfirmed");
    assert.equal(WIN_IMAGE_NOT_ON_DEVICE_LABEL, "Image not changed. That sample image is not on this device. The win text is still saved on this device.");
    const kept = loadWinsStore(storage).days["2026-09-20"][0];
    assert.equal(kept.text, "Race the blob");
    assert.equal(Object.hasOwn(kept, "photo"), false);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await readWinPhoto(added.item.id), null);
  });

  it("says a sample was not saved when that sample cannot be stored", async () => {
    const storage = memoryStorage();
    setWinPhotoDatabaseFactory(putFailsFactory(indexedDB));
    const failed = await addWinPhoto("Sample missed", storage, morning, morning, winSampleBlob("sample-2"));
    assert.equal(failed.saved, true);
    assert.equal(failed.photoError, true);
    assert.equal(failed.photoSample, true);
    assert.equal(Object.hasOwn(failed.item, "photo"), false);
    assert.equal(winSaveStatusLabel(failed, true), WIN_SAMPLE_NOT_SAVED_LABEL);
    assert.match(WIN_SAMPLE_NOT_SAVED_LABEL, /Sample image not saved/);
    assert.doesNotMatch(WIN_SAMPLE_NOT_SAVED_LABEL, /Placeholder/);
    const placeholder = await addWinPhoto("Placeholder missed", storage, morning, later);
    assert.equal(placeholder.photoSample, false);
    assert.equal(winSaveStatusLabel(placeholder, true), WIN_PHOTO_NOT_SAVED_LABEL);
  });

  it("does not replace a stored image when the read fails", async () => {
    const storage = memoryStorage();
    const added = await addWinPhoto("Keep the good image", storage, morning, morning, winSampleBlob("sample-4"));
    setWinPhotoDatabaseFactory(readThrowsFactory(indexedDB));
    const failed = await changeWinImage(added.item.id, "sample-1", storage, morning, morning);
    assert.equal(failed.imageChanged, false);
    assert.equal(failed.kept, true);
    assert.equal(failed.reason, "read");
    const unread = await readWinPhotoRecord(added.item.id);
    assert.equal(unread.status, "error");
    assert.equal(unread.blob, null);
    setWinPhotoDatabaseFactory(indexedDB);
    assert.equal(await (await readWinPhoto(added.item.id)).text(), WIN_SAMPLE_4_SVG);
    const kept = loadWinsStore(storage).days["2026-09-20"][0];
    assert.equal(kept.text, "Keep the good image");
    assert.equal(kept.photo, WIN_PHOTO_REF);
  });
});

describe("past wins outline, focus, and status ids", () => {
  it("uses h4 under the group headings and h3 when there is no group", () => {
    assert.equal(pastWinDayHeading([{ future: false }, { future: false }]), "h3");
    assert.equal(pastWinDayHeading([{ future: true }, { future: false }]), "h4");
    assert.equal(pastWinDayHeading([]), "h3");
    const panel = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
    const wins = panel.slice(panel.indexOf("function mpWinsPanel("), panel.indexOf("function mpMaddyTeaser("));
    assert.match(wins, /`h3`,\{className:`mp-past-later`/);
    assert.match(wins, /`h3`,\{className:`mp-past-earlier`/);
    assert.match(wins, /mpWins\.pastWinDayHeading\(past\.days\)/);
    assert.match(wins, /\(dayHeading,/);
    assert.match(wins, /mpWins\.pastWinFocusMove\(active\)/);
    assert.match(wins, /focusWasInPast\.current=mpWins\.pastWinFocusMove\(active\)/);
    assert.match(wins, /id:mpWins\.winStatusId\(e\)/);
    assert.match(wins, /focusAfter\.current=`#\$\{mpWins\.winStatusId\(`winOfDay`\)\}`/);
    assert.doesNotMatch(wins, /id:`mp-win-status`/);
    assert.match(wins, /Sample image for /);
    assert.match(wins, /children:`Apply sample image`/);
    assert.match(wins, /disabled:!!\(add&&\(S\|\|lock\)\)/);
    assert.doesNotMatch(wins, /choice=>applyImage/);
    assert.match(wins, /releaseWinPhotoUrl\(cache\[w\.id\]\.url\);delete cache\[w\.id\]/);
    assert.match(wins, /async function d\(\)\{\s*if\(F\.current\)return;\s*if\(G\.current\)return;/);
    assert.match(wins, /async function drop\(id,key,pos,index\)\{\s*if\(F\.current\)return;\s*if\(dropGuard\.current\)return;/);
    assert.match(wins, /disabled:dropBusy\|\|S/);
    assert.doesNotMatch(wins, /type:`file`/);
    assert.doesNotMatch(wins, /capture=/);
    const photos = readFileSync(join(root, "../src/today/win-photos.js"), "utf8");
    assert.match(photos, /IndexedDB running[\s*]*write transactions on the same store in order/);
  });

  it("moves focus only from the confirm row or Past wins", () => {
    const row = { closest: (sel) => (sel === ".mp-past-remove-row" ? {} : null) };
    const past = { closest: (sel) => (sel === ".mp-past-wins" ? {} : null) };
    const input = { closest: () => null };
    assert.equal(pastWinFocusMove(row), true);
    assert.equal(pastWinFocusMove(past), true);
    assert.equal(pastWinFocusMove(input), false);
    assert.equal(pastWinFocusMove(null), false);
    assert.equal(pastWinFocusMove({}), false);
  });

  it("gives each wins panel its own status id", () => {
    assert.equal(winStatusId("winOfDay"), "mp-win-status-winOfDay");
    assert.equal(winStatusId("growth"), "mp-win-status-growth");
    assert.equal(winStatusId("evening"), "mp-win-status-evening");
    assert.notEqual(winStatusId("winOfDay"), winStatusId("growth"));
    assert.equal(winStatusId(""), "mp-win-status-win");
    assert.equal(winStatusId("win Of"), "mp-win-status-win");
  });

  it("keeps confirm open for another day and clears it on the same day", () => {
    const hold = { id: "picked", key: "2026-10-23", pos: 1 };
    const otherDayGone = [{ key: "2026-10-23", items: [{ id: "early" }, { id: "picked" }] }];
    assert.equal(pastWinHoldAfterRefresh(otherDayGone, hold).keep, true);
    const sameDay = [
      { key: "2026-10-24", items: [{ id: "other" }] },
      { key: "2026-10-23", items: [{ id: "picked" }] },
    ];
    const moved = pastWinHoldAfterRefresh(sameDay, hold);
    assert.equal(moved.keep, false);
    assert.equal(moved.focus.id, "picked");
    assert.equal(moved.focus.pos, 0);
    assert.notEqual(sameDay[1].items[0].id, "early");
  });
});
