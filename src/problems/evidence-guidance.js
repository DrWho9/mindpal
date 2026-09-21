/** Reusable hub evidence & guidance catalog. Mothers is the first filled hub. */

export const HUB_ACCORDION_ORDER = ["readings", "evidence", "videos", "companion"];

export const EVIDENCE_GUIDANCE_DISCLAIMER =
  "Literacy and optional reading — not a diagnosis, not treatment, and not a replacement for a GP, midwife, maternal-child health nurse, or PANDA. AU urgent help: 000 / Lifeline 13 11 14.";

export const TRUSTED_EVIDENCE_HOSTS = [
  "panda.org.au",
  "beyondblue.org.au",
  "healthdirect.gov.au",
  "aihw.gov.au",
];

/** Shape other hubs can copy. Leave notes/books empty until a content pass lands. */
export const EVIDENCE_GUIDANCE_TEMPLATE = {
  lede: "",
  notes: [
    {
      id: "",
      title: "",
      body: "",
      source: { label: "", url: "" },
    },
  ],
  books: [
    {
      id: "",
      title: "",
      authors: "",
      chapter: "",
      why: "",
      url: "",
    },
  ],
};

const NOTE_COUNT = { min: 3, max: 5 };
const BOOK_COUNT = { min: 4, max: 6 };

export function evidenceCatalog(override) {
  if (override && typeof override === "object" && !Array.isArray(override)) {
    if (override.hubs || override.disclaimer || override.trustedHosts) return override;
  }
  if (typeof globalThis.mpEvidenceGuidance !== "undefined" && globalThis.mpEvidenceGuidance) {
    return globalThis.mpEvidenceGuidance;
  }
  return { version: "", disclaimer: EVIDENCE_GUIDANCE_DISCLAIMER, trustedHosts: TRUSTED_EVIDENCE_HOSTS, hubs: {} };
}

export function evidenceDisclaimer(override) {
  const text = evidenceCatalog(override).disclaimer;
  return typeof text === "string" && text.trim() ? text.trim() : EVIDENCE_GUIDANCE_DISCLAIMER;
}

function hostFromUrl(url) {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isTrustedEvidenceUrl(url, override) {
  const host = hostFromUrl(url);
  if (!host) return false;
  const extra = evidenceCatalog(override).trustedHosts;
  const allowed = new Set([
    ...TRUSTED_EVIDENCE_HOSTS,
    ...(Array.isArray(extra) ? extra.map((item) => String(item).replace(/^www\./, "").toLowerCase()) : []),
  ]);
  return allowed.has(host);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNote(note) {
  if (!note || typeof note !== "object") return null;
  const id = cleanText(note.id);
  const title = cleanText(note.title);
  const body = cleanText(note.body);
  const sourceLabel = cleanText(note.source?.label);
  const sourceUrl = cleanText(note.source?.url);
  if (!id || !title || !body || !sourceLabel || !sourceUrl) return null;
  const relatedLabel = cleanText(note.related?.label);
  const relatedUrl = cleanText(note.related?.url);
  return {
    id,
    title,
    body,
    source: { label: sourceLabel, url: sourceUrl },
    related: relatedLabel && relatedUrl ? { label: relatedLabel, url: relatedUrl } : null,
  };
}

function normalizeBook(book) {
  if (!book || typeof book !== "object") return null;
  const id = cleanText(book.id);
  const title = cleanText(book.title);
  const authors = cleanText(book.authors);
  const why = cleanText(book.why);
  if (!id || !title || !authors || !why) return null;
  return {
    id,
    title,
    authors,
    chapter: cleanText(book.chapter),
    why,
    url: cleanText(book.url),
  };
}

export function emptyEvidenceGuidance(hubId = "") {
  return {
    hubId: cleanText(hubId),
    lede: "",
    disclaimer: EVIDENCE_GUIDANCE_DISCLAIMER,
    notes: [],
    books: [],
  };
}

export function evidenceGuidanceFor(hubId, override) {
  const id = cleanText(hubId);
  if (!id) return emptyEvidenceGuidance("");
  const catalog = evidenceCatalog(override);
  const raw = catalog?.hubs?.[id];
  if (!raw || typeof raw !== "object") return emptyEvidenceGuidance(id);
  const notes = (Array.isArray(raw.notes) ? raw.notes : []).map(normalizeNote).filter(Boolean);
  const books = (Array.isArray(raw.books) ? raw.books : []).map(normalizeBook).filter(Boolean);
  return {
    hubId: id,
    lede: cleanText(raw.lede),
    disclaimer: evidenceDisclaimer(override),
    notes,
    books,
  };
}

export function listEvidenceNotes(hubId, override) {
  return evidenceGuidanceFor(hubId, override).notes;
}

export function listGuidanceBooks(hubId, override) {
  return evidenceGuidanceFor(hubId, override).books;
}

export function guidanceCountsOk(guidance) {
  const notes = guidance?.notes?.length || 0;
  const books = guidance?.books?.length || 0;
  return notes >= NOTE_COUNT.min && notes <= NOTE_COUNT.max && books >= BOOK_COUNT.min && books <= BOOK_COUNT.max;
}

export function evidenceNoteSourcesTrusted(guidance, override) {
  const notes = Array.isArray(guidance?.notes) ? guidance.notes : [];
  return notes.every((note) => {
    if (!isTrustedEvidenceUrl(note.source?.url, override)) return false;
    if (note.related?.url && !isTrustedEvidenceUrl(note.related.url, override)) return false;
    return true;
  });
}
