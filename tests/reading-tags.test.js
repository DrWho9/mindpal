import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  FEELING_TO_TAGS,
  SUPPORT_DISCLAIMER,
  TAG_VOCAB,
  THEME_LABEL_TO_TAGS,
  formatTag,
  readingTags,
  readingsForTags,
  supportUnlockMessage,
  tagsForFeeling,
  tagsForThemeLabel,
  usedTags,
} from "../src/readings/tags.js";
import {
  canMarkDone,
  emptyProgress,
  isDayUnlocked,
  markReadingDone,
} from "../src/readings/progress.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const readings = packA.readings;

describe("Pack A controlled tags", () => {
  it("stores hashtag-style tags without # in the pack JSON", () => {
    assert.equal(readings.length, 100);
    for (const item of readings) {
      assert.ok(Array.isArray(item.tags), `${item.id} missing tags`);
      assert.ok(item.tags.length >= 1, `${item.id} has empty tags`);
      for (const tag of item.tags) {
        assert.ok(TAG_VOCAB.includes(tag), `${item.id} unknown tag ${tag}`);
        assert.equal(tag.includes("#"), false);
      }
    }
  });

  it("maps every theme_label thoughtfully (not a fallback stub)", () => {
    const labels = [...new Set(readings.map((item) => item.theme_label))];
    assert.equal(labels.length, 100);
    for (const label of labels) {
      const mapped = THEME_LABEL_TO_TAGS[label];
      assert.ok(mapped, `unmapped theme_label: ${label}`);
      assert.deepEqual(tagsForThemeLabel(label), readingTags(readings.find((r) => r.theme_label === label)));
    }
  });

  it("covers the published feeling vocab", () => {
    const used = new Set(readings.flatMap((item) => item.tags));
    for (const tag of TAG_VOCAB) {
      assert.ok(used.has(tag), `vocab tag unused: ${tag}`);
    }
    assert.equal(formatTag("anxiety"), "#anxiety");
    assert.equal(usedTags(packA).length, TAG_VOCAB.length);
  });

  it("filters support lists by tag and by Feelings choice", () => {
    const sleep = readingsForTags(packA, ["sleep"]);
    assert.ok(sleep.length >= 6);
    assert.ok(sleep.every((item) => item.tags.includes("sleep")));
    assert.ok(sleep.every((item, i, list) => i === 0 || list[i - 1].day < item.day));

    const anxious = readingsForTags(packA, tagsForFeeling("anxious"));
    assert.deepEqual(tagsForFeeling("anxious"), FEELING_TO_TAGS.anxious);
    assert.ok(anxious.length >= 8);
    assert.ok(anxious.every((item) => item.tags.includes("anxiety") || item.tags.includes("worry")));
    assert.ok(anxious.some((item) => item.id === "catch-the-worry-snowball"));
  });

  it("keeps the sequential Done gate independent of Feelings support reads", () => {
    const laterSleep = readings.find((item) => item.day > 1 && item.tags.includes("sleep"));
    assert.ok(laterSleep);
    assert.equal(isDayUnlocked(readings, [], laterSleep.day), false);
    assert.equal(canMarkDone(readings, [], laterSleep), false);
    const note = supportUnlockMessage(laterSleep, readings, []);
    assert.match(note, /support/i);
    assert.match(note, /does not skip that gate/);
    assert.match(SUPPORT_DISCLAIMER, /not a diagnosis/);

    let progress = emptyProgress();
    progress = markReadingDone(progress, readings[0], readings);
    assert.equal(canMarkDone(readings, progress.completedIds, laterSleep), laterSleep.day === 2);
    assert.equal(canMarkDone(readings, [], readings[0]), true);
    assert.equal(isDayUnlocked(readings, [], 1), true);
  });
});
