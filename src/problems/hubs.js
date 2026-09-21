import {
  AOD_SUPPORT_TAGS,
  GROWTH_THEME_TAGS,
  MENS_SUPPORT_TAGS,
  MOTHER_SUPPORT_TAGS,
  PROBLEM_GROUPS,
  PROBLEM_TAG_IDS,
  feelingTagsToProblemTags,
  normalizeProblemTags,
  readingProblemTags,
} from "./theme-map.js";
import {
  featuredOwnerReadings,
  isOwnerReading,
  mergeOwnerReadings,
  ownerCompanionOpener,
} from "../readings/owner.js";
import {
  MENS_HEALTH_MADDY_IDS,
  MENS_HEALTH_PROBLEM_ID,
  MENS_HEALTH_READING_LIMIT,
  MENS_HEALTH_ROUTE,
  dedicatedProblemRoute,
  featuredMensHelpline,
  isMensHealthProblem,
  isMensHealthYoutubeUrl,
  mensHealthHelplines,
  mensHealthQueuedVideos,
  mensHealthStats,
  mensHealthYoutube,
} from "./mens-health.js";

export { GROWTH_THEME_TAGS, PROBLEM_GROUPS };
export {
  MENS_HEALTH_MADDY_IDS,
  MENS_HEALTH_PROBLEM_ID,
  MENS_HEALTH_READING_LIMIT,
  MENS_HEALTH_ROUTE,
  dedicatedProblemRoute,
  featuredMensHelpline,
  isMensHealthProblem,
  isMensHealthYoutubeUrl,
  mensHealthHelplines,
  mensHealthQueuedVideos,
  mensHealthStats,
  mensHealthYoutube,
};
export { MENS_SUPPORT_TAGS };

export const COMPANION_PROMPT_KEY = "mindpal.companionPrompt.v1";
export const SELECTED_PROBLEM_KEY = "mindpal.selectedProblem.v1";
export const MOTHERS_PROBLEM_ID = "mothers";
export const MOTHERS_ROUTE = "Struggling mothers";
export const MOTHERS_READING_LIMIT = 12;
export const MOTHERS_MADDY_IDS = ["maddy-welcome", "maddy-timed-breath"];
export const MOTHERS_MEDITATION_IDS = ["sleep", "self-compassion", "anxiety"];
export const AOD_PROBLEM_ID = "aod";
export const AOD_ROUTE = "Drugs & alcohol";
export const AOD_READING_LIMIT = 12;
export const AOD_MADDY_IDS = ["maddy-welcome", "maddy-timed-breath"];
export const AOD_MEDITATION_IDS = ["self-compassion", "anxiety", "stress"];

export function isMothersProblem(id) {
  return id === MOTHERS_PROBLEM_ID;
}

export function isAodProblem(id) {
  return id === AOD_PROBLEM_ID;
}

const GROWTH_HUB_IDS = new Set([
  "mindset",
  "motivation",
  "stronger-mind",
  "challenge",
  "hard-patch",
  "gratitude",
]);

export function problemGroupId(item) {
  if (item?.group === "growth" || item?.group === "support") return item.group;
  return GROWTH_HUB_IDS.has(item?.id) ? "growth" : "support";
}

export function listProblems(catalog) {
  const list = Array.isArray(catalog?.problems) ? catalog.problems : [];
  return list.filter((item) => item && PROBLEM_TAG_IDS.includes(item.id));
}

export function listProblemGroups(catalog) {
  const problems = listProblems(catalog);
  const fromCatalog = Array.isArray(catalog?.groups) && catalog.groups.length
    ? catalog.groups
    : PROBLEM_GROUPS;
  return fromCatalog
    .map((group) => ({
      id: group.id,
      title: group.title,
      lede: group.lede,
      problems: problems.filter((item) => problemGroupId(item) === group.id),
    }))
    .filter((group) => group.problems.length);
}

export function isGrowthProblem(id) {
  if (id && typeof id === "object") return problemGroupId(id) === "growth";
  return GROWTH_HUB_IDS.has(id);
}

export const PROBLEM_VIDEO_TAGS = {
  sleep: "sleep",
  anxiety: "anxiety",
  stress: "stress",
  mood: "low-mood",
  faith: "faith",
  mothers: "self-compassion",
  aod: "alcohol",
  "mens-health": "motivation",
  mindset: "mindset",
  motivation: "motivation",
  "stronger-mind": "resilience",
  challenge: "challenge",
  "hard-patch": "courage",
  gratitude: "gratitude",
};

export function videoTagForProblem(problemId) {
  return PROBLEM_VIDEO_TAGS[problemId] || problemId;
}

export function growthThemeTags(reading) {
  return readingProblemTags(reading).filter((tag) =>
    GROWTH_THEME_TAGS.includes(tag) || GROWTH_HUB_IDS.has(tag),
  );
}

export function findProblem(catalog, id) {
  if (typeof id !== "string" || !id.trim()) return null;
  return listProblems(catalog).find((item) => item.id === id) || null;
}

function curatedIdsForProblem(problemId) {
  if (typeof curatedReadingIdsForHub === "function") {
    return curatedReadingIdsForHub(problemId);
  }
  const catalog =
    typeof globalThis.mpFeelingKits !== "undefined" ? globalThis.mpFeelingKits : null;
  const aliases = catalog?.aliases || {};
  const key = aliases[problemId] || (problemId === "mood" ? "low-mood" : problemId);
  const spec = catalog?.kits?.[key];
  if (!spec) return [];
  const ids = [];
  if (typeof spec.startHereId === "string" && spec.startHereId.trim()) ids.push(spec.startHereId.trim());
  for (const id of Array.isArray(spec.readingIds) ? spec.readingIds : []) {
    if (typeof id === "string" && id.trim() && !ids.includes(id.trim())) ids.push(id.trim());
  }
  return ids;
}

