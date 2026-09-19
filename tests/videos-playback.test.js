import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  hasPlayableMediaUrl,
  isVideoPlayable,
  videoCardAriaLabel,
  videoCardCta,
} from "../src/videos/playback.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"),
);

describe("videos catalog V01–V12", () => {
  it("is twelve unproduced drafts", () => {
    const ids = catalog.videos.map((item) => item.id);
    assert.deepEqual(ids, [
      "V01",
      "V02",
      "V03",
      "V04",
      "V05",
      "V06",
      "V07",
      "V08",
      "V09",
      "V10",
      "V11",
      "V12",
    ]);
    for (const video of catalog.videos) {
      assert.equal(video.videoUrl, null);
      assert.equal(video.publicEligible, false);
      assert.equal(video.publicationStatus, "UNPRODUCED");
      assert.equal(videoCardCta(video), "Open draft");
      assert.match(videoCardAriaLabel(video), /Open draft/);
      assert.equal(isVideoPlayable(video), false);
    }
  });
});

describe("Play gate", () => {
  it("rejects a publicEligible flag without real media", () => {
    const fake = {
      ...catalog.videos[0],
      publicEligible: true,
      clinicalStatus: "APPROVED",
      publicationStatus: "PUBLISHED",
      rightsStatus: "CLEARED",
      videoUrl: null,
    };
    assert.equal(isVideoPlayable(fake), false);
    assert.equal(videoCardCta(fake), "Open draft");
  });

  it("allows Play only with mp4/webm and cleared gates", () => {
    const playable = {
      ...catalog.videos[0],
      publicEligible: true,
      clinicalStatus: "APPROVED",
      publicationStatus: "PUBLISHED",
      rightsStatus: "CLEARED",
      videoUrl: "/media/V01.mp4",
    };
    assert.equal(hasPlayableMediaUrl(playable.videoUrl), true);
    assert.equal(isVideoPlayable(playable), true);
    assert.equal(videoCardCta(playable), "Play");
  });

  it("does not treat a youtube page as playable media", () => {
    assert.equal(hasPlayableMediaUrl("https://www.youtube.com/watch?v=abc"), false);
  });
});
