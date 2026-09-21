import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STEP_IDS, BANDS, nextStepId, emptyDay } from "../src/today/steps.js";
import {
  BREATH_CYCLE_SEC,
  BREATH_DURATION_SEC,
  HEAVY_RITUAL_TAGS,
  PEACEFUL_THEME_LABELS,
  RITUAL_STEP_IDS,
  RITUAL_STEPS,
  TEAM_RITUAL_BREATH_ID,
  TEAM_RITUAL_BREATH_SRC,
  TEAM_RITUAL_BREATH_HERO,
  TEAM_RITUAL_EYEBROW,
  TEAM_RITUAL_LEDE,
  TEAM_RITUAL_OPEN,
  TEAM_RITUAL_SHORT,
  TEAM_RITUAL_STORAGE_KEY,
  TEAM_RITUAL_TITLE,
  breathClip,
  breathClipSrc,
  breathCueAt,
  canOpenReading,
  emptyRitual,
  formatBreathClock,
  loadRitual,
  markRitual,
  nextRitualStep,
  peacefulReadings,
  pickPeacefulReading,
  ritualReading,
  saveRitual,
} from "../src/today/team-ritual.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
const build = readFileSync(join(root, "../scripts/build.mjs"), "utf8");

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    store,
  };
}

const monday = new Date(2026, 8, 21, 8, 15, 0);
const tuesday = new Date(2026, 8, 22, 8, 15, 0);

