import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import packA from "../src/data/pack-a.json" with { type: "json" };
import packB from "../src/data/pack-b.json" with { type: "json" };
import {
  AMBIENT_MODES,
  BOOK_AMBIENT_KEY,
  BOOK_DESIGN_KEY,
  BOOK_POS_KEY,
  CHUNK_CHARS,
  DESIGN_THEMES,
  PDFJS_SCRIPT,
  PDFJS_WORKER,
  SAMPLE_BOOK_ID,
  ambientUserGain,
  bookFromPdf,
  bookIdForName,
  buildChunks,
  chapterProgressPct,
  chaptersFromHeadings,
  chunkIndexForChapter,
  clampChunkIndex,
  createMemoryBookLibrary,
  defaultDesign,
  designCssVars,
  designWithTheme,
  filterChapters,
  isHeadingLine,
  loadAmbientPrefs,
  loadDesign,
  normalizeAmbientPrefs,
  normalizeDesign,
  noteFor,
  pageTurnDelta,
  positionFor,
  readPositions,
  rememberOpen,
  sampleBookFromPacks,
  sampleReadingCount,
  saveAmbientPrefs,
  saveDesign,
  writeNote,
} from "../src/book/index.js";
import { hashRouteNames } from "../src/qa/page-inventory.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

describe("book chapters", () => {
  it("recognises the old heading heuristics", () => {
    assert.equal(isHeadingLine("Chapter 3"), true);
    assert.equal(isHeadingLine("Part IV"), true);
    assert.equal(isHeadingLine("1.2 A small door"), true);
    assert.equal(isHeadingLine("THE QUIET ROAD"), true);
    assert.equal(isHeadingLine("This is a full sentence."), false);
    assert.equal(isHeadingLine(""), false);
  });

  it("builds screen-sized chunks under the recovered chapter", () => {
    const long = "word ".repeat(400).trim();
    const pages = [
      { pageIndex: 0, text: "Chapter 1\n\n" + "A short opening paragraph." },
      { pageIndex: 1, text: long },
      { pageIndex: 2, text: "Chapter 2\n\nSecond chapter starts here." },
    ];
    const chapters = chaptersFromHeadings(pages);
    assert.ok(chapters.some((chapter) => chapter.title === "Chapter 1"));
    assert.ok(chapters.some((chapter) => chapter.title === "Chapter 2"));
    const chunks = buildChunks(pages, chapters);
    assert.ok(chunks.length > 3);
    assert.ok(chunks.every((chunk) => chunk.text.length <= CHUNK_CHARS * 1.6 + 20));
    const second = chunks.find((chunk) => chunk.chapterTitle === "Chapter 2");
    assert.ok(second);
    assert.equal(chunkIndexForChapter(chunks, { title: "Chapter 2", pageIndex: 2 }), chunks.indexOf(second));
    assert.equal(chapterProgressPct(chunks, 0) > 0, true);
    assert.equal(clampChunkIndex(99, chunks.length), chunks.length - 1);
    assert.deepEqual(
      filterChapters(chapters, "chapter 2").map((chapter) => chapter.title),
      ["Chapter 2"],
    );
  });

  it("falls back to sections when a PDF has no headings", () => {
    const pages = Array.from({ length: 8 }, (_, i) => ({
      pageIndex: i,
      text: `Just a paragraph on page ${i + 1}. Nothing that looks like a title.`,
    }));
    const chapters = chaptersFromHeadings(pages);
    assert.ok(chapters.length >= 2);
    assert.match(chapters[0].title, /^Section /);
    const chunks = buildChunks(pages, chapters);
    assert.equal(chunks[0].text.includes("page 1"), true);
  });

  it("turns pages from a swipe or a side tap", () => {
    assert.equal(pageTurnDelta({ dx: -80, dy: 4, width: 300, x: 200 }), 1);
    assert.equal(pageTurnDelta({ dx: 80, dy: 4, width: 300, x: 20 }), -1);
    assert.equal(pageTurnDelta({ dx: 4, dy: 4, width: 300, x: 20 }), -1);
    assert.equal(pageTurnDelta({ dx: 2, dy: 1, width: 300, x: 240 }), 1);
    assert.equal(pageTurnDelta({ dx: 10, dy: 80, width: 300, x: 40 }), 0);
  });
});

