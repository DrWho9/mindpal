import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { APPOINTMENT_COMPANION_PROMPT } from "../../src/problems/hubs.js";
import { HASH_ROUTES, encodeRouteHash } from "../../src/qa/page-inventory.js";
import { startMindpalServer } from "../../scripts/smoke-server.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const chromePath = process.env.MINDPAL_CHROME || "/usr/local/bin/google-chrome";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  chromium = null;
}

const browserEnabled = Boolean(chromium) && existsSync(chromePath);

describe("route smoke (Playwright + system Chrome)", { skip: !browserEnabled }, () => {
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
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    await signInLocal(page, host.origin);
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("opens every adult hash route without an empty workspace", async () => {
    const adult = HASH_ROUTES.filter((item) => !item.adultHidden);
    for (const item of adult) {
      await page.goto(`${host.origin}${encodeRouteHash(item.route)}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForFunction(() => document.querySelector("#root")?.innerText?.trim().length > 20);
      const text = await page.locator("#root").innerText();
      assert.ok(text.length > 40, `${item.route} rendered almost nothing`);
      assert.doesNotMatch(text, /Sign in to begin/);
    }
  });

  it("Companion choices are not no-ops", async () => {
    await page.goto(`${host.origin}${encodeRouteHash("Companion")}`, {
      waitUntil: "domcontentloaded",
    });
    const start = page.getByRole("button", { name: /Try the local practice guide/i });
    if (await start.count()) await start.click();
    const chip = page.getByRole("button", { name: "A small exercise" });
    await chip.click();
    await assert.ok(await chip.evaluate((el) => /selected/.test(el.className)));
    await page.getByRole("button", { name: /Show practice choices/i }).click();
    const response = page.locator(".chat-response");
    await response.waitFor({ state: "visible" });
    const copy = (await response.innerText()).trim();
    assert.ok(copy.length > 12, "Show practice choices returned no copy");
    assert.match(await page.locator("body").innerText(), /DETERMINISTIC DEMO|LIVE AI COMPANION/);
  });

  it("YouTube Search filters the directory", async () => {
    await page.goto(`${host.origin}${encodeRouteHash("YouTube directory")}`, {
      waitUntil: "domcontentloaded",
    });
    const search = page.locator("#youtube-search");
    await search.waitFor({ state: "visible" });
    const status = page.getByLabel("Directory entries");
    await search.fill("");
    const before = ((await status.textContent()) || "").trim();
    await search.fill("zzzz-no-such-mindpal-video");
    await page.waitForFunction(() => {
      const el = document.querySelector("[aria-label='Directory entries']");
      return el && /No matching entries/i.test(el.textContent || "");
    });
    await search.fill("the");
    await page.waitForFunction(() => {
      const el = document.querySelector("[aria-label='Directory entries']");
      return el && /\d+ directory entries/i.test(el.textContent || "");
    });
    const after = ((await status.textContent()) || "").trim();
    assert.match(before + after, /directory entries/i);
  });

  it("Reflect composer appears after a mode", async () => {
    await page.goto(`${host.origin}${encodeRouteHash("Reflect")}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Write without prompts" }).click();
    const composer = page.locator("#reflection-text");
    await composer.waitFor({ state: "visible" });
    await composer.fill("A sample sentence for QA.");
    assert.equal(await composer.inputValue(), "A sample sentence for QA.");
  });

  it("Appointment companion entry opens Companion with a prompt", async () => {
    await page.goto(`${host.origin}${encodeRouteHash("Body, food and wellbeing")}`, {
      waitUntil: "domcontentloaded",
    });
    const cta = page.getByRole("button", {
      name: "Talk this appointment through with Companion",
    });
    await cta.waitFor({ state: "visible" });
    await cta.click();
    await page.waitForFunction(() => decodeURIComponent(location.hash.slice(1)) === "Companion");
    const start = page.getByRole("button", { name: /Try the local practice guide/i });
    if (await start.count()) await start.click();
    const box = page.locator("#companion-message");
    await box.waitFor({ state: "visible" });
    assert.equal((await box.inputValue()).trim(), APPOINTMENT_COMPANION_PROMPT);
  });
});

if (!browserEnabled) {
  describe("route smoke (skipped)", () => {
    it("records that Playwright Chrome is unavailable", () => {
      assert.ok(
        false,
        `Install playwright-core and keep Chrome at ${chromePath} so smoke can click CTAs`,
      );
    });
  });
}

async function signInLocal(page, origin) {
  await page.goto(`${origin}#Today`, { waitUntil: "domcontentloaded" });
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
  await page.getByRole("button", { name: /Continue with a secular space/i }).click();
  await page.getByRole("button", { name: "40–49" }).click();
  await page.getByRole("button", { name: "Man" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Sign in to begin"));
}
