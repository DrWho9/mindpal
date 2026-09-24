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
    await page.addInitScript(() => {
      try {
        localStorage.setItem("mindpal.ageGateAdult.v1", "1");
      } catch {
        /* private mode */
      }
    });
    page._mindpalOrigin = host.origin;
    await signInLocal(page, host.origin);
  });

  after(async () => {
    await browser?.close();
    await host?.close();
  });

  it("opens every adult hash route without an empty workspace", async () => {
    const adult = HASH_ROUTES.filter((item) => !item.adultHidden);
    for (const item of adult) {
      await goHash(page, item.route);
      const text = await page.locator("#root").innerText();
      assert.ok(text.length > 40, `${item.route} rendered almost nothing`);
      assert.doesNotMatch(text, /Sign in to begin/);
    }
  });

  it("Companion choices are not no-ops", async () => {
    await goHash(page, "Companion");
    await page.getByRole("heading", { name: "At your pace." }).waitFor({ state: "visible" });
    const start = page.getByRole("button", { name: /Try the local practice guide/i });
    if (await start.count()) await start.click();
    const chip = page.getByRole("button", { name: "A small exercise" });
    await chip.click();
    assert.ok(await chip.evaluate((el) => /selected/.test(el.className)));
    await page.getByRole("button", { name: /Show practice choices/i }).click();
    const practiceGrid = page.locator(".mp-practice-grid");
    await practiceGrid.waitFor({ state: "visible" });
    const copy = (await practiceGrid.innerText()).trim();
    assert.ok(copy.length > 12, "Show practice choices returned no copy");
    assert.match(await page.locator("body").innerText(), /DETERMINISTIC DEMO|LIVE AI COMPANION/);
  });

  it("YouTube Search filters the directory", async () => {
    await goHash(page, "YouTube directory");
    await page.getByRole("heading", { name: /Browse external videos|YouTube video directory/i }).first().waitFor({
      state: "visible",
    });
    const search = page.locator("#youtube-search");
    await search.waitFor({ state: "visible" });
    const status = page.getByLabel("Directory entries");
    await search.fill("");
    await search.press("Enter");
    const before = ((await status.textContent()) || "").trim();
    await search.fill("zzzz-no-such-mindpal-video");
    await search.press("Enter");
    await page.waitForFunction(() => {
      const el = document.querySelector("[aria-label='Directory entries']");
      return el && /No matching/i.test(el.textContent || "");
    });
    await search.fill("the");
    await search.press("Enter");
    await page.waitForFunction(() => {
      const el = document.querySelector("[aria-label='Directory entries']");
      return el && /\d+ director/i.test(el.textContent || "");
    });
    const after = ((await status.textContent()) || "").trim();
    assert.match(before + after, /director/i);
  });

  it("Reflect composer appears after a mode", async () => {
    await goHash(page, "Reflect");
    await page.getByRole("heading", { name: "Talk with MindPal" }).waitFor({ state: "visible" });
    const composer = page.locator("#mp-reflect-input");
    await composer.waitFor({ state: "visible" });
    await composer.fill("A sample sentence for QA.");
    assert.equal(await composer.inputValue(), "A sample sentence for QA.");
  });

  it("Appointment companion entry opens Companion with a prompt", async () => {
    await goHash(page, "Body, food and wellbeing");
    await page.getByRole("heading", { name: "Body, food and wellbeing" }).waitFor({ state: "visible" });
    const cta = page.getByRole("button", {
      name: "Talk this appointment through with Companion",
    });
    await cta.waitFor({ state: "visible" });
    await cta.click();
    await page.waitForFunction(() => decodeURIComponent(location.hash.slice(1)) === "Companion");
    await page.getByRole("heading", { name: "At your pace." }).waitFor({ state: "visible" });
    const start = page.getByRole("button", { name: /Try the local practice guide/i });
    if (await start.count()) await start.click();
    const box = page.locator("#companion-message");
    await box.waitFor({ state: "visible" });
    assert.equal((await box.inputValue()).trim(), APPOINTMENT_COMPANION_PROMPT);
  });

  it("Peaceful reading Listen speaks and the scrubber seeks", async () => {
    await goHash(page, "Today");
    await page.evaluate(() => {
      window.__mpSpoken = [];
      const real = window.speechSynthesis;
      const fake = {
        speaking: false,
        pending: false,
        getVoices: () =>
          real?.getVoices?.() || [{ name: "Karen", lang: "en-AU", voiceURI: "karen" }],
        addEventListener: (...args) => real?.addEventListener?.(...args),
        removeEventListener: (...args) => real?.removeEventListener?.(...args),
        resume: () => real?.resume?.(),
        cancel() {
          this.speaking = false;
          try {
            real?.cancel?.();
          } catch {
            /* ignore */
          }
        },
        speak(utterance) {
          window.__mpSpoken.push(String(utterance?.text || ""));
          this.speaking = true;
          this.pending = false;
        },
      };
      try {
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          get: () => fake,
        });
      } catch {
        if (real) real.speak = (utterance) => fake.speak(utterance);
      }
    });
    await page.getByRole("button", { name: "Skip this breath" }).click();
    await page.getByRole("button", { name: "Skip the verse" }).click();
    const player = page.getByRole("group", { name: "Listen to Peaceful reading" });
    await player.waitFor({ state: "visible" });
    await player.scrollIntoViewIfNeeded();
    await player.getByRole("button", { name: "Play" }).click();
    await page.waitForFunction(() => (window.__mpSpoken || []).length > 0);
    const opening = await page.evaluate(() => window.__mpSpoken[0]);
    assert.ok(opening.length > 12, "Play did not speak the reading");
    await player.getByRole("button", { name: "Pause" }).waitFor({ state: "visible" });
    await player.getByRole("button", { name: "Skip forward 8 seconds" }).click();
    await page.waitForFunction(() => (window.__mpSpoken || []).length > 1);
    const skipped = await page.evaluate(() => window.__mpSpoken.at(-1));
    assert.notEqual(skipped, opening);
    const track = player.locator(".mp-listen-track");
    const box = await track.boundingBox();
    assert.ok(box, "scrubber track missing");
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => (window.__mpSpoken || []).length > 2);
    const scrubbed = await page.evaluate(() => window.__mpSpoken.at(-1));
    assert.notEqual(scrubbed, skipped);
    const times = await player.locator(".mp-listen-times").innerText();
    assert.match(times, /\d{2}:\d{2}/);
    assert.match(times, /-\d{2}:\d{2}/);
    const valueNow = Number(await player.getByRole("slider").getAttribute("aria-valuenow"));
    assert.ok(valueNow > 0, "scrubber handle did not move");
    await page.locator(".mp-team-reading").screenshot({
      path: "/opt/cursor/artifacts/peaceful-listen-scrubber.png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await player.scrollIntoViewIfNeeded();
    await page.locator(".mp-team-reading").screenshot({
      path: "/opt/cursor/artifacts/peaceful-listen-scrubber-phone.png",
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await player.getByRole("button", { name: "Pause" }).click();
    await player.getByRole("button", { name: "Play" }).waitFor({ state: "visible" });
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

async function goHash(page, route) {
  const origin = page._mindpalOrigin;
  const nonce = `n=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await page.goto(`${origin}?${nonce}${encodeRouteHash(route)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction((next) => {
    const hash = decodeURIComponent(location.hash.slice(1) || "Today");
    const root = document.querySelector("#root");
    return hash === next && (root?.innerText || "").trim().length > 20;
  }, route);
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
  await page.getByRole("button", { name: /Continue with a secular space/i }).click();
  await page.getByRole("button", { name: "40–49", exact: true }).click();
  await page.getByRole("button", { name: "Man", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Sign in to begin"));
}
