import {
  AOD_SUPPORT_TAGS,
  MOTHER_SUPPORT_TAGS,
  PROBLEM_TAG_IDS,
  feelingTagsToProblemTags,
  normalizeProblemTags,
  readingProblemTags,
} from "./theme-map.js";
import {
  featuredOwnerReadings,
  isOwnerReading,
  ownerCompanionOpener,
} from "../readings/owner.js";

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

export function listProblems(catalog) {
  const list = Array.isArray(catalog?.problems) ? catalog.problems : [];
  return list.filter((item) => item && PROBLEM_TAG_IDS.includes(item.id));
}

export function findProblem(catalog, id) {
  if (typeof id !== "string" || !id.trim()) return null;
  return listProblems(catalog).find((item) => item.id === id) || null;
}

export function readingsForProblem(pack, problemId, limit) {
  const readings = Array.isArray(pack?.readings) ? pack.readings : [];
  const cap = Number.isFinite(limit)
    ? limit
    : problemId === MOTHERS_PROBLEM_ID
      ? MOTHERS_READING_LIMIT
      : problemId === AOD_PROBLEM_ID
        ? AOD_READING_LIMIT
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
