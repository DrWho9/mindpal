import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  directoryCtaLabel,
  directoryEmptyCopy,
  directoryHaystack,
  directoryOpenUrl,
  directorySpeakerOptions,
  directoryWatchUrl,
  filterDirectoryEntries,
  isDirectoryHeld,
  isDirectoryOpenable,
} from "../src/videos/yt-directory.js";

const root = dirname(fileURLToPath(import.meta.url));
const inject = readFileSync(join(root, "../src/patches/yt-directory.inject.js"), "utf8");
const speakers = [
  { id: "tony-robbins", name: "Tony Robbins", aliases: [] },
  { id: "russ-harris", name: "Russ Harris", aliases: [] },
  { id: "julie-smith", name: "Julie Smith", aliases: [] },
];

const catalog = [
  {
    id: "YT01",
    title: "Reframe Unhelpful Thoughts",
    creator: "Every Mind Matters",
    url: "https://www.youtube.com/watch?v=tfkhkFwCtxs",
    synopsis: "An introduction to checking an everyday thought against the evidence.",
    reviewStatus: "draft",
    topics: ["unhelpful-thoughts", "anxious"],
    editorialHold: false,
  },
  {
    id: "YT02",
    title: "Tackle your worries",
    creator: "Every Mind Matters",
    url: "https://www.youtube.com/watch?v=hv9AwGuY0iU",
    synopsis: "An overview of writing worries down.",
    reviewStatus: "draft",
    topics: ["worry-management", "anxious"],
    editorialHold: false,
  },
  {
    id: "EXT001",
    title: "The Struggle Switch - By Dr. Russ Harris",
    creator: "Dr. Russ Harris - Acceptance Commitment Therapy",
    url: "https://www.youtube.com/watch?v=rCp1l16GCXI",
    speakerIds: ["russ-harris"],
    topics: ["acceptance", "anxiety-education"],
    reviewStatus: "draft",
    editorialHold: false,
  },
  {
    id: "EXT028",
    title: "Use This Psychology Secret for Unlimited Motivation ALL DAY",
    creator: "Tony Robbins",
    url: "https://www.youtube.com/watch?v=-uLitAsfXkc",
    speakerIds: ["tony-robbins"],
    topics: ["motivation"],
    reviewStatus: "withheld",
    editorialHold: true,
    selection: { state: "hold" },
  },
  {
    id: "GHOST",
    title: "A card with no outbound link",
    creator: "Nobody",
    url: null,
    reviewStatus: "draft",
    topics: ["motivation"],
  },
];

describe("YouTube directory open gate", () => {
  it("opens draft rows that already have a YouTube URL", () => {
    assert.equal(isDirectoryHeld(catalog[0]), false);
    assert.equal(isDirectoryOpenable(catalog[0]), true);
    assert.equal(directoryCtaLabel(catalog[0]), "Open on YouTube");
    assert.equal(
      directoryOpenUrl(catalog[0]),
      "https://www.youtube.com/watch?v=tfkhkFwCtxs",
    );
  });

  it("opens held rows when a watch URL exists and accepts a bare watch id", () => {
    assert.equal(isDirectoryHeld(catalog[3]), true);
    assert.equal(isDirectoryOpenable(catalog[3]), true);
    assert.equal(directoryCtaLabel(catalog[3]), "Open on YouTube");
    assert.equal(
      directoryWatchUrl({ watchId: "NYzowu-EaPY" }),
      "https://www.youtube.com/watch?v=NYzowu-EaPY",
    );
  });

  it("keeps no-URL rows closed", () => {
    assert.equal(isDirectoryOpenable(catalog[4]), false);
    assert.equal(directoryOpenUrl(catalog[4]), null);
    assert.equal(directoryCtaLabel(catalog[4]), "This entry is not available to open here.");
  });
});

describe("YouTube directory search", () => {
  it("filters the default browse to openable, non-held cards", () => {
    const rows = filterDirectoryEntries(catalog, { speakers });
    assert.deepEqual(rows.map((row) => row.id), ["YT01", "YT02", "EXT001"]);
  });

  it("finds creators, speakers and tags, including held catalog matches", () => {
    const byCreator = filterDirectoryEntries(catalog, {
      query: "Every Mind Matters",
      speakers,
    });
    assert.deepEqual(byCreator.map((row) => row.id), ["YT01", "YT02"]);
    const bySpeaker = filterDirectoryEntries(catalog, {
      query: "tony robbins",
      speakers,
    });
    assert.deepEqual(bySpeaker.map((row) => row.id), ["EXT028"]);
    const byTag = filterDirectoryEntries(catalog, { query: "acceptance", speakers });
    assert.deepEqual(byTag.map((row) => row.id), ["EXT001"]);
    const bySelect = filterDirectoryEntries(catalog, {
      speakerId: "tony-robbins",
      speakers,
    });
    assert.deepEqual(bySelect.map((row) => row.id), ["EXT028"]);
  });

  it("never lists no-URL ghosts and explains an empty match once", () => {
    const rows = filterDirectoryEntries(catalog, { query: "Nobody", speakers });
    assert.deepEqual(rows, []);
    assert.match(directoryHaystack(catalog[4]), /nobody/);
    assert.match(directoryEmptyCopy({ query: "Nobody" }), /No matching video references/);
    assert.match(directoryEmptyCopy({}), /No openable YouTube links/);
  });

  it("lists speakers that have at least one URL-bearing video", () => {
    const options = directorySpeakerOptions(catalog, speakers);
    assert.deepEqual(
      options.map((item) => item.id),
      ["tony-robbins", "russ-harris"],
    );
  });
});

describe("YouTube directory page chrome", () => {
  it("has a Search submit control, Enter-capable form, and outbound CTA", () => {
    assert.match(inject, /role:`search`/);
    assert.match(inject, /onSubmit:applySearch/);
    assert.match(inject, /type:`submit`/);
    assert.match(inject, /children:`Search`/);
    assert.match(inject, /youtube-speaker-filter/);
    assert.match(inject, /Open on YouTube/);
    assert.match(inject, /directoryOpenUrl/);
    assert.match(inject, /filterDirectoryEntries/);
    assert.match(inject, /Draft candidate · human review pending/);
    assert.doesNotMatch(inject, /draft-review/);
    assert.doesNotMatch(inject, /not available to open here\. You can browse another/);
    assert.doesNotMatch(inject, /<iframe|<video/);
  });
});
