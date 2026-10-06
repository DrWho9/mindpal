import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { HASH_ROUTES } from "../src/qa/page-inventory.js";
import {
  GROWTH_TAG_IDS,
  SUPPORT_TAG_IDS,
} from "../src/problems/theme-map.js";
import {
  HELD_GROWTH_LABELS,
  MOTHERS_DISPLAY,
  MOTHERS_ROUTE,
  isHeldGrowthLabel,
  listProblems,
  resolveHashAlias,
} from "../src/problems/hubs.js";
import { dedicatedProblemRoute } from "../src/problems/mens-health.js";

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, "..");
const hubs = JSON.parse(readFileSync(join(repo, "src/data/problem-hubs.json"), "utf8"));

const PUBLISHED_SUPPORT = [
  "Sleep / restless night",
  "Anxiety / worry",
  "Stress / overwhelm",
  "Heavy / low mood",
  "Faith / prayer & meaning",
  "Mothers",
  "Drugs & alcohol",
  "Men's Health",
];
const PUBLISHED_GROWTH = [
  "Positive mindset",
  "Motivation / a gentle start",
  "Stronger mind",
  "Rise to a challenge",
  "Overcome a hard patch",
  "Gratitude & wins",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "vendor" || name === "assets") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

describe("176 display candidate", () => {
  it("renames mothers on screen and keeps the old hash alias", () => {
    assert.equal(MOTHERS_DISPLAY, "Mothers");
    assert.equal(MOTHERS_ROUTE, "Struggling mothers");
    assert.equal(dedicatedProblemRoute("mothers"), "Struggling mothers");
    assert.equal(resolveHashAlias("Struggling mothers"), "Struggling mothers");
    assert.equal(resolveHashAlias("#Struggling mothers"), "Struggling mothers");
    assert.equal(resolveHashAlias("Struggling%20mothers"), "Struggling mothers");
    assert.equal(findTitle("mothers"), "Mothers");
    const route = HASH_ROUTES.find((item) => item.route === "Struggling mothers");
    assert.ok(route, "old mothers hash is still a published route");
    assert.equal(route.title, "Mothers");
  });

  it("keeps every published support and growth link", () => {
    const problems = listProblems(hubs);
    assert.deepEqual(
      problems.filter((item) => item.group === "support").map((item) => item.title),
      PUBLISHED_SUPPORT,
    );
    assert.deepEqual(
      problems.filter((item) => item.group === "growth").map((item) => item.title),
      PUBLISHED_GROWTH,
    );
    assert.deepEqual(problems.filter((item) => item.group === "support").map((item) => item.id), SUPPORT_TAG_IDS);
    assert.deepEqual(problems.filter((item) => item.group === "growth").map((item) => item.id), GROWTH_TAG_IDS);
    for (const title of [...PUBLISHED_SUPPORT, ...PUBLISHED_GROWTH]) {
      assert.equal(isHeldGrowthLabel(title), false, title);
    }
  });

  it("holds the seven growth labels as coming soon and not as routes", () => {
    assert.equal(HELD_GROWTH_LABELS.length, 7);
    assert.deepEqual(
      HELD_GROWTH_LABELS.map((item) => item.label),
      [
        "Ego, defensiveness and needing to be right",
        "Always wanting more",
        "Sexual urges, choices and boundaries",
        "Envy and jealousy",
        "Overindulgence and excessive eating",
        "Anger and resentment",
        "Avoidance and laziness",
      ],
    );
    const routes = new Set(HASH_ROUTES.map((item) => item.route));
    for (const item of HELD_GROWTH_LABELS) {
      assert.equal(resolveHashAlias(item.label), null, item.label);
      assert.equal(resolveHashAlias(item.id), null, item.id);
      assert.equal(routes.has(item.label), false);
      assert.equal(routes.has(item.id), false);
    }
  });

  it("does not import StruggleDraft or add a draft clinical route", () => {
    const files = walk(join(repo, "src")).concat(walk(join(repo, "scripts")));
    for (const path of files) {
      if (!/\.(js|mjs|json|css)$/.test(path)) continue;
      if (path.endsWith("scripts/verify.mjs")) continue;
      const text = readFileSync(path, "utf8");
      assert.equal(/import[\s\S]{0,80}StruggleDraft|StruggleDraft\.tsx/.test(text), false, path);
    }
    assert.equal(
      HASH_ROUTES.some((item) => /struggle/i.test(item.route) && item.route !== "Struggling mothers"),
      false,
    );
  });
});

function findTitle(id) {
  return hubs.problems.find((item) => item.id === id)?.title;
}
