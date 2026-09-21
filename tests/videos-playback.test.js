import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  hasPlayableMediaUrl,
  isVideoPlayable,
  mergedLibraryVideos,
  overlayCatalogVideo,
  publishedLibrarySrc,
  captionsDisclosure,
  featuredPlayableVideo,
  videoCardAriaLabel,
  videoCardCta,
  videoDisplayTitle,
  videoDurationLabel,
} from "../src/videos/playback.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"),
);

const V02_FILE = "videos/v02/MP-V02-en-AU-v1.1b-web.mp4";
const V02_PUBLIC = "/mindpal/videos/v02/MP-V02-en-AU-v1.1b-web.mp4";

describe("videos catalog V01–V12", () => {
  it("keeps Wave B drafts unproduced and publishes Wave A V02", () => {
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
    const v02 = catalog.videos.find((item) => item.id === "V02");
    assert.equal(v02.videoUrl, V02_PUBLIC);
    assert.equal(v02.src, "/videos/v02/MP-V02-en-AU-v1.1b-web.mp4");
    assert.equal(v02.publicEligible, true);
    assert.equal(v02.publicationStatus, "PUBLISHED");
    assert.equal(v02.clinicalStatus, "APPROVED");
    assert.equal(v02.rightsStatus, "CLEARED");
    assert.equal(v02.captionUrl, undefined);
    assert.equal(v02.presenter, "Denyse");
    assert.equal(v02.placeholderLabel, "Ready to play");
    assert.equal(isVideoPlayable(v02), true);
    assert.equal(videoCardCta(v02), "Play");
    assert.equal(videoDisplayTitle(v02), "A gentle start to a difficult morning");
    assert.match(videoCardAriaLabel(v02), /Play/);
    assert.doesNotMatch(videoCardAriaLabel(v02), /\bV02\b/);
    assert.match(videoDurationLabel(v02), /45 seconds/);
    assert.match(captionsDisclosure(v02), /Captions are not on this clip yet/);
    assert.equal(featuredPlayableVideo(catalog)?.id, "V02");
    assert.equal(publishedLibrarySrc(v02.src), V02_PUBLIC);

    const path = join(root, "../", V02_FILE);
    assert.equal(existsSync(path), true, path);
    assert.equal(statSync(path).size, 2050995);
    assert.equal(readFileSync(path).subarray(4, 8).toString("ascii"), "ftyp");

    for (const video of catalog.videos.filter((item) => item.id !== "V02")) {
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

  it("overlays the published catalog onto a vendor draft row", () => {
    const vendor = {
      id: "V02",
      videoUrl: null,
      publicEligible: false,
      publicationStatus: "UNPRODUCED",
    };
    const merged = overlayCatalogVideo(vendor, catalog);
    assert.equal(merged.videoUrl, V02_PUBLIC);
    assert.equal(isVideoPlayable(merged), true);
    const list = mergedLibraryVideos([vendor, { id: "V03", videoUrl: null }], catalog);
    assert.equal(list[0].publicationStatus, "PUBLISHED");
    assert.equal(list[1].publicationStatus, "UNPRODUCED");
  });
});
