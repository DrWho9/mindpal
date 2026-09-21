import { isVideoPlayable, publishedLibrarySrc, videoCardCta } from "./playback.js";
import { isMaddyCompanionPlayable, maddyDurationLabel, maddyPublishedSrc } from "./maddy.js";
import { entriesForCategory, isMeditationOpenable, meditationCategories, meditationCtaLabel, meditationOpenUrl } from "./yt-meditations.js";

export const EMOTION_IDS = [
  "sleep",
  "anxiety",
  "stress",
  "low-mood",
  "anger",
  "motivation",
  "faith",
  "overwhelm",
];

export const FEELING_EMOTIONS = [
  ["sleep", "Sleep / restless"],
  ["anxiety", "Anxious or worried"],
  ["stress", "Stressed"],
  ["low-mood", "Sad or low"],
  ["anger", "Angry or frustrated"],
  ["motivation", "Need motivation"],
  ["faith", "Faith / meaning"],
  ["overwhelm", "Overwhelmed"],
];

export const FEELING_SUPPORT = {
  sleep: "A restless night does not have to be solved before you rest.",
  anxiety: "You do not have to solve every worry right now.",
  stress: "You can leave this activity and come back another time.",
  "low-mood": "You do not have to turn a difficult moment into a positive one.",
  anger: "You can pause before deciding what to do next, if it is safe.",
  motivation: "One small start is enough. You do not have to finish everything.",
  faith: "Optional meaning or prayer — skip anything that does not fit.",
  overwhelm: "You can leave this activity and come back another time.",
  aod: "Craving or shame around drink or other substances can sit here. This is not detox and not a diagnosis.",
  "mens-health": "There's nothing wrong with being your best self. This is optional company, not a diagnosis.",
  "": "You can explore without putting a name to how you feel.",
};

/** Legacy Feelings IDs and PR #8 problemTags share this directory. */
export const EMOTION_ALIASES = {
  sad: "low-mood",
  anxious: "anxiety",
  angry: "anger",
  overwhelmed: "overwhelm",
  lonely: "low-mood",
  guilty: "low-mood",
  numb: "low-mood",
  mood: "low-mood",
  worried: "anxiety",
  "low mood": "low-mood",
};

export const BROWSE_SPEAKERS_LABEL = "Browse all videos by speaker";
export const CURATED_VIDEO_LIMIT = 10;

export function normalizeEmotionId(value) {
  if (typeof value !== "string") return "";
  const key = value.trim().toLowerCase();
  if (!key || key === "unsure") return "";
  if (EMOTION_IDS.includes(key)) return key;
  return EMOTION_ALIASES[key] || "";
}

export function emotionLabel(id) {
  const key = normalizeEmotionId(id);
  const row = FEELING_EMOTIONS.find(([emotion]) => emotion === key);
  return row ? row[1] : "";
}

export function normalizeEmotionList(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(normalizeEmotionId).filter(Boolean))];
}

export function entryEmotions(entry, inherited = []) {
  if (!entry || typeof entry !== "object") {
    return normalizeEmotionList(inherited);
  }
  return normalizeEmotionList([
    ...(Array.isArray(entry.emotions) ? entry.emotions : []),
    ...(Array.isArray(entry.tags) ? entry.tags : []),
    ...(Array.isArray(entry.problemTags) ? entry.problemTags : []),
    ...(Array.isArray(inherited) ? inherited : []),
  ]);
}

export function entryMatchesEmotion(entry, emotionId, inherited = []) {
  const wanted = normalizeEmotionId(emotionId);
  if (!wanted) return true;
  return entryEmotions(entry, inherited).includes(wanted);
}

function kindRank(kind) {
  if (kind === "maddy") return 0;
  if (kind === "mindpal-playable") return 1;
  if (kind === "youtube") return 2;
  return 3;
}

function maddyItem(video) {
  const playable = isMaddyCompanionPlayable(video);
  return {
    id: video.id,
    title: video.cardTitle || video.title,
    description: video.description || "",
    kind: "maddy",
    source: "Maddy",
    cta: playable ? "Play" : "Open draft",
    playable,
    src: video.src || video.videoUrl || "",
    publishedSrc: maddyPublishedSrc(video.src || video.videoUrl),
    durationLabel: maddyDurationLabel(video.durationSec ?? video.duration_sec),
    outline: video.outline || video.description || "",
    transcriptText: "",
    openUrl: null,
  };
}

