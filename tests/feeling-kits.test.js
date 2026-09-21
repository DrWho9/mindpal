import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  KIT_READING_LIMIT,
  chapterTagChips,
  chapterTags,
  curatedReadingIdsForHub,
  feelingKit,
  findFeelingKitSpec,
} from "../src/feelings/kits.js";
import { readingsForProblem } from "../src/problems/hubs.js";
import { videosForIds } from "../src/videos/emotions.js";

const root = dirname(fileURLToPath(import.meta.url));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const ownerReadings = JSON.parse(readFileSync(join(root, "../src/data/owner-readings.json"), "utf8"));
const hubs = JSON.parse(readFileSync(join(root, "../src/data/problem-hubs.json"), "utf8"));
const kits = JSON.parse(readFileSync(join(root, "../src/data/feeling-kits.json"), "utf8"));
const maddy = JSON.parse(readFileSync(join(root, "../src/data/maddy-companion.json"), "utf8"));
const videos = JSON.parse(readFileSync(join(root, "../src/data/videos-catalog.json"), "utf8"));
const meditations = JSON.parse(readFileSync(join(root, "../src/data/yt-meditations.json"), "utf8"));
const kitUi = readFileSync(join(root, "../src/patches/feelings-readings.inject.js"), "utf8");
const note = readFileSync(join(root, "../content/FEELINGS-CURATION.md"), "utf8");

globalThis.mpOwnerReadings = ownerReadings;
globalThis.mpFeelingKits = kits;

const catalogs = { maddy, videos, meditations };

describe("feeling kits", () => {
  it("curates mothers as an openable Pack A kit, not a title-only day dump", () => {
    const spec = findFeelingKitSpec("mothers");
    assert.equal(spec.startHereId, "rest-is-not-a-prize");
    assert.ok(spec.readingIds.length >= 6 && spec.readingIds.length <= KIT_READING_LIMIT);
    const kit = feelingKit("mothers", { pack: packA, hubs, catalogs, kitCatalog: kits });
    assert.equal(kit.startHere.id, "rest-is-not-a-prize");
    assert.ok(kit.startHere.body.includes("Rest is not a prize"));
    assert.ok(kit.startHere.chapterChips.includes("#sleep"));
    assert.ok(kit.startHere.chapterChips.includes("#self-compassion"));
    assert.ok(kit.readings.every((item) => item.body && item.body.length > 80));
    assert.ok(kit.readings.every((item) => item.chapterChips.length));
    assert.ok(kit.readings.every((item) => item.title));
    assert.equal(
      kit.readings.some((item) => /^Day \d+/.test(item.title)),
      false,
    );
    const ordered = readingsForProblem(packA, "mothers");
    assert.equal(ordered[0].id, "rest-is-not-a-prize");
    assert.deepEqual(
      ordered.slice(1).map((item) => item.id),
      spec.readingIds,
    );
  });

  it("keeps drugs & alcohol featured talk-through and a curated shortlist", () => {
    const kit = feelingKit("aod", { pack: packA, hubs, catalogs, kitCatalog: kits });
    assert.equal(kit.startHere.id, "dna-dopamine-loop-v1");
    assert.match(kit.startHere.title, /Drugs and alcohol/);
    assert.match(kit.startHere.body, /puppy/);
    assert.ok(kit.readings.length >= 6 && kit.readings.length <= 10);
    assert.equal(kit.videos.some((item) => item.id === "V02"), true);
    assert.equal(kit.videos.find((item) => item.id === "V02").cta, "Play");
    assert.equal(kit.videos.find((item) => item.id === "V07").cta, "Open draft");
    const aod = readingsForProblem(packA, "aod");
    assert.equal(aod[0].id, "dna-dopamine-loop-v1");
    assert.ok(aod.slice(1).every((item) => item.pack !== "owner"));
  });

  it("adds evidence & guidance with real AU outbound links and no invented DOIs", () => {
    const mothers = feelingKit("mothers", { pack: packA, hubs, catalogs, kitCatalog: kits });
    assert.ok(mothers.evidence);
    assert.match(mothers.evidence.disclaimer, /not a diagnosis/);
    assert.ok(mothers.evidence.notes.some((note) => /Perinatal load/i.test(note.title)));
    assert.ok(mothers.evidence.notes.some((note) => /Sleep debt/i.test(note.title)));
    assert.ok(mothers.evidence.guides.some((item) => item.url.includes("cope.org.au")));
    assert.ok(mothers.evidence.guides.some((item) => item.url.includes("beyondblue.org.au")));
    assert.ok(mothers.evidence.guides.some((item) => item.url.includes("healthdirect.gov.au")));
    assert.ok(mothers.evidence.sources.some((item) => item.url.includes("panda.org.au")));
    const blob = JSON.stringify(mothers.evidence);
    assert.doesNotMatch(blob, /doi\.org\/10\./i);
    assert.doesNotMatch(blob, /DirectLine/);
    for (const hub of ["aod", "anxiety", "sleep", "low-mood"]) {
      const kit = feelingKit(hub, { pack: packA, hubs, catalogs, kitCatalog: kits });
      assert.ok(kit.evidence, `${hub} should have evidence`);
      assert.ok(kit.evidence.guides.every((item) => /^https:\/\//.test(item.url)));
    }
  });

  it("surfaces Pack A chapter emotion tags and maps aliases", () => {
    const sleep = feelingKit("sleep", { pack: packA, hubs, catalogs, kitCatalog: kits });
    assert.ok(chapterTags(sleep.startHere).includes("sleep"));
    assert.ok(chapterTagChips(sleep.startHere).some((chip) => chip.startsWith("#")));
    assert.equal(findFeelingKitSpec("sad").id, "low-mood");
    assert.equal(findFeelingKitSpec("anxious").id, "anxiety");
    assert.deepEqual(curatedReadingIdsForHub("mood")[0], curatedReadingIdsForHub("low-mood")[0]);
  });

  it("resolves editorial video ids without inventing HeyGen renders", () => {
    const items = videosForIds(["V02", "maddy-timed-breath", "YT-KIND-01", "V07"], catalogs);
    assert.deepEqual(
      items.map((item) => item.id),
      ["V02", "maddy-timed-breath", "YT-KIND-01", "V07"],
    );
    assert.equal(items[0].cta, "Play");
    assert.equal(items[1].cta, "Play");
    assert.equal(items[2].cta, "Open on YouTube");
    assert.equal(items[3].cta, "Open draft");
  });

  it("renders an accordion kit with openable readings and queues a high-model pass", () => {
    assert.match(kitUi, /mpFeelingKitAccordion/);
    assert.match(kitUi, /Start here/);
    assert.match(kitUi, /Evidence & guidance/);
    assert.match(kitUi, /Talk \/ Companion/);
    assert.match(kitUi, /Journal \/ wins/);
    assert.match(kitUi, /Open the reading/);
    assert.match(kitUi, /mpKitReadingArticle/);
    assert.doesNotMatch(kitUi, /matching Pack A reading/);
    assert.doesNotMatch(kitUi, /Locked on morning path/);
    assert.match(note, /high-model|high model|High-quality model/i);
    assert.match(note, /mothers/);
    assert.match(note, /rewrite reading blurbs/i);
  });
});
