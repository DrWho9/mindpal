import { normalizeTags, readingHasAnyTag, tagsForFeeling } from "../readings/tags.js";

export const VIDEO_DIRECTORY_LIMIT = 10;

/** Thoughtful emotion tags for HeyGen V01–V12 drafts. */
export const CATALOG_VIDEO_TAGS = {
  V01: ["motivation", "calm", "faith"],
  V02: ["low-mood", "self-compassion", "motivation"],
  V03: ["stress", "anxiety", "calm"],
  V04: ["overwhelm", "anxiety", "calm"],
  V05: ["anxiety", "stress", "calm"],
  V06: ["low-mood", "anxiety", "anger", "self-compassion"],
  V07: ["self-compassion", "low-mood", "anger", "boundaries"],
  V08: ["anxiety", "worry", "calm"],
  V09: ["motivation", "overwhelm", "stress"],
  V10: ["low-mood", "self-compassion", "grief"],
  V11: ["low-mood", "self-compassion", "worry"],
  V12: ["low-mood", "sleep", "anxiety"],
};

export const MADDY_VIDEO_TAGS = {
  "maddy-welcome": ["motivation", "calm", "faith"],
  "maddy-tip": ["motivation", "self-compassion", "calm"],
  "maddy-timed-breath": ["anxiety", "stress", "sleep", "calm"],
};

export const YT_ENTRY_TAGS = {
  "YT-SLEEP-01": ["sleep", "calm", "self-compassion"],
  "YT-SLEEP-02": ["sleep", "grief", "calm"],
  "YT-SLEEP-03": ["sleep", "calm", "faith"],
  "YT-SLEEP-04": ["sleep", "calm"],
  "YT-SLEEP-05": ["sleep", "calm"],
  "YT-ANX-01": ["anxiety", "worry", "calm"],
  "YT-ANX-02": ["worry", "anxiety", "calm"],
  "YT-ANX-03": ["anxiety", "calm"],
  "YT-ANX-04": ["anxiety", "stress"],
  "YT-ANX-05": ["anxiety", "self-compassion", "worry"],
};

export const YT_CATEGORY_TAGS = {
  sleep: ["sleep", "calm"],
  anxiety: ["anxiety", "worry"],
  stress: ["stress", "overwhelm"],
  morning: ["motivation", "calm"],
  "body-scan": ["calm", "stress"],
  "self-compassion": ["self-compassion"],
  breathing: ["calm", "anxiety"],
  grief: ["grief", "low-mood"],
  short: ["calm", "overwhelm"],
  faith: ["faith", "calm"],
};

export function itemTags(item) {
  const stored = normalizeTags(item?.tags);
  if (stored.length) return stored;
  const hub = normalizeTags(item?.problemTags || item?.theme_tags);
  if (hub.length) return hub;
  if (item?.id && CATALOG_VIDEO_TAGS[item.id]) return normalizeTags(CATALOG_VIDEO_TAGS[item.id]);
  if (item?.id && MADDY_VIDEO_TAGS[item.id]) return normalizeTags(MADDY_VIDEO_TAGS[item.id]);
  if (item?.id && YT_ENTRY_TAGS[item.id]) return normalizeTags(YT_ENTRY_TAGS[item.id]);
  if (item?.categoryId && YT_CATEGORY_TAGS[item.categoryId]) {
    return normalizeTags(YT_CATEGORY_TAGS[item.categoryId]);
  }
  return [];
}

export function applyItemTags(item, mapped) {
  const tags = normalizeTags(mapped || itemTags(item));
  return { ...item, tags };
}

function sourceRank(source) {
  if (source === "maddy") return 30;
  if (source === "youtube") return 16;
  if (source === "catalog") return 8;
  return 0;
}

function matchScore(tags, wanted) {
  if (!wanted.length) return 1;
  return wanted.reduce((sum, tag) => sum + (tags.includes(tag) ? 3 : 0), 0);
}

export function flattenYoutubeEntries(catalog) {
  const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
  const out = [];
  for (const category of categories) {
    const entries = Array.isArray(category?.entries) ? category.entries : [];
    for (const entry of entries) {
      out.push({
        ...entry,
        categoryId: category.id,
        categoryTitle: category.title,
        tags: itemTags({ ...entry, categoryId: category.id }),
      });
    }
  }
  return out;
}

export function collectFeelingMedia({
  catalog,
  maddy,
  meditations,
} = {}) {
  const rows = [];
  for (const video of Array.isArray(maddy?.videos) ? maddy.videos : []) {
    rows.push({
      ...video,
      source: "maddy",
      tags: itemTags(video),
      title: video.cardTitle || video.title,
    });
  }
  for (const video of Array.isArray(catalog?.videos) ? catalog.videos : []) {
    rows.push({
      ...video,
      source: "catalog",
      tags: itemTags(video),
    });
  }
  for (const entry of flattenYoutubeEntries(meditations)) {
    rows.push({
      ...entry,
      source: "youtube",
    });
  }
  return rows;
}

export function mediaForTags(sources, tags, limit = VIDEO_DIRECTORY_LIMIT) {
  const wanted = normalizeTags(tags);
  const rows = collectFeelingMedia(sources).filter((item) => {
    if (!wanted.length) return true;
    return readingHasAnyTag(item, wanted);
  });
  rows.sort((a, b) => {
    const sb = matchScore(itemTags(b), wanted) + sourceRank(b.source);
    const sa = matchScore(itemTags(a), wanted) + sourceRank(a.source);
    if (sb !== sa) return sb - sa;
    return String(a.id).localeCompare(String(b.id));
  });
  return rows.slice(0, Math.max(0, Number(limit) || VIDEO_DIRECTORY_LIMIT));
}

export function mediaForFeeling(sources, feelingId, limit = VIDEO_DIRECTORY_LIMIT) {
  return mediaForTags(sources, tagsForFeeling(feelingId), limit);
}

export function mediaSourceLabel(item) {
  if (item?.source === "maddy") return "Watch with Maddy";
  if (item?.source === "youtube") return "YouTube meditation";
  return "MindPal draft";
}
