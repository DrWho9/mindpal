import { sessionPreferences, updateSessionPreferences } from "./faith.js";

export const AGE_BANDS = [
  { id: "under_18", label: "Under 18" },
  { id: "18_29", label: "18–29" },
  { id: "30_39", label: "30–39" },
  { id: "40_49", label: "40–49" },
  { id: "50_59", label: "50–59" },
  { id: "60_plus", label: "60+" },
];

export const GENDERS = [
  { id: "man", label: "Man" },
  { id: "woman", label: "Woman" },
  { id: "nonbinary", label: "Non-binary" },
  { id: "prefer_not", label: "Prefer not to say" },
];

export const FACTS_DISCLAIMER =
  "MindPal facts are reflection and education — not a diagnosis and not medical advice. Take what helps; leave the rest.";

const YOUTH_UNSAFE =
  /heart|depression|diagnos|disease|weight|midlife|menopause|undetected|undiagnosed/i;

function copyFacts(facts) {
  return (facts || []).slice(0, 2).map((item) => ({
    id: item.id,
    body: item.body,
    action: item.action,
  }));
}

function fact(id, body, action) {
  return { id, body, action };
}

const YOUTH_FACTS = [
  fact(
    "youth-sleep",
    "Many young people feel clearer the next day when the night has a simple wind-down — a quieter screen, a short read, then rest.",
    "Ten minutes tonight on MindPal: one reading, then lights down.",
  ),
  fact(
    "youth-mates",
    "A hard day can feel lighter when you talk with a mate or a trusted adult. You do not have to sort it all alone.",
    "Name one person you could talk to, then take one MindPal breath.",
  ),
];

