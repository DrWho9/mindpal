import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  directoryCategoryId,
  directoryCtaLabel,
  directoryEmptyCopy,
  directoryHaystack,
  directoryOpenUrl,
  directorySpeakerOptions,
  directoryViewCount,
  directoryWatchUrl,
  filterDirectoryEntries,
  formatDirectoryViews,
  formatViewCount,
  groupDirectoryByCategory,
  isDirectoryHeld,
  isDirectoryOpenable,
  sortDirectoryByViews,
  withDirectorySnapshot,
} from "../src/videos/yt-directory.js";
import { parseWatchPageViewCount } from "../scripts/yt-refresh-views.mjs";

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
    assert.match(inject, /onChange:onSearchChange/);
    assert.match(inject, /type:`submit`/);
    assert.match(inject, /children:`Search`/);
    assert.match(inject, /youtube-speaker-filter/);
    assert.match(inject, /Open on YouTube/);
    assert.match(inject, /directoryOpenUrl/);
    assert.match(inject, /filterDirectoryEntries/);
    assert.match(inject, /Draft candidate · human review pending/);
    assert.match(inject, /formatDirectoryViews/);
    assert.match(inject, /groupDirectoryByCategory/);
    assert.match(inject, /mp-yt-dir-category/);
    assert.match(inject, /withDirectorySnapshot/);
    assert.match(inject, /reference, not a recommendation/);
    assert.match(inject, /External videos and your privacy/);
    assert.doesNotMatch(inject, /draft-review/);
    assert.doesNotMatch(inject, /not available to open here\. You can browse another/);
    assert.doesNotMatch(inject, /<iframe|<video/);
  });
});

const watch = (id) => `https://www.youtube.com/watch?v=${id}`;

describe("YouTube directory view order", () => {
  const ranked = [
    {
      id: "low",
      title: "Low",
      creator: "A",
      url: watch("aaaaaaaaaaa"),
      viewCount: 10,
      viewsCheckedAt: "2026-09-25",
      topics: ["anxious"],
      editorialHold: false,
    },
    {
      id: "none",
      title: "None",
      creator: "A",
      url: watch("bbbbbbbbbbb"),
      viewCount: null,
      viewsCheckedAt: "2026-09-25",
      viewCountStatus: "unavailable",
      topics: ["anxious"],
      editorialHold: false,
    },
    {
      id: "high",
      title: "High",
      creator: "A",
      url: watch("ccccccccccc"),
      viewCount: 2_300_000,
      viewsCheckedAt: "2026-09-25",
      topics: ["stress"],
      category: "stress",
      editorialHold: false,
    },
    {
      id: "held",
      title: "Held",
      creator: "A",
      url: watch("ddddddddddd"),
      viewCount: 9,
      viewsCheckedAt: "2026-09-25",
      topics: ["anxious"],
      reviewStatus: "withheld",
      editorialHold: true,
    },
    {
      id: "guess",
      title: "Guess",
      creator: "A",
      url: watch("eeeeeeeeeee"),
      viewCount: "2.3M",
      topics: ["anxious"],
      editorialHold: false,
    },
  ];

  it("sorts the highest view count first and leaves missing counts last", () => {
    assert.deepEqual(
      sortDirectoryByViews(ranked).map((row) => row.id),
      ["high", "low", "held", "none", "guess"],
    );
    assert.equal(directoryViewCount(ranked[1]), null);
    assert.equal(directoryViewCount(ranked[4]), null);
    assert.deepEqual(
      filterDirectoryEntries(ranked).map((row) => row.id),
      ["high", "low", "none", "guess"],
    );
    assert.deepEqual(
      filterDirectoryEntries(ranked, { query: "a" }).map((row) => row.id),
      ["high", "low", "held", "none", "guess"],
    );
  });

  it("keeps a speaker filter and still sorts that result by views", () => {
    const rows = ranked.map((row, index) =>
      index === 0 || index === 2 ? { ...row, speakerIds: ["russ-harris"] } : row,
    );
    assert.deepEqual(
      filterDirectoryEntries(rows, { speakerId: "russ-harris", speakers }).map((row) => row.id),
      ["high", "low"],
    );
  });

  it("groups by topic and sorts inside each category", () => {
    assert.equal(directoryCategoryId({ topics: ["unhelpful-thoughts", "anxious"] }), "anxiety");
    assert.equal(
      directoryCategoryId({
        topics: ["grounding", "attention"],
        proposedRelevance: { feelingIds: ["overwhelmed"] },
      }),
      "mindfulness",
    );
    assert.equal(directoryCategoryId({ topics: ["habits", "planning"] }), "habits");
    const groups = groupDirectoryByCategory(ranked.filter((row) => !row.editorialHold));
    assert.deepEqual(
      groups.map((group) => group.id),
      ["anxiety", "stress"],
    );
    assert.deepEqual(
      groups[0].entries.map((row) => row.id),
      ["low", "none", "guess"],
    );
    assert.deepEqual(
      groups[1].entries.map((row) => row.id),
      ["high"],
    );
  });

  it("formats a real count and labels a missing one", () => {
    assert.equal(formatViewCount(2_300_000), "2.3M views");
    assert.equal(formatViewCount(17_265_325), "17.3M views");
    assert.equal(formatViewCount(167_530), "167.5K views");
    assert.equal(formatViewCount(999), "999 views");
    assert.equal(formatDirectoryViews(ranked[2]), "2.3M views · checked 25 Sep 2026");
    assert.equal(formatDirectoryViews(ranked[1]), "View count unavailable · checked 25 Sep 2026");
    assert.equal(formatDirectoryViews({ viewCount: "2.3M" }), "View count unavailable");
  });

  it("does not invent a count when the snapshot missed a video", () => {
    const merged = withDirectorySnapshot(
      [{ id: "keep", url: watch("aaaaaaaaaaa"), title: "Keep", viewCount: 4 }],
      {
        entries: [
          { id: "new", url: watch("bbbbbbbbbbb"), title: "New", category: "sleep", topics: ["sleep"] },
        ],
      },
      {
        videos: {
          bbbbbbbbbbb: { viewCount: null, viewsCheckedAt: "2026-09-25", status: "unavailable" },
          ccccccccccc: { viewCount: 12.5, viewsCheckedAt: "2026-09-25", status: "ok" },
        },
      },
    );
    const added = merged.find((row) => row.id === "new");
    assert.equal(added.viewCount, null);
    assert.equal(added.viewCountStatus, "unavailable");
    assert.equal(merged.find((row) => row.id === "keep").viewCount, 4);
    const floated = withDirectorySnapshot(
      [{ id: "bad", url: watch("ccccccccccc"), title: "Bad" }],
      null,
      { videos: { ccccccccccc: { viewCount: 12.5, viewsCheckedAt: "2026-09-25", status: "ok" } } },
    );
    assert.equal(floated[0].viewCount, null);
    assert.equal(floated[0].viewCountStatus, "unavailable");
  });

  it("refuses abbreviated watch-page labels instead of expanding them", () => {
    assert.equal(
      parseWatchPageViewCount(
        `"videoViewCountRenderer":{"viewCount":{"simpleText":"167,530 views"},"shortViewCount":{"simpleText":"167K views"}`,
      ),
      167530,
    );
    assert.equal(
      parseWatchPageViewCount(`"videoViewCountRenderer":{"viewCount":{"simpleText":"2.3M views"}`),
      null,
    );
    assert.equal(parseWatchPageViewCount(`"shortViewCount":{"simpleText":"17M views"}`), null);
  });
});

