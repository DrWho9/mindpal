import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  dedicatedProblemRoute,
  featuredMensHelpline,
  isMensHealthYoutubeUrl,
  mensHealthHelplines,
  mensHealthQueuedVideos,
  mensHealthStats,
  mensHealthYoutube,
  MENS_HEALTH_ROUTE,
  MENS_HEALTH_TITLE,
} from "../src/problems/mens-health.js";
import { featuredOwnerReadings } from "../src/readings/owner.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, "../src/data/mens-health.json"), "utf8"));
const ownerReadings = JSON.parse(readFileSync(join(root, "../src/data/owner-readings.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
globalThis.mpMensHealth = catalog;
globalThis.mpOwnerReadings = ownerReadings;

describe("Men's Health hub catalog", () => {
  it("keeps the dedicated route as Mens health for #Mens%20health", () => {
    assert.equal(MENS_HEALTH_ROUTE, "Mens health");
    assert.equal(MENS_HEALTH_TITLE, "Men's Health");
    assert.equal(dedicatedProblemRoute("mens-health"), "Mens health");
    assert.equal(encodeURIComponent(MENS_HEALTH_ROUTE), "Mens%20health");
  });

  it("uses only the sourced ABS comparison figures with official links", () => {
    const stats = mensHealthStats();
    assert.equal(stats.length, 3);
    const suicide = stats.find((item) => item.id === "suicide-2024");
    const prison = stats.find((item) => item.id === "prison-2025");
    const home = stats.find((item) => item.id === "homelessness-2021");
    assert.match(suicide.male, /76\.5%/);
    assert.match(suicide.male, /2,529/);
    assert.match(suicide.female, /778/);
    assert.match(suicide.maleRate, /18\.3/);
    assert.match(suicide.femaleRate, /5\.5/);
    assert.match(suicide.sourceUrl, /abs\.gov\.au\/statistics\/health\/causes-death\/intentional-self-harm-suicide-deaths\/latest-release/);
    assert.match(prison.male, /43,169/);
    assert.match(prison.male, /92%/);
    assert.match(prison.female, /3,831/);
    assert.match(prison.maleRate, /404/);
    assert.match(prison.femaleRate, /35/);
    assert.match(prison.sourceUrl, /abs\.gov\.au\/statistics\/people\/crime-and-justice\/prisoners-australia\/latest-release/);
    assert.match(home.male, /68,516/);
    assert.match(home.male, /55\.9%/);
    assert.match(home.female, /53,974/);
    assert.match(home.maleRate, /55 \/ 10,000/);
    assert.match(home.femaleRate, /42 \/ 10,000/);
    assert.match(home.sourceUrl, /abs\.gov\.au\/statistics\/people\/housing\/estimating-homelessness-census\/latest-release/);
    for (const item of stats) {
      assert.match(item.sourceUrl, /^https:\/\/www\.abs\.gov\.au\//);
    }
  });

  it("lists 6–10 outbound YouTube refs only", () => {
    const yt = mensHealthYoutube();
    assert.ok(yt.length >= 6 && yt.length <= 10, `youtube has ${yt.length}`);
    for (const item of yt) {
      assert.equal(item.external, true);
      assert.equal(isMensHealthYoutubeUrl(item.url), true);
    }
    assert.equal(isMensHealthYoutubeUrl("https://example.com/watch"), false);
  });

  it("features MensLine and keeps the AU human-help set", () => {
    const featured = featuredMensHelpline();
    assert.equal(featured.id, "mensline");
    assert.equal(featured.phone, "1300 78 99 78");
    const phones = mensHealthHelplines().map((item) => item.phone);
    assert.deepEqual(phones, ["1300 78 99 78", "13 11 14", "1300 22 4636", "000"]);
  });

  it("queues three MindPal script titles and no HeyGen spend", () => {
    const queued = mensHealthQueuedVideos();
    assert.equal(queued.length, 3);
    assert.deepEqual(
      queued.map((item) => item.title),
      [
        "Best self is not a performance",
        "Mateship is a skill",
        "Show up for the people who count on you",
      ],
    );
    assert.doesNotMatch(JSON.stringify(catalog), /HeyGen/);
    const page = inject.slice(inject.indexOf("function mpMensHealthHubPage"));
    assert.match(page, /No HeyGen render in this hub/);
    assert.doesNotMatch(page, /heygenDraftGate|V0[0-9]|publicEligible/);
  });

  it("keeps original best-self readings strength-based and named MindPal", () => {
    const readings = featuredOwnerReadings("mens-health");
    assert.ok(readings.length >= 6 && readings.length <= 8);
    const blob = readings.map((item) => `${item.title}\n${item.body}`).join("\n");
    assert.match(blob, /There's nothing wrong with being your best self/);
    assert.match(blob, /MindPal/);
    assert.match(blob, /mateship/i);
    assert.match(blob, /provider and protector/i);
    assert.doesNotMatch(blob, /toxic masculinity/i);
    assert.doesNotMatch(blob, /demasculin/i);
    assert.doesNotMatch(blob, /culture.war/i);
  });

  it("keeps the hub accordion one-section-at-a-time", () => {
    assert.match(inject, /function mpMensAccordion/);
    assert.match(inject, /aria-expanded/);
    assert.match(inject, /The picture in Australia/);
    assert.match(inject, /Best self/);
    assert.match(inject, /Watch \/ listen/);
    assert.match(inject, /Talk to someone/);
    assert.match(inject, /MindPal videos \(soon\)/);
    assert.match(inject, /Companion \/ journal/);
    assert.match(inject, /function toggle\(id\)\{p\(e=>e===id\?``:id\)\}/);
  });
});
