import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PAST_WINS_EMPTY,
  PAST_WINS_SHOW_MORE,
  PAST_WINS_TITLE,
  WIN_PHOTO_CHECKING_LABEL,
  WIN_PHOTO_MISSING_LABEL,
  WIN_PHOTO_ON_DEVICE_LABEL,
  WIN_PHOTO_PROTOTYPE_LABEL,
  WIN_RESET_CONFIRM,
  WIN_RESET_DONE,
  WIN_RESET_LABEL,
  WIN_RESET_NOTE,
  WIN_UNKNOWN_TIME_LABEL,
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
    return "Skipped: playwright-core is not installed, so the past wins card was not opened in a browser. npm run build runs this check when Playwright and Chrome are available.";
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

describe("past wins timeline card", { timeout: 180000 }, () => {
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

  it("lists earlier wins on this device, caps the days, and removes one", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    const past = winCard.locator(".mp-past-wins");
    await past.locator("summary").click();
    await past.locator(".mp-past-empty").waitFor({ state: "visible" });
    assert.equal((await past.locator(".mp-past-empty").innerText()).trim(), PAST_WINS_EMPTY);
    assert.equal(await past.locator("[data-mp-win-day]").count(), 0);
    await shot(page, "win-past-empty");

    await page.evaluate(async () => {
      const today = new Date();
      const atOffset = (offset, hour = 9) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, hour, 15, 0);
      const keyOf = (day) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const yesterday = atOffset(1);
      const added = await mpWins.addWinPhoto("Synthetic win yesterday", undefined, yesterday, yesterday);
      globalThis.__yesterdayId = added.item && added.item.id;
      const bundled = atOffset(2);
      mpWins.addWin("Bundled placeholder win", undefined, bundled, bundled, mpWins.WIN_PLACEHOLDER_PHOTO, "win-bundled-past");
      const missing = atOffset(3);
      mpWins.addWin("Missing placeholder win", undefined, missing, missing, mpWins.WIN_PHOTO_REF, "win-missing-past");
      const quiet = atOffset(4);
      mpWins.addWin("Time not recorded win", undefined, quiet, quiet, mpWins.WIN_PLACEHOLDER_PHOTO, "win-notime-past");
      const store = mpWins.loadWinsStore();
      const row = store.days[keyOf(quiet)].find((item) => item.id === "win-notime-past");
      row.at = mpWins.WIN_UNKNOWN_TIME;
      mpWins.saveWinsStore(store);
      for (let offset = 5; offset <= 8; offset += 1) {
        const day = atOffset(offset);
        mpWins.addWin(`Synthetic win day ${offset}`, undefined, day, day);
      }
      window.dispatchEvent(new Event(mpWins.WINS_CHANGE_EVENT));
    });

    await past.getByText("Synthetic win yesterday").waitFor({ state: "visible" });
    await page.waitForFunction(
      (label) => [...document.querySelectorAll(".mp-past-wins figcaption")].some((node) => node.textContent === label),
      WIN_PHOTO_ON_DEVICE_LABEL,
    );
    assert.equal(await past.locator("[data-mp-win-day]").count(), 7);
    const firstKey = await past.locator("[data-mp-win-day]").first().getAttribute("data-mp-win-day");
    const yesterdayKey = await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() - 1);
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    });
    assert.equal(firstKey, yesterdayKey);
    assert.equal(await past.getByRole("button", { name: PAST_WINS_SHOW_MORE }).count(), 1);
    await past.getByText(WIN_PHOTO_PROTOTYPE_LABEL).first().waitFor({ state: "visible" });
    await past.getByText(WIN_PHOTO_MISSING_LABEL).waitFor({ state: "visible" });
    await past.getByText(WIN_UNKNOWN_TIME_LABEL, { exact: true }).waitFor({ state: "visible" });
    const yesterdayFigure = past.locator("li", { hasText: "Synthetic win yesterday" }).locator("img");
    assert.match(await yesterdayFigure.getAttribute("src"), /^blob:/);

    await past.getByRole("button", { name: PAST_WINS_SHOW_MORE }).click();
    await past.getByText("Synthetic win day 8").waitFor({ state: "visible" });
    assert.equal(await past.locator("[data-mp-win-day]").count(), 8);
    assert.equal(await past.getByRole("button", { name: PAST_WINS_SHOW_MORE }).count(), 0);
    await page.waitForFunction(
      (labels) => {
        const caps = [...document.querySelectorAll(".mp-past-wins figcaption")].map((node) => node.textContent);
        return caps.includes(labels.onDevice) && !caps.includes(labels.checking);
      },
      { onDevice: WIN_PHOTO_ON_DEVICE_LABEL, checking: WIN_PHOTO_CHECKING_LABEL },
    );
    await shotViewport(page, "win-past-timeline", 1280, 900, ".mp-past-wins");
    await shotViewport(page, "win-past-phone", 390, 844, ".mp-past-wins");
    await page.setViewportSize({ width: 1280, height: 900 });

    const otherPast = other.locator(".mp-win-of-day .mp-past-wins");
    await otherPast.locator("summary").click();
    await otherPast.getByText("Synthetic win yesterday").waitFor({ state: "visible" });

    const yesterdayId = await page.evaluate(() => globalThis.__yesterdayId);
    const names = await page.evaluate(() => {
      const atOffset = (offset) => {
        const day = new Date();
        day.setDate(day.getDate() - offset);
        day.setHours(9, 15, 0, 0);
        return day;
      };
      const keyOf = (day) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const named = (text, offset) => {
        const day = atOffset(offset);
        const label = mpWins.formatWinDayLabel(keyOf(day));
        const time = mpWins.pastWinTimeLabel(day.toISOString());
        return {
          remove: mpWins.pastWinRemoveLabel(text, label, time),
          confirm: mpWins.pastWinConfirmLabel(text, label, time),
          keep: mpWins.pastWinKeepLabel(text, label, time),
        };
      };
      return { yesterday: named("Synthetic win yesterday", 1), bundled: named("Bundled placeholder win", 2) };
    });
    const yesterdayName = names.yesterday.remove;
    const yesterdayRow = past.locator("li", { hasText: "Synthetic win yesterday" });
    await yesterdayRow.getByRole("button", { name: yesterdayName, exact: true }).click();
    await page.waitForFunction(
      (label) => document.activeElement && document.activeElement.getAttribute("aria-label") === label,
      names.yesterday.confirm,
    );
    await yesterdayRow.getByRole("button", { name: names.yesterday.keep, exact: true }).click();
    await page.waitForFunction(
      (label) => document.activeElement && document.activeElement.getAttribute("aria-label") === label,
      yesterdayName,
    );
    assert.equal(await yesterdayRow.count(), 1);
    await yesterdayRow.getByRole("button", { name: yesterdayName, exact: true }).click();
    await yesterdayRow.getByRole("button", { name: names.yesterday.confirm, exact: true }).click();
    await past.getByText("Synthetic win yesterday").waitFor({ state: "hidden" });
    await page.waitForFunction(
      (label) => document.activeElement && document.activeElement.getAttribute("aria-label") === label,
      names.bundled.remove,
    );
    await past.getByText("Bundled placeholder win").waitFor({ state: "visible" });
    await otherPast.getByText("Synthetic win yesterday").waitFor({ state: "hidden" });
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
    }, yesterdayId);
    assert.equal(left, null);
    const urls = await page.evaluate(() => ({
      revoked: globalThis.__mpRevoked.slice(),
      live: [...document.querySelectorAll(".mp-win-photo img")].map((img) => img.getAttribute("src")),
    }));
    assert.ok(urls.revoked.length > 0);
    for (const src of urls.live) {
      if (src && src.startsWith("blob:")) assert.equal(urls.revoked.includes(src), false);
    }
    assert.equal(await past.locator("summary").innerText(), PAST_WINS_TITLE);
  });

  it("disables reset while cleanup is still running", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    await page.evaluate(() => {
      localStorage.setItem("mindpal.dailyWins.v2", "corrupt-timeline");
      localStorage.setItem("mindpal.dailyWins.v2.backup.11", "copy-a");
      localStorage.setItem("mindpal.dailyWins.v2.backup.22", "copy-b");
      localStorage.setItem("mindpal.dailyWins.v2.backup.33", "copy-c");
      const real = mpWins.resetBlockedWins.bind(mpWins);
      mpWins.resetBlockedWins = () => {
        const result = real();
        const cleanup = result.photoCleanup;
        if (result && result.cleared && cleanup) {
          result.photoCleanup = new Promise((resolve) => {
            globalThis.__releaseReset = () => Promise.resolve(cleanup).then(resolve, () => resolve({ failed: true }));
          });
        }
        return result;
      };
      window.dispatchEvent(new StorageEvent("storage", { key: "mindpal.dailyWins.v2" }));
    });
    const reset = winCard.getByRole("button", { name: WIN_RESET_LABEL });
    await reset.scrollIntoViewIfNeeded();
    await reset.waitFor({ state: "visible" });
    const note = (await winCard.locator(".mp-win-reset-note").innerText()).trim();
    assert.equal(note, WIN_RESET_NOTE);
    assert.equal(note.includes("another tab"), false);
    assert.match(note, /One saved in the last 15 seconds can stay/);
    await reset.click();
    const confirm = winCard.getByRole("button", { name: WIN_RESET_CONFIRM });
    await confirm.waitFor({ state: "visible" });
    await confirm.click();
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll(".mp-win-reset button")].find((node) => node.textContent === "Confirm reset on this device");
      return button && button.disabled === true;
    });
    assert.equal(await winCard.getByRole("button", { name: WIN_RESET_LABEL }).count(), 0);
    const clickedAgain = await page.evaluate(() => {
      const button = [...document.querySelectorAll(".mp-win-reset button")].find((node) => node.textContent === "Confirm reset on this device");
      if (!button || button.disabled !== true) return false;
      button.disabled = false;
      button.click();
      return true;
    });
    assert.equal(clickedAgain, true);
    const status = winCard.locator("p[role='status']");
    await page.waitForTimeout(100);
    assert.equal(await status.count(), 0);
    await page.evaluate(() => globalThis.__releaseReset());
    await status.waitFor({ state: "visible" });
    assert.equal((await status.innerText()).trim(), WIN_RESET_DONE);
  });
});

