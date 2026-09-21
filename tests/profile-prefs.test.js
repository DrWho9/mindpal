import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ACCOUNTS_KEY, SESSION_KEY, sessionPreferences } from "../src/prefs/faith.js";
import {
  AGE_BANDS,
  FACTS_DISCLAIMER,
  GENDERS,
  factsAreYouthSafe,
  factsForProfile,
  hasProfileDemographics,
  isYouthBand,
  prefsFromProfileChoice,
  profileSummary,
  setSessionProfilePrefs,
} from "../src/prefs/profile.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");
const profileSrc = readFileSync(join(root, "../src/prefs/profile.js"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    store,
  };
}

function signedInStorage(prefs = {}) {
  return memoryStorage({
    [SESSION_KEY]: "Sam",
    [ACCOUNTS_KEY]: JSON.stringify({
      version: 1,
      accounts: [{ username: "Sam", preferences: prefs }],
    }),
  });
}

const FAKE_CLAIM = /\d\s?%|journal of|lancet|pubmed|study found|undetected depression|undiagnosed depression/i;

function assertTwoLiteracyFacts(facts, { youth = false } = {}) {
  assert.equal(facts.length, 2);
  for (const item of facts) {
    assert.ok(item.body && item.body.length > 20);
    assert.ok(item.action && item.action.length > 8);
    assert.match(`${item.body} ${item.action}`, /MindPal/);
    assert.doesNotMatch(`${item.body} ${item.action}`, FAKE_CLAIM);
    assert.doesNotMatch(item.body, /you have undiagnosed/i);
  }
  if (youth) {
    assert.equal(factsAreYouthSafe(facts), true);
    assert.match(facts.map((item) => item.body).join(" "), /sleep|wind-down|mate|trusted adult/i);
    assert.doesNotMatch(
      facts.map((item) => `${item.body} ${item.action}`).join(" "),
      /heart|depression|diagnos|disease|weight|midlife|menopause/i,
    );
  }
}

describe("local profile age and gender", () => {
  it("keeps the AU age bands and inclusive gender chips", () => {
    assert.deepEqual(
      AGE_BANDS.map((item) => item.label),
      ["Under 18", "18–29", "30–39", "40–49", "50–59", "60+"],
    );
    assert.deepEqual(
      GENDERS.map((item) => item.label),
      ["Man", "Woman", "Non-binary", "Prefer not to say"],
    );
  });

  it("stores ageBand and gender on the same local-account preferences object", () => {
    const storage = signedInStorage({ showCopticDate: false, faithStance: "secular" });
    setSessionProfilePrefs({ ageBand: "40–49", gender: "Man" }, storage);
    const prefs = sessionPreferences(storage);
    assert.equal(prefs.ageBand, "40_49");
    assert.equal(prefs.gender, "man");
    assert.equal(prefs.faithStance, "secular");
    assert.equal(prefs.showCopticDate, false);
    assert.equal(hasProfileDemographics(prefs), true);
    assert.equal(profileSummary(prefs), "40–49 · Man");
  });

  it("does not treat an unanswered new profile as already set", () => {
    const unanswered = prefsFromProfileChoice({ ageBand: "", gender: "" });
    assert.deepEqual(unanswered, { ageBand: "", gender: "" });
    assert.equal(hasProfileDemographics(unanswered), false);
    assert.equal(profileSummary(unanswered), "Not set yet");
    assert.equal(hasProfileDemographics({}), false);
    assert.equal(factsForProfile({}).length, 0);
  });
});

