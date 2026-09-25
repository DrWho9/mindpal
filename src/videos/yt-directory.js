import { isYoutubeOutboundUrl } from "./yt-meditations.js";

const DIRECTORY_WATCH_ID = /^[A-Za-z0-9_-]{11}$/;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * Sanitised outbound watch/channel URL, or a bare 11-char watch id.
 * Human-review / draft flags are ignored — a URL is enough to link out.
 */
export function directoryWatchUrl(entry) {
  if (!entry || typeof entry !== "object") return null;
  const fromUrl = isYoutubeOutboundUrl(
    firstString(entry.url, entry.watchUrl, entry.youtubeUrl, entry.externalUrl, entry.evidenceUrl),
  );
  if (fromUrl) return fromUrl;
  const id = firstString(entry.watchId, entry.youtubeId, entry.videoId);
  if (DIRECTORY_WATCH_ID.test(id)) return `https://www.youtube.com/watch?v=${id}`;
  return null;
}

export function directoryOpenUrl(entry) {
  return directoryWatchUrl(entry);
}

export function isDirectoryOpenable(entry) {
  return Boolean(directoryWatchUrl(entry));
}

export function directoryCtaLabel(entry) {
  return isDirectoryOpenable(entry)
    ? "Open on YouTube"
    : "This entry is not available to open here.";
}

export function isDirectoryHeld(entry) {
  if (!entry || typeof entry !== "object") return false;
  return (
    entry.reviewStatus === "withheld" ||
    entry.editorialHold === true ||
    entry.selection?.state === "hold"
  );
}

export function directorySpeakerIds(entry) {
  if (!entry || typeof entry !== "object") return [];
  return [...new Set([...(entry.speakerIds || []), ...(entry.hostSpeakerIds || [])].filter(Boolean))];
}

export function directorySpeakerNames(entry, speakers = []) {
  const names = [];
  for (const id of directorySpeakerIds(entry)) {
    const person = speakers.find((item) => item && item.id === id);
    if (person?.name) names.push(person.name);
    if (Array.isArray(person?.aliases)) names.push(...person.aliases.filter(Boolean));
  }
  if (entry?.creator) names.push(entry.creator);
  return names;
}

