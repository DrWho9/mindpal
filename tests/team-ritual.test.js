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
  TEAM_RITUAL_CHAPTER_SUMMARY,
  TEAM_RITUAL_EYEBROW,
  TEAM_RITUAL_FLOW,
  TEAM_RITUAL_LEDE,
  TEAM_RITUAL_OPEN,
  TEAM_RITUAL_SHORT,
  TEAM_RITUAL_STORAGE_KEY,
  TEAM_RITUAL_TITLE,
  TEAM_RITUAL_VERSE_HERO,
  breathClip,
  breathClipSrc,
  breathCueAt,
  canOpenReading,
  canOpenRitualStep,
  canOpenVerse,
  emptyRitual,
  formatBreathClock,
  loadRitual,
  markRitual,
  nextRitualStep,
  peacefulReadings,
  pickPeacefulReading,
  pickRitualVerse,
  ritualChapterTarget,
  ritualReading,
  ritualTradition,
  saveRitual,
  verseLaneForTradition,
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
    assert.equal(RITUAL_STEP_IDS[1], "verse");
    assert.equal(RITUAL_STEP_IDS[2], "reading");
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
    assert.match(TEAM_RITUAL_LEDE, /verse/i);
    assert.match(RITUAL_STEPS.breathe.blurb, /MindPal/);
    assert.match(TEAM_RITUAL_BREATH_HERO, /MindPal/);
    assert.match(TEAM_RITUAL_BREATH_HERO, /counts down/i);
    assert.match(TEAM_RITUAL_FLOW, /Step 2 Verse/);
    assert.match(TEAM_RITUAL_VERSE_HERO, /MindPal/);
    assert.equal(TEAM_RITUAL_CHAPTER_SUMMARY, "Read the whole chapter — tap to expand");
    assert.doesNotMatch(TEAM_RITUAL_LEDE, /hustle|crush|unlock potential|standup/i);
    assert.equal(RITUAL_STEPS.breathe.rowLabel, "Breathe (~3 min)");
    assert.equal(RITUAL_STEPS.verse.title, "Verse of the day");
    assert.equal(RITUAL_STEPS.reading.title, "Peaceful reading");
    assert.equal(RITUAL_STEPS.reading.number, 3);
  });

  it("locks breath then verse then the peaceful reading", () => {
    let state = emptyRitual(packA, monday);
    assert.equal(state.breathe, "todo");
    assert.equal(state.verse, "todo");
    assert.equal(state.reading, "todo");
    assert.equal(canOpenVerse(state), false);
    assert.equal(canOpenReading(state), false);
    assert.equal(canOpenRitualStep(state, "breathe"), true);
    assert.equal(nextRitualStep(state), "breathe");
    assert.equal(markRitual(state, "verse", "done", packA, monday).verse, "todo");
    assert.equal(markRitual(state, "reading", "done", packA, monday).reading, "todo");
    state = markRitual(state, "breathe", "done", packA, monday);
    assert.equal(canOpenVerse(state), true);
    assert.equal(canOpenReading(state), false);
    assert.equal(nextRitualStep(state), "verse");
    state = markRitual(state, "verse", "done", packA, monday);
    assert.equal(canOpenReading(state), true);
    assert.equal(nextRitualStep(state), "reading");
    state = markRitual(state, "reading", "done", packA, monday);
    assert.equal(nextRitualStep(state), null);
    const skipped = markRitual(emptyRitual(packA, monday), "breathe", "skipped", packA, monday);
    assert.equal(canOpenVerse(skipped), true);
    assert.equal(nextRitualStep(skipped), "verse");
    const skippedVerse = markRitual(skipped, "verse", "skipped", packA, monday);
    assert.equal(canOpenReading(skippedVerse), true);
    assert.equal(nextRitualStep(skippedVerse), "reading");
  });

  it("picks a catalog verse by tradition and never invents scripture", () => {
    const catalog = {
      default: {
        id: "default",
        lane: "christian",
        verse: { text: "This is the day that Yahweh has made.", reference: "Psalm 118:24 · WEB", url: "https://www.biblegateway.com/passage/?search=Psalm+118%3A24&version=NKJV" },
      },
      entries: [
        { id: "c1", date: "2026-09-21", lane: "christian", verse: { text: "Peace I leave with you.", reference: "John 14:27 · WEB", url: "https://www.biblegateway.com/passage/?search=John+14%3A27&version=NKJV" } },
        { id: "i1", lane: "islamic", verse: { text: "Truly, with hardship comes ease.", reference: "Qur’an 94:5–6", url: "https://quran.com/94" } },
        { id: "w1", lane: "wisdom", verse: { text: "Be kind whenever possible.", reference: "Attributed to the Dalai Lama (widely circulated teaching)", url: "https://www.dalailama.com/" } },
      ],
    };
    assert.equal(verseLaneForTradition("Christianity"), "christian");
    assert.equal(verseLaneForTradition("Coptic Orthodox"), "christian");
    assert.equal(verseLaneForTradition("Islam"), "islamic");
    assert.equal(verseLaneForTradition(""), "wisdom");
    assert.equal(verseLaneForTradition("No religion"), "wisdom");
    assert.equal(ritualTradition({ tradition: "Islam" }), "Islam");
    assert.equal(pickRitualVerse(catalog, monday, "Christianity").id, "c1");
    assert.equal(pickRitualVerse(catalog, monday, "Islam").id, "i1");
    assert.equal(pickRitualVerse(catalog, monday, "").id, "w1");
    assert.equal(ritualChapterTarget(catalog.entries[0]).kind, "web");
    assert.match(ritualChapterTarget(catalog.entries[0]).fetchUrl, /bible-api\.com/);
    assert.equal(ritualChapterTarget(catalog.entries[1]).kind, "source");
    assert.equal(ritualChapterTarget(catalog.entries[1]).fetchUrl, null);
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
    assert.equal(nextMorning.verse, "todo");
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
    assert.match(inject, /TEAM_RITUAL_FLOW/);
    assert.match(inject, /Step \$\{t\.number\} · \$\{t\.rowLabel\}|Step \$\{r\.number\} · \$\{r\.rowLabel\}/);
    assert.match(inject, /Go to the verse/);
    assert.match(inject, /Go to the peaceful reading/);
    assert.match(inject, /\[\"breathe\",a\],\[\"verse\",o\],\[\"reading\",s\]/);
    assert.match(inject, /mp-team-step-body/);
    assert.match(inject, /aria-expanded/);
    assert.match(inject, /Go to the verse/);
    assert.match(inject, /TEAM_RITUAL_CHAPTER_SUMMARY/);
    assert.match(inject, /Do this next/);
    assert.match(inject, /maddy-timed-breath|breathClipSrc/);
    assert.match(inject, /does not mark a Pack A/);
    assert.match(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpTeamRitualCard/);
    assert.match(inject, /onOpenTeamRitual/);
    assert.match(inject, /mpTeamRitual\.canOpenReading/);
    assert.match(inject, /mpTeamRitual\.canOpenVerse/);
    assert.match(inject, /onClick:\(\)=>E\(`breathe`,`done`\),children:`I’m done`/);
    assert.match(inject, /Skip this breath/);
    assert.doesNotMatch(inject, /onClick:\(\)=>E\(`breathe`,`done`\),children:`That’s enough`/);
    assert.match(inject, /That’s enough for this morning/);
    assert.match(inject, /See the three steps/);
    assert.doesNotMatch(inject, /hustle|crush the morning|standup/i);
    assert.match(build, /src\/today\/team-ritual\.js/);
    assert.match(build, /mpTeamRitual=/);
    assert.match(build, /TEAM_RITUAL_OPEN/);
    assert.match(build, /t===`Team morning`/);
    assert.match(build, /onOpenTeamRitual:\(\)=>I\(`Team morning`\)/);
  });
});
