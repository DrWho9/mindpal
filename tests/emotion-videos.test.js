import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { TAG_VOCAB } from "../src/readings/tags.js";
import {
  BROWSE_SPEAKERS_LABEL,
  CURATED_VIDEO_LIMIT,
  EMOTION_IDS,
  FEELING_EMOTIONS,
  curatedVideosForEmotion,
  emotionBreadcrumb,
  emotionLabel,
  emotionVideoCta,
  entryEmotions,
  normalizeEmotionId,
} from "../src/videos/emotions.js";

const root = dirname(fileURLToPath(import.meta.url));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const videos = JSON.parse(readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"));
const meditations = JSON.parse(
  readFileSync(join(root, "../src/data/yt-meditations.json"), "utf8"),
);
const inject = readFileSync(
  join(root, "../src/patches/feelings-videos.inject.js"),
  "utf8",
);
const catalogs = { maddy, videos, meditations };

describe("emotion vocabulary", () => {
  it("maps the eight Feelings directory emotions", () => {
    assert.deepEqual(EMOTION_IDS, FEELING_EMOTIONS.map(([id]) => id));
    assert.deepEqual(EMOTION_IDS, [
      "sleep",
      "anxiety",
      "stress",
      "low-mood",
      "anger",
      "motivation",
      "faith",
      "overwhelm",
    ]);
    assert.equal(normalizeEmotionId("sad"), "low-mood");
    assert.equal(normalizeEmotionId("anxious"), "anxiety");
    assert.equal(normalizeEmotionId("mood"), "low-mood");
    assert.equal(normalizeEmotionId("overwhelmed"), "overwhelm");
    assert.equal(emotionLabel("low-mood"), "Sad or low");
    assert.deepEqual(emotionBreadcrumb("anxiety"), [
      "Feelings",
      "Anxious or worried",
      "Videos",
    ]);
    assert.deepEqual(emotionBreadcrumb(""), ["Feelings", "Videos"]);
  });
});

describe("catalog tags and emotions", () => {
  it("tags every Maddy clip, HeyGen draft and meditation ref", () => {
    const allowedTag = (tag) => EMOTION_IDS.includes(tag) || TAG_VOCAB.includes(tag);
    const emotionsAreDirectory = (id, emotions, tags) => {
      assert.ok(Array.isArray(emotions) && emotions.length, `${id} needs emotions`);
      assert.ok(Array.isArray(tags) && tags.length, `${id} needs tags`);
      for (const emotion of emotions) {
        assert.ok(EMOTION_IDS.includes(emotion), `${id} ${emotion}`);
        assert.ok(tags.includes(emotion), `${id} tags should keep emotion ${emotion}`);
      }
      for (const tag of tags) assert.ok(allowedTag(tag), `${id} extra tag ${tag}`);
    };
    for (const video of [...maddy.videos, ...videos.videos]) {
      const tags = entryEmotions(video);
      assert.ok(tags.length, `${video.id} needs tags/emotions`);
      emotionsAreDirectory(video.id, video.emotions, video.tags);
      for (const tag of tags) assert.ok(EMOTION_IDS.includes(tag), `${video.id} ${tag}`);
    }
    for (const category of meditations.categories) {
      const inherited = entryEmotions(category);
      assert.ok(inherited.length, `${category.id} category needs tags`);
      emotionsAreDirectory(category.id, category.emotions, category.tags);
      for (const entry of category.entries) {
        const resolved = entryEmotions(entry, inherited);
        for (const emotion of inherited) {
          assert.ok(resolved.includes(emotion), `${entry.id} should keep ${emotion}`);
        }
        if (Array.isArray(entry.emotions) || Array.isArray(entry.tags)) {
          emotionsAreDirectory(entry.id, entry.emotions || inherited, entry.tags || inherited);
        }
      }
    }
  });

  it("accepts PR #8 problemTags as the same directory", () => {
    assert.deepEqual(entryEmotions({ problemTags: ["mood", "stress"] }), [
      "low-mood",
      "stress",
    ]);
  });
});

describe("curated emotion video directory", () => {
  it("lists at most 10 tagged items and prefers Maddy then playable then YT", () => {
    for (const id of EMOTION_IDS) {
      const items = curatedVideosForEmotion(id, catalogs);
      assert.ok(items.length > 0, `${id} should have curated videos`);
      assert.ok(items.length <= CURATED_VIDEO_LIMIT, `${id} exceeded ${CURATED_VIDEO_LIMIT}`);
      const kinds = items.map((item) => item.kind);
      const firstDraft = kinds.indexOf("mindpal-draft");
      const lastPreferred = Math.max(
        kinds.lastIndexOf("maddy"),
        kinds.lastIndexOf("mindpal-playable"),
        kinds.lastIndexOf("youtube"),
      );
      if (firstDraft >= 0 && lastPreferred >= 0) {
        assert.ok(lastPreferred < firstDraft, `${id} should keep drafts after playable/YT`);
      }
    }
  });

  it("scopes sleep to Maddy breath, V12 and sleep YouTube link-outs", () => {
    const items = curatedVideosForEmotion("sleep", catalogs);
    const ids = items.map((item) => item.id);
    assert.ok(ids.includes("maddy-timed-breath"));
    assert.ok(ids.includes("V12"));
    assert.ok(ids.includes("YT-SLEEP-01"));
    assert.ok(!ids.includes("V08"));
    assert.equal(items.find((item) => item.id === "maddy-timed-breath").cta, "Play");
    assert.equal(items.find((item) => item.id === "V12").cta, "Open draft");
    assert.equal(items.find((item) => item.id === "YT-SLEEP-01").cta, "Open on YouTube");
    assert.equal(
      items.find((item) => item.id === "YT-SLEEP-01").openUrl,
      "https://www.youtube.com/watch?v=FiPDV9L5qpQ",
    );
  });

  it("keeps Play/Open labels for in-context CTAs", () => {
    assert.equal(emotionVideoCta({ kind: "maddy", cta: "Play" }), "Play");
    assert.equal(emotionVideoCta({ kind: "mindpal-draft" }), "Open draft");
    assert.equal(emotionVideoCta({ kind: "youtube" }), "Open on YouTube");
    assert.equal(BROWSE_SPEAKERS_LABEL, "Browse all videos by speaker");
  });
});

describe("Feelings Videos is not the speaker directory", () => {
  it("renders a breadcrumb directory with a text-only speaker link", () => {
    assert.match(inject, /feelings-space/);
    assert.match(inject, /mp-emotion-crumb/);
    assert.match(inject, /BROWSE_SPEAKERS_LABEL/);
    assert.match(inject, /className:`text-button`/);
    assert.match(inject, /children:`Videos`/);
    assert.match(inject, /MpEmotionVideos/);
    assert.doesNotMatch(inject, /\bge\(/);
    assert.doesNotMatch(inject, /Choose or edit speakers/);
    assert.doesNotMatch(inject, /YouTube video directory/);
    assert.doesNotMatch(inject, /Browse the whole video directory/);
    assert.doesNotMatch(inject, /<iframe/);
  });
});
