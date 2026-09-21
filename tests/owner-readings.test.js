import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AOD_FEATURED_READING_ID,
  featuredOwnerReadings,
  isOwnerReading,
  listOwnerReadings,
  mergeOwnerReadings,
  ownerCompanionOpener,
} from "../src/readings/owner.js";
import { canMarkDone } from "../src/readings/progress.js";
import { readingTags, supportUnlockMessage } from "../src/readings/tags.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const ownerReadings = JSON.parse(readFileSync(join(root, "../src/data/owner-readings.json"), "utf8"));
const draft = readFileSync(join(root, "../content/dna-dopamine-loop-v1.md"), "utf8");
globalThis.mpOwnerReadings = ownerReadings;

describe("owner AOD talk-through", () => {
  it("keeps the authored draft and JSON reading aligned", () => {
    const reading = listOwnerReadings()[0];
    assert.equal(reading.id, AOD_FEATURED_READING_ID);
    assert.match(draft, /Drugs and alcohol: the puppy-and-treat loop/);
    assert.match(draft, /not genetics/);
    assert.ok(draft.toLowerCase().indexOf("drugs and alcohol") < draft.search(/\bDNA\b/));
    assert.equal(featuredOwnerReadings("aod")[0].id, reading.id);
    assert.deepEqual(featuredOwnerReadings("mothers"), []);
    assert.ok(featuredOwnerReadings("mens-health").length >= 6);
    assert.equal(mergeOwnerReadings(packA)[0].id, reading.id);
  });

  it("stays educational, ungated, and crisis-safe", () => {
    const reading = listOwnerReadings()[0];
    assert.equal(isOwnerReading(reading), true);
    assert.equal(canMarkDone(packA.readings, [], reading), false);
    assert.match(supportUnlockMessage(reading, packA.readings, []), /always open/);
    assert.match(reading.body, /000/);
    assert.match(reading.body, /Need support/);
    assert.match(reading.body, /not a detox plan/);
    assert.ok(readingTags(reading).includes("learning-loop"));
    assert.ok(readingTags(reading).includes("alcohol"));
    assert.match(ownerCompanionOpener("aod"), /puppy-and-treat loop/);
    assert.match(ownerCompanionOpener("aod"), /not genetics/);
  });
});
