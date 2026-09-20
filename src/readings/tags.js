import { isOwnerReading, mergeOwnerReadings } from "./owner.js";

/** Controlled Pack A feeling/problem tags. Stored without #; UI may show #tag. */

export const TAG_VOCAB = [
  "anger",
  "low-mood",
  "anxiety",
  "worry",
  "sleep",
  "stress",
  "overwhelm",
  "grief",
  "motivation",
  "faith",
  "self-compassion",
  "relationships",
  "gratitude",
  "mindset",
  "courage",
  "resilience",
  "challenge",
  "boundaries",
  "calm",
  "drugs",
  "alcohol",
  "craving",
  "recovery-shame",
  "learning-loop",
];

export const TAG_LABELS = {
  anger: "Anger",
  "low-mood": "Low mood",
  anxiety: "Anxiety",
  worry: "Worry",
  sleep: "Sleep",
  stress: "Stress",
  overwhelm: "Overwhelm",
  grief: "Grief",
  motivation: "Motivation",
  faith: "Faith",
  "self-compassion": "Self-compassion",
  relationships: "Relationships",
  gratitude: "Gratitude",
  mindset: "Positive mindset",
  courage: "Courage",
  resilience: "Resilience",
  challenge: "Challenge",
  boundaries: "Boundaries",
  calm: "Calm",
  drugs: "Drugs",
  alcohol: "Alcohol",
  craving: "Craving",
  "recovery-shame": "Recovery shame",
  "learning-loop": "Learning loop",
};

/**
 * PR #8 / #16 problem-hub ids. `mood` aliases to `low-mood` in this vocab so
 * Morning/Day/Night hubs and Feelings chips can share catalogs.
 */
export const PROBLEM_HUB_TAGS = [
  "sleep",
  "anxiety",
  "stress",
  "mood",
  "motivation",
  "faith",
  "aod",
  "mindset",
  "stronger-mind",
  "challenge",
  "hard-patch",
  "gratitude",
];

export const AOD_FEELING_TAGS = ["drugs", "alcohol", "craving", "recovery-shame", "learning-loop"];

export const TAG_ALIASES = {
  mood: "low-mood",
  "recovery-adjacent": "recovery-shame",
  shame: "recovery-shame",
  "stronger-mind": "resilience",
  "hard-patch": "courage",
};

/** Feelings dropdown ids → controlled tags (any-match). */
export const FEELING_TO_TAGS = {
  sad: ["low-mood", "grief"],
  anxious: ["anxiety", "worry"],
  angry: ["anger"],
  overwhelmed: ["overwhelm", "stress"],
  lonely: ["relationships", "low-mood"],
  guilty: ["self-compassion", "recovery-shame"],
  numb: ["low-mood"],
  unsure: ["calm", "self-compassion"],
  sleep: ["sleep", "calm"],
  anxiety: ["anxiety", "worry"],
  stress: ["stress", "overwhelm"],
  "low-mood": ["low-mood", "grief"],
  anger: ["anger"],
  motivation: ["motivation"],
  mindset: ["mindset", "gratitude"],
  "stronger-mind": ["resilience", "motivation"],
  challenge: ["challenge", "motivation"],
  "hard-patch": ["courage", "self-compassion"],
  gratitude: ["gratitude"],
  courage: ["courage"],
  resilience: ["resilience"],
  faith: ["faith"],
  overwhelm: ["overwhelm", "stress"],
  mothers: ["self-compassion", "overwhelm", "faith"],
  aod: AOD_FEELING_TAGS,
  drugs: ["drugs", "alcohol", "craving"],
  alcohol: ["alcohol", "craving", "recovery-shame"],
  craving: ["craving"],
  "recovery-shame": ["recovery-shame"],
};

/**
 * Thoughtful theme_label → tags for every Pack A reading.
 * Overlaps problem-hub ids used on the Morning/Day/Night branch
 * (anxiety, sleep, stress, motivation, faith) plus richer feeling vocab.
 */
