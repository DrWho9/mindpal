import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AOD_SUPPORT_TAGS,
  MOTHER_SUPPORT_TAGS,
  PROBLEM_TAG_IDS,
  THEME_LABEL_TO_TAGS,
  readingProblemTags,
  tagsForThemeLabel,
} from "../src/problems/theme-map.js";
import {
  aodSupportTags,
  findProblem,
  listProblems,
  maddyForProblem,
  motherSupportTags,
  readingsForProblem,
  saveCompanionPrompt,
  takeCompanionPrompt,
  videosForProblem,
} from "../src/problems/hubs.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const ownerReadings = JSON.parse(readFileSync(join(root, "../src/data/owner-readings.json"), "utf8"));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const videos = JSON.parse(readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"));
const hubs = JSON.parse(readFileSync(join(root, "../src/data/problem-hubs.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
globalThis.mpOwnerReadings = ownerReadings;

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

describe("problem hubs", () => {
  it("seeds eight AU-plain problem hubs including mothers and drugs & alcohol", () => {
    assert.deepEqual(
      listProblems(hubs).map((item) => item.id),
      PROBLEM_TAG_IDS,
    );
    assert.deepEqual(
      hubs.problems.map((item) => item.title),
      [
        "Sleep / restless night",
        "Anxiety / worry",
        "Stress / overwhelm",
        "Heavy / low mood",
        "Motivation / get going",
        "Faith / prayer & meaning",
        "Struggling mothers",
        "Drugs & alcohol",
      ],
    );
  });

  it("tags every Pack A reading from its theme_label", () => {
    assert.equal(packA.readings.length, 100);
    for (const reading of packA.readings) {
      const tags = readingProblemTags(reading);
      assert.ok(tags.length, `${reading.id} has no problem tags`);
      assert.deepEqual(tags, tagsForThemeLabel(reading.theme_label));
      assert.ok(THEME_LABEL_TO_TAGS[reading.theme_label], reading.theme_label);
    }
    for (const id of PROBLEM_TAG_IDS) {
      assert.ok(
        readingsForProblem(packA, id, 100).length >= 3,
        `${id} should have several Pack A readings`,
      );
    }
    const mothers = readingsForProblem(packA, "mothers", 100);
    assert.ok(mothers.length >= 8 && mothers.length <= 15, `mothers has ${mothers.length}`);
    for (const reading of mothers) {
      const extra = motherSupportTags(reading);
      assert.ok(
        extra.some((tag) => MOTHER_SUPPORT_TAGS.includes(tag)),
        `${reading.id} should carry a mother-support tag`,
      );
    }
    const aod = readingsForProblem(packA, "aod", 100);
    assert.ok(aod.length >= 8 && aod.length <= 16, `aod has ${aod.length}`);
    for (const reading of aod) {
      const extra = aodSupportTags(reading);
      assert.ok(
        extra.some((tag) => AOD_SUPPORT_TAGS.includes(tag)),
        `${reading.id} should carry an AOD-support tag`,
      );
    }
  });

  it("filters Maddy and open-draft videos by problem tags", () => {
    assert.ok(videosForProblem(maddy, "sleep").some((item) => item.id === "maddy-timed-breath"));
    assert.ok(videosForProblem(videos, "anxiety").some((item) => item.id === "V08"));
    assert.ok(videosForProblem(videos, "motivation").some((item) => item.id === "V09"));
    assert.deepEqual(
      maddyForProblem(maddy, "mothers").map((item) => item.id),
      ["maddy-welcome", "maddy-timed-breath"],
    );
    assert.equal(
      videosForProblem(videos, "mothers").some((item) => /^V\d+/.test(item.id)),
      false,
      "HeyGen drafts are not the mothers default",
    );
    assert.deepEqual(
      maddyForProblem(maddy, "aod").map((item) => item.id),
      ["maddy-welcome", "maddy-timed-breath"],
    );
    assert.equal(
      videosForProblem(videos, "aod").some((item) => /^V\d+/.test(item.id)),
      false,
      "HeyGen drafts are not the AOD default",
    );
  });

  it("prefills Companion from a one-shot session prompt", () => {
    const sleep = findProblem(hubs, "sleep");
    const storage = memoryStorage();
    saveCompanionPrompt(sleep.companionPrompt, storage);
    assert.match(takeCompanionPrompt(storage), /restless night/);
    assert.equal(takeCompanionPrompt(storage), "");
  });

  it("keeps Today sign-in off the mid-page and verse collapsed", () => {
    assert.match(inject, /mpTodaySteps\.HUB_FLOW_LINE|Follow today’s steps/);
    assert.match(inject, /Today’s verse — tap to expand/);
    assert.match(inject, /mp-account-footer/);
    assert.match(inject, /What do you need help with\?/);
    assert.match(inject, /mp-problem-chip/);
    assert.match(inject, /Tap a chip to expand/);
    assert.match(inject, /mpProblemHubList,\{variant:`today`/);
    assert.doesNotMatch(inject, /LOCAL ACCOUNT/);
    assert.doesNotMatch(inject, /Sign in for your morning space/);
  });

  it("wires a dedicated mothers hub with Companion and safety copy", () => {
    const mothers = findProblem(hubs, "mothers");
    assert.match(mothers.intro, /pressure, exhaustion/);
    assert.match(mothers.companionPrompt, /not a therapist/);
    assert.match(mothers.companionPrompt, /000/);
    assert.match(mothers.journalPrompt, /small win amid caring/);
    assert.match(inject, /mpMothersHubPage/);
    assert.match(inject, /mpMothersFeelingsChip/);
    assert.match(inject, /mpMothersWomenCard/);
    assert.match(inject, /No speaker library dump here/);
    assert.match(inject, /Need support/);
  });

  it("wires a dedicated drugs & alcohol hub with safety copy", () => {
    const aod = findProblem(hubs, "aod");
    assert.match(aod.intro, /not detox/i);
    assert.match(aod.intro, /not a replacement for alcohol and other drug treatment/);
    assert.match(aod.companionPrompt, /not detox/);
    assert.match(aod.companionPrompt, /000/);
    assert.match(aod.journalPrompt, /non-shame/);
    assert.match(inject, /mpAodHubPage/);
    assert.match(inject, /mpAodFeelingsChip/);
    assert.match(inject, /intoxicated and in danger/);
    assert.match(inject, /Need support lists human help/);
    assert.doesNotMatch(inject, /DirectLine/);
    assert.match(aod.companionPrompt, /puppy-and-treat loop/);
    assert.match(aod.companionPrompt, /not genetics/);
    assert.match(inject, /mp-hub-featured/);
    assert.match(inject, /Read the talk-through/);
  });

  it("features the drugs and alcohol talk-through first on the AOD hub", () => {
    const aod = readingsForProblem(packA, "aod");
    assert.equal(aod[0].id, "dna-dopamine-loop-v1");
    assert.equal(aod[0].pack, "owner");
    assert.match(aod[0].title, /Drugs and alcohol/);
    const spelled = aod[0].body.toLowerCase().indexOf("drugs and alcohol");
    const dna = aod[0].body.search(/\bDNA\b/);
    assert.ok(spelled >= 0 && dna > spelled, "spell out drugs and alcohol before DNA");
    assert.match(aod[0].body, /not genetics/);
    assert.match(aod[0].body, /puppy/);
    assert.match(aod[0].body, /treat/);
    assert.match(aod[0].body, /feel down/);
    assert.match(aod[0].body, /not a DIY detox/i);
    assert.match(aod[0].body, /Literacy, not a protocol/);
    assert.match(aod[0].body, /000/);
    assert.match(aod[0].body, /Need support/);
    assert.deepEqual(
      aodSupportTags(aod[0]).sort(),
      ["alcohol", "craving", "drugs", "learning-loop", "low-mood", "shame"].sort(),
    );
    assert.ok(aod.slice(1).every((item) => item.pack !== "owner"));
  });
});
