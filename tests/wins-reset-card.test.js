import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  WIN_RESET_CANCEL,
  WIN_RESET_CONFIRM,
  WIN_RESET_DONE,
  WIN_RESET_LABEL,
  WIN_RESET_NOTE,
  WIN_SAVED_LABEL,
} from "../src/today/wins.js";
import { startMindpalServer } from "../scripts/smoke-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const chromePath = process.env.MINDPAL_CHROME || "/usr/local/bin/google-chrome";
const corruptV2 = "corrupt-v2-record";
const backupCopies = {
  "mindpal.dailyWins.v2.backup.11": "copy-a",
  "mindpal.dailyWins.v2.backup.22": "copy-b",
  "mindpal.dailyWins.v2.backup.33": "copy-c",
};

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  chromium = null;
}

function cardSkipReason() {
  if (!chromium) {
    return "Skipped: playwright-core is not installed, so the reset card was not opened in a browser. npm run build runs this check when Playwright and Chrome are available.";
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

describe("reset wins on this device", { timeout: 90000 }, () => {
  let host;
  let browser;
  let page;

  before(async () => {
    if (skipCard) return;
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
    await context.addInitScript(({ broken, copies }) => {
      try {
        localStorage.setItem("mindpal.ageGateAdult.v1", "1");
        localStorage.setItem("mindpal.dailyWins.v2", broken);
        for (const [key, value] of Object.entries(copies)) localStorage.setItem(key, value);
      } catch {
        /* private mode */
      }
    }, { broken: corruptV2, copies: backupCopies });
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    await signInLocal(page, host.origin);
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("asks before clearing a blocked wins record and keeps the backup copies", { skip: skipCard }, async () => {
    const winCard = page.locator(".mp-win-of-day");
    const eveningCard = page.locator(".mp-wins-evening");
    const reset = winCard.getByRole("button", { name: WIN_RESET_LABEL });
    await reset.waitFor({ state: "visible" });
    await winCard.getByText(WIN_RESET_NOTE).waitFor({ state: "visible" });
    assert.equal(await eveningCard.getByRole("button", { name: WIN_RESET_LABEL }).count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")), corruptV2);

    await reset.click();
    const confirm = winCard.getByRole("button", { name: WIN_RESET_CONFIRM });
    const cancel = winCard.getByRole("button", { name: WIN_RESET_CANCEL });
    await confirm.waitFor({ state: "visible" });
    await cancel.click();
    await confirm.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2")), corruptV2);
    await reset.waitFor({ state: "visible" });

    await reset.click();
    await confirm.click();
    const status = winCard.locator("p[role='status']");
    await status.waitFor({ state: "visible" });
    assert.equal((await status.innerText()).trim(), WIN_RESET_DONE);
    await reset.waitFor({ state: "hidden" });

    const afterReset = await page.evaluate(() => ({
      v2: localStorage.getItem("mindpal.dailyWins.v2"),
      v1: localStorage.getItem("mindpal.dailyWins.v1"),
      backups: Object.keys(localStorage)
        .filter((key) => key.startsWith("mindpal.dailyWins.v2.backup."))
        .sort(),
    }));
    assert.equal(afterReset.v2, null);
    assert.equal(afterReset.v1, null);
    assert.deepEqual(afterReset.backups, [
      "mindpal.dailyWins.v2.backup.11",
      "mindpal.dailyWins.v2.backup.22",
      "mindpal.dailyWins.v2.backup.33",
    ]);
    for (const [key, value] of Object.entries(backupCopies)) {
      const stored = await page.evaluate((name) => localStorage.getItem(name), key);
      assert.equal(stored, value);
    }

    await winCard.locator("#mp-win-winOfDay").fill("Walked to the shops");
    await winCard.getByRole("button", { name: "Save this win" }).click();
    await status.waitFor({ state: "visible" });
    assert.equal((await status.innerText()).trim(), WIN_SAVED_LABEL);
    await reset.waitFor({ state: "hidden" });
    const saved = await page.evaluate(() => localStorage.getItem("mindpal.dailyWins.v2"));
    assert.match(saved, /Walked to the shops/);
    assert.equal(await eveningCard.getByRole("button", { name: WIN_RESET_LABEL }).count(), 0);
  });
});

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
