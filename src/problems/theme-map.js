/** Map existing Pack A theme_label values onto problem-hub tags. */

export const PROBLEM_TAG_IDS = [
  "sleep",
  "anxiety",
  "stress",
  "mood",
  "motivation",
  "faith",
  "mothers",
];

/** Extra tags used to filter the mothers hub without becoming their own chips. */
export const MOTHER_SUPPORT_TAGS = [
  "motherhood",
  "postpartum-adjacent",
  "exhaustion",
  "overwhelm",
  "guilt",
  "self-compassion",
  "faith",
];

export const THEME_LABEL_TO_TAGS = {
  "small irritations": ["stress"],
  imperfection: ["motivation", "mood"],
  "gentleness vs pressure": ["stress"],
  "rumination escalation": ["anxiety"],
  compassion: ["mood", "faith"],
  "perspective-taking": ["stress"],
  "prioritising conflict": ["stress"],
  "reactive communication": ["stress"],
  "gratitude for small": ["mood", "faith"],
  impatience: ["stress"],
  "over-identification with tasks": ["stress", "motivation"],
  "uncertainty tolerance": ["anxiety"],
  comparison: ["mood", "mothers", "guilt"],
  "receiving support": ["mood", "anxiety", "mothers", "motherhood", "self-compassion"],
  "single-tasking": ["stress", "motivation"],
  "need to be right": ["stress"],
  "holding grudges": ["mood"],
  "scarcity mindset": ["anxiety", "mood"],
  connection: ["faith", "mood"],
  "waiting to start": ["motivation"],
  "false emergencies": ["anxiety", "stress"],
  "drama resistance": ["stress"],
  "charitable interpretation": ["mood", "faith"],
  "rest guilt": ["sleep", "mood", "mothers", "guilt", "exhaustion"],
  boundaries: ["stress"],
  "micro-completion": ["motivation"],
  "mental replay": ["anxiety", "sleep"],
  "work spillover": ["stress", "sleep"],
  listening: ["faith"],
  rush: ["stress"],
  judgement: ["mood"],
  overcommitment: ["stress", "mothers", "exhaustion", "motherhood"],
  "emotional patience": ["mood", "stress"],
  recognition: ["faith", "mood"],
  "embodied reset": ["stress", "anxiety"],
  "self-forgiveness": ["mood", "faith", "mothers", "guilt", "self-compassion"],
  "mind-reading": ["anxiety"],
  "domestic perfection": ["stress", "mothers", "motherhood", "guilt"],
  "relational priority": ["mood"],
  grounding: ["anxiety", "stress"],
  "load shedding": ["stress", "mothers", "exhaustion"],
  "self-talk": ["mood"],
  "plans changing": ["anxiety", "motivation", "mothers", "motherhood"],
  "inner critic": ["mood"],
  "over-scheduling": ["stress"],
  "mood awareness": ["mood", "mothers", "postpartum-adjacent"],
  "comfortable quiet": ["sleep", "anxiety"],
  "emotional labour": ["stress", "mood", "mothers", "motherhood", "exhaustion"],
  joy: ["mood"],
  "self-judgement at night": ["sleep", "mood"],
  play: ["mood", "motivation"],
  "expectation load": ["stress", "mothers", "motherhood", "guilt"],
  "body cues": ["sleep", "stress"],
  "image management": ["anxiety", "mood"],
  "impatience with delays": ["stress"],
  appreciation: ["mood", "faith"],
  "grievance collecting": ["mood"],
  "invisible progress": ["motivation"],
  attention: ["faith", "stress"],
  impermanence: ["faith", "anxiety"],
  "after conflict": ["mood"],
  "evening overload": ["sleep", "stress", "mothers", "motherhood", "exhaustion"],
  overwhelm: ["stress", "mothers", "overwhelm", "exhaustion"],
  acceptance: ["mood", "faith"],
  "soft boundaries": ["stress"],
  "tunnel vision": ["anxiety", "stress"],
  "healing/patience": ["mood"],
  ego: ["stress"],
  waiting: ["anxiety", "motivation"],
  interruptions: ["stress", "mothers", "motherhood"],
  "body tension": ["stress", "sleep"],
  "optimisation pressure": ["stress", "motivation"],
  attribution: ["mood"],
  "mental clutter": ["stress", "anxiety"],
  "showing up": ["motivation"],
  "specific thanks": ["mood", "faith"],
  catastrophising: ["anxiety"],
  "asking/delegation": ["stress", "mothers", "motherhood"],
  lightness: ["mood"],
  limits: ["stress"],
  reset: ["motivation", "mood"],
  process: ["motivation"],
  receiving: ["mood"],
  "self-consciousness": ["anxiety", "mood"],
  "prep without panic": ["anxiety", "stress"],
  "waiting in line": ["stress"],
  pace: ["stress"],
  "joy permission": ["mood"],
  disengaging: ["stress"],
  maintenance: ["motivation"],
  "not knowing": ["anxiety", "faith"],
  priorities: ["motivation", "stress"],
  overstimulation: ["stress", "sleep"],
  "productivity myths": ["motivation", "stress"],
  "emotions passing": ["mood", "anxiety"],
  "pressure to perform": ["anxiety", "stress"],
  "old strategies": ["motivation"],
  closures: ["sleep", "mood"],
  "ordinary life": ["faith"],
  "fresh start": ["motivation"],
};

const ALLOWED_TAGS = new Set([...PROBLEM_TAG_IDS, ...MOTHER_SUPPORT_TAGS]);

export function normalizeProblemTags(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((tag) => ALLOWED_TAGS.has(tag)))];
}

export function tagsForThemeLabel(label) {
  if (typeof label !== "string" || !label.trim()) return [];
  return normalizeProblemTags(THEME_LABEL_TO_TAGS[label.trim()] || []);
}

const FEELING_TO_PROBLEM = {
  sleep: "sleep",
  anxiety: "anxiety",
  worry: "anxiety",
  stress: "stress",
  overwhelm: "stress",
  anger: "stress",
  "low-mood": "mood",
  mood: "mood",
  grief: "mood",
  "self-compassion": "mood",
  motivation: "motivation",
  faith: "faith",
  gratitude: "faith",
  mothers: "mothers",
  motherhood: "mothers",
};

export function feelingTagsToProblemTags(raw) {
  if (!Array.isArray(raw)) return [];
  return normalizeProblemTags(raw.map((tag) => FEELING_TO_PROBLEM[tag] || tag));
}

export function readingProblemTags(reading) {
  const fromItem = normalizeProblemTags(reading?.theme_tags || reading?.problemTags);
  if (fromItem.length) return fromItem;
  const fromFeeling = feelingTagsToProblemTags(reading?.tags);
  if (fromFeeling.length) return fromFeeling;
  return tagsForThemeLabel(reading?.theme_label);
}
