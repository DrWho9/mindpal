import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MADDY_CORE_IDS,
  MADDY_PACK_ID,
  hasMaddyMediaUrl,
  isMaddyCompanionPlayable,
  maddyCompanionVideos,
  maddyPublishedSrc,
} from "../src/videos/maddy.js";
import { isVideoPlayable, videoCardCta } from "../src/videos/playback.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"),
);
const publishedCatalog = JSON.parse(
  readFileSync(join(root, "../content/videos.json"), "utf8"),
);
const heygenCatalog = JSON.parse(
  readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"),
);

const FILE_SIZES = {
  "welcome.mp4": 2163855,
  "tip.mp4": 1946389,
  "timed-breath.mp4": 6126749,
};

describe("Maddy companion catalog", () => {
  it("restores the three core finished clips", () => {
    assert.equal(catalog.pack_id, MADDY_PACK_ID);
    assert.equal(catalog.heygenDraftGate, false);
    const ids = catalog.videos.map((item) => item.id);
    assert.deepEqual(ids, MADDY_CORE_IDS);
    assert.deepEqual(
      catalog.videos.map((item) => item.title),
      ["Welcome", "Daily tip", "Timed breath"],
    );
    for (const video of catalog.videos) {
      assert.equal(video.person, "Maddy");
      assert.equal(video.heygenDraft, false);
      assert.match(video.src, /^\/videos\/maddy\/.+\.mp4$/);
      assert.equal(isMaddyCompanionPlayable(video), true);
      assert.equal(
        maddyPublishedSrc(video.src),
        `/mindpal${video.src}`,
      );
    }
  });

  it("ships the MP4s in the published tree", () => {
    for (const [name, size] of Object.entries(FILE_SIZES)) {
      const path = join(root, "../videos/maddy", name);
      assert.equal(existsSync(path), true, path);
      assert.equal(statSync(path).size, size, name);
      const header = readFileSync(path).subarray(4, 8).toString("ascii");
      assert.equal(header, "ftyp");
    }
  });

  it("keeps the public catalog on the historical Pages path", () => {
    assert.deepEqual(
      publishedCatalog.videos.map((item) => item.id),
      MADDY_CORE_IDS,
    );
    assert.equal(publishedCatalog.heygenDraftGate, false);
  });
});

describe("Maddy play gate is not the HeyGen draft gate", () => {
  it("plays finished MP4s without publicEligible or clinical approval", () => {
    const playable = maddyCompanionVideos(catalog);
    assert.equal(playable.length, 3);
    for (const video of playable) {
      assert.equal(video.publicEligible, undefined);
      assert.equal(isVideoPlayable(video), false);
      assert.equal(isMaddyCompanionPlayable(video), true);
      assert.equal(hasMaddyMediaUrl(video.src), true);
    }
  });

  it("does not treat HeyGen V01–V12 rows as companion clips", () => {
    for (const video of heygenCatalog.videos) {
      assert.equal(isMaddyCompanionPlayable(video), false);
      if (video.id === "V02") {
        assert.equal(isVideoPlayable(video), true);
        assert.equal(videoCardCta(video), "Play");
      } else {
        assert.equal(isVideoPlayable(video), false);
        assert.equal(videoCardCta(video), "Open draft");
      }
    }
  });

  it("rejects a HeyGen-draft flag even when an mp4 path is present", () => {
    assert.equal(
      isMaddyCompanionPlayable({
        ...catalog.videos[0],
        heygenDraft: true,
      }),
      false,
    );
  });
});
