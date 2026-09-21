/** Map existing Pack A theme_label values onto support- and growth-hub tags. */

export const SUPPORT_TAG_IDS = [
  "sleep",
  "anxiety",
  "stress",
  "mood",
  "faith",
  "mothers",
  "aod",
  "mens-health",
];

export const GROWTH_TAG_IDS = [
  "mindset",
  "motivation",
  "stronger-mind",
  "challenge",
  "hard-patch",
  "gratitude",
];

export const PROBLEM_TAG_IDS = [...SUPPORT_TAG_IDS, ...GROWTH_TAG_IDS];

export const PROBLEM_GROUPS = [
  { id: "support", title: "Support", lede: "When it's heavy" },
  { id: "growth", title: "Growth", lede: "Build strength" },
];

/** Extra growth theme tags — used on readings/videos, not their own Today chips. */
export const GROWTH_THEME_TAGS = ["courage", "resilience"];

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

/** Extra tags for the Men's Health hub — not their own Explore chips. */
export const MENS_SUPPORT_TAGS = [
  "discipline",
  "mateship",
  "purpose",
  "fatherhood",
  "emotional-courage",
  "fitness",
  "work",
];

/** Extra tags for the drugs & alcohol hub — not their own Explore chips. */
export const AOD_SUPPORT_TAGS = [
  "alcohol",
  "drugs",
  "craving",
  "recovery-adjacent",
  "recovery-shame",
  "shame",
  "self-compassion",
  "stress",
  "low-mood",
  "learning-loop",
];

