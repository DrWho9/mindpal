/**
 * On-device PDF text + outline extraction.
 * Same pdf.js 3.11.174 the old shell loaded from a CDN (b4f58eb).
 * The files are vendored under /mindpal/vendor/pdfjs so the Pages
 * content-security policy (script-src 'self') can load them.
 */

import { buildChunks, chaptersFromHeadings, normalizeWhitespace } from "./chapters.js";

export const PDFJS_SCRIPT = "/mindpal/vendor/pdfjs/pdf.min.js";
export const PDFJS_WORKER = "/mindpal/vendor/pdfjs/pdf.worker.min.js";

let pdfjsPromise = null;

export function loadPdfjs(doc = globalThis.document) {
  const existing = globalThis.pdfjsLib;
  if (existing?.getDocument) {
    if (existing.GlobalWorkerOptions) existing.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(existing);
  }
  if (pdfjsPromise) return pdfjsPromise;
  if (!doc?.head || typeof doc.createElement !== "function") {
    return Promise.reject(new Error("pdf.js needs a browser document"));
  }
  pdfjsPromise = new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = PDFJS_SCRIPT;
    script.async = true;
    script.onload = () => {
      const lib = globalThis.pdfjsLib;
      if (!lib?.getDocument) {
        reject(new Error("pdf.js failed to load"));
        return;
      }
      if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Could not load the on-device PDF reader"));
    doc.head.appendChild(script);
  });
  pdfjsPromise.catch(() => {
    pdfjsPromise = null;
  });
  return pdfjsPromise;
}

export async function extractOutlineChapters(pdf) {
  try {
    const outline = await pdf.getOutline();
    if (!outline || !outline.length) return null;
    const chapters = [];
    async function walk(items, depth) {
      for (let i = 0; i < (items || []).length; i++) {
        const item = items[i];
        let pageIndex = 0;
        try {
          if (item.dest) {
            const dest = typeof item.dest === "string" ? await pdf.getDestination(item.dest) : item.dest;
            if (Array.isArray(dest) && dest[0]) pageIndex = await pdf.getPageIndex(dest[0]);
          }
        } catch {
          pageIndex = 0;
        }
        chapters.push({
          title: String(item.title || "Section").trim() || "Section",
          pageIndex: pageIndex || 0,
          depth: depth || 0,
        });
        if (item.items && item.items.length) await walk(item.items, (depth || 0) + 1);
      }
    }
    await walk(outline, 0);
    return chapters.length ? chapters : null;
  } catch {
    return null;
  }
}

export async function extractPagesText(pdf) {
  const pages = [];
  const total = Number(pdf?.numPages) || 0;
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    let lastY = null;
    const lines = [];
    const items = content?.items || [];
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const y = item.transform ? item.transform[5] : 0;
      if (lastY !== null && Math.abs(y - lastY) > 2.2) {
        lines.push(line.replace(/\s+$/, ""));
        line = "";
      }
      line += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    if (line.trim()) lines.push(line.replace(/\s+$/, ""));
    pages.push({ pageIndex: i - 1, text: normalizeWhitespace(lines.join("\n")) });
  }
  return pages;
}

export async function bookFromPdf(pdf) {
  const pages = await extractPagesText(pdf);
  let chapters = await extractOutlineChapters(pdf);
  let detectMethod = "heading-heuristics";
  if (chapters && chapters.length) {
    detectMethod = "pdf-outline-bookmarks";
  } else {
    chapters = chaptersFromHeadings(pages);
    detectMethod = chapters.some((chapter) => /^chapter\s+\d+/i.test(chapter.title))
      ? "heading-heuristics"
      : "section-heuristics";
  }
  const chunks = buildChunks(pages, chapters);
  return {
    pages,
    chapters,
    chunks,
    detectMethod,
    pageCount: Number(pdf?.numPages) || pages.length,
  };
}