export const THEME_LABEL_TO_TAGS = {
  "small irritations": ["anger", "stress", "calm"],
  imperfection: ["self-compassion", "motivation", "stress", "mindset"],
  "gentleness vs pressure": ["stress", "calm", "self-compassion", "resilience"],
  "rumination escalation": ["worry", "anxiety", "overwhelm"],
  compassion: ["self-compassion", "relationships", "gratitude", "mindset"],
  "perspective-taking": ["relationships", "calm", "anger", "mindset"],
  "prioritising conflict": ["relationships", "anger", "boundaries"],
  "reactive communication": ["anger", "relationships", "calm"],
  "gratitude for small": ["gratitude", "calm", "faith", "mindset"],
  impatience: ["stress", "anger", "calm"],
  "over-identification with tasks": ["stress", "motivation", "overwhelm"],
  "uncertainty tolerance": ["anxiety", "worry", "calm", "resilience"],
  comparison: ["low-mood", "self-compassion", "motivation", "courage"],
  "receiving support": ["relationships", "self-compassion", "low-mood", "alcohol", "drugs", "recovery-shame"],
  "single-tasking": ["overwhelm", "stress", "motivation", "resilience"],
  "need to be right": ["relationships", "anger", "boundaries"],
  "holding grudges": ["anger", "grief", "relationships"],
  "scarcity mindset": ["anxiety", "worry", "gratitude", "mindset"],
  connection: ["relationships", "gratitude", "faith"],
  "waiting to start": ["motivation", "overwhelm", "stress", "challenge"],
  "false emergencies": ["anxiety", "stress", "overwhelm"],
  "drama resistance": ["stress", "relationships", "calm", "resilience"],
  "charitable interpretation": ["relationships", "self-compassion", "calm", "mindset"],
  "rest guilt": ["sleep", "self-compassion", "stress"],
  boundaries: ["boundaries", "relationships", "stress"],
  "micro-completion": ["motivation", "overwhelm", "calm", "challenge"],
  "mental replay": ["worry", "anxiety", "anger"],
  "work spillover": ["stress", "sleep", "boundaries"],
  listening: ["relationships", "calm", "gratitude"],
  rush: ["stress", "calm", "overwhelm"],
  judgement: ["self-compassion", "relationships", "calm", "mindset"],
  overcommitment: ["overwhelm", "stress", "boundaries"],
  "emotional patience": ["low-mood", "grief", "calm", "resilience"],
  recognition: ["relationships", "gratitude", "motivation"],
  "embodied reset": ["anxiety", "worry", "calm", "resilience"],
  "self-forgiveness": ["self-compassion", "grief", "faith", "recovery-shame", "alcohol", "drugs", "courage"],
  "mind-reading": ["anxiety", "worry", "relationships"],
  "domestic perfection": ["stress", "self-compassion", "overwhelm"],
  "relational priority": ["relationships", "anger", "calm"],
  grounding: ["anxiety", "overwhelm", "calm", "resilience"],
  "load shedding": ["overwhelm", "stress", "boundaries"],
  "self-talk": ["self-compassion", "low-mood", "motivation", "recovery-shame", "mindset"],
  "plans changing": ["anxiety", "stress", "motivation", "resilience"],
  "inner critic": ["self-compassion", "low-mood", "anxiety", "recovery-shame", "courage"],
  "over-scheduling": ["overwhelm", "stress", "boundaries"],
  "mood awareness": ["low-mood", "calm", "self-compassion"],
  "comfortable quiet": ["relationships", "calm", "anxiety"],
  "emotional labour": ["boundaries", "relationships", "overwhelm"],
  joy: ["gratitude", "calm", "motivation", "mindset"],
  "self-judgement at night": ["sleep", "self-compassion", "low-mood", "recovery-shame"],
  play: ["motivation", "calm", "relationships", "challenge"],
  "expectation load": ["stress", "overwhelm", "self-compassion"],
  "body cues": ["sleep", "stress", "calm", "craving"],
  "image management": ["anxiety", "self-compassion", "stress"],
  "impatience with delays": ["anger", "stress", "calm"],
  appreciation: ["gratitude", "relationships", "faith", "mindset"],
  "grievance collecting": ["anger", "relationships", "grief"],
  "invisible progress": ["motivation", "self-compassion", "low-mood", "challenge"],
  attention: ["calm", "overwhelm", "stress", "resilience"],
  impermanence: ["faith", "grief", "calm"],
  "after conflict": ["relationships", "anger", "grief", "courage"],
  "evening overload": ["sleep", "overwhelm", "stress"],
  overwhelm: ["overwhelm", "stress", "motivation"],
  acceptance: ["calm", "faith", "grief", "recovery-shame", "mindset"],
  "soft boundaries": ["boundaries", "relationships", "stress"],
  "tunnel vision": ["anxiety", "overwhelm", "calm", "resilience"],
  "healing/patience": ["grief", "self-compassion", "calm", "recovery-shame", "courage", "resilience"],
  ego: ["relationships", "self-compassion", "motivation"],
  waiting: ["anxiety", "stress", "calm"],
  interruptions: ["stress", "relationships", "anger"],
  "body tension": ["stress", "sleep", "calm"],
  "optimisation pressure": ["stress", "motivation", "overwhelm"],
  attribution: ["relationships", "self-compassion", "anger", "mindset"],
  "mental clutter": ["overwhelm", "anxiety", "stress", "resilience"],
  "showing up": ["motivation", "self-compassion", "relationships", "challenge", "courage"],
  "specific thanks": ["gratitude", "relationships", "faith"],
  catastrophising: ["anxiety", "worry", "overwhelm"],
  "asking/delegation": ["overwhelm", "relationships", "boundaries"],
  lightness: ["calm", "gratitude", "low-mood", "mindset"],
  limits: ["boundaries", "overwhelm", "self-compassion", "recovery-shame"],
  reset: ["calm", "stress", "motivation", "courage"],
  process: ["motivation", "self-compassion", "stress", "challenge", "resilience"],
  receiving: ["relationships", "self-compassion", "low-mood"],
  "self-consciousness": ["anxiety", "self-compassion", "relationships"],
  "prep without panic": ["anxiety", "sleep", "stress", "resilience"],
  "waiting in line": ["stress", "calm", "anger"],
  pace: ["motivation", "self-compassion", "stress", "resilience"],
  "joy permission": ["gratitude", "self-compassion", "low-mood", "mindset"],
  disengaging: ["anger", "boundaries", "relationships"],
  maintenance: ["relationships", "gratitude", "motivation"],
  "not knowing": ["anxiety", "faith", "calm"],
  priorities: ["motivation", "relationships", "stress", "challenge"],
  overstimulation: ["overwhelm", "sleep", "stress"],
  "productivity myths": ["motivation", "stress", "self-compassion"],
  "emotions passing": ["low-mood", "anger", "grief", "craving"],
  "pressure to perform": ["anxiety", "stress", "self-compassion"],
  "old strategies": ["self-compassion", "grief", "motivation", "alcohol", "drugs", "craving", "recovery-shame", "courage"],
  closures: ["sleep", "grief", "calm"],
  "ordinary life": ["faith", "gratitude", "calm", "mindset"],
  "fresh start": ["motivation", "self-compassion", "calm", "alcohol", "drugs", "recovery-shame", "challenge", "courage"],
  "learning-loop": ["alcohol", "drugs", "craving", "recovery-shame", "low-mood", "learning-loop"],
};