describe("committed YouTube view snapshot", () => {
  const candidates = JSON.parse(
    readFileSync(join(root, "../src/data/yt-directory-candidates.json"), "utf8"),
  );
  const snapshot = JSON.parse(
    readFileSync(join(root, "../src/data/yt-directory-views.json"), "utf8"),
  );

  it("stores only integers or an explicit miss, and covers every candidate", () => {
    assert.ok(["youtube-data-api", "yt-dlp", "youtube-watch-page"].includes(snapshot.method));
    const perCategory = {};
    for (const entry of candidates.entries) {
      assert.equal(entry.reviewStatus, "draft");
      assert.equal(entry.editorialHold, false);
      assert.match(entry.sourceContext, /\S/);
      assert.match(entry.reviewNotes, /human review pending/);
      perCategory[entry.category] = (perCategory[entry.category] || 0) + 1;
      const id = new URL(entry.url).searchParams.get("v");
      const snap = snapshot.videos[id];
      assert.ok(snap, entry.id);
      assert.equal(snap.status, "ok");
      assert.equal(Number.isInteger(snap.viewCount), true);
      assert.ok(snap.viewCount >= 0);
      assert.match(snap.viewsCheckedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
    for (const count of Object.values(perCategory)) assert.ok(count <= 5);
    assert.ok(perCategory.anxiety >= 4);
    assert.ok(perCategory.anger >= 3);
    for (const snap of Object.values(snapshot.videos)) {
      if (snap.status === "ok") assert.equal(Number.isInteger(snap.viewCount), true);
      else assert.equal(snap.viewCount, null);
    }
    const merged = withDirectorySnapshot([], candidates, snapshot);
    for (const group of groupDirectoryByCategory(merged)) {
      let last = Infinity;
      let seenMissing = false;
      for (const entry of group.entries) {
        const count = directoryViewCount(entry);
        if (count == null) {
          seenMissing = true;
          continue;
        }
        assert.equal(seenMissing, false);
        assert.ok(count <= last);
        last = count;
      }
    }
  });
});
