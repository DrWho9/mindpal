import { formatTag, normalizeTags, readingTags } from "../readings/tags.js";
import { isOwnerReading, mergeOwnerReadings } from "../readings/owner.js";
import { videosForIds } from "../videos/emotions.js";

export const KIT_READING_LIMIT = 10;
export const KIT_BROWSE_TAG_LIMIT = 12;
export const KIT_SECTION_IDS = ["start", "readings", "videos", "evidence", "talk", "journal"];

const PROBLEM_ALIASES = {
  mood: "low-mood",
  "low-mood": "low-mood",
};

export function feelingKitsCatalog(override) {
  if (override?.kits) return override;
  if (typeof globalThis.mpFeelingKits !== "undefined" && globalThis.mpFeelingKits) {
    return globalThis.mpFeelingKits;
  }
  return { version: "", aliases: {}, kits: {} };
}

export function canonicalizeFeelingKitId(id, catalog = feelingKitsCatalog()) {
  if (typeof id !== "string" || !id.trim()) return "";
  const key = id.trim();
  const aliases = catalog.aliases || {};
  return aliases[key] || PROBLEM_ALIASES[key] || key;
}

export function findFeelingKitSpec(id, catalog = feelingKitsCatalog()) {
  const key = canonicalizeFeelingKitId(id, catalog);
  if (!key) return null;
  const spec = catalog.kits?.[key];
  return spec && typeof spec === "object" ? { id: key, ...spec } : null;
}

export function curatedReadingIdsForHub(hubId, catalog = feelingKitsCatalog()) {
  const spec = findFeelingKitSpec(hubId, catalog);
  if (!spec) return [];
  const ids = [];
  if (typeof spec.startHereId === "string" && spec.startHereId.trim()) {
    ids.push(spec.startHereId.trim());
  }
  for (const id of Array.isArray(spec.readingIds) ? spec.readingIds : []) {
    if (typeof id === "string" && id.trim() && !ids.includes(id.trim())) {
      ids.push(id.trim());
    }
  }
  return ids.slice(0, 1 + KIT_READING_LIMIT);
}

export function chapterTags(reading) {
  const emotion = normalizeTags(reading?.tags);
  if (emotion.length) return emotion;
  return normalizeTags(reading?.theme_tags || reading?.problemTags || readingTags(reading));
}

export function chapterTagChips(reading) {
  return chapterTags(reading)
    .map((tag) => formatTag(tag))
    .filter(Boolean);
}

function blurbFor(reading, spec) {
  if (!reading) return "";
  if (spec?.startHereId === reading.id && typeof spec.startHereBlurb === "string") {
    return spec.startHereBlurb.trim();
  }
  const fromMap = spec?.readingBlurbs?.[reading.id];
  if (typeof fromMap === "string" && fromMap.trim()) return fromMap.trim();
  if (typeof reading.excerpt === "string" && reading.excerpt.trim()) return reading.excerpt.trim();
  const first = String(reading.body || "").split(/\n\n/)[0] || "";
  return first.trim();
}

function decorateReading(reading, spec) {
  if (!reading) return null;
  return {
    ...reading,
    blurb: blurbFor(reading, spec),
    theme: typeof reading.theme_label === "string" ? reading.theme_label : "",
    chapterTags: chapterTags(reading),
    chapterChips: chapterTagChips(reading),
    owner: isOwnerReading(reading),
  };
}

function readingIndex(pack) {
  const merged = mergeOwnerReadings(pack);
  return new Map(merged.filter((item) => item?.id).map((item) => [item.id, item]));
}

export function resolveKitReadings(pack, spec) {
  const byId = readingIndex(pack);
  const start = spec?.startHereId ? decorateReading(byId.get(spec.startHereId), spec) : null;
  const readings = [];
  for (const id of Array.isArray(spec?.readingIds) ? spec.readingIds : []) {
    if (start && id === start.id) continue;
    const row = decorateReading(byId.get(id), spec);
    if (row) readings.push(row);
  }
  return {
    startHere: start,
    readings: readings.slice(0, KIT_READING_LIMIT),
  };
}

function evidenceFromSpec(spec) {
  const raw = spec?.evidence;
  if (!raw || typeof raw !== "object") return null;
  const notes = Array.isArray(raw.notes) ? raw.notes.filter((item) => item?.title && item?.body) : [];
  const guides = Array.isArray(raw.guides) ? raw.guides.filter((item) => item?.title && item?.url) : [];
  const sources = Array.isArray(raw.sources) ? raw.sources.filter((item) => item?.title && item?.url) : [];
  if (!notes.length && !guides.length && !sources.length) return null;
  return {
    disclaimer:
      typeof raw.disclaimer === "string" && raw.disclaimer.trim()
        ? raw.disclaimer.trim()
        : "Education only — not a diagnosis or a course of treatment.",
    notes,
    guides,
    sources,
  };
}

function videoCatalogs() {
  return {
    maddy: typeof globalThis.mpMaddy !== "undefined" ? globalThis.mpMaddy : null,
    videos: typeof globalThis.mpVideoCatalog !== "undefined" ? globalThis.mpVideoCatalog : null,
    meditations:
      typeof globalThis.mpMeditationCatalog !== "undefined" ? globalThis.mpMeditationCatalog : null,
  };
}

export function feelingKit(
  feelingId,
  {
    pack,
    hubs,
    catalogs,
    kitCatalog,
  } = {},
) {
  const spec = findFeelingKitSpec(feelingId, kitCatalog);
  if (!spec) return null;
  const packA =
    pack || (typeof globalThis.mpPackA !== "undefined" ? globalThis.mpPackA : { readings: [] });
  const { startHere, readings } = resolveKitReadings(packA, spec);
  const videos = videosForIds(spec.videoIds || [], catalogs || videoCatalogs());
  const problem =
    Array.isArray(hubs?.problems) &&
    hubs.problems.find((item) => item?.id === spec.id || item?.id === feelingId);
  const tagCounts = new Map();
  for (const row of [startHere, ...readings].filter(Boolean)) {
    for (const tag of row.chapterTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const browseTags = [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag]) => tag)
    .slice(0, KIT_BROWSE_TAG_LIMIT);
  return {
    id: spec.id,
    title: spec.title || spec.shortTitle || spec.id,
    shortTitle: spec.shortTitle || spec.title || spec.id,
    eyebrow: spec.eyebrow || "FEELINGS · OPTIONAL SUPPORT",
    lede: spec.lede || "",
    startHere,
    readings,
    videos,
    companionPrompt: spec.companionPrompt || problem?.companionPrompt || "",
    journalPrompt: spec.journalPrompt || problem?.journalPrompt || "",
    safety: spec.safety && spec.safety.title && spec.safety.body ? spec.safety : null,
    evidence: evidenceFromSpec(spec),
    browseTags,
    sections: KIT_SECTION_IDS.filter((id) => {
      if (id === "evidence") return Boolean(evidenceFromSpec(spec));
      return true;
    }),
  };
}
