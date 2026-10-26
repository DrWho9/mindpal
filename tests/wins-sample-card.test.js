import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PAST_WINS_EARLIER,
  PAST_WINS_LATER,
  PAST_WINS_TITLE,
  WIN_IMAGE_NOT_CHANGED_LABEL,
  WIN_IMAGE_REMOVED_LABEL,
  WIN_IMAGE_UPDATED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_PROTOTYPE_LABEL,
  WIN_SAMPLE_ON_DEVICE_LABEL,
  WIN_SAVED_LABEL,
} from "../src/today/wins.js";
import { WIN_SAMPLE_1_SVG, WIN_SAMPLE_2_SVG, WIN_SAMPLE_4_SVG } from "../src/today/win-photos.js";
import { startMindpalServer } from "../scripts/smoke-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const chromePath = process.env.MINDPAL_CHROME || "/usr/local/bin/google-chrome";
const shots = "/opt/cursor/artifacts";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  chromium = null;
}

function cardSkipReason() {
  if (!chromium) {
    return "Skipped: playwright-core is not installed, so the sample image card was not opened in a browser. npm run build runs this check when Playwright and Chrome are available.";
  }
  if (!existsSync(chromePath)) {
    if (process.env.MINDPAL_CHROME) {
      return `Skipped: MINDPAL_CHROME does not point at a Chrome binary (${chromePath}). npm test still passes. npm run build runs this card check when that path exists.`;
    }
    return `Skipped: MINDPAL_CHROME is unset and Chrome was not found at ${chromePath}. npm test still passes. npm run build runs this card check when Chrome is available.`;
  }
  return false;
}

const skipCard = cardSkipReason();