export function readingsForProblem(pack, problemId, limit) {
  const curatedIds = curatedIdsForProblem(problemId);
  if (curatedIds.length) {
    const byId = new Map(
      mergeOwnerReadings(pack)
        .filter((item) => item?.id)
        .map((item) => [item.id, item]),
    );
    const resolved = curatedIds.map((id) => byId.get(id)).filter(Boolean);
    const cap = Number.isFinite(limit) ? limit : resolved.length;
    return resolved.slice(0, cap);
  }
  const readings = Array.isArray(pack?.readings) ? pack.readings : [];
  const cap = Number.isFinite(limit)
    ? limit
    : problemId === MOTHERS_PROBLEM_ID
      ? MOTHERS_READING_LIMIT
      : problemId === AOD_PROBLEM_ID
        ? AOD_READING_LIMIT
        : problemId === MENS_HEALTH_PROBLEM_ID
          ? MENS_HEALTH_READING_LIMIT
          : 6;
  const featured = featuredOwnerReadings(problemId);
  const featuredIds = new Set(featured.map((item) => item.id));
  const tagged = readings
    .filter((item) => !featuredIds.has(item.id) && readingProblemTags(item).includes(problemId))
    .sort((a, b) => Number(a.day) - Number(b.day));
  return [...featured, ...tagged.slice(0, cap)];
}

export function motherSupportTags(reading) {
  return readingProblemTags(reading).filter((tag) => MOTHER_SUPPORT_TAGS.includes(tag));
}

export function aodSupportTags(reading) {
  return readingProblemTags(reading).filter((tag) => AOD_SUPPORT_TAGS.includes(tag));
}

export function mensSupportTags(reading) {
  return readingProblemTags(reading).filter((tag) => MENS_SUPPORT_TAGS.includes(tag));
}

export function videoProblemTags(video) {
  const direct = normalizeProblemTags(video?.problemTags || video?.theme_tags);
  if (direct.length) return direct;
  const fromFeeling = feelingTagsToProblemTags(video?.tags);
  if (fromFeeling.length) return fromFeeling;
  const blob = [video?.id, video?.title, video?.category, video?.outline, video?.description]
    .filter((part) => typeof part === "string")
    .join(" ")
    .toLowerCase();
  const inferred = [];
  if (/\bsleep|night|restless|insomnia|wind-?down\b/.test(blob)) inferred.push("sleep");
  if (/\banxiety|worry|worried|panic\b/.test(blob)) inferred.push("anxiety");
  if (/\bstress|overwhelm|overloaded|pressure\b/.test(blob)) inferred.push("stress");
  if (/\bmood|heavy|low mood|sad|difficult morning\b/.test(blob)) inferred.push("mood");
  if (/\bmotivat|get going|welcome|start|action|tip\b/.test(blob)) inferred.push("motivation");
  if (/\bfaith|prayer|meaning|welcome\b/.test(blob)) inferred.push("faith");
  if (/\bmother|matern|postpartum|parenting|caregiv\b/.test(blob)) inferred.push("mothers");
  if (/\balcohol|drug|aod|craving|substance|intoxicat\b/.test(blob)) inferred.push("aod");
  if (/\bmindset|reframe|hope|noticing good|positive\b/.test(blob)) inferred.push("mindset");
  if (/\bchalleng|courage|stretch|brave\b/.test(blob)) inferred.push("challenge");
  if (/\bresilien|focus|stronger mind|attention\b/.test(blob)) inferred.push("stronger-mind");
  if (/\bhard patch|grit|overcome|healing\b/.test(blob)) inferred.push("hard-patch");
  if (/\bgratitude|thanks|daily win\b/.test(blob)) inferred.push("gratitude");
  return normalizeProblemTags(inferred);
}

export function videosForProblem(catalog, problemId) {
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : [];
  return videos.filter((item) => videoProblemTags(item).includes(problemId));
}

export function maddyForProblem(catalog, problemId) {
  const videos = videosForProblem(catalog, problemId);
  const scoped =
    problemId === MOTHERS_PROBLEM_ID
      ? MOTHERS_MADDY_IDS
      : problemId === AOD_PROBLEM_ID
        ? AOD_MADDY_IDS
        : problemId === MENS_HEALTH_PROBLEM_ID
          ? MENS_HEALTH_MADDY_IDS
          : null;
  if (!scoped) return videos;
  return scoped.map((id) => videos.find((item) => item.id === id)).filter(Boolean);
}

export function takeCompanionPrompt(storage = globalThis.sessionStorage) {
  if (!storage) return "";
  try {
    const value = storage.getItem(COMPANION_PROMPT_KEY) || "";
    storage.removeItem(COMPANION_PROMPT_KEY);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function saveCompanionPrompt(text, storage = globalThis.sessionStorage) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!storage) return value;
  try {
    if (value) storage.setItem(COMPANION_PROMPT_KEY, value);
    else storage.removeItem(COMPANION_PROMPT_KEY);
  } catch {
    /* private mode */
  }
  return value;
}

export function selectedProblemId(storage = globalThis.sessionStorage) {
  if (!storage) return null;
  try {
    const value = storage.getItem(SELECTED_PROBLEM_KEY);
    return PROBLEM_TAG_IDS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function selectProblem(id, storage = globalThis.sessionStorage) {
  const next = PROBLEM_TAG_IDS.includes(id) ? id : null;
  if (!storage) return next;
  try {
    if (next) storage.setItem(SELECTED_PROBLEM_KEY, next);
    else storage.removeItem(SELECTED_PROBLEM_KEY);
  } catch {
    /* private mode */
  }
  return next;
}