describe("book design", () => {
  it("keeps the recovered themes and defaults to paper at the old size", () => {
    assert.equal(DESIGN_THEMES.paper.bg, "#faf6ef");
    assert.equal(DESIGN_THEMES.night.ink, "#e8e6e3");
    assert.equal(defaultDesign().textSize, "md");
    const vars = designCssVars(defaultDesign());
    assert.equal(vars["--book-bg"], "#faf6ef");
    assert.equal(vars["--book-size"], "1.12rem");
    assert.match(vars["--book-font"], /Georgia/);
  });

  it("persists font, theme, colours and text size", () => {
    const storage = memoryStorage();
    const next = saveDesign(
      designWithTheme({ font: "rounded", textSize: "lg", textColor: "#112233", bgColor: "#abcdef" }, "sepia"),
      storage,
    );
    assert.equal(next.theme, "sepia");
    assert.equal(next.bgColor, DESIGN_THEMES.sepia.bg);
    assert.equal(next.font, "rounded");
    assert.equal(next.textSize, "lg");
    const loaded = loadDesign(storage);
    assert.deepEqual(loaded, next);
    assert.equal(storage.getItem(BOOK_DESIGN_KEY).includes("sepia"), true);
    assert.equal(normalizeDesign({ theme: "nope", font: "comic", textSize: "huge" }).theme, "paper");
  });
});

describe("book persistence", () => {
  it("stores more than one PDF and reads them back", async () => {
    const library = createMemoryBookLibrary();
    const first = new Uint8Array([1, 2, 3]).buffer;
    const second = new Uint8Array([9, 8]).buffer;
    await library.putBook({ id: bookIdForName("Quiet.pdf"), name: "Quiet.pdf", buffer: first, savedAt: 10 });
    await library.putBook({ id: bookIdForName("Night.pdf"), name: "Night.pdf", buffer: second, savedAt: 20 });
    const names = (await library.listBooks()).map((row) => row.name);
    assert.deepEqual(names, ["Night.pdf", "Quiet.pdf"]);
    const row = await library.getBook("quiet");
    assert.equal(row.buffer.byteLength, 3);
    await library.deleteBook("quiet");
    assert.equal(await library.getBook("quiet"), null);
  });

  it("remembers a reading position, including the old single-book shape", () => {
    const legacy = memoryStorage({
      [BOOK_POS_KEY]: JSON.stringify({ name: "Quiet.pdf", chunkIndex: 4 }),
    });
    assert.equal(positionFor(legacy, bookIdForName("Quiet.pdf")), 4);
    const storage = memoryStorage();
    rememberOpen(storage, "quiet", "Quiet.pdf", 2);
    assert.equal(positionFor(storage, "quiet"), 2);
    assert.equal(readPositions(storage).lastId, "quiet");
    writeNote(storage, "quiet", "Quiet.pdf", "a private line");
    assert.equal(noteFor(storage, "quiet", "Quiet.pdf"), "a private line");
    const oldNotes = memoryStorage({
      "mindpal-book-notes-v1": JSON.stringify({ "Quiet.pdf": "from the old shell" }),
    });
    assert.equal(noteFor(oldNotes, "quiet", "Quiet.pdf"), "from the old shell");
  });
});

