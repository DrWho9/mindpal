import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_FLOW_LINE } from "../src/today/steps.js";
import {
  GROWTH_BREATH_HERO,
  GROWTH_CHAPTER_SUMMARY,
  GROWTH_EYEBROW,
  GROWTH_FLOW,
  GROWTH_LEDE,
  GROWTH_OPEN,
  GROWTH_STEP_IDS,
  GROWTH_STEPS,
  GROWTH_STORAGE_KEY,
  GROWTH_TITLE,
  GROWTH_WIN_HERO,
  canOpenGrowthReading,
  canOpenGrowthStep,
  canOpenGrowthVerse,
  canOpenGrowthWin,
  emptyGrowth,
  growthReading,
  loadGrowth,
  markGrowth,
  nextGrowthStep,
  saveGrowth,
} from "../src/today/individual-growth.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
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

describe("individual growth path", () => {
  it("is the personal four-step morning path", () => {
    assert.deepEqual(GROWTH_STEP_IDS, ["settle", "verse", "reading", "win"]);
    assert.equal(GROWTH_STEPS.settle.number, 1);
    assert.equal(GROWTH_STEPS.settle.rowLabel, "Settle / breathe");
    assert.equal(GROWTH_STEPS.verse.rowLabel, "Verse of the day");
    assert.equal(GROWTH_STEPS.reading.rowLabel, "Peaceful reading");
    assert.equal(GROWTH_STEPS.win.rowLabel, "One win / intention");
    assert.equal(GROWTH_TITLE, "MindPal individual growth");
    assert.equal(GROWTH_EYEBROW, "MINDPAL · INDIVIDUAL GROWTH");
    assert.match(GROWTH_OPEN, /MindPal/);
    assert.doesNotMatch(GROWTH_OPEN, /together/);
    assert.match(GROWTH_LEDE, /four quiet steps/i);
    assert.match(GROWTH_FLOW, /Step 4 One win/);
    assert.match(GROWTH_BREATH_HERO, /not a team ritual/i);
    assert.match(GROWTH_BREATH_HERO, /counts down/i);
    assert.match(GROWTH_WIN_HERO, /intention/i);
    assert.equal(GROWTH_CHAPTER_SUMMARY, "Read the whole chapter — tap to expand");
    assert.match(HUB_FLOW_LINE, /Individual Growth/);
  });

  it("locks settle then verse then reading then a win", () => {
    let state = emptyGrowth(packA, monday);
    assert.equal(nextGrowthStep(state), "settle");
    assert.equal(canOpenGrowthVerse(state), false);
    assert.equal(canOpenGrowthReading(state), false);
    assert.equal(canOpenGrowthWin(state), false);
    assert.equal(canOpenGrowthStep(state, "settle"), true);
    assert.equal(markGrowth(state, "verse", "done", packA, monday).verse, "todo");
    assert.equal(markGrowth(state, "win", "done", packA, monday).win, "todo");
    state = markGrowth(state, "settle", "done", packA, monday);
    assert.equal(canOpenGrowthVerse(state), true);
    assert.equal(nextGrowthStep(state), "verse");
    state = markGrowth(state, "verse", "skipped", packA, monday);
    assert.equal(canOpenGrowthReading(state), true);
    assert.equal(nextGrowthStep(state), "reading");
    state = markGrowth(state, "reading", "done", packA, monday);
    assert.equal(canOpenGrowthWin(state), true);
    assert.equal(nextGrowthStep(state), "win");
    state = markGrowth(state, "win", "done", packA, monday);
    assert.equal(nextGrowthStep(state), null);
    assert.ok(growthReading(packA, emptyGrowth(packA, monday))?.id);
  });

  it("persists on mindpal.individualGrowth.v1 for the civil day", () => {
    const storage = memoryStorage();
    const saved = saveGrowth(
      markGrowth(emptyGrowth(packA, monday), "settle", "done", packA, monday),
      packA,
      storage,
      monday,
    );
    assert.equal(storage.store.has(GROWTH_STORAGE_KEY), true);
    assert.equal(JSON.parse(storage.store.get(GROWTH_STORAGE_KEY)).date, "2026-09-21");
    assert.equal(loadGrowth(packA, storage, monday).settle, "done");
    assert.equal(saved.settle, "done");
    const nextMorning = loadGrowth(packA, storage, tuesday);
    assert.equal(nextMorning.date, "2026-09-22");
    assert.equal(nextMorning.settle, "todo");
    assert.equal(nextMorning.win, "todo");
  });

  it("puts Individual Growth above Support chips and Team Growth on Today", () => {
    const growth = inject.indexOf("mpIndividualGrowthCard,{onOpenJournal");
    const chips = inject.indexOf("mpProblemHubList,{variant:`today`");
    const team = inject.indexOf("mp-band-team");
    assert.ok(growth > 0 && chips > growth && team > chips);
    assert.match(inject, /function mpIndividualGrowthCard\(/);
    assert.match(inject, /GROWTH_STEP_IDS\.map/);
    assert.match(inject, /Step \$\{t\.number\} · \$\{t\.rowLabel\}/);
    assert.match(inject, /Settle \/ breathe|GROWTH_STEPS/);
    assert.match(inject, /onClick:\(\)=>E\(`settle`,`done`\),children:`I’m done`/);
    assert.match(inject, /Skip this breath/);
    assert.match(inject, /variant:`growth`/);
    assert.match(inject, /Go to one win/);
    assert.match(inject, /TEAM GROWTH/);
    assert.match(inject, /BANDS\.filter\(e=>e\.id!==`morning`\)/);
    assert.doesNotMatch(inject, /See the two steps/);
    assert.doesNotMatch(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpCollapsedVerse/);
    assert.doesNotMatch(inject, /e\.id===`morning`\?\(0,A\.jsx\)\(mpWinsPanel/);
    assert.match(build, /src\/today\/individual-growth\.js/);
    assert.match(build, /mpIndividualGrowth=/);
  });

  it("shows the follow-along breath clip as a compact portrait thumbnail", () => {
    const css = readFileSync(join(root, "../src/patches/styles.css"), "utf8");
    const frame = css.match(/\.mp-team-breath-frame\{[^}]+\}/);
    const video = css.match(/\.mp-team-breath-video video\{[^}]+\}/);
    assert.ok(frame, "breath frame rule missing");
    assert.ok(video, "breath video rule missing");
    assert.match(frame[0], /width:160px/);
    assert.match(video[0], /aspect-ratio:9\/16/);
    assert.match(video[0], /object-fit:cover/);
    assert.doesNotMatch(video[0], /aspect-ratio:16\/9/);
    assert.match(inject, /className:`mp-team-breath-frame`/);
    assert.match(inject, /"aria-label":`Timed breath with Maddy`/);
    assert.match(inject, /controls:!0,playsInline:!0,preload:`metadata`,src:g/);
    assert.match(inject, /onClick:D,children:o\?`Pause`:`Start the breath`/);
    assert.match(inject, /onClick:\(\)=>E\(`settle`,`done`\),children:`I’m done`/);
    assert.match(inject, /Skip this breath/);
  });
});
