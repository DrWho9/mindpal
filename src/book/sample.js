/**
 * Built-in sample book from the packs already in this repo.
 * Pack A (100) + Pack B (110) = 210 original MindPal readings.
 * Not a copyrighted book. Cheap: no second copy of the text.
 */

import { buildChunks } from "./chapters.js";

export const SAMPLE_BOOK_ID = "mindpal-sample-readings";
export const SAMPLE_BOOK_NAME = "MindPal readings";

function readingLists(packs) {
  const readings = [];
  for (const pack of packs) {
    const list = Array.isArray(pack?.readings) ? pack.readings : Array.isArray(pack) ? pack : [];
    for (const reading of list) {
      if (!reading || !reading.title || !reading.body) continue;
      readings.push(reading);
    }
  }
  return readings;
}

export function sampleReadingCount(...packs) {
  return readingLists(packs).length;
}

export function sampleBookFromPacks(...packs) {
  const readings = readingLists(packs);
  const pages = readings.map((reading, index) => {
    const practice = reading.practice ? `\n\nPractice: ${reading.practice}` : "";
    return {
      pageIndex: index,
      text: `${reading.title}\n\n${reading.body}${practice}`.trim(),
    };
  });
  const chapters = readings.map((reading, index) => ({
    title: reading.title,
    pageIndex: index,
    depth: 0,
  }));
  const chunks = buildChunks(pages, chapters);
  return {
    id: SAMPLE_BOOK_ID,
    name: SAMPLE_BOOK_NAME,
    kind: "sample",
    chapters,
    chunks,
    detectMethod: "bundled-readings",
    pageCount: pages.length,
    readingCount: readings.length,
  };
}