const FACTS = {
  "18_29:man": [
    fact(
      "m1829-sleep",
      "Many younger men feel better when nights have a wind-down and the next day has one clear move. Sleep and mood often travel together.",
      "Ten minutes on MindPal tonight: one reading, one breath, or one win.",
    ),
    fact(
      "m1829-move",
      "Strength is also showing up — a walk, a mate, a small habit. Movement can support energy and heart health over time.",
      "Take a ten-minute walk, then log one MindPal win.",
    ),
  ],
  "30_39:man": [
    fact(
      "m3039-load",
      "Many men in their thirties carry work, family, and a mind that stays on. Low mood can hide as “just being busy.”",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "m3039-sleep",
      "Sleep and a short reset can help you stay present for the people who count on you. Checking in is a strength.",
      "Close today on MindPal with one win.",
    ),
  ],
  "40_49:man": [
    fact(
      "m4049-mood",
      "Men just under 50 can lose interest in everyday life when low mood goes unnoticed — and that can connect to weight and heart risk. Ten minutes a day with MindPal habits can start to change the curve.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "m4049-sleep",
      "Sleep and mood often travel together in midlife. A short evening wind-down can help you stay present for work, family, and your own strength.",
      "Tonight, close the day on MindPal with one win or one quiet reading.",
    ),
  ],
  "50_59:man": [
    fact(
      "m5059-energy",
      "Many men in their fifties notice energy, sleep, or interest in everyday life can drift — and that can sit alongside heart and weight health. Checking in is a strength, not a weakness.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "m5059-connect",
      "Connection often thins when work and family load stay high. A regular check-in — a mate, a walk, or a MindPal habit — can keep you in the game.",
      "Message one person this week, then log a small MindPal win.",
    ),
  ],
  "60_plus:man": [
    fact(
      "m60-connect",
      "Many men over 60 notice connection can thin after work or family rhythms change — and that can sit with mood and heart health. Staying in the game matters.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "m60-move",
      "Gentle movement and a regular yarn with a mate often support energy and everyday interest in life.",
      "Message one person this week, then take a short walk and log one MindPal win.",
    ),
  ],
  "18_29:woman": [
    fact(
      "w1829-sleep",
      "Sleep and mood often travel together. A short wind-down can help the next day feel more doable.",
      "Ten minutes on MindPal tonight: one reading or one breath.",
    ),
    fact(
      "w1829-load",
      "Many younger women carry study, work, and other people’s needs at once. A small pause is allowed.",
      "Use MindPal for one honest sentence, then one win.",
    ),
  ],
  "30_39:woman": [
    fact(
      "w3039-load",
      "Many women in their thirties carry a full load — work, care, and a mind that rarely clocks off. Stress can stack and wear on sleep.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "w3039-pause",
      "A short evening pause can help you land, not just push through.",
      "Close today on MindPal with one wind-down reading or one win.",
    ),
  ],
  "40_49:woman": [
    fact(
      "w4049-load",
      "Many women in their forties carry a heavy midlife load — work, care, and a mind that rarely clocks off. Stress can stack quietly and wear on sleep and mood.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "w4049-sleep",
      "Sleep and mood often move together when days stay full. A short evening pause can help you land, not just push through.",
      "Tonight, use MindPal for one wind-down reading or one honest sentence.",
    ),
  ],
  "50_59:woman": [
    fact(
      "w5059-shift",
      "Many women in their fifties notice sleep, mood, or energy can shift as midlife load and body changes meet. That is a common stretch — not a personal failing.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "w5059-connect",
      "Connection can thin when caring for others still comes first. A regular check-in — a friend, a walk, or a MindPal habit — can hold you up too.",
      "Reach one person this week, then save one MindPal win.",
    ),
  ],
  "60_plus:woman": [
    fact(
      "w60-connect",
      "Many women over 60 notice connection, sleep, or energy can shift as roles change. Staying in touch is a health habit too.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "w60-move",
      "Gentle movement and a regular check-in often support heart health and everyday mood. Small steps count.",
      "Take a short walk or stretch, then log one MindPal win.",
    ),
  ],
  "18_29:general": [
    fact(
      "g1829-sleep",
      "Sleep and mood often travel together in early adulthood. A regular wind-down can help the next day feel more doable.",
      "Ten minutes on MindPal tonight: one reading or one breath.",
    ),
    fact(
      "g1829-move",
      "Movement and a short outdoor stretch can lift energy for many people. A small habit is enough to start.",
      "Take a ten-minute walk, then log one MindPal win.",
    ),
  ],
  "30_39:general": [
    fact(
      "g3039-load",
      "Many people in their thirties carry a full load — work, home, and a mind that stays on. Stress can stack and wear on sleep.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "g3039-pause",
      "A short pause can help you stay present instead of only pushing through. Small habits often change the curve more than a big overhaul.",
      "Close today on MindPal with one honest sentence or one win.",
    ),
  ],
  "40_49:general": [
    fact(
      "g4049-mood",
      "Midlife can quietly thin interest in everyday life when low mood or load goes unnoticed. Many people find a small daily check-in helps.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "g4049-sleep",
      "Sleep, movement, and connection often sit together with mood. A regular habit can start to change the curve.",
      "Tonight, use MindPal for one wind-down or one small win.",
    ),
  ],
  "50_59:general": [
    fact(
      "g5059-energy",
      "Many people in their fifties notice energy, sleep, or interest in everyday life can drift. A regular check-in is a strength.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "g5059-connect",
      "Connection can thin while work and care stay high. A mate, a walk, or a MindPal habit can keep you in the game.",
      "Reach one person this week, then save one MindPal win.",
    ),
  ],
  "60_plus:general": [
    fact(
      "g60-connect",
      "Many older adults notice loneliness or thinner connection can sit alongside sleep and mood. Staying in touch is a health habit too.",
      "Ten minutes a day on MindPal: one reading, one breath, or one win.",
    ),
    fact(
      "g60-move",
      "Gentle movement and a regular check-in often support heart health and everyday energy. Small, repeatable steps count.",
      "Take a short walk or stretch, then log one MindPal win.",
    ),
  ],
};

