import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { WIN_NOT_SAVED_LABEL } from "../src/today/wins.js";
import { startMindpalServer } from "../scripts/smoke-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const chromePath = process.env.MINDPAL_CHROME || "/usr/local/bin/google-chrome";
const corruptV2 = '{"version":2,"days":';

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  chromium = null;
}

function cardSkipReason() {
  if (!chromium) {
    return "Skipped: playwright-core is not installed, so the not-saved card was not opened in a browser. npm run build runs this check when Playwright and Chrome are available.";
  }
  if (!existsSync(chromePath)) {
    if (process.env.MINDPAL_CHROME) {
      return `Skipped: MINDPAL_CHROME does not point at a Chrome binary (${chromePath}). npm test still passes. npm run build runs this card check when that path exists.`;
    }
    return `Skipped: MINDPAL_CHROME is unset and Chrome was not found at ${chromePath}. npm test still passes. npm run build runs this card check when Chrome is available.`;
  }
  return false;
}

describe("not-saved win card copy", { skip: cardSkipReason(), timeout: 90000 }, () => {
  let host;
  let browser;
  let page;

  before(async () => {
    host = await startMindpalServer(root);
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
    });
    await context.addInitScript((broken) => {
      const key = "mindpal.dailyWins.v2";
      const original = Storage.prototype.setItem;
      const guarded = function guardedSetItem(name, value) {
        if (name === key) throw new Error("v2 quota");
        return original.call(this, name, value);
      };
      Storage.prototype.setItem = guarded;
      try {
        original.call(localStorage, "mindpal.ageGateAdult.v1", "1");
        original.call(localStorage, key, broken);
      } catch {
        /* private mode */
      }
    }, corruptV2);
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    await signInLocal(page, host.origin);
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("shows the not-saved sentence on the win of the day card and the evening card", async () => {
    const winCard = page.locator(".mp-win-of-day");
    await winCard.locator("#mp-win-winOfDay").fill("Walked to the shops");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await assertNotSaved(winCard, "Walked to the shops");

    const eveningCard = page.locator(".mp-wins-evening");
    await eveningCard.locator("#mp-win-evening").fill("A quiet cup of tea");
    await eveningCard.getByRole("button", { name: "Save this win" }).click();
    await assertNotSaved(eveningCard, "A quiet cup of tea");

    const stored = await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2"));
    assert.equal(stored, corruptV2);
  });
});

async function assertNotSaved(card, typed) {
  const status = card.locator("p[role='status']");
  await status.waitFor({ state: "visible" });
  assert.equal((await status.innerText()).trim(), WIN_NOT_SAVED_LABEL);
  assert.equal(await card.locator("input").first().inputValue(), typed);
}

async function signInLocal(page, origin) {
  await page.goto(`${origin}#Today`, { waitUntil: "domcontentloaded" });
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
  await page.getByRole("button", { name: /40.49/ }).click();
  await page.getByRole("button", { name: "Man", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click({ force: true });
  await page.waitForFunction(() => !document.body.innerText.includes("Sign in to begin"));
  await page.locator("#mp-win-winOfDay").waitFor({ state: "visible" });
}