export const THEME_LABEL_TO_TAGS = {
  "small irritations": ["stress"],
  imperfection: ["motivation", "mood", "mindset"],
  "gentleness vs pressure": ["stress", "stronger-mind", "resilience"],
  "rumination escalation": ["anxiety"],
  compassion: ["mood", "faith", "mindset", "gratitude"],
  "perspective-taking": ["stress", "mindset"],
  "prioritising conflict": ["stress"],
  "reactive communication": ["stress"],
  "gratitude for small": ["mood", "faith", "gratitude", "mindset"],
  impatience: ["stress"],
  "over-identification with tasks": ["stress", "motivation"],
  "uncertainty tolerance": ["anxiety", "stronger-mind", "resilience"],
  comparison: ["mood", "mothers", "guilt", "hard-patch"],
  "receiving support": [
    "mood",
    "anxiety",
    "mothers",
    "motherhood",
    "self-compassion",
    "aod",
    "recovery-adjacent",
    "alcohol",
    "drugs",
    "hard-patch",
  ],
  "single-tasking": ["stress", "motivation", "stronger-mind"],
  "need to be right": ["stress"],
  "holding grudges": ["mood", "hard-patch"],
  "scarcity mindset": ["anxiety", "mood", "mindset"],
  connection: ["faith", "mood", "gratitude"],
  "waiting to start": ["motivation", "challenge"],
  "false emergencies": ["anxiety", "stress"],
  "drama resistance": ["stress", "stronger-mind"],
  "charitable interpretation": ["mood", "faith", "mindset"],
  "rest guilt": ["sleep", "mood", "mothers", "guilt", "exhaustion"],
  boundaries: ["stress"],
  "micro-completion": ["motivation", "challenge"],
  "mental replay": ["anxiety", "sleep"],
  "work spillover": ["stress", "sleep"],
  listening: ["faith", "gratitude"],
  rush: ["stress"],
  judgement: ["mood", "mindset"],
  overcommitment: ["stress", "mothers", "exhaustion", "motherhood"],
  "emotional patience": ["mood", "stress", "stronger-mind", "resilience"],
  recognition: ["faith", "mood", "gratitude"],
  "embodied reset": ["stress", "anxiety", "stronger-mind"],
  "self-forgiveness": [
    "mood",
    "faith",
    "mothers",
    "guilt",
    "self-compassion",
    "aod",
    "shame",
    "recovery-adjacent",
    "alcohol",
    "drugs",
    "hard-patch",
    "courage",
  ],
  "mind-reading": ["anxiety"],
  "domestic perfection": ["stress", "mothers", "motherhood", "guilt"],
  "relational priority": ["mood"],
  grounding: ["anxiety", "stress", "stronger-mind"],
  "load shedding": ["stress", "mothers", "exhaustion"],
  "self-talk": ["mood", "aod", "shame", "self-compassion", "hard-patch", "mindset"],
  "plans changing": ["anxiety", "motivation", "mothers", "motherhood", "resilience"],
  "inner critic": ["mood", "aod", "shame", "self-compassion", "hard-patch", "mindset"],
  "over-scheduling": ["stress"],
  "mood awareness": ["mood", "mothers", "postpartum-adjacent"],
  "comfortable quiet": ["sleep", "anxiety"],
  "emotional labour": ["stress", "mood", "mothers", "motherhood", "exhaustion"],
  joy: ["mood", "gratitude", "mindset"],
  "self-judgement at night": ["sleep", "mood", "aod", "shame", "hard-patch"],
  play: ["mood", "motivation", "challenge"],
  "expectation load": ["stress", "mothers", "motherhood", "guilt"],
  "body cues": ["sleep", "stress", "aod", "craving"],
  "image management": ["anxiety", "mood"],
  "impatience with delays": ["stress"],
  appreciation: ["mood", "faith", "gratitude", "mindset"],
  "grievance collecting": ["mood"],
  "invisible progress": ["motivation", "challenge", "stronger-mind"],
  attention: ["faith", "stress", "stronger-mind"],
  impermanence: ["faith", "anxiety"],
  "after conflict": ["mood", "hard-patch"],
  "evening overload": ["sleep", "stress", "mothers", "motherhood", "exhaustion"],
  overwhelm: ["stress", "mothers", "overwhelm", "exhaustion", "hard-patch"],
  acceptance: ["mood", "faith", "aod", "recovery-adjacent", "mindset", "hard-patch"],
  "soft boundaries": ["stress"],
  "tunnel vision": ["anxiety", "stress", "stronger-mind"],
  "healing/patience": [
    "mood",
    "aod",
    "recovery-adjacent",
    "self-compassion",
    "hard-patch",
    "courage",
    "resilience",
  ],
  ego: ["stress"],
  waiting: ["anxiety", "motivation"],
  interruptions: ["stress", "mothers", "motherhood"],
  "body tension": ["stress", "sleep"],
  "optimisation pressure": ["stress", "motivation"],
  attribution: ["mood", "mindset"],
  "mental clutter": ["stress", "anxiety", "stronger-mind"],
  "showing up": ["motivation", "challenge", "courage"],
  "specific thanks": ["mood", "faith", "gratitude"],
  catastrophising: ["anxiety"],
  "asking/delegation": ["stress", "mothers", "motherhood"],
  lightness: ["mood", "mindset", "gratitude"],
  limits: ["stress", "aod", "recovery-adjacent"],
  reset: ["motivation", "mood", "hard-patch"],
  process: ["motivation", "stronger-mind", "challenge"],
  receiving: ["mood", "gratitude"],
  "self-consciousness": ["anxiety", "mood"],
  "prep without panic": ["anxiety", "stress", "stronger-mind"],
  "waiting in line": ["stress"],
  pace: ["stress", "stronger-mind"],
  "joy permission": ["mood", "gratitude", "mindset"],
  disengaging: ["stress"],
  maintenance: ["motivation", "gratitude"],
  "not knowing": ["anxiety", "faith"],
  priorities: ["motivation", "stress", "challenge"],
  overstimulation: ["stress", "sleep"],
  "productivity myths": ["motivation", "stress"],
  "emotions passing": ["mood", "anxiety", "aod", "craving", "hard-patch"],
  "pressure to perform": ["anxiety", "stress"],
  "old strategies": ["motivation", "aod", "recovery-adjacent", "alcohol", "drugs", "hard-patch"],
  closures: ["sleep", "mood", "hard-patch"],
  "ordinary life": ["faith", "gratitude", "mindset"],
  "fresh start": ["motivation", "aod", "recovery-adjacent", "alcohol", "drugs", "challenge", "courage"],
  "learning-loop": [
    "aod",
    "alcohol",
    "drugs",
    "craving",
    "shame",
    "low-mood",
    "learning-loop",
  ],
};

const ALLOWED_TAGS = new Set([
  ...PROBLEM_TAG_IDS,
  ...MOTHER_SUPPORT_TAGS,
  ...AOD_SUPPORT_TAGS,
  ...MENS_SUPPORT_TAGS,
  ...GROWTH_THEME_TAGS,
]);

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
  gratitude: "gratitude",
  mindset: "mindset",
  courage: "hard-patch",
  resilience: "stronger-mind",
  challenge: "challenge",
  "stronger-mind": "stronger-mind",
  "hard-patch": "hard-patch",
  mothers: "mothers",
  motherhood: "mothers",
  "mens-health": "mens-health",
  discipline: "mens-health",
  mateship: "mens-health",
  purpose: "mens-health",
  fatherhood: "mens-health",
  "emotional-courage": "mens-health",
  fitness: "mens-health",
  aod: "aod",
  alcohol: "aod",
  drugs: "aod",
  craving: "aod",
  "recovery-shame": "aod",
  "recovery-adjacent": "aod",
  shame: "aod",
  "low-mood": "mood",
  "learning-loop": "aod",
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
