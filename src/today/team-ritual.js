import { civilDateKey } from "../calendar/civil.js";

export const TEAM_RITUAL_STORAGE_KEY = "mindpal.teamMorningRitual.v1";
export const TEAM_RITUAL_CHANGE_EVENT = "mindpal-team-ritual-change";

export const TEAM_RITUAL_TITLE = "MindPal work team morning ritual";
export const TEAM_RITUAL_SHORT = "MindPal team morning settle";
export const TEAM_RITUAL_EYEBROW = "MINDPAL · OPTIONAL · WORK TEAM";
export const TEAM_RITUAL_OPEN =
  "MindPal is glad you’re here — let’s settle in together before the day gets loud.";
export const TEAM_RITUAL_LEDE =
  "Arrive with MindPal, then start. Three quiet minutes, a verse, then one peaceful reading. Optional — nobody is keeping score.";
export const TEAM_RITUAL_HINT =
  "Tap to expand. Breath first, then the verse, then the words.";
export const TEAM_RITUAL_BREATH_HERO =
  "About three minutes. Follow Maddy if you’d like company — inhale 4, hold 4, exhale 6. MindPal counts down each phase. The clock keeps going after the clip ends.";
export const TEAM_RITUAL_FLOW =
  "Step 1 Breathe, then Step 2 Verse, then Step 3 Peaceful reading.";
export const TEAM_RITUAL_VERSE_HERO =
  "MindPal keeps today’s verse optional. If you named a tradition, we use that lane. If not, a gentle non-faith teaching from the same catalog — never invented scripture.";
export const TEAM_RITUAL_CHAPTER_SUMMARY = "Read the whole chapter — tap to expand";

export const TEAM_RITUAL_BREATH_ID = "maddy-timed-breath";
export const TEAM_RITUAL_BREATH_SRC = "/videos/maddy/timed-breath.mp4";

export const RITUAL_STEP_IDS = ["breathe", "verse", "reading"];

export const RITUAL_STEPS = {
  breathe: {
    id: "breathe",
    number: 1,
    title: "Breathe",
    rowLabel: "Breathe (~3 min)",
    blurb: "Settle the body first with MindPal. Follow Maddy’s timed breath, or the quiet countdown cues here.",
  },
  verse: {
    id: "verse",
    number: 2,
    title: "Verse of the day",
    rowLabel: "Verse of the day",
    blurb: "Today’s verse from the MindPal catalog. Expand the chapter if you want the surrounding lines.",
  },
  reading: {
    id: "reading",
    number: 3,
    title: "Peaceful reading",
    rowLabel: "Peaceful reading",
    blurb: "One gentle Pack A piece is enough. Not a problem hub.",
  },
};

export const SECULAR_VERSE_LANES = ["stoic", "wisdom", "science_of_mind"];
export const SECULAR_TRADITIONS = [
  "",
  "no religion",
  "prefer not to say",
  "spiritual without a religion",
  "another tradition",
  "hinduism",
  "sikhism",
];
export const TRADITION_TO_LANE = {
  christianity: "christian",
  christian: "christian",
  "coptic orthodox": "christian",
  coptic: "christian",
  islam: "islamic",
  muslim: "islamic",
  judaism: "jewish",
  jewish: "jewish",
  buddhism: "buddhist",
  buddhist: "buddhist",
};

/** Calm / gratitude / mindset-adjacent Pack A mornings — not heavy support hubs. */
export const PEACEFUL_THEME_LABELS = [
  "gratitude for small",
  "compassion",
  "connection",
  "listening",
  "recognition",
  "joy",
  "appreciation",
  "specific thanks",
  "lightness",
  "receiving",
  "joy permission",
  "ordinary life",
];

export const HEAVY_RITUAL_TAGS = [
  "aod",
  "mothers",
  "mens-health",
  "sleep",
  "anxiety",
  "drugs",
  "alcohol",
  "craving",
];

/** ~3 minutes. Maddy’s clip is shorter; the timer keeps the gentle cues going. */
export const BREATH_DURATION_SEC = 180;
export const BREATH_COUNT_SEC = 1.5;
export const BREATH_INHALE_COUNTS = 4;
export const BREATH_HOLD_COUNTS = 4;
export const BREATH_EXHALE_COUNTS = 6;
export const BREATH_SETTLE_SEC = 8;
export const BREATH_CYCLE_SEC =
  (BREATH_INHALE_COUNTS + BREATH_HOLD_COUNTS + BREATH_EXHALE_COUNTS) * BREATH_COUNT_SEC;

function readingTags(reading) {
  const tags = [];
  if (Array.isArray(reading?.theme_tags)) tags.push(...reading.theme_tags);
  if (Array.isArray(reading?.tags)) tags.push(...reading.tags);
  if (Array.isArray(reading?.problemTags)) tags.push(...reading.problemTags);
  return tags;
}