function mindpalItem(video, now = new Date()) {
  const playable = isVideoPlayable(video, now);
  return {
    id: video.id,
    title: video.title,
    description: video.outline || "",
    kind: playable ? "mindpal-playable" : "mindpal-draft",
    source: "MindPal",
    cta: videoCardCta(video, now),
    playable,
    src: playable ? publishedLibrarySrc(video.videoUrl || video.src) : "",
    publishedSrc: playable ? publishedLibrarySrc(video.videoUrl || video.src) : "",
    durationLabel: video.targetDurationSeconds
      ? `${Math.round(video.targetDurationSeconds / 30) / 2} min target`
      : "",
    outline: video.outline || "",
    transcriptText: video.transcriptText || "",
    openUrl: null,
  };
}

function youtubeItem(entry, now = new Date()) {
  const openUrl = meditationOpenUrl(entry, now);
  return {
    id: entry.id,
    title: entry.title,
    description: [entry.channel, entry.views].filter(Boolean).join(" · "),
    kind: "youtube",
    source: "YouTube",
    cta: meditationCtaLabel(entry, now),
    playable: false,
    src: "",
    publishedSrc: "",
    durationLabel: "",
    outline: entry.channel || "",
    transcriptText: "",
    openUrl,
    openable: isMeditationOpenable(entry, now),
  };
}

export function videosForIds(ids, catalogs = {}, now = new Date()) {
  const wanted = Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id.trim()) : [];
  if (!wanted.length) return [];
  const maddyById = new Map(
    (Array.isArray(catalogs?.maddy?.videos) ? catalogs.maddy.videos : []).map((video) => [
      video.id,
      video,
    ]),
  );
  const catalogById = new Map(
    (Array.isArray(catalogs?.videos?.videos) ? catalogs.videos.videos : []).map((video) => [
      video.id,
      video,
    ]),
  );
  const ytById = new Map();
  for (const category of meditationCategories(catalogs?.meditations)) {
    for (const entry of entriesForCategory(category)) {
      if (entry?.id && !ytById.has(entry.id)) ytById.set(entry.id, entry);
    }
  }
  const items = [];
  for (const id of wanted) {
    if (maddyById.has(id)) items.push(maddyItem(maddyById.get(id)));
    else if (catalogById.has(id)) items.push(mindpalItem(catalogById.get(id), now));
    else if (ytById.has(id)) items.push(youtubeItem(ytById.get(id), now));
  }
  return items;
}

export function curatedVideosForEmotion(
  emotionId,
  { maddy, videos, meditations } = {},
  now = new Date(),
  limit = CURATED_VIDEO_LIMIT,
) {
  const wanted = normalizeEmotionId(emotionId);
  const items = [];

  for (const video of Array.isArray(maddy?.videos) ? maddy.videos : []) {
    if (!entryMatchesEmotion(video, wanted)) continue;
    items.push(maddyItem(video));
  }

  for (const video of Array.isArray(videos?.videos) ? videos.videos : []) {
    if (!entryMatchesEmotion(video, wanted)) continue;
    items.push(mindpalItem(video, now));
  }

  for (const category of meditationCategories(meditations)) {
    const inherited = entryEmotions(category);
    for (const entry of entriesForCategory(category)) {
      if (!entryMatchesEmotion(entry, wanted, inherited)) continue;
      items.push(youtubeItem(entry, now));
    }
  }

  items.sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique.slice(0, Math.max(0, Number(limit) || CURATED_VIDEO_LIMIT));
}

export function emotionBreadcrumb(emotionId) {
  const label = emotionLabel(emotionId);
  return label ? ["Feelings", label, "Videos"] : ["Feelings", "Videos"];
}

export function emotionVideoCta(item) {
  if (!item) return "Open";
  if (item.cta) return item.cta;
  if (item.kind === "maddy" || item.kind === "mindpal-playable") return "Play";
  if (item.kind === "youtube") return "Open on YouTube";
  return "Open draft";
}
