/**
 * MindPal Book module boundary.
 *
 * Everything for the private reader lives under src/book/.
 * The DayStart shell only mounts it: an Explore card and the #Book route
 * in scripts/build.mjs, plus src/patches/book.inject.js for the screen.
 * Move this folder (and the inject + the vendored pdf.js files) to reuse it.
 *
 * Recovered from the pre-DayStart shell (commits b4f58eb, d65c825, ff8da0f,
 * 51fe478, through 5faabcd) and adapted to the current app. Listen uses the
 * shared player from src/tts/listen-player.js — this module does not speak.
 */

export {
  CHUNK_CHARS,
  buildChunks,
  chapterProgressPct,
  chaptersFromHeadings,
  chunkIndexForChapter,
  clampChunkIndex,
  filterChapters,
  isHeadingLine,
  normalizeWhitespace,
  pageTurnDelta,
  uniqueChapters,
} from "./chapters.js";

export {
  BOOK_DESIGN_KEY,
  BOOK_FONTS,
  DESIGN_THEMES,
  TEXT_SIZES,
  defaultDesign,
  designCssVars,
  designWithTheme,
  loadDesign,
  normalizeDesign,
  saveDesign,
} from "./design.js";

export {
  BOOK_BM_KEY,
  BOOK_IDB,
  BOOK_NOTES_KEY,
  BOOK_POS_KEY,
  BOOK_STORE,
  LEGACY_PDF_KEY,
  LEGACY_PDF_STORE,
  bookIdForName,
  clearLastOpen,
  createIdbBookLibrary,
  createMemoryBookLibrary,
  deleteBook,
  getBook,
  lastOpenId,
  listBooks,
  noteFor,
  positionFor,
  putBook,
  readBookmark,
  readPositions,
  rememberOpen,
  writeBookmark,
  writeNote,
} from "./persist.js";

export {
  AMBIENT_DUCK_GAIN,
  AMBIENT_GAIN_CEILING,
  AMBIENT_MODES,
  BOOK_AMBIENT_KEY,
  ambientUserGain,
  applyAmbientMasterGain,
  loadAmbientPrefs,
  normalizeAmbientPrefs,
  resumeAmbientIfNeeded,
  saveAmbientPrefs,
  setAmbientDuck,
  setAmbientMode,
  setAmbientVolume,
  startAmbientMode,
  stopAmbientAudio,
} from "./ambient.js";

export {
  SAMPLE_BOOK_ID,
  SAMPLE_BOOK_NAME,
  sampleBookFromPacks,
  sampleReadingCount,
} from "./sample.js";

export {
  PDFJS_SCRIPT,
  PDFJS_WORKER,
  bookFromPdf,
  extractOutlineChapters,
  extractPagesText,
  loadPdfjs,
} from "./pdf.js";
