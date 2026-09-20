import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalizeTag, tagsForFeeling } from "../src/readings/tags.js";
import {
  VIDEO_DIRECTORY_LIMIT,
  collectFeelingMedia,
  itemTags,
  mediaForFeeling,
  mediaForTags,
  mediaSourceLabel,
} from "../src/videos/feeling-media.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const meditations = JSON.parse(readFileSync(join(root, "../src/data/yt-meditations.json"), "utf8"));
const sources = { catalog, maddy, meditations };

describe("video / Maddy / YT emotion tags", () => {
  it("stores controlled tags on every catalog, Maddy and seeded YT item", () => {
    assert.equal(catalog.videos.length, 12);
    for (const video of catalog.videos) {
      assert.ok(itemTags(video).length, video.id);
      assert.deepEqual(video.tags, itemTags(video));
    }
    for (const video of maddy.videos) {
      assert.ok(itemTags(video).length, video.id);
    }
    const ytRows = meditations.categories.flatMap((category) => category.entries || []);
    assert.ok(ytRows.length >= 10);
    for (const entry of ytRows) {
      assert.ok(itemTags(entry).length, entry.id);
    }
  });

  it("maps PR #8 mood hub onto low-mood and keeps hub ids usable", () => {
    assert.equal(canonicalizeTag("mood"), "low-mood");
    assert.deepEqual(itemTags({ problemTags: ["mood", "anxiety"] }), ["low-mood", "anxiety"]);
  });

  it("returns a tagged top-10 for an emotion pick, not a speaker dump", () => {
    const anxious = mediaForFeeling(sources, "anxious");
    assert.ok(anxious.length >= 4);
    assert.ok(anxious.length <= VIDEO_DIRECTORY_LIMIT);
    assert.ok(anxious.some((item) => item.source === "maddy"));
    assert.ok(anxious.some((item) => item.source === "youtube"));
    assert.ok(anxious.every((item) => itemTags(item).some((tag) => tagsForFeeling("anxious").includes(tag))));
    assert.equal(anxious[0].source, "maddy");
    assert.equal(mediaSourceLabel(anxious[0]), "Watch with Maddy");
    assert.ok(!anxious.some((item) => item.id === "tony-robbins"));
  });

  it("keeps sleep and stress lists inside the directory cap", () => {
    const sleep = mediaForTags(sources, ["sleep"]);
    const stress = mediaForTags(sources, ["stress"]);
    assert.ok(sleep.every((item) => itemTags(item).includes("sleep")));
    assert.ok(sleep.length <= VIDEO_DIRECTORY_LIMIT);
    assert.ok(stress.length <= VIDEO_DIRECTORY_LIMIT);
    assert.ok(collectFeelingMedia(sources).length > VIDEO_DIRECTORY_LIMIT);
  });
});
