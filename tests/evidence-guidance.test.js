import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  EVIDENCE_GUIDANCE_TEMPLATE,
  HUB_ACCORDION_ORDER,
  TRUSTED_EVIDENCE_HOSTS,
  emptyEvidenceGuidance,
  evidenceGuidanceFor,
  evidenceNoteSourcesTrusted,
  guidanceCountsOk,
  isTrustedEvidenceUrl,
  listEvidenceNotes,
  listGuidanceBooks,
} from "../src/problems/evidence-guidance.js";
import { readingsForProblem } from "../src/problems/hubs.js";
import { formatTag, readingTags } from "../src/readings/tags.js";

const root = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, "../src/data/evidence-guidance.json"), "utf8"));
const packA = JSON.parse(readFileSync(join(root, "../src/data/pack-a.json"), "utf8"));
const inject = readFileSync(join(root, "../src/patches/owner-ux.inject.js"), "utf8");
globalThis.mpEvidenceGuidance = catalog;
globalThis.mpOwnerReadings = { readings: [] };

describe("evidence guidance module", () => {
  it("keeps a reusable accordion order other hubs can copy", () => {
    assert.deepEqual(HUB_ACCORDION_ORDER, ["readings", "evidence", "videos", "companion"]);
    assert.ok(EVIDENCE_GUIDANCE_TEMPLATE.notes[0].source.url === "");
    assert.ok(EVIDENCE_GUIDANCE_TEMPLATE.books[0].why === "");
    assert.deepEqual(emptyEvidenceGuidance("sleep").notes, []);
    assert.equal(evidenceGuidanceFor("sleep").books.length, 0);
  });

  it("authors mothers notes from trusted AU services — no invented studies", () => {
    const guidance = evidenceGuidanceFor("mothers", catalog);
    assert.ok(guidanceCountsOk(guidance), `notes ${guidance.notes.length} books ${guidance.books.length}`);
    assert.equal(guidance.notes.length, 5);
    assert.ok(evidenceNoteSourcesTrusted(guidance, catalog));
    for (const note of guidance.notes) {
      assert.ok(note.body.length > 180, `${note.id} is too thin`);
      assert.ok(isTrustedEvidenceUrl(note.source.url, catalog), note.source.url);
      assert.doesNotMatch(note.body, /fictional study|unpublished trial|made-up/i);
      assert.match(note.body, /not a diagnosis|not a label|cannot tell|not a court|MindPal cannot|not with an app/i);
    }
    const urls = guidance.notes.map((note) => note.source.url).join("\n");
    assert.match(urls, /panda\.org\.au/);
    assert.match(urls, /beyondblue\.org\.au/);
    assert.match(urls, /healthdirect\.gov\.au/);
    assert.match(urls, /aihw\.gov\.au/);
    assert.deepEqual(TRUSTED_EVIDENCE_HOSTS.sort(), [
      "aihw.gov.au",
      "beyondblue.org.au",
      "healthdirect.gov.au",
      "panda.org.au",
    ]);
    assert.equal(isTrustedEvidenceUrl("https://example.com/study"), false);
  });

  it("recommends real evidence-based books without replacing clinical care", () => {
    const books = listGuidanceBooks("mothers", catalog);
    assert.ok(books.length >= 4 && books.length <= 6);
    const titles = books.map((book) => book.title).join(" · ");
    assert.match(titles, /This Isn.t What I Expected/);
    assert.match(titles, /Dropping the Baby/);
    assert.match(titles, /What No One Tells You/);
    assert.match(titles, /Pregnancy and Postpartum Anxiety Workbook/);
    assert.match(titles, /Happiness Trap/);
    assert.match(titles, /Self-Compassion/);
    for (const book of books) {
      assert.ok(book.authors, book.id);
      assert.ok(book.why.length > 60, `${book.id} why is thin`);
      assert.match(book.why, /not a substitute|Not a clinic|not a diagnosis|not a postnatal|not instead of|not a perinatal textbook|optional company/i);
      if (book.url) assert.match(book.url, /^https:\/\//);
    }
    const notes = listEvidenceNotes("mothers", catalog);
    assert.match(notes.map((note) => note.body).join("\n"), /000/);
    assert.match(notes.map((note) => note.body).join("\n"), /13 11 14/);
  });

  it("wires openable mothers readings with Pack A chapter tags and the four folds", () => {
    assert.match(inject, /function mpFoldSection\(/);
    assert.match(inject, /function mpHubAccordion\(/);
    assert.match(inject, /function mpHubOpenableReadings\(/);
    assert.match(inject, /function mpEvidenceGuidancePanel\(/);
    assert.match(inject, /title:`Readings`/);
    assert.match(inject, /title:`Evidence & guidance`/);
    assert.match(inject, /title:`Videos`/);
    assert.match(inject, /title:`Companion`/);
    assert.match(inject, /mpHubOpenableReadings/);
    assert.match(inject, /mpHubChapterTags/);
    assert.match(inject, /DAILY READING · PACK A · DAY|SUPPORT READING · DAY/);
    assert.match(inject, /[ce]\.body\|\|``/);
    const mothers = readingsForProblem(packA, "mothers");
    assert.ok(mothers.length >= 8);
    for (const reading of mothers) {
      assert.ok((reading.body || "").trim().length > 80, `${reading.id} missing a full body`);
      const tags = readingTags(reading).map(formatTag);
      assert.ok(tags.length >= 1 && tags.every((tag) => tag.startsWith("#")), `${reading.id} tags`);
    }
  });
});