const DEFAULT_FACTS = FACTS["40_49:general"];

export function normalizeAgeBand(idOrLabel) {
  const raw = typeof idOrLabel === "string" ? idOrLabel.trim() : "";
  if (!raw) return "";
  const lower = raw.toLowerCase().replace(/[–—]/g, "-");
  const found = AGE_BANDS.find(
    (item) =>
      item.id === raw ||
      item.id === lower ||
      item.label.toLowerCase() === raw.toLowerCase() ||
      item.label.toLowerCase().replace(/[–—]/g, "-") === lower,
  );
  return found?.id || "";
}

export function normalizeGender(idOrLabel) {
  const raw = typeof idOrLabel === "string" ? idOrLabel.trim() : "";
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "non-binary" || lower === "non binary") return "nonbinary";
  if (lower === "prefer not to say" || lower === "prefer_not_to_say") return "prefer_not";
  const found = GENDERS.find(
    (item) => item.id === raw || item.id === lower || item.label.toLowerCase() === lower,
  );
  return found?.id || "";
}

export function isYouthBand(idOrPrefs) {
  const id =
    idOrPrefs && typeof idOrPrefs === "object"
      ? normalizeAgeBand(idOrPrefs.ageBand)
      : normalizeAgeBand(idOrPrefs);
  return id === "under_18";
}

export function ageBandLabel(idOrPrefs) {
  const id =
    idOrPrefs && typeof idOrPrefs === "object"
      ? normalizeAgeBand(idOrPrefs.ageBand)
      : normalizeAgeBand(idOrPrefs);
  return AGE_BANDS.find((item) => item.id === id)?.label || "";
}

export function genderLabel(idOrPrefs) {
  const id =
    idOrPrefs && typeof idOrPrefs === "object"
      ? normalizeGender(idOrPrefs.gender)
      : normalizeGender(idOrPrefs);
  return GENDERS.find((item) => item.id === id)?.label || "";
}

export function hasProfileDemographics(prefs) {
  if (!prefs || typeof prefs !== "object") return false;
  return Boolean(normalizeAgeBand(prefs.ageBand) && normalizeGender(prefs.gender));
}

export function profileSummary(prefs) {
  if (!hasProfileDemographics(prefs)) return "Not set yet";
  return `${ageBandLabel(prefs)} · ${genderLabel(prefs)}`;
}

export function prefsFromProfileChoice({ ageBand, gender } = {}) {
  return {
    ageBand: normalizeAgeBand(ageBand),
    gender: normalizeGender(gender),
  };
}

export function factsForProfile(ageBandOrPrefs, gender) {
  const age =
    ageBandOrPrefs && typeof ageBandOrPrefs === "object"
      ? normalizeAgeBand(ageBandOrPrefs.ageBand)
      : normalizeAgeBand(ageBandOrPrefs);
  const g =
    ageBandOrPrefs && typeof ageBandOrPrefs === "object"
      ? normalizeGender(ageBandOrPrefs.gender)
      : normalizeGender(gender);
  if (!age) return [];
  if (age === "under_18") return copyFacts(YOUTH_FACTS);
  const bucket = g === "man" || g === "woman" ? g : "general";
  const specific = FACTS[`${age}:${bucket}`];
  if (specific) return copyFacts(specific);
  return copyFacts(DEFAULT_FACTS);
}

export function factsAreYouthSafe(facts) {
  return (facts || []).every(
    (item) => !YOUTH_UNSAFE.test(`${item?.body || ""} ${item?.action || ""}`),
  );
}

export function setSessionProfilePrefs(choice, storage = globalThis.localStorage) {
  const next = prefsFromProfileChoice(choice);
  return updateSessionPreferences(next, storage) || next;
}

export function sessionProfilePreferences(storage = globalThis.localStorage) {
  return sessionPreferences(storage);
}