describe("book ambient", () => {
  it("accepts only the recovered beds and a 0–100 volume", () => {
    assert.deepEqual(
      AMBIENT_MODES.map((mode) => mode.id),
      ["off", "zen", "white", "alpha"],
    );
    assert.deepEqual(normalizeAmbientPrefs({ mode: "zen", volume: 40 }), { mode: "zen", volume: 40 });
    assert.equal(normalizeAmbientPrefs({ mode: "radio", volume: 400 }).mode, "off");
    assert.equal(normalizeAmbientPrefs({ mode: "white", volume: -3 }).volume, 0);
    const storage = memoryStorage();
    saveAmbientPrefs(storage, { mode: "alpha", volume: 40 });
    assert.deepEqual(loadAmbientPrefs(storage), { mode: "alpha", volume: 40 });
    assert.equal(storage.getItem(BOOK_AMBIENT_KEY).includes("alpha"), true);
    assert.equal(Math.round(ambientUserGain() * 1000), 88);
  });
});

describe("book sample and pdf outline", () => {
  it("offers the 210 bundled readings as one sample book", () => {
    assert.equal(sampleReadingCount(packA, packB), 210);
    const book = sampleBookFromPacks(packA, packB);
    assert.equal(book.id, SAMPLE_BOOK_ID);
    assert.equal(book.readingCount, 210);
    assert.equal(book.chapters.length, 210);
    assert.ok(book.chunks.length >= 210);
    assert.equal(book.chunks[0].chapterTitle, packA.readings[0].title);
    assert.match(book.chunks[0].text, /Little frictions/);
  });

  it("prefers a PDF outline, then heading text", async () => {
    const outlined = await bookFromPdf({
      numPages: 1,
      async getOutline() {
        return [{ title: "Opening", dest: ["ref"] }];
      },
      async getPageIndex() {
        return 0;
      },
      async getPage() {
        return {
          async getTextContent() {
            return { items: [{ str: "Hello from the page.", transform: [0, 0, 0, 0, 0, 100] }] };
          },
        };
      },
    });
    assert.equal(outlined.detectMethod, "pdf-outline-bookmarks");
    assert.equal(outlined.chapters[0].title, "Opening");
    assert.match(outlined.chunks[0].text, /Hello from the page/);

    const headed = await bookFromPdf({
      numPages: 2,
      async getOutline() {
        return [];
      },
      async getPage(pageNumber) {
        const title = pageNumber === 1 ? "Chapter 4" : "Chapter 5";
        return {
          async getTextContent() {
            return {
              items: [
                { str: title, transform: [0, 0, 0, 0, 0, 200], hasEOL: true },
                { str: "The road was quiet.", transform: [0, 0, 0, 0, 0, 180] },
              ],
            };
          },
        };
      },
    });
    assert.equal(headed.detectMethod, "heading-heuristics");
    assert.equal(headed.chapters[0].title, "Chapter 4");
    assert.equal(headed.chapters[1].title, "Chapter 5");
  });
});

describe("book shell wiring", () => {
  it("is a route under Explore, not a new bottom tab", () => {
    assert.ok(hashRouteNames().includes("Book"));
    const build = readFileSync(join(root, "scripts/build.mjs"), "utf8");
    const inject = readFileSync(join(root, "src/patches/book.inject.js"), "utf8");
    assert.match(build, /`Book`,/);
    assert.match(build, /\(0,A\.jsx\)\(mpYourBooksCard,\{\}\)/);
    assert.match(inject, /function mpOpenHash\(/);
    assert.match(inject, /popstate/);
    assert.match(build, /t===`Book`&&\(0,A\.jsx\)\(mpYourBooksPage/);
    assert.match(build, /Book must not be added as a bottom tab/);
    assert.match(inject, /mpListenPlayer/);
    assert.match(inject, /Choose a PDF/);
    assert.equal(existsSync(join(root, "vendor/pdfjs/pdf.min.js")), true);
    assert.equal(existsSync(join(root, "vendor/pdfjs/pdf.worker.min.js")), true);
    assert.equal(PDFJS_SCRIPT, "/mindpal/vendor/pdfjs/pdf.min.js");
    assert.equal(PDFJS_WORKER, "/mindpal/vendor/pdfjs/pdf.worker.min.js");
    const names = [...inject.matchAll(/mpBook\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    for (const name of new Set(names)) {
      assert.match(build, new RegExp(`\\b${name}\\b`), `runtime export missing: ${name}`);
    }
  });
});