describe("work team morning ritual", () => {
  it("stays optional and off the numbered Morning → Day → Night path", () => {
    assert.deepEqual(STEP_IDS, ["readings", "focus", "later", "evening"]);
    assert.deepEqual(BANDS[0].stepIds, ["readings"]);
    assert.equal(nextStepId(emptyDay(monday)), "readings");
    assert.equal(STEP_IDS.includes("breathe"), false);
    assert.equal(RITUAL_STEP_IDS[0], "breathe");
    assert.equal(RITUAL_STEP_IDS[1], "reading");
  });

  it("uses warm team-settle copy, not hustle language", () => {
    assert.equal(TEAM_RITUAL_TITLE, "MindPal work team morning ritual");
    assert.equal(TEAM_RITUAL_SHORT, "MindPal team morning settle");
    assert.equal(TEAM_RITUAL_EYEBROW, "MINDPAL · OPTIONAL · WORK TEAM");
    assert.equal(
      TEAM_RITUAL_OPEN,
      "MindPal is glad you’re here — let’s settle in together before the day gets loud.",
    );
    assert.match(TEAM_RITUAL_LEDE, /MindPal/);
    assert.match(TEAM_RITUAL_LEDE, /optional/i);
    assert.match(TEAM_RITUAL_LEDE, /peaceful reading/i);
    assert.match(RITUAL_STEPS.breathe.blurb, /MindPal/);
    assert.match(TEAM_RITUAL_BREATH_HERO, /MindPal/);
    assert.match(TEAM_RITUAL_BREATH_HERO, /counts down/i);
    assert.doesNotMatch(TEAM_RITUAL_LEDE, /hustle|crush|unlock potential|standup/i);
    assert.equal(RITUAL_STEPS.breathe.rowLabel, "Breathe (~3 min)");
    assert.equal(RITUAL_STEPS.reading.title, "Peaceful reading");
  });

  it("locks breath before the peaceful reading", () => {
    let state = emptyRitual(packA, monday);
    assert.equal(state.breathe, "todo");
    assert.equal(state.reading, "todo");
    assert.equal(canOpenReading(state), false);
    assert.equal(nextRitualStep(state), "breathe");
    assert.equal(markRitual(state, "reading", "done", packA, monday).reading, "todo");
    state = markRitual(state, "breathe", "done", packA, monday);
    assert.equal(canOpenReading(state), true);
    assert.equal(nextRitualStep(state), "reading");
    state = markRitual(state, "reading", "done", packA, monday);
    assert.equal(nextRitualStep(state), null);
    const skipped = markRitual(emptyRitual(packA, monday), "breathe", "skipped", packA, monday);
    assert.equal(canOpenReading(skipped), true);
    assert.equal(nextRitualStep(skipped), "reading");
  });

  it("picks one calm Pack A reading for the civil day", () => {
    const pool = peacefulReadings(packA);
    assert.ok(pool.length >= 8, `expected a peaceful pool, got ${pool.length}`);
    assert.deepEqual(
      [...new Set(pool.map((item) => item.theme_label))].sort(),
      [...PEACEFUL_THEME_LABELS].sort(),
    );
    for (const reading of pool) {
      const tags = [...(reading.theme_tags || []), ...(reading.tags || [])];
      assert.equal(
        tags.some((tag) => HEAVY_RITUAL_TAGS.includes(tag)),
        false,
        `${reading.id} should stay off heavy hubs`,
      );
      assert.ok(
        tags.includes("gratitude") || tags.includes("mindset") || tags.includes("calm"),
        `${reading.id} should be gratitude / mindset / calm`,
      );
    }
    const first = pickPeacefulReading(packA, monday);
    const again = pickPeacefulReading(packA, monday);
    const nextDay = pickPeacefulReading(packA, tuesday);
    assert.equal(first.id, again.id);
    assert.ok(first.id);
    assert.ok(nextDay.id);
    const stored = emptyRitual(packA, monday);
    assert.equal(ritualReading(packA, stored).id, first.id);
    assert.equal(stored.readingId, first.id);
  });

  it("reuses Maddy’s timed breath and a ~3 minute cue clock", () => {
    assert.equal(BREATH_DURATION_SEC, 180);
    assert.equal(TEAM_RITUAL_BREATH_ID, "maddy-timed-breath");
    assert.equal(breathClip(maddy).id, "maddy-timed-breath");
    assert.equal(breathClipSrc(maddy), TEAM_RITUAL_BREATH_SRC);
    assert.equal(formatBreathClock(180), "3:00");
    assert.equal(formatBreathClock(9), "0:09");
    assert.equal(breathCueAt(2).phase, "settle");
    assert.equal(breathCueAt(2).count, null);
    assert.equal(breathCueAt(8).phase, "inhale");
    assert.deepEqual(
      [0, 1.4, 1.5, 3, 4.5, 5.9].map((offset) => breathCueAt(8 + offset).count),
      [4, 4, 3, 2, 1, 1],
    );
    assert.equal(breathCueAt(8 + 4 * 1.5).phase, "hold");
    assert.deepEqual(
      [0, 1.5, 3, 4.5].map((offset) => breathCueAt(8 + 4 * 1.5 + offset).count),
      [4, 3, 2, 1],
    );
    assert.equal(breathCueAt(8 + 8 * 1.5).phase, "exhale");
    assert.deepEqual(
      [0, 1.5, 3, 4.5, 6, 7.5].map((offset) => breathCueAt(8 + 8 * 1.5 + offset).count),
      [6, 5, 4, 3, 2, 1],
    );
    assert.equal(breathCueAt(8 + BREATH_CYCLE_SEC).phase, "inhale");
    assert.equal(breathCueAt(8 + BREATH_CYCLE_SEC).count, 4);
    assert.equal(breathCueAt(180).phase, "done");
    assert.equal(breathCueAt(180).count, null);
  });

  it("persists on mindpal.teamMorningRitual.v1 for the civil day", () => {
    const storage = memoryStorage();
    const saved = saveRitual(
      markRitual(emptyRitual(packA, monday), "breathe", "done", packA, monday),
      packA,
      storage,
      monday,
    );
    assert.equal(storage.store.has(TEAM_RITUAL_STORAGE_KEY), true);
    assert.equal(JSON.parse(storage.store.get(TEAM_RITUAL_STORAGE_KEY)).date, "2026-09-21");
    assert.equal(loadRitual(packA, storage, monday).breathe, "done");
    assert.equal(saved.breathe, "done");
    const nextMorning = loadRitual(packA, storage, tuesday);
    assert.equal(nextMorning.date, "2026-09-22");
    assert.equal(nextMorning.breathe, "todo");
    assert.equal(nextMorning.reading, "todo");
  });

  it("wires an optional Morning card and a breath-then-reading page", () => {
    assert.match(inject, /function mpTeamRitualCard\(/);
    assert.match(inject, /function mpTeamRitualPage\(/);
    assert.match(inject, /Work team morning ritual/);
    assert.match(inject, /TEAM_RITUAL_OPEN/);
    assert.match(inject, /TEAM_RITUAL_BREATH_HERO/);
    assert.match(inject, /mp-team-ritual-open/);
    assert.match(inject, /mp-team-breath-count/);
    assert.match(inject, /mp-team-breath-overlay/);
    assert.match(inject, /TEAM_RITUAL_SHORT|Team morning settle/);
    assert.match(inject, /Step 1 · Breathe/);
    assert.match(inject, /Step 2 · Peaceful reading/);
    assert.match(inject, /Do this next/);
    assert.match(inject, /maddy-timed-breath|breathClipSrc/);
    assert.match(inject, /does not mark a Pack A/);
    assert.match(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpTeamRitualCard/);
    assert.match(inject, /onOpenTeamRitual/);
    assert.match(inject, /mpTeamRitual\.canOpenReading/);
    assert.match(inject, /onClick:\(\)=>E\(`breathe`,`done`\),children:`I’m done`/);
    assert.match(inject, /Skip this breath/);
    assert.doesNotMatch(inject, /onClick:\(\)=>E\(`breathe`,`done`\),children:`That’s enough`/);
    assert.match(inject, /That’s enough for this morning/);
    assert.doesNotMatch(inject, /hustle|crush the morning|standup/i);
    assert.match(build, /src\/today\/team-ritual\.js/);
    assert.match(build, /mpTeamRitual=/);
    assert.match(build, /TEAM_RITUAL_OPEN/);
    assert.match(build, /t===`Team morning`/);
    assert.match(build, /onOpenTeamRitual:\(\)=>I\(`Team morning`\)/);
  });
});