describe("sample image picker card", { timeout: 180000 }, () => {
  let host;
  let browser;
  let context;
  let page;
  let other;

  before(async () => {
    if (skipCard) return;
    mkdirSync(shots, { recursive: true });
    host = await startMindpalServer(root);
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
    });
    await context.addInitScript(() => {
      globalThis.MINDPAL_PHOTO_TEST = true;
    });
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    await signInLocal(page, host.origin);
    await page.evaluate(() => {
      globalThis.__mpRevoked = [];
      const orig = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url) => {
        globalThis.__mpRevoked.push(String(url));
        return orig(url);
      };
    });
    other = await context.newPage();
    other.setDefaultTimeout(20000);
    await other.goto(`${host.origin}#Today`, { waitUntil: "domcontentloaded" });
    const otherWin = other.locator("#mp-win-winOfDay");
    try {
      await otherWin.waitFor({ state: "visible", timeout: 8000 });
    } catch {
      await signInLocal(other, host.origin);
    }
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("offers the bundled samples from the keyboard, with the placeholder selected", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    const add = winCard.locator(".mp-win-sample-add");
    await add.waitFor({ state: "visible" });
    assert.equal(await page.locator("input[type='file']").count(), 0);
    assert.equal((await add.locator("legend").innerText()).trim(), "Sample image");
    const names = await add.locator("label span").allInnerTexts();
    assert.deepEqual(names.map((name) => name.trim()), [
      "Placeholder image",
      "Sample image 1: green squares",
      "Sample image 2: blue circles",
      "Sample image 3: amber triangles",
      "Sample image 4: teal bars",
      "No image",
    ]);
    assert.equal(await add.getByRole("radio", { name: "Placeholder image" }).isChecked(), true);
    assert.equal(await add.getByRole("radio", { name: "No image" }).isChecked(), false);
    await winCard.getByText(WIN_PHOTO_PROTOTYPE_LABEL).waitFor({ state: "visible" });
    await winCard.getByText("Choose a sample image or no image. This is a prototype on this device only.").waitFor({ state: "visible" });
    await add.getByRole("radio", { name: "Placeholder image" }).focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await add.getByRole("radio", { name: "Sample image 1: green squares" }).isChecked(), true);
    await add.getByRole("radio", { name: "Placeholder image" }).check();
    assert.equal(await add.getByRole("radio", { name: "Placeholder image" }).isChecked(), true);
    await shotViewport(page, "win-sample-picker", 1280, 900, ".mp-win-sample-add");

    await other.goto(`${host.origin}#Evening`, { waitUntil: "domcontentloaded" });
    await other.locator("#mp-win-evening").waitFor({ state: "visible" });
    assert.equal(await other.locator(".mp-win-samples").count(), 0);
    await other.goto(`${host.origin}#My%20diary`, { waitUntil: "domcontentloaded" });
    const journalWin = other.locator("#mp-win-journal");
    try {
      await journalWin.waitFor({ state: "visible", timeout: 8000 });
    } catch {
      await signInLocal(other, host.origin);
      await other.goto(`${host.origin}#My%20diary`, { waitUntil: "domcontentloaded" });
      await journalWin.waitFor({ state: "visible" });
    }
    assert.equal(await other.locator(".mp-win-samples").count(), 0);
    await other.goto(`${host.origin}#Today`, { waitUntil: "domcontentloaded" });
    await other.locator("#mp-win-winOfDay").waitFor({ state: "visible" });
  });

  it("saves a chosen sample, then changes and removes it on today", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    const add = winCard.locator(".mp-win-sample-add");
    await add.getByRole("radio", { name: "Sample image 2: blue circles" }).check();
    await winCard.locator("#mp-win-winOfDay").fill("Blue circles today");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_SAVED_LABEL,
    );
    const row = winCard.locator(".mp-wins-list li", { hasText: "Blue circles today" });
    await row.getByText(WIN_SAMPLE_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    assert.match(await row.locator("figure.mp-win-photo img").getAttribute("src"), /^blob:/);
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(stored.days).flat().find((item) => item.text === "Blue circles today");
    assert.equal(win.photo, "idb");
    assert.equal(JSON.stringify(stored).includes("<svg"), false);
    const blobText = await readBlob(page, win.id);
    assert.equal(blobText, WIN_SAMPLE_2_SVG);
    await other.locator(".mp-win-of-day").getByText("Blue circles today", { exact: true }).waitFor({ state: "visible" });
    await other.locator(".mp-win-of-day").getByText(WIN_SAMPLE_ON_DEVICE_LABEL).waitFor({ state: "visible" });

    const beforeRevoke = await page.evaluate(() => globalThis.__mpRevoked.length);
    assert.match((await row.locator("legend").innerText()).trim(), /Sample image for Blue circles today, today/);
    await row.getByRole("radio", { name: "Sample image 4: teal bars" }).click();
    await row.getByRole("button", { name: /^Apply sample image/ }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_IMAGE_UPDATED_LABEL,
    );
    assert.equal(await row.getByRole("radio", { name: "Sample image 4: teal bars" }).isChecked(), true);
    assert.equal(await readBlob(page, win.id), WIN_SAMPLE_4_SVG);
    assert.equal((await row.locator(".mp-past-win-text, span").first().innerText()).includes("Blue circles today"), true);
    const afterRevoke = await page.evaluate(() => globalThis.__mpRevoked.length);
    assert.equal(afterRevoke > beforeRevoke, true);

    await row.getByRole("radio", { name: "No image" }).click();
    await row.getByRole("button", { name: /^Apply sample image/ }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_IMAGE_REMOVED_LABEL,
    );
    assert.equal(await row.locator("figure").count(), 0);
    assert.equal(await readBlob(page, win.id), null);
    const kept = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const still = Object.values(kept.days).flat().find((item) => item.id === win.id);
    assert.equal(still.text, "Blue circles today");
    assert.equal(Object.hasOwn(still, "photo"), false);
    await add.getByRole("radio", { name: "Placeholder image" }).check();
  });

  it("changes a sample on a past win and shows it at phone width", { skip: skipCard }, async () => {
    await page.evaluate(async () => {
      const day = new Date();
      day.setDate(day.getDate() - 1);
      day.setHours(9, 15, 0, 0);
      const added = await mpWins.addWinPhoto("Yesterday sample", undefined, day, day);
      globalThis.__yesterdaySampleId = added.item && added.item.id;
      window.dispatchEvent(new Event(mpWins.WINS_CHANGE_EVENT));
    });
    const past = page.locator(".mp-win-of-day .mp-past-wins");
    await past.locator("summary").click();
    const row = past.locator("li", { hasText: "Yesterday sample" });
    await row.getByText(WIN_PHOTO_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    assert.equal(await row.locator("h3, h4").count(), 0);
    const dayHeading = past.locator("[data-mp-win-day] h3");
    assert.equal(await dayHeading.count() > 0, true);
    assert.equal(await past.locator("h3.mp-past-later").count(), 0);

    const pastLegend = (await row.locator("legend").innerText()).trim();
    const pastHeading = (await row.locator("xpath=ancestor::*[@data-mp-win-day][1]").locator("h3, h4").first().innerText()).trim();
    assert.match(pastLegend, /Sample image for Yesterday sample,/);
    assert.equal(pastLegend.includes(pastHeading), true);
    await row.getByRole("radio", { name: "Sample image 1: green squares" }).click();
    await row.getByRole("button", { name: /^Apply sample image/ }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_IMAGE_UPDATED_LABEL,
    );
    await row.getByText(WIN_SAMPLE_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    const yesterdayId = await page.evaluate(() => globalThis.__yesterdaySampleId);
    assert.equal(await readBlob(page, yesterdayId), WIN_SAMPLE_1_SVG);
    await shotViewport(page, "win-sample-past", 1280, 900, ".mp-past-wins");
    await shotViewport(page, "win-sample-phone", 390, 844, ".mp-past-wins");
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() + 1);
      day.setHours(9, 15, 0, 0);
      mpWins.addWin("A later date", undefined, day, day);
      window.dispatchEvent(new Event(mpWins.WINS_CHANGE_EVENT));
    });
    await past.getByRole("heading", { name: PAST_WINS_LATER, level: 3 }).waitFor({ state: "visible" });
    await past.getByRole("heading", { name: PAST_WINS_EARLIER, level: 3 }).waitFor({ state: "visible" });
    assert.equal(await past.locator("[data-mp-win-day] h4").count() > 0, true);
    assert.equal(await past.locator("[data-mp-win-day] h3").count(), 0);
    assert.equal(await past.locator("summary").innerText(), PAST_WINS_TITLE);
  });

  it("keeps the win text when a sample change cannot be stored", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-winOfDay").fill("Keep these words");
    await winCard.locator(".mp-win-sample-add").getByRole("radio", { name: "Placeholder image" }).check();
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_SAVED_LABEL,
    );
    const row = winCard.locator(".mp-wins-list li", { hasText: "Keep these words" });
    await row.getByText(WIN_PHOTO_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    const before = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(before.days).flat().find((item) => item.text === "Keep these words");
    const original = await readBlob(page, win.id);
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      globalThis.__mpPut = put;
      IDBObjectStore.prototype.put = function putGuarded(value, key) {
        if (this.transaction && this.transaction.db && this.transaction.db.name === "mindpal-photos") {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        return put.call(this, value, key);
      };
    });
    try {
      await row.getByRole("radio", { name: "Sample image 3: amber triangles" }).click();
      assert.equal(await row.locator("fieldset").isDisabled(), false);
      await row.getByRole("button", { name: /^Apply sample image/ }).click();
      await page.waitForFunction(
        (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
        WIN_IMAGE_NOT_CHANGED_LABEL,
      );
      assert.equal((await row.innerText()).includes("Keep these words"), true);
      assert.equal(await row.locator("fieldset").isDisabled(), false);
      assert.equal(await row.getByRole("radio", { name: "Sample image 3: amber triangles" }).isChecked(), true);
      assert.equal(await readBlob(page, win.id), original);
      const after = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
      const kept = Object.values(after.days).flat().find((item) => item.id === win.id);
      assert.equal(kept.text, "Keep these words");
      assert.equal(kept.photo, "idb");
    } finally {
      await page.evaluate(() => {
        if (globalThis.__mpPut) IDBObjectStore.prototype.put = globalThis.__mpPut;
        delete globalThis.__mpPut;
      });
    }
  });

  it("arrow keys on a saved win do not write until Apply", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-winOfDay").fill("Arrow today");
    await winCard.locator(".mp-win-sample-add").getByRole("radio", { name: "Placeholder image" }).check();
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_SAVED_LABEL,
    );
    const row = winCard.locator(".mp-wins-list li", { hasText: "Arrow today" });
    await row.getByText(WIN_PHOTO_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(stored.days).flat().find((item) => item.text === "Arrow today");
    const before = await readBlob(page, win.id);
    const group = row.locator("fieldset");
    assert.equal(await group.isDisabled(), false);
    await row.getByRole("radio", { name: "Placeholder image" }).focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await row.getByRole("radio", { name: "Sample image 1: green squares" }).isChecked(), true);
    await page.keyboard.press("ArrowDown");
    assert.equal(await row.getByRole("radio", { name: "Sample image 2: blue circles" }).isChecked(), true);
    assert.equal(await group.isDisabled(), false);
    assert.equal(await readBlob(page, win.id), before);
    assert.equal(await page.locator(".mp-win-of-day p[role='status']").textContent(), WIN_SAVED_LABEL);
    await row.getByRole("button", { name: /^Apply sample image/ }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_IMAGE_UPDATED_LABEL,
    );
    assert.equal(await readBlob(page, win.id), WIN_SAMPLE_2_SVG);

    await page.evaluate(async () => {
      const day = new Date();
      day.setDate(day.getDate() - 3);
      day.setHours(9, 15, 0, 0);
      const added = await mpWins.addWinPhoto("Arrow past", undefined, day, day);
      globalThis.__arrowPastId = added.item && added.item.id;
      window.dispatchEvent(new Event(mpWins.WINS_CHANGE_EVENT));
    });
    const past = page.locator(".mp-win-of-day .mp-past-wins");
    if (!(await past.evaluate((node) => node.open))) await past.locator("summary").click();
    const pastRow = past.locator("li", { hasText: "Arrow past" });
    await pastRow.getByText(WIN_PHOTO_ON_DEVICE_LABEL).waitFor({ state: "visible" });
    const pastLegend = (await pastRow.locator("legend").innerText()).trim();
    const pastHeading = (await pastRow.locator("xpath=ancestor::*[@data-mp-win-day][1]").locator("h3, h4").first().innerText()).trim();
    assert.match(pastLegend, /Sample image for Arrow past,/);
    assert.equal(pastLegend.includes(pastHeading), true);
    assert.equal(pastLegend.includes(", today"), false);
    const pastId = await page.evaluate(() => globalThis.__arrowPastId);
    const pastBefore = await readBlob(page, pastId);
    const pastGroup = pastRow.locator("fieldset");
    assert.equal(await pastGroup.isDisabled(), false);
    await pastRow.getByRole("radio", { name: "Placeholder image" }).focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await pastRow.getByRole("radio", { name: "Sample image 1: green squares" }).isChecked(), true);
    const statusBefore = await page.locator(".mp-win-of-day p[role='status']").textContent();
    await page.keyboard.press("ArrowDown");
    assert.equal(await pastRow.getByRole("radio", { name: "Sample image 2: blue circles" }).isChecked(), true);
    assert.equal(await pastGroup.isDisabled(), false);
    assert.equal(await readBlob(page, pastId), pastBefore);
    assert.equal(await page.locator(".mp-win-of-day p[role='status']").textContent(), statusBefore);
  });

  it("leaves Confirm in place for another day and moves focus only from Past wins", { skip: skipCard }, async () => {
    await page.evaluate(() => {
      const at = (offset, minute) => {
        const day = new Date();
        day.setDate(day.getDate() - offset);
        day.setHours(9, minute, 0, 0);
        return day;
      };
      const yesterday = at(1, 10);
      const later = at(1, 20);
      const after = at(1, 30);
      const other = at(2, 10);
      mpWins.addWin("Earlier on that day", undefined, yesterday, yesterday, undefined, "win-early-slot");
      mpWins.addWin("Picked win", undefined, later, later, undefined, "win-picked-slot");
      mpWins.addWin("Later on that day", undefined, after, after, undefined, "win-later-slot");
      mpWins.addWin("Other day win", undefined, other, other, undefined, "win-other-slot");
      window.dispatchEvent(new Event(mpWins.WINS_CHANGE_EVENT));
    });
    const listed = await page.evaluate(() => mpWins.pastWinsPage(mpWins.readWinsStore()).days.map((day) => ({
      key: day.key,
      texts: day.items.map((item) => item.text),
    })));
    assert.equal(JSON.stringify(listed).includes("Picked win"), true, JSON.stringify(listed));
    const past = page.locator(".mp-win-of-day .mp-past-wins");
    if (!(await past.evaluate((node) => node.open))) await past.locator("summary").click();
    const picked = past.locator("li", { hasText: "Picked win" });
    await picked.getByRole("button", { name: /^Remove win/ }).click();
    const confirm = picked.getByRole("button", { name: /^Confirm remove/ });
    await confirm.waitFor({ state: "visible" });

    await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() - 1);
      mpWins.removeWin("win-later-slot", undefined, day);
      window.dispatchEvent(new StorageEvent("storage", { key: mpWins.WINS_STORAGE_KEY }));
    });
    await page.waitForFunction(() => !document.body.innerText.includes("Later on that day"));
    assert.equal(await confirm.count(), 1);

    await page.locator("#mp-win-winOfDay").focus();
    await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() - 2);
      mpWins.removeWin("win-other-slot", undefined, day);
      window.dispatchEvent(new StorageEvent("storage", { key: mpWins.WINS_STORAGE_KEY }));
    });
    await page.waitForFunction(() => !document.body.innerText.includes("Other day win"));
    assert.equal(await confirm.count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), "mp-win-winOfDay");

    await confirm.focus();
    await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() - 1);
      mpWins.removeWin("win-early-slot", undefined, day);
      window.dispatchEvent(new StorageEvent("storage", { key: mpWins.WINS_STORAGE_KEY }));
    });
    await page.waitForFunction(() => !document.body.innerText.includes("Earlier on that day"));
    await page.waitForFunction(() => document.querySelector(".mp-past-remove-row") === null);
    await page.waitForFunction(() => {
      const node = document.activeElement;
      const label = node && node.getAttribute ? node.getAttribute("aria-label") || "" : "";
      return /Picked win/.test(label);
    });
    const focused = await page.evaluate(() => {
      const node = document.activeElement;
      const row = node && node.closest ? node.closest("li") : null;
      return {
        label: node && node.getAttribute ? node.getAttribute("aria-label") || "" : "",
        text: row ? row.innerText : "",
      };
    });
    assert.match(focused.label, /Picked win/);
    assert.match(focused.text, /Picked win/);
    assert.doesNotMatch(focused.label, /Earlier on that day/);
  });

  it("gives Today two status ids when the growth win step is open", { skip: skipCard }, async () => {
    await page.evaluate(() => {
      const day = new Date();
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      localStorage.setItem("mindpal.individualGrowth.v1", JSON.stringify({
        version: 1,
        date: key,
        settle: "skipped",
        verse: "skipped",
        reading: "skipped",
        win: "todo",
        readingId: null,
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#mp-win-winOfDay").waitFor({ state: "visible" });
    await page.locator(".mp-wins-growth").waitFor({ state: "visible" });
    await page.locator(".mp-win-of-day").getByRole("button", { name: "Save this win" }).click();
    await page.locator(".mp-wins-growth").getByRole("button", { name: "Save this win" }).click();
    await page.locator("#mp-win-status-winOfDay").waitFor({ state: "visible" });
    await page.locator("#mp-win-status-growth").waitFor({ state: "visible" });
    const ids = await page.evaluate(() => [...document.querySelectorAll("[id^='mp-win-status']")].map((node) => node.id).sort());
    assert.deepEqual(ids, ["mp-win-status-growth", "mp-win-status-winOfDay"]);
    assert.equal(await page.locator("#mp-win-status").count(), 0);
    assert.equal(await page.locator(".mp-wins-growth .mp-win-samples").count(), 0);
  });
});

async function readBlob(page, id) {
  return page.evaluate(async (winId) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("mindpal-photos", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction("winPhotos", "readonly");
      const request = tx.objectStore("winPhotos").get(winId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!value) return null;
    const blob = value.blob ? value.blob : value;
    return blob && typeof blob.text === "function" ? blob.text() : null;
  }, id);
}

async function shotViewport(page, name, width, height, selector) {
  await page.setViewportSize({ width, height });
  await page.locator(selector).first().evaluate((node) => node.scrollIntoView({ block: "center", inline: "nearest" }));
  const client = await page.context().newCDPSession(page);
  try {
    const frame = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`screenshot timed out for ${name}`)), 8000);
      client.on("Page.screencastFrame", (event) => {
        clearTimeout(timer);
        resolve(event);
      });
    });
    await client.send("Page.startScreencast", {
      format: "png",
      quality: 100,
      maxWidth: width,
      maxHeight: height,
      everyNthFrame: 1,
    });
    const event = await frame;
    await client.send("Page.screencastFrameAck", { sessionId: event.sessionId });
    await client.send("Page.stopScreencast");
    writeFileSync(`${shots}/${name}.png`, Buffer.from(event.data, "base64"));
  } finally {
    await client.detach();
  }
}

