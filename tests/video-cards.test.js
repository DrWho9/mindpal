import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  activateCoachCard,
  activateLibraryVideo,
  libraryCardModel,
} from "../src/videos/cards.js";
import {
  MADDY_CORE_IDS,
  isMaddyCompanionPlayable,
  maddyCompanionVideos,
  maddyPublishedSrc,
} from "../src/videos/maddy.js";

const root = dirname(fileURLToPath(import.meta.url));
const maddyCatalog = JSON.parse(
  readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"),
);
const heygenCatalog = JSON.parse(
  readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"),
);
const maddyInject = readFileSync(
  join(root, "../src/patches/watch-with-maddy.inject.js"),
  "utf8",
);
const coachInject = readFileSync(
  join(root, "../src/patches/signed-coaches.inject.js"),
  "utf8",
);

describe("video card click smoke", () => {
  it("fires a handler for every Maddy core clip and marks them playable", () => {
    const playable = maddyCompanionVideos(maddyCatalog);
    assert.equal(playable.length, 3);
    assert.deepEqual(
      playable.map((item) => item.id),
      MADDY_CORE_IDS,
    );
    let fired = 0;
    for (const video of playable) {
      assert.equal(isMaddyCompanionPlayable(video), true);
      const model = libraryCardModel(video);
      assert.equal(model.playable, true);
      assert.equal(model.cta, "Play");
      assert.equal(model.opens, "player");
      assert.equal(model.src, `/mindpal/videos/maddy/${video.src.split("/").pop()}`);
      assert.equal(model.src, maddyPublishedSrc(video.src));
      const result = activateLibraryVideo(video, () => {
        fired += 1;
      });
      assert.equal(result.fired, true);
      assert.equal(result.playable, true);
      assert.equal(result.cta, "Play");
    }
    assert.equal(fired, 3);
  });

  it("opens a script modal for every HeyGen Open draft card", () => {
    let fired = 0;
    const opened = [];
    for (const video of heygenCatalog.videos) {
      const result = activateLibraryVideo(video, (id) => {
        fired += 1;
        opened.push(id);
      });
      assert.equal(result.fired, true);
      assert.equal(result.playable, false);
      assert.equal(result.cta, "Open draft");
      assert.equal(result.opens, "script");
    }
    assert.equal(fired, 12);
    assert.deepEqual(
      opened,
      heygenCatalog.videos.map((item) => item.id),
    );
  });

  it("treats Feelings Maddy rows as Play with a Pages MP4 src", () => {
    const result = activateLibraryVideo({
      id: "maddy-welcome",
      title: "Welcome",
      kind: "maddy",
      src: "/videos/maddy/welcome.mp4",
      publishedSrc: "/mindpal/videos/maddy/welcome.mp4",
    });
    assert.equal(result.fired, true);
    assert.equal(result.playable, true);
    assert.equal(result.cta, "Play");
    assert.equal(result.src, "/mindpal/videos/maddy/welcome.mp4");
  });

  it("activates coach cards into a detail sheet without exposing look_id", () => {
    const look = {
      person: "Denyse",
      slug: "denyse",
      look_id: "ebed607d5f360211d5bee37951628fd6",
    };
    let opened = null;
    const result = activateCoachCard(look, (next) => {
      opened = next;
    });
    assert.equal(result.fired, true);
    assert.equal(result.opens, "coach-sheet");
    assert.equal(opened.person, "Denyse");
    assert.equal(result.person, "Denyse");
    assert.doesNotMatch(JSON.stringify(result), /ebed607d5f360211d5bee37951628fd6/);
  });
});

describe("card injects keep click + keyboard paths", () => {
  it("Maddy cards are buttons that call activateLibraryVideo", () => {
    assert.match(maddyInject, /type:`button`,className:`maddy-video-card`/);
    assert.match(maddyInject, /activateLibraryVideo\(t\)/);
    assert.match(maddyInject, /onKeyDown/);
    assert.match(maddyInject, /controls:!0,playsInline:!0/);
    assert.match(maddyInject, /MpLibraryHost/);
  });

  it("coach cards and related drafts call the shared activators", () => {
    assert.match(coachInject, /activateCoachCard\(e,n\)/);
    assert.match(coachInject, /activateLibraryVideo\(t,/);
    assert.match(coachInject, /onKeyDown/);
  });
});
