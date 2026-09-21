import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HASH_ROUTES,
  LIVE_AI_CAVEAT,
  OVERLAY_PAGES,
  REQUIRED_SMOKES,
  blueprintFiles,
  encodeRouteHash,
  hashRouteNames,
} from "../src/qa/page-inventory.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
const inject = readFileSync(join(root, "src/patches/owner-ux.inject.js"), "utf8");
const vendor = readFileSync(join(root, "vendor/daystart-8f78bb0/index-BiA2yEms.js"), "utf8");

function allowlistFromBuild() {
  const match = build.match(
    /Ii=\[`Feelings`,`YouTube directory`,`Today`,`Readings`,`Team morning`,`Later`,`Evening`,`Problem`,`Struggling mothers`,`Drugs & alcohol`,`Explore`,`My diary`,`Focus`,`Companion`,/,
  );
  assert.ok(match, "build.mjs must patch the hash allowlist");
  const vendorList = vendor.match(/Ii=\[([^\]]+)\]/);
  assert.ok(vendorList, "vendor allowlist missing");
  const extra = [
    "Readings",
    "Team morning",
    "Later",
    "Evening",
    "Problem",
    "Struggling mothers",
    "Drugs & alcohol",
  ];
  const vendorNames = [...vendorList[1].matchAll(/`([^`]+)`/g)].map((item) => item[1]);
  return [...new Set([...vendorNames, ...extra])];
}

describe("page inventory", () => {
  it("lists every patched hash route once", () => {
    const names = hashRouteNames();
    assert.deepEqual(new Set(names).size, names.length);
    const allow = allowlistFromBuild();
    for (const name of names) {
      assert.ok(allow.includes(name), `missing from allowlist: ${name}`);
    }
    for (const name of allow) {
      assert.ok(names.includes(name), `inventory missing allowlist route: ${name}`);
    }
  });

  it("encodes spaces the way the SPA hash router does", () => {
    assert.equal(encodeRouteHash("Today"), "#Today");
    assert.equal(encodeRouteHash("YouTube directory"), "#YouTube%20directory");
    assert.equal(encodeRouteHash("Body, food and wellbeing"), "#Body%2C%20food%20and%20wellbeing");
    assert.equal(encodeRouteHash("Drugs & alcohol"), "#Drugs%20%26%20alcohol");
  });

  it("has a blueprint file for every route and overlay", () => {
    for (const file of blueprintFiles()) {
      const path = join(root, "docs/page-blueprints", file);
      assert.ok(existsSync(path), path);
      const text = readFileSync(path, "utf8");
      assert.match(text, /## Purpose/);
      assert.match(text, /## Expected UX/);
      assert.match(text, /## Enter \/ Send \/ search/);
      assert.match(text, /## Acceptance tests/);
      assert.match(text, /## Known gaps/);
    }
  });

  it("keeps pipeline docs and the first-pass audit", () => {
    for (const name of ["PAGE-AUDIT.md", "BUILD-PIPELINE.md", "FIRST-PASS-AUDIT.md"]) {
      assert.ok(existsSync(join(root, "docs", name)), name);
    }
    const pipeline = readFileSync(join(root, "docs/BUILD-PIPELINE.md"), "utf8");
    assert.match(pipeline, /Cloud agent build/);
    assert.match(pipeline, /Grok-class/);
    assert.match(pipeline, /highest available review model/);
    assert.match(pipeline, /DrWho9 squash/);
    assert.match(pipeline, /github\.io/);
    assert.ok(LIVE_AI_CAVEAT.includes("github.io"));
  });

  it("requires the four owner smokes", () => {
    assert.deepEqual(
      REQUIRED_SMOKES.map((item) => item.id),
      ["companion-choices", "youtube-search", "reflect-composer", "appointment-companion"],
    );
    for (const smoke of REQUIRED_SMOKES) {
      assert.ok(HASH_ROUTES.some((route) => route.route === smoke.route && route.smoke === smoke.id));
    }
  });

  it("does not invent a Men's Health hash route", () => {
    assert.ok(!hashRouteNames().some((name) => /^men(?:'|’)s\b/i.test(name)));
    assert.ok(OVERLAY_PAGES.some((item) => item.id === "profile-facts"));
  });
});

describe("primary CTA wiring (does not no-op)", () => {
  it("Companion choices and Send are real handlers", () => {
    assert.match(vendor, /label:`A small exercise`,value:`ordinary`/);
    assert.match(vendor, /label:`I’m distressed`,value:`distress`/);
    assert.match(vendor, /onClick:\(\)=>\{C\.current\+\+,w\.cancel\(\),T\.cancel\(\)/);
    assert.match(vendor, /Show practice choices/);
    assert.match(vendor, /Try the local practice guide/);
    assert.match(build, /onKeyDown:e=>\{\(e\.key===`Enter`&&\(e\.metaKey\|\|e\.ctrlKey\)\)&&\(e\.preventDefault\(\),D\(\)\)\}/);
    assert.match(build, /takeCompanionPrompt/);
  });

  it("YouTube directory search is visible and filters", () => {
    assert.match(vendor, /id:`youtube-search`/);
    assert.match(vendor, /Search titles, creators and descriptions/);
    assert.match(
      build,
      /function _e\(\{initialTopic:e=``,entries:t=T,onPractice:n,onDiary:r,onHelp:i\}\).*\[u,d]=\(0,_\.useState\)\(!0\)/,
    );
  });

  it("Reflect composer appears after a mode", () => {
    assert.match(vendor, /Write without prompts/);
    assert.match(vendor, /id:`reflection-text`/);
    assert.match(vendor, /Download a copy of my reflection/);
  });

  it("Appointment companion entry saves a prompt and opens Companion", () => {
    assert.match(inject, /function mpAppointmentCompanionCard\(/);
    assert.match(inject, /Talk this appointment through with Companion/);
    assert.match(inject, /data-mp-cta":`appointment-companion`/);
    assert.match(inject, /saveCompanionPrompt/);
    assert.match(build, /mpAppointmentCompanionCard,\{onCompanion:\(\)=>I\(`Companion`\)\}/);
    assert.match(build, /APPOINTMENT_COMPANION_PROMPT,appointmentCompanionPrompt/);
  });

  it("hub Companion buttons are not empty clicks", () => {
    assert.match(inject, /onClick:\(\)=>\{mpProblems\.saveCompanionPrompt\(l\.companionPrompt\);t&&t\(l\.companionPrompt\)\}/);
    assert.match(inject, /Talk this through with Companion/);
  });
});

describe("blueprint folder is complete", () => {
  it("has no leftover untitled drafts", () => {
    const files = readdirSync(join(root, "docs/page-blueprints")).filter((name) => name.endsWith(".md"));
    assert.ok(files.includes("README.md"));
    assert.deepEqual(
      files.filter((name) => name !== "README.md").sort(),
      blueprintFiles(),
    );
  });
});