export function directoryTags(entry) {
  if (!entry || typeof entry !== "object") return [];
  return [
    ...(entry.topics || []),
    ...(entry.tags || []),
    ...(entry.proposedRelevance?.feelingIds || []),
    ...(entry.proposedRelevance?.topics || []),
    ...(entry.selection?.topics || []),
  ]
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

export function directoryHaystack(entry, speakers = []) {
  return [
    entry?.id,
    entry?.title,
    entry?.synopsis,
    entry?.creator,
    ...directorySpeakerNames(entry, speakers),
    ...directorySpeakerIds(entry),
    ...directoryTags(entry),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function directoryDurationBand(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "any";
  if (seconds <= 5 * 60) return "short";
  if (seconds <= 10 * 60) return "medium";
  if (seconds <= 15 * 60) return "long";
  return "more";
}

export function directorySpeakerOptions(entries, speakers = []) {
  const list = Array.isArray(entries) ? entries : [];
  const catalog = Array.isArray(speakers) ? speakers : [];
  const seen = new Set();
  const options = [];
  for (const person of catalog) {
    if (!person?.id || !person.name || seen.has(person.id)) continue;
    const hasVideo = list.some(
      (entry) => directoryWatchUrl(entry) && directorySpeakerIds(entry).includes(person.id),
    );
    if (!hasVideo) continue;
    seen.add(person.id);
    options.push({ id: person.id, name: person.name });
  }
  return options;
}

/**
 * Browse/search the YouTube directory.
 * Default browse: URL-bearing rows that are not on editorial hold.
 * Query or speaker filter: any catalog row with a URL (held included).
 * Rows with no URL never appear as playable cards.
 */
export function filterDirectoryEntries(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const query = String(options.query || "").trim().toLowerCase();
  const speakerId = String(options.speakerId || "").trim();
  const speakerIds = speakerId
    ? [speakerId]
    : (Array.isArray(options.speakerIds) ? options.speakerIds : []).filter(Boolean);
  const speakers = options.speakers || [];
  const topic = String(options.topic || "").trim().toLowerCase();
  const time = options.time || "any";
  const searching = Boolean(query) || speakerIds.length > 0;

  const matched = list.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (!directoryWatchUrl(entry)) return false;
    if (!searching && isDirectoryHeld(entry)) return false;
    if (speakerIds.length) {
      const ids = directorySpeakerIds(entry);
      const hay = directoryHaystack(entry, speakers);
      const hit = speakerIds.some((id) => {
        if (ids.includes(id)) return true;
        const person = speakers.find((item) => item && item.id === id);
        if (!person?.name) return false;
        const name = person.name.toLowerCase();
        if (hay.includes(name)) return true;
        return (person.aliases || []).some(
          (alias) => typeof alias === "string" && hay.includes(alias.toLowerCase()),
        );
      });
      if (!hit) return false;
    }
    if (query && !directoryHaystack(entry, speakers).includes(query)) return false;
    if (topic) {
      const tags = directoryTags(entry).map((tag) => tag.toLowerCase());
      const hay = directoryHaystack(entry, speakers);
      if (!tags.includes(topic) && !hay.includes(topic)) return false;
    }
    if (time && time !== "any") {
      const seconds = Number(entry.fullDurationSeconds ?? entry.durationSeconds);
      if (directoryDurationBand(seconds) !== time) return false;
    }
    return true;
  });
  return sortDirectoryByViews(matched);
}

export function directoryEmptyCopy({ query = "", speakerId = "", speakerIds = [] } = {}) {
  if (query || speakerId || speakerIds.length) {
    return "No matching video references. Try another title, creator, speaker or tag.";
  }
  return "No openable YouTube links in this directory yet.";
}

/** Feeling-hub groups. matchTags are existing directory topics and feeling ids. */
export const DIRECTORY_CATEGORIES = [
  {
    id: "anxiety",
    title: "Anxiety / worry",
    matchTags: [
      "anxious",
      "anxiety",
      "anxiety-education",
      "worry",
      "worry-management",
      "unhelpful-thoughts",
      "social-anxiety-education",
    ],
  },
  {
    id: "stress",
    title: "Stress",
    matchTags: ["stress", "overwhelm", "overwhelmed"],
  },
  {
    id: "low-mood",
    title: "Low mood",
    matchTags: ["sad", "low-mood", "mood", "self-compassion", "guilty", "emotional-agility", "numb"],
  },
  {
    id: "relationships",
    title: "Relationships",
    matchTags: [
      "relationships",
      "relationship",
      "empathy",
      "supporting-others",
      "communication",
      "accountability",
      "connection",
    ],
  },
  {
    id: "anger",
    title: "Anger",
    matchTags: ["angry", "anger"],
  },
  {
    id: "sleep",
    title: "Sleep",
    matchTags: ["sleep", "insomnia"],
  },
  {
    id: "mindfulness",
    title: "Mindfulness / breathing",
    matchTags: ["mindfulness", "breathing", "grounding", "meditation"],
  },
  {
    id: "habits",
    title: "Habits and everyday wellbeing",
    matchTags: [
      "habits",
      "planning",
      "learning",
      "everyday-wellbeing",
      "values",
      "entrepreneurship",
      "problem-solving",
    ],
  },
];

const CATEGORY_IDS = new Set(DIRECTORY_CATEGORIES.map((category) => category.id));
const VIEW_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function directoryWatchId(entry) {
  const url = directoryWatchUrl(entry);
  if (!url) return "";
  try {
    return new URL(url).searchParams.get("v") || "";
  } catch {
    return "";
  }
}

/** Integer public view count, or null when it was not fetched. Never coerces a label. */
export function directoryViewCount(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.viewCountStatus === "unavailable") return null;
  const count = entry.viewCount;
  if (!Number.isInteger(count) || count < 0) return null;
  return count;
}

function weightedCategoryTags(entry) {
  const topicTags = [
    ...(entry?.topics || []),
    ...(entry?.tags || []),
    ...(entry?.proposedRelevance?.topics || []),
    ...(entry?.selection?.topics || []),
  ];
  const feelingTags = entry?.proposedRelevance?.feelingIds || [];
  return { topicTags, feelingTags };
}