export function stableIndex(key, length) {
  const size = Number(length) || 0;
  if (size <= 0) return 0;
  const text = String(key || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

export function peacefulReadings(pack) {
  const list = Array.isArray(pack?.readings) ? pack.readings : [];
  return list.filter((item) => {
    if (!item || !PEACEFUL_THEME_LABELS.includes(item.theme_label)) return false;
    return !readingTags(item).some((tag) => HEAVY_RITUAL_TAGS.includes(tag));
  });
}

export function pickPeacefulReading(pack, date = new Date(), excludeId) {
  const pool = peacefulReadings(pack).filter((item) => item.id !== excludeId);
  if (!pool.length) return null;
  return pool[stableIndex(civilDateKey(date), pool.length)];
}

export function verseLaneForTradition(tradition) {
  const key = String(tradition || "").trim().toLowerCase();
  if (!key || SECULAR_TRADITIONS.includes(key)) return "wisdom";
  if (TRADITION_TO_LANE[key]) return TRADITION_TO_LANE[key];
  if (/coptic|christian/.test(key)) return "christian";
  if (/islam|muslim/.test(key)) return "islamic";
  if (/jew/.test(key)) return "jewish";
  if (/buddh/.test(key)) return "buddhist";
  return "wisdom";
}

export function verseEntriesForLane(catalog, lane) {
  const entries = Array.isArray(catalog?.entries) ? catalog.entries : [];
  const wanted = lane || "wisdom";
  const match = entries.filter((item) => item?.lane === wanted);
  if (match.length) return match;
  if (wanted === "wisdom" || SECULAR_VERSE_LANES.includes(wanted)) {
    return entries.filter((item) => SECULAR_VERSE_LANES.includes(item?.lane));
  }
  return [];
}

export function pickRitualVerse(catalog, date = new Date(), tradition) {
  const lane = verseLaneForTradition(tradition);
  const pool = verseEntriesForLane(catalog, lane);
  const today = civilDateKey(date);
  if (pool.length) {
    return pool.find((item) => item.date === today) || pool[stableIndex(`${today}:${lane}`, pool.length)];
  }
  if (lane === "christian" && catalog?.default) return catalog.default;
  const secular = verseEntriesForLane(catalog, "wisdom");
  return secular[0] || catalog?.default || null;
}

export function ritualTradition(prefs) {
  return typeof prefs?.tradition === "string" ? prefs.tradition : "";
}

/** Public-domain WEB chapter fetch, or the catalog’s own source URL. Never invents text. */
export function ritualChapterTarget(entry) {
  const verse = entry?.verse || {};
  const reference = String(verse.reference || "");
  const url = verse.url || "";
  const lane = entry?.lane || "";
  const web = reference.match(
    /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|John|Jude|Revelation)\s+(\d+)/i,
  );
  if ((lane === "christian" || lane === "jewish" || /WEB/i.test(reference)) && web) {
    const book = /psalm/i.test(web[1]) ? "Psalms" : web[1];
    const chapter = web[2];
    return {
      kind: "web",
      label: `${book} ${chapter}`,
      fetchUrl: `https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}?translation=web`,
      openUrl: url || `https://www.biblegateway.com/passage/?search=${encodeURIComponent(`${book}+${chapter}`)}&version=WEB`,
    };
  }
  if (url) {
    return { kind: "source", label: reference || "Source", fetchUrl: null, openUrl: url };
  }
  return null;
}

export function breathClip(catalog) {
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : [];
  return videos.find((item) => item?.id === TEAM_RITUAL_BREATH_ID) || null;
}

export function breathClipSrc(catalog) {
  const clip = breathClip(catalog);
  return clip?.src || clip?.videoUrl || TEAM_RITUAL_BREATH_SRC;
}

export function formatBreathClock(remainingSec) {
  const n = Math.max(0, Math.ceil(Number(remainingSec) || 0));
  const minutes = Math.floor(n / 60);
  const seconds = n % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function remainingPhaseCount(phaseElapsedSec, totalCounts) {
  const total = Math.max(1, Number(totalCounts) || 1);
  const elapsed = Math.max(0, Number(phaseElapsedSec) || 0);
  const used = Math.floor(elapsed / BREATH_COUNT_SEC);
  return Math.max(1, total - used);
}

export function breathCueAt(elapsedSec) {
  const elapsed = Math.max(0, Number(elapsedSec) || 0);
  if (elapsed >= BREATH_DURATION_SEC) {
    return { phase: "done", count: null, label: "That’s enough. Let the next breath be ordinary." };
  }
  if (elapsed < BREATH_SETTLE_SEC) {
    return { phase: "settle", count: null, label: "Settle in. Soften the jaw and drop the shoulders." };
  }
  const t = (elapsed - BREATH_SETTLE_SEC) % BREATH_CYCLE_SEC;
  const inhale = BREATH_INHALE_COUNTS * BREATH_COUNT_SEC;
  const hold = inhale + BREATH_HOLD_COUNTS * BREATH_COUNT_SEC;
  if (t < inhale) {
    return {
      phase: "inhale",
      count: remainingPhaseCount(t, BREATH_INHALE_COUNTS),
      label: "Inhale gently…",
    };
  }
  if (t < hold) {
    return {
      phase: "hold",
      count: remainingPhaseCount(t - inhale, BREATH_HOLD_COUNTS),
      label: "Hold softly…",
    };
  }
  return {
    phase: "exhale",
    count: remainingPhaseCount(t - hold, BREATH_EXHALE_COUNTS),
    label: "Exhale, unhurried…",
  };
}

function asStatus(value) {
  return value === "done" || value === "skipped" ? value : "todo";
}

export function emptyRitual(pack, date = new Date()) {
  const reading = pickPeacefulReading(pack, date);
  return {
    version: 2,
    date: civilDateKey(date),
    breathe: "todo",
    verse: "todo",
    reading: "todo",
    readingId: reading?.id || null,
  };
}

export function normalizeRitual(raw, pack, date = new Date()) {
  const today = civilDateKey(date);
  const base = emptyRitual(pack, date);
  if (!raw || typeof raw !== "object") return base;
  if (raw.date !== today) return base;
  const pool = peacefulReadings(pack);
  const readingId = pool.some((item) => item.id === raw.readingId)
    ? raw.readingId
    : base.readingId;
  const breathe = asStatus(raw.breathe);
  let verse = raw.verse == null && asStatus(raw.reading) !== "todo" ? "done" : asStatus(raw.verse);
  let reading = asStatus(raw.reading);
  if (verse !== "todo" && breathe === "todo") verse = "todo";
  if (reading !== "todo" && verse === "todo") reading = "todo";
  return { version: 2, date: today, breathe, verse, reading, readingId };
}

export function parseRitualJson(text, pack, date = new Date()) {
  if (!text || typeof text !== "string") return emptyRitual(pack, date);
  try {
    return normalizeRitual(JSON.parse(text), pack, date);
  } catch {
    return emptyRitual(pack, date);
  }
}

export function loadRitual(pack, storage = globalThis.localStorage, date = new Date()) {
  if (!storage) return emptyRitual(pack, date);
  try {
    return parseRitualJson(storage.getItem(TEAM_RITUAL_STORAGE_KEY), pack, date);
  } catch {
    return emptyRitual(pack, date);
  }
}

export function saveRitual(ritual, pack, storage = globalThis.localStorage, date = new Date()) {
  const next = normalizeRitual(ritual, pack, date);
  if (!storage) return next;
  try {
    storage.setItem(TEAM_RITUAL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  return next;
}

export function ritualStepStatus(ritual, stepId) {
  if (!RITUAL_STEP_IDS.includes(stepId)) return "todo";
  return asStatus(ritual?.[stepId]);
}

export function canOpenVerse(ritual) {
  const breathe = ritualStepStatus(ritual, "breathe");
  return breathe === "done" || breathe === "skipped";
}

export function canOpenReading(ritual) {
  const verse = ritualStepStatus(ritual, "verse");
  return verse === "done" || verse === "skipped";
}

export function canOpenRitualStep(ritual, stepId) {
  if (stepId === "breathe") return true;
  if (stepId === "verse") return canOpenVerse(ritual);
  if (stepId === "reading") return canOpenReading(ritual);
  return false;
}

export function markRitual(ritual, stepId, status, pack, date = new Date()) {
  if (!RITUAL_STEP_IDS.includes(stepId)) return normalizeRitual(ritual, pack, date);
  if (status !== "done" && status !== "skipped" && status !== "todo") {
    return normalizeRitual(ritual, pack, date);
  }
  const current = normalizeRitual(ritual, pack, date);
  if (stepId !== "breathe" && status !== "todo" && !canOpenRitualStep(current, stepId)) {
    return current;
  }
  return { ...current, [stepId]: status };
}

export function nextRitualStep(ritual) {
  if (ritualStepStatus(ritual, "breathe") === "todo") return "breathe";
  if (ritualStepStatus(ritual, "verse") === "todo") return "verse";
  if (ritualStepStatus(ritual, "reading") === "todo") return "reading";
  return null;
}

export function ritualReading(pack, ritual) {
  const id = ritual?.readingId;
  const pool = peacefulReadings(pack);
  return pool.find((item) => item.id === id) || pickPeacefulReading(pack) || null;
}

export function notifyRitualChange(win = globalThis.window) {
  try {
    win?.dispatchEvent?.(new Event(TEAM_RITUAL_CHANGE_EVENT));
  } catch {
    /* listeners are optional */
  }
}
