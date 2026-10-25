import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_NOT_SAVED_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_REF,
  WIN_PHOTO_UNAVAILABLE_LABEL,
  WIN_SAVED_LABEL,
} from "../src/today/wins.js";
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
    return "Skipped: playwright-core is not installed, so the photo card was not opened in a browser. npm run build runs this check when Playwright and Chrome are available.";
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

describe("win photo card in Chrome", { timeout: 180000 }, () => {
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
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    await signInLocal(page, host.origin);
    other = await context.newPage();
    other.setDefaultTimeout(20000);
    await other.goto(`${host.origin}#Evening`, { waitUntil: "domcontentloaded" });
    const eveningWin = other.locator("#mp-win-evening");
    try {
      await eveningWin.waitFor({ state: "visible", timeout: 8000 });
    } catch {
      await signInLocal(other, host.origin);
      await other.goto(`${host.origin}#Evening`, { waitUntil: "domcontentloaded" });
      await eveningWin.waitFor({ state: "visible" });
    }
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("stores the placeholder blob and the other tab reads it without a reload", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-photo-winOfDay").check();
    await winCard.locator("#mp-win-winOfDay").fill("Saw the placeholder");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await winCard.locator("p[role='status']").waitFor({ state: "visible" });
    assert.equal((await winCard.locator("p[role='status']").innerText()).trim(), WIN_SAVED_LABEL);
    const figure = winCard.locator(".mp-win-photo");
    await figure.waitFor({ state: "visible" });
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day .mp-win-photo figcaption")?.textContent === label,
      WIN_PHOTO_ON_DEVICE_LABEL,
    );
    const src = await figure.locator("img").getAttribute("src");
    assert.match(src, /^blob:/);
    await shot(page, "win-photo-saved");

    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(stored.days).flat().find((item) => item.text === "Saw the placeholder");
    assert.equal(win.photo, WIN_PHOTO_REF);
    assert.equal(JSON.stringify(stored).includes("<svg"), false);
    const blobText = await page.evaluate(async (id) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("mindpal-photos", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction("winPhotos", "readonly");
        const request = tx.objectStore("winPhotos").get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const text = value ? await value.text() : "";
      db.close();
      return text;
    }, win.id);
    assert.match(blobText, /PLACEHOLDER/);
    assert.doesNotMatch(blobText, /<image\b/i);

    const evening = other.locator(".mp-wins-evening");
    await evening.getByText("Saw the placeholder").waitFor({ state: "visible" });
    assert.equal(await evening.locator(".mp-win-photo").count(), 0);
    await shot(other, "win-photo-other-tab", ".mp-wins-evening");

    await page.evaluate(async (id) => {
      const result = mpWins.removeWin(id);
      if (result.photoCleanup) await result.photoCleanup;
    }, win.id);
    await evening.getByText("Saw the placeholder").waitFor({ state: "hidden" });
    const left = await page.evaluate(async (id) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("mindpal-photos", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const value = await new Promise((resolve, reject) => {
        const tx = db.transaction("winPhotos", "readonly");
        const request = tx.objectStore("winPhotos").get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return value;
    }, win.id);
    assert.equal(left, null);
  });

  it("shows the placeholder when the photo reference has no blob", { skip: skipCard }, async () => {
    await page.evaluate(() => {
      mpWins.addWin("Missing photo", undefined, undefined, undefined, mpWins.WIN_PHOTO_REF, "win-missing-photo");
      window.dispatchEvent(new StorageEvent("storage", { key: "mindpal.dailyWins.v2" }));
    });
    const figure = page.locator(".mp-win-of-day .mp-win-photo", { hasText: WIN_PHOTO_MISSING_LABEL });
    await figure.waitFor({ state: "visible" });
    assert.match(await figure.locator("img").getAttribute("src"), /win-placeholder\.svg$/);
    await shot(page, "win-photo-missing");
  });

  it("uses the placeholder path when IndexedDB cannot be opened", { skip: skipCard }, async () => {
    await page.evaluate(async () => {
      mpWins.setWinPhotoDatabaseFactory(null);
      if (mpWins.resetWinPhotoDatabase) await mpWins.resetWinPhotoDatabase();
    });
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-photo-winOfDay").check();
    await winCard.locator("#mp-win-winOfDay").fill("No photo database");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_PHOTO_UNAVAILABLE_LABEL,
    );
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(stored.days).flat().find((item) => item.text === "No photo database");
    assert.equal(win.photo, "/mindpal/win-placeholder.svg");
    await shot(page, "win-photo-unavailable");
  });

  it("keeps the text win when the photo put fails", { skip: skipCard }, async () => {
    await page.evaluate(async () => {
      mpWins.setWinPhotoDatabaseFactory(undefined);
      if (mpWins.resetWinPhotoDatabase) await mpWins.resetWinPhotoDatabase();
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function putGuarded(value, key) {
        if (this.transaction && this.transaction.db && this.transaction.db.name === "mindpal-photos") {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        return put.call(this, value, key);
      };
    });
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-photo-winOfDay").check();
    await winCard.locator("#mp-win-winOfDay").fill("Text without a photo");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await page.waitForFunction(
      (label) => document.querySelector(".mp-win-of-day p[role='status']")?.textContent === label,
      WIN_PHOTO_NOT_SAVED_LABEL,
    );
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")));
    const win = Object.values(stored.days).flat().find((item) => item.text === "Text without a photo");
    assert.ok(win);
    assert.equal(Object.hasOwn(win, "photo"), false);
    await shot(page, "win-photo-not-saved");
  });
});

async function shot(page, name, selector = ".mp-win-of-day") {
  try {
    await page.locator(selector).first().screenshot({
      path: `${shots}/${name}.png`,
      animations: "disabled",
      timeout: 3000,
    });
  } catch {
    /* assertions already checked the card */
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