export function directoryCategoryId(entry) {
  const explicit = typeof entry?.category === "string" ? entry.category.trim() : "";
  if (CATEGORY_IDS.has(explicit)) return explicit;
  const { topicTags, feelingTags } = weightedCategoryTags(entry);
  const topics = new Set(
    topicTags.map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : "")).filter(Boolean),
  );
  const feelings = new Set(
    feelingTags.map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : "")).filter(Boolean),
  );
  let bestId = "";
  let bestScore = 0;
  for (const category of DIRECTORY_CATEGORIES) {
    let score = 0;
    for (const tag of category.matchTags) {
      if (topics.has(tag)) score += 2;
      else if (feelings.has(tag)) score += 1;
    }
    if (score > bestScore) {
      bestId = category.id;
      bestScore = score;
    }
  }
  return bestId || "other";
}

export function formatViewCount(count) {
  if (!Number.isInteger(count) || count < 0) return "";
  const compact = (value, suffix) => {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded.toFixed(1).replace(/\.0$/, "")}${suffix}`;
  };
  if (count >= 1_000_000_000) return `${compact(count / 1_000_000_000, "B")} views`;
  if (count >= 1_000_000) return `${compact(count / 1_000_000, "M")} views`;
  if (count >= 1_000) return `${compact(count / 1_000, "K")} views`;
  return `${count.toLocaleString("en-US")} views`;
}

export function formatViewsCheckedAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `checked ${day} ${VIEW_MONTHS[month - 1]} ${year}`;
}

export function formatDirectoryViews(entry) {
  const when = formatViewsCheckedAt(entry?.viewsCheckedAt);
  const count = directoryViewCount(entry);
  if (count == null) {
    return when ? `View count unavailable · ${when}` : "View count unavailable";
  }
  const label = formatViewCount(count);
  return when ? `${label} · ${when}` : label;
}

/**
 * Highest public view count first. Rows with no fetched integer go last.
 * Ties keep the incoming order.
 */
export function sortDirectoryByViews(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const av = directoryViewCount(a.entry);
      const bv = directoryViewCount(b.entry);
      if (av == null && bv == null) return a.index - b.index;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av !== bv) return bv - av;
      return a.index - b.index;
    })
    .map((item) => item.entry);
}

export function groupDirectoryByCategory(entries) {
  const buckets = new Map(DIRECTORY_CATEGORIES.map((category) => [category.id, []]));
  const other = [];
  for (const entry of sortDirectoryByViews(entries)) {
    const id = directoryCategoryId(entry);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(entry);
    else other.push(entry);
  }
  const groups = DIRECTORY_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.title,
    entries: buckets.get(category.id),
  })).filter((group) => group.entries.length);
  if (other.length) groups.push({ id: "other", title: "Other references", entries: other });
  return groups;
}

function candidateEntries(candidates) {
  if (Array.isArray(candidates)) return candidates;
  if (Array.isArray(candidates?.entries)) return candidates.entries;
  return [];
}

/**
 * Append draft candidates that are not already in the catalog, then attach
 * the committed view snapshot. A missing or failed fetch stays null.
 */
export function withDirectorySnapshot(entries, candidates, snapshot) {
  const base = Array.isArray(entries) ? entries : [];
  const seen = new Set(base.map((entry) => directoryWatchId(entry)).filter(Boolean));
  const merged = base.slice();
  for (const entry of candidateEntries(candidates)) {
    const id = directoryWatchId(entry);
    if (!entry || typeof entry !== "object" || !id || seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
  }
  const videos = snapshot && typeof snapshot.videos === "object" && snapshot.videos ? snapshot.videos : {};
  return merged.map((entry) => {
    const id = directoryWatchId(entry);
    const snap = id ? videos[id] : null;
    if (!snap || typeof snap !== "object") return entry;
    const checkedAt = typeof snap.viewsCheckedAt === "string" ? snap.viewsCheckedAt : "";
    if (snap.status === "ok" && Number.isInteger(snap.viewCount) && snap.viewCount >= 0) {
      return {
        ...entry,
        viewCount: snap.viewCount,
        viewsCheckedAt: checkedAt,
        viewCountStatus: "ok",
      };
    }
    return {
      ...entry,
      viewCount: null,
      viewsCheckedAt: checkedAt,
      viewCountStatus: "unavailable",
    };
  });
}
