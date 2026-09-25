/**
 * Chapter detection and screen-sized chunks.
 * Recovered from the pre-DayStart Book reader (b4f58eb / 5faabcd).
 * Pure functions — no DOM, no storage.
 */

export const CHUNK_CHARS = 900;

export function isHeadingLine(line) {
  const t = String(line || "").trim();
  if (!t || t.length > 80) return false;
  if (/^chapter\s+\d+/i.test(t)) return true;
  if (/^(part|section|book)\s+[ivxlcdm\d]+/i.test(t)) return true;
  if (/^\d{1,2}(\.\d{1,2}){0,3}\s+\S/.test(t) && t.length < 70) return true;
  if (/^[A-Z0-9][A-Z0-9\s,'’\-]{4,}$/.test(t) && t.length < 60) return true;
  if (
    /^[A-Z][A-Za-z0-9'’\-]+(?:\s+[A-Z][A-Za-z0-9'’\-]+){0,8}$/.test(t) &&
    !/[.!?]$/.test(t) &&
    t.length < 55
  ) {
    return true;
  }
  return false;
}

export function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chaptersFromHeadings(pages) {
  const list = Array.isArray(pages) ? pages : [];
  const chapters = [];
  list.forEach((page) => {
    const lines = String(page?.text || "").split(/\n/);
    lines.forEach((line, idx) => {
      if (isHeadingLine(line) && (idx < 8 || /^chapter\s+\d+/i.test(line.trim()))) {
        const title = line.trim();
        const prev = chapters[chapters.length - 1];
        if (prev && prev.pageIndex === page.pageIndex && prev.title === title) return;
        chapters.push({
          title,
          pageIndex: page.pageIndex,
          depth: /^chapter\s+\d+/i.test(title) ? 0 : 1,
        });
      }
    });
  });
  if (chapters.length < 2) {
    const step = Math.max(1, Math.floor(list.length / 6));
    return list
      .filter((_, i) => i === 0 || i % step === 0 || i === list.length - 1)
      .map((page, i) => ({ title: `Section ${i + 1}`, pageIndex: page.pageIndex, depth: 0 }));
  }
  return chapters;
}

export function buildChunks(pages, chapters) {
  const list = Array.isArray(pages) ? pages : [];
  const sorted = (Array.isArray(chapters) ? chapters.slice() : []).sort(
    (a, b) => a.pageIndex - b.pageIndex || (a.depth || 0) - (b.depth || 0),
  );
  const chunks = [];
  list.forEach((page) => {
    let chapter = sorted[0] || { title: "Reading", pageIndex: 0, depth: 0 };
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].pageIndex <= page.pageIndex) chapter = sorted[i];
      else break;
    }
    const text = String(page?.text || "");
    if (!text) return;
    const paras = text
      .split(/\n\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
    let buf = "";
    const push = (body) => {
      const next = String(body || "").trim();
      if (!next) return;
      chunks.push({
        chapterTitle: chapter.title,
        chapterPage: chapter.pageIndex,
        pageIndex: page.pageIndex,
        text: next,
      });
    };
    const flush = () => {
      push(buf);
      buf = "";
    };
    paras.forEach((para) => {
      if ((buf + "\n\n" + para).length > CHUNK_CHARS && buf) flush();
      buf = buf ? `${buf}\n\n${para}` : para;
      while (buf.length > CHUNK_CHARS * 1.6) {
        let cut = buf.lastIndexOf(" ", CHUNK_CHARS);
        if (cut < CHUNK_CHARS * 0.5) cut = CHUNK_CHARS;
        push(buf.slice(0, cut));
        buf = buf.slice(cut).trim();
      }
    });
    flush();
  });
  return chunks.length
    ? chunks
    : [
        {
          chapterTitle: "Reading",
          chapterPage: 0,
          pageIndex: 0,
          text: "(No extractable text in this PDF.)",
        },
      ];
}

export function uniqueChapters(chapters) {
  const seen = new Set();
  const out = [];
  for (const chapter of chapters || []) {
    const key = `${chapter.title}@${chapter.pageIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chapter);
  }
  return out;
}

export function filterChapters(chapters, query) {
  const q = String(query || "").trim().toLowerCase();
  const list = uniqueChapters(chapters);
  if (!q) return list;
  return list.filter((chapter) => String(chapter.title || "").toLowerCase().includes(q));
}

export function chunkIndexForChapter(chunks, chapter) {
  const list = chunks || [];
  if (!chapter) return 0;
  let idx = list.findIndex(
    (chunk) => chunk.chapterPage === chapter.pageIndex && chunk.chapterTitle === chapter.title,
  );
  if (idx < 0) idx = list.findIndex((chunk) => chunk.pageIndex >= chapter.pageIndex);
  return idx >= 0 ? idx : 0;
}

export function chapterProgressPct(chunks, chunkIndex) {
  const list = chunks || [];
  if (!list.length) return 0;
  const index = clampChunkIndex(chunkIndex, list.length);
  const current = list[index];
  const same = [];
  list.forEach((chunk, i) => {
    if (chunk.chapterTitle === current.chapterTitle && chunk.chapterPage === current.chapterPage) {
      same.push(i);
    }
  });
  if (!same.length) return Math.round(((index + 1) / list.length) * 100);
  const pos = same.indexOf(index);
  return Math.round(((pos + 1) / same.length) * 100);
}

export function clampChunkIndex(index, length) {
  const count = Math.max(0, Number(length) || 0);
  if (!count) return 0;
  const n = Number(index);
  const value = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(count - 1, value | 0));
}

/** 1 = next page, -1 = previous, 0 = stay. Tap zones plus horizontal swipe. */
export function pageTurnDelta({ dx = 0, dy = 0, width = 0, x = 0, threshold = 40, tapSlop = 12, leftRatio = 0.28 } = {}) {
  const moveX = Number(dx) || 0;
  const moveY = Number(dy) || 0;
  if (Math.abs(moveX) >= threshold && Math.abs(moveX) > Math.abs(moveY)) {
    return moveX < 0 ? 1 : -1;
  }
  if (Math.abs(moveX) < tapSlop && Math.abs(moveY) < tapSlop && Number(width) > 0) {
    return Number(x) < Number(width) * leftRatio ? -1 : 1;
  }
  return 0;
}