async function signInLocal(page, origin) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await signInOnce(page, origin);
      await page.locator("#mp-win-winOfDay").waitFor({ state: "visible", timeout: 15000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function signInOnce(page, origin) {
  await page.goto(`${origin}#Today`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForURL(/[?&]cb=/, { timeout: 8000 });
    await page.waitForLoadState("domcontentloaded");
  } catch {
    /* the shell did not reload */
  }
  const adult = page.getByRole("button", { name: /Continue · adult preview/i });
  try {
    await adult.waitFor({ state: "visible", timeout: 8000 });
    await adult.click();
  } catch {
    /* already in the adult shell */
  }
  const user = `qa${Date.now().toString(36)}`;
  const signIn = page.getByRole("heading", { name: "Sign in to begin" });
  try {
    await signIn.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return;
  }
  await page.locator("#mp-signin-name").fill("QA");
  await page.locator("#mp-signin-user").fill(user);
  await page.locator("#mp-signin-pass").fill("smoke-test-1");
  await page.getByRole("button", { name: "Create local profile" }).click();
  await page.getByRole("button", { name: /No religion \/ prefer secular/i }).click();
  await page.getByRole("button", { name: /Continue with a secular space/i }).click({ force: true });
  await page.getByRole("button", { name: "40–49", exact: true }).click({ force: true });
  await page.getByRole("button", { name: "Man", exact: true }).click({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click({ force: true });
  await page.waitForFunction(() => !document.body.innerText.includes("Sign in to begin"));
}
