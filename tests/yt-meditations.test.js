import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MEDITATION_CATEGORY_IDS,
  categoryFillNote,
  entriesForCategory,
  formatMeditationViews,
  isMeditationOpenable,
  isYoutubeOutboundUrl,
  meditationCategories,
  meditationCtaLabel,
  meditationOpenUrl,
} from "../src/videos/yt-meditations.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, "../src/data/yt-meditations.json"), "utf8"),
);
const inject = readFileSync(
  join(root, "../src/patches/yt-meditations.inject.js"),
  "utf8",
);

describe("YouTube meditation category structure", () => {
  it("has all ten locked categories", () => {
    const ids = meditationCategories(catalog).map((item) => item.id);
    assert.deepEqual(ids, MEDITATION_CATEGORY_IDS);
    assert.deepEqual(
      catalog.categories.map((item) => item.title),
      [
        "Sleep / insomnia talk-down",
        "Anxiety / worry",
        "Stress / overwhelm",
        "Morning / start-of-day",
        "Body scan / somatic",
        "Self-compassion / kindness",
        "Breathing / calm focus",
        "Grief / heavy emotions (gentle)",
        "Short ≤10 min beginners",
        "Faith-friendly / Christian contemplative",
      ],
    );
  });

  it("seeds Sleep and Anxiety and leaves the rest filling", () => {
    const sleep = catalog.categories.find((item) => item.id === "sleep");
    const anxiety = catalog.categories.find((item) => item.id === "anxiety");
    assert.equal(sleep.status, "seeded");
    assert.equal(anxiety.status, "seeded");
    assert.equal(entriesForCategory(sleep).length, 5);
    assert.equal(entriesForCategory(anxiety).length, 5);
    assert.equal(categoryFillNote(sleep), "5 of 10 listed · filling");
    for (const category of catalog.categories.filter((item) => item.status === "filling")) {
      const count = entriesForCategory(category).length;
      assert.ok(count <= 2, category.id);
      assert.equal(
        categoryFillNote(category),
        count === 0 ? "This category is filling." : `${count} of 10 listed · filling`,
      );
    }
  });

  it("opens seeded Sleep/Anxiety rows and shows views TBD when unknown", () => {
    const sleep = catalog.categories.find((item) => item.id === "sleep");
    for (const entry of sleep.entries) {
      assert.equal(isMeditationOpenable(entry), true);
      assert.equal(meditationCtaLabel(entry), "Open on YouTube");
    }
    assert.equal(
      meditationOpenUrl(sleep.entries[0]),
      "https://www.youtube.com/watch?v=FiPDV9L5qpQ",
    );
    assert.equal(formatMeditationViews(sleep.entries[0]), "~18M");
    assert.equal(formatMeditationViews(sleep.entries[2]), "views TBD");
  });
});

describe("YouTube outbound gate", () => {
  it("allows watch and channel URLs and rejects embeds", () => {
    assert.equal(
      isYoutubeOutboundUrl("https://www.youtube.com/watch?v=MFxlK1ZvOmA"),
      "https://www.youtube.com/watch?v=MFxlK1ZvOmA",
    );
    assert.equal(
      isYoutubeOutboundUrl("https://www.youtube.com/@headspace"),
      "https://www.youtube.com/@headspace",
    );
    assert.equal(isYoutubeOutboundUrl("https://www.youtube.com/embed/MFxlK1ZvOmA"), null);
  });

  it("keeps held or unchecked rows closed", () => {
    const held = {
      url: "https://www.youtube.com/watch?v=FiPDV9L5qpQ",
      availability: "checked",
      editorialHold: true,
      checkedAt: "2026-09-20",
    };
    assert.equal(isMeditationOpenable(held), false);
    assert.equal(meditationOpenUrl(held), null);
    assert.equal(meditationCtaLabel(held), "This entry is not available to open here.");
  });
});

describe("meditation section is category chips and link-out only", () => {
  it("has ranking help, chips and no embed chrome", () => {
    assert.match(inject, /Voice-guided meditations on YouTube/);
    assert.match(inject, /How these lists are ranked/);
    assert.match(inject, /mindpal-yt-chips/);
    assert.match(inject, /Open on YouTube/);
    assert.match(inject, /not available to open here/);
    assert.match(inject, /This category is filling/);
    assert.doesNotMatch(inject, /<iframe|<video/);
    assert.match(inject, /target:`_blank`/);
  });
});