export const SUPPORT_DISCLAIMER =
  "Support content to help you reflect — not a diagnosis or a course of treatment. AU urgent help: 000 / Lifeline 13 11 14.";

export function formatTag(tag) {
  return TAG_VOCAB.includes(tag) ? `#${tag}` : "";
}

export function canonicalizeTag(tag) {
  if (typeof tag !== "string") return "";
  const trimmed = tag.trim().replace(/^#/, "");
  const mapped = TAG_ALIASES[trimmed] || trimmed;
  return TAG_VOCAB.includes(mapped) ? mapped : "";
}

export function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(canonicalizeTag).filter(Boolean))];
}

export function tagsForThemeLabel(label) {
  if (typeof label !== "string" || !label.trim()) return [];
  return normalizeTags(THEME_LABEL_TO_TAGS[label.trim()] || []);
}

export function tagsForFeeling(feelingId) {
  if (typeof feelingId !== "string" || !feelingId.trim()) return [];
  const key = feelingId.trim();
  if (FEELING_TO_TAGS[key]) return normalizeTags(FEELING_TO_TAGS[key]);
  const asTag = canonicalizeTag(key);
  return asTag ? [asTag] : [];
}

export function readingTags(reading) {
  const stored = normalizeTags(reading?.tags);
  if (stored.length) return stored;
  const hub = normalizeTags(reading?.problemTags || reading?.theme_tags);
  if (hub.length) return hub;
  return tagsForThemeLabel(reading?.theme_label);
}

export function readingHasAnyTag(reading, tags) {
  const wanted = normalizeTags(tags);
  if (!wanted.length) return true;
  const have = readingTags(reading);
  return wanted.some((tag) => have.includes(tag));
}

export function readingsForTags(pack, tags) {
  const readings = mergeOwnerReadings(pack);
  const wanted = normalizeTags(tags);
  const filtered = wanted.length
    ? readings.filter((item) => readingHasAnyTag(item, wanted))
    : readings;
  return filtered.sort((a, b) => {
    const ownerDelta = Number(isOwnerReading(b)) - Number(isOwnerReading(a));
    if (ownerDelta) return ownerDelta;
    return Number(a.day) - Number(b.day);
  });
}

export function usedTags(pack) {
  const counts = new Map(TAG_VOCAB.map((tag) => [tag, 0]));
  const readings = mergeOwnerReadings(pack);
  for (const item of readings) {
    for (const tag of readingTags(item)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return TAG_VOCAB.filter((tag) => (counts.get(tag) || 0) > 0).map((tag) => ({
    id: tag,
    label: TAG_LABELS[tag],
    chip: formatTag(tag),
    count: counts.get(tag) || 0,
  }));
}

export function supportUnlockMessage(reading, readings, completedIds) {
  if (isOwnerReading(reading)) {
    return "MindPal original support reading — always open. It is not a Pack A morning day, and opening here does not mark Done.";
  }
  const day = Number(reading?.day);
  if (!reading?.id || !Number.isFinite(day)) {
    return "You can read this as support. Marking Done still follows the morning pathway, one day at a time.";
  }
  if (completedIds.includes(reading.id)) {
    return `Already marked Done on the morning pathway (Day ${day} of 100).`;
  }
  if (day <= 1) {
    return "You can read this as support. Day 1 is unlocked on the morning Readings pathway — Done there counts toward the pack.";
  }
  const prevDone = readings.some(
    (item) => Number(item.day) === day - 1 && completedIds.includes(item.id),
  );
  if (prevDone) {
    return `You can read this as support. Day ${day} is unlocked on the morning pathway — Done there (or here) counts. Opening or listening is not Done.`;
  }
  return `You can read this as support. On the morning Readings path, Day ${day} unlocks after you mark Day ${day - 1} Done. Opening here does not skip that gate.`;
}

export function applyControlledTags(reading) {
  const tags = tagsForThemeLabel(reading?.theme_label);
  return { ...reading, tags };
}
