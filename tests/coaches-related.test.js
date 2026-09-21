import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  RELATED_VIDEO_IDS_BY_SLUG,
  coachKeys,
  textLeaksInternalCoachData,
  videosForCoach,
  visibleCoachFields,
} from "../src/coaches/related.js";
import { videoCardCta, isVideoPlayable } from "../src/videos/playback.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"),
);
const inject = readFileSync(
  join(root, "../src/patches/signed-coaches.inject.js"),
  "utf8",
);

const looks = {
  denyse: {
    person: "Denyse",
    slug: "denyse",
    kind: "PRO",
    look_id: "ebed607d5f360211d5bee37951628fd6",
    group_id: "a836efb07078478eb852d8f28ee6eb02",
    blurb: "A calm, encouraging presence for a steady start.",
    drive_jpg: "https://drive.google.com/file/d/hidden/view",
  },
  chloe: {
    person: "Chloe",
    slug: "chloe",
    kind: "PRO",
    look_id: "066e68ab8625652acb9af86e07576b49",
    group_id: "cbfc4a8084544718bf0cb730e4d37879",
    blurb: "Clear, practical encouragement.",
  },
  callum: {
    person: "Callum",
    slug: "callum",
    kind: "PRO",
    look_id: "5b45d9db78081d98369a8ad3ad92accb",
    group_id: "ec5618ceea404763823791f71c49acdb",
    blurb: "Grounded, everyday support.",
  },
};

describe("signed coach related videos", () => {
  it("maps each signed look to Explore drafts by slug", () => {
    const denyse = videosForCoach(looks.denyse, catalog.videos).map((item) => item.id);
    const chloe = videosForCoach(looks.chloe, catalog.videos).map((item) => item.id);
    const callum = videosForCoach(looks.callum, catalog.videos).map((item) => item.id);
    assert.deepEqual(denyse, RELATED_VIDEO_IDS_BY_SLUG.denyse);
    assert.deepEqual(chloe, RELATED_VIDEO_IDS_BY_SLUG.chloe);
    assert.deepEqual(callum, RELATED_VIDEO_IDS_BY_SLUG.callum);
  });

  it("treats Markham as Callum’s signed look alias", () => {
    const keys = coachKeys(looks.callum);
    assert.ok(keys.includes("callum"));
    assert.ok(keys.includes("markham"));
    const aliased = videosForCoach(looks.callum, [
      { id: "V99", title: "Markham welcome draft", videoUrl: null, publicEligible: false },
    ]);
    assert.equal(aliased[0]?.id, "V99");
  });

  it("uses Play for published V02 and Open draft for remaining rows", () => {
    for (const look of Object.values(looks)) {
      for (const video of videosForCoach(look, catalog.videos)) {
        if (video.id === "V02") {
          assert.equal(isVideoPlayable(video), true);
          assert.equal(videoCardCta(video), "Play");
        } else {
          assert.equal(isVideoPlayable(video), false);
          assert.equal(videoCardCta(video), "Open draft");
        }
      }
    }
  });
});

describe("coach UI must not leak catalog internals", () => {
  it("visible fields omit look_id, group_id and Drive URLs", () => {
    const visible = visibleCoachFields(looks.denyse);
    assert.deepEqual(Object.keys(visible).sort(), ["blurb", "kind", "person", "slug"]);
    assert.equal(visible.person, "Denyse");
    assert.equal(textLeaksInternalCoachData(JSON.stringify(visible), looks.denyse), false);
  });

  it("coach modal inject is a button card with no visible hex", () => {
    assert.match(inject, /type:`button`,className:`coach-card`/);
    assert.match(inject, /data-look-id/);
    assert.match(inject, /This is a signed DayStart coach look/);
    assert.match(inject, /Related Explore videos/);
    assert.match(inject, /Open draft|videoCardCta/);
    assert.doesNotMatch(inject, /look_id ·/);
    assert.doesNotMatch(inject, /className:`coach-look-id`/);
    assert.doesNotMatch(inject, /drive\.google\.com/);
    assert.doesNotMatch(inject, /group_id/);
    assert.doesNotMatch(inject, /public\/coaches\/\*\.webp/);
    assert.doesNotMatch(inject, /HeyGen spend/);
    assert.equal(
      textLeaksInternalCoachData(inject, { look_id: looks.denyse.look_id, group_id: looks.denyse.group_id }),
      false,
    );
  });
});
