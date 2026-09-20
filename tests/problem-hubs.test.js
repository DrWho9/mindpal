import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PROBLEM_TAG_IDS,
  THEME_LABEL_TO_TAGS,
  readingProblemTags,
  tagsForThemeLabel,
} from "../src/problems/theme-map.js";
import {
  findProblem,
  listProblems,
  readingsForProblem,
  saveCompanionPrompt,
  takeCompanionPrompt,
  videosForProblem,
} from "../src/problems/hubs.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const videos = JSON.parse(readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"));
const hubs = JSON.parse(readFileSync(join(root, "../src/data/problem-hubs.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");

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
  it("seeds six AU-plain problem hubs", () => {
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
  });

  it("filters Maddy and open-draft videos by problem tags", () => {
    assert.ok(videosForProblem(maddy, "sleep").some((item) => item.id === "maddy-timed-breath"));
    assert.ok(videosForProblem(videos, "anxiety").some((item) => item.id === "V08"));
    assert.ok(videosForProblem(videos, "motivation").some((item) => item.id === "V09"));
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
    assert.doesNotMatch(inject, /LOCAL ACCOUNT/);
    assert.doesNotMatch(inject, /Sign in for your morning space/);
  });
});