describe("MindPal facts by age and gender", () => {
  it("returns exactly two facts for the locked midlife buckets", () => {
    const men4049 = factsForProfile("40_49", "man");
    assertTwoLiteracyFacts(men4049);
    assert.match(men4049[0].body, /Men just under 50/);
    assert.match(men4049[0].body, /can lose interest/);
    assert.match(men4049[0].body, /MindPal/);
    assert.match(men4049[0].action, /10 minutes a day on MindPal|Ten minutes a day on MindPal/);

    const men5059 = factsForProfile("50_59", "man");
    assertTwoLiteracyFacts(men5059);
    assert.match(men5059[0].body, /fifties|50/);
    assert.match(men5059[0].body, /strength/i);

    const women4049 = factsForProfile("40_49", "woman");
    assertTwoLiteracyFacts(women4049);
    assert.match(women4049[0].body, /women in their forties|midlife load/i);

    const women5059 = factsForProfile("50_59", "woman");
    assertTwoLiteracyFacts(women5059);
    assert.match(women5059[0].body, /fifties|midlife load/i);
  });

  it("keeps Under 18 on two gentle youth-safe facts", () => {
    for (const gender of ["man", "woman", "nonbinary", "prefer_not"]) {
      const facts = factsForProfile("under_18", gender);
      assertTwoLiteracyFacts(facts, { youth: true });
      assert.equal(facts[0].id, "youth-sleep");
      assert.equal(facts[1].id, "youth-mates");
    }
    assert.equal(isYouthBand("under_18"), true);
    assert.equal(isYouthBand({ ageBand: "Under 18" }), true);
    assert.equal(isYouthBand("40_49"), false);
  });

  it("uses general wellbeing facts for prefer-not and non-binary adults", () => {
    const quiet = factsForProfile("40_49", "prefer_not");
    assertTwoLiteracyFacts(quiet);
    assert.doesNotMatch(quiet.map((item) => item.body).join(" "), /\bMen\b|\bwomen\b/i);

    const nonbinary = factsForProfile("50_59", "nonbinary");
    assertTwoLiteracyFacts(nonbinary);
    assert.doesNotMatch(nonbinary.map((item) => item.body).join(" "), /\bMen\b|\bwomen\b/i);
  });

  it("covers other adult bands without inventing statistics", () => {
    for (const age of ["18_29", "30_39", "60_plus"]) {
      for (const gender of ["man", "woman", "prefer_not"]) {
        assertTwoLiteracyFacts(factsForProfile(age, gender));
      }
    }
    assert.match(FACTS_DISCLAIMER, /not a diagnosis/);
    assert.match(FACTS_DISCLAIMER, /not medical advice/);
    assert.match(FACTS_DISCLAIMER, /MindPal/);
    assert.doesNotMatch(profileSrc, FAKE_CLAIM);
  });
});

describe("profile preference surfaces", () => {
  it("asks age then gender after faith, then shows a two-fact MindPal card", () => {
    assert.match(inject, /function mpNeedsProfileSetup/);
    assert.match(inject, /function mpProfilePrefQuestions/);
    assert.match(inject, /function mpMindPalFactsCard/);
    assert.match(inject, /function mpAccountProfileCard/);
    assert.match(inject, /mpNeedsFaithSetup\(\)\|\|mpNeedsProfileSetup\(\)/);
    assert.match(inject, /if\(profileAsk\)/);
    assert.match(inject, /setProfileAsk\(mpNeedsProfileSetup\(\)\)/);
    assert.match(inject, /mpProfile\.AGE_BANDS\.map/);
    assert.match(inject, /mpProfile\.GENDERS\.map/);
    assert.match(inject, /Step 1 · Age/);
    assert.match(inject, /Step 2 · Gender/);
    assert.match(inject, /Step 3 · MindPal facts/);
    assert.match(inject, /MINDPAL FACTS/);
    assert.match(inject, /mpProfile\.FACTS_DISCLAIMER/);
    assert.match(inject, /not a diagnosis/);
    assert.match(inject, /mpAccountProfileCard/);
    assert.doesNotMatch(inject, /date of birth|YYYY/);
  });

  it("does not default new local profiles to an age or gender", () => {
    assert.match(build, /ageBand:``,gender:``/);
    assert.match(build, /moduleSource\("src\/prefs\/profile\.js"\)/);
    assert.match(build, /mpProfile=\{AGE_BANDS/);
  });
});