async function shot(page, name, selector = ".mp-win-of-day", width = 1280) {
  const locator = page.locator(selector).first();
  await page.setViewportSize({ width, height: 900 });
  await locator.evaluate((node) => node.scrollIntoView({ block: "start", inline: "nearest" }));
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No box for ${name}`);
  const viewportHeight = Math.ceil(box.y + box.height) + 80;
  await page.setViewportSize({ width, height: viewportHeight });
  await locator.evaluate((node) => node.scrollIntoView({ block: "start", inline: "nearest" }));
  const fitted = await locator.boundingBox();
  if (!fitted) throw new Error(`No fitted box for ${name}`);
  await page.screenshot({
    path: `${shots}/${name}.png`,
    animations: "disabled",
    clip: {
      x: Math.max(0, Math.floor(fitted.x)),
      y: Math.max(0, Math.floor(fitted.y)),
      width: Math.floor(fitted.width),
      height: Math.floor(fitted.height),
    },
    timeout: 10000,
  });
}

// Headless Chrome stalls on Page.captureScreenshot once this card has placeholder images.
// A single screencast frame still shows the open list.
async function shotViewport(page, name, width, height, selector) {
  await page.setViewportSize({ width, height });
  await page.locator(selector).first().evaluate((node) => node.scrollIntoView({ block: "start", inline: "nearest" }));
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
